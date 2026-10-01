import cors from "cors";
import express from "express";
import morgan from "morgan";
import { CONFIG } from "./config.js";
import { seedDatabase } from "./database/prismaSeed.js";
import { DbService } from "./database/dbService.js";
import { analyticsRouter } from "./routes/analytics.routes.js";
import { bricsRouter } from "./routes/brics.routes.js";
import { citizenRouter } from "./routes/citizen.routes.js";
import { grievanceRouter } from "./routes/grievance.routes.js";
import { policyAiRouter } from "./routes/policyAi.routes.js";
import { projectRouter } from "./routes/project.routes.js";
import { twilioRouter } from "./routes/twilio.routes.js";
import { whatsappRouter } from "./routes/whatsapp.routes.js";
import { ElevenLabsService } from "./services/elevenlabsService.js";
import { prisma } from "./config/prisma.config.js";

const app = express();

app.use(
  cors({
    origin: CONFIG.FRONTEND_URL,
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    exposedHeaders: ["Content-Type"],
    preflightContinue: false,
    optionsSuccessStatus: 204,
  }),
);

app.use(morgan("dev"));
// Accept JSON sent as `text/plain` (preflight-free simple request) as well
// as regular `application/json`.
app.use(express.json({ type: ["application/json", "text/plain"] }));
app.use(express.urlencoded({ extended: true }));

// Health Check
app.get("/health", async (req, res) => {
  let dbStatus = "DISCONNECTED";
  try {
    const districtCount = await prisma.districtDemographic.count();
    dbStatus = `CONNECTED (PostgreSQL • ${districtCount} districts loaded)`;
  } catch (err: any) {
    dbStatus = `ERROR (${err.message})`;
  }

  res.json({
    status: "HEALTHY",
    service: "Nexa BRICS AI for DPI & Governance API",
    database: dbStatus,
    llmProvider: CONFIG.GEMINI_API_KEY
      ? `Google Gemini ${CONFIG.GEMINI_MODEL} Active (reasoning/thinking)`
      : "Nexa NLU Fallback Engine",
    speechToText: ElevenLabsService.isSttConfigured
      ? `ElevenLabs ${ElevenLabsService.sttModel} Active`
      : "ElevenLabs STT inactive (set ELEVENLABS_API_KEY)",
    textToSpeech: ElevenLabsService.isTtsConfigured
      ? `ElevenLabs ${ElevenLabsService.ttsModel} Active`
      : "ElevenLabs TTS inactive (set ELEVENLABS_API_KEY)",
    whatsappWebhook: "/api/whatsapp/webhook",
    twilioVoiceWebhook: "/api/twilio/voice",
    timestamp: new Date().toISOString(),
  });
});

// Mount Modular API Routers
app.use("/api/whatsapp", whatsappRouter);
app.use("/api/twilio", twilioRouter);
app.use("/api/analytics", analyticsRouter);
app.use("/api/brics", bricsRouter);
app.use("/api/grievances", grievanceRouter);
app.use("/api/projects", projectRouter);
app.use("/api/ai/policy-analyst", policyAiRouter);
app.use("/api/citizen", citizenRouter);

// Demographics Direct Endpoint (Prisma-backed, country-scoped)
app.get("/api/demographics", async (req, res) => {
  try {
    const country = req.query.country as string;
    const state = req.query.state as string;
    const list = await DbService.getMapData(country, state);
    res.json({ success: true, data: list });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Re-seed Endpoint — wipes transactional data and restores the seed dataset
const handleResetSeed = async (req: any, res: any) => {
  try {
    await prisma.grievanceAuditLog.deleteMany();
    await prisma.projectExpenditure.deleteMany();
    await prisma.projectMilestone.deleteMany();
    await prisma.policyGapInsight.deleteMany();
    await prisma.grievance.deleteMany();
    await prisma.governmentProject.deleteMany();
    await prisma.districtDemographic.deleteMany();
    await prisma.bricsTradeFlow.deleteMany();
    await prisma.bricsInvestmentFlow.deleteMany();
    await prisma.bricsMacroIndicator.deleteMany();
    await seedDatabase();
    res.json({ success: true, message: "Dataset re-seeded successfully" });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Frontend calls POST; keep GET for manual browser re-seed.
app.post("/api/system/reset-seed", handleResetSeed);
app.get("/api/system/reset-seed", handleResetSeed);

// Backward-compatibility aliases
app.use("/api/whatsapp", whatsappRouter);
app.use("/api/citizen/webhook/twilio", twilioRouter);

// Global Error handling middleware
app.use(
  (
    err: any,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) => {
    console.error("API Error:", err);
    res.status(500).json({
      success: false,
      error: err.message || "Internal Server Error",
    });
  },
);

app.listen(CONFIG.PORT, async () => {
  console.log(`Nexa DPI Intelligence API running on port ${CONFIG.PORT}`);
  console.log(`Morgan HTTP Logger Active`);
  console.log(`Health check: http://localhost:${CONFIG.PORT}/health`);
  console.log(
    `Meta WhatsApp Webhook: http://localhost:${CONFIG.PORT}/api/whatsapp/webhook`,
  );
  console.log(
    `Twilio Voice Webhook: http://localhost:${CONFIG.PORT}/api/twilio/voice`,
  );

  // Auto seed PostgreSQL if table is empty
  try {
    const count = await prisma.districtDemographic.count();
    if (count === 0) {
      console.log(
        "[Prisma Auto-Seeder] PostgreSQL database is empty. Running initial seed...",
      );
      await seedDatabase();
    } else {
      console.log(
        `[Prisma Database] PostgreSQL connected with ${count} monitored districts.`,
      );
    }
  } catch (e: any) {
    console.warn("[Prisma Connection Notice]:", e.message);
  }
});

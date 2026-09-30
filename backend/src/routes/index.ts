import { Router } from "express";
import { DbService } from "../database/dbService.js";
import { prisma } from "../config/prisma.config.js";
import { seedDatabase } from "../database/prismaSeed.js";
import { analyticsRouter } from "./analytics.routes.js";
import { citizenRouter } from "./citizen.routes.js";
import { grievanceRouter } from "./grievance.routes.js";
import { policyAiRouter } from "./policyAi.routes.js";
import { projectRouter } from "./project.routes.js";
import { twilioRouter } from "./twilio.routes.js";
import { whatsappRouter } from "./whatsapp.routes.js";

export const mainRouter = Router();

// Modular Sub-routers
mainRouter.use("/whatsapp", whatsappRouter);
mainRouter.use("/twilio", twilioRouter);
mainRouter.use("/analytics", analyticsRouter);
mainRouter.use("/grievances", grievanceRouter);
mainRouter.use("/projects", projectRouter);
mainRouter.use("/ai/policy-analyst", policyAiRouter);
mainRouter.use("/citizen", citizenRouter);

// Demographics Direct Endpoint (Prisma-backed)
mainRouter.get("/demographics", async (req, res) => {
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
mainRouter.post("/system/reset-seed", async (req, res) => {
  try {
    await prisma.grievanceAuditLog.deleteMany();
    await prisma.projectExpenditure.deleteMany();
    await prisma.projectMilestone.deleteMany();
    await prisma.policyGapInsight.deleteMany();
    await prisma.grievance.deleteMany();
    await prisma.governmentProject.deleteMany();
    await prisma.districtDemographic.deleteMany();
    await seedDatabase();
    res.json({ success: true, message: "Dataset re-seeded successfully" });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Legacy backward-compatibility aliases for existing clients
mainRouter.use("/citizen/webhook/whatsapp", whatsappRouter);
mainRouter.use("/citizen/webhook/twilio", twilioRouter);
mainRouter.post("/ai/policy-analyst", (req, res, next) => {
  req.url = "/analyze";
  policyAiRouter(req, res, next);
});

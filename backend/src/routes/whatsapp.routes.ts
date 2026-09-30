import { Router } from "express";
import { CONFIG } from "../config.js";
import { AiCitizenEngine } from "../services/aiCitizenEngine.js";
import { ElevenLabsService } from "../services/elevenlabsService.js";
import { WhatsAppService } from "../services/whatsappService.js";

export const whatsappRouter = Router();

const GREETING_RE =
  /^(hi+|hii+|hello+|hey+|yo|namaste|namaskar|namaskaram|vanakkam|hola|salaam|salam|start|menu|help)[\s!.]*$/i;

const isGreeting = (text: string): boolean => GREETING_RE.test(text.trim());

const DEPARTMENT_LABELS: Record<string, { category: string; label: string }> = {
  dept_WATER_SUPPLY: { category: "WATER_SUPPLY", label: "Water Supply" },
  dept_RURAL_ROADS: { category: "RURAL_ROADS", label: "Rural Roads" },
  dept_POWER_GRID: { category: "POWER_GRID", label: "Electricity" },
  dept_HEALTHCARE: { category: "HEALTHCARE", label: "Healthcare" },
  dept_SANITATION: { category: "SANITATION", label: "Sanitation" },
  dept_EDUCATION: { category: "EDUCATION", label: "Education" },
  dept_FLOOD_DRAINAGE: { category: "FLOOD_DRAINAGE", label: "Flood & Drainage" },
  WATER_SUPPLY: { category: "WATER_SUPPLY", label: "Water Supply" },
  RURAL_ROADS: { category: "RURAL_ROADS", label: "Rural Roads" },
  POWER_GRID: { category: "POWER_GRID", label: "Electricity" },
  HEALTHCARE: { category: "HEALTHCARE", label: "Healthcare" },
  SANITATION: { category: "SANITATION", label: "Sanitation" },
  EDUCATION: { category: "EDUCATION", label: "Education" },
  FLOOD_DRAINAGE: { category: "FLOOD_DRAINAGE", label: "Flood & Drainage" },
};

/**
 * Transcribe an inbound WhatsApp voice note with ElevenLabs Scribe.
 * Returns null on any failure so the webhook never breaks.
 */
const transcribeVoiceNote = async (audioId: string): Promise<string | null> => {
  try {
    const mediaUrl = await WhatsAppService.getMediaUrl(audioId);
    if (!mediaUrl) return null;

    const media = await WhatsAppService.downloadMedia(mediaUrl);
    if (!media) return null;

    const result = await ElevenLabsService.speechToText(media.buffer, {
      mimeType: media.mimeType,
    });

    if (result?.text) {
      console.log(
        `[WhatsApp] Voice note transcribed (${result.languageCode ?? "auto"}): "${result.text}"`,
      );
      return result.text;
    }
    return null;
  } catch (err) {
    console.warn("[WhatsApp] Voice note transcription failed:", err);
    return null;
  }
};

/**
 * 1. Meta WhatsApp Cloud API Webhook Verification (GET)
 * Meta calls this when you configure your webhook in Meta App Dashboard
 */
whatsappRouter.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  const expectedToken = CONFIG.WHATSAPP_VERIFY_TOKEN;

  if (mode === "subscribe" && token === expectedToken) {
    console.log("[WhatsApp Webhook] Verification successful!");
    return res.status(200).send(challenge);
  }

  console.warn("[WhatsApp Webhook] Verification failed. Token mismatch.");
  return res.sendStatus(403);
});

/**
 * 2. Meta WhatsApp Cloud API Inbound Events (POST)
 * Receives real citizen messages, voice notes, and status updates
 */
whatsappRouter.post("/webhook", async (req, res) => {
  try {
    const body = req.body;

    console.log(req.body);
    // Fast 200 OK response to Meta within 3 seconds
    res.status(200).json({ status: "EVENT_RECEIVED" });

    if (body.object !== "whatsapp_business_account") {
      return;
    }

    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    const message = value?.messages?.[0];

    if (!message) {
      // Event could be delivery/read status
      return;
    }

    const fromPhone = message.from; // e.g. "919838120491"
    const messageId = message.id;
    const citizenName =
      value.contacts?.[0]?.profile?.name || "WhatsApp Citizen";

    // Mark as read
    WhatsAppService.markMessageAsRead(messageId).catch(() => {});

    let messageText = "";
    let interactiveId: string | undefined;

    if (message.type === "text") {
      messageText = message.text.body;
    } else if (message.type === "interactive") {
      interactiveId =
        message.interactive.button_reply?.id ||
        message.interactive.list_reply?.id ||
        undefined;
      messageText =
        message.interactive.button_reply?.title ||
        message.interactive.list_reply?.title ||
        message.interactive.button_reply?.id ||
        message.interactive.list_reply?.id ||
        "";
    } else if (message.type === "audio") {
      // Real speech-to-text (ElevenLabs Scribe) on the voice note
      const transcript = await transcribeVoiceNote(message.audio?.id);
      messageText = transcript || "Citizen sent voice audio note";
    } else {
      messageText = `Citizen sent ${message.type}`;
    }

    if (!messageText) return;

    console.log(
      `[WhatsApp Webhook] Inbound message from ${fromPhone} (${citizenName}): "${messageText}"`,
    );

    // "Hi" -> clickable department options (interactive list), not plain text.
    if (isGreeting(messageText)) {
      await WhatsAppService.sendDepartmentMenu(`+${fromPhone}`);
      return;
    }

    // Department chosen from the interactive list -> feed a natural message
    // to the AI engine so the category is captured reliably.
    if (interactiveId && DEPARTMENT_LABELS[interactiveId]) {
      const dept = DEPARTMENT_LABELS[interactiveId];
      messageText = `My issue is about ${dept.label}. Please help me register a complaint.`;
    } else if (messageText && DEPARTMENT_LABELS[messageText.trim()]) {
      const dept = DEPARTMENT_LABELS[messageText.trim()];
      messageText = `My issue is about ${dept.label}. Please help me register a complaint.`;
    }

    // Process through Nexa Multilingual AI Engine
    const result = await AiCitizenEngine.processMessage({
      phone: `+${fromPhone}`,
      citizenName,
      messageText,
      channel: "WHATSAPP",
    });

    // Send AI reply back to Citizen via Meta Graph API
    await WhatsAppService.sendTextMessage(`+${fromPhone}`, result.botReply);
  } catch (err: any) {
    console.error("[WhatsApp Webhook Error]:", err);
  }
});

/**
 * 3. Public Outbound API: Send WhatsApp message to any phone number
 */
whatsappRouter.post("/send", async (req, res) => {
  try {
    const { to, text } = req.body;
    if (!to || !text) {
      return res.status(400).json({
        success: false,
        error: 'Recipient "to" and "text" are required.',
      });
    }

    const result = await WhatsAppService.sendTextMessage(to, text);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 4. Public Outbound API: Send a WhatsApp VOICE NOTE (ElevenLabs TTS)
 *    Body: { to, text, voiceId?, language? }
 */
whatsappRouter.post("/send-voice", async (req, res) => {
  try {
    const { to, text, voiceId, language } = req.body;
    if (!to || !text) {
      return res.status(400).json({
        success: false,
        error: 'Recipient "to" and "text" are required.',
      });
    }

    const audio = await ElevenLabsService.textToSpeech(text, {
      voiceId,
      language,
    });
    if (!audio) {
      return res.status(503).json({
        success: false,
        error:
          "Speech synthesis unavailable — set ELEVENLABS_API_KEY in backend/.env",
      });
    }

    const result = await WhatsAppService.sendVoiceMessage(
      to,
      audio,
      "audio/mpeg",
    );
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

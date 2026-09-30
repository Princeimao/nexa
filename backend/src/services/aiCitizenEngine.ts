import { v4 as uuidv4 } from "uuid";
import { prisma } from "../config/prisma.config.js";
import { SectorCategory } from "../types/index.js";
import {
  getOrCreateCitizenSession,
  isPlaceholderName,
  updateCitizenSession,
  type CitizenConversationState,
  type SupportedLanguage,
} from "./citizenSessionStore.js";
import { TwilioService } from "./twilioService.js";
import { LlmService } from "./llmService.js";
import { resolveBricsCountry } from "../utils/brics.js";

export const SUPPORTED_LANGUAGES = [
  "hi-IN",
  "en-IN",
  "bn-IN",
  "ta-IN",
  "te-IN",
  "mr-IN",
  "gu-IN",
  "kn-IN",
  "ml-IN",
  "pa-IN",
] as const;

interface ProcessMessageInput {
  sessionId?: string;
  phone: string;
  citizenName?: string;
  messageText: string;
  language?: string;
  channel?: string;
}

interface ProcessMessageOutput {
  sessionId: string;
  botReply: string;
  language: SupportedLanguage;
  step: string;
  extractedData: Record<string, unknown>;
  missingFields: string[];

  registeredTicket?: {
    ticketNumber: string;
    category: string;
    location: string;
    severity: string;
    assignedDept: string;
  };
}

export class AiCitizenEngine {
  /**
   * Main citizen conversation processor.
   *
   * This method intentionally contains almost no domain-specific
   * switch/case logic.
   *
   * The LLM handles interpretation.
   * The local session handles state.
   * Prisma handles persistence.
   */
  public static async processMessage(
    input: ProcessMessageInput,
  ): Promise<ProcessMessageOutput> {
    const initialLanguage = this.resolveInitialLanguage(
      input.language,
      input.phone,
    );

    const session = getOrCreateCitizenSession(
      input.phone,
      input.citizenName || "WhatsApp Citizen",
      initialLanguage,
      input.channel || "WHATSAPP",
    );

    session.lastActiveAt = Date.now();
    if (input.channel) session.channel = input.channel;

    /**
     * Make sure these collections exist.
     *
     * This protects the engine if an old session was created
     * before the current session format existed.
     */
    session.extractedData ??= {};
    session.providedFields ??= new Set<string>();
    session.missingFields ??= [];
    session.history ??= [];

    /**
     * ---------------------------------------------
     * 3. Store user's latest message
     * ---------------------------------------------
     */
    session.history.push({
      role: "user",
      content: input.messageText,
      timestamp: new Date().toISOString(),
    });

    /**
     * ---------------------------------------------
     * 4. Ask the LLM to understand the conversation
     * ---------------------------------------------
     *
     * IMPORTANT:
     *
     * We don't manually detect:
     * - water
     * - roads
     * - electricity
     * - Hindi
     * - Tamil
     * - severity
     * - districts
     *
     * The LLM does that from the conversation.
     */
    const llmResult = await LlmService.analyzeCitizenConversation({
      language: session.language,
      phoneCountryLanguage: session.countryLanguage || session.language,
      currentData: session.extractedData,
      providedFields: Array.from(session.providedFields),
      missingFields: session.missingFields,
      history: session.history,
      latestMessage: input.messageText,
    });

    if (llmResult?.language) {
      // @ts-ignore
      session.language = TwilioService.normalizeLanguage(llmResult.language);
    }

    if (llmResult?.extracted) {
      const cleanedExtraction = this.removeEmptyValues(llmResult.extracted);

      // Citizen name may arrive via WhatsApp profile or via the LLM.
      const extractedName =
        (cleanedExtraction as Record<string, unknown>).citizenName ??
        (cleanedExtraction as Record<string, unknown>).name;
      if (typeof extractedName === "string" && !isPlaceholderName(extractedName)) {
        session.citizenName = extractedName.trim();
      }
      // Keep citizenName on the session (not inside extractedData).
      delete (cleanedExtraction as Record<string, unknown>).citizenName;
      delete (cleanedExtraction as Record<string, unknown>).name;

      // A real WhatsApp profile name counts as the citizen's name.
      if (
        input.citizenName &&
        !isPlaceholderName(input.citizenName) &&
        isPlaceholderName(session.citizenName)
      ) {
        session.citizenName = input.citizenName.trim();
      }

      session.extractedData = {
        ...session.extractedData,
        ...cleanedExtraction,
      };
    } else if (
      input.citizenName &&
      !isPlaceholderName(input.citizenName) &&
      isPlaceholderName(session.citizenName)
    ) {
      session.citizenName = input.citizenName.trim();
    }

    this.updateProvidedFields(session);

    const locallyMissingFields = this.calculateMissingFields(session);

    if (llmResult?.missingFields) {
      session.missingFields = llmResult.missingFields.filter((field) =>
        locallyMissingFields.includes(field),
      );

      for (const field of locallyMissingFields) {
        if (!session.missingFields.includes(field)) {
          session.missingFields.push(field);
        }
      }
    } else {
      session.missingFields = locallyMissingFields;
    }

    if (
      session.step === "CONFIRMATION" &&
      llmResult?.confirmed === true &&
      session.missingFields.length === 0
    ) {
      return this.registerGrievance(session);
    }

    if (
      llmResult?.readyForConfirmation === true &&
      session.missingFields.length === 0
    ) {
      session.step = "CONFIRMATION";
    } else if (session.step !== "COMPLETED") {
      session.step = "COLLECTING_INFORMATION";
    }
    let botReply = llmResult?.response?.trim();

    if (!botReply) {
      botReply = await LlmService.generateCitizenResponse({
        language: session.language,
        currentData: session.extractedData,
        missingFields: session.missingFields,
        history: session.history,
        step: session.step,
      });
    }

    session.history.push({
      role: "assistant",
      content: botReply,
      timestamp: new Date().toISOString(),
    });

    session.lastActiveAt = Date.now();
    updateCitizenSession(session);

    return {
      sessionId: session.sessionId,
      botReply,
      language: session.language,
      step: session.step,
      extractedData: session.extractedData,
      missingFields: session.missingFields,
    };
  }

  private static resolveInitialLanguage(
    suppliedLanguage: string | undefined,
    phone: string,
  ): SupportedLanguage {
    if (suppliedLanguage) {
      return this.normalizeLanguage(suppliedLanguage, "hi-IN");
    }

    // @ts-ignore
    return TwilioService.detectLanguageFromPhone(phone);
  }

  private static normalizeLanguage(
    value: string,
    fallback: SupportedLanguage,
  ): SupportedLanguage {
    const normalized = value.trim().toLowerCase().replace("_", "-");

    const aliases: Record<string, SupportedLanguage> = {
      hi: "hi-IN",
      "hi-in": "hi-IN",
      hindi: "hi-IN",
      हिंदी: "hi-IN",

      en: "en-IN",
      "en-in": "en-IN",
      english: "en-IN",

      bn: "bn-IN",
      "bn-in": "bn-IN",
      bengali: "bn-IN",
      bangla: "bn-IN",
      বাংলা: "bn-IN",

      ta: "ta-IN",
      "ta-in": "ta-IN",
      tamil: "ta-IN",
      தமிழ்: "ta-IN",

      te: "te-IN",
      "te-in": "te-IN",
      telugu: "te-IN",
      తెలుగు: "te-IN",

      mr: "mr-IN",
      "mr-in": "mr-IN",
      marathi: "mr-IN",
      मराठी: "mr-IN",

      gu: "gu-IN",
      "gu-in": "gu-IN",
      gujarati: "gu-IN",
      ગુજરાતી: "gu-IN",

      kn: "kn-IN",
      "kn-in": "kn-IN",
      kannada: "kn-IN",
      ಕನ್ನಡ: "kn-IN",

      ml: "ml-IN",
      "ml-in": "ml-IN",
      malayalam: "ml-IN",
      മലയാളം: "ml-IN",

      pa: "pa-IN",
      "pa-in": "pa-IN",
      punjabi: "pa-IN",
      ਪੰਜਾਬੀ: "pa-IN",
    };

    return aliases[normalized] || fallback;
  }

  /**
   * Remove undefined/null/empty values returned by the LLM.
   */
  private static removeEmptyValues(
    data: Record<string, unknown>,
  ): Record<string, unknown> {
    return Object.fromEntries(
      Object.entries(data).filter(([, value]) => {
        if (value === undefined || value === null) {
          return false;
        }

        if (typeof value === "string" && value.trim() === "") {
          return false;
        }

        return true;
      }),
    );
  }

  /**
   * Keep a local record of what information the citizen
   * has already supplied.
   *
   * This is NOT an LLM decision.
   *
   * It is simply state bookkeeping.
   */
  private static updateProvidedFields(session: CitizenConversationState): void {
    const data = session.extractedData;

    const fields = [
      "category",
      "subCategory",
      "country",
      "state",
      "district",
      "block",
      "villageWard",
      "description",
      "severity",
      "affectedPopulationEst",
    ];

    for (const field of fields) {
      const value = data[field];

      if (value !== undefined && value !== null && value !== "") {
        session.providedFields.add(field);
      }
    }
  }

  /**
   * Required information before registration.
   *
   * The LLM decides what the citizen means.
   * This function only checks whether the required
   * values actually exist in local session state.
   */
  private static calculateMissingFields(
    session: CitizenConversationState,
  ): string[] {
    const requiredFields = [
      "category",
      "state",
      "district",
      "villageWard",
      "description",
    ];

    const missing = requiredFields.filter(
      (field) => !session.providedFields.has(field),
    );

    // Name is required: ask for it when we only have a placeholder.
    if (isPlaceholderName(session.citizenName)) {
      missing.unshift("citizenName");
    }

    return missing;
  }

  /**
   * Register grievance in PostgreSQL through Prisma.
   *
   * Guarantees:
   * - the reference/ticket number is generated immediately (no "will be sent shortly"),
   * - the row is actually persisted BEFORE any success confirmation is built,
   * - the confirmation sent back always contains that saved ticket number.
   */
  private static async registerGrievance(
    session: CitizenConversationState,
  ): Promise<ProcessMessageOutput> {
    const data = session.extractedData;

    /**
     * These values should already have been validated by the LLM.
     */
    const category = this.validateSector(data.category);

    const severity = this.validateSeverity(data.severity);

    const districtName = String(data.district || "Unknown District");

    /**
     * Look up district information if available.
     */
    const districtInfo = await prisma.districtDemographic.findFirst({
      where: {
        district: {
          equals: districtName,
          mode: "insensitive",
        },
      },
    });

    /**
     * Generate the reference number immediately (no "will be sent shortly").
     * Ensure uniqueness against already-saved tickets.
     */
    let ticketNumber = "";
    for (let attempt = 0; attempt < 5; attempt++) {
      const candidate = `NXA-2026-${uuidv4()
        .replace(/\D/g, "")
        .slice(0, 6)
        .padStart(6, "0")}`;
      const existing = await prisma.grievance.findUnique({
        where: { ticketNumber: candidate },
        select: { id: true },
      });
      if (!existing) {
        ticketNumber = candidate;
        break;
      }
    }
    if (!ticketNumber) {
      ticketNumber = `NXA-2026-${Date.now().toString().slice(-6)}`;
    }

    /**
     * Department assignment is configuration/business logic,
     * not conversational intelligence.
     */
    const department = await this.findDepartment(category);

    const state = String(data.state || districtInfo?.state || "Unknown State");

    const district = String(data.district || "Unknown District");

    const block =
      data.block !== undefined && data.block !== null
        ? String(data.block)
        : null;

    const villageWard =
      data.villageWard !== undefined && data.villageWard !== null
        ? String(data.villageWard)
        : null;

    const description = String(
      data.description || "Citizen reported a public infrastructure grievance.",
    );

    const affectedPopulation =
      Number(data.affectedPopulationEst) > 0
        ? Number(data.affectedPopulationEst)
        : 500;

    const urgencyScore = this.calculateUrgencyScore(severity);

    const channel =
      session.channel === "VOICE_CALL" || session.channel === "WHATSAPP"
        ? session.channel
        : "WHATSAPP";

    /**
     * Create grievance.
     *
     * IMPORTANT:
     *
     * Your Prisma schema has:
     *
     * state
     * district
     * block
     * villageWard
     *
     * as individual columns.
     *
     * Therefore we do NOT send a nested location object.
     *
     * The row MUST be persisted before any success confirmation is built.
     */
    let saved: { id: string } | null = null;
    try {
      saved = await prisma.grievance.create({
        data: {
          ticketNumber,
          citizenPhone: session.phone,
          citizenName: isPlaceholderName(session.citizenName)
            ? "Citizen"
            : session.citizenName,
          channel: channel as "VOICE_CALL" | "WHATSAPP",
          language: session.language,
          rawTranscript: session.history
            .filter((item) => item.role === "user")
            .map((item) => item.content)
            .join(" | "),

          translatedText: description,
          category,
          subCategory: String(data.subCategory || `${category} complaint`),
          description,
          country: resolveBricsCountry(String(data.country || "India")) ?? "INDIA",
          state,
          district,
          block,
          villageWard,
          latitude: districtInfo?.latitude ?? null,
          longitude: districtInfo?.longitude ?? null,
          severity,
          affectedPopulationEst: affectedPopulation,
          status: "REGISTERED",
          urgencyScore,
          confidenceScore: 0.9,
          verified: true,
        },
        select: { id: true },
      });
    } catch (err) {
      console.error("[AiCitizenEngine] Failed to save grievance:", err);
      saved = null;
    }

    // Verify the row actually exists before confirming.
    if (saved) {
      const verified = await prisma.grievance
        .findUnique({ where: { ticketNumber }, select: { id: true } })
        .catch(() => null);
      if (!verified) saved = null;
    }

    if (!saved) {
      // Do NOT claim registration. Keep the conversation in CONFIRMATION
      // so the citizen can retry; the reference is only sent after a real save.
      session.step = "CONFIRMATION";
      updateCitizenSession(session);
      const failureReply =
        "Sorry, I could not save your complaint just now due to a technical issue. Please reply YES to try registering again.";
      session.history.push({
        role: "assistant",
        content: failureReply,
        timestamp: new Date().toISOString(),
      });
      updateCitizenSession(session);
      return {
        sessionId: session.sessionId,
        botReply: failureReply,
        language: session.language,
        step: session.step,
        extractedData: session.extractedData,
        missingFields: session.missingFields,
      };
    }

    session.step = "COMPLETED";
    session.createdTicketId = ticketNumber;
    session.missingFields = [];

    /**
     * Save completed session.
     */
    updateCitizenSession(session);

    /**
     * Let the LLM produce the final confirmation
     * in the citizen's selected language.
     */
    const location = [villageWard, block, district, state]
      .filter(Boolean)
      .join(", ");

    let botReply = await LlmService.generateRegistrationConfirmation({
      language: session.language,
      ticketNumber,
      category,
      severity,
      location,
      assignedDepartment: department,
    });

    // Guarantee the saved reference number is sent directly in this message
    // (never "will be sent shortly"). If the model omitted it, append it.
    if (!botReply || !botReply.includes(ticketNumber)) {
      botReply = `${(botReply || "").trim()} Your reference number is ${ticketNumber}.`.trim();
    }

    session.history.push({
      role: "assistant",
      content: botReply,
      timestamp: new Date().toISOString(),
    });

    updateCitizenSession(session);
    return {
      sessionId: session.sessionId,
      botReply,
      language: session.language,
      step: session.step,
      extractedData: session.extractedData,
      missingFields: [],
      registeredTicket: {
        ticketNumber,
        category,
        location,
        severity,
        assignedDept: department,
      },
    };
  }

  private static validateSector(value: unknown): SectorCategory {
    const allowed: readonly string[] = [
      "WATER_SUPPLY",
      "RURAL_ROADS",
      "POWER_GRID",
      "HEALTHCARE",
      "SANITATION",
      "EDUCATION",
      "FLOOD_DRAINAGE",
    ];

    if (typeof value === "string" && allowed.includes(value)) {
      return value as SectorCategory;
    }

    return "WATER_SUPPLY";
  }

  private static validateSeverity(
    value: unknown,
  ): "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" {
    const allowed = ["CRITICAL", "HIGH", "MEDIUM", "LOW"] as const;

    if (
      typeof value === "string" &&
      allowed.includes(value as (typeof allowed)[number])
    ) {
      return value as "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
    }

    return "MEDIUM";
  }

  private static calculateUrgencyScore(
    severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW",
  ): number {
    const scores: Record<"CRITICAL" | "HIGH" | "MEDIUM" | "LOW", number> = {
      CRITICAL: 95,
      HIGH: 82,
      MEDIUM: 60,
      LOW: 30,
    };

    return scores[severity];
  }

  private static async findDepartment(
    category: SectorCategory,
  ): Promise<string> {
    const departments: Record<SectorCategory, string> = {
      WATER_SUPPLY: "Drinking Water / Jal Nigam",
      RURAL_ROADS: "Rural Works / PWD",
      POWER_GRID: "Electricity Distribution Department",
      HEALTHCARE: "District Health Department",
      SANITATION: "Sanitation Department",
      EDUCATION: "Education Department",
      FLOOD_DRAINAGE: "Irrigation & Flood Control",
    };

    return departments[category] || "District Administration";
  }
}

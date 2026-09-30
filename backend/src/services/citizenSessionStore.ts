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
  "ur-IN",
] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export interface ConversationHistoryItem {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export interface CitizenConversationState {
  sessionId: string;

  phone: string;

  citizenName: string;

  channel: string;

  /**
   * Language currently being used in the conversation.
   *
   * This is NOT necessarily determined by the phone number.
   * The phone country/language is only an initial hint.
   */
  language: SupportedLanguage;

  /**
   * Language guessed from the caller's country code.
   * The LLM can override this when the citizen speaks.
   */
  countryLanguage: SupportedLanguage;

  step:
    | "LANGUAGE_SELECTION"
    | "COLLECTING_INFORMATION"
    | "CONFIRMATION"
    | "COMPLETED";

  extractedData: Record<string, unknown>;

  /**
   * Fields that the citizen has actually provided.
   */
  providedFields: Set<string>;

  /**
   * Fields still required.
   */
  missingFields: string[];

  history: ConversationHistoryItem[];

  createdTicketId?: string;

  lastActiveAt: number;
}

/**
 * In-memory session store.
 *
 * Perfectly fine for a hackathon.
 * No database/bucket is required for this.
 */
const sessions = new Map<string, CitizenConversationState>();

/**
 * Names that mean the citizen has not told us their real name yet.
 */
export function isPlaceholderName(name?: string | null): boolean {
  if (!name) return true;
  const n = name.trim().toLowerCase();
  return (
    n === "" ||
    n === "voice citizen" ||
    n === "whatsapp citizen" ||
    n === "citizen" ||
    n === "unknown"
  );
}

export function getOrCreateCitizenSession(
  phone: string,
  citizenName: string,
  language: SupportedLanguage,
  channel = "WHATSAPP",
): CitizenConversationState {
  const normalizedPhone = phone.replace(/\D/g, "");

  const existing = sessions.get(normalizedPhone);

  if (existing) {
    // Keep channel + real names up to date without losing conversation state.
    if (channel) existing.channel = channel;
    if (citizenName && !isPlaceholderName(citizenName) && isPlaceholderName(existing.citizenName)) {
      existing.citizenName = citizenName.trim();
    }
    if (!existing.missingFields) existing.missingFields = [];
    return existing;
  }

  const sessionId = `session_${normalizedPhone}` || `session_${Date.now()}`;

  const session: CitizenConversationState = {
    sessionId,

    phone,

    citizenName,

    channel,

    language,

    countryLanguage: language,

    step: "LANGUAGE_SELECTION",

    extractedData: {},

    providedFields: new Set<string>(),

    missingFields: ["citizenName", "category", "district", "villageWard", "description"],

    history: [],

    lastActiveAt: Date.now(),
  };

  sessions.set(normalizedPhone, session);

  return session;
}

export function updateCitizenSession(session: CitizenConversationState): void {
  const normalizedPhone = session.phone.replace(/\D/g, "");

  session.lastActiveAt = Date.now();

  sessions.set(normalizedPhone, session);
}

export function deleteCitizenSession(phone: string): void {
  const normalizedPhone = phone.replace(/\D/g, "");

  sessions.delete(normalizedPhone);
}

export function getCitizenSession(
  phone: string,
): CitizenConversationState | undefined {
  const normalizedPhone = phone.replace(/\D/g, "");

  return sessions.get(normalizedPhone);
}

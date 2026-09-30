import { CONFIG } from "../config.js";
import { SectorCategory } from "../types/index.js";
import { ElevenLabsService } from "./elevenlabsService.js";

/**
 * Supported language codes used by TwilioService.
 */
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
  "ru-IN",
  "zh-CN",
  "pt-BR",
] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

/**
 * Result returned by the citizen conversation model.
 */
export interface LlmConversationResult {
  language?: string;

  intent?:
    | "REGISTER_GRIEVANCE"
    | "CHECK_STATUS"
    | "GENERAL_QUESTION"
    | "UNKNOWN";

  extracted?: {
    citizenName?: string;

    category?: SectorCategory;

    subCategory?: string;

    country?: string;

    state?: string;

    district?: string;

    block?: string;

    villageWard?: string;

    description?: string;

    severity?: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

    affectedPopulationEst?: number;
  };

  missingFields?: string[];

  readyForConfirmation?: boolean;

  confirmed?: boolean;

  response?: string;

  confidence?: number;
}

/**
 * Older extraction result retained for compatibility with
 * any existing code that may still import it.
 */
export interface LlmExtractionResult {
  category: SectorCategory;

  subCategory?: string;

  country: string;

  state: string;

  district?: string;

  block?: string;

  villageWard?: string;

  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

  affectedPopulationEst: number;

  durationWeeks?: number;

  summary: string;

  missingFields: string[];

  nextFollowUpQuestion: string;

  confidence: number;
}

/**
 * Gemini API response types.
 *
 * Keeping these local prevents `any` from spreading through
 * the application.
 */
interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;

  error?: {
    message?: string;
  };
}

export class LlmService {
  /**
   * Gemini model used for reasoning / thinking.
   *
   * Configured in .env (GEMINI_MODEL). Keep this in one place
   * so changing models later is easy.
   */
  private static readonly GEMINI_MODEL = CONFIG.GEMINI_MODEL;

  private static readonly GEMINI_BASE_URL =
    "https://generativelanguage.googleapis.com/v1beta/models";

  /**
   * Get Gemini API key.
   */
  private static getApiKey(): string | null {
    return (
      CONFIG.GEMINI_API_KEY ||
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_API_KEY ||
      null
    );
  }

  /**
   * ---------------------------------------------------------
   * Main citizen conversation intelligence
   * ---------------------------------------------------------
   *
   * This is the important method for your voice system.
   *
   * The LLM handles:
   *
   * - language detection
   * - language changes
   * - intent
   * - grievance understanding
   * - category extraction
   * - location extraction
   * - severity interpretation
   * - affected population
   * - missing information
   * - confirmation detection
   * - response generation
   *
   * Your application only stores the resulting state.
   */
  public static async analyzeCitizenConversation(input: {
    language: string;

    phoneCountryLanguage: string;

    currentData: Record<string, unknown>;

    providedFields: string[];

    missingFields: string[];

    history: Array<{
      role: "user" | "assistant";
      content: string;
      timestamp: string;
    }>;

    latestMessage: string;
  }): Promise<LlmConversationResult | null> {
    const apiKey = this.getApiKey();

    if (!apiKey) {
      console.warn("[LlmService] Gemini API key is not configured.");

      return null;
    }

    try {
      const conversation = input.history
        .map((message) => {
          const speaker = message.role === "user" ? "CITIZEN" : "NEXA";

          return `${speaker}: ${message.content}`;
        })
        .join("\n");

      const prompt = `
${this.citizenSystemPrompt}

CURRENT CONVERSATION STATE

Current response language:
${input.language}

Phone-country language hint:
${input.phoneCountryLanguage}

Fields already stored locally:
${JSON.stringify(input.providedFields, null, 2)}

Fields currently missing locally:
${JSON.stringify(input.missingFields, null, 2)}

Information already extracted:
${JSON.stringify(input.currentData, null, 2)}

CONVERSATION HISTORY

${conversation}

LATEST CITIZEN MESSAGE

${input.latestMessage}

TASK

Understand the latest citizen message in the context of the entire
conversation.

Do not treat the latest message as an isolated message.

If the citizen says something like:

"My village is Mahsi and the water has been unavailable for three weeks."

extract both:

- village/block/area
- description
- duration/severity if reasonably supported

Do not ask for information that already exists in CURRENT DATA.

If the citizen provides a correction, replace the old value with
the corrected value.

If the citizen changes language, detect the new language and respond
in that language.

If the citizen is speaking naturally or mixing languages, understand
the meaning rather than requiring a particular sentence structure.

If the citizen has supplied all required information, set:

readyForConfirmation = true

and ask for confirmation.

If the citizen confirms an already-present complaint while the
conversation is in confirmation state, set:

confirmed = true

Do not register the grievance yourself.

The application will perform registration after confirmation.

Return ONLY valid JSON.

Required JSON shape:

{
  "language": "hi-IN",
  "intent": "REGISTER_GRIEVANCE",
  "extracted": {
    "citizenName": null,
    "category": "WATER_SUPPLY",
    "subCategory": null,
    "country": "India",
    "state": null,
    "district": null,
    "block": null,
    "villageWard": null,
    "description": null,
    "severity": null,
    "affectedPopulationEst": null
  },
  "missingFields": [],
  "readyForConfirmation": false,
  "confirmed": false,
  "response": "Response to the citizen in their current spoken language.",
  "confidence": 0.95
}

Rules:

- Use null for unknown extracted values.
- Extract "citizenName" whenever the citizen states their name
  ("my name is Ramesh", "main Ramesh bol raha hoon", "I am Priya").
  Never invent a name.
- Never invent factual information.
- Never invent a district.
- Never invent a village.
- Never invent population.
- Never invent government schemes.
- Never invent a department.
- Never say the reference/ticket number "will be sent shortly/later".
  A ticket number only exists after the application registers the complaint;
  until then, simply collect missing information and ask for confirmation.
- Do not translate a location into a different location.
- Preserve citizen-provided place names.
- category must use one of the allowed SectorCategory values.
- severity must use CRITICAL, HIGH, MEDIUM or LOW.
- confidence must be between 0 and 1.
- missingFields must contain only fields that are genuinely missing.
- Required fields are:
  citizenName
  category
  district
  villageWard OR block
  description
- If citizenName is unknown, ask for the user's name first (politely,
  in their language) along with at most one other missing item.
- State should be collected when possible, but it is not independently
  required if the district can be reliably resolved by application data.
- affectedPopulationEst is optional.
- Do not make up affectedPopulationEst.
- Keep the response concise enough for a telephone conversation.
`;

      const result = await this.callGeminiJson<LlmConversationResult>(
        apiKey,
        prompt,
        1200,
      );

      if (!result) {
        return null;
      }

      return this.sanitizeConversationResult(result);
    } catch (error) {
      console.error(
        "[LlmService] Citizen conversation analysis failed:",
        error,
      );

      return null;
    }
  }

  /**
   * ---------------------------------------------------------
   * Generate citizen response
   * ---------------------------------------------------------
   *
   * Used as a fallback when the analysis model did not produce
   * a response.
   */
  public static async generateCitizenResponse(input: {
    language: string;

    currentData: Record<string, unknown>;

    missingFields: string[];

    history: Array<{
      role: "user" | "assistant";
      content: string;
      timestamp: string;
    }>;

    step: string;
  }): Promise<string> {
    const apiKey = this.getApiKey();

    if (!apiKey) {
      return this.getFallbackResponse(input.language);
    }

    try {
      const conversation = input.history
        .map((item) => {
          const speaker = item.role === "user" ? "CITIZEN" : "NEXA";

          return `${speaker}: ${item.content}`;
        })
        .join("\n");

      const prompt = `
${this.citizenSystemPrompt}

Generate the next response to the citizen.

Current language:
${input.language}

Current conversation step:
${input.step}

Information already known:
${JSON.stringify(input.currentData, null, 2)}

Information still missing:
${JSON.stringify(input.missingFields, null, 2)}

Conversation:
${conversation}

Rules:

1. Respond ONLY in the citizen's current language.
2. If the citizen's language is mixed, use natural mixed-language
   speech where appropriate.
3. Do not ask for information that is already known.
4. If the citizen's name is missing, ask for their name first.
5. Ask for only the most useful missing information.
6. Do not ask five questions at once.
7. Keep the response short and natural for a telephone call.
8. Never promise that a reference/ticket number "will be sent shortly/later".
9. If everything required is available, summarize the complaint and
   ask the citizen to confirm it.
10. Never invent information.

Return only the response text.
`;

      const text = await this.callGeminiText(apiKey, prompt, 500);

      return text?.trim() || this.getFallbackResponse(input.language);
    } catch (error) {
      console.error("[LlmService] Citizen response generation failed:", error);

      return this.getFallbackResponse(input.language);
    }
  }

  /**
   * ---------------------------------------------------------
   * Registration confirmation
   * ---------------------------------------------------------
   */
  public static async generateRegistrationConfirmation(input: {
    language: string;

    ticketNumber: string;

    category: string;

    severity: string;

    location: string;

    assignedDepartment: string;
  }): Promise<string> {
    const apiKey = this.getApiKey();

    if (!apiKey) {
      return `Your complaint has been registered successfully. Your ticket number is ${input.ticketNumber}.`;
    }

    try {
      const prompt = `
You are Nexa, a multilingual citizen grievance assistant.

Generate a short final telephone confirmation.

Citizen language:
${input.language}

Ticket number:
${input.ticketNumber}

Complaint category:
${input.category}

Priority:
${input.severity}

Location:
${input.location}

Assigned department:
${input.assignedDepartment}

Rules:

- Respond in the citizen's language.
- Be polite.
- Clearly say that the complaint has been registered.
- Clearly speak the ticket number.
- Mention the location.
- Mention the department.
- Do not add facts not provided above.
- Do not use markdown.
- This is for text-to-speech, so make it natural when spoken aloud.
- Keep it under approximately 80 words.

Return only the spoken response.
`;

      const response = await this.callGeminiText(apiKey, prompt, 300);

      return (
        response?.trim() ||
        `Your complaint has been registered successfully. Your ticket number is ${input.ticketNumber}.`
      );
    } catch (error) {
      console.error("[LlmService] Registration confirmation failed:", error);

      return `Your complaint has been registered successfully. Your ticket number is ${input.ticketNumber}.`;
    }
  }

  /**
   * ---------------------------------------------------------
   * Legacy extraction method
   * ---------------------------------------------------------
   *
   * Kept so existing routes/services don't break.
   *
   * New voice flow should use:
   *
   * analyzeCitizenConversation()
   */
  public static async analyzeCitizenMessage(
    userMessage: string,

    history: Array<{
      role: "user" | "assistant";
      content: string;
    }>,

    currentExtracted: Record<string, unknown>,
  ): Promise<LlmExtractionResult | null> {
    const result = await this.analyzeCitizenConversation({
      language: "hi-IN",

      phoneCountryLanguage: "hi-IN",

      currentData: currentExtracted,

      providedFields: Object.keys(currentExtracted || {}),

      missingFields: [],

      history: history.map((item) => ({
        ...item,
        timestamp: new Date().toISOString(),
      })),

      latestMessage: userMessage,
    });

    if (!result) {
      return null;
    }

    const extracted = result.extracted || {};

    return {
      category: extracted.category || "WATER_SUPPLY",

      subCategory: extracted.subCategory,

      country: extracted.country || "India",

      state: extracted.state || "",

      district: extracted.district,

      block: extracted.block,

      villageWard: extracted.villageWard,

      severity: extracted.severity || "MEDIUM",

      affectedPopulationEst: extracted.affectedPopulationEst || 0,

      summary: extracted.description || "",

      missingFields: result.missingFields || [],

      nextFollowUpQuestion: result.response || "",

      confidence: result.confidence ?? 0,
    };
  }

  /**
   * ---------------------------------------------------------
   * Policy analyst
   * ---------------------------------------------------------
   */
  public static async generatePolicyAnswer(
    query: string,
    groundedContext: unknown,
  ): Promise<string | null> {
    const apiKey = this.getApiKey();

    if (!apiKey) {
      return null;
    }

    try {
      const prompt = `
You are Nexa Senior Policy Analyst.

Answer the policymaker's question strictly using the supplied
database context.

Do not invent statistics.

Do not claim that something exists if it is not present in the data.

Question:
${query}

Database context:
${JSON.stringify(groundedContext, null, 2)}

Provide a clear analytical answer.

Use:
- concise headings
- bullet points
- relevant numerical metrics
- comparisons where the data supports them
- clearly identify limitations where information is missing

Recommendations must be presented as options supported by the
available evidence, not as fabricated facts.

Return normal markdown.
`;

      return await this.callGeminiText(apiKey, prompt, 1400);
    } catch (error) {
      console.error("[LlmService] Policy analysis failed:", error);

      return null;
    }
  }

  /**
   * ---------------------------------------------------------
   * ElevenLabs TTS
   * ---------------------------------------------------------
   *
   * Delegates to ElevenLabsService (the real implementation).
   * Kept here so older callers keep working.
   */
  public static async synthesizeSpeechElevenLabs(
    text: string,
    voiceId?: string,
    language?: string,
  ): Promise<Buffer | null> {
    return ElevenLabsService.textToSpeech(text, { voiceId, language });
  }

  /**
   * ---------------------------------------------------------
   * Gemini extended thinking
   * ---------------------------------------------------------
   *
   * Configured via GEMINI_THINKING_BUDGET in .env:
   *   (empty) -> not sent, default model behaviour
   *   -1      -> dynamic thinking
   *   >=0     -> fixed thinking budget (tokens)
   */
  private static thinkingGenerationConfig(): Record<string, unknown> {
    const budget = CONFIG.GEMINI_THINKING_BUDGET;

    if (budget === null) {
      return {};
    }

    return {
      thinkingConfig: {
        thinkingBudget: budget,
        includeThoughts: false,
      },
    };
  }

  /**
   * ---------------------------------------------------------
   * Gemini JSON request
   * ---------------------------------------------------------
   */
  private static async callGeminiJson<T>(
    apiKey: string,

    prompt: string,

    maxOutputTokens: number,
  ): Promise<T | null> {
    const response = await fetch(
      `${this.GEMINI_BASE_URL}/${this.GEMINI_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          contents: [
            {
              role: "user",

              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],

          generationConfig: {
            temperature: 0.1,

            maxOutputTokens,

            responseMimeType: "application/json",

            ...this.thinkingGenerationConfig(),
          },
        }),
      },
    );

    const data = (await response.json()) as GeminiResponse;

    if (!response.ok) {
      console.error(
        "[Gemini] API error:",
        data.error?.message || `HTTP ${response.status}`,
      );

      return null;
    }

    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawText) {
      return null;
    }

    return this.parseJson<T>(rawText);
  }

  /**
   * ---------------------------------------------------------
   * Gemini text request
   * ---------------------------------------------------------
   */
  private static async callGeminiText(
    apiKey: string,
    prompt: string,
    maxOutputTokens: number,
  ): Promise<string | null> {
    const response = await fetch(
      `${this.GEMINI_BASE_URL}/${this.GEMINI_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          contents: [
            {
              role: "user",

              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],

          generationConfig: {
            temperature: 0.2,

            maxOutputTokens,

            ...this.thinkingGenerationConfig(),
          },
        }),
      },
    );

    const data = (await response.json()) as GeminiResponse;

    if (!response.ok) {
      console.error(
        "[Gemini] API error:",
        data.error?.message || `HTTP ${response.status}`,
      );

      return null;
    }

    return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null;
  }

  /**
   * ---------------------------------------------------------
   * Safe JSON parser
   * ---------------------------------------------------------
   */
  private static parseJson<T>(text: string): T | null {
    try {
      return JSON.parse(text) as T;
    } catch {
      /**
       * Gemini should return JSON because responseMimeType
       * is set, but this fallback protects the application
       * from accidental markdown/code fences.
       */
      const cleaned = text
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();

      try {
        return JSON.parse(cleaned) as T;
      } catch {
        /**
         * Last attempt: locate the outermost JSON object.
         */
        const start = cleaned.indexOf("{");

        const end = cleaned.lastIndexOf("}");

        if (start !== -1 && end !== -1 && end > start) {
          try {
            return JSON.parse(cleaned.slice(start, end + 1)) as T;
          } catch {
            // Fall through.
          }
        }

        console.warn("[Gemini] Failed to parse JSON:", text);

        return null;
      }
    }
  }

  /**
   * ---------------------------------------------------------
   * Sanitize conversation result
   * ---------------------------------------------------------
   *
   * This doesn't "think" for the LLM.
   *
   * It simply prevents invalid data from entering Prisma.
   */
  private static sanitizeConversationResult(
    result: LlmConversationResult,
  ): LlmConversationResult {
    const output: LlmConversationResult = {
      ...result,
    };

    /**
     * Normalize language representation.
     */
    if (result.language) {
      output.language = this.normalizeLanguageCode(result.language);
    }

    /**
     * Validate category.
     */
    if (result.extracted?.category) {
      const validCategories = new Set<string>([
        "WATER_SUPPLY",
        "RURAL_ROADS",
        "POWER_GRID",
        "HEALTHCARE",
        "SANITATION",
        "EDUCATION",
        "FLOOD_DRAINAGE",
      ]);

      if (!validCategories.has(result.extracted.category)) {
        delete output.extracted?.category;
      }
    }

    /**
     * Validate severity.
     */
    if (result.extracted?.severity) {
      const validSeverities = new Set(["CRITICAL", "HIGH", "MEDIUM", "LOW"]);

      if (!validSeverities.has(result.extracted.severity)) {
        delete output.extracted?.severity;
      }
    }

    /**
     * Confidence should remain between 0 and 1.
     */
    if (typeof result.confidence === "number") {
      output.confidence = Math.min(1, Math.max(0, result.confidence));
    }

    /**
     * Clean missing fields.
     */
    if (Array.isArray(result.missingFields)) {
      output.missingFields = result.missingFields.filter(
        (field) => typeof field === "string" && field.trim().length > 0,
      );
    } else {
      output.missingFields = [];
    }

    /**
     * Make sure extracted exists.
     */
    output.extracted = result.extracted || {};

    return output;
  }

  /**
   * Convert common LLM language names to Twilio language codes.
   *
   * This is normalization only.
   *
   * The LLM decides the language.
   */
  private static normalizeLanguageCode(language: string): SupportedLanguage {
    const value = language.trim().toLowerCase().replace("_", "-");

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

    return aliases[value] || "hi-IN";
  }

  /**
   * ---------------------------------------------------------
   * Fallback response
   * ---------------------------------------------------------
   */
  private static getFallbackResponse(language: string): string {
    const normalized = this.normalizeLanguageCode(language);

    const responses: Partial<Record<SupportedLanguage, string>> = {
      "hi-IN": "कृपया अपनी समस्या, जिला और गांव या क्षेत्र का नाम बताएं।",

      "en-IN":
        "Please tell me your problem, district, and village or area name.",

      "bn-IN": "অনুগ্রহ করে আপনার সমস্যা, জেলা এবং গ্রাম বা এলাকার নাম বলুন।",

      "ta-IN":
        "தயவுசெய்து உங்கள் பிரச்சினை, மாவட்டம் மற்றும் கிராமம் அல்லது பகுதியின் பெயரைச் சொல்லுங்கள்।",

      "te-IN":
        "దయచేసి మీ సమస్య, జిల్లా మరియు గ్రామం లేదా ప్రాంతం పేరు చెప్పండి.",

      "mr-IN": "कृपया तुमची समस्या, जिल्हा आणि गाव किंवा परिसराचे नाव सांगा.",

      "gu-IN":
        "કૃપા કરીને તમારી સમસ્યા, જિલ્લો અને ગામ અથવા વિસ્તારનું નામ જણાવો.",

      "kn-IN":
        "ದಯವಿಟ್ಟು ನಿಮ್ಮ ಸಮಸ್ಯೆ, ಜಿಲ್ಲೆ ಮತ್ತು ಗ್ರಾಮದ ಅಥವಾ ಪ್ರದೇಶದ ಹೆಸರನ್ನು ತಿಳಿಸಿ.",

      "ml-IN":
        "ദയവായി നിങ്ങളുടെ പ്രശ്നം, ജില്ല, ഗ്രാമം അല്ലെങ്കിൽ പ്രദേശത്തിന്റെ പേര് പറയുക.",

      "pa-IN":
        "ਕਿਰਪਾ ਕਰਕੇ ਆਪਣੀ ਸਮੱਸਿਆ, ਜ਼ਿਲ੍ਹਾ ਅਤੇ ਪਿੰਡ ਜਾਂ ਇਲਾਕੇ ਦਾ ਨਾਮ ਦੱਸੋ।",
    };

    return responses[normalized] || responses["hi-IN"]!;
  }

  /**
   * Core citizen system prompt.
   */
  private static readonly citizenSystemPrompt = `
You are Nexa, a multilingual citizen grievance registration
assistant for India.

You communicate with citizens through telephone conversations.

Your job is to understand natural human speech and help citizens
register complaints about public infrastructure and government
services.

SUPPORTED DOMAINS

The application currently supports these grievance sectors:

WATER_SUPPLY
RURAL_ROADS
POWER_GRID
HEALTHCARE
SANITATION
EDUCATION
FLOOD_DRAINAGE

LANGUAGE

You understand:

Hindi
Hinglish
English
Bengali
Tamil
Telugu
Marathi
Gujarati
Kannada
Malayalam
Punjabi

Citizens may mix languages naturally.

Examples:

"mere gaon mein paani nahi aa raha"

"எங்க ஊரில் மூன்று வாரமாக தண்ணீர் வரவில்லை"

"আমাদের গ্রামে রাস্তা পুরোপুরি নষ্ট হয়ে গেছে"

"Bijli teen din se nahi hai"

Do not require grammatically perfect language.

LANGUAGE PRIORITY

The phone country/language is only a hint.

The actual language spoken by the citizen has priority.

If the citizen speaks Hindi, respond in Hindi.

If the citizen speaks Tamil, respond in Tamil.

If the citizen speaks Bengali, respond in Bengali.

If the citizen speaks Telugu, respond in Telugu.

If the citizen speaks Marathi, respond in Marathi.

If the citizen speaks Gujarati, respond in Gujarati.

If the citizen speaks Kannada, respond in Kannada.

If the citizen speaks Malayalam, respond in Malayalam.

If the citizen speaks Punjabi, respond in Punjabi.

If the citizen speaks Russian, respond in Russian.

If the citizen speaks Chinese (Mandarin), respond in Chinese.

If the citizen speaks Portuguese (Brazil), respond in Portuguese.

If the citizen changes language during the conversation,
you may change to the new language.

Do not force the citizen to use the language associated with
their phone number.

CONVERSATION

Do NOT follow a rigid questionnaire.

Citizens may provide multiple pieces of information in one sentence.

For example:

"Main Bahraich ke Mahsi block se bol raha hoon aur hamare yahan
teen hafte se handpump kharab hai."

From this single message you should understand:

district = Bahraich
block = Mahsi
description = handpump has been broken for three weeks
category = WATER_SUPPLY
duration/severity may be inferred only if reasonably supported

Do not ask for information that has already been provided.

If the citizen gives additional information later, merge it with
the information already known.

If the citizen corrects something, use the corrected value.

LOCATION

Understand Indian location names from natural speech.

Do not invent a location.

Do not turn an unknown location into a known location merely because
it sounds similar.

If the citizen says:

"Mahsi"

you may extract Mahsi as an area/block if the context supports it.

If you are not sure whether something is a district, block, village,
ward, or area, preserve the text and do not fabricate certainty.

GRIEVANCE INFORMATION

Required before registration:

1. citizenName (the user's name — always ask when missing)
2. category
3. district
4. village, block, ward, or area
5. description

State is useful and should be collected when available.

Optional:

- subCategory
- severity
- affectedPopulationEst

Do not invent population numbers.

Do not invent severity.

Severity should only be determined from the citizen's description
and contextual evidence.

CONFIRMATION

Once the required information has been collected:

1. Summarize the complaint.
2. Tell the citizen what was understood.
3. Ask whether the information is correct.
4. Wait for confirmation.

Only set confirmed=true when the citizen clearly confirms.

Examples of confirmation:

"haan"
"yes"
"sahi hai"
"bilkul"
"register kar do"
"kar dijiye"
"that's correct"
"yes, please register it"

If the citizen says no or corrects information:

confirmed must remain false.

Update the extracted information instead.

IMPORTANT

You are an understanding and conversation layer.

You do NOT create the database ticket.

You do NOT invent government departments.

You do NOT invent government schemes.

You do NOT invent statistics.

You do NOT claim that a complaint was registered.

You do NOT say the reference/ticket number "will be sent shortly" or
"will be shared later". The application generates the ticket immediately
at registration time and sends it directly in the confirmation message.

The application performs registration after confirmed=true.

TELEPHONE RESPONSE STYLE

Responses must sound natural when spoken by a voice assistant.

Avoid:

- markdown
- tables
- long paragraphs
- complicated formatting
- excessive explanations

Keep responses concise.

Ask one useful question at a time unless several pieces of information
naturally belong together.

Never repeatedly ask for information already collected.

OUTPUT

Always return structured JSON according to the schema requested
by the application.

Never return markdown fences.
`;
}

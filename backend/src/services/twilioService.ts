import twilio from "twilio";
import { CONFIG } from "../config.js";

const TwilioVoiceResponse = twilio.twiml.VoiceResponse;

/**
 * Languages supported by Nexa.
 *
 * These are application-level identifiers.
 * Twilio-specific configuration is mapped separately below.
 */
export type SupportedIndianLanguage =
  | "hi-IN"
  | "en-IN"
  | "bn-IN"
  | "ta-IN"
  | "te-IN"
  | "mr-IN"
  | "gu-IN"
  | "kn-IN"
  | "ml-IN"
  | "pa-IN"
  | "ur-IN";

/**
 * Twilio configuration for each language.
 *
 * Keep these values separate from the language type used
 * throughout the application.
 */
interface TwilioLanguageConfig {
  gatherLanguage: string;
  sayLanguage: string;
  voice: string;
}

const LANGUAGE_CONFIG: Record<SupportedIndianLanguage, TwilioLanguageConfig> = {
  "hi-IN": {
    gatherLanguage: "hi-IN",
    sayLanguage: "hi-IN",
    voice: "Google.hi-IN-Wavenet-D",
  },

  "en-IN": {
    gatherLanguage: "en-IN",
    sayLanguage: "en-IN",
    voice: "Google.en-IN-Wavenet-D",
  },

  "bn-IN": {
    gatherLanguage: "bn-IN",
    sayLanguage: "bn-IN",
    voice: "Google.bn-IN-Wavenet-C",
  },

  "ta-IN": {
    gatherLanguage: "ta-IN",
    sayLanguage: "ta-IN",
    voice: "Google.ta-IN-Wavenet-C",
  },

  "te-IN": {
    gatherLanguage: "te-IN",
    sayLanguage: "te-IN",
    voice: "Google.te-IN-Wavenet-A",
  },

  "mr-IN": {
    gatherLanguage: "mr-IN",
    sayLanguage: "mr-IN",
    voice: "Google.mr-IN-Wavenet-C",
  },

  "gu-IN": {
    gatherLanguage: "gu-IN",
    sayLanguage: "gu-IN",
    voice: "Google.gu-IN-Wavenet-A",
  },

  "kn-IN": {
    gatherLanguage: "kn-IN",
    sayLanguage: "kn-IN",
    voice: "Google.kn-IN-Wavenet-A",
  },

  "ml-IN": {
    gatherLanguage: "ml-IN",
    sayLanguage: "ml-IN",
    voice: "Google.ml-IN-Wavenet-C",
  },

  "pa-IN": {
    gatherLanguage: "pa-IN",
    sayLanguage: "pa-IN",
    voice: "Google.pa-IN-Wavenet-A",
  },

  "ur-IN": {
    gatherLanguage: "ur-IN",
    sayLanguage: "ur-IN",
    voice: "Google.ur-IN-Standard-A",
  },
};

export class TwilioService {
  /**
   * Detect the initial language from the phone number.
   *
   * IMPORTANT:
   * An Indian phone number cannot reliably tell us
   * whether someone speaks Hindi, Tamil, Bengali, etc.
   *
   * Therefore +91 only establishes India.
   * Hindi is used as the initial fallback language.
   *
   * The actual spoken language is detected by the LLM.
   */
  public static detectLanguageFromPhone(
    phone: string,
  ): SupportedIndianLanguage {
    const cleanPhone = phone.replace(/\D/g, "");

    if (cleanPhone.startsWith("91")) {
      return "hi-IN";
    }

    return "hi-IN";
  }

  /**
   * Normalize language returned by the LLM.
   *
   * This is NOT conversational logic.
   * It simply converts common language names/codes
   * into the application's supported language IDs.
   */
  public static normalizeLanguage(value?: string): SupportedIndianLanguage {
    if (!value) {
      return "hi-IN";
    }

    const normalized = value.trim().toLowerCase();

    const aliases: Record<string, SupportedIndianLanguage> = {
      // Hindi
      hindi: "hi-IN",
      "hi-in": "hi-IN",
      hi_in: "hi-IN",
      hi: "hi-IN",
      हिंदी: "hi-IN",
      हिन्दी: "hi-IN",

      // English
      english: "en-IN",
      "en-in": "en-IN",
      en_in: "en-IN",
      en: "en-IN",
      अंग्रेज़ी: "en-IN",
      अंग्रेजी: "en-IN",

      // Bengali
      bengali: "bn-IN",
      bangla: "bn-IN",
      "bn-in": "bn-IN",
      bn_in: "bn-IN",
      bn: "bn-IN",
      বাংলা: "bn-IN",

      // Tamil
      tamil: "ta-IN",
      "ta-in": "ta-IN",
      ta_in: "ta-IN",
      ta: "ta-IN",
      தமிழ்: "ta-IN",

      // Telugu
      telugu: "te-IN",
      "te-in": "te-IN",
      te_in: "te-IN",
      te: "te-IN",
      తెలుగు: "te-IN",

      // Marathi
      marathi: "mr-IN",
      "mr-in": "mr-IN",
      mr_in: "mr-IN",
      mr: "mr-IN",
      मराठी: "mr-IN",

      // Gujarati
      gujarati: "gu-IN",
      "gu-in": "gu-IN",
      gu_in: "gu-IN",
      gu: "gu-IN",
      ગુજરાતી: "gu-IN",

      // Kannada
      kannada: "kn-IN",
      "kn-in": "kn-IN",
      kn_in: "kn-IN",
      kn: "kn-IN",
      ಕನ್ನಡ: "kn-IN",

      // Malayalam
      malayalam: "ml-IN",
      "ml-in": "ml-IN",
      ml_in: "ml-IN",
      ml: "ml-IN",
      മലയാളം: "ml-IN",

      // Punjabi
      punjabi: "pa-IN",
      "pa-in": "pa-IN",
      pa_in: "pa-IN",
      pa: "pa-IN",
      ਪੰਜਾਬੀ: "pa-IN",

      // Urdu
      urdu: "ur-IN",
      "ur-in": "ur-IN",
      ur_in: "ur-IN",
      ur: "ur-IN",
      اردو: "ur-IN",
    };

    return aliases[normalized] || "hi-IN";
  }

  /**
   * Get the Twilio configuration for a language.
   */
  private static getLanguageConfig(
    language: SupportedIndianLanguage,
  ): TwilioLanguageConfig {
    return LANGUAGE_CONFIG[language] || LANGUAGE_CONFIG["hi-IN"];
  }

  /**
   * Initial language-selection prompt.
   *
   * The caller says:
   *
   * "Hindi"
   * "Tamil"
   * "English"
   * "मैं हिंदी में बात करना चाहता हूं"
   * etc.
   *
   * The speech transcript is then sent to the LLM.
   */
  public static generateLanguageSelectionTwiML(
    message: string,
    actionUrl: string,
  ): string {
    const response = new TwilioVoiceResponse();

    const gather = response.gather({
      input: ["speech"],
      action: actionUrl,
      method: "POST",

      /**
       * Hindi is only the language used to understand
       * the initial language-selection request.
       */
      language: "hi-IN",

      speechTimeout: "auto",
      actionOnEmptyResult: true,
    });

    gather.say(
      {
        language: "hi-IN",
        voice: "Google.hi-IN-Wavenet-D",
      },
      message,
    );

    /**
     * If no speech was captured, repeat the prompt.
     */
    response.say(
      {
        language: "hi-IN",
        voice: "Google.hi-IN-Wavenet-D",
      },
      "कृपया अपनी भाषा का नाम बोलें।",
    );

    response.redirect(
      {
        method: "POST",
      },
      actionUrl,
    );

    return response.toString();
  }

  /**
   * Main citizen conversation.
   *
   * The language is already determined by the conversation state.
   *
   * The LLM is responsible for deciding:
   *
   * - what the citizen means
   * - what language they are speaking
   * - what information they provided
   * - what information is missing
   * - what response should be given
   *
   * Twilio only performs speech input/output.
   */
  public static generateGatherTwiML(
    message: string,
    actionUrl: string,
    language: SupportedIndianLanguage,
    isFinished = false,
  ): string {
    const response = new TwilioVoiceResponse();

    const config = this.getLanguageConfig(language);

    if (isFinished) {
      response.say(
        {
          language: config.sayLanguage as any,
          voice: config.voice as any,
        },
        message,
      );

      response.hangup();

      return response.toString();
    }

    const gather = response.gather({
      input: ["speech"],
      action: actionUrl,
      method: "POST",

      /**
       * Speech recognition language.
       */
      language: config.gatherLanguage as any,

      speechTimeout: "auto",
      actionOnEmptyResult: true,
    });

    /**
     * Speak the LLM's response in the selected language.
     */
    gather.say(
      {
        language: config.sayLanguage as any,
        voice: config.voice as any,
      },
      message,
    );

    /**
     * If the caller says nothing, Twilio reaches here.
     */
    response.say(
      {
        language: config.sayLanguage as any,
        voice: config.voice as any,
      },
      this.getRetryMessage(language),
    );

    /**
     * Continue the conversation.
     */
    response.redirect(
      {
        method: "POST",
      },
      actionUrl,
    );

    return response.toString();
  }

  /**
   * Retry message when speech is not detected.
   */
  private static getRetryMessage(language: SupportedIndianLanguage): string {
    const messages: Record<SupportedIndianLanguage, string> = {
      "hi-IN": "कृपया अपनी बात फिर से बताएं।",

      "en-IN": "Please tell me that again.",

      "bn-IN": "দয়া করে আবার বলুন।",

      "ta-IN": "தயவுசெய்து மீண்டும் சொல்லுங்கள்.",

      "te-IN": "దయచేసి మళ్లీ చెప్పండి.",

      "mr-IN": "कृपया पुन्हा सांगा.",

      "gu-IN": "કૃપા કરીને ફરીથી જણાવો.",

      "kn-IN": "ದಯವಿಟ್ಟು ಮತ್ತೆ ಹೇಳಿ.",

      "ml-IN": "ദയവായി വീണ്ടും പറയുക.",

      "pa-IN": "ਕਿਰਪਾ ਕਰਕੇ ਦੁਬਾਰਾ ਦੱਸੋ।",

      "ur-IN": "براہ کرم دوبارہ بتائیں۔",
    };

    return messages[language];
  }

  /**
   * Create an outbound call.
   */
  public static async makeOutboundCall(
    to: string,
    webhook: string,
  ): Promise<any> {
    if (
      !CONFIG.TWILIO_ACCOUNT_SID ||
      !CONFIG.TWILIO_AUTH_TOKEN ||
      !CONFIG.TWILIO_PHONE_NUMBER
    ) {
      throw new Error(
        "Twilio credentials not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER in .env",
      );
    }

    const client = twilio(CONFIG.TWILIO_ACCOUNT_SID, CONFIG.TWILIO_AUTH_TOKEN);

    return client.calls.create({
      to,
      from: CONFIG.TWILIO_PHONE_NUMBER,
      url: webhook,
      method: "POST",
    });
  }

  /**
   * Validate that all required Twilio config is present.
   */
  public static validateTwilioConfig(): boolean {
    return !!(CONFIG.TWILIO_ACCOUNT_SID && CONFIG.TWILIO_AUTH_TOKEN && CONFIG.TWILIO_PHONE_NUMBER);
  }
}

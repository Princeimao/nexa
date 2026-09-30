import { Router } from "express";

import { AiCitizenEngine } from "../services/aiCitizenEngine.js";
import { TwilioService } from "../services/twilioService.js";

import {
  getOrCreateCitizenSession,
  updateCitizenSession,
  SUPPORTED_LANGUAGES,
  type SupportedLanguage,
} from "../services/citizenSessionStore.js";
import type { SupportedIndianLanguage } from "../services/twilioService.js";

export const twilioRouter = Router();

/**
 * ------------------------------------------------------------
 * LOCAL LANGUAGE HELPERS
 * ------------------------------------------------------------
 * The voice route needs three small pieces of state handling
 * that do not belong in the LLM engine:
 *
 * 1. Detecting which language the caller named at the
 *    language-selection prompt.
 * 2. Mapping Twilio language IDs onto session language IDs.
 * 3. Static fallback prompts when no speech was captured.
 */

const LANGUAGE_HINTS: Array<[SupportedIndianLanguage, string[]]> = [
  ["hi-IN", ["hindi", "हिंदी", "हिन्दी"]],
  ["en-IN", ["english", "अंग्रेज", "انگریز"]],
  ["bn-IN", ["bengali", "bangla", "বাংলা"]],
  ["ta-IN", ["tamil", "தமிழ்"]],
  ["te-IN", ["telugu", "తెలుగు"]],
  ["mr-IN", ["marathi", "मराठी"]],
  ["gu-IN", ["gujarati", "ગુજરાતી"]],
  ["kn-IN", ["kannada", "ಕನ್ನಡ"]],
  ["ml-IN", ["malayalam", "മലയാളം"]],
  ["pa-IN", ["punjabi", "ਪੰਜਾਬੀ"]],
  ["ur-IN", ["urdu", "اردو"]],
];

function detectLanguageFromSpeech(
  text: string,
  fallback: SupportedIndianLanguage = "hi-IN",
): SupportedIndianLanguage {
  const haystack = text.toLowerCase();
  for (const [language, hints] of LANGUAGE_HINTS) {
    if (hints.some((hint) => haystack.includes(hint.toLowerCase()))) {
      return language;
    }
  }
  return fallback;
}

/** Map a Twilio language ID onto the session language list. */
function toSessionLanguage(language: string): SupportedLanguage {
  const matched = SUPPORTED_LANGUAGES.find((l) => l === language);
  return matched ?? "hi-IN";
}

const GREETING_BY_LANGUAGE: Record<string, string> = {
  "hi-IN": "नमस्ते! अपनी समस्या बताइए, मैं आपकी मदद करूंगा।",
  "en-IN": "Hello! Please describe your problem and I will help you.",
  "bn-IN": "নমস্কার! আপনার সমস্যাটি বলুন, আমি আপনাকে সাহায্য করব।",
  "ta-IN": "வணக்கம்! உங்கள் பிரச்சனையைச் சொல்லுங்கள், நான் உதவுகிறேன்.",
  "te-IN": "నమస్కారం! మీ సమస్యను చెప్పండి, నేను సహాయం చేస్తాను.",
  "mr-IN": "नमस्कार! आपली समस्या सांगा, मी तुम्हाला मदत करेन.",
  "gu-IN": "નમસ્તે! તમારી સમસ્યા જણાવો, હું મદદ કરીશ.",
  "kn-IN": "ನಮಸ್ಕಾರ! ನಿಮ್ಮ ಸಮಸ್ಯೆಯನ್ನು ಹೇಳಿ, ನಾನು ಸಹಾಯ ಮಾಡುತ್ತೇನೆ.",
  "ml-IN": "നമസ്കാരം! നിങ്ങളുടെ പ്രശ്നം പറയൂ, ഞാൻ സഹായിക്കാം.",
  "pa-IN": "ਸਤ ਸ੍ਰੀ ਅਕਾਲ! ਆਪਣੀ ਸਮੱਸਿਆ ਦੱਸੋ, ਮੈਂ ਮਦਦ ਕਰਾਂਗਾ।",
  "ur-IN": "السلام علیکم! اپنا مسئلہ بتائیں، میں مدد کروں گا۔",
};

const RETRY_PROMPT_BY_LANGUAGE: Record<string, string> = {
  "hi-IN": "कृपया फिर से बताइए।",
  "en-IN": "Please say that again.",
  "bn-IN": "অনুগ্রহ করে আবার বলুন।",
  "ta-IN": "தயவுசெய்து மீண்டும் சொல்லுங்கள்.",
  "te-IN": "దయచేసి మళ్లీ చెప్పండి.",
  "mr-IN": "कृपया पुन्हा सांगा.",
  "gu-IN": "કૃપા કરીને ફરી કહો.",
  "kn-IN": "ದಯವಿಟ್ಟು ಮತ್ತೆ ಹೇಳಿ.",
  "ml-IN": "ദയവായി വീണ്ടും പറയൂ.",
  "pa-IN": "ਕਿਰਪਾ ਕਰਕੇ ਦੁਬਾਰਾ ਦੱਸੋ।",
  "ur-IN": "براہ کرم دوبارہ بتائیں۔",
};

const COMPLETED_PROMPT_BY_LANGUAGE: Record<string, string> = {
  "hi-IN": "आपकी शिकायत दर्ज हो गई है। टिकट नंबर {ticket}। धन्यवाद!",
  "en-IN": "Your complaint has been registered. Ticket number {ticket}. Thank you!",
  "bn-IN": "আপনার অভিযোগ নথিভুক্ত হয়েছে। টিকেট নম্বর {ticket}। ধন্যবাদ!",
  "ta-IN": "உங்கள் புகார் பதிவு செய்யப்பட்டது. டிக்கெட் எண் {ticket}. நன்றி!",
  "te-IN": "మీ ఫిర్యాదు నమోదు చేయబడింది. టికెట్ నంబర్ {ticket}. ధన్యవాదాలు!",
  "mr-IN": "तुमची तक्रार नोंदवली आहे. तिकीट क्रमांक {ticket}. धन्यवाद!",
  "gu-IN": "તમારી ફરિયાદ નોંધાઈ ગઈ છે. ટિકિટ નંબર {ticket}. આભાર!",
  "kn-IN": "ನಿಮ್ಮ ದೂರು ದಾಖಲಾಗಿದೆ. ಟಿಕೆಟ್ ಸಂಖ್ಯೆ {ticket}. ಧನ್ಯವಾದಗಳು!",
  "ml-IN": "നിങ്ങളുടെ പരാതി രേഖപ്പെടുത്തി. ടിക്കറ്റ് നമ്പർ {ticket}. നന്ദി!",
  "pa-IN": "ਤੁਹਾਡੀ ਸ਼ਿਕਾਤ ਦਰਜ ਹੋ ਗਈ ਹੈ। ਟਿਕਟ ਨੰਬਰ {ticket}। ਧੰਨਵਾਦ!",
  "ur-IN": "آپ کی شکایت درج ہو گئی ہے۔ ٹکٹ نمبر {ticket}۔ شکریہ!",
};

function promptFor(language: string, table: Record<string, string>): string {
  return table[language] ?? table["hi-IN"];
}

function completedPrompt(language: string, ticket?: string): string {
  return promptFor(language, COMPLETED_PROMPT_BY_LANGUAGE).replace(
    "{ticket}",
    ticket || "N/A",
  );
}

/**
 * Build the public webhook URL.
 *
 * Twilio must be able to reach this URL from the internet.
 * For local development, use something like ngrok/cloudflared.
 */
function getVoiceWebhookUrl(req: any): string {
  return `${req.protocol}://${req.get("host")}/api/twilio/voice`;
}

/**
 * ------------------------------------------------------------
 * INBOUND VOICE CALL
 * ------------------------------------------------------------
 *
 * The SAME route handles:
 *
 * 1. Initial greeting
 * 2. Language selection
 * 3. Citizen conversation
 * 4. Confirmation
 * 5. Completion
 *
 * There is no separate /language route.
 */
twilioRouter.post("/voice", async (req, res) => {
  try {
    const caller = String(req.body?.From || "").trim();
    const callSid = String(req.body?.CallSid || "").trim();
    const speech = String(req.body?.SpeechResult || "").trim();

    if (!caller || !callSid) {
      return res.status(400).send("Missing caller or CallSid");
    }

    const citizenName =
      String(req.body?.CallerName || "").trim() || "Voice Citizen";

    const webhookUrl = getVoiceWebhookUrl(req);

    /**
     * The session store is the source of truth for this call.
     *
     * IMPORTANT:
     * Do not recreate the language every turn from the phone number.
     * The citizen's selected/spoken language is stored in the session.
     */
    const session = getOrCreateCitizenSession(
      callSid,
      citizenName,
      toSessionLanguage(TwilioService.detectLanguageFromPhone(caller)),
    );

    console.log(
      `[Twilio] Call=${callSid} ` +
        `Phone=${caller} ` +
        `Step=${session.step} ` +
        `Language=${session.language}`,
    );

    if (!speech && session.step === "LANGUAGE_SELECTION") {
      const twiml = TwilioService.generateLanguageSelectionTwiML(
        [
          "नमस्ते! Nexa जन शिकायत सेवा में आपका स्वागत है।",
          "आप किस भाषा में बात करना चाहते हैं?",
          "आप हिंदी, English, Tamil, Telugu, Bengali, Marathi, Gujarati, Kannada, Malayalam, Punjabi या Urdu में से अपनी भाषा का नाम बोल सकते हैं।",
        ].join(" "),
        webhookUrl,
      );

      res.type("text/xml");
      return res.send(twiml);
    }

    if (session.step === "LANGUAGE_SELECTION" && speech) {
      console.log(`[Twilio] Language selection speech: "${speech}"`);

      /**
       * Detect which language the citizen named at the prompt
       * ("Hindi", "தமிழ்", "اردو" ...) and store it on the session.
       */
      const selectedLanguage = detectLanguageFromSpeech(speech);

      session.language = toSessionLanguage(selectedLanguage);
      session.step = "COLLECTING_INFORMATION";

      updateCitizenSession(session);

      const reply = promptFor(selectedLanguage, GREETING_BY_LANGUAGE);

      const twiml = TwilioService.generateGatherTwiML(
        reply,
        webhookUrl,
        selectedLanguage,
        false,
      );

      res.type("text/xml");
      return res.send(twiml);
    }

    /**
     * --------------------------------------------------------
     * NORMAL CITIZEN CONVERSATION
     * --------------------------------------------------------
     */
    if (
      session.step === "COLLECTING_INFORMATION" ||
      session.step === "CONFIRMATION"
    ) {
      /**
       * Twilio did not detect speech.
       *
       * Ask again in the CURRENT session language.
       */
      if (!speech) {
        const retryMessage = promptFor(
          session.language,
          RETRY_PROMPT_BY_LANGUAGE,
        );

        const twiml = TwilioService.generateGatherTwiML(
          retryMessage,
          webhookUrl,
          session.language,
          false,
        );

        res.type("text/xml");
        return res.send(twiml);
      }

      console.log(
        `[Twilio] Citizen speech ` + `(${session.language}): ${speech}`,
      );

      /**
       * Send the entire citizen message to the LLM engine.
       *
       * The LLM is responsible for:
       *
       * - understanding the language
       * - detecting language changes
       * - extracting category
       * - extracting location
       * - extracting description
       * - extracting severity
       * - deciding what information is missing
       * - deciding whether confirmation is required
       * - generating the response
       */
      const result = await AiCitizenEngine.processMessage({
        sessionId: `voice_${callSid}`,

        phone: caller,

        citizenName: session.citizenName,

        messageText: speech,

        channel: "VOICE_CALL",

        language: session.language,
      });

      /**
       * ------------------------------------------------------
       * UPDATE LOCAL CALL STATE
       * ------------------------------------------------------
       *
       * This is NOT conversational logic.
       *
       * It simply synchronizes the local state with the
       * result returned by the AI engine.
       */

      const actualLanguage = TwilioService.normalizeLanguage(
        result.language || session.language,
      );

      session.language = toSessionLanguage(actualLanguage);

      /**
       * Keep the state machine very small.
       *
       * The LLM decides what information is missing.
       * The route only stores the resulting state.
       */
      if (result.step === "COMPLETED") {
        session.step = "COMPLETED";
      } else if (result.step === "CONFIRMATION") {
        session.step = "CONFIRMATION";
      } else {
        session.step = "COLLECTING_INFORMATION";
      }

      /**
       * Store extracted information locally.
       */
      session.extractedData = {
        ...(result.extractedData || {}),
      };

      /**
       * Store fields already provided by the citizen.
       */
      session.providedFields = new Set(
        Object.entries(result.extractedData || {})
          .filter(
            ([, value]) =>
              value !== undefined &&
              value !== null &&
              String(value).trim() !== "",
          )
          .map(([key]) => key),
      );

      /**
       * Store missing fields as an array.
       *
       * IMPORTANT:
       *
       * Do NOT do:
       *
       * new Set(...)
       *
       * if your session type defines missingFields as string[].
       */
      session.missingFields = Array.isArray(result.missingFields)
        ? [...result.missingFields]
        : [];

      updateCitizenSession(session);

      /**
       * ------------------------------------------------------
       * SEND AI RESPONSE BACK TO CITIZEN
       * ------------------------------------------------------
       */
      const twiml = TwilioService.generateGatherTwiML(
        result.botReply,
        webhookUrl,
        actualLanguage,
        result.step === "COMPLETED",
      );

      res.type("text/xml");
      return res.send(twiml);
    }

    /**
     * --------------------------------------------------------
     * COMPLETED
     * --------------------------------------------------------
     */
    if (session.step === "COMPLETED") {
      const completedMessage = completedPrompt(
        session.language,
        session.createdTicketId,
      );

      const twiml = TwilioService.generateGatherTwiML(
        completedMessage,
        webhookUrl,
        session.language,
        true,
      );

      res.type("text/xml");
      return res.send(twiml);
    }

    /**
     * --------------------------------------------------------
     * UNKNOWN STATE
     * --------------------------------------------------------
     *
     * This should rarely happen, but resetting to language
     * selection gives the call a safe recovery path.
     */
    session.step = "LANGUAGE_SELECTION";

    updateCitizenSession(session);

    const twiml = TwilioService.generateLanguageSelectionTwiML(
      "नमस्ते! कृपया अपनी भाषा का नाम बोलें।",
      webhookUrl,
    );

    res.type("text/xml");
    return res.send(twiml);
  } catch (error) {
    console.error("[Twilio Voice Error]", error);

    /**
     * Always return valid TwiML to Twilio.
     */
    const response =
      '<?xml version="1.0" encoding="UTF-8"?>' +
      '<Response><Say language="hi-IN" voice="Google.hi-IN-Wavenet-D">' +
      "क्षमा करें, कुछ गड़बड़ हो गई है। कृपया दोबारा प्रयास करें।" +
      "</Say></Response>";

    res.type("text/xml");
    return res.status(200).send(response);
  }
});

/**
 * ------------------------------------------------------------
 * CALL STATUS CALLBACK
 * ------------------------------------------------------------
 */
twilioRouter.post("/status", (req, res) => {
  const callSid = String(req.body?.CallSid || "");
  const callStatus = String(req.body?.CallStatus || "");
  const duration = String(req.body?.CallDuration || "");

  console.log(
    `[Twilio Status] Call=${callSid} ` +
      `Status=${callStatus} ` +
      `Duration=${duration}s`,
  );

  return res.sendStatus(200);
});

/**
 * ------------------------------------------------------------
 * OUTBOUND CALL
 * ------------------------------------------------------------
 */
twilioRouter.post("/make-call", async (req, res) => {
  try {
    const to = String(req.body?.to || "").trim();

    const callbackUrl = String(req.body?.callbackUrl || "").trim();

    if (!to) {
      return res.status(400).json({
        success: false,
        error: 'Target phone number "to" is required.',
      });
    }

    const webhook = callbackUrl || getVoiceWebhookUrl(req);

    const result = await TwilioService.makeOutboundCall(to, webhook);

    return res.json({
      success: true,
      data: result,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to create call";

    return res.status(500).json({
      success: false,
      error: message,
    });
  }
});

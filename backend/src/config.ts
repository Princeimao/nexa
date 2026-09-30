import dotenv from "dotenv";
dotenv.config();

const str = (value: string | undefined, fallback = ""): string =>
  value !== undefined && value !== "" ? value : fallback;

const int = (value: string | undefined, fallback: number): number => {
  const parsed = parseInt(value ?? "", 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const optionalInt = (value: string | undefined): number | null => {
  if (value === undefined || value.trim() === "") return null;
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
};

export const CONFIG = {
  /* --------------------------------------------------------
     SERVER
     -------------------------------------------------------- */
  PORT: int(process.env.PORT, 5000),
  NODE_ENV: str(process.env.NODE_ENV, "development"),
  /** Public base URL (ngrok / domain) — used for webhook callbacks. */
  APP_BASE_URL: str(process.env.APP_BASE_URL, "http://localhost:5000"),
  CORS_ORIGIN: str(process.env.CORS_ORIGIN, "*"),
  DATABASE_URL: str(process.env.DATABASE_URL),

  GEMINI_API_KEY: str(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY),
  GOOGLE_API_KEY: str(process.env.GOOGLE_API_KEY),
  GEMINI_MODEL: str(process.env.GEMINI_MODEL),
  GEMINI_THINKING_BUDGET: optionalInt(process.env.GEMINI_THINKING_BUDGET),

  ELEVENLABS_API_KEY: str(process.env.ELEVENLABS_API_KEY),
  /** TTS model (multilingual voices, 32 languages incl. hi/zh/ru/ar/pt). */
  ELEVENLABS_TTS_MODEL: str(
    process.env.ELEVENLABS_TTS_MODEL,
    "eleven_multilingual_v2",
  ),
  /** Default TTS voice ID (ElevenLabs premade "Rachel"). */
  ELEVENLABS_TTS_VOICE_ID: str(
    process.env.ELEVENLABS_TTS_VOICE_ID,
    "21m00Tcm4TlvDq8ikWAM",
  ),
  /** MP3 output quality of synthesized audio. */
  ELEVENLABS_TTS_OUTPUT_FORMAT: str(
    process.env.ELEVENLABS_TTS_OUTPUT_FORMAT,
    "mp3_44100_128",
  ),
  /** STT (speech-to-text) model — Scribe, auto language detection. */
  ELEVENLABS_STT_MODEL: str(
    process.env.ELEVENLABS_STT_MODEL,
    "eleven_scribe_v1",
  ),

  WHATSAPP_TOKEN: str(process.env.WHATSAPP_TOKEN),
  WHATSAPP_PHONE_NUMBER_ID: str(process.env.WHATSAPP_PHONE_NUMBER_ID),
  WHATSAPP_VERIFY_TOKEN: str(process.env.WHATSAPP_VERIFY_TOKEN),

  TWILIO_ACCOUNT_SID: str(process.env.TWILIO_ACCOUNT_SID),
  TWILIO_AUTH_TOKEN: str(process.env.TWILIO_AUTH_TOKEN),
  TWILIO_PHONE_NUMBER: str(process.env.TWILIO_PHONE_NUMBER),

  SESSION_TTL_MINUTES: int(process.env.SESSION_TTL_MINUTES, 60),
};

import { CONFIG } from "../config.js";

/**
 * =========================================================
 * ELEVENLABS SPEECH SERVICES
 * =========================================================
 * Text-to-Speech  : eleven_multilingual_v2 (any language, MP3)
 * Speech-to-Text  : eleven_scribe_v1      (auto language detect)
 *
 * Reasoning / thinking stays with Gemini (see LlmService).
 * This service only converts between text and audio.
 *
 * All credentials come from CONFIG (.env).
 * =========================================================
 */

export interface SttResult {
  text: string;
  languageCode?: string;
  languageProbability?: number;
}

const DEFAULT_VOICE_ID = "21m00Tcm4TlvDq8ikWAM"; // ElevenLabs "Rachel"

export class ElevenLabsService {
  private static readonly BASE_URL = "https://api.elevenlabs.io/v1";

  /* ---------------------------------------------------------
     CONFIGURATION
     --------------------------------------------------------- */

  static get isTtsConfigured(): boolean {
    return Boolean(CONFIG.ELEVENLABS_API_KEY);
  }

  static get isSttConfigured(): boolean {
    return Boolean(CONFIG.ELEVENLABS_API_KEY);
  }

  static get ttsModel(): string {
    return CONFIG.ELEVENLABS_TTS_MODEL;
  }

  static get sttModel(): string {
    return CONFIG.ELEVENLABS_STT_MODEL;
  }

  /**
   * Voice resolution: explicit override > language hint map > env default.
   * eleven_multilingual_v2 speaks all supported languages with one voice,
   * so the language map only exists for per-language voice preference.
   */
  static voiceFor(language?: string, override?: string): string {
    if (override) return override;
    if (language) {
      const key = language.split("-")[0]?.toLowerCase();
      const mapped = key ? LANGUAGE_VOICES[key] : undefined;
      if (mapped) return mapped;
    }
    return CONFIG.ELEVENLABS_TTS_VOICE_ID || DEFAULT_VOICE_ID;
  }

  /* ---------------------------------------------------------
     TEXT -> SPEECH (TTS)
     --------------------------------------------------------- */

  /**
   * Synthesize speech. Returns MP3 bytes, or null when the
   * key is missing / the API call fails.
   */
  public static async textToSpeech(
    text: string,
    opts: { voiceId?: string; language?: string; modelId?: string } = {},
  ): Promise<Buffer | null> {
    const trimmed = text?.trim();
    if (!trimmed) return null;

    if (!this.isTtsConfigured) {
      console.warn(
        "[ElevenLabs] TTS skipped — ELEVENLABS_API_KEY is not set in .env",
      );
      return null;
    }

    const voiceId = this.voiceFor(opts.language, opts.voiceId);
    const modelId = opts.modelId || CONFIG.ELEVENLABS_TTS_MODEL;
    const outputFormat = CONFIG.ELEVENLABS_TTS_OUTPUT_FORMAT;

    try {
      const response = await fetch(
        `${this.BASE_URL}/text-to-speech/${voiceId}?output_format=${encodeURIComponent(outputFormat)}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "xi-api-key": CONFIG.ELEVENLABS_API_KEY,
          },
          body: JSON.stringify({
            text: trimmed,
            model_id: modelId,
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.8,
            },
          }),
        },
      );

      if (!response.ok) {
        const detail = await response.text().catch(() => "");
        console.warn(
          `[ElevenLabs] TTS HTTP ${response.status} (${voiceId}/${modelId}): ${detail.slice(0, 300)}`,
        );
        return null;
      }

      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (error) {
      console.warn("[ElevenLabs] TTS request failed:", error);
      return null;
    }
  }

  /* ---------------------------------------------------------
     SPEECH -> TEXT (STT / Scribe)
     --------------------------------------------------------- */

  /**
   * Transcribe an audio buffer (ogg/mp3/wav/m4a/webm...).
   * Returns null when the key is missing / the API call fails.
   */
  public static async speechToText(
    audio: Buffer,
    opts: { mimeType?: string; modelId?: string } = {},
  ): Promise<SttResult | null> {
    if (!audio || audio.length === 0) return null;

    if (!this.isSttConfigured) {
      console.warn(
        "[ElevenLabs] STT skipped — ELEVENLABS_API_KEY is not set in .env",
      );
      return null;
    }

    const modelId = opts.modelId || CONFIG.ELEVENLABS_STT_MODEL;
    const mimeType = opts.mimeType || "audio/ogg";
    const extension = extensionForMime(mimeType);

    try {
      const form = new FormData();
      form.append("model_id", modelId);
      form.append(
        "file",
        new Blob([new Uint8Array(audio)], { type: mimeType }),
        `citizen-audio.${extension}`,
      );

      const response = await fetch(`${this.BASE_URL}/speech-to-text`, {
        method: "POST",
        headers: {
          "xi-api-key": CONFIG.ELEVENLABS_API_KEY,
        },
        body: form,
      });

      if (!response.ok) {
        const detail = await response.text().catch(() => "");
        console.warn(
          `[ElevenLabs] STT HTTP ${response.status} (${modelId}): ${detail.slice(0, 300)}`,
        );
        return null;
      }

      const data = (await response.json()) as {
        text?: string;
        language_code?: string;
        language_probability?: number;
      };

      const text = (data.text || "").trim();
      if (!text) return null;

      return {
        text,
        languageCode: data.language_code,
        languageProbability:
          typeof data.language_probability === "number"
            ? data.language_probability
            : undefined,
      };
    } catch (error) {
      console.warn("[ElevenLabs] STT request failed:", error);
      return null;
    }
  }

  /* ---------------------------------------------------------
     AUDIO URL HELPERS
     --------------------------------------------------------- */

  /**
   * Convenience: text -> MP3 -> base64 (for JSON APIs).
   */
  public static async textToSpeechBase64(
    text: string,
    opts: { voiceId?: string; language?: string } = {},
  ): Promise<string | null> {
    const buffer = await this.textToSpeech(text, opts);
    return buffer ? buffer.toString("base64") : null;
  }
}

/**
 * Optional per-language premade voices.
 * Keys are ISO-639-1 codes; values are ElevenLabs voice IDs.
 * The default voice already covers every language supported by
 * eleven_multilingual_v2, so entries here are optional tweaks.
 */
const LANGUAGE_VOICES: Record<string, string> = {
  // en: "21m00Tcm4TlvDq8ikWAM", // Rachel (default)
};

function extensionForMime(mimeType: string): string {
  const map: Record<string, string> = {
    "audio/ogg": "ogg",
    "audio/opus": "ogg",
    "audio/mpeg": "mp3",
    "audio/mp3": "mp3",
    "audio/wav": "wav",
    "audio/x-wav": "wav",
    "audio/mp4": "m4a",
    "audio/m4a": "m4a",
    "audio/aac": "aac",
    "audio/webm": "webm",
  };
  return map[mimeType.toLowerCase()] ?? "ogg";
}

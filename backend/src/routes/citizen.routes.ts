import { Router } from 'express';
import {
  deleteCitizenSession,
  getCitizenSession,
} from '../services/citizenSessionStore.js';
import { AiCitizenEngine } from '../services/aiCitizenEngine.js';
import { ElevenLabsService } from '../services/elevenlabsService.js';

export const citizenRouter = Router();

const phoneFromSessionId = (sessionId: string) =>
  sessionId.replace(/^session_/, '');

// Multilingual Citizen Interactive Chat Pipeline
citizenRouter.post('/chat', async (req, res) => {
  try {
    const { sessionId, phone, citizenName, messageText, channel, language } = req.body;
    if (!messageText) {
      return res.status(400).json({ success: false, error: 'messageText is required' });
    }
    const output = await AiCitizenEngine.processMessage({
      sessionId,
      phone: phone || `+${Date.now()}`,
      citizenName: citizenName || 'Citizen',
      messageText,
      channel: channel || 'WHATSAPP',
      language: language || 'en',
    });
    res.json({ success: true, data: output });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Session State (live conversation state)
citizenRouter.get('/session/:sessionId', (req, res) => {
  try {
    const session = getCitizenSession(phoneFromSessionId(req.params.sessionId));
    if (!session) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }
    res.json({
      success: true,
      data: { ...session, providedFields: [...session.providedFields] },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

citizenRouter.post('/session/reset', (req, res) => {
  try {
    const { sessionId } = req.body;
    if (sessionId) {
      deleteCitizenSession(phoneFromSessionId(sessionId));
    }
    res.json({ success: true, message: 'Session reset successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Text-To-Speech Synthesis (ElevenLabs eleven_multilingual_v2)
citizenRouter.post('/voice/synthesize', async (req, res) => {
  try {
    const { text, voiceId, language } = req.body;
    if (!text) {
      return res.status(400).json({ success: false, error: 'Text is required' });
    }
    const audioBuffer = await ElevenLabsService.textToSpeech(text, {
      voiceId,
      language,
    });
    if (!audioBuffer) {
      return res.json({ success: false, fallbackToBrowser: true });
    }
    res.set('Content-Type', 'audio/mpeg');
    res.send(audioBuffer);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Speech-To-Text (ElevenLabs Scribe)
// Body: { audioBase64: string, mimeType?: string }
citizenRouter.post('/voice/transcribe', async (req, res) => {
  try {
    const { audioBase64, mimeType } = req.body;
    if (!audioBase64) {
      return res.status(400).json({ success: false, error: 'audioBase64 is required' });
    }

    const audio = Buffer.from(String(audioBase64), 'base64');
    if (audio.length === 0) {
      return res.status(400).json({ success: false, error: 'audioBase64 is not valid base64 audio' });
    }

    const result = await ElevenLabsService.speechToText(audio, {
      mimeType: typeof mimeType === 'string' ? mimeType : 'audio/ogg',
    });

    if (!result) {
      return res.status(503).json({
        success: false,
        error:
          'Transcription unavailable — set ELEVENLABS_API_KEY in backend/.env',
      });
    }

    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Speech model availability (so the UI can decide TTS/STT vs text)
citizenRouter.get('/voice/capabilities', (_req, res) => {
  res.json({
    success: true,
    data: {
      tts: {
        provider: 'ElevenLabs',
        model: ElevenLabsService.ttsModel,
        configured: ElevenLabsService.isTtsConfigured,
      },
      stt: {
        provider: 'ElevenLabs',
        model: ElevenLabsService.sttModel,
        configured: ElevenLabsService.isSttConfigured,
      },
      reasoning: {
        provider: 'Google Gemini',
        configured: Boolean(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY),
      },
    },
  });
});

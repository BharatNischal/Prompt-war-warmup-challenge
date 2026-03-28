/**
 * Targeted tests to cover EVERY remaining uncovered line.
 * Uses vi.doMock (not hoisted) for precise manual mock control.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('100% Coverage — Remaining Branches', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
  });

  /* ── config.js line 5-9: process.exit(1) on missing GEMINI_API_KEY ── */
  describe('Config — missing required env var', () => {
    it('calls process.exit(1) when GEMINI_API_KEY is missing', async () => {
      const originalKey = process.env.GEMINI_API_KEY;
      delete process.env.GEMINI_API_KEY;

      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('EXIT');
      });
      vi.spyOn(console, 'error').mockImplementation(() => {});

      vi.doMock('dotenv/config', () => ({}));

      try {
        await import('../../server/config.js');
      } catch (e) {
        expect(e.message).toBe('EXIT');
      }

      expect(exitSpy).toHaveBeenCalledWith(1);
      process.env.GEMINI_API_KEY = originalKey;
    });
  });

  /* ── storage.js lines 19-21: init failure ── */
  describe('Storage — init failure', () => {
    it('handles Storage constructor throwing', async () => {
      vi.doMock('dotenv/config', () => ({}));
      vi.doMock('../../server/config.js', () => ({
        default: { gcsBucket: 'test-bucket', gcpProjectId: 'test' },
      }));
      vi.doMock('../../server/services/logger.js', () => ({
        default: {
          info: vi.fn(),
          warn: vi.fn(),
          error: vi.fn(),
          debug: vi.fn(),
          critical: vi.fn(),
        },
      }));
      vi.doMock('@google-cloud/storage', () => ({
        Storage: vi.fn().mockImplementation(() => {
          throw new Error('boom');
        }),
      }));

      const { isStorageAvailable } = await import('../../server/services/storage.js');
      expect(isStorageAvailable()).toBe(false);
    });
  });

  /* ── speech.js lines 24-25: init failure ── */
  describe('Speech — init failure', () => {
    it('handles SpeechClient constructor throwing', async () => {
      vi.doMock('dotenv/config', () => ({}));
      vi.doMock('../../server/config.js', () => ({
        default: { gcpProjectId: 'test' },
      }));
      vi.doMock('../../server/services/logger.js', () => ({
        default: {
          info: vi.fn(),
          warn: vi.fn(),
          error: vi.fn(),
          debug: vi.fn(),
          critical: vi.fn(),
        },
      }));
      vi.doMock('../../server/constants.js', () => ({
        LANGUAGE_MAP: { English: { code: 'en-IN', ttsVoice: 'en-IN-Wavenet-B', gender: 'MALE' } },
        STT: {
          ENCODING: 'WEBM_OPUS',
          SAMPLE_RATE_HZ: 48000,
          MODEL: 'latest_long',
          AGRICULTURAL_HINTS: [],
        },
      }));
      vi.doMock('@google-cloud/speech', () => ({
        default: {
          SpeechClient: vi.fn().mockImplementation(() => {
            throw new Error('boom');
          }),
        },
      }));

      const { isSpeechAvailable } = await import('../../server/services/speech.js');
      expect(isSpeechAvailable()).toBe(false);
    });
  });

  /* ── tts.js lines 25-26, 38-44: init failure + mock response ── */
  describe('TTS — init failure and mock fallback', () => {
    it('returns mock response when TTS client fails to init', async () => {
      vi.doMock('dotenv/config', () => ({}));
      vi.doMock('../../server/config.js', () => ({
        default: { gcpProjectId: 'test' },
      }));
      vi.doMock('../../server/services/logger.js', () => ({
        default: {
          info: vi.fn(),
          warn: vi.fn(),
          error: vi.fn(),
          debug: vi.fn(),
          critical: vi.fn(),
        },
      }));
      vi.doMock('../../server/services/storage.js', () => ({
        uploadAudio: vi.fn(),
      }));
      vi.doMock('../../server/constants.js', () => ({
        LANGUAGE_MAP: { English: { code: 'en-IN', ttsVoice: 'en-IN-Wavenet-B', gender: 'MALE' } },
        TTS: {
          AUDIO_ENCODING: 'MP3',
          SPEAKING_RATE: 0.9,
          PITCH: 0,
          EFFECTS_PROFILE: 'x',
          DEFAULT_LANGUAGE: 'English',
        },
      }));
      vi.doMock('@google-cloud/text-to-speech', () => ({
        default: {
          TextToSpeechClient: vi.fn().mockImplementation(() => {
            throw new Error('boom');
          }),
        },
      }));

      const mod = await import('../../server/services/tts.js');
      expect(mod.isTTSAvailable()).toBe(false);

      const result = await mod.synthesizeSpeech('hello', 'English', 'id');
      expect(result.audioGenerated).toBe(false);
      expect(result.audioUrl).toBeNull();
    });
  });

  /* ── firestore.js lines 79-82: query error catch ── */
  describe('Firestore — query error', () => {
    it('returns empty array when Firestore query throws', async () => {
      vi.doMock('dotenv/config', () => ({}));
      vi.doMock('../../server/config.js', () => ({
        default: { gcpProjectId: 'test' },
      }));
      vi.doMock('../../server/services/logger.js', () => ({
        default: {
          info: vi.fn(),
          warn: vi.fn(),
          error: vi.fn(),
          debug: vi.fn(),
          critical: vi.fn(),
        },
      }));
      vi.doMock('@google-cloud/firestore', () => {
        const F = vi.fn().mockImplementation(() => ({
          collection: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                get: vi.fn().mockRejectedValue(new Error('quota exceeded')),
              }),
            }),
            add: vi.fn().mockResolvedValue({ id: 'd' }),
            doc: vi.fn().mockReturnValue({ get: vi.fn().mockResolvedValue({ exists: false }) }),
          }),
        }));
        F.FieldValue = { serverTimestamp: vi.fn().mockReturnValue('TS') };
        return { Firestore: F };
      });

      const { getAnalysisHistory } = await import('../../server/services/firestore.js');
      expect(await getAnalysisHistory({ limit: 10 })).toEqual([]);
    });
  });

  /* ── firestore.js lines 97-100: getById error catch ── */
  describe('Firestore — getById error', () => {
    it('returns null when Firestore get throws', async () => {
      vi.doMock('dotenv/config', () => ({}));
      vi.doMock('../../server/config.js', () => ({
        default: { gcpProjectId: 'test' },
      }));
      vi.doMock('../../server/services/logger.js', () => ({
        default: {
          info: vi.fn(),
          warn: vi.fn(),
          error: vi.fn(),
          debug: vi.fn(),
          critical: vi.fn(),
        },
      }));
      vi.doMock('@google-cloud/firestore', () => {
        const F = vi.fn().mockImplementation(() => ({
          collection: vi.fn().mockReturnValue({
            doc: vi.fn().mockReturnValue({
              get: vi.fn().mockRejectedValue(new Error('down')),
            }),
            orderBy: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnThis(),
            get: vi.fn().mockResolvedValue({ forEach: vi.fn() }),
            add: vi.fn().mockResolvedValue({ id: 'd' }),
          }),
        }));
        F.FieldValue = { serverTimestamp: vi.fn().mockReturnValue('TS') };
        return { Firestore: F };
      });

      const { getAnalysisById } = await import('../../server/services/firestore.js');
      expect(await getAnalysisById('valid-id-here')).toBeNull();
    });
  });

  /* ── firestore.js lines 18-20: Firestore init catch block ── */
  describe('Firestore — init failure', () => {
    it('handles Firestore constructor throwing during init', async () => {
      vi.doMock('dotenv/config', () => ({}));
      vi.doMock('../../server/config.js', () => ({
        default: { gcpProjectId: 'test' },
      }));
      vi.doMock('../../server/services/logger.js', () => ({
        default: {
          info: vi.fn(),
          warn: vi.fn(),
          error: vi.fn(),
          debug: vi.fn(),
          critical: vi.fn(),
        },
      }));
      vi.doMock('@google-cloud/firestore', () => {
        const F = vi.fn().mockImplementation(() => {
          throw new Error('Firestore init boom');
        });
        F.FieldValue = { serverTimestamp: vi.fn().mockReturnValue('TS') };
        return { Firestore: F };
      });

      const { isFirestoreAvailable } = await import('../../server/services/firestore.js');
      expect(isFirestoreAvailable()).toBe(false);
    });
  });

  /* ── tools.js lines 141-168: sendVoiceAlert full execution ── */
  describe('Tools — sendVoiceAlert execution', () => {
    it('executes send_voice_alert and returns audio', async () => {
      vi.doMock('dotenv/config', () => ({}));
      vi.doMock('../../server/config.js', () => ({
        default: { gcpProjectId: '' },
      }));
      vi.doMock('../../server/services/logger.js', () => ({
        default: {
          info: vi.fn(),
          warn: vi.fn(),
          error: vi.fn(),
          debug: vi.fn(),
          critical: vi.fn(),
        },
      }));
      vi.doMock('../../server/services/tts.js', () => ({
        synthesizeSpeech: vi.fn().mockResolvedValue({
          audioUrl: 'https://storage.test/audio.mp3',
          audioGenerated: true,
        }),
      }));

      const { executeToolCall } = await import('../../server/services/tools.js');
      const result = await executeToolCall(
        'send_voice_alert',
        {
          phone_number: '+919876543210',
          message_text: 'Cyclone warning!',
          language: 'Hindi',
          alert_severity: 'CRITICAL',
        },
        'test-id',
      );

      expect(result.success).toBe(true);
      expect(result.phone_number).toBe('+919876543210');
      expect(result.alert_severity).toBe('CRITICAL');
      expect(result.status).toBe('DELIVERED');
      expect(result.audio_url).toBe('https://storage.test/audio.mp3');
      expect(result.audio_generated).toBe(true);
    });
  });
});

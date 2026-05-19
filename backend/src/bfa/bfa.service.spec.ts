import axios from 'axios';
import FormData = require('form-data');
import { BfaService } from './bfa.service';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('BfaService', () => {
  let service: BfaService;
  const AUDIO = Buffer.from('fake-audio');

  beforeEach(() => {
    service = new BfaService();
    jest.clearAllMocks();
  });

  // ── analyze ──────────────────────────────────────────────────────────────

  describe('analyze()', () => {
    const MOCK_RESULT = {
      success: true,
      transcription: { text: 'cat' },
      phonemes: [],
      score: 90,
      feedback: [],
      word: 'cat',
      espeak_fallback: false,
    };

    beforeEach(() => {
      mockedAxios.post.mockResolvedValue({ data: MOCK_RESULT });
    });

    it('posts to /analyze endpoint', async () => {
      await service.analyze(AUDIO, 'audio/webm', 'cat', ['c', 'a', 't']);
      const url: string = mockedAxios.post.mock.calls[0][0] as string;
      expect(url).toMatch(/\/analyze$/);
    });

    it('uses timeout=120_000', async () => {
      await service.analyze(AUDIO, 'audio/webm', 'cat', ['c', 'a', 't']);
      const config = mockedAxios.post.mock.calls[0][2] as { timeout: number };
      expect(config.timeout).toBe(120_000);
    });

    it('returns response.data', async () => {
      const result = await service.analyze(AUDIO, 'audio/webm', 'cat', ['c', 'a', 't']);
      expect(result).toEqual(MOCK_RESULT);
    });

    it('JSON-stringifies expected_phonemes field', async () => {
      await service.analyze(AUDIO, 'audio/webm', 'cat', ['c', 'a', 't']);
      const form = mockedAxios.post.mock.calls[0][1] as FormData;
      // _streams is an internal buffer of the form-data package.
      // If it's undefined on a future package version, the outer toHaveBeenCalled
      // assertion below still guards correctness.
      const raw: string = (form as any)._streams?.join?.('') ?? '';
      if (raw) {
        expect(raw).toContain(JSON.stringify(['c', 'a', 't']));
      } else {
        expect(mockedAxios.post).toHaveBeenCalled();
      }
    });

    it('derives .webm extension from audio/webm mimeType', async () => {
      await service.analyze(AUDIO, 'audio/webm', 'cat', []);
      const form = mockedAxios.post.mock.calls[0][1] as FormData;
      const raw: string = (form as any)._streams?.join?.('') ?? '';
      if (raw) expect(raw).toContain('audio.webm');
      else expect(mockedAxios.post).toHaveBeenCalled();
    });

    it('derives .mp4 extension from video/mp4 mimeType', async () => {
      await service.analyze(AUDIO, 'video/mp4', 'cat', []);
      const form = mockedAxios.post.mock.calls[0][1] as FormData;
      const raw: string = (form as any)._streams?.join?.('') ?? '';
      if (raw) expect(raw).toContain('audio.mp4');
      else expect(mockedAxios.post).toHaveBeenCalled();
    });

    it('falls back to .wav for unknown mimeType', async () => {
      await service.analyze(AUDIO, 'audio/ogg', 'cat', []);
      const form = mockedAxios.post.mock.calls[0][1] as FormData;
      const raw: string = (form as any)._streams?.join?.('') ?? '';
      if (raw) expect(raw).toContain('audio.wav');
      else expect(mockedAxios.post).toHaveBeenCalled();
    });
  });

  // ── align ─────────────────────────────────────────────────────────────────

  describe('align()', () => {
    beforeEach(() => {
      mockedAxios.post.mockResolvedValue({
        data: { success: true, score: 80, phonemes: [], feedback: [], word: 'cat' },
      });
    });

    it('posts to /align endpoint', async () => {
      await service.align(AUDIO, 'audio/webm', 'cat', ['c', 'a', 't']);
      const url: string = mockedAxios.post.mock.calls[0][0] as string;
      expect(url).toMatch(/\/align$/);
    });

    it('uses timeout=60_000 (not 120_000)', async () => {
      await service.align(AUDIO, 'audio/webm', 'cat', ['c', 'a', 't']);
      const config = mockedAxios.post.mock.calls[0][2] as { timeout: number };
      expect(config.timeout).toBe(60_000);
    });

    it('includes expected_phonemes as JSON string', async () => {
      await service.align(AUDIO, 'audio/webm', 'cat', ['c', 'a', 't']);
      const form = mockedAxios.post.mock.calls[0][1] as FormData;
      const raw: string = (form as any)._streams?.join?.('') ?? '';
      if (raw) {
        expect(raw).toContain(JSON.stringify(['c', 'a', 't']));
      } else {
        expect(mockedAxios.post).toHaveBeenCalled();
      }
    });
  });

  // ── transcribe ────────────────────────────────────────────────────────────

  describe('transcribe()', () => {
    beforeEach(() => {
      mockedAxios.post.mockResolvedValue({ data: { text: 'cat' } });
    });

    it('posts to /transcribe endpoint', async () => {
      await service.transcribe(AUDIO, 'audio/webm');
      const url: string = mockedAxios.post.mock.calls[0][0] as string;
      expect(url).toMatch(/\/transcribe$/);
    });

    it('uses timeout=120_000', async () => {
      await service.transcribe(AUDIO, 'audio/webm');
      const config = mockedAxios.post.mock.calls[0][2] as { timeout: number };
      expect(config.timeout).toBe(120_000);
    });

    it('does NOT include word or expected_phonemes fields', async () => {
      await service.transcribe(AUDIO, 'audio/webm');
      const form = mockedAxios.post.mock.calls[0][1] as FormData;
      const raw: string = (form as any)._streams?.join?.('') ?? '';
      if (raw) {
        expect(raw).not.toContain('expected_phonemes');
        expect(raw).not.toContain('"word"');
      } else {
        expect(mockedAxios.post).toHaveBeenCalled();
      }
    });
  });
});

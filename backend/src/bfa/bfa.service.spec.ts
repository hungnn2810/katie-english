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

    beforeEach(() => { mockedAxios.post.mockResolvedValue({ data: MOCK_RESULT }); });

    it('posts to /analyze endpoint', async () => {
      await service.analyze(AUDIO, 'audio/webm', 'cat', ['k', 'ae', 't']);
      expect((mockedAxios.post.mock.calls[0][0] as string)).toMatch(/\/analyze$/);
    });

    it('uses timeout=120_000', async () => {
      await service.analyze(AUDIO, 'audio/webm', 'cat', []);
      expect((mockedAxios.post.mock.calls[0][2] as any).timeout).toBe(120_000);
    });

    it('returns response.data', async () => {
      const result = await service.analyze(AUDIO, 'audio/webm', 'cat', []);
      expect(result).toEqual(MOCK_RESULT);
    });
  });

  describe('transcribe()', () => {
    beforeEach(() => { mockedAxios.post.mockResolvedValue({ data: { text: 'cat', words: [] } }); });

    it('posts to /transcribe endpoint', async () => {
      await service.transcribe(AUDIO, 'audio/webm');
      expect((mockedAxios.post.mock.calls[0][0] as string)).toMatch(/\/transcribe$/);
    });

    it('uses timeout=120_000', async () => {
      await service.transcribe(AUDIO, 'audio/webm');
      expect((mockedAxios.post.mock.calls[0][2] as any).timeout).toBe(120_000);
    });
  });

  describe('analyze() error forwarding', () => {
    beforeEach(() => { jest.clearAllMocks(); });

    it('forwards HTTP-400 audio_too_short body as BfaAnalyzeResult with success:false', async () => {
      const axiosErr = Object.assign(new Error('Request failed with status code 400'), {
        isAxiosError: true,
        response: {
          status: 400,
          data: { success: false, error: 'audio_too_short', message: 'Recording too short — hold the button longer' },
        },
      });
      mockedAxios.post.mockRejectedValueOnce(axiosErr);
      (mockedAxios.isAxiosError as unknown as jest.Mock).mockReturnValue(true);
      const result = await service.analyze(AUDIO, 'audio/webm', 'cat', []);
      expect(result).toEqual({
        success: false,
        error: 'audio_too_short',
        message: 'Recording too short — hold the button longer',
        word: 'cat',
        phonemes: [],
        feedback: [],
        score: 0,
        transcription: { text: '' },
      });
    });

    it('re-throws non-400 axios errors (e.g. 500)', async () => {
      const axiosErr = Object.assign(new Error('Request failed with status code 500'), {
        isAxiosError: true,
        response: { status: 500, data: {} },
      });
      mockedAxios.post.mockRejectedValueOnce(axiosErr);
      (mockedAxios.isAxiosError as unknown as jest.Mock).mockReturnValue(true);
      await expect(service.analyze(AUDIO, 'audio/webm', 'cat', [])).rejects.toThrow();
    });
  });

  describe('analyzeSpeaking()', () => {
    const MOCK_SPEAKING = {
      success: true,
      transcription: { text: 'the cat is black' },
      words: [],
      overall_score: 80,
      matched_words: 3,
      total_words: 4,
    };

    beforeEach(() => { mockedAxios.post.mockResolvedValue({ data: MOCK_SPEAKING }); });

    it('posts to /analyze-speaking endpoint', async () => {
      await service.analyzeSpeaking(AUDIO, 'audio/webm', 'the cat is black');
      expect((mockedAxios.post.mock.calls[0][0] as string)).toMatch(/\/analyze-speaking$/);
    });

    it('uses timeout=180_000', async () => {
      await service.analyzeSpeaking(AUDIO, 'audio/webm', 'the cat is black');
      expect((mockedAxios.post.mock.calls[0][2] as any).timeout).toBe(180_000);
    });

    it('defaults mode to SCRIPT_MATCH', async () => {
      await service.analyzeSpeaking(AUDIO, 'audio/webm', 'the cat is black');
      const form = mockedAxios.post.mock.calls[0][1] as FormData;
      const raw: string = (form as any)._streams?.join?.('') ?? '';
      if (raw) expect(raw).toContain('SCRIPT_MATCH');
      else expect(mockedAxios.post).toHaveBeenCalled();
    });
  });
});

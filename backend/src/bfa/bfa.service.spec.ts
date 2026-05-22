import { BfaService } from './bfa.service';

// ── SDK mock (manual factory — auto-mock crashes on SDK init code) ────────

const mockRecognizeOnce = jest.fn();
const mockApplyTo = jest.fn();
const mockClose = jest.fn();

jest.mock('microsoft-cognitiveservices-speech-sdk', () => ({
  SpeechConfig: {
    fromSubscription: jest.fn().mockReturnValue({
      speechRecognitionLanguage: '',
      requestWordLevelTimestamps: jest.fn(),
    }),
  },
  AudioStreamFormat: {
    getWaveFormatPCM: jest.fn().mockReturnValue({}),
  },
  AudioInputStream: {
    createPushStream: jest.fn().mockReturnValue({
      write: jest.fn(),
      close: jest.fn(),
    }),
  },
  AudioConfig: {
    fromStreamInput: jest.fn().mockReturnValue({}),
  },
  PronunciationAssessmentConfig: jest.fn().mockImplementation(() => ({
    applyTo: jest.fn(),
    enableContentAssessmentWithTopic: jest.fn(),
  })),
  SpeechRecognizer: jest.fn().mockImplementation(() => ({
    recognizeOnceAsync: jest.fn(),
    close: jest.fn(),
  })),
  PronunciationAssessmentGradingSystem: { HundredMark: 1 },
  PronunciationAssessmentGranularity: { Phoneme: 2, Word: 1 },
  PropertyId: { SpeechServiceResponse_JsonResult: 'SpeechServiceResponse_JsonResult' },
  ResultReason: { RecognizedSpeech: 3 },
}));

jest.mock('./azure-audio.util', () => ({
  toWavPcm: jest.fn().mockResolvedValue(Buffer.from('fake-wav')),
}));

// Re-import sdk after mock is set up
import * as sdk from 'microsoft-cognitiveservices-speech-sdk';

function buildMockResult(overrides: Partial<{ text: string; jsonResult: object }> = {}) {
  const jsonResult = overrides.jsonResult ?? {
    NBest: [{
      PronunciationAssessment: { AccuracyScore: 85, FluencyScore: 80, PronScore: 83 },
      Words: [{
        Word: 'cat',
        PronunciationAssessment: { AccuracyScore: 88, ErrorType: 'None' },
        Phonemes: [
          { Phoneme: 'k', Offset: 5_000_000, Duration: 2_000_000, PronunciationAssessment: { AccuracyScore: 95, ErrorType: 'None' } },
          { Phoneme: 'ae', Offset: 7_000_000, Duration: 3_000_000, PronunciationAssessment: { AccuracyScore: 55, ErrorType: 'None' } },
          { Phoneme: 't', Offset: 10_000_000, Duration: 2_000_000, PronunciationAssessment: { AccuracyScore: 30, ErrorType: 'Mispronunciation' } },
        ],
      }],
    }],
  };

  return {
    text: overrides.text ?? 'cat',
    reason: 3,
    properties: {
      getProperty: jest.fn().mockReturnValue(JSON.stringify(jsonResult)),
    },
  };
}

beforeEach(() => {
  jest.clearAllMocks();

  mockRecognizeOnce.mockImplementation((cb: Function) => cb(buildMockResult()));

  (sdk.SpeechConfig.fromSubscription as jest.Mock).mockReturnValue({
    speechRecognitionLanguage: '',
    requestWordLevelTimestamps: jest.fn(),
  });
  (sdk.AudioInputStream.createPushStream as jest.Mock).mockReturnValue({
    write: jest.fn(),
    close: jest.fn(),
  });
  (sdk.AudioConfig.fromStreamInput as jest.Mock).mockReturnValue({});
  (sdk.AudioStreamFormat.getWaveFormatPCM as jest.Mock).mockReturnValue({});
  (sdk.PronunciationAssessmentConfig as unknown as jest.Mock).mockImplementation(() => ({
    applyTo: mockApplyTo,
    enableContentAssessmentWithTopic: jest.fn(),
  }));
  (sdk.SpeechRecognizer as unknown as jest.Mock).mockImplementation(() => ({
    recognizeOnceAsync: mockRecognizeOnce,
    close: mockClose,
  }));
});

// ── analyze() ─────────────────────────────────────────────────────────────

describe('BfaService.analyze()', () => {
  let service: BfaService;
  const AUDIO = Buffer.from('fake-audio');

  beforeEach(() => { service = new BfaService(); });

  it('creates SpeechRecognizer and calls recognizeOnceAsync', async () => {
    await service.analyze(AUDIO, 'audio/webm', 'cat', []);
    expect(mockRecognizeOnce).toHaveBeenCalledTimes(1);
  });

  it('applies PronunciationAssessmentConfig to recognizer', async () => {
    await service.analyze(AUDIO, 'audio/webm', 'cat', []);
    expect(mockApplyTo).toHaveBeenCalledTimes(1);
  });

  it('returns BfaAnalyzeResult with correct shape', async () => {
    const result = await service.analyze(AUDIO, 'audio/webm', 'cat', []);
    expect(result.success).toBe(true);
    expect(result.word).toBe('cat');
    expect(result.transcription.text).toBe('cat');
    expect(typeof result.score).toBe('number');
    expect(Array.isArray(result.phonemes)).toBe(true);
    expect(Array.isArray(result.feedback)).toBe(true);
  });

  it('maps AccuracyScore>=80 phoneme to status=correct', async () => {
    const result = await service.analyze(AUDIO, 'audio/webm', 'cat', []);
    const kChip = result.feedback.find(f => f.expected === 'k');
    expect(kChip?.status).toBe('correct'); // score=95
  });

  it('maps AccuracyScore=55 phoneme to status=similar', async () => {
    const result = await service.analyze(AUDIO, 'audio/webm', 'cat', []);
    const aeChip = result.feedback.find(f => f.expected === 'ae');
    expect(aeChip?.status).toBe('similar'); // score=55
  });

  it('maps Mispronunciation + AccuracyScore<50 to status=substituted', async () => {
    const result = await service.analyze(AUDIO, 'audio/webm', 'cat', []);
    const tChip = result.feedback.find(f => f.expected === 't');
    expect(tChip?.status).toBe('substituted'); // score=30 + Mispronunciation
  });

  it('maps ErrorType=Omission to status=missing', async () => {
    mockRecognizeOnce.mockImplementationOnce((cb: Function) =>
      cb(buildMockResult({
        jsonResult: {
          NBest: [{
            PronunciationAssessment: { AccuracyScore: 80 },
            Words: [{
              Word: 'cat',
              PronunciationAssessment: { AccuracyScore: 80, ErrorType: 'None' },
              Phonemes: [
                { Phoneme: 't', Offset: 0, Duration: 0, PronunciationAssessment: { AccuracyScore: 0, ErrorType: 'Omission' } },
              ],
            }],
          }],
        },
      })),
    );
    const result = await service.analyze(AUDIO, 'audio/webm', 'cat', []);
    expect(result.feedback[0].status).toBe('missing');
    expect(result.feedback[0].aligned).toBeNull();
  });

  it('maps ErrorType=Insertion to status=extra', async () => {
    mockRecognizeOnce.mockImplementationOnce((cb: Function) =>
      cb(buildMockResult({
        jsonResult: {
          NBest: [{
            PronunciationAssessment: { AccuracyScore: 80 },
            Words: [{
              Word: 'cat',
              PronunciationAssessment: { AccuracyScore: 80, ErrorType: 'None' },
              Phonemes: [
                { Phoneme: 'x', Offset: 0, Duration: 1_000_000, PronunciationAssessment: { AccuracyScore: 90, ErrorType: 'Insertion' } },
              ],
            }],
          }],
        },
      })),
    );
    const result = await service.analyze(AUDIO, 'audio/webm', 'cat', []);
    expect(result.feedback[0].status).toBe('extra');
    expect(result.feedback[0].expected).toBeNull();
  });

  it('converts Offset/Duration from 100ns units to seconds', async () => {
    const result = await service.analyze(AUDIO, 'audio/webm', 'cat', []);
    const kChip = result.feedback.find(f => f.expected === 'k');
    expect(kChip?.start).toBeCloseTo(0.5);     // 5_000_000 / 10_000_000
    expect(kChip?.duration).toBeCloseTo(0.2);  // 2_000_000 / 10_000_000
  });

  it('excludes Omission phonemes from phonemes array', async () => {
    mockRecognizeOnce.mockImplementationOnce((cb: Function) =>
      cb(buildMockResult({
        jsonResult: {
          NBest: [{
            PronunciationAssessment: { AccuracyScore: 80 },
            Words: [{
              Word: 'cat',
              PronunciationAssessment: { AccuracyScore: 80, ErrorType: 'None' },
              Phonemes: [
                { Phoneme: 'k', Offset: 0, Duration: 1_000_000, PronunciationAssessment: { AccuracyScore: 90, ErrorType: 'None' } },
                { Phoneme: 'ae', Offset: 0, Duration: 0, PronunciationAssessment: { AccuracyScore: 0, ErrorType: 'Omission' } },
              ],
            }],
          }],
        },
      })),
    );
    const result = await service.analyze(AUDIO, 'audio/webm', 'cat', []);
    expect(result.phonemes).toHaveLength(1);
    expect(result.phonemes[0].symbol).toBe('k');
  });
});

// ── transcribe() ──────────────────────────────────────────────────────────

describe('BfaService.transcribe()', () => {
  let service: BfaService;
  const AUDIO = Buffer.from('fake-audio');

  beforeEach(() => { service = new BfaService(); });

  it('returns WhisperXResult shape', async () => {
    const result = await service.transcribe(AUDIO, 'audio/webm');
    expect(typeof result.text).toBe('string');
    expect(Array.isArray(result.words)).toBe(true);
  });

  it('does NOT apply PronunciationAssessmentConfig', async () => {
    await service.transcribe(AUDIO, 'audio/webm');
    expect(mockApplyTo).not.toHaveBeenCalled();
  });
});

// ── analyzeSpeaking() ─────────────────────────────────────────────────────

describe('BfaService.analyzeSpeaking()', () => {
  let service: BfaService;
  const AUDIO = Buffer.from('fake-audio');

  beforeEach(() => {
    service = new BfaService();
    mockRecognizeOnce.mockImplementation((cb: Function) =>
      cb(buildMockResult({
        text: 'the cat is black',
        jsonResult: {
          NBest: [{
            PronunciationAssessment: { AccuracyScore: 80, FluencyScore: 75, PronScore: 78 },
            Words: [
              {
                Word: 'the', Offset: 0, Duration: 2_000_000,
                PronunciationAssessment: { AccuracyScore: 90, ErrorType: 'None' },
                Phonemes: [],
              },
              {
                Word: 'cat', Offset: 2_000_000, Duration: 3_000_000,
                PronunciationAssessment: { AccuracyScore: 75, ErrorType: 'None' },
                Phonemes: [],
              },
            ],
          }],
        },
      })),
    );
  });

  it('returns BfaSpeakingResult shape', async () => {
    const result = await service.analyzeSpeaking(AUDIO, 'audio/webm', 'the cat is black');
    expect(result.success).toBe(true);
    expect(typeof result.overall_score).toBe('number');
    expect(Array.isArray(result.words)).toBe(true);
    expect(typeof result.matched_words).toBe('number');
    expect(typeof result.total_words).toBe('number');
  });

  it('uses referenceText=targetText for SCRIPT_MATCH', async () => {
    await service.analyzeSpeaking(AUDIO, 'audio/webm', 'the cat is black', 'SCRIPT_MATCH');
    const config = (sdk.PronunciationAssessmentConfig as unknown as jest.Mock).mock.calls[0];
    expect(config[0]).toBe('the cat is black');
  });

  it('uses empty referenceText for FREE_SPEAK', async () => {
    await service.analyzeSpeaking(AUDIO, 'audio/webm', 'the cat is black', 'FREE_SPEAK');
    const config = (sdk.PronunciationAssessmentConfig as unknown as jest.Mock).mock.calls[0];
    expect(config[0]).toBe('');
  });

  it('calls enableContentAssessmentWithTopic for FREE_SPEAK', async () => {
    const mockEnableContent = jest.fn();
    (sdk.PronunciationAssessmentConfig as unknown as jest.Mock).mockImplementationOnce(() => ({
      applyTo: mockApplyTo,
      enableContentAssessmentWithTopic: mockEnableContent,
    }));
    await service.analyzeSpeaking(AUDIO, 'audio/webm', 'tell me about your family', 'FREE_SPEAK');
    expect(mockEnableContent).toHaveBeenCalledWith('general');
  });

  it('counts matched_words as words with score>=70', async () => {
    const result = await service.analyzeSpeaking(AUDIO, 'audio/webm', 'the cat is black');
    // 'the'=90 (matched), 'cat'=75 (matched) — both >=70
    expect(result.matched_words).toBe(2);
  });

  it('sets total_words from targetText word count', async () => {
    const result = await service.analyzeSpeaking(AUDIO, 'audio/webm', 'the cat is black');
    expect(result.total_words).toBe(4); // 'the cat is black' = 4 words
  });
});

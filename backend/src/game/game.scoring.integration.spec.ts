/**
 * Integration tests — require BFA service running at BFA_URL (default http://localhost:3002).
 * Skipped automatically when BFA is unreachable.
 * Audio fixtures: src/game/__fixtures__/*.m4a (teacher reference recordings)
 */

import * as fs from 'fs';
import * as path from 'path';

const BFA_URL = process.env.BFA_URL ?? 'http://localhost:3002';
const FIXTURES = path.join(__dirname, '__fixtures__');
const PASS_THRESHOLD = 60;

const WORDS = [
  'argue', 'belt', 'bag', 'beef', 'bee', 'blue', 'boast', 'cash', 'cat', 'car',
  'coach', 'coat', 'cook', 'count', 'chin', 'fact', 'feet', 'fork', 'good', 'grand',
  'hen', 'her', 'hint', 'jam', 'jail', 'kick', 'limit', 'magpie', 'main', 'moon',
  'object', 'out', 'pant', 'pie', 'rat', 'raincoat', 'rain', 'snack', 'snail', 'snip',
  'snort', 'speed', 'spoon', 'sport', 'sun', 'test', 'true', 'than', 'that', 'thin',
  'thorn', 'vest', 'waiter', 'wing', 'wish', 'yet', 'wax',
];

let bfaAvailable = false;

beforeAll(async () => {
  try {
    const res = await fetch(`${BFA_URL}/health`, { signal: AbortSignal.timeout(3000) });
    bfaAvailable = res.ok;
  } catch {
    console.warn(`[integration] BFA not reachable at ${BFA_URL} — all tests skipped`);
  }
});

async function alignWord(word: string, audioPath: string, expectedPhonemes: string[] = []) {
  const form = new FormData();
  const buf = fs.readFileSync(audioPath);
  form.append('audio', new Blob([buf], { type: 'audio/mp4' }), `${word}.m4a`);
  form.append('word', word);
  form.append('expected_phonemes', JSON.stringify(expectedPhonemes));

  const res = await fetch(`${BFA_URL}/align`, {
    method: 'POST',
    body: form,
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`BFA HTTP ${res.status}: ${await res.text()}`);
  return res.json() as Promise<{
    success: boolean;
    score: number;
    phonemes: { ipa: string; symbol: string }[];
    feedback: { status: string; expected: string | null; aligned: string | null }[];
    espeak_fallback?: boolean;
  }>;
}

describe('BFA scoring — reference audio fixtures', () => {
  it.each(WORDS)(`%s scores >= ${PASS_THRESHOLD}%%`, async (word) => {
    if (!bfaAvailable) { console.warn(`skip: BFA unavailable`); return; }

    const audioPath = path.join(FIXTURES, `${word}.m4a`);
    if (!fs.existsSync(audioPath)) { console.warn(`skip: missing ${word}.m4a`); return; }

    const result = await alignWord(word, audioPath);

    console.log(
      `  ${word}: success=${result.success} score=${result.score}` +
      (result.espeak_fallback ? ' [espeak]' : '') +
      ` aligned=[${result.phonemes.map((p) => p.symbol).join(',')}]`,
    );

    expect(result.success).toBe(true);
    expect(result.score).toBeGreaterThanOrEqual(PASS_THRESHOLD);
  }, 60_000);
});

describe('BFA scoring — phoneme spot checks', () => {
  const SPOT: { word: string; expected: string[] }[] = [
    { word: 'cat',  expected: ['c', 'a', 't'] },
    { word: 'chin', expected: ['ch', 'i', 'n'] },
    { word: 'wish', expected: ['w', 'i', 'sh'] },
    { word: 'thin', expected: ['th', 'i', 'n'] },
    { word: 'moon', expected: ['m', 'oo', 'n'] },
    { word: 'wing', expected: ['w', 'i', 'ng'] },
    { word: 'feet', expected: ['f', 'i', 't'] },
    { word: 'rain', expected: ['r', 'e', 'n'] },
  ];

  it.each(SPOT)('$word with explicit phonemes scores >= 60%', async ({ word, expected }) => {
    if (!bfaAvailable) return;
    const audioPath = path.join(FIXTURES, `${word}.m4a`);
    if (!fs.existsSync(audioPath)) return;

    const result = await alignWord(word, audioPath, expected);

    console.log(
      `  ${word} (explicit): score=${result.score} ` +
      `correct=${result.feedback.filter((f) => f.status === 'correct').length}/${expected.length}`,
    );

    expect(result.success).toBe(true);
    expect(result.score).toBeGreaterThanOrEqual(PASS_THRESHOLD);
  }, 60_000);
});

export function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  );
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]);
  return dp[m][n];
}

function tokenize(text: string): string[] {
  return text.toLowerCase().trim()
    .replace(/[^\p{L}\s]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

export function calcSpeakingScore(
  transcribed: string,
  expected: string,
): { score: number; matchedWords: number; totalWords: number } {
  const expectedWords = tokenize(expected);
  const remaining = tokenize(transcribed);

  if (expectedWords.length === 0) return { score: 0, matchedWords: 0, totalWords: 0 };
  if (remaining.length === 0) return { score: 0, matchedWords: 0, totalWords: expectedWords.length };

  let matched = 0;
  for (const exp of expectedWords) {
    let bestIdx = -1;
    let bestSim = 0;
    for (let i = 0; i < remaining.length; i++) {
      const sim = 1 - levenshtein(remaining[i], exp) / Math.max(remaining[i].length, exp.length);
      if (sim > bestSim) { bestSim = sim; bestIdx = i; }
    }
    if (bestSim >= 0.7) {
      matched++;
      remaining.splice(bestIdx, 1);
    }
  }

  return {
    score: Math.round((matched / expectedWords.length) * 100),
    matchedWords: matched,
    totalWords: expectedWords.length,
  };
}

function matchesKeyword(transcript: string, kw: string): boolean {
  const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (new RegExp(`\\b${escaped}\\b`, 'i').test(transcript)) return true;
  const kwWords = kw.toLowerCase().split(/\s+/).filter(Boolean);
  const txWords = transcript.toLowerCase().split(/\s+/).filter(Boolean);
  if (kwWords.length > 1) {
    return kwWords.every((kwPart) =>
      txWords.some((w) => {
        const maxLen = Math.max(w.length, kwPart.length);
        return maxLen > 0 && 1 - levenshtein(w, kwPart) / maxLen >= 0.75;
      }),
    );
  }
  for (const w of txWords) {
    const maxLen = Math.max(w.length, kw.length);
    if (maxLen === 0) return false;
    if (1 - levenshtein(w, kw) / maxLen >= 0.75) return true;
  }
  return false;
}

export function calcFreeSpeak(
  transcript: string,
  keywords: string,
): { score: number; matchedWords: number; totalWords: number } {
  const kws = keywords
    .split(',')
    .map((k) => k.toLowerCase().trim())
    .filter(Boolean);
  if (kws.length === 0) return { score: 0, matchedWords: 0, totalWords: 0 };
  const text = transcript.toLowerCase();
  const matched = kws.filter((kw) => matchesKeyword(text, kw)).length;
  return {
    score: Math.round((matched / kws.length) * 100),
    matchedWords: matched,
    totalWords: kws.length,
  };
}

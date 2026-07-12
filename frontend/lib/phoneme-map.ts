export interface PhonemeInfo {
  label: string;   // friendly name, e.g. "sh", "th (think)", "a (cat)"
  example: string; // example English word
}

export const PHONEME_MAP: Record<string, PhonemeInfo> = {
  // Plosives
  'p':   { label: 'p',            example: 'pat' },
  'b':   { label: 'b',            example: 'bat' },
  't':   { label: 't',            example: 'top' },
  'd':   { label: 'd',            example: 'dog' },
  'k':   { label: 'k',            example: 'cat' },
  'g':   { label: 'g',            example: 'get' },
  // Fricatives
  'f':   { label: 'f',            example: 'fan' },
  'v':   { label: 'v',            example: 'van' },
  'θ':   { label: 'th (think)',   example: 'think' },
  'ð':   { label: 'th (the)',     example: 'the' },
  's':   { label: 's',            example: 'sun' },
  'z':   { label: 'z',            example: 'zoo' },
  'ʃ':   { label: 'sh',           example: 'ship' },
  'ʒ':   { label: 'zh',           example: 'measure' },
  'h':   { label: 'h',            example: 'hat' },
  // Affricates
  'tʃ':  { label: 'ch',           example: 'chip' },
  'dʒ':  { label: 'j',            example: 'jet' },
  // Nasals
  'm':   { label: 'm',            example: 'man' },
  'n':   { label: 'n',            example: 'net' },
  'ŋ':   { label: 'ng',           example: 'sing' },
  // Approximants — both ASCII 'r' and true IPA 'ɹ' (used by Azure PA / espeak)
  'l':   { label: 'l',            example: 'let' },
  'r':   { label: 'r',            example: 'red' },
  'ɹ':   { label: 'r',            example: 'red' },
  'j':   { label: 'y',            example: 'yes' },
  'w':   { label: 'w',            example: 'wet' },
  // Short vowels
  'ɪ':   { label: 'i (sit)',       example: 'sit' },
  'e':   { label: 'e (bed)',       example: 'bed' },
  'ɛ':   { label: 'e (bed)',       example: 'bed' },
  'æ':   { label: 'a (cat)',       example: 'cat' },
  'ɒ':   { label: 'o (hot)',       example: 'hot' },
  'ɔ':   { label: 'aw (saw)',      example: 'saw' },
  'ʊ':   { label: 'oo (book)',     example: 'book' },
  'ʌ':   { label: 'u (cup)',       example: 'cup' },
  'ə':   { label: 'uh (about)',    example: 'about' },
  // Long vowels
  'iː':  { label: 'ee',           example: 'see' },
  'ɑː':  { label: 'ah (car)',      example: 'car' },
  'ɑ':   { label: 'ah (car)',      example: 'car' },
  'ɔː':  { label: 'aw (saw)',      example: 'saw' },
  'uː':  { label: 'oo (moon)',     example: 'moon' },
  'u':   { label: 'oo (moon)',     example: 'moon' },
  'ɜː':  { label: 'er (bird)',     example: 'bird' },
  'ɜ':   { label: 'er (bird)',     example: 'bird' },
  // R-colored vowels — common in American English / Azure PA output
  'ɝ':   { label: 'er (bird)',     example: 'bird' },
  'ɚ':   { label: 'er (her)',      example: 'her' },
  // Diphthongs
  'eɪ':  { label: 'ay (say)',      example: 'say' },
  'aɪ':  { label: 'i (like)',      example: 'like' },
  'ɔɪ':  { label: 'oy (boy)',      example: 'boy' },
  'aʊ':  { label: 'ow (now)',      example: 'now' },
  'oʊ':  { label: 'oh (go)',       example: 'go' },
  'əʊ':  { label: 'oh (go)',       example: 'go' },
  'ɪə':  { label: 'ear (here)',    example: 'here' },
  'eə':  { label: 'air (care)',    example: 'care' },
  'ʊə':  { label: 'ure (pure)',    example: 'pure' },
};

// Maps phonics cluster spellings (word.highlight / part.name) → IPA keys in PHONEME_MAP.
// Keep all keys lowercase — isHighlightPhoneme lowercases before lookup.
export const HIGHLIGHT_TO_IPA: Record<string, string[]> = {
  // Consonant digraphs
  'sh':  ['ʃ'],
  'th':  ['θ', 'ð'],
  'ch':  ['tʃ'],
  'tch': ['tʃ'],
  'ph':  ['f'],
  'wh':  ['w', 'h'],
  'ck':  ['k'],
  'ng':  ['ŋ'],
  'nk':  ['ŋ', 'k'],
  'dge': ['dʒ'],
  // Vowel digraphs / long-vowel spellings
  'ee':  ['iː'],
  'ea':  ['iː', 'ɛ'],
  'ie':  ['aɪ', 'iː'],
  'igh': ['aɪ'],
  'oo':  ['uː', 'ʊ'],
  'ue':  ['uː'],
  'ew':  ['uː'],
  'ay':  ['eɪ'],
  'ai':  ['eɪ'],
  'oa':  ['oʊ', 'əʊ'],
  'ow':  ['aʊ', 'oʊ', 'əʊ'],
  'oi':  ['ɔɪ'],
  'oy':  ['ɔɪ'],
  'ou':  ['aʊ'],
  'au':  ['ɔː'],
  'aw':  ['ɔː'],
  // Magic-e patterns (split word form)
  'a_e': ['eɪ'],
  'i_e': ['aɪ'],
  'o_e': ['oʊ', 'əʊ'],
  'u_e': ['uː'],
  'e_e': ['iː'],
  // R-controlled vowels
  'ar':  ['ɑː', 'ɑ'],
  'or':  ['ɔː', 'ɔ'],
  'er':  ['ɜː', 'ɜ', 'ɝ', 'ɚ'],
  'ir':  ['ɜː', 'ɜ', 'ɝ'],
  'ur':  ['ɜː', 'ɜ', 'ɝ'],
  'air': ['eə'],
  'ear': ['ɪə'],
  'ure': ['ʊə'],
  // Short vowel singles (phonics "short a", "short e", etc.)
  'a':   ['æ'],
  'e':   ['ɛ', 'e'],
  'i':   ['ɪ'],
  'o':   ['ɒ'],
  'u':   ['ʌ'],
};

function strip(ipa: string): string {
  return ipa.replace(/^\/|\/$/g, '');
}

export function phoneLabel(ipa: string | null): string {
  if (!ipa) return '?';
  const clean = strip(ipa);
  return PHONEME_MAP[clean]?.label ?? clean;
}

export function phoneExample(ipa: string | null): string | null {
  if (!ipa) return null;
  const clean = strip(ipa);
  return PHONEME_MAP[clean]?.example ?? null;
}

export function isHighlightPhoneme(ipa: string | null, highlight: string | undefined): boolean {
  if (!ipa || !highlight) return false;
  const clean = strip(ipa);
  const h = highlight.toLowerCase();

  const targets = HIGHLIGHT_TO_IPA[h];
  if (targets) return targets.includes(clean);

  // Fallback: exact match against phoneme label (single-char highlights like "p", "m", "n")
  const info = PHONEME_MAP[clean];
  if (info) return info.label.toLowerCase() === h;
  return false;
}

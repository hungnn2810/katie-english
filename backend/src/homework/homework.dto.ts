export type HomeworkType = 'PHONICS' | 'SPEAKING' | 'READING' | 'VOCABULARY' | 'LISTEN';
export type SpeakingMode = 'FREE_SPEAK' | 'SCRIPT_MATCH';
export type ReadingActivityType = 'MATCH' | 'FILL_BLANK';

export class CreateWordDto {
  text: string;
  highlight?: string;
  imageUrl?: string;
}

export class CreatePartDto {
  name: string;
  words: CreateWordDto[];
}

export class CreateMatchPairDto {
  imageUrl: string;
  word: string;
}

export class CreateFillBlankChoiceDto {
  word: string;
  isCorrect: boolean;
}

export class CreateFillBlankItemDto {
  sentence: string;
  choices: CreateFillBlankChoiceDto[];
}

export class CreateLegacyReadingActivityDto {
  type: ReadingActivityType;
  pairs?: CreateMatchPairDto[];
  items?: CreateFillBlankItemDto[];
}

export class CreateHomeworkDto {
  type: HomeworkType;
  speakingMode?: SpeakingMode;
  name?: string;
  parts?: CreatePartDto[];
  speakingPictureUrl?: string;
  speakingText?: string;
  readingActivities?: CreateLegacyReadingActivityDto[];
}

export class UpdateHomeworkDto {
  speakingMode?: SpeakingMode;
  name?: string;
  parts?: CreatePartDto[];
  speakingPictureUrl?: string;
  speakingText?: string;
}

export class CreateAssignmentDto {
  homeworkId: number;
  classIds: number[];
  endDate: string;
}

export class UpdateAssignmentDto {
  classIds?: number[];
  endDate?: string;
}

// ── Plan 03-01 reading-specific DTOs ─────────────────────────────────────────

export class SentenceSegmentDto {
  text: string;
  blank: boolean;
  blankIndex?: number;
  correctWord?: string;
  distractors?: string[];
}

export class CreateReadingPairDto {
  imageUrl: string;
  word: string;
}

export class CreateReadingActivityDto {
  type: ReadingActivityType;
  pairs?: CreateReadingPairDto[];
  segments?: SentenceSegmentDto[];
}

export class CreateReadingHomeworkDto {
  name: string;
  activities: CreateReadingActivityDto[];
}

export class UpdateReadingHomeworkDto {
  name?: string;
  activities?: CreateReadingActivityDto[];
}

// ── Plan 08-02 vocab-specific DTOs ───────────────────────────────────────────

export class CreateVocabItemDto {
  imageUrl: string;
  word: string;
  phonemes?: string[];
}

export class CreateVocabHomeworkDto {
  name: string;
  items: CreateVocabItemDto[];
}

export class UpdateVocabHomeworkDto {
  name?: string;
  items?: CreateVocabItemDto[];
}

// ── Plan 09-03 listen-specific DTOs ──────────────────────────────────────────

export class CreateListenItemDto {
  audioUrl: string;
  keywords: string;       // JSON array string e.g. '["red","cat"]'
  expectedText: string;   // full expected answer for semantic scoring (D-02)
}

export class CreateListenHomeworkDto {
  name: string;
  items: CreateListenItemDto[];
}

export class UpdateListenHomeworkDto {
  name?: string;
  items?: CreateListenItemDto[];
}

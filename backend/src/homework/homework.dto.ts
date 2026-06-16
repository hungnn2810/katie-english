import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsInt,
  IsArray,
  IsBoolean,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export type HomeworkType = 'PHONICS' | 'SPEAKING' | 'READING' | 'VOCABULARY' | 'LISTEN';
export type SpeakingMode = 'FREE_SPEAK' | 'SCRIPT_MATCH';
export type ReadingActivityType = 'MATCH' | 'FILL_BLANK';

export class CreateWordDto {
  @IsString()
  @IsNotEmpty()
  text: string;

  @IsOptional()
  @IsString()
  highlight?: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;
}

export class CreatePartDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateWordDto)
  words: CreateWordDto[];
}

export class CreateMatchPairDto {
  @IsString()
  imageUrl: string;

  @IsString()
  word: string;
}

export class CreateFillBlankChoiceDto {
  @IsString()
  word: string;

  @IsBoolean()
  isCorrect: boolean;
}

export class CreateFillBlankItemDto {
  @IsString()
  sentence: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateFillBlankChoiceDto)
  choices: CreateFillBlankChoiceDto[];
}

export class CreateLegacyReadingActivityDto {
  @IsEnum(['MATCH', 'FILL_BLANK'])
  type: ReadingActivityType;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateMatchPairDto)
  pairs?: CreateMatchPairDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateFillBlankItemDto)
  items?: CreateFillBlankItemDto[];
}

export class CreateHomeworkDto {
  @IsEnum(['PHONICS', 'SPEAKING', 'READING', 'VOCABULARY', 'LISTEN'])
  type: HomeworkType;

  @IsOptional()
  @IsEnum(['FREE_SPEAK', 'SCRIPT_MATCH'])
  speakingMode?: SpeakingMode;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePartDto)
  parts?: CreatePartDto[];

  @IsOptional()
  @IsString()
  speakingPictureUrl?: string;

  @IsOptional()
  @IsString()
  speakingText?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateLegacyReadingActivityDto)
  readingActivities?: CreateLegacyReadingActivityDto[];
}

export class UpdateHomeworkDto {
  @IsOptional()
  @IsEnum(['FREE_SPEAK', 'SCRIPT_MATCH'])
  speakingMode?: SpeakingMode;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePartDto)
  parts?: CreatePartDto[];

  @IsOptional()
  @IsString()
  speakingPictureUrl?: string;

  @IsOptional()
  @IsString()
  speakingText?: string;
}

export class CreateAssignmentDto {
  @IsInt()
  homeworkId: number;

  @IsArray()
  @IsInt({ each: true })
  classIds: number[];

  @IsString()
  endDate: string;
}

export class UpdateAssignmentDto {
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  classIds?: number[];

  @IsOptional()
  @IsString()
  endDate?: string;
}

// ── Plan 03-01 reading-specific DTOs ─────────────────────────────────────────

export class SentenceSegmentDto {
  @IsString()
  text: string;

  @IsBoolean()
  blank: boolean;

  @IsOptional()
  @IsInt()
  blankIndex?: number;

  @IsOptional()
  @IsString()
  correctWord?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  distractors?: string[];
}

export class CreateReadingPairDto {
  @IsString()
  imageUrl: string;

  @IsString()
  word: string;
}

export class CreateReadingActivityDto {
  @IsEnum(['MATCH', 'FILL_BLANK'])
  type: ReadingActivityType;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateReadingPairDto)
  pairs?: CreateReadingPairDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SentenceSegmentDto)
  segments?: SentenceSegmentDto[];
}

export class CreateReadingHomeworkDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateReadingActivityDto)
  activities: CreateReadingActivityDto[];
}

export class UpdateReadingHomeworkDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateReadingActivityDto)
  activities?: CreateReadingActivityDto[];
}

// ── Plan 08-02 vocab-specific DTOs ───────────────────────────────────────────

export class CreateVocabItemDto {
  @IsString()
  imageUrl: string;

  @IsString()
  word: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  phonemes?: string[];
}

export class CreateVocabHomeworkDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateVocabItemDto)
  items: CreateVocabItemDto[];
}

export class UpdateVocabHomeworkDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateVocabItemDto)
  items?: CreateVocabItemDto[];
}

// ── Plan 09-03 listen-specific DTOs ──────────────────────────────────────────

export class CreateListenItemDto {
  @IsString()
  audioUrl: string;

  @IsString()
  keywords: string;

  @IsString()
  expectedText: string;
}

export class CreateListenHomeworkDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateListenItemDto)
  items: CreateListenItemDto[];
}

export class UpdateListenHomeworkDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateListenItemDto)
  items?: CreateListenItemDto[];
}

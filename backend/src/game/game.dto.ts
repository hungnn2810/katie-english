export class StartSessionDto {
  studentId: number;
  assignmentId: number;
}

export class SavePhonicsResultDto {
  wordId: number;
  transcribedText?: string;
}

export class CompleteSessionDto {
  // score calculated from results
}

export class SaveReadingResultDto {
  correctItems: number;
  totalItems: number;
}

export class SaveVocabResultDto {
  vocabItemId: number;
  transcribedText?: string;
}

import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class GameLoginDto {
  @IsString() @IsNotEmpty() @MaxLength(20)
  classCode: string;

  @IsString() @IsNotEmpty() @MaxLength(100)
  name: string;
}

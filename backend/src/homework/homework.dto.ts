export type HomeworkType = 'PHONICS' | 'SPEAKING' | 'READING';
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

export class CreateReadingActivityDto {
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
  readingActivities?: CreateReadingActivityDto[];
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

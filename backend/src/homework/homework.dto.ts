export type HomeworkType = 'PHONICS' | 'SPEAKING';
export type SpeakingMode = 'FREE_SPEAK' | 'SCRIPT_MATCH';

export class CreateWordDto {
  text: string;
  highlight?: string;
  imageUrl?: string;
}

export class CreatePartDto {
  name: string;
  words: CreateWordDto[];
}

export class CreateHomeworkDto {
  type: HomeworkType;
  speakingMode?: SpeakingMode;
  name?: string;
  parts?: CreatePartDto[];
  speakingPictureUrl?: string;
  speakingText?: string;
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

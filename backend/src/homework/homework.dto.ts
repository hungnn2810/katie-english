export type HomeworkType = 'PHONICS' | 'READING' | 'SPELLING' | 'VOCABULARY' | 'SPEAKING';

export class CreateHomeworkPartDto {
  type: HomeworkType;
  wordIds?: number[];
  phonicsItems?: string[];
}

export class CreateHomeworkDto {
  dayAssigned: string;
  closedDatetime: string;
  classId: number;
  parts: CreateHomeworkPartDto[];
}

export class UpdateHomeworkDto {
  dayAssigned?: string;
  closedDatetime?: string;
  classId?: number;
  parts?: CreateHomeworkPartDto[];
}

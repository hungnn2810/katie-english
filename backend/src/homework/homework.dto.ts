export type HomeworkType = 'PHONICS' | 'READING' | 'SPELLING' | 'VOCABULARY';

export class CreateHomeworkDto {
  type: HomeworkType;
  dayAssigned: string;
  closedDatetime: string;
  timeInSeconds: number;
  classId: number;
  wordIds: number[];
}

export class UpdateHomeworkDto {
  type?: HomeworkType;
  dayAssigned?: string;
  closedDatetime?: string;
  timeInSeconds?: number;
  classId?: number;
  wordIds?: number[];
}

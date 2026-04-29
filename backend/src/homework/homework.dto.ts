export class CreateHomeworkDto {
  dayAssigned: string;
  closedDatetime: string;
  timeInSeconds: number;
  classId: number;
  wordIds: number[];
}

export class UpdateHomeworkDto {
  dayAssigned?: string;
  closedDatetime?: string;
  timeInSeconds?: number;
  classId?: number;
  wordIds?: number[];
}

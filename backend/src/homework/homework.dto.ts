export class CreateHomeworkDto {
  title: string;
  description?: string;
  phonemeIds: number[];
}

export class UpdateHomeworkDto {
  title?: string;
  description?: string;
  phonemeIds?: number[];
}

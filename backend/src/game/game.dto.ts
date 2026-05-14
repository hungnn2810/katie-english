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

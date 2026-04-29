export class StartSessionDto {
  studentId: number;
  homeworkId: number;
}

export class SaveWordResultDto {
  wordId: number;
  transcribedText: string;
}

export class CompleteSessionDto {
  // no body needed — score calculated from word results
}

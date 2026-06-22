export interface ImportError {
  sheet: 'Classes' | 'Students' | 'Homework';
  row: number;
  column: string;
  message: string;
}

export interface ImportResult {
  imported: {
    classes: number;
    students: number;
    homework: number;
  };
}

export interface ImportErrorResult {
  errors: ImportError[];
}

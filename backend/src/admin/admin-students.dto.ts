export interface AdminStudentListItem {
  id: number;
  fullname: string;
  sex: 'MALE' | 'FEMALE';
  classId: number | null;
  class: {
    id: number;
    name: string;
    code: string;
    teacher: { id: number; name: string | null; upn: string } | null;
  } | null;
  _count: { sessions: number };
  createdAt: string;
}

export interface AdminStudentResultItem {
  id: number;              // HomeworkSession.id
  startedAt: string;
  completedAt: string | null;
  score: number | null;
  assignment: {
    id: number;
    endDate: string;
    homework: { id: number; name: string | null; type: 'PHONICS' | 'SPEAKING' | 'READING' };
  };
}

export class LoginDto {
  upn: string;
  password: string;
}

export class RegisterDto {
  upn: string;
  password: string;
  fullname: string;
  sex: 'MALE' | 'FEMALE';
  dateOfBirth: string;
  classId?: number;
  parents: { name: string; phoneNumber: string; type: 'FATHER' | 'MOTHER' }[];
}

export class ApproveStudentDto {
  userId: number;
  studentId?: number;
  fullname?: string;
  sex?: 'MALE' | 'FEMALE';
  dateOfBirth?: string;
  classId?: number;
  parents?: { name: string; phoneNumber: string; type: 'FATHER' | 'MOTHER' }[];
}

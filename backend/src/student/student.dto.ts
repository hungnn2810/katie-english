export class CreateParentDto {
  name: string;
  phoneNumber: string;
  type: 'FATHER' | 'MOTHER';
}

export class CreateStudentDto {
  fullname: string;
  sex: 'MALE' | 'FEMALE';
  dateOfBirth: string;
  classId?: number;
  parents: CreateParentDto[];
  upn: string;
  password: string;
}

export class UpdateStudentDto {
  fullname?: string;
  sex?: 'MALE' | 'FEMALE';
  dateOfBirth?: string;
  classId?: number | null;
  parents?: CreateParentDto[];
}

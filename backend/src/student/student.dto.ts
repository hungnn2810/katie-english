export class CreateStudentDto {
  name: string;
  email: string;
}

export class UpdateStudentDto {
  name?: string;
  email?: string;
}

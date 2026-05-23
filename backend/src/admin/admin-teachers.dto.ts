export class CreateTeacherDto {
  email: string;
  password: string;
  name: string;
  phone: string;
}

export class UpdateTeacherDto {
  name?: string;
  phone?: string;
  password?: string;
}

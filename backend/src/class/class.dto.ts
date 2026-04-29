export class CreateClassDto {
  name: string;
  description?: string;
}

export class UpdateClassDto {
  name?: string;
  description?: string;
}

export class AssignHomeworkDto {
  dueDate?: string;
}

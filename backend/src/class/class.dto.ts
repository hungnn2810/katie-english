export class CreateClassDto {
  name: string;
  code: string;
  startDate: string;
  endDate: string;
  status?: 'PENDING' | 'INPROGRESS' | 'ENDED';
}

export class UpdateClassDto {
  name?: string;
  code?: string;
  startDate?: string;
  endDate?: string;
  status?: 'PENDING' | 'INPROGRESS' | 'ENDED';
}

import { ScheduleSlot } from '../class/class.dto';

export class AdminUpdateClassDto {
  name?: string;
  code?: string;
  startDate?: string;
  endDate?: string;
  status?: 'PENDING' | 'INPROGRESS' | 'ENDED';
  scheduleSlots?: ScheduleSlot[];
}

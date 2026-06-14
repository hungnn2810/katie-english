import {
  IsString,
  IsOptional,
  IsIn,
  IsNumber,
  ValidateNested,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ScheduleSlot {
  @IsString()
  day: string;

  @IsString()
  time: string;

  @IsOptional()
  @IsNumber()
  duration?: number;
}

export class CreateClassDto {
  @IsString()
  name: string;

  @IsString()
  code: string;

  @IsString()
  startDate: string;

  @IsString()
  endDate: string;

  @IsOptional()
  @IsIn(['PENDING', 'INPROGRESS', 'ENDED'])
  status?: 'PENDING' | 'INPROGRESS' | 'ENDED';

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ScheduleSlot)
  scheduleSlots?: ScheduleSlot[];
}

export class UpdateClassDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  @IsIn(['PENDING', 'INPROGRESS', 'ENDED'])
  status?: 'PENDING' | 'INPROGRESS' | 'ENDED';

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ScheduleSlot)
  scheduleSlots?: ScheduleSlot[];
}

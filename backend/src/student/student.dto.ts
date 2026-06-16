import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsInt,
  IsArray,
  ValidateNested,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateParentDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  phoneNumber: string;

  @IsEnum(['FATHER', 'MOTHER'])
  type: 'FATHER' | 'MOTHER';
}

export class CreateStudentDto {
  @IsString()
  @IsNotEmpty()
  fullname: string;

  @IsEnum(['MALE', 'FEMALE'])
  sex: 'MALE' | 'FEMALE';

  @IsDateString()
  dateOfBirth: string;

  @IsOptional()
  @IsInt()
  classId?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateParentDto)
  parents: CreateParentDto[];

  @IsString()
  @IsNotEmpty()
  upn: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}

export class UpdateStudentDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  fullname?: string;

  @IsOptional()
  @IsEnum(['MALE', 'FEMALE'])
  sex?: 'MALE' | 'FEMALE';

  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @IsOptional()
  @IsInt()
  classId?: number | null;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateParentDto)
  parents?: CreateParentDto[];
}

import { IsString, IsEmail, IsNotEmpty, IsOptional, IsInt, IsArray, ValidateNested, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export class LoginDto {
  @IsEmail()
  upn: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}

class ParentDto {
  @IsString() @IsNotEmpty() name: string;
  @IsString() @IsNotEmpty() phoneNumber: string;
  @IsIn(['FATHER', 'MOTHER']) type: 'FATHER' | 'MOTHER';
}

export class RegisterDto {
  @IsEmail()
  upn: string;

  @IsString() @IsNotEmpty()
  password: string;

  @IsString() @IsNotEmpty()
  fullname: string;

  @IsIn(['MALE', 'FEMALE'])
  sex: 'MALE' | 'FEMALE';

  @IsString() @IsNotEmpty()
  dateOfBirth: string;

  @IsOptional() @IsInt()
  classId?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ParentDto)
  parents: ParentDto[];
}

export class ApproveStudentDto {
  @IsInt()
  userId: number;

  @IsOptional() @IsInt()
  studentId?: number;

  @IsOptional() @IsString()
  fullname?: string;

  @IsOptional() @IsIn(['MALE', 'FEMALE'])
  sex?: 'MALE' | 'FEMALE';

  @IsOptional() @IsString()
  dateOfBirth?: string;

  @IsOptional() @IsInt()
  classId?: number;

  @IsOptional() @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ParentDto)
  parents?: ParentDto[];
}

export class ChangePasswordDto {
  @IsString() @IsNotEmpty()
  currentPassword: string;

  @IsString() @IsNotEmpty()
  newPassword: string;
}

export class ForgotPasswordDto {
  @IsEmail()
  upn: string;
}

export class ResetStudentPasswordDto {
  @IsInt()
  userId: number;

  @IsString() @IsNotEmpty()
  newPassword: string;
}

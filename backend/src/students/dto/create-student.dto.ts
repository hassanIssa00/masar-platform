import { IsString, IsNotEmpty, IsDateString, IsNumber, IsOptional, IsEnum } from 'class-validator';
import { StudentStatus } from '@prisma/client';

export class CreateStudentDto {
  @IsString()
  @IsNotEmpty()
  tenantId: string;

  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsDateString()
  dateOfBirth: string;

  @IsString()
  @IsNotEmpty()
  gender: string;

  @IsNumber()
  grade: number;

  @IsString()
  @IsOptional()
  photoUrl?: string;

  @IsString()
  @IsOptional()
  nationalId?: string;

  @IsString()
  @IsOptional()
  parentId?: string;

  @IsString()
  @IsOptional()
  specialistId?: string;

  @IsEnum(StudentStatus)
  status: StudentStatus;
}

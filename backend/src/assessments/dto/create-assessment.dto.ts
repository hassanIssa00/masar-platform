import { IsString, IsNotEmpty, IsEnum, IsObject, IsOptional, IsNumber } from 'class-validator';
import { AssessmentType } from '@prisma/client';

export class CreateAssessmentDto {
  @IsString()
  @IsNotEmpty()
  studentId: string;

  @IsEnum(AssessmentType)
  type: AssessmentType;

  @IsObject()
  results: any;

  @IsNumber()
  @IsOptional()
  score?: number;

  @IsString()
  @IsOptional()
  notes?: string;
}

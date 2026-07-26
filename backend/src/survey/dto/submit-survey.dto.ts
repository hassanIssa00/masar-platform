import { IsString, IsArray, IsNotEmpty } from 'class-validator';

export class SubmitSurveyDto {
  @IsString()
  @IsNotEmpty()
  studentId: string;

  @IsArray()
  answers: any[];
}

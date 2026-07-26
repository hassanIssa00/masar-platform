import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SubmitSurveyDto } from './dto/submit-survey.dto';

@Injectable()
export class SurveyService {
  constructor(private prisma: PrismaService) {}

  submit(submitSurveyDto: SubmitSurveyDto, respondentId: string) {
    return this.prisma.survey.create({
      data: {
        studentId: submitSurveyDto.studentId,
        respondentId,
        answers: submitSurveyDto.answers,
      },
    });
  }

  findByStudent(studentId: string) {
    return this.prisma.survey.findMany({
      where: { studentId },
    });
  }
}

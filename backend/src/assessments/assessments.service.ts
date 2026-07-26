import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAssessmentDto } from './dto/create-assessment.dto';

@Injectable()
export class AssessmentsService {
  constructor(private prisma: PrismaService) {}

  create(createAssessmentDto: CreateAssessmentDto, conductedById: string) {
    return this.prisma.assessment.create({
      data: {
        ...createAssessmentDto,
        conductedById,
      },
    });
  }

  findByStudent(studentId: string) {
    return this.prisma.assessment.findMany({
      where: { studentId },
    });
  }

  async findOne(id: string) {
    const assessment = await this.prisma.assessment.findUnique({
      where: { id },
    });
    if (!assessment) throw new NotFoundException('Assessment not found');
    return assessment;
  }
}

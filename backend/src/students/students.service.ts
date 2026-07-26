import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';

@Injectable()
export class StudentsService {
  constructor(private prisma: PrismaService) {}

  create(createStudentDto: CreateStudentDto) {
    return this.prisma.student.create({
      data: {
        ...createStudentDto,
        dateOfBirth: new Date(createStudentDto.dateOfBirth),
      },
    });
  }

  findAll(tenantId: string) {
    return this.prisma.student.findMany({
      where: { tenantId },
    });
  }

  async findOne(id: string) {
    const student = await this.prisma.student.findUnique({
      where: { id },
    });
    if (!student) throw new NotFoundException('Student not found');
    return student;
  }

  update(id: string, updateStudentDto: UpdateStudentDto) {
    return this.prisma.student.update({
      where: { id },
      data: {
        ...updateStudentDto,
        ...(updateStudentDto.dateOfBirth && { dateOfBirth: new Date(updateStudentDto.dateOfBirth) }),
      },
    });
  }

  remove(id: string) {
    return this.prisma.student.delete({
      where: { id },
    });
  }

  getProfile(studentId: string) {
    return this.prisma.studentProfile.findUnique({
      where: { studentId },
    });
  }

  getPrograms(studentId: string) {
    return this.prisma.studentProgram.findMany({
      where: { studentId },
      include: { program: true },
    });
  }

  getReports(studentId: string) {
    return this.prisma.report.findMany({
      where: { studentId },
    });
  }
}

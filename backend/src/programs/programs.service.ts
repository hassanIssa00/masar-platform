import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MasteryStatus, ProgramType } from '@prisma/client';

@Injectable()
export class ProgramsService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.program.findMany({
      orderBy: [{ type: 'asc' }, { level: 'asc' }],
      include: {
        skills: {
          orderBy: { sequence: 'asc' },
          include: {
            activities: { orderBy: { order: 'asc' } },
          },
        },
      },
    });
  }

  async findOne(id: string) {
    const program = await this.prisma.program.findUnique({
      where: { id },
      include: {
        lessons: true,
        skills: {
          orderBy: { sequence: 'asc' },
          include: {
            activities: { orderBy: { order: 'asc' } },
          },
        },
      },
    });
    if (!program) throw new NotFoundException('Program not found');
    return program;
  }

  findByType(type: ProgramType) {
    return this.prisma.program.findMany({
      where: { type },
      include: {
        skills: {
          orderBy: { sequence: 'asc' },
          include: { activities: { orderBy: { order: 'asc' } } },
        },
      },
    });
  }

  async enrollStudent(studentId: string, programId: string) {
    const firstSkill = await this.prisma.curriculumSkill.findFirst({
      where: { programId },
      orderBy: { sequence: 'asc' },
    });

    return this.prisma.studentProgram.create({
      data: {
        studentId,
        programId,
        currentSkillId: firstSkill?.id,
        status: 'ACTIVE',
        masteryProfile: {
          rule: 'advance_on_mastery',
          minimumAccuracy: 0.8,
          minimumAttempts: 5,
        },
      },
    });
  }

  updateProgress(id: string, progress: number) {
    return this.prisma.studentProgram.update({
      where: { id },
      data: { progress },
    });
  }

  async getStudentRoadmap(enrollmentId: string) {
    const enrollment = await this.prisma.studentProgram.findUnique({
      where: { id: enrollmentId },
      include: {
        program: {
          include: {
            skills: {
              orderBy: { sequence: 'asc' },
              include: {
                activities: { orderBy: { order: 'asc' } },
                progress: { where: { enrollmentId } },
              },
            },
          },
        },
      },
    });

    if (!enrollment) throw new NotFoundException('Enrollment not found');
    return enrollment;
  }

  async recordAttempt(
    enrollmentId: string,
    activityId: string,
    data: { answer?: string; correct: boolean; responseTimeMs?: number; supportLevel?: string },
  ) {
    const activity = await this.prisma.learningActivity.findUnique({
      where: { id: activityId },
      include: { skill: true },
    });

    if (!activity) throw new NotFoundException('Activity not found');

    const attempt = await this.prisma.activityAttempt.create({
      data: {
        enrollmentId,
        activityId,
        answer: data.answer,
        correct: data.correct,
        responseTimeMs: data.responseTimeMs,
        supportLevel: data.supportLevel,
      },
    });

    const existing = await this.prisma.skillProgress.findUnique({
      where: {
        enrollmentId_skillId: {
          enrollmentId,
          skillId: activity.skillId,
        },
      },
    });

    const attemptsCount = (existing?.attemptsCount ?? 0) + 1;
    const correctCount = (existing?.correctCount ?? 0) + (data.correct ? 1 : 0);
    const accuracy = correctCount / attemptsCount;
    const status =
      attemptsCount >= 5 && accuracy >= 0.8
        ? MasteryStatus.MASTERED
        : attemptsCount >= 5 && accuracy < 0.5
          ? MasteryStatus.NEEDS_RETEACH
          : MasteryStatus.PRACTICING;

    await this.prisma.skillProgress.upsert({
      where: {
        enrollmentId_skillId: {
          enrollmentId,
          skillId: activity.skillId,
        },
      },
      create: {
        enrollmentId,
        skillId: activity.skillId,
        attemptsCount,
        correctCount,
        accuracy,
        status,
        lastPracticedAt: new Date(),
      },
      update: {
        attemptsCount,
        correctCount,
        accuracy,
        status,
        lastPracticedAt: new Date(),
      },
    });

    return attempt;
  }
}

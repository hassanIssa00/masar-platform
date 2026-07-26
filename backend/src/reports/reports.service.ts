import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async generateReport(studentId: string, generatedById: string, type: string) {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      include: {
        programs: {
          include: {
            program: true,
            skillProgress: {
              include: { skill: true },
            },
            attempts: true,
          },
        },
      },
    });
    if (!student) throw new NotFoundException('Student not found');

    const surveys = await this.prisma.survey.findMany({ where: { studentId } });
    const assessments = await this.prisma.assessment.findMany({ where: { studentId } });

    const latestAssessment = assessments[0];
    const activeProgram = student.programs[0];
    const progress = activeProgram?.skillProgress ?? [];
    const mastered = progress.filter((item) => item.status === 'MASTERED');
    const reteach = progress.filter((item) => item.status === 'NEEDS_RETEACH');
    const practicing = progress.filter((item) => item.status === 'PRACTICING');

    const summary = [
      `تقرير ${student.firstName} ${student.lastName}`,
      activeProgram ? `المسار الحالي: ${activeProgram.program.name}` : 'لم يتم ربط الطالب بمسار علاجي بعد',
      `عدد التقييمات المسجلة: ${assessments.length}`,
      `مهارات متقنة: ${mastered.length}`,
      `مهارات تحتاج إعادة تدريس: ${reteach.length}`,
    ].join(' | ');

    const details = {
      student: {
        id: student.id,
        grade: student.grade,
        status: student.status,
      },
      surveys,
      assessments,
      latestAssessment,
      progress: {
        mastered: mastered.map((item) => item.skill.title),
        practicing: practicing.map((item) => ({
          skill: item.skill.title,
          accuracy: item.accuracy,
          attempts: item.attemptsCount,
        })),
        reteach: reteach.map((item) => ({
          skill: item.skill.title,
          accuracy: item.accuracy,
          attempts: item.attemptsCount,
        })),
      },
      decisionRules: {
        advance: 'ينتقل الطالب عند دقة 80% على الأقل مع 5 محاولات أو أكثر ومساعدة قليلة.',
        reteach: 'تعاد المهارة إذا انخفضت الدقة عن 50% بعد 5 محاولات.',
        reassessment: 'إعادة القياس بعد 6 جلسات أو بعد إتقان المهارة المستهدفة.',
      },
    };

    const recommendations = reteach.length
      ? `ابدأ بإعادة تدريس: ${reteach.map((item) => item.skill.title).join('، ')}. استخدم نمذجة صريحة، تدريب قصير، ثم قياس خروج.`
      : practicing.length
        ? `استمر في التدريب على: ${practicing.map((item) => item.skill.title).join('، ')} حتى الوصول إلى معيار الإتقان.`
        : 'ابدأ بتقييم تشخيصي تفاعلي ثم اربط الطالب بمسار علاجي مناسب.';

    return this.prisma.report.create({
      data: {
        studentId,
        generatedById,
        type,
        summary,
        details,
        recommendations,
      },
    });
  }

  findAll() {
    return this.prisma.report.findMany();
  }

  async findOne(id: string) {
    const report = await this.prisma.report.findUnique({
      where: { id },
    });
    if (!report) throw new NotFoundException('Report not found');
    return report;
  }
}

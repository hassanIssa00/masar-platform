import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { StudentsModule } from './students/students.module';
import { SurveyModule } from './survey/survey.module';
import { AssessmentsModule } from './assessments/assessments.module';
import { ProgramsModule } from './programs/programs.module';
import { ReportsModule } from './reports/reports.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    StudentsModule,
    SurveyModule,
    AssessmentsModule,
    ProgramsModule,
    ReportsModule,
  ],
})
export class AppModule {}

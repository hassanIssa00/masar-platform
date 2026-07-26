import { Controller, Get, Post, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { ProgramsService } from './programs.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('programs')
export class ProgramsController {
  constructor(private readonly programsService: ProgramsService) {}

  @Get()
  findAll() {
    return this.programsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.programsService.findOne(id);
  }

  @Post(':id/enroll')
  enrollStudent(@Param('id') id: string, @Body('studentId') studentId: string) {
    return this.programsService.enrollStudent(studentId, id);
  }

  @Get('enrollment/:id/roadmap')
  getStudentRoadmap(@Param('id') id: string) {
    return this.programsService.getStudentRoadmap(id);
  }

  @Post('enrollment/:id/attempts')
  recordAttempt(
    @Param('id') id: string,
    @Body('activityId') activityId: string,
    @Body() body: { answer?: string; correct: boolean; responseTimeMs?: number; supportLevel?: string },
  ) {
    return this.programsService.recordAttempt(id, activityId, body);
  }

  @Patch('enrollment/:id/progress')
  updateProgress(@Param('id') id: string, @Body('progress') progress: number) {
    return this.programsService.updateProgress(id, progress);
  }
}

import { Controller, Post, Get, Body, Param, UseGuards, Request } from '@nestjs/common';
import { SurveyService } from './survey.service';
import { SubmitSurveyDto } from './dto/submit-survey.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('survey')
export class SurveyController {
  constructor(private readonly surveyService: SurveyService) {}

  @Post()
  submit(@Body() submitSurveyDto: SubmitSurveyDto, @Request() req: any) {
    return this.surveyService.submit(submitSurveyDto, req.user.id);
  }

  @Get(':studentId')
  findByStudent(@Param('studentId') studentId: string) {
    return this.surveyService.findByStudent(studentId);
  }
}

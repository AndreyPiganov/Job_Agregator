import { Module } from '@nestjs/common';
import { ProfileModule } from '../profile/profile.module';
import { ResumeController } from './resume.controller';
import { ResumeMapper } from './resume.mapper';
import { ResumeRepository } from './resume.repository';
import { ResumeService } from './resume.service';

@Module({
  imports: [ProfileModule],
  controllers: [ResumeController],
  providers: [ResumeService, ResumeRepository, ResumeMapper],
})
export class ResumeModule {}

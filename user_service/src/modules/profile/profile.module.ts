import { Module } from '@nestjs/common';
import { UserEnumMapper } from '../../common/mappers/user-enum.mapper';
import { ProfileController } from './profile.controller';
import { ProfileMapper } from './profile.mapper';
import { ProfileRepository } from './profile.repository';
import { ProfileService } from './profile.service';

@Module({
  controllers: [ProfileController],
  providers: [ProfileService, ProfileRepository, ProfileMapper, UserEnumMapper],
  exports: [ProfileMapper, UserEnumMapper],
})
export class ProfileModule {}

import { Module } from '@nestjs/common';
import { AdminMarketingController } from './admin-marketing.controller';
import { AdminMarketingService } from './admin-marketing.service';

@Module({
  controllers: [AdminMarketingController],
  providers: [AdminMarketingService],
})
export class AdminMarketingModule {}

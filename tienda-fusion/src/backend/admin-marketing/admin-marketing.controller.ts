import { Controller, Get, Post, Body, UseGuards, Inject, Optional } from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { AdminMarketingService } from './admin-marketing.service';

@Controller('api/admin/marketing')
@UseGuards(AdminGuard)
export class AdminMarketingController {
  private marketingService: AdminMarketingService;

  constructor(@Optional() @Inject(AdminMarketingService) marketingService?: AdminMarketingService) {
    this.marketingService = marketingService || new AdminMarketingService();
  }

  @Get('campaigns')
  async getCampaigns() {
    return this.marketingService.getCampaigns();
  }


  @Get('channels')
  async getChannels() {
    return this.marketingService.getChannels();
  }

  @Get('automations')
  async getAutomations() {
    return this.marketingService.getAutomations();
  }

  @Get('audiences')
  async getAudiences() {
    return this.marketingService.getAudiences();
  }
}

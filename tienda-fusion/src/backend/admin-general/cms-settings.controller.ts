import { Controller, Get, Put, Body, Inject, Optional, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { CmsSettingsService } from './cms-settings.service';
import { CmsGlobalConfig } from '../../types/cms';

@Controller('api/cms')
export class CmsSettingsController {
  private service: CmsSettingsService;

  constructor(@Optional() @Inject(CmsSettingsService) private readonly cmsSettingsService?: CmsSettingsService) {
    this.service = cmsSettingsService || new CmsSettingsService();
  }

  @Get('settings')
  async getSettings() {
    return await this.service.getGlobalConfig();
  }

  @Put('settings')
  @UseGuards(AdminGuard)
  async updateSettings(@Body() body: Partial<CmsGlobalConfig>) {
    return await this.service.updateGlobalConfig(body);
  }
}


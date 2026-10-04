import { Module } from '@nestjs/common';
import { AdminBannersController } from './banners.controller';
import { AdminBannersService } from './banners.service';
import { AdminTemplatesController } from './templates.controller';
import { AdminTemplatesService } from './templates.service';
import { AdminOrdersController } from './orders.controller';
import { AdminOrdersService } from './orders.service';
import { CmsSettingsController } from './cms-settings.controller';
import { CmsSettingsService } from './cms-settings.service';
import { CmsPagesController } from './cms-pages.controller';
import { CmsPagesService } from './cms-pages.service';

@Module({
  controllers: [
    AdminBannersController, 
    AdminTemplatesController, 
    AdminOrdersController,
    CmsSettingsController,
    CmsPagesController,
  ],
  providers: [
    AdminBannersService, 
    AdminTemplatesService, 
    AdminOrdersService,
    CmsSettingsService,
    CmsPagesService,
  ],
  exports: [CmsSettingsService, CmsPagesService],
})
export class AdminGeneralModule {}



import { Module } from '@nestjs/common';
import { CatalogController } from './catalog.controller';
import { CatalogService } from './catalog.service';
import { AdminCatalogController } from './admin.controller';
import { AdminCatalogService } from './admin.service';

@Module({
  controllers: [CatalogController, AdminCatalogController],
  providers: [CatalogService, AdminCatalogService],
  exports: [CatalogService]
})
export class CatalogModule {}

import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards, Inject, Optional } from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { AdminTemplatesService } from './templates.service';

@Controller('api/admin/templates')
@UseGuards(AdminGuard)
export class AdminTemplatesController {
  private templatesService: AdminTemplatesService;

  constructor(@Optional() @Inject(AdminTemplatesService) templatesService?: AdminTemplatesService) {
    this.templatesService = templatesService || new AdminTemplatesService();
  }

  @Get()
  async getAll() {
    return await this.templatesService.getAll();
  }

  @Post()
  async create(@Body() data: any) {
    return await this.templatesService.create(data);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() data: any) {
    return await this.templatesService.update(Number(id), data);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return await this.templatesService.delete(Number(id));
  }
}

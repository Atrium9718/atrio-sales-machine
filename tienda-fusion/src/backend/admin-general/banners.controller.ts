import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards, Inject, Optional } from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { AdminBannersService } from './banners.service';

@Controller('api/admin/banners')
@UseGuards(AdminGuard)
export class AdminBannersController {
  private bannersService: AdminBannersService;

  constructor(@Optional() @Inject(AdminBannersService) bannersService?: AdminBannersService) {
    this.bannersService = bannersService || new AdminBannersService();
  }

  @Get()
  async getAll() {
    return await this.bannersService.getAll();
  }

  @Post()
  async create(@Body() data: any) {
    return await this.bannersService.create(data);
  }

  @Post('reorder')
  async reorder(@Body() data: { items?: { id: number; displayOrder: number }[]; bannerIds?: number[] }) {
    return await this.bannersService.reorder(data);
  }

  @Post(':id/duplicate')
  async duplicate(@Param('id') id: string) {
    return await this.bannersService.duplicate(Number(id));
  }

  @Put(':id/toggle')
  async toggle(@Param('id') id: string, @Body() data?: { active?: boolean }) {
    return await this.bannersService.toggleActive(Number(id), data?.active);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() data: any) {
    return await this.bannersService.update(Number(id), data);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return await this.bannersService.delete(Number(id));
  }
}

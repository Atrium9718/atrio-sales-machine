import { Controller, Get, Put, Param, Body, UseGuards, Inject, Optional } from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { AdminOrdersService } from './orders.service';

@Controller('api/admin/orders')
@UseGuards(AdminGuard)
export class AdminOrdersController {
  private ordersService: AdminOrdersService;

  constructor(@Optional() @Inject(AdminOrdersService) ordersService?: AdminOrdersService) {
    this.ordersService = ordersService || new AdminOrdersService();
  }

  @Get()
  async getAll() {
    return await this.ordersService.getAll();
  }

  @Get(':id')
  async getById(@Param('id') id: string) {
    // Note: Assuming ID passed is the numeric part, or we might need to parse 'ORD-2026-0001'
    let numericId = parseInt(id);
    if (isNaN(numericId) && id.startsWith('ORD-')) {
      numericId = parseInt(id.split('-')[2]);
    }
    return await this.ordersService.getById(numericId);
  }

  @Put(':id')
  async updateOrder(
    @Param('id') id: string,
    @Body() data: { status?: string; trackingNumber?: string; trackingCourier?: string; internalNotes?: string }
  ) {
    let numericId = parseInt(id);
    if (isNaN(numericId) && id.startsWith('ORD-')) {
      numericId = parseInt(id.split('-')[2]);
    }
    return await this.ordersService.updateOrder(numericId, data);
  }

  @Put(':id/status')
  async updateStatus(@Param('id') id: string, @Body() data: { status: string }) {
    let numericId = parseInt(id);
    if (isNaN(numericId) && id.startsWith('ORD-')) {
      numericId = parseInt(id.split('-')[2]);
    }
    return await this.ordersService.updateStatus(numericId, data.status);
  }
}

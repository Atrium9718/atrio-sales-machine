import { Controller, Post, Get, Body, HttpCode, Inject, Optional, Param } from '@nestjs/common';
import { ShippingService, ShippingRequest, ShippingConfig } from './shipping.service';

@Controller('api/shipping')
export class ShippingController {
  private shippingService: ShippingService;

  constructor(@Optional() @Inject(ShippingService) shippingService?: ShippingService) {
    this.shippingService = shippingService || new ShippingService();
  }

  @Get('config')
  getConfig() {
    return this.shippingService.getConfig();
  }

  @Post('config')
  saveConfig(@Body() payload: Partial<ShippingConfig>) {
    return this.shippingService.saveConfig(payload);
  }

  @Post('test-skydropx')
  async testSkydropx(@Body() payload: { skydropx?: any; mode?: 'sandbox' | 'production' }) {
    return this.shippingService.testSkydropxConnection(payload?.skydropx, payload?.mode);
  }

  @Post('test-connection')
  async testConnection(@Body() payload: any) {
    return this.shippingService.testSkydropxConnection(payload?.skydropx || payload, payload?.mode);
  }

  @Post('calculate')
  calculate(@Body() request: ShippingRequest) {
    return this.shippingService.calculateShipping(request);
  }

  @Post('orders/:id/generate-label')
  async generateLabel(@Param('id') id: string, @Body() payload: any) {
    return this.shippingService.generateOrderLabel(Number(id), payload);
  }

  @Get('track/:query')
  async trackOrder(@Param('query') query: string) {
    return this.shippingService.getPublicTracking(query);
  }

  @Post('request-pickup')
  async requestPickup(@Body() payload: { orderId: number; carrier?: string; pickupDate?: string; notes?: string }) {
    return this.shippingService.requestPickup(payload.orderId, payload.carrier, payload.pickupDate, payload.notes);
  }

  @Post('webhook/skydropx')
  @HttpCode(200)
  async handleSkydropxWebhook(@Body() payload: any) {
    return this.shippingService.handleSkydropxWebhook(payload);
  }
}

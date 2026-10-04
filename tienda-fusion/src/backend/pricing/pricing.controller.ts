import { Controller, Post, Get, Put, Body, Inject, Optional, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { PricingEngineService } from './pricing.service';

@Controller('api/pricing')
export class PricingController {
  private pricingService: PricingEngineService;

  constructor(@Optional() @Inject(PricingEngineService) pricingService?: PricingEngineService) {
    this.pricingService = pricingService || new PricingEngineService();
  }

  @Post('calculate')
  async calculate(@Body() body: any) {
    const { productId, quantity, attributes } = body;
    return await this.pricingService.calculateQuote(productId, quantity, attributes || []);
  }

  @Post('quote-book')
  async quoteBook(@Body() body: any) {
    return await this.pricingService.calculateBookQuote(body);
  }

  @Get('parameters')
  @UseGuards(AdminGuard)
  async getParameters() {
    return await this.pricingService.getAllParameters();
  }

  @Put('parameters')
  @UseGuards(AdminGuard)
  async updateParameters(@Body() body: { parameters: { code: string; costValue: number; active?: boolean }[] }) {
    return await this.pricingService.bulkUpdateParameters(body.parameters);
  }

  @Post('parameters/reset')
  @UseGuards(AdminGuard)
  async resetParameters() {
    return await this.pricingService.resetDefaultParameters();
  }
}

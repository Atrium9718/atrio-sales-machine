import { Controller, Post, Get, Body, Query, HttpCode, Inject, Optional, Param } from '@nestjs/common';
import { CheckoutService } from './checkout.service';
import { InvoicingService } from '../invoicing/invoicing.service';

@Controller('api/checkout')
export class CheckoutController {
  private checkoutService: CheckoutService;

  constructor(@Optional() @Inject(CheckoutService) checkoutService?: CheckoutService) {
    this.checkoutService = checkoutService || new CheckoutService(new InvoicingService());
  }

  @Get('gateways-status')
  getGatewayStatus() {
    return this.checkoutService.getGatewayStatus();
  }

  @Get('gateways-config')
  getGatewaysConfig() {
    return this.checkoutService.getGatewaysConfig();
  }

  @Post('gateways-config')
  saveGatewaysConfig(@Body() payload: any) {
    return this.checkoutService.saveGatewaysConfig(payload);
  }

  @Post('test-wompi')
  async testWompi(@Body() payload: any) {
    return this.checkoutService.testWompiConnection(payload);
  }

  @Post('test-bold')
  async testBold(@Body() payload: any) {
    return this.checkoutService.testBoldConnection(payload);
  }

  @Get('track')
  async trackOrder(@Query('code') code: string, @Query('email') email?: string) {
    return this.checkoutService.trackOrder(code, email);
  }

  @Get('customer-orders')
  async getCustomerOrders(@Query('email') email: string) {
    return this.checkoutService.getCustomerOrders(email);
  }

  @Post('order')
  async createOrder(@Body() payload: any) {
    return this.checkoutService.createOrder(payload);
  }

  @Post('wompi/session')
  async getWompiSession(@Body('orderId') orderId: number) {
    return this.checkoutService.getWompiSession(Number(orderId));
  }

  @Post('bold/session')
  async getBoldSession(@Body('orderId') orderId: number) {
    return this.checkoutService.getBoldSession(Number(orderId));
  }

  @Post('confirm-payment')
  async confirmPayment(@Body() payload: any) {
    return this.checkoutService.confirmPaymentDirect(payload);
  }

  @Post('webhook/wompi')
  @HttpCode(200)
  async wompiWebhook(@Body() payload: any) {
    return this.checkoutService.handleWompiWebhook(payload);
  }

  @Post('webhook/bold')
  @HttpCode(200)
  async boldWebhook(@Body() payload: any) {
    return this.checkoutService.handleBoldWebhook(payload);
  }

  @Post('webhook/payment')
  @HttpCode(200) // Las pasarelas de pago requieren 200 OK
  async receivePaymentWebhook(@Body() payload: any) {
    return this.checkoutService.handlePaymentWebhook(payload);
  }
}


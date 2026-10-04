import { Controller, Post, Get, Body, Query, HttpCode, Inject, Optional, Param, UseGuards, Req, Headers } from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { FirebaseAuthGuard, getOptionalDbUser } from '../auth/auth.guard';
import { PricingEngineService } from '../pricing/pricing.service';
import { CheckoutService } from './checkout.service';
import { InvoicingService } from '../invoicing/invoicing.service';

@Controller('api/checkout')
export class CheckoutController {
  private checkoutService: CheckoutService;

  constructor(@Optional() @Inject(CheckoutService) checkoutService?: CheckoutService) {
    this.checkoutService = checkoutService || new CheckoutService(new InvoicingService(), new PricingEngineService());
  }

  @Get('gateways-status')
  getGatewayStatus() {
    return this.checkoutService.getGatewayStatus();
  }

  @Get('gateways-config')
  @UseGuards(AdminGuard)
  getGatewaysConfig() {
    return this.checkoutService.getGatewaysConfig();
  }

  @Post('gateways-config')
  @UseGuards(AdminGuard)
  saveGatewaysConfig(@Body() payload: any) {
    return this.checkoutService.saveGatewaysConfig(payload);
  }

  @Post('test-wompi')
  @UseGuards(AdminGuard)
  async testWompi(@Body() payload: any) {
    return this.checkoutService.testWompiConnection(payload);
  }

  @Post('test-bold')
  @UseGuards(AdminGuard)
  async testBold(@Body() payload: any) {
    return this.checkoutService.testBoldConnection(payload);
  }

  @Get('track')
  async trackOrder(@Query('code') code: string, @Query('email') email?: string) {
    return this.checkoutService.trackOrder(code, email);
  }

  @Get('customer-orders')
  @UseGuards(FirebaseAuthGuard)
  async getCustomerOrders(@Req() req: any) {
    // Solo los pedidos del correo autenticado, nunca de un correo arbitrario
    return this.checkoutService.getCustomerOrders(req.dbUser?.email || '');
  }

  @Post('quote-cart')
  async quoteCart(@Body() payload: any, @Req() req: any) {
    const quote = await this.checkoutService.quoteCart(payload, await getOptionalDbUser(req));
    return {
      items: quote.items.map(it => ({ totalPrice: it.totalPrice, quantity: it.quantity })),
      grossSubtotal: quote.grossSubtotal,
      b2bDiscountPct: quote.b2bDiscountPct,
      b2bDiscount: quote.b2bDiscount,
      subtotal: quote.subtotal,
      iva: quote.iva,
      shippingCost: quote.shippingCost,
      shippingMethod: quote.shippingMethod,
      total: quote.total,
    };
  }

  @Post('order')
  async createOrder(@Body() payload: any, @Req() req: any) {
    return this.checkoutService.createOrder(payload, await getOptionalDbUser(req));
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
  async boldWebhook(@Body() payload: any, @Req() req: any, @Headers('x-bold-signature') signature?: string) {
    return this.checkoutService.handleBoldWebhook(payload, req.rawBody, signature);
  }

  @Post('webhook/payment')
  @HttpCode(200) // Las pasarelas de pago requieren 200 OK
  async receivePaymentWebhook(@Body() payload: any, @Req() req: any, @Headers('x-bold-signature') signature?: string) {
    return this.checkoutService.handlePaymentWebhook(payload, req.rawBody, signature);
  }
}


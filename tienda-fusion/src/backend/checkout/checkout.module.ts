import { Module } from '@nestjs/common';
import { CheckoutController } from './checkout.controller';
import { CheckoutService } from './checkout.service';
import { InvoicingModule } from '../invoicing/invoicing.module';
import { PricingModule } from '../pricing/pricing.module';

@Module({
  imports: [InvoicingModule, PricingModule],
  controllers: [CheckoutController],
  providers: [CheckoutService],
})
export class CheckoutModule {}

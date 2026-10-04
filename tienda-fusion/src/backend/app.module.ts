import { Module } from '@nestjs/common';
import { PricingModule } from './pricing/pricing.module';
import { CatalogModule } from './catalog/catalog.module';
import { ShippingModule } from './shipping/shipping.module';
import { CheckoutModule } from './checkout/checkout.module';
import { AdminGeneralModule } from './admin-general/admin-general.module';
import { AiModule } from './ai/ai.module';
import { AdminMarketingModule } from './admin-marketing/admin-marketing.module';
import { UsersModule } from './users/users.module';
import { MediaModule } from './media/media.module';
import { SeoModule } from './seo/seo.module';
import { B2BModule } from './b2b/b2b.module';

@Module({
  imports: [
    PricingModule,
    CatalogModule,
    ShippingModule,
    CheckoutModule,
    AdminGeneralModule,
    AiModule,
    AdminMarketingModule,
    UsersModule,
    MediaModule,
    SeoModule,
    B2BModule,
  ],
})
export class AppModule {}


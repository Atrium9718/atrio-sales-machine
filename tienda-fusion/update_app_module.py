import os

with open('src/backend/app.module.ts', 'r') as f:
    content = f.read()

if 'AdminGeneralModule' not in content:
    content = content.replace("import { CheckoutModule } from './checkout/checkout.module';", "import { CheckoutModule } from './checkout/checkout.module';\nimport { AdminGeneralModule } from './admin-general/admin-general.module';")
    content = content.replace("CheckoutModule,", "CheckoutModule,\n    AdminGeneralModule,")

with open('src/backend/app.module.ts', 'w') as f:
    f.write(content)

import os

with open('src/backend/catalog/catalog.service.ts', 'r') as f:
    content = f.read()

# Update getProductBySlug to handle numeric ID or slug string
if 'async getProductBySlug(slug: string)' in content:
    content = content.replace(
"""  async getProductBySlug(slug: string) {
    // 1. Get Product
    const prodResult = await db.select().from(products).where(eq(products.slug, slug));
    const product = prodResult[0];""",
"""  async getProductBySlug(slug: string) {
    // 1. Get Product (by slug or numeric id)
    let prodResult = await db.select().from(products).where(eq(products.slug, slug));
    if (prodResult.length === 0 && !isNaN(Number(slug))) {
      prodResult = await db.select().from(products).where(eq(products.id, Number(slug)));
    }
    const product = prodResult[0];"""
    )

# Add getTemplates if not exists
if 'async getTemplates()' not in content:
    content = content.replace(
"""  async getHomeBanners() {
    return await db.select().from(homeBanners).where(eq(homeBanners.active, true));
  }""",
"""  async getHomeBanners() {
    return await db.select().from(homeBanners).where(eq(homeBanners.active, true));
  }

  async getTemplates() {
    return await db.select().from(designTemplates).where(eq(designTemplates.active, true));
  }"""
    )

with open('src/backend/catalog/catalog.service.ts', 'w') as f:
    f.write(content)

with open('src/backend/catalog/catalog.controller.ts', 'r') as f:
    ctrl = f.read()

if 'getTemplates' not in ctrl:
    ctrl = ctrl.replace(
"""  @Get('banners')
  async getBanners() {
    return await this.catalogService.getHomeBanners();
  }""",
"""  @Get('banners')
  async getBanners() {
    return await this.catalogService.getHomeBanners();
  }

  @Get('templates')
  async getTemplates() {
    return await this.catalogService.getTemplates();
  }"""
    )

with open('src/backend/catalog/catalog.controller.ts', 'w') as f:
    f.write(ctrl)

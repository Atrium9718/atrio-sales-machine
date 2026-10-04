import { Injectable, NotFoundException } from '@nestjs/common';
import { db } from '../../db';
import { categories, products, attributes, attributeValues, productAttributes, productAttributeValues, homeBanners, designTemplates, pricingRules } from '../../db/schema';
import { eq, and, asc } from 'drizzle-orm';

const PRODUCT_IMAGES: Record<string, string> = {
  'tarjetas-estandar': 'https://images.unsplash.com/photo-1589041127535-ee162232fb5b?auto=format&fit=crop&w=800&q=80',
  'volante-media-carta': 'https://images.unsplash.com/photo-1596526131083-e8c638c9c6c5?auto=format&fit=crop&w=800&q=80',
  'pendon-rollup': 'https://images.unsplash.com/photo-1542744094-3a31f272c490?auto=format&fit=crop&w=800&q=80',
  'etiqueta-cuadrada': 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80',
  'separador': 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80',
  'cajas-personalizadas': 'https://images.unsplash.com/photo-1600868779951-872f7c006b0d?auto=format&fit=crop&w=800&q=80',
  'carpetas-corporativas': 'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?auto=format&fit=crop&w=800&q=80',
};

const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1589041127535-ee162232fb5b?auto=format&fit=crop&w=800&q=80';

@Injectable()
export class CatalogService {
  
  async getCategories() {
    const allCategories = await db.select().from(categories);
    return allCategories;
  }

  async getProductsByCategory(slug: string) {
    if (slug === 'todas') {
      const prods = await db.select({
        id: products.id,
        name: products.name,
        slug: products.slug,
        description: products.description,
        basePrice: products.basePrice,
        baseQuantity: products.baseQuantity,
        imageUrl: products.imageUrl,
        images: products.images,
        categoryId: products.categoryId,
        categoryName: categories.name,
        categorySlug: categories.slug,
        extraConfig: products.extraConfig
      })
      .from(products)
      .innerJoin(categories, eq(products.categoryId, categories.id))
      .where(eq(products.isActive, true));

      return prods.map(p => {
        const extra = (p.extraConfig as any) || {};
        const isFeatured = Boolean(extra.isFeatured);
        const isPromo = Boolean(extra.isPromo);
        const discountPercentage = Number(extra.discountPercentage || extra.promoDiscountPercentage || 0);
        const promoBadge = extra.promoBadge || (discountPercentage > 0 ? `${discountPercentage}% OFF` : (isPromo ? 'OFERTA' : undefined));
        const rawBasePrice = Number(p.basePrice) || 0;
        const finalBasePrice = (isPromo && discountPercentage > 0)
          ? Math.round(rawBasePrice * (1 - discountPercentage / 100))
          : rawBasePrice;

        return {
          ...p,
          basePrice: finalBasePrice,
          originalBasePrice: (isPromo && discountPercentage > 0) ? rawBasePrice : undefined,
          baseQuantity: Number(p.baseQuantity) || 1,
          imageUrl: (p.imageUrl && p.imageUrl.trim() !== '') ? p.imageUrl : (PRODUCT_IMAGES[p.slug] || DEFAULT_IMAGE),
          images: p.images || [],
          isFeatured,
          isPromo,
          discountPercentage,
          promoBadge,
          extraConfig: extra
        };
      });
    }
    
    const categoryResult = await db.select().from(categories).where(eq(categories.slug, slug));
    const category = categoryResult[0];
    
    if (!category) {
      throw new NotFoundException('Categoría no encontrada');
    }

    const categoryProducts = await db.select().from(products).where(
      and(eq(products.categoryId, category.id), eq(products.isActive, true))
    );
    return {
      category,
      products: categoryProducts.map(p => {
        const extra = (p.extraConfig as any) || {};
        const isFeatured = Boolean(extra.isFeatured);
        const isPromo = Boolean(extra.isPromo);
        const discountPercentage = Number(extra.discountPercentage || extra.promoDiscountPercentage || 0);
        const promoBadge = extra.promoBadge || (discountPercentage > 0 ? `${discountPercentage}% OFF` : (isPromo ? 'OFERTA' : undefined));
        const rawBasePrice = Number(p.basePrice) || 0;
        const finalBasePrice = (isPromo && discountPercentage > 0)
          ? Math.round(rawBasePrice * (1 - discountPercentage / 100))
          : rawBasePrice;

        return {
          ...p,
          basePrice: finalBasePrice,
          originalBasePrice: (isPromo && discountPercentage > 0) ? rawBasePrice : undefined,
          categoryName: category.name,
          categorySlug: category.slug,
          imageUrl: (p.imageUrl && p.imageUrl.trim() !== '') ? p.imageUrl : (PRODUCT_IMAGES[p.slug] || DEFAULT_IMAGE),
          images: p.images || [],
          isFeatured,
          isPromo,
          discountPercentage,
          promoBadge,
          extraConfig: extra
        };
      })
    };
  }

  async getProductBySlug(slug: string) {
    // 1. Get Product (by slug or numeric id)
    let prodResult = await db.select().from(products).where(eq(products.slug, slug));
    if (prodResult.length === 0 && !isNaN(Number(slug))) {
      prodResult = await db.select().from(products).where(eq(products.id, Number(slug)));
    }
    const product = prodResult[0];
    
    if (!product) {
      throw new NotFoundException(`Producto ${slug} no encontrado`);
    }

    const resolvedImageUrl = (product.imageUrl && product.imageUrl.trim() !== '') 
      ? product.imageUrl 
      : (PRODUCT_IMAGES[product.slug] || DEFAULT_IMAGE);
    const attrs = await db.select({
       id: attributes.id,
       name: attributes.name,
       code: attributes.code,
       controlType: attributes.controlType,
       productAttributeId: productAttributes.id
    })
    .from(productAttributes)
    .innerJoin(attributes, eq(productAttributes.attributeId, attributes.id))
    .where(eq(productAttributes.productId, product.id));

    // 3. For each attribute, get values
    const productAttributesWithValues = await Promise.all(attrs.map(async (attr) => {
       const vals = await db.select({
         id: attributeValues.id,
         label: attributeValues.label,
         value: attributeValues.value,
         valueCode: attributeValues.valueCode,
         priceModifier: productAttributeValues.priceModifier,
         daysModifier: productAttributeValues.daysModifier
       })
       .from(productAttributeValues)
       .innerJoin(attributeValues, eq(productAttributeValues.attributeValueId, attributeValues.id))
       .where(eq(productAttributeValues.productAttributeId, attr.productAttributeId));

       const formattedVals = vals.map(v => ({
         ...v,
         label: v.label || v.value || v.valueCode || 'Opción Estándar',
         value: v.value || v.label || v.valueCode || 'Opción Estándar'
       }));

       return { ...attr, values: formattedVals };
    }));

    const rules = await db.select().from(pricingRules).where(eq(pricingRules.productId, product.id));
    const extra = (product.extraConfig as any) || {};

    return { 
      ...product,
      imageUrl: resolvedImageUrl,
      images: Array.isArray(product.images) && product.images.length > 0 
        ? product.images 
        : (resolvedImageUrl ? [resolvedImageUrl] : []),
      attributes: productAttributesWithValues,
      pricingRules: rules.map(r => ({
        minQty: r.minQty || r.minQuantity || 1,
        maxQty: r.maxQty || r.maxQuantity || 999999,
        discountPercentage: Number(r.discountPercentage || 0),
        fixedPrice: r.fixedPrice ? Number(r.fixedPrice) : undefined
      })),
      quantityTiers: extra.quantityTiers || []
    };
  }

  async getHomeBanners(placement?: string) {
    const all = await db.select().from(homeBanners).where(eq(homeBanners.isActive, true)).orderBy(asc(homeBanners.displayOrder), asc(homeBanners.id));
    if (placement) {
      return all.filter(b => b.placement === placement);
    }
    return all;
  }

  async getTemplates() {
    return await db.select().from(designTemplates).where(eq(designTemplates.isActive, true));
  }
}

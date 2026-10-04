import { Injectable, NotFoundException } from '@nestjs/common';
import { db } from '../../db';
import { 
  categories, 
  products, 
  attributes, 
  attributeValues, 
  productAttributes, 
  productAttributeValues, 
  pricingRules,
  designTemplates,
  orderItems
} from '../../db/schema';
import { eq, and, sql } from 'drizzle-orm';

@Injectable()
export class AdminCatalogService {
  
  async getAllProducts() {
    const allProducts = await db.select({
      id: products.id,
      name: products.name,
      slug: products.slug,
      description: products.description,
      basePrice: products.basePrice,
      baseQuantity: products.baseQuantity,
      minQuantity: products.minQuantity,
      quantityStep: products.quantityStep,
      setupFee: products.setupFee,
      pricingMode: products.pricingMode,
      extraConfig: products.extraConfig,
      imageUrl: products.imageUrl,
      images: products.images,
      categoryId: products.categoryId,
      categoryName: categories.name,
      isActive: products.isActive,
    })
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .orderBy(products.id);

    // Contar atributos por producto
    const attrCounts = await db.select({
      productId: productAttributes.productId,
      count: sql<number>`count(${productAttributes.id})::int`
    })
    .from(productAttributes)
    .groupBy(productAttributes.productId);

    const attrCountMap = new Map(attrCounts.map(ac => [ac.productId, ac.count]));

    return allProducts.map(p => {
      const extra = (p.extraConfig as any) || {};
      const isFeatured = Boolean(extra.isFeatured);
      const isPromo = Boolean(extra.isPromo);
      const discountPercentage = Number(extra.discountPercentage || extra.promoDiscountPercentage || 0);

      return {
        ...p,
        basePrice: Number(p.basePrice),
        baseQuantity: Number(p.baseQuantity) || 1,
        minQuantity: Number(p.minQuantity) || 1,
        quantityStep: Number(p.quantityStep) || 1,
        setupFee: Number(p.setupFee) || 0,
        pricingMode: p.pricingMode || 'prorated',
        extraConfig: extra,
        isFeatured,
        isPromo,
        discountPercentage,
        promoBadge: extra.promoBadge || (discountPercentage > 0 ? `${discountPercentage}% OFF` : (isPromo ? 'OFERTA' : '')),
        promoPrice: extra.promoPrice !== undefined ? Number(extra.promoPrice) : undefined,
        promoDescription: extra.promoDescription || '',
        category: p.categoryName,
        status: p.isActive ? 'Activo' : 'Inactivo',
        attributesCount: attrCountMap.get(p.id) || 0,
        image: p.imageUrl || (Array.isArray(p.images) && p.images[0]) || 'https://images.unsplash.com/photo-1589041127535-ee162232fb5b?auto=format&fit=crop&w=800&q=80',
        images: p.images || []
      };
    });
  }

  async getProduct(id: number) {
    const prodResult = await db.select().from(products).where(eq(products.id, id));
    const product = prodResult[0];
    if (!product) throw new NotFoundException('Producto no encontrado');

    const productAttrs = await db.select({
      id: attributes.id,
      name: attributes.name,
      code: attributes.code,
      attributeGroup: attributes.attributeGroup,
      productAttributeId: productAttributes.id
    })
    .from(productAttributes)
    .innerJoin(attributes, eq(productAttributes.attributeId, attributes.id))
    .where(eq(productAttributes.productId, id));

    const productAttributesWithValues = await Promise.all(productAttrs.map(async (attr) => {
      const vals = await db.select({
        id: attributeValues.id,
        label: attributeValues.label,
        valueCode: attributeValues.valueCode,
        priceModifier: productAttributeValues.priceModifier,
        weightModifier: productAttributeValues.weightModifier,
        daysModifier: productAttributeValues.daysModifier
      })
      .from(productAttributeValues)
      .innerJoin(attributeValues, eq(productAttributeValues.attributeValueId, attributeValues.id))
      .where(eq(productAttributeValues.productAttributeId, attr.productAttributeId));
      
      return {
        attributeId: attr.code,
        attributeDbId: attr.id,
        name: attr.name,
        group: attr.attributeGroup || 'General',
        values: vals.map(v => ({
          valueId: v.valueCode,
          valueDbId: v.id,
          label: v.label,
          priceModifier: Number(v.priceModifier),
          weightModifier: Number(v.weightModifier),
          daysModifier: v.daysModifier || 0
        }))
      };
    }));

      // Descuentos por volumen y reglas de precios
    const rules = await db.select().from(pricingRules).where(eq(pricingRules.productId, id));
    const pRules = rules.length > 0 
      ? rules.map(r => ({
          minQty: r.minQuantity || r.minQty || 1,
          maxQty: r.maxQuantity || r.maxQty || 999999,
          discountPercentage: Number(r.discountPercentage || 0),
          fixedPrice: r.fixedPrice ? Number(r.fixedPrice) : undefined
        }))
      : [];

    const imagesArray = Array.isArray(product.images) && product.images.length > 0 
      ? product.images 
      : (product.imageUrl ? [product.imageUrl] : []);

    const extra = (product.extraConfig as any) || {};
    const isFeatured = Boolean(extra.isFeatured);
    const isPromo = Boolean(extra.isPromo);
    const discountPercentage = Number(extra.discountPercentage || extra.promoDiscountPercentage || 0);

    return {
      id: product.id,
      name: product.name,
      slug: product.slug,
      description: product.description || '',
      categoryId: product.categoryId ? product.categoryId.toString() : '1',
      basePrice: Number(product.basePrice),
      baseQuantity: Number(product.baseQuantity) || 1,
      minQuantity: Number(product.minQuantity) || 1,
      quantityStep: Number(product.quantityStep) || 1,
      setupFee: Number(product.setupFee) || 0,
      pricingMode: product.pricingMode || (extra.quantityTiers?.length > 0 ? 'tiered_fixed' : 'prorated'),
      extraConfig: extra,
      isFeatured,
      isPromo,
      discountPercentage,
      promoBadge: extra.promoBadge || (discountPercentage > 0 ? `${discountPercentage}% OFF` : (isPromo ? 'OFERTA' : '')),
      promoPrice: extra.promoPrice !== undefined ? Number(extra.promoPrice) : undefined,
      promoDescription: extra.promoDescription || '',
      quantityTiers: extra.quantityTiers || [],
      imageUrl: product.imageUrl || (imagesArray[0] || null),
      images: imagesArray,
      isActive: product.isActive,
      attributes: productAttributesWithValues,
      pricingRules: pRules
    };
  }

  async createProduct(data: any) {
    try {
      return await db.transaction(async (tx) => {
        const imagesList = Array.isArray(data.images) ? data.images.filter((img: any) => typeof img === 'string' && img.trim() !== '') : [];
        const primaryImage = data.imageUrl || imagesList[0] || null;

        const extraConfig = {
          ...(data.extraConfig || {}),
          quantityTiers: Array.isArray(data.quantityTiers) ? data.quantityTiers : (data.extraConfig?.quantityTiers || []),
          isFeatured: data.isFeatured !== undefined ? Boolean(data.isFeatured) : (data.extraConfig?.isFeatured ?? false),
          isPromo: data.isPromo !== undefined ? Boolean(data.isPromo) : (data.extraConfig?.isPromo ?? false),
          discountPercentage: data.discountPercentage !== undefined ? Number(data.discountPercentage) : (data.extraConfig?.discountPercentage ?? 0),
          promoDiscountPercentage: data.discountPercentage !== undefined ? Number(data.discountPercentage) : (data.extraConfig?.promoDiscountPercentage ?? 0),
          promoBadge: data.promoBadge !== undefined ? data.promoBadge : (data.extraConfig?.promoBadge ?? ''),
          promoPrice: data.promoPrice !== undefined ? Number(data.promoPrice) : data.extraConfig?.promoPrice,
          promoDescription: data.promoDescription !== undefined ? data.promoDescription : (data.extraConfig?.promoDescription ?? '')
        };

        // 1. Crear producto
        const prodResult = await tx.insert(products).values({
          categoryId: Number(data.categoryId) || 1,
          name: data.name,
          slug: data.slug || data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          description: data.description || '',
          configMode: 'W2P',
          basePrice: String(data.basePrice || 0),
          baseQuantity: Math.max(1, Number(data.baseQuantity) || 1),
          minQuantity: Math.max(1, Number(data.minQuantity) || 1),
          quantityStep: Math.max(1, Number(data.quantityStep) || 1),
          setupFee: String(data.setupFee || 0),
          pricingMode: data.pricingMode || (extraConfig.quantityTiers.length > 0 ? 'tiered_fixed' : 'prorated'),
          extraConfig: extraConfig,
          imageUrl: primaryImage,
          images: imagesList.length > 0 ? imagesList : (primaryImage ? [primaryImage] : []),
          isActive: data.isActive !== undefined ? Boolean(data.isActive) : true,
        }).returning();
        const product = prodResult[0];

        // 2. Procesar atributos y variables
        if (data.attributes && Array.isArray(data.attributes)) {
          for (const attr of data.attributes) {
            if (!attr.name) continue;
            const attrCode = attr.attributeId || attr.name.toUpperCase().replace(/[^A-Z0-9_]+/g, '_');

            // Check if attribute exists
            let attrRecord = await tx.select().from(attributes).where(eq(attributes.code, attrCode)).then(res => res[0]);
            if (!attrRecord) {
              attrRecord = await tx.insert(attributes).values({
                name: attr.name,
                code: attrCode,
                controlType: 'SELECT',
                attributeGroup: attr.group || 'DEFAULT'
              }).returning().then(res => res[0]);
            }

            // Vincular producto con atributo
            const prodAttr = await tx.insert(productAttributes).values({
              productId: product.id,
              attributeId: attrRecord.id
            }).returning().then(res => res[0]);

            // Procesar valores
            if (attr.values && Array.isArray(attr.values)) {
              for (const val of attr.values) {
                if (!val.label && !val.valueId) continue;
                const valLabel = val.label || val.valueId;
                const valCode = val.valueId || valLabel.toUpperCase().replace(/[^A-Z0-9_]+/g, '_');

                let valRecord = await tx.select().from(attributeValues).where(
                  and(eq(attributeValues.attributeId, attrRecord.id), eq(attributeValues.valueCode, valCode))
                ).then(res => res[0]);

                if (!valRecord) {
                  valRecord = await tx.insert(attributeValues).values({
                    attributeId: attrRecord.id,
                    label: valLabel,
                    valueCode: valCode,
                    value: valLabel
                  }).returning().then(res => res[0]);
                }

                await tx.insert(productAttributeValues).values({
                  productAttributeId: prodAttr.id,
                  attributeValueId: valRecord.id,
                  priceModifier: String(val.priceModifier || 0),
                  weightModifier: String(val.weightModifier || 0),
                  daysModifier: Number(val.daysModifier || 0)
                });
              }
            }
          }
        }

        // 3. Procesar reglas de precios y descuentos
        if (data.pricingRules && Array.isArray(data.pricingRules)) {
          for (const rule of data.pricingRules) {
            await tx.insert(pricingRules).values({
              productId: product.id,
              minQty: Number(rule.minQty) || 1,
              maxQty: Number(rule.maxQty) || 999999,
              discountPercentage: String(rule.discountPercentage || 0),
              fixedPrice: rule.fixedPrice !== undefined ? String(rule.fixedPrice) : null
            });
          }
        }

        return product;
      });
    } catch (e: any) {
      console.error('Error en createProduct:', e);
      throw e;
    }
  }

  async updateProduct(id: number, data: any) {
    try {
      return await db.transaction(async (tx) => {
        const imagesList = Array.isArray(data.images) 
          ? data.images.filter((img: any) => typeof img === 'string' && img.trim() !== '') 
          : [];
        const primaryImage = data.imageUrl || imagesList[0] || null;

        const extraConfig = {
          ...(data.extraConfig || {}),
          quantityTiers: Array.isArray(data.quantityTiers) ? data.quantityTiers : (data.extraConfig?.quantityTiers || []),
          isFeatured: data.isFeatured !== undefined ? Boolean(data.isFeatured) : (data.extraConfig?.isFeatured ?? false),
          isPromo: data.isPromo !== undefined ? Boolean(data.isPromo) : (data.extraConfig?.isPromo ?? false),
          discountPercentage: data.discountPercentage !== undefined ? Number(data.discountPercentage) : (data.extraConfig?.discountPercentage ?? 0),
          promoDiscountPercentage: data.discountPercentage !== undefined ? Number(data.discountPercentage) : (data.extraConfig?.promoDiscountPercentage ?? 0),
          promoBadge: data.promoBadge !== undefined ? data.promoBadge : (data.extraConfig?.promoBadge ?? ''),
          promoPrice: data.promoPrice !== undefined ? Number(data.promoPrice) : data.extraConfig?.promoPrice,
          promoDescription: data.promoDescription !== undefined ? data.promoDescription : (data.extraConfig?.promoDescription ?? '')
        };

        const prodResult = await tx.update(products).set({
          categoryId: Number(data.categoryId) || 1,
          name: data.name,
          slug: data.slug,
          description: data.description,
          basePrice: String(data.basePrice || 0),
          baseQuantity: Math.max(1, Number(data.baseQuantity) || 1),
          minQuantity: Math.max(1, Number(data.minQuantity) || 1),
          quantityStep: Math.max(1, Number(data.quantityStep) || 1),
          setupFee: String(data.setupFee || 0),
          pricingMode: data.pricingMode || (extraConfig.quantityTiers.length > 0 ? 'tiered_fixed' : 'prorated'),
          extraConfig: extraConfig,
          imageUrl: primaryImage,
          images: imagesList.length > 0 ? imagesList : (primaryImage ? [primaryImage] : []),
          isActive: data.isActive !== undefined ? Boolean(data.isActive) : true,
        }).where(eq(products.id, id)).returning();

        // Si se enviaron atributos, sincronizar limpiamente
        if (data.attributes && Array.isArray(data.attributes)) {
          const currentProdAttrs = await tx.select().from(productAttributes).where(eq(productAttributes.productId, id));
          
          // Eliminar valores anteriores de los atributos asociados
          for (const pa of currentProdAttrs) {
            await tx.delete(productAttributeValues).where(eq(productAttributeValues.productAttributeId, pa.id));
          }
          await tx.delete(productAttributes).where(eq(productAttributes.productId, id));

          for (const attr of data.attributes) {
            if (!attr.name) continue;
            const attrCode = attr.attributeId || attr.name.toUpperCase().replace(/[^A-Z0-9_]+/g, '_');
            
            let attrRecord = await tx.select().from(attributes).where(eq(attributes.code, attrCode)).then(res => res[0]);
            if (!attrRecord) {
              attrRecord = await tx.insert(attributes).values({
                name: attr.name,
                code: attrCode,
                controlType: 'SELECT',
                attributeGroup: attr.group || 'DEFAULT'
              }).returning().then(res => res[0]);
            }

            const prodAttr = await tx.insert(productAttributes).values({
              productId: id,
              attributeId: attrRecord.id
            }).returning().then(res => res[0]);

            if (attr.values && Array.isArray(attr.values)) {
              for (const val of attr.values) {
                if (!val.label && !val.valueId) continue;
                const valLabel = val.label || val.valueId;
                const valCode = val.valueId || valLabel.toUpperCase().replace(/[^A-Z0-9_]+/g, '_');

                let valRecord = await tx.select().from(attributeValues).where(
                  and(eq(attributeValues.attributeId, attrRecord.id), eq(attributeValues.valueCode, valCode))
                ).then(res => res[0]);

                if (!valRecord) {
                  valRecord = await tx.insert(attributeValues).values({
                    attributeId: attrRecord.id,
                    label: valLabel,
                    valueCode: valCode,
                    value: valLabel,
                  }).returning().then(res => res[0]);
                } else {
                  await tx.update(attributeValues).set({ label: valLabel }).where(eq(attributeValues.id, valRecord.id));
                }

                await tx.insert(productAttributeValues).values({
                  productAttributeId: prodAttr.id,
                  attributeValueId: valRecord.id,
                  priceModifier: String(val.priceModifier || 0),
                  weightModifier: String(val.weightModifier || 0),
                  daysModifier: Number(val.daysModifier || 0)
                });
              }
            }
          }
        }

        // Sincronizar reglas de precios y descuentos
        if (data.pricingRules && Array.isArray(data.pricingRules)) {
          await tx.delete(pricingRules).where(eq(pricingRules.productId, id));
          for (const rule of data.pricingRules) {
            await tx.insert(pricingRules).values({
              productId: id,
              minQty: Number(rule.minQty) || 1,
              maxQty: Number(rule.maxQty) || 999999,
              discountPercentage: String(rule.discountPercentage || 0),
              fixedPrice: rule.fixedPrice !== undefined ? String(rule.fixedPrice) : null
            });
          }
        }

        return prodResult[0];
      });
    } catch (e: any) {
      console.error('Error en updateProduct:', e);
      throw e;
    }
  }

  async quickUpdateProduct(id: number, patch: any) {
    const currentProd = await db.select().from(products).where(eq(products.id, id)).then(res => res[0]);
    if (!currentProd) throw new NotFoundException('Producto no encontrado');

    const updateData: any = {};
    if (patch.basePrice !== undefined) updateData.basePrice = String(patch.basePrice);
    if (patch.baseQuantity !== undefined) updateData.baseQuantity = Math.max(1, Number(patch.baseQuantity));
    if (patch.minQuantity !== undefined) updateData.minQuantity = Math.max(1, Number(patch.minQuantity));
    if (patch.quantityStep !== undefined) updateData.quantityStep = Math.max(1, Number(patch.quantityStep));
    if (patch.setupFee !== undefined) updateData.setupFee = String(patch.setupFee);
    if (patch.pricingMode !== undefined) updateData.pricingMode = patch.pricingMode;
    if (patch.isActive !== undefined) updateData.isActive = Boolean(patch.isActive);
    if (patch.name !== undefined) updateData.name = patch.name;

    const currentExtra = (currentProd.extraConfig as any) || {};
    let extraChanged = false;
    const newExtra = { ...currentExtra };

    if (patch.isFeatured !== undefined) {
      newExtra.isFeatured = Boolean(patch.isFeatured);
      extraChanged = true;
    }
    if (patch.isPromo !== undefined) {
      newExtra.isPromo = Boolean(patch.isPromo);
      extraChanged = true;
    }
    if (patch.discountPercentage !== undefined) {
      newExtra.discountPercentage = Number(patch.discountPercentage);
      newExtra.promoDiscountPercentage = Number(patch.discountPercentage);
      extraChanged = true;
    }
    if (patch.promoBadge !== undefined) {
      newExtra.promoBadge = patch.promoBadge;
      extraChanged = true;
    }
    if (patch.promoPrice !== undefined) {
      newExtra.promoPrice = Number(patch.promoPrice);
      extraChanged = true;
    }
    if (patch.promoDescription !== undefined) {
      newExtra.promoDescription = patch.promoDescription;
      extraChanged = true;
    }
    if (patch.extraConfig !== undefined) {
      Object.assign(newExtra, patch.extraConfig);
      extraChanged = true;
    }

    if (extraChanged) {
      updateData.extraConfig = newExtra;
    }

    const res = await db.update(products).set(updateData).where(eq(products.id, id)).returning();
    return res[0];
  }

  async duplicateProduct(id: number) {
    try {
      return await db.transaction(async (tx) => {
        const original = await tx.select().from(products).where(eq(products.id, id)).then(res => res[0]);
        if (!original) throw new Error('Producto no encontrado');

        const timestamp = Date.now().toString().slice(-4);
        const newSlug = `${original.slug}-copia-${timestamp}`;
        const newName = `${original.name} (Copia)`;

        // 1. Clonar producto
        const cloned = await tx.insert(products).values({
          categoryId: original.categoryId,
          name: newName,
          slug: newSlug,
          description: original.description,
          configMode: original.configMode,
          basePrice: original.basePrice,
          baseQuantity: original.baseQuantity,
          minQuantity: original.minQuantity,
          quantityStep: original.quantityStep,
          setupFee: original.setupFee,
          pricingMode: original.pricingMode,
          extraConfig: original.extraConfig,
          imageUrl: original.imageUrl,
          images: original.images,
          category: original.category,
          isActive: true,
        }).returning().then(res => res[0]);

        // 2. Clonar atributos y modificadores
        const origProdAttrs = await tx.select().from(productAttributes).where(eq(productAttributes.productId, id));
        for (const pa of origProdAttrs) {
          const newProdAttr = await tx.insert(productAttributes).values({
            productId: cloned.id,
            attributeId: pa.attributeId,
          }).returning().then(res => res[0]);

          const origVals = await tx.select().from(productAttributeValues).where(eq(productAttributeValues.productAttributeId, pa.id));
          for (const pv of origVals) {
            await tx.insert(productAttributeValues).values({
              productAttributeId: newProdAttr.id,
              attributeValueId: pv.attributeValueId,
              priceModifier: pv.priceModifier,
              weightModifier: pv.weightModifier,
              daysModifier: pv.daysModifier,
            });
          }
        }

        // 3. Clonar reglas de precios
        const origPricingRules = await tx.select().from(pricingRules).where(eq(pricingRules.productId, id));
        for (const pr of origPricingRules) {
          await tx.insert(pricingRules).values({
            productId: cloned.id,
            minQty: pr.minQty,
            maxQty: pr.maxQty,
            discountPercentage: pr.discountPercentage,
            fixedPrice: pr.fixedPrice
          });
        }

        return cloned;
      });
    } catch (e: any) {
      console.error('Error en duplicateProduct:', e);
      throw e;
    }
  }

  async deleteProduct(id: number) {
    try {
      return await db.transaction(async (tx) => {
        // Delete dependent design templates first
        await tx.delete(designTemplates).where(eq(designTemplates.productId, id));
        // Delete dependent order items if any
        await tx.delete(orderItems).where(eq(orderItems.productId, id));
        
        const prodAttrs = await tx.select().from(productAttributes).where(eq(productAttributes.productId, id));
        for (const pa of prodAttrs) {
          await tx.delete(productAttributeValues).where(eq(productAttributeValues.productAttributeId, pa.id));
        }
        await tx.delete(productAttributes).where(eq(productAttributes.productId, id));
        await tx.delete(pricingRules).where(eq(pricingRules.productId, id));
        
        await tx.delete(products).where(eq(products.id, id));
        return { success: true };
      });
    } catch (e: any) {
      console.error('Error en deleteProduct:', e);
      throw e;
    }
  }

  // ==========================================
  // MASTER ATTRIBUTES & VALUES LIBRARY
  // ==========================================

  async getAllMasterAttributes() {
    const allAttrs = await db.select().from(attributes).orderBy(attributes.id);
    
    const result = await Promise.all(allAttrs.map(async (attr) => {
      const vals = await db.select().from(attributeValues).where(eq(attributeValues.attributeId, attr.id)).orderBy(attributeValues.id);
      return {
        id: attr.id,
        name: attr.name,
        code: attr.code,
        group: attr.attributeGroup || 'General',
        controlType: attr.controlType || 'SELECT',
        values: vals.map(v => {
          const extra = (v.extraData as any) || {};
          return {
            id: v.id,
            label: v.label,
            valueCode: v.valueCode,
            value: v.value,
            extraData: extra,
            defaultPriceModifier: Number(extra.defaultPrice || 0),
            defaultDaysModifier: Number(extra.defaultDays || 0),
            defaultWeightModifier: Number(extra.defaultWeight || 0),
          };
        })
      };
    }));

    return result;
  }

  async createMasterAttribute(data: any) {
    const code = data.code || data.name.toUpperCase().replace(/[^A-Z0-9_]+/g, '_');
    const res = await db.insert(attributes).values({
      name: data.name,
      code: code,
      attributeGroup: data.group || 'General',
      controlType: data.controlType || 'SELECT',
    }).returning();
    return res[0];
  }

  async updateMasterAttribute(id: number, data: any) {
    const res = await db.update(attributes).set({
      name: data.name,
      code: data.code,
      attributeGroup: data.group,
      controlType: data.controlType,
    }).where(eq(attributes.id, id)).returning();
    return res[0];
  }

  async deleteMasterAttribute(id: number) {
    return await db.transaction(async (tx) => {
      await tx.delete(attributeValues).where(eq(attributeValues.attributeId, id));
      await tx.delete(attributes).where(eq(attributes.id, id));
      return { success: true };
    });
  }

  async createMasterAttributeValue(attributeId: number, data: any) {
    const code = data.valueCode || data.label.toUpperCase().replace(/[^A-Z0-9_]+/g, '_');
    const extraData = {
      defaultPrice: Number(data.defaultPriceModifier || 0),
      defaultDays: Number(data.defaultDaysModifier || 0),
      defaultWeight: Number(data.defaultWeightModifier || 0),
    };

    const res = await db.insert(attributeValues).values({
      attributeId: attributeId,
      label: data.label,
      valueCode: code,
      value: data.label,
      extraData: extraData,
    }).returning();
    return res[0];
  }

  async updateMasterAttributeValue(valId: number, data: any) {
    const extraData = {
      defaultPrice: Number(data.defaultPriceModifier || 0),
      defaultDays: Number(data.defaultDaysModifier || 0),
      defaultWeight: Number(data.defaultWeightModifier || 0),
    };

    const res = await db.update(attributeValues).set({
      label: data.label,
      valueCode: data.valueCode,
      value: data.label,
      extraData: extraData,
    }).where(eq(attributeValues.id, valId)).returning();
    return res[0];
  }

  async deleteMasterAttributeValue(valId: number) {
    await db.delete(attributeValues).where(eq(attributeValues.id, valId));
    return { success: true };
  }

  async getAllCategories() {
    const cats = await db.select().from(categories).orderBy(categories.displayOrder, categories.id);
    const prodCounts = await db.select({
      categoryId: products.categoryId,
      count: sql<number>`count(${products.id})::int`
    })
    .from(products)
    .groupBy(products.categoryId);

    const countsMap = new Map(prodCounts.filter(c => c.categoryId !== null).map(c => [c.categoryId as number, c.count]));

    return cats.map(c => ({
      ...c,
      productCount: countsMap.get(c.id) || 0
    }));
  }

  async createCategory(data: {
    name: string;
    slug?: string;
    parentId?: number | null;
    active?: boolean;
    displayOrder?: number;
    description?: string;
    icon?: string;
  }) {
    let cleanSlug = data.slug?.trim() || data.name.toLowerCase().trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');

    if (!cleanSlug) {
      cleanSlug = `cat-${Date.now()}`;
    }

    // Check if slug already exists, if so append random suffix
    const existing = await db.select().from(categories).where(eq(categories.slug, cleanSlug)).limit(1);
    if (existing.length > 0) {
      cleanSlug = `${cleanSlug}-${Math.floor(Math.random() * 1000)}`;
    }

    const res = await db.insert(categories).values({
      name: data.name.trim(),
      slug: cleanSlug,
      parentId: data.parentId || null,
      active: data.active !== undefined ? data.active : true,
      displayOrder: Number(data.displayOrder) || 0,
      description: data.description?.trim() || '',
      icon: data.icon?.trim() || '📁',
    }).returning();

    return res[0];
  }

  async updateCategory(id: number, data: {
    name?: string;
    slug?: string;
    parentId?: number | null;
    active?: boolean;
    displayOrder?: number;
    description?: string;
    icon?: string;
  }) {
    const updatePayload: any = {};
    if (data.name !== undefined) updatePayload.name = data.name.trim();
    if (data.slug !== undefined) {
      let cleanSlug = data.slug.trim()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');
      if (cleanSlug) updatePayload.slug = cleanSlug;
    }
    if (data.parentId !== undefined) updatePayload.parentId = data.parentId;
    if (data.active !== undefined) updatePayload.active = data.active;
    if (data.displayOrder !== undefined) updatePayload.displayOrder = Number(data.displayOrder) || 0;
    if (data.description !== undefined) updatePayload.description = data.description?.trim() || '';
    if (data.icon !== undefined) updatePayload.icon = data.icon?.trim() || '📁';

    const res = await db.update(categories)
      .set(updatePayload)
      .where(eq(categories.id, id))
      .returning();

    if (!res.length) throw new NotFoundException('Categoría no encontrada');
    return res[0];
  }

  async toggleCategoryStatus(id: number, active: boolean) {
    const res = await db.update(categories)
      .set({ active })
      .where(eq(categories.id, id))
      .returning();
    if (!res.length) throw new NotFoundException('Categoría no encontrada');
    return res[0];
  }

  async deleteCategory(id: number, reassignToCategoryId?: number) {
    const cat = await db.select().from(categories).where(eq(categories.id, id)).then(r => r[0]);
    if (!cat) throw new NotFoundException('Categoría no encontrada');

    // Reasignar productos si los hay
    const prods = await db.select({ id: products.id }).from(products).where(eq(products.categoryId, id));
    if (prods.length > 0) {
      let targetCatId: number | null = null;
      if (reassignToCategoryId && reassignToCategoryId !== id) {
        targetCatId = reassignToCategoryId;
      } else {
        const fallbackCat = await db.select().from(categories).where(sql`${categories.id} != ${id}`).limit(1).then(r => r[0]);
        targetCatId = fallbackCat ? fallbackCat.id : null;
      }

      if (targetCatId) {
        await db.update(products).set({ categoryId: targetCatId }).where(eq(products.categoryId, id));
      }
    }

    await db.delete(categories).where(eq(categories.id, id));
    return { success: true, reassignedCount: prods.length };
  }

  async applyMasterAttributeToProducts(attributeId: number, target: { productIds?: number[]; categoryId?: number }) {
    return await db.transaction(async (tx) => {
      let targetProductIds: number[] = [];
      if (target.productIds && target.productIds.length > 0) {
        targetProductIds = target.productIds;
      } else if (target.categoryId) {
        const prods = await tx.select({ id: products.id }).from(products).where(eq(products.categoryId, target.categoryId));
        targetProductIds = prods.map(p => p.id);
      } else {
        // Todos los productos
        const prods = await tx.select({ id: products.id }).from(products);
        targetProductIds = prods.map(p => p.id);
      }

      const masterVals = await tx.select().from(attributeValues).where(eq(attributeValues.attributeId, attributeId));

      let updatedCount = 0;
      for (const prodId of targetProductIds) {
        // Check if already has this attribute
        let prodAttr = await tx.select().from(productAttributes).where(
          and(eq(productAttributes.productId, prodId), eq(productAttributes.attributeId, attributeId))
        ).then(res => res[0]);

        if (!prodAttr) {
          prodAttr = await tx.insert(productAttributes).values({
            productId: prodId,
            attributeId: attributeId,
          }).returning().then(res => res[0]);
        }

        // Check values
        for (const mv of masterVals) {
          const extra = (mv.extraData as any) || {};
          const existingVal = await tx.select().from(productAttributeValues).where(
            and(eq(productAttributeValues.productAttributeId, prodAttr.id), eq(productAttributeValues.attributeValueId, mv.id))
          ).then(res => res[0]);

          if (!existingVal) {
            await tx.insert(productAttributeValues).values({
              productAttributeId: prodAttr.id,
              attributeValueId: mv.id,
              priceModifier: String(extra.defaultPrice || 0),
              weightModifier: String(extra.defaultWeight || 0),
              daysModifier: Number(extra.defaultDays || 0),
            });
          }
        }
        updatedCount++;
      }

      return { success: true, count: updatedCount };
    });
  }

  async applyQuantityTiersToProducts(tiers: { quantity: number; price: number; label?: string }[], target: { productIds?: number[]; categoryId?: number }) {
    return await db.transaction(async (tx) => {
      let targetProductIds: number[] = [];
      if (target.productIds && target.productIds.length > 0) {
        targetProductIds = target.productIds;
      } else if (target.categoryId) {
        const prods = await tx.select({ id: products.id }).from(products).where(eq(products.categoryId, target.categoryId));
        targetProductIds = prods.map(p => p.id);
      }

      let updatedCount = 0;
      for (const prodId of targetProductIds) {
        const prod = await tx.select().from(products).where(eq(products.id, prodId)).then(r => r[0]);
        if (!prod) continue;

        const currentExtra = (prod.extraConfig as any) || {};
        currentExtra.quantityTiers = tiers;

        await tx.update(products).set({
          pricingMode: 'tiered_fixed',
          extraConfig: currentExtra,
          minQuantity: tiers.length > 0 ? tiers[0].quantity : prod.minQuantity,
          basePrice: tiers.length > 0 ? String(tiers[0].price) : prod.basePrice,
          baseQuantity: tiers.length > 0 ? tiers[0].quantity : prod.baseQuantity,
        }).where(eq(products.id, prodId));

        // Update pricing rules
        await tx.delete(pricingRules).where(eq(pricingRules.productId, prodId));
        for (const t of tiers) {
          await tx.insert(pricingRules).values({
            productId: prodId,
            minQty: t.quantity,
            maxQty: t.quantity,
            fixedPrice: String(t.price),
            discountPercentage: '0',
          });
        }

        updatedCount++;
      }

      return { success: true, count: updatedCount };
    });
  }
}

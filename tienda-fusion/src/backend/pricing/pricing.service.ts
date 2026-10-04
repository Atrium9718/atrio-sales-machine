import { Injectable, NotFoundException, BadRequestException, OnModuleInit } from '@nestjs/common';
import { db } from '../../db';
import { products, productAttributeValues, productAttributes, attributeValues, attributes, pricingRules, lithoCostParameters } from '../../db/schema';
import { eq, inArray, and, lte, gte, desc } from 'drizzle-orm';
import { DEFAULT_LITHO_PARAMETERS, LithoCostParameter } from './pricing.config';

@Injectable()
export class PricingEngineService implements OnModuleInit {
  // In-memory cache for dynamic cost parameters fallback/speed
  private paramCache: Map<string, number> = new Map();

  async onModuleInit() {
    await this.initDefaultParameters();
  }

  /**
   * Initializes or loads default parameter entries into the database if empty
   */
  async initDefaultParameters() {
    try {
      const existing = await db.select().from(lithoCostParameters);
      if (existing.length === 0) {
        // Seed default parameters
        for (const param of DEFAULT_LITHO_PARAMETERS) {
          await db.insert(lithoCostParameters).values({
            category: param.category,
            code: param.code,
            name: param.name,
            description: param.description,
            unitType: param.unitType,
            costValue: param.costValue.toString(),
            active: true,
          }).onConflictDoNothing();
        }
      }

      // Populate local cache
      const all = await db.select().from(lithoCostParameters);
      for (const item of all) {
        this.paramCache.set(item.code, Number(item.costValue));
      }
    } catch (e) {
      console.warn('Could not initialize DB cost parameters, using fallback defaults:', e);
      for (const param of DEFAULT_LITHO_PARAMETERS) {
        this.paramCache.set(param.code, param.costValue);
      }
    }
  }

  async getAllParameters() {
    try {
      const dbParams = await db.select().from(lithoCostParameters);
      if (dbParams.length === 0) {
        await this.initDefaultParameters();
        return await db.select().from(lithoCostParameters);
      }
      return dbParams;
    } catch (error) {
      // Fallback
      return DEFAULT_LITHO_PARAMETERS.map((p, idx) => ({
        id: idx + 1,
        ...p,
        costValue: p.costValue.toString(),
        active: true,
        updatedAt: new Date(),
      }));
    }
  }

  async updateParameter(code: string, costValue: number, active?: boolean) {
    try {
      await db.update(lithoCostParameters)
        .set({
          costValue: costValue.toString(),
          ...(active !== undefined ? { active } : {}),
          updatedAt: new Date(),
        })
        .where(eq(lithoCostParameters.code, code));
      
      this.paramCache.set(code, costValue);
      return { success: true, code, costValue };
    } catch (error) {
      this.paramCache.set(code, costValue);
      return { success: true, code, costValue, fallback: true };
    }
  }

  async bulkUpdateParameters(params: { code: string; costValue: number; active?: boolean }[]) {
    const results = [];
    for (const p of params) {
      const res = await this.updateParameter(p.code, p.costValue, p.active);
      results.push(res);
    }
    return { success: true, count: results.length };
  }

  async resetDefaultParameters() {
    for (const param of DEFAULT_LITHO_PARAMETERS) {
      await this.updateParameter(param.code, param.costValue, true);
    }
    return { success: true, message: 'Parámetros restablecidos a valores de fábrica' };
  }

  private getParam(code: string, defaultValue: number): number {
    if (this.paramCache.has(code)) {
      return this.paramCache.get(code)!;
    }
    const match = DEFAULT_LITHO_PARAMETERS.find(p => p.code === code);
    return match ? match.costValue : defaultValue;
  }

  private getProductPackSize(product: any): number {
    const slug = (product.slug || '').toLowerCase();
    const name = (product.name || '').toLowerCase();
    const cat = (product.category || '').toLowerCase();

    // Gran formato / Pendones / Banners / Avisos (Venta individual)
    if (
      slug.includes('pendon') || 
      slug.includes('roll-up') || 
      slug.includes('rollup') || 
      slug.includes('banner') || 
      slug.includes('vinilo') || 
      slug.includes('aviso') ||
      name.includes('pendón') || 
      name.includes('banner') || 
      name.includes('roll-up') || 
      name.includes('aviso') ||
      cat.includes('gran formato') || 
      cat.includes('gran-formato') || 
      cat.includes('banners')
    ) {
      return 1;
    }

    // Carpetas corporativas, Cajas de empaque (Paquetes de 100)
    if (
      slug.includes('carpeta') || 
      slug.includes('caja') || 
      slug.includes('empaque') ||
      name.includes('carpeta') || 
      name.includes('caja') || 
      cat.includes('empaque') || 
      cat.includes('cajas')
    ) {
      return 100;
    }

    // Litografía comercial estándar: Tarjetas, Volantes, Etiquetas, Separadores (Base 1.000 unid / Millar)
    return 1000;
  }

  async calculateQuote(productId: number, quantity: number, selectedAttributeValueIds: number[]) {
    if (quantity <= 0) {
      throw new BadRequestException('La cantidad debe ser mayor a cero');
    }

    try {
      // 1. Obtener el producto y su precio base
      const productResults = await db.select().from(products).where(eq(products.id, productId));
      const product = productResults[0];

      if (!product) {
        throw new NotFoundException(`Producto con ID ${productId} no encontrado`);
      }

      const basePrice = Number(product.basePrice);
      const baseQuantity = Math.max(1, Number(product.baseQuantity) || 1);
      const minQuantity = Math.max(1, Number(product.minQuantity) || 1);
      const setupFee = Number(product.setupFee) || 0;
      const extra = (product.extraConfig as any) || {};
      const quantityTiers: { quantity: number; price: number; label?: string }[] = extra.quantityTiers || [];
      
      let totalAttributePriceModifier = 0;
      let totalWeightModifier = 0;
      let totalLeadTimeDays = 0;
      
      const appliedModifiers = [];

      // 2. Obtener y sumar los modificadores de los atributos
      if (selectedAttributeValueIds && selectedAttributeValueIds.length > 0) {
        const pavResults = await db.select({
          attributeValueId: productAttributeValues.attributeValueId,
          priceModifier: productAttributeValues.priceModifier,
          weightModifier: productAttributeValues.weightModifier,
          daysModifier: productAttributeValues.daysModifier,
          attributeName: attributes.name,
          valueLabel: attributeValues.label,
          value: attributeValues.value,
          valueCode: attributeValues.valueCode,
        })
        .from(productAttributeValues)
        .innerJoin(productAttributes, eq(productAttributeValues.productAttributeId, productAttributes.id))
        .innerJoin(attributeValues, eq(productAttributeValues.attributeValueId, attributeValues.id))
        .innerJoin(attributes, eq(attributeValues.attributeId, attributes.id))
        .where(and(
          eq(productAttributes.productId, productId),
          inArray(productAttributeValues.attributeValueId, selectedAttributeValueIds)
        ));

        const foundIds = pavResults.map(p => p.attributeValueId);
        const missingIds = selectedAttributeValueIds.filter(id => !foundIds.includes(id));
        
        if (missingIds.length > 0) {
          throw new BadRequestException(
            `Los siguientes valores de atributo no están disponibles para este producto: ${missingIds.join(', ')}`
          );
        }

        for (const pav of pavResults) {
          const priceMod = Number(pav.priceModifier);
          const weightMod = Number(pav.weightModifier);
          const daysMod = pav.daysModifier;

          totalAttributePriceModifier += priceMod;
          totalWeightModifier += weightMod;
          totalLeadTimeDays += daysMod;

          appliedModifiers.push({
            attribute_name: pav.attributeName,
            value_label: pav.valueLabel || pav.value || pav.valueCode || 'Opción',
            price_modifier: priceMod,
            unit_price_modifier: priceMod / baseQuantity,
            weight_modifier_grams: weightMod,
            lead_time_modifier_days: daysMod,
          });
        }
      }

      // 3. Determinar el costo base (Escala de Precios Fijos por Cantidad vs Prorrateo Tradicional)
      let baseSubtotal = 0;
      let matchedTier: { quantity: number; price: number } | null = null;

      // Verificar si hay coincidencia exacta o por escala fija
      if (quantityTiers.length > 0) {
        const exactTier = quantityTiers.find(t => Number(t.quantity) === quantity);
        if (exactTier) {
          matchedTier = exactTier;
          baseSubtotal = Number(exactTier.price);
        } else {
          // Si no es coincidencia exacta, buscar la escala más cercana
          const sortedTiers = [...quantityTiers].sort((a, b) => a.quantity - b.quantity);
          const lowerTier = sortedTiers.filter(t => t.quantity <= quantity).pop();
          const upperTier = sortedTiers.find(t => t.quantity > quantity);

          if (lowerTier && !upperTier) {
            // Mayor que el tier superior: usar costo unitario del tier superior
            const unitRate = lowerTier.price / lowerTier.quantity;
            baseSubtotal = unitRate * quantity;
          } else if (lowerTier && upperTier) {
            // Entre dos tiers: interpolación lineal proporcional
            const ratio = (quantity - lowerTier.quantity) / (upperTier.quantity - lowerTier.quantity);
            baseSubtotal = lowerTier.price + (ratio * (upperTier.price - lowerTier.price));
          } else {
            // Menor que el primer tier: calcular con la tasa del primer tier
            const firstTier = sortedTiers[0];
            const unitRate = firstTier.price / firstTier.quantity;
            baseSubtotal = unitRate * quantity;
          }
        }
      } else {
        // Modo estándar prorrateado
        const unitBasePrice = basePrice / baseQuantity;
        baseSubtotal = setupFee + (unitBasePrice * quantity);
      }

      // Modificadores de acabados/atributos prorrateados por cantidad
      const unitAttributeModifier = totalAttributePriceModifier / baseQuantity;
      const attributesCost = unitAttributeModifier * quantity;
      let subtotalNet = baseSubtotal + attributesCost;

      // 4. Consultar reglas de descuento por volumen (pricing_rules) si no es tier fijo con precio cerrado
      let appliedDiscountPercentage = 0;
      let discountAmount = 0;

      if (!matchedTier) {
        const rules = await db.select().from(pricingRules).where(and(
          lte(pricingRules.minQty, quantity),
          gte(pricingRules.maxQty, quantity)
        )).orderBy(desc(pricingRules.discountPercentage)).limit(1);
        const pricingRule = rules[0];

        if (pricingRule && Number(pricingRule.discountPercentage) > 0) {
          appliedDiscountPercentage = Number(pricingRule.discountPercentage);
          discountAmount = subtotalNet * (appliedDiscountPercentage / 100);
          subtotalNet = subtotalNet - discountAmount;
        }
      }

      // 5. Calcular el IVA
      const ivaRatePct = this.getParam('iva_rate_colombia', 19);
      const ivaCop = subtotalNet * (ivaRatePct / 100);
      const totalCop = subtotalNet + ivaCop;

      // 6. Retornar objeto estructurado exacto
      return {
        subtotal_neto: Math.round(subtotalNet * 100) / 100,
        iva_cop: Math.round(ivaCop * 100) / 100,
        total_cop: Math.round(totalCop * 100) / 100,
        production_lead_time_days: totalLeadTimeDays,
        weight_total_grams: (totalWeightModifier / baseQuantity) * quantity,
        desglose: {
          base_price: basePrice,
          base_quantity: baseQuantity,
          setup_fee: setupFee,
          min_quantity: minQuantity,
          unit_price: subtotalNet / quantity,
          quantity: quantity,
          is_tiered_pricing: Boolean(matchedTier || quantityTiers.length > 0),
          tier_applied: matchedTier,
          unit_price_before_discount: (baseSubtotal + attributesCost) / quantity,
          discount_applied: {
            percentage: appliedDiscountPercentage,
            amount_saved: Math.round(discountAmount * 100) / 100,
          },
          applied_modifiers: appliedModifiers,
        }
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new Error('Error de base de datos al calcular la cotización', { cause: error });
    }
  }

  async calculateBookQuote(payload: {
    quantity: number;
    pages: number;
    format: string;
    customWidthMm?: number;
    customHeightMm?: number;
    innerPaper: string;
    innerInks: string;
    coverPaper: string;
    coverInks: string;
    coverFinish: string;
    specialFinishes?: string[];
    bindingType: string;
    flaps: string;
    editorialServices?: {
      maquetacion?: boolean;
      disenoPortada?: boolean;
      correccionEstilo?: boolean;
      transcripcion?: boolean;
      transcripcionPages?: number;
      traduccion?: boolean;
      traduccionLanguage?: string;
    };
  }) {
    const {
      quantity = 100,
      pages = 96,
      format = 'media_carta',
      innerPaper = 'bond_75',
      innerInks = '1x1',
      coverPaper = 'propalcote_300',
      coverInks = '4x0',
      coverFinish = 'mate',
      specialFinishes = [],
      bindingType = 'rustica_cosida',
      flaps = 'sin_solapa',
      editorialServices = {}
    } = payload;

    if (quantity <= 0) throw new BadRequestException('La cantidad debe ser mayor a 0');
    if (pages <= 4) throw new BadRequestException('El libro debe tener al menos 8 páginas');

    // 1. Dimensions (Ancho x Alto en cm)
    let widthCm = 14;
    let heightCm = 21.5;
    if (format === 'carta') { widthCm = 21.5; heightCm = 28; }
    else if (format === 'bolsillo') { widthCm = 12.5; heightCm = 19; }
    else if (format === 'a5') { widthCm = 14.8; heightCm = 21; }
    else if (format === 'a4') { widthCm = 21; heightCm = 29.7; }
    else if (format === 'cuadrado') { widthCm = 20; heightCm = 20; }
    else if (format === 'personalizado' && payload.customWidthMm && payload.customHeightMm) {
      widthCm = payload.customWidthMm / 10;
      heightCm = payload.customHeightMm / 10;
    }

    // 2. Spine calculation (Lomo en mm)
    const paperCalipers: Record<string, number> = {
      'bond_75': 0.100,
      'bond_90': 0.118,
      'propalcote_115': 0.095,
      'propalcote_150': 0.125,
      'earth_pact_75': 0.105,
    };
    const paperGrammages: Record<string, number> = {
      'bond_75': 75,
      'bond_90': 90,
      'propalcote_115': 115,
      'propalcote_150': 150,
      'earth_pact_75': 75,
    };

    const caliperPerSheet = paperCalipers[innerPaper] || 0.100;
    const sheetsCount = Math.ceil(pages / 2);
    let rawSpineMm = sheetsCount * caliperPerSheet;
    
    // Add cover extra thickness
    let coverExtraMm = 0.5;
    if (bindingType === 'tapa_dura') {
      coverExtraMm = 4.0;
    }
    const spineMm = Math.max(2.0, Math.round((rawSpineMm + coverExtraMm) * 10) / 10);

    // 3. Imposition & Signatures (Pliegos litográficos)
    const pagesPerSignature = (widthCm <= 15 && heightCm <= 22) ? 16 : 8;
    const signaturesCount = Math.ceil(pages / pagesPerSignature);

    // Dynamic Parameter Fetching
    const ctpPlateCost = this.getParam('ctp_plate_cost', 18000);
    const ctpPlatesPerSignature = innerInks === '4x4' ? 8 : (innerInks === '2x2' ? 4 : 2);
    const setupPerSignature = innerInks === '4x4' 
      ? this.getParam('setup_signature_4x4', 65000) 
      : this.getParam('setup_signature_1x1', 35000);
    
    const totalInnerPrepCost = signaturesCount * (ctpPlatesPerSignature * ctpPlateCost + setupPerSignature);

    // Inner Paper & Press Run
    const paperKgRate = this.getParam('paper_kg_rate', 8500);
    const innerPaperAreaM2 = (widthCm / 100) * (heightCm / 100) * sheetsCount * 2;
    const innerWeightGramsPerBook = innerPaperAreaM2 * (paperGrammages[innerPaper] || 75);
    const innerPaperCostPerBook = (innerWeightGramsPerBook / 1000) * paperKgRate;
    
    const runSignatureCost = innerInks === '4x4' 
      ? this.getParam('run_signature_4x4', 140) 
      : this.getParam('run_signature_1x1', 55);
    const innerPressPrintCostPerBook = signaturesCount * runSignatureCost;

    // Cover Preparation & Run
    const coverPlatesCount = coverInks === '4x4' ? 8 : 4;
    const coverFixedSetup = this.getParam('ctp_fixed_setup_cover', 45000);
    const coverPrepCost = (coverPlatesCount * ctpPlateCost) + coverFixedSetup;
    
    let coverPaperCostPerBook = this.getParam('cover_propalcote_240', 450);
    if (coverPaper === 'propalcote_300') coverPaperCostPerBook = this.getParam('cover_propalcote_300', 580);
    if (coverPaper === 'maule_c12') coverPaperCostPerBook = this.getParam('cover_maule_c12', 720);
    if (coverPaper === 'tapa_dura' || bindingType === 'tapa_dura') {
      coverPaperCostPerBook = this.getParam('cover_tapa_dura_board', 2800);
    }

    // Flaps
    if (flaps === 'solapa_7cm') coverPaperCostPerBook += this.getParam('flap_7cm_extra', 180);
    if (flaps === 'solapa_9cm') coverPaperCostPerBook += this.getParam('flap_9cm_extra', 240);

    // Cover Laminate Finish
    let laminateCostPerBook = 0;
    if (coverFinish === 'mate') laminateCostPerBook = this.getParam('laminate_mate', 180);
    if (coverFinish === 'brillo') laminateCostPerBook = this.getParam('laminate_brillo', 150);
    if (coverFinish === 'soft_touch') laminateCostPerBook = this.getParam('laminate_soft_touch', 390);

    // Special Finishes
    let specialFinishesFixed = 0;
    let specialFinishesPerBook = 0;
    if (specialFinishes.includes('reserva_uv')) {
      specialFinishesFixed += this.getParam('uv_spot_fixed', 45000);
      specialFinishesPerBook += this.getParam('uv_spot_run', 160);
    }
    if (specialFinishes.includes('foil_dorado') || specialFinishes.includes('foil_plateado')) {
      specialFinishesFixed += this.getParam('foil_stamp_fixed', 75000);
      specialFinishesPerBook += this.getParam('foil_stamp_run', 250);
    }
    if (specialFinishes.includes('repujado')) {
      specialFinishesFixed += this.getParam('emboss_fixed', 60000);
      specialFinishesPerBook += this.getParam('emboss_run', 140);
    }

    // Binding Cost
    let bindingCostPerBook = this.getParam('bind_rustica_cosida_unit', 1200);
    let bindingSetup = this.getParam('bind_rustica_cosida_setup', 35000);
    
    if (bindingType === 'rustica_pur') {
      bindingCostPerBook = this.getParam('bind_rustica_pur_unit', 950);
      bindingSetup = this.getParam('bind_rustica_pur_setup', 25000);
    } else if (bindingType === 'tapa_dura') {
      bindingCostPerBook = this.getParam('bind_tapa_dura_unit', 4500);
      bindingSetup = this.getParam('bind_tapa_dura_setup', 70000);
    } else if (bindingType === 'grapado') {
      bindingCostPerBook = this.getParam('bind_grapado_unit', 380);
      bindingSetup = this.getParam('bind_grapado_setup', 15000);
    } else if (bindingType === 'anillado') {
      bindingCostPerBook = this.getParam('bind_anillado_unit', 1100);
      bindingSetup = this.getParam('bind_anillado_setup', 20000);
    }

    // Total fixed setups
    const totalFixedCosts = totalInnerPrepCost + coverPrepCost + specialFinishesFixed + bindingSetup;
    // Total variable per book
    const variableCostPerBook = 
      innerPaperCostPerBook + 
      innerPressPrintCostPerBook + 
      coverPaperCostPerBook + 
      laminateCostPerBook + 
      specialFinishesPerBook + 
      bindingCostPerBook;

    // Gross industrial margin factor
    const marginPercent = this.getParam('litho_margin_factor', 35);
    const marginFactor = 1 + (marginPercent / 100);
    const productionCost = totalFixedCosts + (variableCostPerBook * quantity);
    let subtotalImpresionNeto = Math.round(productionCost * marginFactor);

    // Editorial Pre-press & Professional Services
    let editorialServicesCost = 0;
    const editorialBreakdown: { service: string; cost: number }[] = [];
    let editorialLeadTimeDays = 0;

    // 1. Maquetación Editorial
    if (editorialServices.maquetacion) {
      const maquetacionUnitRate = pages > 200 
        ? this.getParam('service_maquetacion_bulk_rate', 5500) 
        : this.getParam('service_maquetacion_rate', 7000);
      const maquetacionTotal = Math.max(150000, pages * maquetacionUnitRate);
      editorialServicesCost += maquetacionTotal;
      editorialLeadTimeDays = Math.max(editorialLeadTimeDays, 4);
      editorialBreakdown.push({
        service: `Maquetación & Diagramación Editorial (${pages} págs)`,
        cost: maquetacionTotal
      });
    }

    // 2. Diseño de Portada Profesional
    if (editorialServices.disenoPortada) {
      const disenoPortadaTotal = this.getParam('service_cover_design', 220000);
      editorialServicesCost += disenoPortadaTotal;
      editorialLeadTimeDays = Math.max(editorialLeadTimeDays, 3);
      editorialBreakdown.push({
        service: 'Diseño Gráfico Profesional de Portada, Lomo y Solapas',
        cost: disenoPortadaTotal
      });
    }

    // 3. Corrección de Estilo
    if (editorialServices.correccionEstilo) {
      const correccionUnitRate = this.getParam('service_correccion_estilo_rate', 6000);
      const correccionTotal = Math.max(120000, pages * correccionUnitRate);
      editorialServicesCost += correccionTotal;
      editorialLeadTimeDays = Math.max(editorialLeadTimeDays, 4);
      editorialBreakdown.push({
        service: `Corrección de Estilo & Ortotipográfica (${pages} págs)`,
        cost: correccionTotal
      });
    }

    // 4. Transcripción de Audio / Manuscrito
    if (editorialServices.transcripcion) {
      const transPages = editorialServices.transcripcionPages || Math.min(pages, 50);
      const transRate = this.getParam('service_transcripcion_rate', 9500);
      const transcripcionTotal = transPages * transRate;
      editorialServicesCost += transcripcionTotal;
      editorialLeadTimeDays = Math.max(editorialLeadTimeDays, 4);
      editorialBreakdown.push({
        service: `Transcripción de Contenido (${transPages} págs)`,
        cost: transcripcionTotal
      });
    }

    // 5. Traducción Profesional
    if (editorialServices.traduccion) {
      const targetLang = editorialServices.traduccionLanguage || 'Inglés';
      const traduccionUnitRate = this.getParam('service_traduccion_rate', 18000);
      const traduccionTotal = Math.max(180000, pages * traduccionUnitRate);
      editorialServicesCost += traduccionTotal;
      editorialLeadTimeDays = Math.max(editorialLeadTimeDays, 6);
      editorialBreakdown.push({
        service: `Traducción Profesional Certificada (${targetLang})`,
        cost: traduccionTotal
      });
    }

    // Quantity Volume Tier Discount (Aplica sobre el costo de impresión física)
    let discountPct = 0;
    if (quantity >= 100 && quantity < 250) discountPct = 0.06;
    else if (quantity >= 250 && quantity < 500) discountPct = 0.12;
    else if (quantity >= 500 && quantity < 1000) discountPct = 0.18;
    else if (quantity >= 1000 && quantity < 2500) discountPct = 0.25;
    else if (quantity >= 2500) discountPct = 0.32;

    const discountAmount = Math.round(subtotalImpresionNeto * discountPct);
    const subtotalImpresionDescuento = subtotalImpresionNeto - discountAmount;
    
    // Subtotal final = Impresión con descuento + Servicios editoriales
    const finalSubtotal = subtotalImpresionDescuento + editorialServicesCost;
    const ivaRate = this.getParam('iva_rate_colombia', 19);
    const ivaCop = Math.round(finalSubtotal * (ivaRate / 100));
    const totalCop = finalSubtotal + ivaCop;

    // Weight and lead time
    const singleBookWeightGrams = Math.round(innerWeightGramsPerBook + (bindingType === 'tapa_dura' ? 220 : 60));
    const totalWeightKg = Math.round((singleBookWeightGrams * quantity) / 100) / 10;

    let leadTimeDays = 5;
    if (bindingType === 'tapa_dura' || specialFinishes.length > 0) leadTimeDays = 8;
    if (quantity > 1000) leadTimeDays += 3;
    leadTimeDays += editorialLeadTimeDays;

    // Total open cover width
    let flapWidthCm = 0;
    if (flaps === 'solapa_7cm') flapWidthCm = 7;
    if (flaps === 'solapa_9cm') flapWidthCm = 9;
    const spineCm = spineMm / 10;
    const openCoverWidthCm = Math.round(((flapWidthCm * 2) + (widthCm * 2) + spineCm) * 10) / 10;
    const openCoverHeightCm = heightCm;

    return {
      subtotal_neto: finalSubtotal,
      subtotal_impresion: subtotalImpresionDescuento,
      subtotal_editorial: editorialServicesCost,
      editorial_breakdown: editorialBreakdown,
      iva_cop: ivaCop,
      total_cop: totalCop,
      unit_price_neto: Math.round(finalSubtotal / quantity),
      unit_price_total: Math.round(totalCop / quantity),
      discount_applied: {
        percentage: discountPct * 100,
        amount_saved: discountAmount,
      },
      specs_technical: {
        pages,
        quantity,
        format_name: format,
        closed_dimensions: `${widthCm} x ${heightCm} cm`,
        spine_thickness_mm: spineMm,
        open_cover_dimensions: `${openCoverWidthCm} x ${openCoverHeightCm} cm`,
        flaps_width_cm: flapWidthCm,
        signatures_count: signaturesCount,
        single_book_weight_grams: singleBookWeightGrams,
        total_weight_kg: totalWeightKg,
        production_lead_time_days: leadTimeDays,
      }
    };
  }
}

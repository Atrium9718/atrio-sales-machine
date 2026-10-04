import { db } from './index';
import {
  categories,
  products,
  attributes,
  attributeValues,
  productAttributes,
  productAttributeValues,
  pricingRules,
  homeBanners,
  designTemplates,
} from './schema';

async function seed() {
  console.log('🌱 Starting comprehensive database seed for Fusión W2P...');

  try {
    // 0. Clean old records in reverse relational order
    await db.delete(productAttributeValues);
    await db.delete(productAttributes);
    await db.delete(attributeValues);
    await db.delete(attributes);
    await db.delete(products);
    await db.delete(categories);
    await db.delete(pricingRules);
    await db.delete(homeBanners);
    await db.delete(designTemplates);

    // 1. Insert Categories
    const catList = await db
      .insert(categories)
      .values([
        {
          name: 'Papelería Comercial',
          slug: 'papeleria-comercial',
          displayOrder: 1,
          active: true,
        },
        {
          name: 'Publicidad & Volantes',
          slug: 'publicidad-volantes',
          displayOrder: 2,
          active: true,
        },
        {
          name: 'Gran Formato & Banners',
          slug: 'gran-formato',
          displayOrder: 3,
          active: true,
        },
        {
          name: 'Etiquetas & Adhesivos',
          slug: 'etiquetas-adhesivos',
          displayOrder: 4,
          active: true,
        },
        {
          name: 'Empaques & Cajas',
          slug: 'empaques-cajas',
          displayOrder: 5,
          active: true,
        },
        {
          name: 'Editorial & Merchandising',
          slug: 'editorial-merchandising',
          displayOrder: 6,
          active: true,
        },
      ])
      .returning();

    const catPapeleria = catList.find((c) => c.slug === 'papeleria-comercial')!.id;
    const catVolantes = catList.find((c) => c.slug === 'publicidad-volantes')!.id;
    const catGranFormato = catList.find((c) => c.slug === 'gran-formato')!.id;
    const catEtiquetas = catList.find((c) => c.slug === 'etiquetas-adhesivos')!.id;
    const catEmpaques = catList.find((c) => c.slug === 'empaques-cajas')!.id;
    const catEditorial = catList.find((c) => c.slug === 'editorial-merchandising')!.id;

    // 2. Insert Global Attributes
    // A) Tamaño
    const [attrSize] = await db
      .insert(attributes)
      .values({
        name: 'Tamaño / Formato',
        code: 'TAMANO',
        controlType: 'SELECT',
        attributeGroup: 'Especificaciones',
      })
      .returning();

    // B) Material / Papel
    const [attrMaterial] = await db
      .insert(attributes)
      .values({
        name: 'Material / Sustrato',
        code: 'MATERIAL',
        controlType: 'RADIO',
        attributeGroup: 'Sustrato',
      })
      .returning();

    // C) Acabado
    const [attrFinish] = await db
      .insert(attributes)
      .values({
        name: 'Acabado & Protección',
        code: 'ACABADO',
        controlType: 'RADIO',
        attributeGroup: 'Terminación',
      })
      .returning();

    // D) Tintas
    const [attrInks] = await db
      .insert(attributes)
      .values({
        name: 'Tintas de Impresión',
        code: 'TINTAS',
        controlType: 'RADIO',
        attributeGroup: 'Impresión',
      })
      .returning();

    // E) Troquel / Corte
    const [attrCut] = await db
      .insert(attributes)
      .values({
        name: 'Corte / Esquinas',
        code: 'CORTE',
        controlType: 'RADIO',
        attributeGroup: 'Terminación',
      })
      .returning();

    // 3. Attribute Values
    // Size values
    const [vSize9x5] = await db.insert(attributeValues).values({ attributeId: attrSize.id, label: '9 x 5 cm (Estándar)', valueCode: '9X5' }).returning();
    const [vSize9x55] = await db.insert(attributeValues).values({ attributeId: attrSize.id, label: '9 x 5.5 cm (Europeo)', valueCode: '9X55' }).returning();
    const [vSizeMediaCarta] = await db.insert(attributeValues).values({ attributeId: attrSize.id, label: 'Media Carta (14 x 21.6 cm)', valueCode: 'MEDIA_CARTA' }).returning();
    const [vSizeCarta] = await db.insert(attributeValues).values({ attributeId: attrSize.id, label: 'Carta (21.6 x 27.9 cm)', valueCode: 'CARTA' }).returning();
    const [vSize80x200] = await db.insert(attributeValues).values({ attributeId: attrSize.id, label: '80 x 200 cm (Estructura Roll-Up)', valueCode: '80X200' }).returning();
    const [vSize100x200] = await db.insert(attributeValues).values({ attributeId: attrSize.id, label: '100 x 200 cm (Estructura Roll-Up)', valueCode: '100X200' }).returning();
    const [vSize7x7] = await db.insert(attributeValues).values({ attributeId: attrSize.id, label: '7 x 7 cm (Cuadrada)', valueCode: '7X7' }).returning();
    const [vSize5x5] = await db.insert(attributeValues).values({ attributeId: attrSize.id, label: '5 x 5 cm (Troquelada)', valueCode: '5X5' }).returning();
    const [vSize5x18] = await db.insert(attributeValues).values({ attributeId: attrSize.id, label: '5 x 18 cm (Separador Estándar)', valueCode: '5X18' }).returning();
    const [vSizeCarpeta] = await db.insert(attributeValues).values({ attributeId: attrSize.id, label: '22 x 30 cm (Cerrada)', valueCode: '22X30' }).returning();

    // Material values
    const [vMatPropalcote300] = await db.insert(attributeValues).values({ attributeId: attrMaterial.id, label: 'Propalcote 300g (Rígido)', valueCode: 'PROP_300' }).returning();
    const [vMatKraft300] = await db.insert(attributeValues).values({ attributeId: attrMaterial.id, label: 'Kraft Ecológico 300g', valueCode: 'KRAFT_300' }).returning();
    const [vMatOpalina250] = await db.insert(attributeValues).values({ attributeId: attrMaterial.id, label: 'Opalina Holandesa 250g', valueCode: 'OPALINA_250' }).returning();
    const [vMatPropalcote115] = await db.insert(attributeValues).values({ attributeId: attrMaterial.id, label: 'Propalcote 115g Brillante', valueCode: 'PROP_115' }).returning();
    const [vMatPropalcote150] = await db.insert(attributeValues).values({ attributeId: attrMaterial.id, label: 'Propalcote 150g Premium', valueCode: 'PROP_150' }).returning();
    const [vMatBanner13] = await db.insert(attributeValues).values({ attributeId: attrMaterial.id, label: 'Lona Banner 13 oz Mate Alta Resolución', valueCode: 'BANNER_13' }).returning();
    const [vMatViniloBlanco] = await db.insert(attributeValues).values({ attributeId: attrMaterial.id, label: 'Vinilo Adhesivo Blanco Brillante', valueCode: 'VINILO_BLANCO' }).returning();
    const [vMatViniloTrans] = await db.insert(attributeValues).values({ attributeId: attrMaterial.id, label: 'Vinilo Adhesivo Transparente', valueCode: 'VINILO_TRANS' }).returning();
    const [vMatCartulinaKimberly] = await db.insert(attributeValues).values({ attributeId: attrMaterial.id, label: 'Cartulina Kimberly 320g', valueCode: 'KIMBERLY_320' }).returning();
    const [vMatEarthPact] = await db.insert(attributeValues).values({ attributeId: attrMaterial.id, label: 'Earth Pact Ecológico 295g (Caña de Azúcar)', valueCode: 'EARTH_PACT' }).returning();

    // Finish values
    const [vFinSinPlastificar] = await db.insert(attributeValues).values({ attributeId: attrFinish.id, label: 'Sin Plastificar', valueCode: 'SIN_PLAST' }).returning();
    const [vFinPlastMate] = await db.insert(attributeValues).values({ attributeId: attrFinish.id, label: 'Plastificado Mate', valueCode: 'PLAST_MATE' }).returning();
    const [vFinPlastBrillante] = await db.insert(attributeValues).values({ attributeId: attrFinish.id, label: 'Plastificado Brillante', valueCode: 'PLAST_BRILL' }).returning();
    const [vFinReservaUV] = await db.insert(attributeValues).values({ attributeId: attrFinish.id, label: 'Plastificado Mate + Reserva UV Brillante', valueCode: 'RESERVA_UV' }).returning();
    const [vFinSoftTouch] = await db.insert(attributeValues).values({ attributeId: attrFinish.id, label: 'Plastificado Soft Touch Terciopelo', valueCode: 'SOFT_TOUCH' }).returning();
    const [vFinFoilDorado] = await db.insert(attributeValues).values({ attributeId: attrFinish.id, label: 'Estampado Foil Metalizado Dorado', valueCode: 'FOIL_ORO' }).returning();

    // Inks values
    const [vInk4x0] = await db.insert(attributeValues).values({ attributeId: attrInks.id, label: 'Full Color 4x0 (Tiro / Una Cara)', valueCode: '4X0' }).returning();
    const [vInk4x4] = await db.insert(attributeValues).values({ attributeId: attrInks.id, label: 'Full Color 4x4 (Tiro y Retiro / Dos Caras)', valueCode: '4X4' }).returning();
    const [vInk1x0] = await db.insert(attributeValues).values({ attributeId: attrInks.id, label: '1x0 Tinta Negra', valueCode: '1X0' }).returning();

    // Cut / Corners
    const [vCutRectas] = await db.insert(attributeValues).values({ attributeId: attrCut.id, label: 'Esquinas Rectas', valueCode: 'RECTAS' }).returning();
    const [vCutRedondeadas] = await db.insert(attributeValues).values({ attributeId: attrCut.id, label: 'Esquinas Redondeadas (Troqueladas)', valueCode: 'REDONDEADAS' }).returning();
    const [vCutPerforado] = await db.insert(attributeValues).values({ attributeId: attrCut.id, label: 'Con Perforación Superior', valueCode: 'PERFORADO' }).returning();

    // 4. INSERT PRODUCTS
    console.log('📦 Creating dummy products with configurable attributes...');

    // -------------------------------------------------------------
    // PRODUCT 1: Tarjetas de Presentación Estándar
    // -------------------------------------------------------------
    const [prodTarjetas] = await db
      .insert(products)
      .values({
        categoryId: catPapeleria,
        name: 'Tarjetas de Presentación Pro',
        slug: 'tarjetas-estandar',
        description: 'Impresión de alta resolución a 300 DPI en propalcote y papeles especiales con acabados prémium y sangría de corte exacta.',
        configMode: 'CONFIGURABLE',
        basePrice: '35000.00',
        imageUrl: 'https://images.unsplash.com/photo-1589041127535-ee162232fb5b?auto=format&fit=crop&w=800&q=80',
        images: [
          'https://images.unsplash.com/photo-1589041127535-ee162232fb5b?auto=format&fit=crop&w=800&q=80',
          'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=800&q=80',
          'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?auto=format&fit=crop&w=800&q=80'
        ]
      })
      .returning();

    // Link attributes to Product 1
    const [paTSize] = await db.insert(productAttributes).values({ productId: prodTarjetas.id, attributeId: attrSize.id }).returning();
    const [paTMat] = await db.insert(productAttributes).values({ productId: prodTarjetas.id, attributeId: attrMaterial.id }).returning();
    const [paTFin] = await db.insert(productAttributes).values({ productId: prodTarjetas.id, attributeId: attrFinish.id }).returning();
    const [paTInk] = await db.insert(productAttributes).values({ productId: prodTarjetas.id, attributeId: attrInks.id }).returning();
    const [paTCut] = await db.insert(productAttributes).values({ productId: prodTarjetas.id, attributeId: attrCut.id }).returning();

    await db.insert(productAttributeValues).values([
      { productAttributeId: paTSize.id, attributeValueId: vSize9x5.id, priceModifier: '0.00', daysModifier: 0 },
      { productAttributeId: paTSize.id, attributeValueId: vSize9x55.id, priceModifier: '3000.00', daysModifier: 0 },
      { productAttributeId: paTMat.id, attributeValueId: vMatPropalcote300.id, priceModifier: '0.00', daysModifier: 0 },
      { productAttributeId: paTMat.id, attributeValueId: vMatKraft300.id, priceModifier: '12000.00', daysModifier: 1 },
      { productAttributeId: paTMat.id, attributeValueId: vMatOpalina250.id, priceModifier: '15000.00', daysModifier: 1 },
      { productAttributeId: paTFin.id, attributeValueId: vFinPlastMate.id, priceModifier: '8000.00', daysModifier: 1 },
      { productAttributeId: paTFin.id, attributeValueId: vFinPlastBrillante.id, priceModifier: '6000.00', daysModifier: 1 },
      { productAttributeId: paTFin.id, attributeValueId: vFinReservaUV.id, priceModifier: '28000.00', daysModifier: 2 },
      { productAttributeId: paTFin.id, attributeValueId: vFinSinPlastificar.id, priceModifier: '0.00', daysModifier: 0 },
      { productAttributeId: paTInk.id, attributeValueId: vInk4x0.id, priceModifier: '0.00', daysModifier: 0 },
      { productAttributeId: paTInk.id, attributeValueId: vInk4x4.id, priceModifier: '14000.00', daysModifier: 0 },
      { productAttributeId: paTCut.id, attributeValueId: vCutRectas.id, priceModifier: '0.00', daysModifier: 0 },
      { productAttributeId: paTCut.id, attributeValueId: vCutRedondeadas.id, priceModifier: '7000.00', daysModifier: 1 },
    ]);

    // -------------------------------------------------------------
    // PRODUCT 2: Volantes Promocionales Media Carta
    // -------------------------------------------------------------
    const [prodVolantes] = await db
      .insert(products)
      .values({
        categoryId: catVolantes,
        name: 'Volantes Promocionales Media Carta',
        slug: 'volante-media-carta',
        description: 'Material publicitario de alto impacto en propalcote 115g o 150g. Ideal para promociones masivas, eventos e inauguraciones.',
        configMode: 'CONFIGURABLE',
        basePrice: '65000.00',
        imageUrl: 'https://images.unsplash.com/photo-1596526131083-e8c638c9c6c5?auto=format&fit=crop&w=800&q=80',
        images: [
          'https://images.unsplash.com/photo-1596526131083-e8c638c9c6c5?auto=format&fit=crop&w=800&q=80',
          'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=800&q=80',
          'https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=800&q=80'
        ]
      })
      .returning();

    const [paVSize] = await db.insert(productAttributes).values({ productId: prodVolantes.id, attributeId: attrSize.id }).returning();
    const [paVMat] = await db.insert(productAttributes).values({ productId: prodVolantes.id, attributeId: attrMaterial.id }).returning();
    const [paVInk] = await db.insert(productAttributes).values({ productId: prodVolantes.id, attributeId: attrInks.id }).returning();
    const [paVFin] = await db.insert(productAttributes).values({ productId: prodVolantes.id, attributeId: attrFinish.id }).returning();

    await db.insert(productAttributeValues).values([
      { productAttributeId: paVSize.id, attributeValueId: vSizeMediaCarta.id, priceModifier: '0.00', daysModifier: 0 },
      { productAttributeId: paVSize.id, attributeValueId: vSizeCarta.id, priceModifier: '45000.00', daysModifier: 0 },
      { productAttributeId: paVMat.id, attributeValueId: vMatPropalcote115.id, priceModifier: '0.00', daysModifier: 0 },
      { productAttributeId: paVMat.id, attributeValueId: vMatPropalcote150.id, priceModifier: '18000.00', daysModifier: 0 },
      { productAttributeId: paVInk.id, attributeValueId: vInk4x0.id, priceModifier: '0.00', daysModifier: 0 },
      { productAttributeId: paVInk.id, attributeValueId: vInk4x4.id, priceModifier: '26000.00', daysModifier: 0 },
      { productAttributeId: paVFin.id, attributeValueId: vFinSinPlastificar.id, priceModifier: '0.00', daysModifier: 0 },
      { productAttributeId: paVFin.id, attributeValueId: vFinPlastBrillante.id, priceModifier: '22000.00', daysModifier: 1 },
    ]);

    // -------------------------------------------------------------
    // PRODUCT 3: Pendón Roll-Up Corporativo
    // -------------------------------------------------------------
    const [prodPendon] = await db
      .insert(products)
      .values({
        categoryId: catGranFormato,
        name: 'Pendón Publicitario Roll-Up',
        slug: 'pendon-rollup',
        description: 'Estructura retráctil de aluminio anodizado prémium con lona banner mate de 13 oz anti-reflejo y maletín de transporte.',
        configMode: 'CONFIGURABLE',
        basePrice: '120000.00',
        imageUrl: 'https://images.unsplash.com/photo-1542744094-3a31f272c490?auto=format&fit=crop&w=800&q=80',
        images: [
          'https://images.unsplash.com/photo-1542744094-3a31f272c490?auto=format&fit=crop&w=800&q=80',
          'https://images.unsplash.com/photo-1572021335469-31706a17aaef?auto=format&fit=crop&w=800&q=80',
          'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=800&q=80'
        ]
      })
      .returning();

    const [paPSize] = await db.insert(productAttributes).values({ productId: prodPendon.id, attributeId: attrSize.id }).returning();
    const [paPMat] = await db.insert(productAttributes).values({ productId: prodPendon.id, attributeId: attrMaterial.id }).returning();

    await db.insert(productAttributeValues).values([
      { productAttributeId: paPSize.id, attributeValueId: vSize80x200.id, priceModifier: '0.00', daysModifier: 0 },
      { productAttributeId: paPSize.id, attributeValueId: vSize100x200.id, priceModifier: '35000.00', daysModifier: 0 },
      { productAttributeId: paPMat.id, attributeValueId: vMatBanner13.id, priceModifier: '0.00', daysModifier: 0 },
    ]);

    // -------------------------------------------------------------
    // PRODUCT 4: Etiquetas Adhesivas Troqueladas
    // -------------------------------------------------------------
    const [prodEtiquetas] = await db
      .insert(products)
      .values({
        categoryId: catEtiquetas,
        name: 'Etiquetas Adhesivas Troqueladas',
        slug: 'etiqueta-cuadrada',
        description: 'Stickers y adhesivos resistentes en vinilo brillante o transparente con troquel de precisión para frascos, botellas y empaques.',
        configMode: 'CONFIGURABLE',
        basePrice: '48000.00',
        imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80',
        images: [
          'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80',
          'https://images.unsplash.com/photo-1527661591475-527312dd65f5?auto=format&fit=crop&w=800&q=80',
          'https://images.unsplash.com/photo-1572021335469-31706a17aaef?auto=format&fit=crop&w=800&q=80'
        ]
      })
      .returning();

    const [paESize] = await db.insert(productAttributes).values({ productId: prodEtiquetas.id, attributeId: attrSize.id }).returning();
    const [paEMat] = await db.insert(productAttributes).values({ productId: prodEtiquetas.id, attributeId: attrMaterial.id }).returning();
    const [paEFin] = await db.insert(productAttributes).values({ productId: prodEtiquetas.id, attributeId: attrFinish.id }).returning();

    await db.insert(productAttributeValues).values([
      { productAttributeId: paESize.id, attributeValueId: vSize7x7.id, priceModifier: '0.00', daysModifier: 0 },
      { productAttributeId: paESize.id, attributeValueId: vSize5x5.id, priceModifier: '-6000.00', daysModifier: 0 },
      { productAttributeId: paEMat.id, attributeValueId: vMatViniloBlanco.id, priceModifier: '0.00', daysModifier: 0 },
      { productAttributeId: paEMat.id, attributeValueId: vMatViniloTrans.id, priceModifier: '12000.00', daysModifier: 1 },
      { productAttributeId: paEFin.id, attributeValueId: vFinSinPlastificar.id, priceModifier: '0.00', daysModifier: 0 },
      { productAttributeId: paEFin.id, attributeValueId: vFinPlastMate.id, priceModifier: '9000.00', daysModifier: 0 },
      { productAttributeId: paEFin.id, attributeValueId: vFinPlastBrillante.id, priceModifier: '9000.00', daysModifier: 0 },
    ]);

    // -------------------------------------------------------------
    // PRODUCT 5: Separador de Libros Personalizado
    // -------------------------------------------------------------
    const [prodSeparador] = await db
      .insert(products)
      .values({
        categoryId: catEditorial,
        name: 'Separador de Libros Personalizado',
        slug: 'separador',
        description: 'Marcalibros coleccionables en propalcote grueso con plastificado suave y detalles impresos full color por ambas caras.',
        configMode: 'CONFIGURABLE',
        basePrice: '38000.00',
        imageUrl: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80',
        images: [
          'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80',
          'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=800&q=80',
          'https://images.unsplash.com/photo-1531346878377-a5be20888e57?auto=format&fit=crop&w=800&q=80'
        ]
      })
      .returning();

    const [paSSize] = await db.insert(productAttributes).values({ productId: prodSeparador.id, attributeId: attrSize.id }).returning();
    const [paSMat] = await db.insert(productAttributes).values({ productId: prodSeparador.id, attributeId: attrMaterial.id }).returning();
    const [paSFin] = await db.insert(productAttributes).values({ productId: prodSeparador.id, attributeId: attrFinish.id }).returning();
    const [paSInk] = await db.insert(productAttributes).values({ productId: prodSeparador.id, attributeId: attrInks.id }).returning();
    const [paSCut] = await db.insert(productAttributes).values({ productId: prodSeparador.id, attributeId: attrCut.id }).returning();

    await db.insert(productAttributeValues).values([
      { productAttributeId: paSSize.id, attributeValueId: vSize5x18.id, priceModifier: '0.00', daysModifier: 0 },
      { productAttributeId: paSMat.id, attributeValueId: vMatPropalcote300.id, priceModifier: '0.00', daysModifier: 0 },
      { productAttributeId: paSMat.id, attributeValueId: vMatKraft300.id, priceModifier: '8000.00', daysModifier: 0 },
      { productAttributeId: paSFin.id, attributeValueId: vFinPlastMate.id, priceModifier: '6000.00', daysModifier: 0 },
      { productAttributeId: paSFin.id, attributeValueId: vFinSoftTouch.id, priceModifier: '18000.00', daysModifier: 1 },
      { productAttributeId: paSInk.id, attributeValueId: vInk4x4.id, priceModifier: '10000.00', daysModifier: 0 },
      { productAttributeId: paSCut.id, attributeValueId: vCutRectas.id, priceModifier: '0.00', daysModifier: 0 },
      { productAttributeId: paSCut.id, attributeValueId: vCutPerforado.id, priceModifier: '4000.00', daysModifier: 0 },
    ]);

    // -------------------------------------------------------------
    // PRODUCT 6: Cajas Plegadizas Personalizadas
    // -------------------------------------------------------------
    const [prodCajas] = await db
      .insert(products)
      .values({
        categoryId: catEmpaques,
        name: 'Cajas Personalizadas Premium',
        slug: 'cajas-personalizadas',
        description: 'Empaques de alta gama para productos, joyería y cosmética en cartulinas prémium con acabados de lujo y foil metalizado.',
        configMode: 'CONFIGURABLE',
        basePrice: '95000.00',
        imageUrl: 'https://images.unsplash.com/photo-1600868779951-872f7c006b0d?auto=format&fit=crop&w=800&q=80',
        images: [
          'https://images.unsplash.com/photo-1600868779951-872f7c006b0d?auto=format&fit=crop&w=800&q=80',
          'https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&w=800&q=80',
          'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&w=800&q=80'
        ]
      })
      .returning();

    const [paCMat] = await db.insert(productAttributes).values({ productId: prodCajas.id, attributeId: attrMaterial.id }).returning();
    const [paCFin] = await db.insert(productAttributes).values({ productId: prodCajas.id, attributeId: attrFinish.id }).returning();

    await db.insert(productAttributeValues).values([
      { productAttributeId: paCMat.id, attributeValueId: vMatCartulinaKimberly.id, priceModifier: '0.00', daysModifier: 0 },
      { productAttributeId: paCMat.id, attributeValueId: vMatEarthPact.id, priceModifier: '15000.00', daysModifier: 1 },
      { productAttributeId: paCFin.id, attributeValueId: vFinPlastMate.id, priceModifier: '12000.00', daysModifier: 0 },
      { productAttributeId: paCFin.id, attributeValueId: vFinSoftTouch.id, priceModifier: '28000.00', daysModifier: 2 },
      { productAttributeId: paCFin.id, attributeValueId: vFinFoilDorado.id, priceModifier: '45000.00', daysModifier: 3 },
    ]);

    // -------------------------------------------------------------
    // PRODUCT 7: Carpetas Corporativas con Bolsillo
    // -------------------------------------------------------------
    const [prodCarpetas] = await db
      .insert(products)
      .values({
        categoryId: catPapeleria,
        name: 'Carpetas Corporativas con Bolsillo',
        slug: 'carpetas-corporativas',
        description: 'Carpetas institucionales tamaño carta y oficio con bolsillo pegado y troquel para tarjeta de presentación.',
        configMode: 'CONFIGURABLE',
        basePrice: '145000.00',
        imageUrl: 'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?auto=format&fit=crop&w=800&q=80',
        images: [
          'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?auto=format&fit=crop&w=800&q=80',
          'https://images.unsplash.com/photo-1589041127535-ee162232fb5b?auto=format&fit=crop&w=800&q=80',
          'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=800&q=80'
        ]
      })
      .returning();

    const [paCpSize] = await db.insert(productAttributes).values({ productId: prodCarpetas.id, attributeId: attrSize.id }).returning();
    const [paCpMat] = await db.insert(productAttributes).values({ productId: prodCarpetas.id, attributeId: attrMaterial.id }).returning();
    const [paCpFin] = await db.insert(productAttributes).values({ productId: prodCarpetas.id, attributeId: attrFinish.id }).returning();

    await db.insert(productAttributeValues).values([
      { productAttributeId: paCpSize.id, attributeValueId: vSizeCarpeta.id, priceModifier: '0.00', daysModifier: 0 },
      { productAttributeId: paCpMat.id, attributeValueId: vMatPropalcote300.id, priceModifier: '0.00', daysModifier: 0 },
      { productAttributeId: paCpFin.id, attributeValueId: vFinPlastMate.id, priceModifier: '22000.00', daysModifier: 1 },
      { productAttributeId: paCpFin.id, attributeValueId: vFinReservaUV.id, priceModifier: '48000.00', daysModifier: 2 },
    ]);

    // 5. INSERT PRICING VOLUME DISCOUNT RULES
    console.log('📈 Inserting volume discount rules...');
    await db.insert(pricingRules).values([
      { minQty: 1000, maxQty: 2999, discountPercentage: '5.00' },
      { minQty: 3000, maxQty: 4999, discountPercentage: '10.00' },
      { minQty: 5000, maxQty: 9999, discountPercentage: '15.00' },
      { minQty: 10000, maxQty: 999999, discountPercentage: '22.00' },
    ]);

    // 6. INSERT HOME BANNERS
    console.log('🖼️ Inserting promotional banners...');
    await db.insert(homeBanners).values([
      {
        title: '50% OFF en tu primer pedido',
        subtitle: 'Tarjetas de presentación, volantes y papelería comercial de alta calidad.',
        desktopImageUrl: 'https://images.unsplash.com/photo-1626785774573-4b799315345d?q=80&w=2000&auto=format&fit=crop',
        mobileImageUrl: 'https://images.unsplash.com/photo-1626785774573-4b799315345d?q=80&w=800&auto=format&fit=crop',
        linkType: 'CATEGORY',
        linkUrl: '/categoria/papeleria-comercial',
        active: true,
      },
      {
        title: 'Personaliza Online con el Editor Canvas W2P',
        subtitle: 'Diseña tus piezas gráficas con guías de corte y resolución 300 DPI lista para imprenta.',
        desktopImageUrl: 'https://images.unsplash.com/photo-1542744094-3a31f272c490?q=80&w=2000&auto=format&fit=crop',
        mobileImageUrl: 'https://images.unsplash.com/photo-1542744094-3a31f272c490?q=80&w=800&auto=format&fit=crop',
        linkType: 'PRODUCT',
        linkUrl: '/diseñador/tarjetas-estandar',
        active: true,
      },
      {
        title: 'Cajas & Empaques Personalizados',
        subtitle: 'Lleva la presentación de tu marca al siguiente nivel con acabados de lujo.',
        desktopImageUrl: 'https://images.unsplash.com/photo-1600868779951-872f7c006b0d?q=80&w=2000&auto=format&fit=crop',
        mobileImageUrl: 'https://images.unsplash.com/photo-1600868779951-872f7c006b0d?q=80&w=800&auto=format&fit=crop',
        linkType: 'CATEGORY',
        linkUrl: '/categoria/empaques-cajas',
        active: true,
      },
    ]);

    // 7. INSERT PRE-DESIGNED TEMPLATES FOR CANVAS EDITOR
    console.log('🎨 Inserting rich design templates...');
    await db.insert(designTemplates).values([
      {
        name: 'Minimal Studio - Tarjeta de Presentación',
        canvasData: {
          templateKey: 'minimal',
          category: 'Tarjetas de Presentación',
          width: 90,
          height: 50,
          description: 'Diseño limpio y moderno con acento turquesa para consultores y creativos.',
          thumbnail: 'https://images.unsplash.com/photo-1589041127535-ee162232fb5b?q=80&w=500&auto=format&fit=crop',
        },
        active: true,
      },
      {
        name: 'Corporativo Blue - Tarjeta Ejecutiva',
        canvasData: {
          templateKey: 'corporate',
          category: 'Tarjetas de Presentación',
          width: 90,
          height: 50,
          description: 'Estilo sobrio y elegante con cabecera azul marino ideal para firmas y bufetes.',
          thumbnail: 'https://images.unsplash.com/photo-1589330694653-0608cb2142e2?q=80&w=500&auto=format&fit=crop',
        },
        active: true,
      },
      {
        name: 'Dark Luxury Gold - Tarjeta Premium',
        canvasData: {
          templateKey: 'dark',
          category: 'Tarjetas de Presentación',
          width: 90,
          height: 50,
          description: 'Fondo negro profundo con acentos dorados para marcas prémium, hotelería y arquitectura.',
          thumbnail: 'https://images.unsplash.com/photo-1572044162444-ad60f128bdea?q=80&w=500&auto=format&fit=crop',
        },
        active: true,
      },
      {
        name: 'Creativo & Agencia - Tarjeta Dinámica',
        canvasData: {
          templateKey: 'creative',
          category: 'Tarjetas de Presentación',
          width: 90,
          height: 50,
          description: 'Composición moderna con formas geométricas y contraste audaz para diseñadores y fotógrafos.',
          thumbnail: 'https://images.unsplash.com/photo-1600868779951-872f7c006b0d?q=80&w=500&auto=format&fit=crop',
        },
        active: true,
      },
      {
        name: 'Gran Apertura & Promo - Volante Media Carta',
        canvasData: {
          templateKey: 'flyer-promo',
          category: 'Volantes Publicitarios',
          width: 140,
          height: 216,
          description: 'Plantilla de volante con titular llamativo, bloques de oferta y espacio para código QR.',
          thumbnail: 'https://images.unsplash.com/photo-1596526131083-e8c638c9c6c5?q=80&w=500&auto=format&fit=crop',
        },
        active: true,
      },
      {
        name: 'Café & Producto Artesanal - Etiqueta 7x7',
        canvasData: {
          templateKey: 'label-coffee',
          category: 'Etiquetas & Adhesivos',
          width: 70,
          height: 70,
          description: 'Sello circular/cuadrado con tipografía orgánica y marco de corte seguro para packaging.',
          thumbnail: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?q=80&w=500&auto=format&fit=crop',
        },
        active: true,
      },
      {
        name: 'Colección Literaria - Separador de Libros',
        canvasData: {
          templateKey: 'bookmark-editorial',
          category: 'Editorial & Merchandising',
          width: 50,
          height: 180,
          description: 'Diseño vertical con franja de autor, cita inspiracional y guía de perforación superior.',
          thumbnail: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?q=80&w=500&auto=format&fit=crop',
        },
        active: true,
      },
    ]);

    console.log('✅ Seed finished successfully! 7 Products, 6 Categories, 5 Attributes, 20+ Values, 3 Banners and 7 Design Templates created.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error executing database seed:', error);
    process.exit(1);
  }
}

seed();

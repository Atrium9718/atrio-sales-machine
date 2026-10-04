import React from 'react';
import { CmsBlock } from '../../types/cms';
import HeroBannerBlock from './HeroBannerBlock';
import CategoryGridBlock from './CategoryGridBlock';
import FeaturedProductsBlock from './FeaturedProductsBlock';
import ValuePropBlock from './ValuePropBlock';
import RichTextMediaBlock from './RichTextMediaBlock';
import FaqAccordionBlock from './FaqAccordionBlock';
import TestimonialsBlock from './TestimonialsBlock';
import TechSpecsPrepressBlock from './TechSpecsPrepressBlock';
import PartnerShowcaseBlock from './PartnerShowcaseBlock';
import EmbeddedQuoterCtaBlock from './EmbeddedQuoterCtaBlock';
import ContactMapFormBlock from './ContactMapFormBlock';
import CustomHtmlBlock from './CustomHtmlBlock';

interface Props {
  block: CmsBlock;
  key?: React.Key;
}

export default function DynamicBlockRenderer({ block }: Props) {
  if (block.isEnabled === false) {
    return null;
  }

  switch (block.type) {
    case 'HERO_BANNER':
      return <HeroBannerBlock block={block} />;
    case 'CATEGORY_GRID':
      return <CategoryGridBlock block={block} />;
    case 'FEATURED_PRODUCTS':
      return <FeaturedProductsBlock block={block} />;
    case 'VALUE_PROPOSITION':
      return <ValuePropBlock block={block} />;
    case 'RICH_TEXT_MEDIA':
      return <RichTextMediaBlock block={block} />;
    case 'FAQ_ACCORDION':
      return <FaqAccordionBlock block={block} />;
    case 'TESTIMONIALS':
      return <TestimonialsBlock block={block} />;
    case 'TECH_SPECS_PREPRESS':
      return <TechSpecsPrepressBlock block={block} />;
    case 'PARTNER_SHOWCASE':
      return <PartnerShowcaseBlock block={block} />;
    case 'EMBEDDED_QUOTER_CTA':
      return <EmbeddedQuoterCtaBlock block={block} />;
    case 'CONTACT_MAP_FORM':
      return <ContactMapFormBlock block={block} />;
    case 'CUSTOM_HTML':
      return <CustomHtmlBlock block={block} />;
    default:
      console.warn('Unknown CMS block type:', (block as any)?.type);
      return null;
  }
}

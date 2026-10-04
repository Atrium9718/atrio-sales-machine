import { Controller, Post, Body, Optional, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { FirebaseAuthGuard } from '../auth/auth.guard';
import { AiService } from './ai.service';

@Controller('api/ai')
export class AiController {
  private service: AiService;

  constructor(@Optional() private readonly aiService?: AiService) {
    this.service = aiService || new AiService();
  }

  @Post('generate-campaign')
  @UseGuards(AdminGuard)
  async generateCampaign(@Body() data: any) {
    try {
      const campaign = await this.service.generateMarketingCampaign(data);
      return {
        success: true,
        campaign,
        ...campaign
      };
    } catch (err: any) {
      console.error('Error generating campaign:', err);
      return {
        success: false,
        message: err?.message || 'Error generating campaign'
      };
    }
  }

  @Post('generate-image')
  @UseGuards(FirebaseAuthGuard)
  async generateImage(@Body() data: { prompt: string; aspectRatio?: any; style?: any; productContext?: string }) {
    try {
      const result = await this.service.generateImage(data);
      return result;
    } catch (error: any) {
      console.error('Error in AiController.generateImage:', error);
      return {
        imageUrl: 'https://images.unsplash.com/photo-1626785774573-4b799315345d?q=80&w=2000&auto=format&fit=crop',
        isAiGenerated: false,
        source: 'Catálogo Litográfico HD',
        note: 'Imagen de contingencia litográfica (300 DPI).'
      };
    }
  }

  @Post('generate-product-prompt')
  @UseGuards(AdminGuard)
  async generateProductPrompt(@Body() data: any) {
    try {
      const result = await this.service.generateProductPrompt(data);
      return {
        success: true,
        ...result
      };
    } catch (error: any) {
      console.error('Error in AiController.generateProductPrompt:', error);
      return {
        success: false,
        message: error?.message || 'Error generating product prompt'
      };
    }
  }

  @Post('creative-copy')
  @UseGuards(AdminGuard)
  async generateCreativeCopy(@Body() data: any) {
    try {
      const result = await this.service.generateCreativeCopy(data);
      return {
        success: true,
        ...result
      };
    } catch (error: any) {
      console.error('Error in AiController.generateCreativeCopy:', error);
      return {
        success: false,
        message: error?.message || 'Error generando copys con Gemini IA'
      };
    }
  }

  @Post('seo-suggestions')
  @UseGuards(AdminGuard)
  async generateSeoSuggestions(@Body() data: any) {
    try {
      const result = await this.service.generateSeoSuggestions(data);
      return {
        success: true,
        ...result
      };
    } catch (error: any) {
      console.error('Error in AiController.generateSeoSuggestions:', error);
      return {
        success: false,
        message: error?.message || 'Error generando sugerencias SEO'
      };
    }
  }
}


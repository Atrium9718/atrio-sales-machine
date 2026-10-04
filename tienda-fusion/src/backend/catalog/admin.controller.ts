import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards, Inject, Optional, BadRequestException } from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { AdminCatalogService } from './admin.service';

@Controller('api/admin/catalog')
@UseGuards(AdminGuard)
export class AdminCatalogController {
  private adminService: AdminCatalogService;

  constructor(@Optional() @Inject(AdminCatalogService) adminService?: AdminCatalogService) {
    this.adminService = adminService || new AdminCatalogService();
  }

  @Get('products')
  async getAllProducts() {
    return await this.adminService.getAllProducts();
  }

  @Get('categories')
  async getAllCategories() {
    return await this.adminService.getAllCategories();
  }

  @Post('categories')
  async createCategory(@Body() data: any) {
    if (!data.name || !data.name.trim()) {
      throw new BadRequestException('El nombre de la categoría es obligatorio');
    }
    return await this.adminService.createCategory(data);
  }

  @Put('categories/:id')
  async updateCategory(@Param('id') id: string, @Body() data: any) {
    const numId = Number(id);
    if (isNaN(numId) || numId <= 0) {
      throw new BadRequestException('ID de categoría inválido');
    }
    return await this.adminService.updateCategory(numId, data);
  }

  @Put('categories/:id/toggle')
  async toggleCategory(@Param('id') id: string, @Body() data: { active: boolean }) {
    const numId = Number(id);
    if (isNaN(numId) || numId <= 0) {
      throw new BadRequestException('ID de categoría inválido');
    }
    return await this.adminService.toggleCategoryStatus(numId, !!data.active);
  }

  @Delete('categories/:id')
  async deleteCategory(@Param('id') id: string, @Body() data: any) {
    const numId = Number(id);
    if (isNaN(numId) || numId <= 0) {
      throw new BadRequestException('ID de categoría inválido');
    }
    return await this.adminService.deleteCategory(numId, data?.reassignToCategoryId ? Number(data.reassignToCategoryId) : undefined);
  }

  @Get('product/:id')
  async getProduct(@Param('id') id: string) {
    const numId = Number(id);
    if (isNaN(numId) || numId <= 0) {
      throw new BadRequestException('ID de producto inválido');
    }
    return await this.adminService.getProduct(numId);
  }

  @Post('product')
  async createProduct(@Body() data: any) {
    return await this.adminService.createProduct(data);
  }

  @Put('product/:id')
  async updateProduct(@Param('id') id: string, @Body() data: any) {
    const numId = Number(id);
    if (isNaN(numId) || numId <= 0) {
      throw new BadRequestException('ID de producto inválido');
    }
    return await this.adminService.updateProduct(numId, data);
  }

  @Put('product/:id/quick-update')
  async quickUpdateProduct(@Param('id') id: string, @Body() data: any) {
    const numId = Number(id);
    if (isNaN(numId) || numId <= 0) {
      throw new BadRequestException('ID de producto inválido');
    }
    return await this.adminService.quickUpdateProduct(numId, data);
  }

  @Post('product/:id/duplicate')
  async duplicateProduct(@Param('id') id: string) {
    const numId = Number(id);
    if (isNaN(numId) || numId <= 0) {
      throw new BadRequestException('ID de producto inválido');
    }
    return await this.adminService.duplicateProduct(numId);
  }

  @Delete('product/:id')
  async deleteProduct(@Param('id') id: string) {
    const numId = Number(id);
    if (isNaN(numId) || numId <= 0) {
      throw new BadRequestException('ID de producto inválido');
    }
    return await this.adminService.deleteProduct(numId);
  }

  // ==========================================
  // MASTER ATTRIBUTES & VALUES LIBRARY
  // ==========================================

  @Get('master-attributes')
  async getAllMasterAttributes() {
    return await this.adminService.getAllMasterAttributes();
  }

  @Post('master-attributes')
  async createMasterAttribute(@Body() data: any) {
    return await this.adminService.createMasterAttribute(data);
  }

  @Put('master-attributes/:id')
  async updateMasterAttribute(@Param('id') id: string, @Body() data: any) {
    return await this.adminService.updateMasterAttribute(Number(id), data);
  }

  @Delete('master-attributes/:id')
  async deleteMasterAttribute(@Param('id') id: string) {
    return await this.adminService.deleteMasterAttribute(Number(id));
  }

  @Post('master-attributes/:id/values')
  async createMasterAttributeValue(@Param('id') id: string, @Body() data: any) {
    return await this.adminService.createMasterAttributeValue(Number(id), data);
  }

  @Put('master-attributes/values/:valId')
  async updateMasterAttributeValue(@Param('valId') valId: string, @Body() data: any) {
    return await this.adminService.updateMasterAttributeValue(Number(valId), data);
  }

  @Delete('master-attributes/values/:valId')
  async deleteMasterAttributeValue(@Param('valId') valId: string) {
    return await this.adminService.deleteMasterAttributeValue(Number(valId));
  }

  @Post('master-attributes/:id/apply-to-products')
  async applyMasterAttributeToProducts(@Param('id') id: string, @Body() body: any) {
    return await this.adminService.applyMasterAttributeToProducts(Number(id), body);
  }

  @Post('apply-quantity-tiers')
  async applyQuantityTiersToProducts(@Body() body: any) {
    return await this.adminService.applyQuantityTiersToProducts(body.tiers, body.target || {});
  }
}

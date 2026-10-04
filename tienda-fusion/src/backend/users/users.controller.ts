import { Controller, Get, Post, Put, Delete, Body, Param, Query, Req, Inject, Optional } from '@nestjs/common';
import { UsersService } from './users.service';
import type { UserRoleKey } from './users.types';

@Controller('api/admin/users')
export class UsersController {
  private usersService: UsersService;

  constructor(@Optional() @Inject(UsersService) usersService?: UsersService) {
    this.usersService = usersService || new UsersService();
  }

  // ==========================================
  // 1. ROLES Y MATRIZ DE PERMISOS (RBAC)
  // (Declarados primero para evitar colisión con :id)
  // ==========================================

  @Get('rbac/roles')
  getRoles() {
    return this.usersService.getRoles();
  }

  @Post('rbac/roles')
  createRole(@Body() body: Record<string, any>, @Req() req: any) {
    const creatorEmail = req.user?.email || 'admin@fusiongrafica.com.co';
    return this.usersService.createRole(body, creatorEmail);
  }

  @Put('rbac/roles/:roleKey/permissions')
  updateRolePermissions(
    @Param('roleKey') roleKey: string,
    @Body('permissions') permissions: string[],
    @Req() req: any
  ) {
    const updaterEmail = req.user?.email || 'admin@fusiongrafica.com.co';
    return this.usersService.updateRolePermissions(roleKey as UserRoleKey, permissions, updaterEmail);
  }

  @Put('rbac/roles/:roleKey')
  updateRole(
    @Param('roleKey') roleKey: string,
    @Body() body: Record<string, any>,
    @Req() req: any
  ) {
    const updaterEmail = req.user?.email || 'admin@fusiongrafica.com.co';
    return this.usersService.updateRole(roleKey, body, updaterEmail);
  }

  @Delete('rbac/roles/:roleKey')
  deleteRole(
    @Param('roleKey') roleKey: string,
    @Req() req: any
  ) {
    const deleterEmail = req.user?.email || 'admin@fusiongrafica.com.co';
    return this.usersService.deleteRole(roleKey, deleterEmail);
  }

  // ==========================================
  // 2. SINCRONIZACIÓN Y RESET DE DEFAULTS
  // ==========================================

  @Post('reset-defaults')
  resetDefaults(@Req() req: any) {
    const requesterEmail = req.user?.email || 'andresepulveda718@gmail.com';
    return this.usersService.resetDefaultProfiles(requesterEmail);
  }

  // ==========================================
  // 3. AUDITORÍA Y REGISTROS
  // ==========================================

  @Get('audit/logs')
  getAuditLogs(
    @Query('category') category?: string,
    @Query('severity') severity?: string,
    @Query('limit') limit?: string
  ) {
    const max = limit ? parseInt(limit, 10) : 100;
    return this.usersService.getAuditLogs(category, severity, max);
  }

  @Post('audit/logs')
  createAuditLog(@Body() body: any, @Req() req: any) {
    const email = req.user?.email || body.userEmail || 'admin@fusiongrafica.com.co';
    return this.usersService.addAuditLog({
      userId: body.userId || 'system',
      userEmail: email,
      action: body.action || 'Acción Registrada',
      category: body.category || 'users',
      severity: body.severity || 'info',
      ip: body.ip || '181.134.92.14',
      details: body.details || '',
      userAgent: req.headers?.['user-agent'] || 'Web Browser'
    });
  }

  // ==========================================
  // 4. POLÍTICAS DE SEGURIDAD
  // ==========================================

  @Get('security/settings')
  getSecuritySettings() {
    return this.usersService.getSecuritySettings();
  }

  @Put('security/settings')
  updateSecuritySettings(@Body() body: Record<string, any>, @Req() req: any) {
    const updaterEmail = req.user?.email || 'admin@fusiongrafica.com.co';
    return this.usersService.updateSecuritySettings(body, updaterEmail);
  }

  // ==========================================
  // 5. USUARIOS: COLECCIÓN & CREACIÓN
  // ==========================================

  @Get()
  getUsers(
    @Query('role') role?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.usersService.getUsers({ role, status, search });
  }

  @Post()
  createUser(@Body() body: Record<string, any>, @Req() req: any) {
    const creatorEmail = req.user?.email || 'admin@fusiongrafica.com.co';
    return this.usersService.createUser(body, creatorEmail);
  }

  // ==========================================
  // 6. USUARIOS: OPERACIONES POR ID
  // ==========================================

  @Get(':id')
  getUserById(@Param('id') id: string) {
    return this.usersService.getUserById(id);
  }

  @Put(':id')
  updateUser(@Param('id') id: string, @Body() body: Record<string, any>, @Req() req: any) {
    const updaterEmail = req.user?.email || 'admin@fusiongrafica.com.co';
    return this.usersService.updateUser(id, body, updaterEmail);
  }

  @Post(':id/toggle-status')
  toggleStatus(@Param('id') id: string, @Req() req: any) {
    const updaterEmail = req.user?.email || 'admin@fusiongrafica.com.co';
    return this.usersService.toggleUserStatus(id, updaterEmail);
  }

  @Post(':id/reset-password')
  resetPassword(@Param('id') id: string, @Req() req: any) {
    const updaterEmail = req.user?.email || 'admin@fusiongrafica.com.co';
    return this.usersService.resetPassword(id, updaterEmail);
  }

  @Delete(':id')
  deleteUser(@Param('id') id: string, @Req() req: any) {
    const deleterEmail = req.user?.email || 'admin@fusiongrafica.com.co';
    return this.usersService.deleteUser(id, deleterEmail);
  }
}



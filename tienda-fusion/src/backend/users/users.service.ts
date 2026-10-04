import { Injectable, Logger, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { SystemUser, RoleDefinition, AuditLog, SecuritySettings, UserRoleKey, UserStatus } from './users.types';
import { PERMISSION_MODULES } from './permissions.data';
import { INITIAL_DEFAULT_ROLES, INITIAL_DEFAULT_USERS, DEFAULT_SUPER_USER_EMAIL } from './users.defaults';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);
  private readonly configPath = path.join(process.cwd(), 'users-management.config.json');

  private users: SystemUser[] = [];
  private roles: RoleDefinition[] = [];
  private auditLogs: AuditLog[] = [];
  private securitySettings: SecuritySettings = {
    passwordMinLength: 10,
    requireSpecialChars: true,
    requireNumbers: true,
    requireUppercase: true,
    sessionTimeoutMinutes: 60,
    maxFailedLoginAttempts: 5,
    lockoutDurationMinutes: 30,
    enforce2FAForAdmins: true,
    allowDomainRestrictedSignups: true,
    allowedDomains: ['fusiongrafica.com.co', 'fusion.com']
  };

  constructor() {
    this.loadData();
  }

  private loadData(): void {
    try {
      if (fs.existsSync(this.configPath)) {
        const raw = fs.readFileSync(this.configPath, 'utf8');
        const data = JSON.parse(raw);
        if (data.users && Array.isArray(data.users) && data.users.length > 0) {
          this.users = data.users;
        } else {
          this.users = [...INITIAL_DEFAULT_USERS];
        }

        if (data.roles && Array.isArray(data.roles) && data.roles.length > 0) {
          this.roles = data.roles;
          // Ensure new standard roles are present
          INITIAL_DEFAULT_ROLES.forEach(defRole => {
            if (!this.roles.some(r => r.key === defRole.key)) {
              this.roles.push(defRole);
            }
          });
        } else {
          this.roles = [...INITIAL_DEFAULT_ROLES];
        }

        if (data.auditLogs && Array.isArray(data.auditLogs)) this.auditLogs = data.auditLogs;
        if (data.securitySettings) this.securitySettings = { ...this.securitySettings, ...data.securitySettings };
      } else {
        this.users = [...INITIAL_DEFAULT_USERS];
        this.roles = [...INITIAL_DEFAULT_ROLES];
        this.saveData();
      }

      // Ensure Super User (andresepulveda718@gmail.com) ALWAYS exists and is locked to SUPER_ADMIN
      this.ensureSuperUserEnforced();

      // Ensure all standard permissions are in SUPER_ADMIN role
      this.ensureSuperAdminHasAllPermissions();

      this.logger.log(`Datos de Usuarios y Roles cargados exitosamente (${this.users.length} usuarios, ${this.roles.length} roles).`);
    } catch (e: any) {
      this.logger.error(`Error al cargar datos de usuarios: ${e.message}`);
      this.users = [...INITIAL_DEFAULT_USERS];
      this.roles = [...INITIAL_DEFAULT_ROLES];
      this.ensureSuperUserEnforced();
      this.saveData();
    }
  }

  private ensureSuperUserEnforced(): void {
    const superEmail = DEFAULT_SUPER_USER_EMAIL.toLowerCase().trim();
    const existingIndex = this.users.findIndex(u => u.email.toLowerCase().trim() === superEmail);

    if (existingIndex === -1) {
      const superUserDef: SystemUser = {
        id: 'usr-001',
        email: superEmail,
        name: 'Andrés Sepúlveda',
        phone: '+57 311 458 9231',
        role: 'SUPER_ADMIN',
        department: 'Dirección General & Tecnología',
        status: 'active',
        twoFactorEnabled: true,
        avatarColor: '#0d9488',
        lastLogin: new Date().toISOString(),
        lastIp: '181.134.92.14 (Manizales, Colombia)',
        createdAt: '2026-01-10T10:00:00.000Z',
        notes: 'Super Usuario Principal y Propietario del Sistema - Acceso Irrestricto'
      };
      this.users.unshift(superUserDef);
      this.saveData();
    } else {
      // Enforce SUPER_ADMIN role and active status
      if (this.users[existingIndex].role !== 'SUPER_ADMIN' || this.users[existingIndex].status !== 'active') {
        this.users[existingIndex].role = 'SUPER_ADMIN';
        this.users[existingIndex].status = 'active';
        this.saveData();
      }
    }
  }

  private ensureSuperAdminHasAllPermissions(): void {
    const allPermKeys = PERMISSION_MODULES.flatMap(m => m.permissions.map(p => p.key));
    const superAdminRole = this.roles.find(r => r.key === 'SUPER_ADMIN');
    if (superAdminRole) {
      superAdminRole.permissions = Array.from(new Set([...superAdminRole.permissions, ...allPermKeys]));
      superAdminRole.isSystem = true;
    }
  }

  private saveData(): void {
    try {
      const data = {
        users: this.users,
        roles: this.roles,
        auditLogs: this.auditLogs.slice(0, 500), // Keep up to 500 recent logs
        securitySettings: this.securitySettings,
      };
      fs.writeFileSync(this.configPath, JSON.stringify(data, null, 2), 'utf8');
    } catch (e: any) {
      this.logger.error(`Error al persistir datos de usuarios: ${e.message}`);
    }
  }

  // ==========================================
  // USUARIOS CRUD & GESTIÓN
  // ==========================================

  getUsers(filters?: { role?: string; status?: string; search?: string }): { users: SystemUser[]; stats: any } {
    let filtered = [...this.users];

    if (filters?.role && filters.role !== 'ALL') {
      filtered = filtered.filter(u => u.role === filters.role);
    }

    if (filters?.status && filters.status !== 'ALL') {
      filtered = filtered.filter(u => u.status === filters.status);
    }

    if (filters?.search) {
      const q = filters.search.toLowerCase().trim();
      filtered = filtered.filter(u => 
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.department.toLowerCase().includes(q)
      );
    }

    const stats = {
      total: this.users.length,
      active: this.users.filter(u => u.status === 'active').length,
      suspended: this.users.filter(u => u.status === 'inactive' || u.status === 'blocked').length,
      pending: this.users.filter(u => u.status === 'pending_invitation').length,
      admins: this.users.filter(u => u.role === 'SUPER_ADMIN' || u.role === 'ADMIN').length,
      productionAndDesign: this.users.filter(u => u.role === 'PRODUCTION_MANAGER' || u.role === 'PREPRESS_DESIGNER').length,
      logisticsAndSales: this.users.filter(u => u.role === 'LOGISTICS_DISPATCH' || u.role === 'SALES_AGENT' || u.role === 'ACCOUNTING').length,
    };

    return { users: filtered, stats };
  }

  getUserById(id: string): SystemUser {
    const user = this.users.find(u => u.id === id);
    if (!user) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    }
    return user;
  }

  createUser(data: Partial<SystemUser>, createdByEmail = 'admin@fusiongrafica.com.co'): { user: SystemUser; temporaryPassword?: string } {
    if (!data.email || !data.name || !data.role) {
      throw new BadRequestException('Nombre, correo electrónico y rol son obligatorios');
    }

    const normalizedEmail = data.email.toLowerCase().trim();
    if (this.users.some(u => u.email.toLowerCase().trim() === normalizedEmail)) {
      throw new BadRequestException(`Ya existe un usuario registrado con el correo ${normalizedEmail}`);
    }

    // Avatar colors list for attractive modern UI
    const colors = ['#0d9488', '#7c3aed', '#ea580c', '#2563eb', '#059669', '#d97706', '#4f46e5', '#db2777', '#0284c7'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    // Generate secure temporary password
    const temporaryPassword = `Fusion#${Math.floor(100000 + Math.random() * 900000)}!`;

    const newUser: SystemUser = {
      id: `usr-${Date.now().toString().slice(-4)}`,
      email: normalizedEmail,
      name: data.name.trim(),
      phone: data.phone?.trim() || '+57 300 000 0000',
      role: (data.role as UserRoleKey) || 'CUSTOMER',
      department: data.department?.trim() || 'General',
      status: (data.status as UserStatus) || 'active',
      twoFactorEnabled: data.twoFactorEnabled ?? (data.role === 'SUPER_ADMIN' || data.role === 'ADMIN'),
      avatarColor: data.avatarColor || randomColor,
      lastLogin: 'Nunca',
      lastIp: 'Sin registros',
      createdAt: new Date().toISOString(),
      notes: data.notes?.trim() || '',
      permissionsOverride: data.permissionsOverride || []
    };

    this.users.unshift(newUser);
    this.saveData();

    // Log security audit event
    this.addAuditLog({
      userId: newUser.id,
      userEmail: createdByEmail,
      action: `Creación de Usuario: ${newUser.name}`,
      category: 'users',
      severity: 'info',
      ip: '181.134.92.14',
      details: `Usuario creado con correo ${newUser.email}, Rol: ${newUser.role}, Departamento: ${newUser.department}`
    });

    return { user: newUser, temporaryPassword };
  }

  updateUser(id: string, updates: Partial<SystemUser>, updatedByEmail = 'admin@fusiongrafica.com.co'): SystemUser {
    const index = this.users.findIndex(u => u.id === id);
    if (index === -1) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    }

    const current = this.users[index];

    // Protect Super Admin from role demotion by standard procedures
    if (current.email === 'andresepulveda718@gmail.com' && updates.role && updates.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('El Super Administrador principal no puede ser degradado de rol');
    }

    const updatedUser: SystemUser = {
      ...current,
      name: updates.name ? updates.name.trim() : current.name,
      phone: updates.phone !== undefined ? updates.phone.trim() : current.phone,
      role: updates.role ? (updates.role as UserRoleKey) : current.role,
      department: updates.department ? updates.department.trim() : current.department,
      status: updates.status ? (updates.status as UserStatus) : current.status,
      twoFactorEnabled: updates.twoFactorEnabled !== undefined ? updates.twoFactorEnabled : current.twoFactorEnabled,
      notes: updates.notes !== undefined ? updates.notes.trim() : current.notes,
      permissionsOverride: updates.permissionsOverride || current.permissionsOverride,
    };

    this.users[index] = updatedUser;
    this.saveData();

    this.addAuditLog({
      userId: updatedUser.id,
      userEmail: updatedByEmail,
      action: `Modificación de Usuario: ${updatedUser.name}`,
      category: 'users',
      severity: 'info',
      ip: '181.134.92.14',
      details: `Actualizados datos del usuario ${updatedUser.email}. Rol actual: ${updatedUser.role}, Estado: ${updatedUser.status}`
    });

    return updatedUser;
  }

  toggleUserStatus(id: string, updatedByEmail = 'admin@fusiongrafica.com.co'): SystemUser {
    const user = this.getUserById(id);

    if (user.email === 'andresepulveda718@gmail.com') {
      throw new ForbiddenException('No es posible suspender o desactivar la cuenta del Super Administrador principal');
    }

    const newStatus: UserStatus = user.status === 'active' ? 'inactive' : 'active';
    return this.updateUser(id, { status: newStatus }, updatedByEmail);
  }

  deleteUser(id: string, deletedByEmail = 'admin@fusiongrafica.com.co'): { success: boolean; message: string } {
    const user = this.getUserById(id);

    if (user.email === 'andresepulveda718@gmail.com') {
      throw new ForbiddenException('No se puede eliminar la cuenta principal del Super Administrador');
    }

    this.users = this.users.filter(u => u.id !== id);
    this.saveData();

    this.addAuditLog({
      userId: id,
      userEmail: deletedByEmail,
      action: `Eliminación de Usuario: ${user.name}`,
      category: 'users',
      severity: 'warning',
      ip: '181.134.92.14',
      details: `Usuario ${user.email} con rol ${user.role} eliminado permanentemente del sistema`
    });

    return { success: true, message: `Usuario ${user.name} eliminado exitosamente` };
  }

  resetPassword(id: string, requestedByEmail = 'admin@fusiongrafica.com.co'): { success: boolean; message: string; tempPass: string } {
    const user = this.getUserById(id);
    const tempPass = `Fusion#${Math.floor(100000 + Math.random() * 900000)}!`;

    this.addAuditLog({
      userId: user.id,
      userEmail: requestedByEmail,
      action: `Restablecimiento de Contraseña para: ${user.name}`,
      category: 'security',
      severity: 'warning',
      ip: '181.134.92.14',
      details: `Se generó nueva clave temporal de acceso y se preparó notificación para ${user.email}`
    });

    return {
      success: true,
      message: `Enlace de restablecimiento y clave temporal generados para ${user.email}`,
      tempPass
    };
  }

  // ==========================================
  // ROLES Y MATRIZ DE PERMISOS (RBAC)
  // ==========================================

  getRoles(): { roles: RoleDefinition[]; permissionModules: any[] } {
    return {
      roles: this.roles,
      permissionModules: PERMISSION_MODULES
    };
  }

  createRole(data: Partial<RoleDefinition>, createdByEmail = 'admin@fusiongrafica.com.co'): RoleDefinition {
    if (!data.name || !data.name.trim()) {
      throw new BadRequestException('El nombre del rol es obligatorio');
    }

    // Generate or clean role key (e.g. "OFFSET_OPERATOR")
    let key = data.key?.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_');
    if (!key) {
      key = data.name.trim().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Z0-9]/g, '_').replace(/_+/g, '_');
    }

    if (this.roles.some(r => r.key === key)) {
      throw new BadRequestException(`Ya existe un rol con la clave '${key}'`);
    }

    const color = data.color || 'teal';
    const colorMap: Record<string, { bg: string; text: string }> = {
      teal: { bg: 'bg-teal-50 border-teal-200', text: 'text-teal-800' },
      purple: { bg: 'bg-purple-50 border-purple-200', text: 'text-purple-800' },
      orange: { bg: 'bg-orange-50 border-orange-200', text: 'text-orange-800' },
      blue: { bg: 'bg-blue-50 border-blue-200', text: 'text-blue-800' },
      emerald: { bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-800' },
      amber: { bg: 'bg-amber-50 border-amber-200', text: 'text-amber-800' },
      indigo: { bg: 'bg-indigo-50 border-indigo-200', text: 'text-indigo-800' },
      cyan: { bg: 'bg-cyan-50 border-cyan-200', text: 'text-cyan-800' },
      slate: { bg: 'bg-slate-50 border-slate-200', text: 'text-slate-800' },
    };

    const newRole: RoleDefinition = {
      key: key as UserRoleKey,
      name: data.name.trim(),
      description: data.description?.trim() || `Rol personalizado para ${data.name.trim()}`,
      level: Math.min(Math.max(Number(data.level) || 3, 1), 9), // Max 9 for custom roles (10 is reserved for Super Admin)
      color,
      badgeBg: colorMap[color]?.bg || 'bg-slate-50 border-slate-200',
      badgeText: colorMap[color]?.text || 'text-slate-800',
      isSystem: false,
      permissions: Array.isArray(data.permissions) ? data.permissions : ['catalog:view', 'orders:view']
    };

    this.roles.push(newRole);
    this.saveData();

    this.addAuditLog({
      userId: newRole.key,
      userEmail: createdByEmail,
      action: `Creación de Rol Personalizado: ${newRole.name}`,
      category: 'roles',
      severity: 'info',
      ip: '181.134.92.14',
      details: `Rol '${newRole.name}' (${newRole.key}) creado con nivel ${newRole.level} y ${newRole.permissions.length} permisos iniciales`
    });

    return newRole;
  }

  updateRole(roleKey: string, data: Partial<RoleDefinition>, updatedByEmail = 'admin@fusiongrafica.com.co'): RoleDefinition {
    const index = this.roles.findIndex(r => r.key === roleKey);
    if (index === -1) {
      throw new NotFoundException(`Rol ${roleKey} no encontrado`);
    }

    const current = this.roles[index];

    // Cannot change system status of SUPER_ADMIN or level 10
    if (current.key === 'SUPER_ADMIN') {
      const allPermKeys = PERMISSION_MODULES.flatMap(m => m.permissions.map(p => p.key));
      current.permissions = allPermKeys;
      current.name = data.name?.trim() || current.name;
      current.description = data.description?.trim() || current.description;
      this.roles[index] = current;
      this.saveData();
      return current;
    }

    const color = data.color || current.color;
    const colorMap: Record<string, { bg: string; text: string }> = {
      teal: { bg: 'bg-teal-50 border-teal-200', text: 'text-teal-800' },
      purple: { bg: 'bg-purple-50 border-purple-200', text: 'text-purple-800' },
      orange: { bg: 'bg-orange-50 border-orange-200', text: 'text-orange-800' },
      blue: { bg: 'bg-blue-50 border-blue-200', text: 'text-blue-800' },
      emerald: { bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-800' },
      amber: { bg: 'bg-amber-50 border-amber-200', text: 'text-amber-800' },
      indigo: { bg: 'bg-indigo-50 border-indigo-200', text: 'text-indigo-800' },
      cyan: { bg: 'bg-cyan-50 border-cyan-200', text: 'text-cyan-800' },
      slate: { bg: 'bg-slate-50 border-slate-200', text: 'text-slate-800' },
    };

    const updatedRole: RoleDefinition = {
      ...current,
      name: data.name?.trim() || current.name,
      description: data.description !== undefined ? data.description.trim() : current.description,
      level: data.level !== undefined ? Math.min(Math.max(Number(data.level), 1), 9) : current.level,
      color,
      badgeBg: colorMap[color]?.bg || current.badgeBg,
      badgeText: colorMap[color]?.text || current.badgeText,
      permissions: Array.isArray(data.permissions) ? data.permissions : current.permissions
    };

    this.roles[index] = updatedRole;
    this.saveData();

    this.addAuditLog({
      userId: updatedRole.key,
      userEmail: updatedByEmail,
      action: `Modificación de Rol: ${updatedRole.name}`,
      category: 'roles',
      severity: 'info',
      ip: '181.134.92.14',
      details: `Rol '${updatedRole.name}' actualizado. Nivel: ${updatedRole.level}, Permisos: ${updatedRole.permissions.length}`
    });

    return updatedRole;
  }

  deleteRole(roleKey: string, deletedByEmail = 'admin@fusiongrafica.com.co'): { success: boolean; message: string } {
    const role = this.roles.find(r => r.key === roleKey);
    if (!role) {
      throw new NotFoundException(`Rol ${roleKey} no encontrado`);
    }

    if (role.isSystem || role.key === 'SUPER_ADMIN' || role.key === 'ADMIN') {
      throw new ForbiddenException(`El rol predeterminado del sistema '${role.name}' no puede ser eliminado`);
    }

    // Check if any users currently have this role
    const assignedUsers = this.users.filter(u => u.role === roleKey);
    if (assignedUsers.length > 0) {
      throw new BadRequestException(
        `No se puede eliminar el rol '${role.name}' porque actualmente está asignado a ${assignedUsers.length} usuario(s) (${assignedUsers.map(u => u.name).join(', ')}). Reasigna estos usuarios antes de eliminar el rol.`
      );
    }

    this.roles = this.roles.filter(r => r.key !== roleKey);
    this.saveData();

    this.addAuditLog({
      userId: roleKey,
      userEmail: deletedByEmail,
      action: `Eliminación de Rol: ${role.name}`,
      category: 'roles',
      severity: 'warning',
      ip: '181.134.92.14',
      details: `Rol personalizado '${role.name}' (${roleKey}) eliminado del sistema`
    });

    return { success: true, message: `Rol '${role.name}' eliminado exitosamente` };
  }

  updateRolePermissions(roleKey: UserRoleKey, newPermissions: string[], updatedByEmail = 'admin@fusiongrafica.com.co'): RoleDefinition {
    const index = this.roles.findIndex(r => r.key === roleKey);
    if (index === -1) {
      throw new NotFoundException(`Rol ${roleKey} no encontrado`);
    }

    const role = this.roles[index];
    if (role.key === 'SUPER_ADMIN') {
      // Super Admin always maintains all permissions
      const allPermKeys = PERMISSION_MODULES.flatMap(m => m.permissions.map(p => p.key));
      role.permissions = allPermKeys;
    } else {
      role.permissions = newPermissions;
    }

    this.roles[index] = role;
    this.saveData();

    this.addAuditLog({
      userId: roleKey,
      userEmail: updatedByEmail,
      action: `Actualización de Matriz de Permisos: ${role.name}`,
      category: 'roles',
      severity: 'warning',
      ip: '181.134.92.14',
      details: `Se actualizaron los permisos asignados al rol ${role.name} (${role.permissions.length} permisos activos)`
    });

    return role;
  }

  resetDefaultProfiles(requestedByEmail = 'admin@fusiongrafica.com.co'): { success: boolean; message: string; usersCount: number; rolesCount: number } {
    // Preserve any newly created custom users/roles if desired, or ensure default 7 profiles are loaded
    const superEmail = DEFAULT_SUPER_USER_EMAIL.toLowerCase().trim();

    // Map existing users by email
    const existingUsersMap = new Map<string, SystemUser>();
    for (const u of this.users) {
      existingUsersMap.set(u.email.toLowerCase().trim(), u);
    }

    // Ensure all 7 default users are present with their official role definitions
    for (const defUser of INITIAL_DEFAULT_USERS) {
      const email = defUser.email.toLowerCase().trim();
      if (!existingUsersMap.has(email)) {
        this.users.push({ ...defUser });
      } else {
        const existing = existingUsersMap.get(email)!;
        existing.status = 'active';
        if (email === superEmail) {
          existing.role = 'SUPER_ADMIN';
          existing.name = 'Andrés Sepúlveda';
          existing.department = 'Dirección General & Tecnología';
          existing.notes = 'Super Usuario Principal y Propietario del Sistema - Acceso Irrestricto';
        }
      }
    }

    // Ensure all default roles are present
    const existingRolesMap = new Map<string, RoleDefinition>();
    for (const r of this.roles) {
      existingRolesMap.set(r.key, r);
    }

    for (const defRole of INITIAL_DEFAULT_ROLES) {
      if (!existingRolesMap.has(defRole.key)) {
        this.roles.push({ ...defRole });
      }
    }

    this.ensureSuperUserEnforced();
    this.ensureSuperAdminHasAllPermissions();
    this.saveData();

    this.addAuditLog({
      userId: 'system',
      userEmail: requestedByEmail,
      action: 'Restablecimiento de Perfiles y Roles Predeterminados',
      category: 'users',
      severity: 'info',
      ip: '181.134.92.14',
      details: `Cargados perfiles predeterminados. Super Usuario asignado a ${DEFAULT_SUPER_USER_EMAIL}`
    });

    return {
      success: true,
      message: `Perfiles predeterminados sincronizados. El usuario ${DEFAULT_SUPER_USER_EMAIL} es el Super Usuario con acceso total.`,
      usersCount: this.users.length,
      rolesCount: this.roles.length
    };
  }

  // ==========================================
  // REGISTROS DE AUDITORÍA & SEGURIDAD (AUDIT TRAIL)
  // ==========================================

  getAuditLogs(category?: string, severity?: string, limit = 100): AuditLog[] {
    let logs = [...this.auditLogs];

    if (category && category !== 'ALL') {
      logs = logs.filter(l => l.category === category);
    }

    if (severity && severity !== 'ALL') {
      logs = logs.filter(l => l.severity === severity);
    }

    return logs.slice(0, limit);
  }

  addAuditLog(entry: Omit<AuditLog, 'id' | 'timestamp'>): AuditLog {
    const log: AuditLog = {
      id: `log-${Date.now().toString().slice(-6)}`,
      timestamp: new Date().toISOString(),
      ...entry
    };

    this.auditLogs.unshift(log);
    this.saveData();
    return log;
  }

  // ==========================================
  // POLÍTICAS DE SEGURIDAD
  // ==========================================

  getSecuritySettings(): SecuritySettings {
    return this.securitySettings;
  }

  updateSecuritySettings(settings: Partial<SecuritySettings>, updatedByEmail = 'admin@fusiongrafica.com.co'): SecuritySettings {
    this.securitySettings = {
      ...this.securitySettings,
      ...settings
    };
    this.saveData();

    this.addAuditLog({
      userId: 'system',
      userEmail: updatedByEmail,
      action: 'Actualización de Políticas Globales de Seguridad',
      category: 'security',
      severity: 'critical',
      ip: '181.134.92.14',
      details: 'Actualizadas directivas de contraseñas, caducidad de sesiones, control de fuerza bruta y 2FA'
    });

    return this.securitySettings;
  }
}

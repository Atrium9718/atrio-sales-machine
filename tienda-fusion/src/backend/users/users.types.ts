export type StandardRoleKey = 
  | 'SUPER_ADMIN'
  | 'ADMIN'
  | 'CONTENT_DESIGNER'
  | 'CATALOG_PRICING_MANAGER'
  | 'MARKETING_MANAGER'
  | 'PRINTER_OPERATOR'
  | 'PRODUCTION_MANAGER'
  | 'PREPRESS_DESIGNER'
  | 'LOGISTICS_DISPATCH'
  | 'SALES_AGENT'
  | 'ACCOUNTING'
  | 'CUSTOMER_B2B'
  | 'CUSTOMER';

export type UserRoleKey = StandardRoleKey | (string & {});

export type UserStatus = 'active' | 'inactive' | 'pending_invitation' | 'blocked';

export interface SystemUser {
  id: string;
  uid?: string;
  email: string;
  name: string;
  phone?: string;
  role: UserRoleKey;
  department: string;
  status: UserStatus;
  twoFactorEnabled: boolean;
  avatarColor: string;
  lastLogin: string;
  lastIp: string;
  createdAt: string;
  notes?: string;
  permissionsOverride?: string[];
}

export interface RoleDefinition {
  key: UserRoleKey;
  name: string;
  description: string;
  level: number; // 1 to 10 (10 = Super Admin)
  color: string;
  badgeBg: string;
  badgeText: string;
  isSystem: boolean;
  permissions: string[];
}

export interface PermissionModule {
  moduleId: string;
  moduleName: string;
  description: string;
  permissions: {
    key: string;
    label: string;
    description: string;
  }[];
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userEmail: string;
  action: string;
  category: 'auth' | 'users' | 'roles' | 'security' | 'orders' | 'config' | 'shipping';
  severity: 'info' | 'warning' | 'critical';
  ip: string;
  details: string;
  userAgent?: string;
}

export interface SecuritySettings {
  passwordMinLength: number;
  requireSpecialChars: boolean;
  requireNumbers: boolean;
  requireUppercase: boolean;
  sessionTimeoutMinutes: number;
  maxFailedLoginAttempts: number;
  lockoutDurationMinutes: number;
  enforce2FAForAdmins: boolean;
  allowDomainRestrictedSignups: boolean;
  allowedDomains: string[];
}

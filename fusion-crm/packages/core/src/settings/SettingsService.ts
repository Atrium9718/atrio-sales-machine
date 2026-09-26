import { PrismaClient, SettingDangerLevel } from '@prisma/client';
import { SettingsCatalog, SettingsKey, AppSettings } from '../../../contracts/src/settings';
import { z } from 'zod';

// Minimal EventEmitter for domain events (e.g., outbox)
import { EventEmitter } from 'events';
export const domainEvents = new EventEmitter();

export class SettingsService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Initializes SettingDefinitions in DB from the code catalog.
   */
  async seedDefinitions() {
    const catalogEntries = Object.values(SettingsCatalog);
    
    for (const def of catalogEntries) {
      // JSON schema representation (simplified)
      const zodSchemaJson = { type: (def.schema._def as any).typeName };

      await this.prisma.settingDefinition.upsert({
        where: { key: def.key },
        update: {
          label: def.label,
          description: def.description,
          helpText: def.helpText,
          valueType: def.valueType,
          defaultValue: def.defaultValue,
          validationSchema: zodSchemaJson,
          enumOptions: def.enumOptions,
          unit: def.unit,
          isSensitive: def.isSensitive,
          requiresRestart: def.requiresRestart,
          requiredPermission: def.requiredPermission,
          dangerLevel: def.dangerLevel as SettingDangerLevel,
          group: def.group,
        },
        create: {
          key: def.key,
          domain: def.domain,
          label: def.label,
          description: def.description,
          helpText: def.helpText,
          valueType: def.valueType,
          defaultValue: def.defaultValue,
          validationSchema: zodSchemaJson,
          enumOptions: def.enumOptions,
          unit: def.unit,
          isSensitive: def.isSensitive,
          requiresRestart: def.requiresRestart,
          requiredPermission: def.requiredPermission,
          dangerLevel: def.dangerLevel as SettingDangerLevel,
          group: def.group,
        }
      });
    }
  }

  /**
   * Gets a setting, resolving cascade (Code Default -> Org DB Override)
   */
  async getSetting<K extends SettingsKey>(
    organizationId: string, 
    key: K
  ): Promise<AppSettings[K]> {
    // 1. In a real environment, check Redis Cache first
    
    // 2. Fetch from DB
    const override = await this.prisma.settingValue.findUnique({
      where: { organizationId_key: { organizationId, key } }
    });

    const def = SettingsCatalog[key];
    
    // 3. Return override or default
    if (override && override.isOverridden) {
      try {
        return def.schema.parse(override.value) as AppSettings[K];
      } catch (e) {
        // If validation fails, fallback to default
        console.warn(`Invalid setting value in DB for ${key}, falling back to default`, e);
      }
    }
    return def.defaultValue as AppSettings[K];
  }

  /**
   * Mass update settings (Transactional)
   */
  async updateSettings(
    organizationId: string,
    userId: string,
    updates: { key: SettingsKey; value: any; reason?: string }[]
  ) {
    return await this.prisma.$transaction(async (tx) => {
      const results = [];
      
      for (const update of updates) {
        const def = SettingsCatalog[update.key];
        if (!def) throw new Error(`Setting not found in catalog: ${update.key}`);

        if (def.dangerLevel === 'DANGEROUS' && !update.reason) {
          throw new Error(`Reason is required for dangerous setting: ${update.key}`);
        }

        // 1. Zod Validation before write
        const validatedValue = def.schema.parse(update.value);

        // 2. Fetch previous
        const existing = await tx.settingValue.findUnique({
          where: { organizationId_key: { organizationId, key: update.key } }
        });
        const previousValue = existing?.value ?? def.defaultValue;

        // 3. Write SettingValue
        const settingDef = await tx.settingDefinition.findUnique({ where: { key: update.key } });
        if(!settingDef) throw new Error("Run seedDefinitions first");

        await tx.settingValue.upsert({
          where: { organizationId_key: { organizationId, key: update.key } },
          update: { value: validatedValue, isOverridden: true },
          create: {
            organizationId,
            key: update.key,
            definitionId: settingDef.id,
            value: validatedValue,
            isOverridden: true
          }
        });

        // 4. Record Audit Change
        const change = await tx.settingChange.create({
          data: {
            organizationId,
            key: update.key,
            previousValue: def.isSensitive ? { redacted: true } : previousValue,
            newValue: def.isSensitive ? { redacted: true } : validatedValue,
            changedById: userId,
            reason: update.reason,
            ip: '0.0.0.0', // Context from request
            userAgent: 'system',
          }
        });
        
        results.push(change);
        
        // 5. Outbox Event
        domainEvents.emit('configuracion.cambiada', {
          organizationId,
          key: update.key,
          changeId: change.id
        });
      }
      return results;
    });
  }

  async revertSettingChange(organizationId: string, changeId: string, userId: string) {
    const change = await this.prisma.settingChange.findUniqueOrThrow({ where: { id: changeId } });
    if(change.organizationId !== organizationId) throw new Error('Unauthorized');

    return await this.updateSettings(organizationId, userId, [{
      key: change.key as SettingsKey,
      value: change.previousValue,
      reason: `Reverting change ${changeId}`
    }]);
  }
}

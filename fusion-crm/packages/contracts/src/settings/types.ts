import { z } from "zod";
import { SettingDomain, SettingValueType, SettingDangerLevel } from "@prisma/client";

export interface SettingDefinitionInput<T = any> {
  key: string;
  domain: SettingDomain;
  label: string;
  description: string;
  helpText?: string;
  valueType: SettingValueType;
  schema: z.ZodType<T>;
  defaultValue: T;
  enumOptions?: { label: string; value: string }[];
  unit?: string;
  isSensitive?: boolean;
  requiresRestart?: boolean;
  requiredPermission?: string;
  dangerLevel?: SettingDangerLevel;
  order?: number;
  group?: string;
}

export function defineSetting<T>(def: SettingDefinitionInput<T>) {
  return {
    ...def,
    isSensitive: def.isSensitive ?? false,
    requiresRestart: def.requiresRestart ?? false,
    requiredPermission: def.requiredPermission ?? "settings:update",
    dangerLevel: def.dangerLevel ?? "SAFE",
    order: def.order ?? 0,
  };
}

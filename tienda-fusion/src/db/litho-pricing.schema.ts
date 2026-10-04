import { pgTable, serial, text, decimal, timestamp, jsonb, boolean } from 'drizzle-orm/pg-core';

export const lithoCostParameters = pgTable('litho_cost_parameters', {
  id: serial('id').primaryKey(),
  category: text('category').notNull(), // 'ctp', 'paper', 'press_setup', 'press_run', 'finishes', 'binding', 'editorial', 'margins'
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  description: text('description'),
  unitType: text('unit_type').notNull(), // 'plancha', 'kg', 'tiro_pliego', 'fijo_montaje', 'pagina', 'unidad_libro', 'porcentaje'
  costValue: decimal('cost_value', { precision: 12, scale: 2 }).notNull(),
  extraConfig: jsonb('extra_config'),
  active: boolean('active').default(true).notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

import { Injectable, NotFoundException } from '@nestjs/common';
import { db } from '../../db';
import { designTemplates } from '../../db/schema';
import { eq } from 'drizzle-orm';

@Injectable()
export class AdminTemplatesService {
  async getAll() {
    return await db.select().from(designTemplates).orderBy(designTemplates.id);
  }

  async create(data: any) {
    const result = await db.insert(designTemplates).values({
      name: data.name,
      canvasData: data.canvasData || {},
      active: data.active,
    }).returning();
    return result[0];
  }

  async update(id: number, data: any) {
    const result = await db.update(designTemplates).set({
      name: data.name,
      canvasData: data.canvasData,
      active: data.active,
    }).where(eq(designTemplates.id, id)).returning();
    return result[0];
  }

  async delete(id: number) {
    await db.delete(designTemplates).where(eq(designTemplates.id, id));
    return { success: true };
  }
}

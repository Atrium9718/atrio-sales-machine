import { Injectable } from '@nestjs/common';
import { db } from '../../db';
import { marketingCampaigns, channels, automations, audiences } from '../../db/schema';
import { eq, desc } from 'drizzle-orm';

@Injectable()
export class AdminMarketingService {
  async getCampaigns() {
    const data = await db.select().from(marketingCampaigns).orderBy(desc(marketingCampaigns.createdAt));
    return data.length ? data : [];
  }

  async getChannels() {
    const data = await db.select().from(channels);
    return data.length ? data : [];
  }

  async getAutomations() {
    const data = await db.select().from(automations);
    return data.length ? data : [];
  }

  async getAudiences() {
    const data = await db.select().from(audiences);
    return data.length ? data : [];
  }
}

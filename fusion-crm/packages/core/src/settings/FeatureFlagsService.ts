import { PrismaClient, FeatureFlagStatus } from '@prisma/client';
import { domainEvents } from './SettingsService';

export class FeatureFlagsService {
  constructor(private prisma: PrismaClient) {}

  async listFlags(organizationId: string) {
    return await this.prisma.featureFlag.findMany({
      where: { organizationId },
      orderBy: { key: 'asc' }
    });
  }

  async upsertFlag(organizationId: string, data: { key: string, name: string, description?: string, status: FeatureFlagStatus, killSwitch?: boolean }) {
    const flag = await this.prisma.featureFlag.upsert({
      where: { organizationId_key: { organizationId, key: data.key } },
      update: {
        name: data.name,
        description: data.description,
        status: data.status,
        killSwitch: data.killSwitch
      },
      create: {
        organizationId,
        key: data.key,
        name: data.name,
        description: data.description,
        status: data.status,
        killSwitch: data.killSwitch ?? false
      }
    });

    if (flag.status === 'ON') {
      domainEvents.emit('bandera.activada', { flag });
    } else if (flag.status === 'OFF') {
      domainEvents.emit('bandera.desactivada', { flag });
    }

    return flag;
  }
}

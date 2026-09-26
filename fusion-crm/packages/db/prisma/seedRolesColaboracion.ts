import { PrismaClient } from '@prisma/client';
import { SEED_ROLE_COLLABORATION_PERMISSIONS } from '../../core/src/auth/permissions';

const prisma = new PrismaClient();
const DEFAULT_ORG_ID = 'DEFAULT_ORG';

export async function seedCollaborationRoles(orgId: string = DEFAULT_ORG_ID) {
  console.log(`[Seed] Actualizando permisos de colaboración para roles en org: ${orgId}...`);

  const rolesToSeed = [
    {
      key: 'admin',
      name: 'Administrador General',
      description: 'Acceso total a todos los módulos y funciones del sistema',
      isSystem: true,
      collabPermissions: SEED_ROLE_COLLABORATION_PERMISSIONS.admin,
    },
    {
      key: 'gerencia',
      name: 'Gerencia y Dirección',
      description: 'Acceso estratégico a todos los módulos y colaboración (salvo exportación de chat)',
      isSystem: true,
      collabPermissions: SEED_ROLE_COLLABORATION_PERMISSIONS.gerencia,
    },
    {
      key: 'comercial',
      name: 'Equipo Comercial',
      description: 'Gestión de ventas, clientes, cotizaciones y herramientas de colaboración comercial',
      isSystem: true,
      collabPermissions: SEED_ROLE_COLLABORATION_PERMISSIONS.comercial,
    },
    {
      key: 'produccion',
      name: 'Líderes de Producción',
      description: 'Supervisión de planta, órdenes de producción y métricas de equipo',
      isSystem: true,
      collabPermissions: SEED_ROLE_COLLABORATION_PERMISSIONS.produccion,
    },
    {
      key: 'planta',
      name: 'Operarios de Planta',
      description: 'Operación en planta, registro de tiempos, chat y asistencia a llamadas',
      isSystem: true,
      collabPermissions: SEED_ROLE_COLLABORATION_PERMISSIONS.planta,
    },
    {
      key: 'lectura',
      name: 'Solo Lectura',
      description: 'Consulta básica de tableros, anuncios y chat general',
      isSystem: true,
      collabPermissions: SEED_ROLE_COLLABORATION_PERMISSIONS.lectura,
    },
  ];

  for (const roleDef of rolesToSeed) {
    const existing = await prisma.role.findUnique({
      where: {
        organizationId_key: {
          organizationId: orgId,
          key: roleDef.key,
        },
      },
    });

    if (existing) {
      // Fusionar permisos existentes con los nuevos de colaboración evitando duplicados
      const mergedPermissions = Array.from(
        new Set([...existing.permissions, ...roleDef.collabPermissions])
      );

      await prisma.role.update({
        where: { id: existing.id },
        data: {
          permissions: mergedPermissions,
        },
      });
      console.log(`  ✓ Rol '${roleDef.key}' actualizado con ${mergedPermissions.length} permisos.`);
    } else {
      await prisma.role.create({
        data: {
          organizationId: orgId,
          key: roleDef.key,
          name: roleDef.name,
          description: roleDef.description,
          isSystem: roleDef.isSystem,
          permissions: [...roleDef.collabPermissions],
        },
      });
      console.log(`  ✓ Rol '${roleDef.key}' creado con ${roleDef.collabPermissions.length} permisos.`);
    }
  }

  console.log('[Seed] Roles de colaboración actualizados con éxito.');
}

if (process.env.RUN_SEED === 'true') {
  seedCollaborationRoles()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}

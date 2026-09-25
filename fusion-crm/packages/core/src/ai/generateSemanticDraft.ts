import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();
const orgId = 'DEFAULT_ORG';

export async function generateSemanticDraft() {
  const models = Prisma.dmmf.datamodel.models;

  for (const model of models) {
    // Only draft if it doesn't exist
    const existing = await prisma.semanticEntity.findFirst({
      where: { organizationId: orgId, entityKey: model.name }
    });

    if (!existing) {
      const entity = await prisma.semanticEntity.create({
        data: {
          organizationId: orgId,
          entityKey: model.name,
          businessName: model.name, // To be reviewed
          description: `Draft definition for ${model.name}`,
          domain: 'GENERAL',
          isApproved: false,
          fields: {
            create: model.fields
              .filter(f => f.kind === 'scalar' || f.kind === 'enum')
              .map(f => ({
                fieldKey: f.name,
                businessName: f.name,
                description: `Draft definition for ${f.name} of type ${f.type}`
              }))
          }
        }
      });
      console.log(`Created semantic draft for ${model.name} with ${model.fields.length} fields`);
    } else {
      // Check for drift (new fields)
      const existingFields = await prisma.semanticField.findMany({ where: { entityId: existing.id } });
      const existingFieldKeys = new Set(existingFields.map(f => f.fieldKey));
      
      const newFields = model.fields
        .filter(f => (f.kind === 'scalar' || f.kind === 'enum') && !existingFieldKeys.has(f.name));
        
      if (newFields.length > 0) {
        console.log(`Drift detected in ${model.name}. Adding ${newFields.length} new fields to draft.`);
        await prisma.semanticField.createMany({
          data: newFields.map(f => ({
            entityId: existing.id,
            fieldKey: f.name,
            businessName: f.name,
            description: `[DRIFT] Draft definition for new field ${f.name} of type ${f.type}`
          }))
        });
        
        // Unapprove to force human review again
        await prisma.semanticEntity.update({
          where: { id: existing.id },
          data: { isApproved: false }
        });
      }
    }
  }
}

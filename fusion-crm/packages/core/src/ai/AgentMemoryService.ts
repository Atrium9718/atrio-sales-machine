import { PrismaClient, AgentMemoryScope, AgentMemorySource } from '@prisma/client';
import { AiProvider } from './types';

export class AgentMemoryService {
  constructor(
    private prisma: PrismaClient,
    private aiProvider: AiProvider
  ) {}

  async addMemory(
    organizationId: string, 
    agentId: string, 
    scope: AgentMemoryScope, 
    key: string, 
    value: any, 
    source: AgentMemorySource = 'STATED',
    sourceRunId?: string,
    scopeRef?: string
  ) {
    const textToEmbed = typeof value === 'string' ? value : JSON.stringify(value);
    
    // We only embed if there's textual value that makes sense to embed
    let embeddingVector: number[] = [];
    try {
      const embeddings = await this.aiProvider.embed([textToEmbed]);
      if (embeddings.length > 0) {
        embeddingVector = embeddings[0];
      }
    } catch (e) {
      console.warn('Failed to embed memory', e);
    }

    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1); // 12 months expiry

    // Since we use pgvector Unsupported('vector'), we must use raw SQL to insert
    if (embeddingVector.length > 0) {
      const vectorString = `[${embeddingVector.join(',')}]`;
      await this.prisma.$executeRaw`
        INSERT INTO "AgentMemory" (
          "id", "organizationId", "agentId", "scope", "scopeRef", 
          "key", "value", "source", "sourceRunId", "expiresAt", "updatedAt", "embedding"
        ) VALUES (
          gen_random_uuid()::text, ${organizationId}, ${agentId}, ${scope}::"AgentMemoryScope", ${scopeRef},
          ${key}, ${value}::jsonb, ${source}::"AgentMemorySource", ${sourceRunId}, ${expiresAt}, now(), ${vectorString}::vector
        )
      `;
    } else {
      await this.prisma.agentMemory.create({
        data: {
          organizationId,
          agentId,
          scope,
          scopeRef,
          key,
          value,
          source,
          sourceRunId,
          expiresAt
        }
      });
    }
  }

  async searchMemories(organizationId: string, agentId: string, query: string, limit = 5) {
    let queryVector: number[] = [];
    try {
      const embeddings = await this.aiProvider.embed([query]);
      if (embeddings.length > 0) {
        queryVector = embeddings[0];
      }
    } catch (e) {
       console.warn('Failed to embed query', e);
    }

    if (queryVector.length > 0) {
       const vectorString = `[${queryVector.join(',')}]`;
       // pgvector cosine distance `<=>`
       const results: any[] = await this.prisma.$queryRaw`
         SELECT "id", "key", "value", "confidence", "source", "scope", "scopeRef",
                1 - ("embedding" <=> ${vectorString}::vector) as similarity
         FROM "AgentMemory"
         WHERE "organizationId" = ${organizationId} 
           AND "agentId" = ${agentId}
           AND "expiresAt" > now()
           AND "embedding" IS NOT NULL
         ORDER BY "embedding" <=> ${vectorString}::vector
         LIMIT ${limit}
       `;
       return results.filter(r => r.similarity > 0.7); // Threshold
    }
    
    return [];
  }
}

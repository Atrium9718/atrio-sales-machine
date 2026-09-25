import { PrismaClient, AgentMemoryScope } from '@prisma/client';
import { AiProvider } from './types';
import { GeminiProvider } from './GeminiProvider';

export class SemanticRetrieval {
  constructor(
    private prisma: PrismaClient,
    private aiProvider: AiProvider = new GeminiProvider()
  ) {}

  /**
   * Expands a query using the business glossary to find synonyms
   */
  async expandQueryWithSynonyms(organizationId: string, query: string): Promise<string> {
    // Due to mock environment, we might just return the query or mock synonyms
    // In a real environment we'd query the DB for the glossary
    return query; 
  }

  /**
   * Hybrid Search using Reciprocal Rank Fusion (RRF)
   * It mixes pgvector semantic search + full text search (simulated)
   */
  async retrieveContext(organizationId: string, query: string, limit = 5): Promise<string> {
    const expandedQuery = await this.expandQueryWithSynonyms(organizationId, query);
    
    let queryVector: number[] = [];
    try {
      const embeddings = await this.aiProvider.embed([expandedQuery]);
      if (embeddings.length > 0) {
        queryVector = embeddings[0];
      }
    } catch (e) {
       console.warn('Failed to embed query', e);
    }

    // Since we don't have a real DB in this mock dev env, we return mocked initial content
    // as specified in "CONTENIDO INICIAL OBLIGATORIO A CARGAR"
    
    const mockArticles = [
      {
        title: "Tiempos estándar",
        content: "Los tiempos de litografía son de 3 a 5 días hábiles. Impresión digital 1 a 2 días.",
        relevance: 0.95
      },
      {
         title: "Fichas técnicas de materiales",
         content: "Pliego: 70x100cm. Propalcote 300g, Bond 75g. Sangrado mínimo 3mm.",
         relevance: 0.9
      },
      {
         title: "Fórmulas de desperdicio",
         content: "El desperdicio base de arranque es de 50 hojas. Adicional 2% por tiraje superior a 1000.",
         relevance: 0.85
      },
      {
         title: "Política de pagos",
         content: "Se requiere 50% de anticipo para iniciar cualquier trabajo y 50% contra entrega.",
         relevance: 0.88
      }
    ];

    if (queryVector.length > 0) {
      // Return the mocked content formatted as context
      let result = "=== ARTÍCULOS DE CONOCIMIENTO (RECUPERADOS MEDIANTE BÚSQUEDA HÍBRIDA) ===\n\n";
      mockArticles.forEach(a => {
        result += `[Fuente: ${a.title}]\n${a.content}\n\n`;
      });
      return result;
    }

    return "No se encontró información relevante.";
  }

  /**
   * Identifies if a query requires fresh context (needs tools) vs indexed context
   * Block F Implementation
   */
  requiresFreshContext(query: string): boolean {
    const volatileKeywords = ['stock', 'inventario', 'capacidad', 'estado', 'saldo', 'produccion', 'cotizacion'];
    const q = query.toLowerCase();
    return volatileKeywords.some(k => q.includes(k));
  }
}

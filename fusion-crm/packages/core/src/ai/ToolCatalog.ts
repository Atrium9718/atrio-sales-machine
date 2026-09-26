import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { Type } from '@google/genai';

export interface ToolDefinition<T extends z.ZodTypeAny = z.ZodTypeAny, R = any> {
  key: string;
  name: string;
  description: string;
  inputSchema: T;
  outputSchema?: z.ZodTypeAny; // Optional for execution, good for docs
  requiredPermission?: string;
  isWrite: boolean;
  estimatedCostCop: number;
  execute: (input: z.infer<T>, context: ToolContext) => Promise<R>;
}

export interface ToolContext {
  organizationId: string;
  userId: string;
  agentId: string;
  runId: string;
  can: (permission: string) => Promise<boolean>;
}

export class ToolCatalog {
  private tools = new Map<string, ToolDefinition>();

  register<T extends z.ZodTypeAny = z.ZodTypeAny>(tool: ToolDefinition<T>) {
    this.tools.set(tool.key, tool);
  }

  get(key: string): ToolDefinition | undefined {
    return this.tools.get(key);
  }

  getAllAllowed(permissions: string[]): ToolDefinition[] {
    // In a real app, evaluate the user's actual permissions against tool.requiredPermission
    // For now, return all or implement basic matching.
    return Array.from(this.tools.values()).filter(t => !t.requiredPermission || permissions.includes(t.requiredPermission));
  }

  toGeminiDeclarations(toolKeys: string[]) {
    return toolKeys.map(key => {
      const tool = this.tools.get(key);
      if (!tool) throw new Error(`Tool ${key} not found`);
      
      const jsonSchema = zodToJsonSchema(tool.inputSchema as any, { target: 'jsonSchema7' }) as any;
      
      // Gemini expects 'type' as uppercase string like 'OBJECT'
      const convertType = (schema: any): any => {
         if (!schema) return schema;
         const typeMap: Record<string, any> = {
           'object': Type.OBJECT,
           'string': Type.STRING,
           'number': Type.NUMBER,
           'integer': Type.INTEGER,
           'boolean': Type.BOOLEAN,
           'array': Type.ARRAY
         };
         
         const converted = { ...schema };
         if (converted.type) {
           converted.type = typeMap[converted.type] || Type.STRING;
         }
         
         if (converted.properties) {
           for (const [k, v] of Object.entries(converted.properties)) {
             converted.properties[k] = convertType(v);
           }
         }
         
         if (converted.items) {
           converted.items = convertType(converted.items);
         }
         
         // Remove unsupported JSON schema keywords for Gemini
         delete converted.$schema;
         delete converted.additionalProperties;
         
         return converted;
      };

      return {
        name: tool.key,
        description: tool.description,
        parameters: convertType(jsonSchema)
      };
    });
  }
}

export const globalToolCatalog = new ToolCatalog();

/**
 * Markdown Limitado, Sanitización y Extracción de Entidades y Menciones (Etapa 15.5)
 */

export interface ParsedMentions {
  mentionedUserIds: string[];
  mentionsEveryone: boolean;
  mentionsChannel: boolean;
  mentionsHere: boolean;
}

export interface ExtractedEntityLink {
  raw: string;
  type?: 'CLIENT' | 'QUOTE' | 'PRODUCTION_PROJECT';
  code: string;
}

/**
 * Escapa caracteres HTML para evitar XSS
 */
export function escapeHtml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Convierte markdown enriquecido a texto plano limpio (bodyPlain)
 * para búsqueda de texto completo y notificaciones sin formato.
 */
export function markdownToPlainText(markdown: string): string {
  if (!markdown) return '';
  let plain = markdown
    // Quitar bloques de código
    .replace(/```[\s\S]*?```/g, '')
    // Quitar código en línea
    .replace(/`([^`]+)`/g, '$1')
    // Quitar negrita y cursiva
    .replace(/(\*\*|__)(.*?)\1/g, '$2')
    .replace(/(\*|_)(.*?)\1/g, '$2')
    // Quitar enlaces manteniendo el texto
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Quitar listas
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '')
    // Quitar encabezados
    .replace(/^#{1,6}\s+/gm, '')
    // Quitar etiquetas HTML residuales
    .replace(/<[^>]*>/g, '')
    // Normalizar espacios
    .replace(/\s+/g, ' ')
    .trim();

  return plain;
}

/**
 * Convierte markdown limitado a HTML seguro y sanitizado:
 * - Negrita: **texto**
 * - Cursiva: *texto* o _texto_
 * - Código: `código` y ```bloque```
 * - Enlaces: [texto](url) — solo protocolos http/https
 * - Listas: - item o * item
 * - Menciones: @usuario, @canal, @aquí
 * - Enlaces a entidades CRM: #CLI-..., #COT-..., #PRJ-...
 */
export function renderLimitedMarkdown(markdown: string): string {
  if (!markdown) return '';

  // 1. Escapar todo HTML crudo
  let safe = escapeHtml(markdown);

  // 2. Bloques de código preformateado (```code```)
  safe = safe.replace(/```([a-zA-Z0-9_-]*)\n?([\s\S]*?)```/g, (_match, _lang, code) => {
    return `<pre class="chat-code-block bg-muted/80 p-2.5 rounded-md font-mono text-xs overflow-x-auto my-1.5 border border-border"><code>${code.trim()}</code></pre>`;
  });

  // 3. Código en línea (`code`)
  safe = safe.replace(/`([^`]+)`/g, '<code class="bg-muted px-1.5 py-0.5 rounded font-mono text-xs text-primary border border-border/50">$1</code>');

  // 4. Negrita (**texto**)
  safe = safe.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold text-foreground">$1</strong>');

  // 5. Cursiva (*texto* o _texto_)
  safe = safe.replace(/(?:^|[^\w])\*([^*]+)\*(?=[^\w]|$)/g, ' <em class="italic">$1</em> ');
  safe = safe.replace(/(?:^|[^\w])_([^_]+)_(?=[^\w]|$)/g, ' <em class="italic">$1</em> ');

  // 6. Enlaces ([texto](url)) seguros (solo http / https)
  safe = safe.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, (_match, text, url) => {
    return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-primary underline hover:text-primary/80 transition-colors inline-flex items-center gap-0.5">${text}</a>`;
  });

  // 7. Listas con viñetas (- item o * item)
  const lines = safe.split('\n');
  const formattedLines: string[] = [];
  let inList = false;

  for (const line of lines) {
    const listMatch = line.match(/^(\s*)[-*]\s+(.*)$/);
    if (listMatch) {
      if (!inList) {
        formattedLines.push('<ul class="list-disc list-inside space-y-1 my-1 text-sm pl-1">');
        inList = true;
      }
      formattedLines.push(`<li>${listMatch[2]}</li>`);
    } else {
      if (inList) {
        formattedLines.push('</ul>');
        inList = false;
      }
      formattedLines.push(line);
    }
  }
  if (inList) {
    formattedLines.push('</ul>');
  }
  safe = formattedLines.join('\n');

  // 8. Resaltar menciones corporativas (@canal, @aquí, @aqui)
  safe = safe.replace(/@((?:canal|aquí|aqui)\b)/gi, '<span class="inline-flex items-center font-medium bg-amber-500/15 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded text-xs">@$1</span>');

  // 9. Resaltar enlaces a entidades CRM (#CLI-..., #COT-..., #PRJ-...)
  safe = safe.replace(/#(COT-[a-zA-Z0-9-]+|PRJ-[a-zA-Z0-9-]+|CLI-[a-zA-Z0-9-]+)/gi, '<span class="inline-flex items-center gap-1 font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded text-xs cursor-pointer hover:bg-primary/20 transition-colors entity-chip" data-entity-code="$1">#$1</span>');

  // 10. Normalizar saltos de línea fuera de bloques <pre>
  safe = safe.replace(/\n/g, '<br/>');

  return safe;
}

/**
 * Extrae menciones de usuarios y menciones generales (@canal, @aquí)
 */
export function extractMentions(
  text: string,
  userDirectory: { id: string; name: string; email?: string }[] = []
): ParsedMentions {
  if (!text) {
    return {
      mentionedUserIds: [],
      mentionsEveryone: false,
      mentionsChannel: false,
      mentionsHere: false,
    };
  }

  const mentionsChannel = /@canal\b/i.test(text);
  const mentionsHere = /@(aquí|aqui)\b/i.test(text);
  const mentionsEveryone = mentionsChannel || mentionsHere;

  const mentionedUserIdsSet = new Set<string>();

  // Buscar menciones directas por @id o @nombre
  for (const user of userDirectory) {
    // Coincidencia por @ID exacto (e.g. @usr-admin)
    const idRegex = new RegExp(`@${user.id}\\b`, 'i');
    if (idRegex.test(text)) {
      mentionedUserIdsSet.add(user.id);
      continue;
    }

    // Coincidencia por primer nombre o nombre completo limpio
    const cleanName = user.name.split(' ')[0].replace(/[^a-zA-Z0-9]/g, '');
    if (cleanName && cleanName.length >= 3) {
      const nameRegex = new RegExp(`@${cleanName}\\b`, 'i');
      if (nameRegex.test(text)) {
        mentionedUserIdsSet.add(user.id);
      }
    }
  }

  return {
    mentionedUserIds: Array.from(mentionedUserIdsSet),
    mentionsEveryone,
    mentionsChannel,
    mentionsHere,
  };
}

/**
 * Extrae referencias de entidades (#COT-101, #PRJ-202, #CLI-303)
 */
export function extractEntityLinks(text: string): ExtractedEntityLink[] {
  if (!text) return [];
  const results: ExtractedEntityLink[] = [];
  const regex = /#(COT-[a-zA-Z0-9-]+|PRJ-[a-zA-Z0-9-]+|CLI-[a-zA-Z0-9-]+)/gi;
  let match;

  while ((match = regex.exec(text)) !== null) {
    const raw = match[0];
    const code = match[1].toUpperCase();
    let type: 'CLIENT' | 'QUOTE' | 'PRODUCTION_PROJECT' = 'QUOTE';
    if (code.startsWith('CLI-')) type = 'CLIENT';
    else if (code.startsWith('PRJ-')) type = 'PRODUCTION_PROJECT';
    else if (code.startsWith('COT-')) type = 'QUOTE';

    results.push({ raw, code, type });
  }

  return results;
}

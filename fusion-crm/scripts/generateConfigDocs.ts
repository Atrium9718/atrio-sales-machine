import { SettingsCatalog } from '../packages/contracts/src/settings/index';
import * as fs from 'fs';

let md = `# Catálogo de Configuración del Sistema\n\n`;
md += `Este archivo es generado automáticamente desde el catálogo tipado de código. No modificar a mano.\n\n`;

const grouped: Record<string, any[]> = {};
for (const key in SettingsCatalog) {
  const def = (SettingsCatalog as any)[key];
  if (!grouped[def.domain]) grouped[def.domain] = [];
  grouped[def.domain].push(def);
}

for (const domain in grouped) {
  md += `## Dominio: ${domain}\n\n`;
  grouped[domain].forEach(def => {
    md += `### ${def.label} (\`${def.key}\`)\n`;
    md += `- **Descripción**: ${def.description}\n`;
    if (def.helpText) md += `- **Ayuda**: ${def.helpText}\n`;
    md += `- **Tipo**: ${def.valueType}\n`;
    md += `- **Valor por Defecto**: \`${JSON.stringify(def.defaultValue)}\`\n`;
    md += `- **Nivel de Peligro**: ${def.dangerLevel}\n`;
    md += `- **Permiso Requerido**: \`${def.requiredPermission}\`\n\n`;
  });
}

fs.writeFileSync('docs/configuracion.md', md);
console.log('Documentación generada en docs/configuracion.md');

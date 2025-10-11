/**
 * Script para gerar mapeamento completo de itens do Dota 2
 * Busca da API OpenDota e gera código para items.ts
 */

import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface OpenDotaItem {
  id: number;
  dname: string;
  cost?: number;
  [key: string]: any;
}

async function generateItemMap() {
  try {
    console.log('Buscando itens da API OpenDota...');
    const response = await axios.get('https://api.opendota.com/api/constants/items');
    const items: { [key: string]: OpenDotaItem } = response.data;

    // Criar mapeamento ID -> key
    const itemMap: { [key: number]: string } = {};
    const itemNames: { [key: string]: string } = {};

    // Filtrar itens válidos (não receitas, não consumíveis básicos demais)
    const validItems = Object.entries(items).filter(([key, item]) => {
      // Ignorar receitas
      if (key.startsWith('recipe_')) return false;
      // Ignorar itens sem ID
      if (!item.id) return false;
      // Ignorar itens sem nome
      if (!item.dname) return false;

      return true;
    });

    // Ordenar por ID para facilitar visualização
    validItems.sort((a, b) => a[1].id - b[1].id);

    // Construir mapeamentos
    for (const [key, item] of validItems) {
      itemMap[item.id] = key;
      itemNames[key] = item.dname;
    }

    // Gerar código TypeScript
    const itemMapCode = `// Mapeamento completo de itens do Dota 2
// Gerado automaticamente via scripts/generateItemMap.ts
// IDs da API OpenDota
export const ITEM_MAP: { [key: number]: string } = ${JSON.stringify(itemMap, null, 2)};

export const ITEM_NAMES: { [key: string]: string } = ${JSON.stringify(itemNames, null, 2)};

// Tags de itens para lógica situacional
export interface ItemTags {
  armorReduction?: boolean;
  silence?: boolean;
  dispel?: boolean;
  magicImmunity?: boolean;
  mobility?: boolean;
  damage?: boolean;
  survival?: boolean;
  heal?: boolean;
  manaRegen?: boolean;
  disableEvasion?: boolean;
}

export const ITEM_TAGS: { [itemName: string]: ItemTags } = {
  black_king_bar: { magicImmunity: true, survival: true },
  sphere: { survival: true },
  blink: { mobility: true },
  silver_edge: { mobility: true, damage: true },
  orchid: { silence: true, damage: true },
  bloodthorn: { silence: true, damage: true, disableEvasion: true },
  nullifier: { dispel: true },
  mask_of_madness: { damage: true },
  assault: { armorReduction: true, damage: true },
  desolator: { armorReduction: true, damage: true },
  solar_crest: { armorReduction: true },
  shivas_guard: { armorReduction: true },
  heart: { survival: true, heal: true },
  satanic: { survival: true, heal: true },
  mjollnir: { damage: true },
  daedalus: { damage: true },
  monkey_king_bar: { damage: true, disableEvasion: true },
  overwhelming_blink: { mobility: true, damage: true },
  swift_blink: { mobility: true, damage: true },
  arcane_blink: { mobility: true, manaRegen: true },
  manta: { dispel: true, damage: true },
  lotus_orb: { dispel: true, survival: true },
  euls: { dispel: true },
  pipe: { survival: true },
  crimson_guard: { survival: true },
  blade_mail: { survival: true },
};

export function getItemName(itemId: number): string {
  const key = ITEM_MAP[itemId];
  return key ? ITEM_NAMES[key] || key : \`item_\${itemId}\`;
}
`;

    // Salvar arquivo
    const outputPath = path.join(__dirname, '..', 'src', 'utils', 'items.ts');
    fs.writeFileSync(outputPath, itemMapCode, 'utf-8');

    console.log(`✅ Mapeamento gerado com sucesso!`);
    console.log(`📊 Total de itens: ${Object.keys(itemMap).length}`);
    console.log(`📁 Arquivo salvo em: ${outputPath}`);

    // Mostrar alguns exemplos
    console.log('\n📋 Primeiros 10 itens:');
    Object.entries(itemMap).slice(0, 10).forEach(([id, key]) => {
      console.log(`  ${id}: ${key} (${itemNames[key]})`);
    });
  } catch (error) {
    console.error('❌ Erro ao gerar mapeamento:', error);
    process.exit(1);
  }
}

generateItemMap();

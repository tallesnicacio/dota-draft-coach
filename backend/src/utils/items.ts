// Mapeamento de itens importantes do Dota 2
// IDs da API OpenDota
export const ITEM_MAP: { [key: number]: string } = {
  1: 'blink',
  2: 'blades_of_attack',
  3: 'broadsword',
  4: 'chainmail',
  5: 'claymore',
  36: 'magic_stick',
  37: 'magic_wand',
  40: 'tango',
  41: 'bottle',
  42: 'ward_observer',
  43: 'ward_sentry',
  44: 'clarity',
  45: 'enchanted_mango',
  46: 'boots',
  48: 'power_treads',
  50: 'phase_boots',
  63: 'black_king_bar',
  102: 'mask_of_madness',
  108: 'orchid',
  110: 'sphere',
  116: 'echo_sabre',
  117: 'glimmer_cape',
  123: 'aether_lens',
  131: 'hurricane_pike',
  134: 'silver_edge',
  135: 'bloodthorn',
  137: 'kaya',
  139: 'trident',
  141: 'nullifier',
  143: 'aeon_disk',
  145: 'kaya_and_sange',
  149: 'wind_waker',
  156: 'arcane_blink',
  158: 'aghanims_shard',
  162: 'overwhelming_blink',
  163: 'swift_blink',
  168: 'disperser',
  235: 'travel_boots',
  236: 'travel_boots_2',
  1466: 'guardian_greaves',
};

export const ITEM_NAMES: { [key: string]: string } = {
  blink: 'Blink Dagger',
  black_king_bar: 'Black King Bar',
  sphere: "Linken's Sphere",
  orchid: 'Orchid Malevolence',
  bloodthorn: 'Bloodthorn',
  mask_of_madness: 'Mask of Madness',
  power_treads: 'Power Treads',
  phase_boots: 'Phase Boots',
  magic_wand: 'Magic Wand',
  bottle: 'Bottle',
  echo_sabre: 'Echo Sabre',
  glimmer_cape: 'Glimmer Cape',
  aether_lens: 'Aether Lens',
  hurricane_pike: 'Hurricane Pike',
  silver_edge: 'Silver Edge',
  kaya: 'Kaya',
  trident: 'Kaya and Sange',
  nullifier: 'Nullifier',
  aeon_disk: 'Aeon Disk',
  wind_waker: 'Wind Waker',
  arcane_blink: 'Arcane Blink',
  aghanims_shard: "Aghanim's Shard",
  overwhelming_blink: 'Overwhelming Blink',
  swift_blink: 'Swift Blink',
  disperser: 'Disperser',
  travel_boots: 'Boots of Travel',
  guardian_greaves: 'Guardian Greaves',
};

// Tags de itens para lógica situacional
export interface ItemTags {
  armorReduction?: boolean;
  silence?: boolean;
  dispel?: boolean;
  magicImmunity?: boolean;
  mobility?: boolean;
  damage?: boolean;
  survival?: boolean;
}

export const ITEM_TAGS: { [itemName: string]: ItemTags } = {
  black_king_bar: { magicImmunity: true, survival: true },
  sphere: { survival: true },
  blink: { mobility: true },
  silver_edge: { mobility: true, damage: true },
  orchid: { silence: true, damage: true },
  bloodthorn: { silence: true, damage: true },
  nullifier: { dispel: true },
  mask_of_madness: { damage: true },
};

export function getItemName(itemId: number): string {
  const key = ITEM_MAP[itemId];
  return key ? ITEM_NAMES[key] || key : `item_${itemId}`;
}

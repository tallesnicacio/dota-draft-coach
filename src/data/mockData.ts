import { Hero, HeroBuild } from '@/types/dota';

export const mockHeroes: Hero[] = [
  { id: 'templar-assassin', name: 'Templar Assassin', displayName: 'Templar Assassin', image: 'https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes/templar_assassin.png', primaryAttribute: 'agi' },
  { id: 'axe', name: 'Axe', displayName: 'Axe', image: 'https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes/axe.png', primaryAttribute: 'str' },
  { id: 'sniper', name: 'Sniper', displayName: 'Sniper', image: 'https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes/sniper.png', primaryAttribute: 'agi' },
  { id: 'magnus', name: 'Magnus', displayName: 'Magnus', image: 'https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes/magnataur.png', primaryAttribute: 'universal' },
  { id: 'invoker', name: 'Invoker', displayName: 'Invoker', image: 'https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes/invoker.png', primaryAttribute: 'int' },
  { id: 'pudge', name: 'Pudge', displayName: 'Pudge', image: 'https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes/pudge.png', primaryAttribute: 'str' },
  { id: 'crystal-maiden', name: 'Crystal Maiden', displayName: 'Crystal Maiden', image: 'https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes/crystal_maiden.png', primaryAttribute: 'int' },
  { id: 'phantom-assassin', name: 'Phantom Assassin', displayName: 'Phantom Assassin', image: 'https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes/phantom_assassin.png', primaryAttribute: 'agi' },
  { id: 'shadow-fiend', name: 'Shadow Fiend', displayName: 'Shadow Fiend', image: 'https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes/nevermore.png', primaryAttribute: 'agi' },
  { id: 'lion', name: 'Lion', displayName: 'Lion', image: 'https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes/lion.png', primaryAttribute: 'int' },
];

export const mockBuild: HeroBuild = {
  hero: 'Templar Assassin',
  heroImage: 'https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes/templar_assassin.png',
  patch: '7.37',
  mmrBucket: 'Ancient-Divine',
  coreBuild: {
    starting: ['Tango', '2x Iron Branch', 'Faerie Fire'],
    early: ['Wraith Band', 'Boots of Speed', 'Blight Stone'],
    mid: ['Desolator', 'Dragon Lance', 'Power Treads'],
    situational: ['Black King Bar', 'Blink Dagger', 'Hurricane Pike', 'Daedalus', 'Silver Edge', "Linken's Sphere"],
  },
  skillOrder: {
    sequence: ['Q', 'W', 'E', 'Q', 'Q', 'R', 'Q', 'W', 'Q', 'W', 'R', 'W', 'W', 'E', 'E', 'R', 'E'],
    talents: [10, 15, 20, 25],
  },
  matchups: {
    countersToMe: [
      { hero: 'Axe', heroImage: 'https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes/axe.png', winRateDelta: -6.2, note: 'Culling Blade + Counter Helix remove Refraction charges' },
      { hero: 'Viper', heroImage: 'https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes/viper.png', winRateDelta: -5.8, note: 'DoT damage bypasses Refraction' },
      { hero: 'Bristleback', heroImage: 'https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes/bristleback.png', winRateDelta: -4.5, note: 'Quill Spray removes all charges quickly' },
    ],
    goodVs: [
      { hero: 'Sniper', heroImage: 'https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes/sniper.png', winRateDelta: 5.1, note: 'Gap close com trap + burst físico' },
      { hero: 'Shadow Fiend', heroImage: 'https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes/nevermore.png', winRateDelta: 4.3, note: 'Sem controle cedo, fácil de burstar' },
      { hero: 'Drow Ranger', heroImage: 'https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes/drow_ranger.png', winRateDelta: 3.9, note: 'Refraction bloqueia ataques, trap fecha gap' },
    ],
    synergies: [
      { hero: 'Magnus', heroImage: 'https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes/magnataur.png', note: 'Empower + RP para setup perfeito' },
      { hero: 'Vengeful Spirit', heroImage: 'https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes/vengefulspirit.png', note: 'Redução de armadura + save' },
      { hero: 'Dazzle', heroImage: 'https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes/dazzle.png', note: 'Redução de armadura em área' },
    ],
  },
  confidence: 0.82,
  sampleSize: 13450,
  lastUpdated: new Date().toISOString(),
};

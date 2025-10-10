import { Hero, HeroBuild } from '@/types/dota';

export const mockHero: Hero = {
  id: '1',
  name: 'npc_dota_hero_antimage',
  displayName: 'Anti-Mage',
  image: 'https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes/antimage.png',
  primaryAttribute: 'agi',
};

export const mockHeroes: Hero[] = [
  mockHero,
  {
    id: '2',
    name: 'npc_dota_hero_axe',
    displayName: 'Axe',
    image: 'https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes/axe.png',
    primaryAttribute: 'str',
  },
  {
    id: '3',
    name: 'npc_dota_hero_crystal_maiden',
    displayName: 'Crystal Maiden',
    image: 'https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes/crystal_maiden.png',
    primaryAttribute: 'int',
  },
];

export const mockBuild: HeroBuild = {
  hero: 'Anti-Mage',
  heroImage: 'https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes/antimage.png',
  patch: '7.39e',
  mmrBucket: 'Ancient-Divine',
  coreBuild: {
    starting: ['Tango', 'Quelling Blade', 'Iron Branch'],
    early: ['Power Treads', 'Battle Fury'],
    mid: ['Manta Style', 'Black King Bar'],
    situational: ['Butterfly', 'Abyssal Blade', 'Heart of Tarrasque'],
  },
  skillOrder: {
    sequence: ['Q', 'W', 'Q', 'E', 'Q', 'R', 'Q', 'W', 'W', 'W', 'R', 'E', 'E', 'E', 'R'],
    talents: [10, 15, 20, 25],
  },
  matchups: {
    countersToMe: [
      {
        hero: 'Lion',
        heroImage: 'https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes/lion.png',
        winRateDelta: -4.5,
        note: 'Disable forte e burst damage',
      },
    ],
    goodVs: [
      {
        hero: 'Crystal Maiden',
        heroImage: 'https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes/crystal_maiden.png',
        winRateDelta: 3.2,
        note: 'Herói squishy e com baixa mobilidade',
      },
    ],
    synergies: [
      {
        hero: 'Magnus',
        heroImage: 'https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes/magnataur.png',
        note: 'Empower aumenta muito o farm',
      },
    ],
  },
  confidence: 0.85,
  sampleSize: 5000,
  lastUpdated: '2025-01-09T12:00:00Z',
};

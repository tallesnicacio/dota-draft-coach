import { useState } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Hero } from '@/types/dota';
import { mockHeroes } from '@/data/mockData';

interface HeroPickerProps {
  onSelectHero: (hero: Hero) => void;
  excludeHeroes?: string[];
}

export const HeroPicker = ({ onSelectHero, excludeHeroes = [] }: HeroPickerProps) => {
  const [search, setSearch] = useState('');

  const filteredHeroes = mockHeroes.filter(
    (hero) =>
      !excludeHeroes.includes(hero.id) &&
      hero.displayName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar herói..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 bg-secondary/50 border-border/50 focus:border-primary transition-colors"
        />
      </div>

      <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
        {filteredHeroes.map((hero) => (
          <button
            key={hero.id}
            onClick={() => onSelectHero(hero)}
            className="group relative aspect-square rounded-lg overflow-hidden border-2 border-border/30 hover:border-primary transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-primary/20"
            title={hero.displayName}
          >
            <img
              src={hero.image}
              alt={hero.displayName}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="absolute bottom-0 left-0 right-0 p-1 text-[0.6rem] text-center text-foreground font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-t from-black/90 to-transparent">
              {hero.displayName}
            </div>
          </button>
        ))}
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: hsl(var(--secondary));
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: hsl(var(--primary));
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: hsl(var(--primary) / 0.8);
        }
      `}</style>
    </div>
  );
};

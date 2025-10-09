import { X, Plus } from 'lucide-react';
import { Hero } from '@/types/dota';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { HeroPicker } from './HeroPicker';

interface TeamDraftProps {
  allies: Hero[];
  enemies: Hero[];
  onAddAlly: (hero: Hero) => void;
  onRemoveAlly: (heroId: string) => void;
  onAddEnemy: (hero: Hero) => void;
  onRemoveEnemy: (heroId: string) => void;
  excludeHeroIds: string[];
}

export const TeamDraft = ({
  allies,
  enemies,
  onAddAlly,
  onRemoveAlly,
  onAddEnemy,
  onRemoveEnemy,
  excludeHeroIds,
}: TeamDraftProps) => {
  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* Aliados */}
      <div className="glass-card rounded-xl p-6 border">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-success">Aliados ({allies.length}/4)</h3>
          <Dialog>
            <DialogTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                disabled={allies.length >= 4}
                className="border-success/50 hover:bg-success/10 hover:text-success"
              >
                <Plus className="h-4 w-4 mr-1" />
                Adicionar
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[80vh] bg-card border-border">
              <DialogHeader>
                <DialogTitle>Selecionar Aliado</DialogTitle>
              </DialogHeader>
              <HeroPicker onSelectHero={onAddAlly} excludeHeroes={excludeHeroIds} />
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-4 gap-3">
          {allies.map((hero) => (
            <div key={hero.id} className="relative group">
              <img
                src={hero.image}
                alt={hero.displayName}
                className="w-full aspect-square object-cover rounded-lg border-2 border-success/30"
              />
              <button
                onClick={() => onRemoveAlly(hero.id)}
                className="absolute -top-2 -right-2 bg-destructive hover:bg-destructive/80 text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="Remover"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
          {[...Array(4 - allies.length)].map((_, i) => (
            <div
              key={`empty-ally-${i}`}
              className="aspect-square rounded-lg border-2 border-dashed border-success/20 flex items-center justify-center"
            >
              <Plus className="h-6 w-6 text-success/30" />
            </div>
          ))}
        </div>
      </div>

      {/* Inimigos */}
      <div className="glass-card rounded-xl p-6 border">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-destructive">Inimigos ({enemies.length}/5)</h3>
          <Dialog>
            <DialogTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                disabled={enemies.length >= 5}
                className="border-destructive/50 hover:bg-destructive/10 hover:text-destructive"
              >
                <Plus className="h-4 w-4 mr-1" />
                Adicionar
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[80vh] bg-card border-border">
              <DialogHeader>
                <DialogTitle>Selecionar Inimigo</DialogTitle>
              </DialogHeader>
              <HeroPicker onSelectHero={onAddEnemy} excludeHeroes={excludeHeroIds} />
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-5 gap-3">
          {enemies.map((hero) => (
            <div key={hero.id} className="relative group">
              <img
                src={hero.image}
                alt={hero.displayName}
                className="w-full aspect-square object-cover rounded-lg border-2 border-destructive/30"
              />
              <button
                onClick={() => onRemoveEnemy(hero.id)}
                className="absolute -top-2 -right-2 bg-destructive hover:bg-destructive/80 text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="Remover"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
          {[...Array(5 - enemies.length)].map((_, i) => (
            <div
              key={`empty-enemy-${i}`}
              className="aspect-square rounded-lg border-2 border-dashed border-destructive/20 flex items-center justify-center"
            >
              <Plus className="h-6 w-6 text-destructive/30" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

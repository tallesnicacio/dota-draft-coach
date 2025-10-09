import { ItemBuild } from '@/types/dota';
import { ShoppingBag } from 'lucide-react';

interface BuildPanelProps {
  coreBuild: ItemBuild;
}

const ItemPhase = ({ title, items, color }: { title: string; items: string[]; color: string }) => (
  <div className="space-y-2">
    <h4 className={`text-sm font-semibold text-${color} flex items-center gap-2`}>
      <ShoppingBag className="h-4 w-4" />
      {title}
    </h4>
    <div className="flex flex-wrap gap-2">
      {items.map((item, idx) => (
        <div
          key={idx}
          className={`px-3 py-2 rounded-lg bg-secondary/50 border border-${color}/20 text-sm hover:border-${color}/50 transition-colors`}
        >
          {item}
        </div>
      ))}
    </div>
  </div>
);

export const BuildPanel = ({ coreBuild }: BuildPanelProps) => {
  return (
    <div className="glass-card rounded-xl p-6 border space-y-6">
      <h3 className="text-xl font-bold text-primary flex items-center gap-2">
        <ShoppingBag className="h-5 w-5" />
        Build de Itens
      </h3>

      <div className="space-y-6">
        <ItemPhase title="Inicial" items={coreBuild.starting} color="success" />
        <ItemPhase title="Early Game" items={coreBuild.early} color="accent" />
        <ItemPhase title="Mid Game" items={coreBuild.mid} color="primary" />
        <ItemPhase title="Situacionais" items={coreBuild.situational} color="warning" />
      </div>

      <div className="mt-6 p-4 rounded-lg bg-secondary/30 border border-border/50">
        <p className="text-sm text-muted-foreground">
          <strong className="text-foreground">💡 Dica:</strong> Ajuste os itens situacionais baseado na composição 
          inimiga. Contra muito controle mágico, priorize BKB. Contra kite, considere Hurricane Pike ou Blink.
        </p>
      </div>
    </div>
  );
};

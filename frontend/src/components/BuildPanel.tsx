import { ItemBuild } from '@/types/dota';
import { ShoppingBag, Coins } from 'lucide-react';
import { getItemByName } from '@/constants/items';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface BuildPanelProps {
  coreBuild: ItemBuild;
}

const ItemPhase = ({ title, items, color }: { title: string; items: string[]; color: string }) => (
  <div className="space-y-2">
    <h4 className={`text-sm font-semibold text-${color} flex items-center gap-2`}>
      <ShoppingBag className="h-4 w-4" />
      {title}
    </h4>
    <TooltipProvider>
      <div className="flex flex-wrap gap-2">
        {items.map((itemName, idx) => {
          const itemInfo = getItemByName(itemName);
          const hasDetails = itemInfo && (itemInfo.cost || itemInfo.stats || itemInfo.description);

          const itemCard = (
            <div
              className={`group relative px-3 py-2 rounded-lg bg-secondary/50 border border-${color}/20 text-sm hover:border-${color}/50 transition-all hover:scale-105 cursor-pointer`}
            >
              <div className="flex items-center gap-2">
                {itemInfo && (
                  <img
                    src={itemInfo.image}
                    alt={itemName}
                    className="w-8 h-6 object-contain"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                )}
                <span className="text-xs">{itemName}</span>
              </div>
            </div>
          );

          if (hasDetails && itemInfo) {
            return (
              <Tooltip key={idx}>
                <TooltipTrigger asChild>
                  {itemCard}
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <div className="space-y-2">
                    <div className="font-bold text-sm border-b pb-1">{itemName}</div>
                    {itemInfo.cost && (
                      <div className="flex items-center gap-1 text-xs text-yellow-500">
                        <Coins className="w-3 h-3" />
                        <span>{itemInfo.cost} gold</span>
                      </div>
                    )}
                    {itemInfo.stats && itemInfo.stats.length > 0 && (
                      <div className="text-xs space-y-0.5">
                        {itemInfo.stats.map((stat, i) => (
                          <div key={i} className="text-green-400">+ {stat}</div>
                        ))}
                      </div>
                    )}
                    {itemInfo.description && (
                      <div className="text-xs text-muted-foreground italic">
                        {itemInfo.description}
                      </div>
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>
            );
          }

          return <div key={idx}>{itemCard}</div>;
        })}
      </div>
    </TooltipProvider>
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

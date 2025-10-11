import { ItemBuild } from '@/types/dota';
import { ShoppingBag, Coins, CheckCircle2, Target } from 'lucide-react';
import { getItemByName } from '@/constants/items';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { EnhancedItemBuild } from '@/services/recommendationFusion';

interface BuildPanelProps {
  coreBuild: ItemBuild | EnhancedItemBuild;
}

const ItemPhase = ({
  title,
  items,
  color,
  ownedItems = [],
  nextItem = null
}: {
  title: string;
  items: string[];
  color: string;
  ownedItems?: string[];
  nextItem?: string | null;
}) => (
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
          const isOwned = ownedItems.includes(itemName);
          const isNext = nextItem === itemName;

          const itemCard = (
            <div
              className={`group relative px-3 py-2 rounded-lg bg-secondary/50 border text-sm hover:scale-105 cursor-pointer transition-all
                ${isOwned ? 'border-green-500/70 bg-green-500/10' : `border-${color}/20 hover:border-${color}/50`}
                ${isNext ? 'ring-2 ring-yellow-500/50 border-yellow-500' : ''}
              `}
            >
              <div className="flex items-center gap-2">
                {isOwned && <CheckCircle2 className="h-3 w-3 text-green-500" />}
                {isNext && <Target className="h-3 w-3 text-yellow-500" />}
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
  // Type guard to check if it's an enhanced build
  const isEnhanced = (build: ItemBuild | EnhancedItemBuild): build is EnhancedItemBuild => {
    return 'ownedItems' in build;
  };

  const enhanced = isEnhanced(coreBuild) ? coreBuild : null;

  return (
    <div className="glass-card rounded-xl p-6 border space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-primary flex items-center gap-2">
          <ShoppingBag className="h-5 w-5" />
          Build de Itens
        </h3>

        {enhanced && enhanced.currentGold > 0 && (
          <div className="flex items-center gap-2 text-sm">
            <Coins className="h-4 w-4 text-yellow-500" />
            <span className="text-yellow-500 font-bold">{enhanced.currentGold.toLocaleString()}</span>
            <span className="text-muted-foreground">gold</span>
          </div>
        )}
      </div>

      {enhanced && enhanced.nextItem && (
        <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Target className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-sm font-semibold text-yellow-500">Próximo item</p>
                <p className="text-lg font-bold">{enhanced.nextItem}</p>
              </div>
            </div>
            {enhanced.goldNeeded > 0 && (
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Faltam</p>
                <p className="text-lg font-bold text-yellow-500">
                  {enhanced.goldNeeded.toLocaleString()}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="space-y-6">
        <ItemPhase
          title="Inicial"
          items={coreBuild.starting}
          color="success"
          ownedItems={enhanced?.ownedItems}
          nextItem={enhanced?.nextItem}
        />
        <ItemPhase
          title="Early Game"
          items={coreBuild.early}
          color="accent"
          ownedItems={enhanced?.ownedItems}
          nextItem={enhanced?.nextItem}
        />
        <ItemPhase
          title="Mid Game"
          items={coreBuild.mid}
          color="primary"
          ownedItems={enhanced?.ownedItems}
          nextItem={enhanced?.nextItem}
        />
        <ItemPhase
          title="Situacionais"
          items={coreBuild.situational}
          color="warning"
          ownedItems={enhanced?.ownedItems}
          nextItem={enhanced?.nextItem}
        />
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

import { useLiveStore } from '@/store/liveStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  ShoppingCart,
  Star,
  ArrowRight,
  DollarSign,
  Package,
  AlertCircle,
} from 'lucide-react';

/**
 * ItemRecommendationPanel - AI-powered item recommendations
 *
 * Shows next item to buy, alternatives, and sell recommendations
 */
export function ItemRecommendationPanel() {
  const recommendations = useLiveStore((state) => state.recommendations);
  const snapshot = useLiveStore((state) => state.snapshot);
  const isConnected = useLiveStore((state) => state.status === 'connected');

  if (!isConnected || !recommendations?.itemRecommendation) {
    return null;
  }

  const itemRec = recommendations.itemRecommendation;
  const currentGold = snapshot?.player?.gold || 0;

  // Priority color mapping
  const priorityColor = {
    core: 'default',
    luxury: 'secondary',
    situational: 'outline',
  } as const;

  // Priority icon mapping
  const priorityIcon = {
    core: '⭐',
    luxury: '✨',
    situational: '🔀',
  };

  return (
    <Card className="glass-card border-primary/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShoppingCart className="w-5 h-5" />
          Recomendações de Itens (IA)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Gold */}
        <div className="text-center pb-2 border-b border-border/30">
          <div className="flex items-center justify-center gap-2">
            <DollarSign className="w-4 h-4 text-yellow-400" />
            <span className="text-xl font-bold text-yellow-400">{currentGold}g</span>
            <span className="text-xs text-muted-foreground">disponível</span>
          </div>
        </div>

        {/* Next Item (PRIMARY RECOMMENDATION) */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-primary">
            <Star className="w-4 h-4" />
            Próximo Item Recomendado
          </div>
          <div className="p-3 rounded-lg bg-primary/20 border-2 border-primary/50">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold">{itemRec.nextItem.name}</span>
                <Badge variant={priorityColor[itemRec.nextItem.priority]} className="text-xs">
                  {priorityIcon[itemRec.nextItem.priority]}{' '}
                  {itemRec.nextItem.priority === 'core' && 'Core'}
                  {itemRec.nextItem.priority === 'luxury' && 'Luxo'}
                  {itemRec.nextItem.priority === 'situational' && 'Situacional'}
                </Badge>
              </div>
            </div>

            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1 text-sm">
                <DollarSign className="w-3 h-3 text-yellow-400" />
                <span className="font-mono font-semibold text-yellow-400">
                  {itemRec.nextItem.cost}g
                </span>
              </div>
              {currentGold >= itemRec.nextItem.cost ? (
                <Badge variant="default" className="text-xs">
                  ✓ Pode Comprar
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-xs">
                  Faltam {itemRec.nextItem.cost - currentGold}g
                </Badge>
              )}
            </div>

            <p className="text-sm">{itemRec.nextItem.reason}</p>
          </div>
        </div>

        {/* Alternatives */}
        {itemRec.alternatives.length > 0 && (
          <>
            <Separator />
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-blue-400">
                <ArrowRight className="w-4 h-4" />
                Alternativas
              </div>
              <div className="space-y-2">
                {itemRec.alternatives.map((alt, index) => (
                  <div
                    key={index}
                    className="p-2 rounded-lg bg-secondary/30 border border-border/30"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-sm">{alt.name}</span>
                      <div className="flex items-center gap-1 text-xs">
                        <DollarSign className="w-3 h-3 text-yellow-400" />
                        <span className="font-mono text-yellow-400">{alt.cost}g</span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">{alt.reason}</p>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Sell Recommendations */}
        {itemRec.sellRecommendations.length > 0 && (
          <>
            <Separator />
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-orange-400">
                <Package className="w-4 h-4" />
                Considere Vender
              </div>
              <div className="space-y-2">
                {itemRec.sellRecommendations.map((sell, index) => (
                  <div
                    key={index}
                    className="p-2 rounded-lg bg-orange-500/10 border border-orange-500/30"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-sm text-orange-400">{sell.item}</span>
                      <AlertCircle className="w-3 h-3 text-orange-400" />
                    </div>
                    <p className="text-xs text-muted-foreground">{sell.reason}</p>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Footer - Timestamp */}
        <div className="pt-2 border-t border-border/30 text-xs text-muted-foreground text-center">
          Gerado por IA •{' '}
          {new Date(recommendations.timestamp).toLocaleTimeString('pt-BR')}
        </div>
      </CardContent>
    </Card>
  );
}

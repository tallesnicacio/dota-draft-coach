import { useLiveStore } from '@/store/liveStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Shield,
  AlertTriangle,
  Lightbulb,
  Target,
  TrendingUp,
  Swords,
} from 'lucide-react';

/**
 * DraftAnalysisPanel - AI-powered draft analysis
 *
 * Shows draft strengths, weaknesses, threats, item priorities, and playstyle tips
 */
export function DraftAnalysisPanel() {
  const recommendations = useLiveStore((state) => state.recommendations);
  const isConnected = useLiveStore((state) => state.status === 'connected');

  if (!isConnected || !recommendations?.draftAnalysis) {
    return null;
  }

  const analysis = recommendations.draftAnalysis;

  // Priority color mapping
  const priorityColor = {
    critical: 'destructive',
    high: 'default',
    medium: 'secondary',
    situational: 'outline',
  } as const;

  return (
    <Card className="glass-card border-primary/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Análise de Draft (IA)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Hero Name */}
        {recommendations.hero && (
          <div className="text-center pb-2 border-b border-border/30">
            <Badge variant="default" className="text-base px-4 py-1">
              {recommendations.hero}
            </Badge>
          </div>
        )}

        {/* Strengths */}
        {analysis.strengths.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-green-400">
              <Shield className="w-4 h-4" />
              Pontos Fortes
            </div>
            <ul className="space-y-1 text-sm">
              {analysis.strengths.map((strength, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-green-400 mt-1">✓</span>
                  <span>{strength}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <Separator />

        {/* Weaknesses */}
        {analysis.weaknesses.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-orange-400">
              <AlertTriangle className="w-4 h-4" />
              Pontos Fracos
            </div>
            <ul className="space-y-1 text-sm">
              {analysis.weaknesses.map((weakness, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-orange-400 mt-1">!</span>
                  <span>{weakness}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <Separator />

        {/* Item Priorities */}
        {analysis.itemPriorities.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-yellow-400">
              <Target className="w-4 h-4" />
              Prioridades de Itens
            </div>
            <div className="space-y-2">
              {analysis.itemPriorities.map((itemPriority, index) => (
                <div
                  key={index}
                  className="p-2 rounded-lg bg-secondary/30 border border-border/30"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-sm">{itemPriority.item}</span>
                    <Badge variant={priorityColor[itemPriority.priority]} className="text-xs">
                      {itemPriority.priority === 'critical' && 'Crítico'}
                      {itemPriority.priority === 'high' && 'Alta'}
                      {itemPriority.priority === 'medium' && 'Média'}
                      {itemPriority.priority === 'situational' && 'Situacional'}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{itemPriority.reason}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <Separator />

        {/* Threats */}
        {analysis.threats.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-red-400">
              <Swords className="w-4 h-4" />
              Ameaças
            </div>
            <div className="space-y-2">
              {analysis.threats.map((threat, index) => (
                <div
                  key={index}
                  className="p-2 rounded-lg bg-red-500/10 border border-red-500/30"
                >
                  <div className="font-semibold text-sm text-red-400 mb-1">
                    {threat.hero}
                  </div>
                  <p className="text-xs mb-1">
                    <span className="text-muted-foreground">Ameaça: </span>
                    {threat.threat}
                  </p>
                  <p className="text-xs">
                    <span className="text-green-400">Contra: </span>
                    {threat.counterplay}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        <Separator />

        {/* Playstyle Tips */}
        {analysis.playStyleTips.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-blue-400">
              <Lightbulb className="w-4 h-4" />
              Dicas de Estilo de Jogo
            </div>
            <ul className="space-y-1 text-sm">
              {analysis.playStyleTips.map((tip, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-blue-400 mt-1">💡</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Skill Build Suggestion */}
        {analysis.skillBuildSuggestion && (
          <>
            <Separator />
            <div className="space-y-2">
              <div className="text-sm font-semibold text-purple-400">
                Sugestão de Build de Skills
              </div>
              <p className="text-sm bg-purple-500/10 border border-purple-500/30 rounded-lg p-2">
                {analysis.skillBuildSuggestion}
              </p>
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

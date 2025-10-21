import { useEffect, useState } from 'react';
import { useBuildStore } from '@/store/buildStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  TrendingUp,
  TrendingDown,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Info
} from 'lucide-react';
import { Hero } from '@/types/dota';

interface DraftSuggestion {
  heroId: number;
  heroName: string;
  score: number;
  reasons: string[];
  priority: 'high' | 'medium' | 'low';
}

interface DraftAnalysis {
  suggestedPicks: DraftSuggestion[];
  suggestedBans: DraftSuggestion[];
  teamComposition: {
    roles: {
      carry: number;
      support: number;
      offlane: number;
      mid: number;
      roaming: number;
    };
    missingRoles: string[];
    strengths: string[];
    weaknesses: string[];
  };
  countersNeeded: string[];
  synergyOpportunities: string[];
}

/**
 * DraftHelper - Sugestões inteligentes de picks e bans
 *
 * Similar ao DotaPlus, analisa draft e sugere:
 * - Melhores picks baseado em counters/sinergias
 * - Bans prioritários contra counters
 * - Análise de composição do time
 */
export function DraftHelper() {
  const allies = useBuildStore((state) => state.allies);
  const enemies = useBuildStore((state) => state.enemies);
  const selectedHero = useBuildStore((state) => state.selectedHero);
  const patch = useBuildStore((state) => state.patch);
  const mmrBucket = useBuildStore((state) => state.mmrBucket);

  const [analysis, setAnalysis] = useState<DraftAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyzeDraft = async () => {
    try {
      setLoading(true);
      setError(null);

      // Montar draft atual
      const allyPicks = [
        ...(selectedHero ? [selectedHero.id] : []),
        ...allies.map((h) => h.id),
      ].map(Number);

      const enemyPicks = enemies.map((h) => h.id).map(Number);

      const response = await fetch('http://localhost:3001/api/draft/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          allyPicks,
          enemyPicks,
          allyBans: [],
          enemyBans: [],
          patch,
          mmr: mmrBucket,
        }),
      });

      if (!response.ok) {
        throw new Error('Falha ao analisar draft');
      }

      const data = await response.json();
      setAnalysis(data);
    } catch (err) {
      console.error('Erro ao analisar draft:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  // Auto-analyze quando draft mudar
  useEffect(() => {
    if (allies.length > 0 || enemies.length > 0) {
      analyzeDraft();
    } else {
      setAnalysis(null);
    }
  }, [allies, enemies, selectedHero, patch, mmrBucket]);

  // Se não há draft, não mostrar
  if (allies.length === 0 && enemies.length === 0) {
    return null;
  }

  return (
    <Card className="glass-card border-primary/30">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Draft Helper
            <Badge variant="secondary" className="text-xs">
              DotaPlus-like
            </Badge>
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={analyzeDraft}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="text-sm text-destructive mb-4 p-3 rounded bg-destructive/10 border border-destructive/30">
            {error}
          </div>
        )}

        {analysis && (
          <Tabs defaultValue="picks" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="picks">
                <TrendingUp className="w-4 h-4 mr-2" />
                Picks
              </TabsTrigger>
              <TabsTrigger value="bans">
                <TrendingDown className="w-4 h-4 mr-2" />
                Bans
              </TabsTrigger>
              <TabsTrigger value="analysis">
                <Info className="w-4 h-4 mr-2" />
                Análise
              </TabsTrigger>
            </TabsList>

            {/* Tab: Suggested Picks */}
            <TabsContent value="picks" className="space-y-3 mt-4">
              {analysis.suggestedPicks.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-8">
                  Sem sugestões de picks no momento
                </div>
              ) : (
                analysis.suggestedPicks.slice(0, 8).map((suggestion) => (
                  <SuggestionCard
                    key={suggestion.heroId}
                    suggestion={suggestion}
                    type="pick"
                  />
                ))
              )}
            </TabsContent>

            {/* Tab: Suggested Bans */}
            <TabsContent value="bans" className="space-y-3 mt-4">
              {analysis.suggestedBans.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-8">
                  Sem sugestões de bans no momento
                </div>
              ) : (
                analysis.suggestedBans.slice(0, 8).map((suggestion) => (
                  <SuggestionCard
                    key={suggestion.heroId}
                    suggestion={suggestion}
                    type="ban"
                  />
                ))
              )}
            </TabsContent>

            {/* Tab: Team Analysis */}
            <TabsContent value="analysis" className="space-y-4 mt-4">
              {/* Missing Roles */}
              {analysis.teamComposition.missingRoles.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-orange-400" />
                    Roles Faltando
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {analysis.teamComposition.missingRoles.map((role) => (
                      <Badge key={role} variant="destructive" className="text-xs">
                        {role}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Strengths */}
              {analysis.teamComposition.strengths.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                    Pontos Fortes
                  </h4>
                  <div className="space-y-1">
                    {analysis.teamComposition.strengths.map((strength, i) => (
                      <div key={i} className="text-sm text-muted-foreground">
                        • {strength}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Weaknesses */}
              {analysis.teamComposition.weaknesses.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-orange-400" />
                    Pontos Fracos
                  </h4>
                  <div className="space-y-1">
                    {analysis.teamComposition.weaknesses.map((weakness, i) => (
                      <div key={i} className="text-sm text-muted-foreground">
                        • {weakness}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Synergy Opportunities */}
              {analysis.synergyOpportunities.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    Oportunidades de Sinergia
                  </h4>
                  <div className="space-y-1">
                    {analysis.synergyOpportunities.map((opp, i) => (
                      <div key={i} className="text-sm text-muted-foreground">
                        • {opp}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}

function SuggestionCard({
  suggestion,
  type,
}: {
  suggestion: DraftSuggestion;
  type: 'pick' | 'ban';
}) {
  const priorityColors = {
    high: 'bg-red-500/20 border-red-500/50 text-red-300',
    medium: 'bg-yellow-500/20 border-yellow-500/50 text-yellow-300',
    low: 'bg-blue-500/20 border-blue-500/50 text-blue-300',
  };

  const priorityIcons = {
    high: '🔥',
    medium: '⚡',
    low: '💡',
  };

  return (
    <div
      className={`p-3 rounded-lg border ${priorityColors[suggestion.priority]} transition-all hover:scale-105`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">{priorityIcons[suggestion.priority]}</span>
          <span className="font-semibold">{suggestion.heroName}</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            Score: {suggestion.score.toFixed(1)}
          </Badge>
          <Badge
            variant={suggestion.priority === 'high' ? 'destructive' : 'secondary'}
            className="text-xs uppercase"
          >
            {suggestion.priority}
          </Badge>
        </div>
      </div>

      {/* Reasons */}
      {suggestion.reasons.length > 0 && (
        <div className="space-y-1 mt-2 pt-2 border-t border-border/30">
          {suggestion.reasons.slice(0, 3).map((reason, i) => (
            <div key={i} className="text-xs text-muted-foreground">
              • {reason}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

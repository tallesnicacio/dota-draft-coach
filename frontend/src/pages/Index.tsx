import { useEffect, useState, useMemo } from 'react';
import { useBuildStore } from '@/store/buildStore';
import { useLiveStore } from '@/store/liveStore';
import { mergeLiveWithRecommendations } from '@/services/recommendationFusion';
import { useAutoPicks } from '@/hooks/useAutoPicks';
import { FiltersBar } from '@/components/FiltersBar';
import { TeamDraft } from '@/components/TeamDraft';
import { BuildPanel } from '@/components/BuildPanel';
import { SkillsPanel } from '@/components/SkillsPanel';
import { MatchupsPanel } from '@/components/MatchupsPanel';
import { ConfidenceBadge } from '@/components/ConfidenceBadge';
import { HeroPicker } from '@/components/HeroPicker';
import { Timers } from '@/components/Timers';
import { LiveBadge } from '@/components/LiveBadge';
import { LiveSetupBanner } from '@/components/LiveSetupBanner';
import { LiveDevTools } from '@/components/LiveDevTools';
import { LiveGameStatus } from '@/components/LiveGameStatus';
import { UpcomingEvents } from '@/components/UpcomingEvents';
import { DraftHelper } from '@/components/DraftHelper';
import { GSIDiagnostic } from '@/components/GSIDiagnostic';
import { DraftAnalysisPanel } from '@/components/DraftAnalysisPanel';
import { ItemRecommendationPanel } from '@/components/ItemRecommendationPanel';
import { apiService } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Sparkles, Trash2, Stethoscope } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { Hero } from '@/types/dota';

const Index = () => {
  const [allHeroes, setAllHeroes] = useState<Hero[]>([]);
  const [showDiagnostic, setShowDiagnostic] = useState(false);

  // Load heroes for auto-pick detection
  useEffect(() => {
    const loadHeroes = async () => {
      try {
        const heroes = await apiService.getHeroes();
        setAllHeroes(heroes);
      } catch (error) {
        console.error('[Index] Failed to load heroes for auto-picks:', error);
      }
    };
    loadHeroes();
  }, []);

  // Enable automatic pick detection
  useAutoPicks(allHeroes);
  const {
    selectedHero,
    allies,
    enemies,
    currentBuild,
    patch,
    mmrBucket,
    timers,
    setSelectedHero,
    addAlly,
    removeAlly,
    addEnemy,
    removeEnemy,
    setPatch,
    setMMRBucket,
    setCurrentBuild,
    clearDraft,
    addTimer,
    removeTimer,
    updateTimer,
  } = useBuildStore();

  const [setupBannerDismissed, setSetupBannerDismissed] = useState(false);
  const liveStore = useLiveStore();
  const isLiveActive = liveStore.status === 'connected' && liveStore.snapshot;

  // Show setup banner if Live Mode is not connected and not dismissed
  const showSetupBanner = !liveStore.enabled && !setupBannerDismissed;

  // Merge live data with build recommendations when live mode is active
  const enhancedBuild = useMemo(() => {
    if (!currentBuild) return null;

    // Only enhance if live mode is connected and has snapshot
    if (liveStore.status === 'connected' && liveStore.snapshot) {
      return mergeLiveWithRecommendations(currentBuild, liveStore.snapshot);
    }

    // Return base build without enhancement
    return currentBuild;
  }, [currentBuild, liveStore.status, liveStore.snapshot]);

  // Hero selection now only tracks the selected hero
  // All builds and recommendations come from Live Mode + AI during gameplay
  useEffect(() => {
    if (!selectedHero) {
      setCurrentBuild(null);
    }
    // No longer fetching builds from API - everything comes from Live Mode
  }, [selectedHero, setCurrentBuild]);

  const excludedHeroIds = [
    selectedHero?.id,
    ...allies.map(h => h.id),
    ...enemies.map(h => h.id),
  ].filter(Boolean) as string[];

  // Se showDiagnostic, mostrar página de diagnóstico
  if (showDiagnostic) {
    return (
      <div className="min-h-screen">
        <header className="border-b border-border/50 bg-card/30 backdrop-blur-md sticky top-0 z-10">
          <div className="container mx-auto px-4 py-6">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold">Diagnóstico GSI</h1>
              <Button
                variant="outline"
                onClick={() => setShowDiagnostic(false)}
              >
                Voltar
              </Button>
            </div>
          </div>
        </header>
        <GSIDiagnostic />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-12">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/30 backdrop-blur-md sticky top-0 z-10">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex-1">
              <h1 className="text-3xl md:text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                Guia de Build Dota 2
              </h1>
              <p className="text-muted-foreground mt-1">
                Recomendações inteligentes por patch e MMR, ajustadas ao seu draft
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDiagnostic(true)}
                className="border-primary/50 hover:bg-primary/10"
              >
                <Stethoscope className="h-4 w-4 mr-2" />
                Diagnóstico GSI
              </Button>

              <LiveBadge />

              {selectedHero && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedHero(null);
                    clearDraft();
                  }}
                  className="border-destructive/50 hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Limpar Seleção
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 space-y-6">
        {/* Live Setup Banner */}
        {showSetupBanner && (
          <LiveSetupBanner onDismiss={() => setSetupBannerDismissed(true)} />
        )}

        {/* Live Game Status - Only when connected */}
        {isLiveActive && <LiveGameStatus />}

        {/* AI Recommendations - Show when available */}
        {isLiveActive && liveStore.recommendations && (
          <div className="grid lg:grid-cols-2 gap-6">
            {liveStore.recommendations.draftAnalysis && <DraftAnalysisPanel />}
            {liveStore.recommendations.itemRecommendation && <ItemRecommendationPanel />}
          </div>
        )}

        {/* Filtros e Timers/Events em Grid - SEMPRE 3 colunas */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Filtros */}
          <section>
            <div className="glass-card rounded-xl p-6 border h-full">
              <FiltersBar
                patch={patch}
                mmrBucket={mmrBucket}
                onPatchChange={setPatch}
                onMMRChange={setMMRBucket}
              />
            </div>
          </section>

          {/* Timers Ativos */}
          <section>
            <Timers
              timers={timers}
              onAdd={addTimer}
              onRemove={removeTimer}
              onUpdate={updateTimer}
            />
          </section>

          {/* Próximos Eventos - SEMPRE visível */}
          <section>
            <UpcomingEvents />
          </section>
        </div>

        {/* Seleção de Herói */}
        {!selectedHero ? (
          <section className="glass-card rounded-xl p-6 border">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="h-5 w-5 text-primary" />
              <h2 className="text-2xl font-bold">Selecione seu Herói</h2>
            </div>
            <HeroPicker onSelectHero={setSelectedHero} excludeHeroes={excludedHeroIds} />
          </section>
        ) : (
          <>
            {/* Herói Selecionado */}
            <section className="glass-card rounded-xl p-6 border">
              <div className="flex items-center gap-4">
                <img
                  src={selectedHero.image}
                  alt={selectedHero.displayName}
                  className="w-24 h-24 rounded-xl object-cover border-2 border-primary glow-primary"
                />
                <div className="flex-1">
                  <h2 className="text-3xl font-bold mb-2">{selectedHero.displayName}</h2>
                  {currentBuild && (
                    <ConfidenceBadge
                      score={currentBuild.confidence}
                      sampleSize={currentBuild.sampleSize}
                      lastUpdated={currentBuild.lastUpdated}
                    />
                  )}
                </div>
              </div>
            </section>

            {/* Draft */}
            <section>
              <h2 className="text-2xl font-bold mb-4">Ajustar por Composição</h2>
              <TeamDraft
                allies={allies}
                enemies={enemies}
                onAddAlly={addAlly}
                onRemoveAlly={removeAlly}
                onAddEnemy={addEnemy}
                onRemoveEnemy={removeEnemy}
                excludeHeroIds={excludedHeroIds}
              />
            </section>

            {/* Draft Helper - Sugestões de Picks e Bans */}
            {(allies.length > 0 || enemies.length > 0) && (
              <section>
                <DraftHelper />
              </section>
            )}

            {/* Build e Recomendações */}
            {enhancedBuild ? (
              <div className="grid lg:grid-cols-2 gap-6">
                <div className="space-y-6">
                  <BuildPanel coreBuild={enhancedBuild.coreBuild} />
                  <SkillsPanel
                    skillOrder={enhancedBuild.skillOrder}
                    heroName={selectedHero.displayName}
                    nextSkill={enhancedBuild.nextSkill}
                    currentSkillLevels={enhancedBuild.currentSkillLevels}
                  />
                </div>
                <div>
                  <MatchupsPanel matchups={enhancedBuild.matchups} />
                </div>
              </div>
            ) : (
              <section className="glass-card rounded-xl p-8 border border-primary/30 text-center">
                <div className="max-w-2xl mx-auto space-y-4">
                  <div className="flex justify-center">
                    <Sparkles className="h-12 w-12 text-primary animate-pulse" />
                  </div>
                  <h3 className="text-2xl font-bold">Builds Disponíveis em Live Mode</h3>
                  <p className="text-muted-foreground">
                    As recomendações de build, skills e matchups agora são geradas em tempo real
                    pela IA durante partidas usando o Live Mode.
                  </p>
                  <div className="pt-4">
                    <p className="text-sm text-muted-foreground">
                      Para ativar o Live Mode, clique no botão no canto superior direito e
                      siga as instruções de configuração do Game State Integration.
                    </p>
                  </div>
                </div>
              </section>
            )}
          </>
        )}

        {/* Live Dev Tools (for debugging) */}
        {import.meta.env.DEV && <LiveDevTools />}
      </div>
    </div>
  );
};

export default Index;

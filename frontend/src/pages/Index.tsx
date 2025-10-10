import { useEffect, useState } from 'react';
import { useBuildStore } from '@/store/buildStore';
import { FiltersBar } from '@/components/FiltersBar';
import { TeamDraft } from '@/components/TeamDraft';
import { BuildPanel } from '@/components/BuildPanel';
import { SkillsPanel } from '@/components/SkillsPanel';
import { MatchupsPanel } from '@/components/MatchupsPanel';
import { ConfidenceBadge } from '@/components/ConfidenceBadge';
import { HeroPicker } from '@/components/HeroPicker';
import { Timers } from '@/components/Timers';
import { apiService } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Sparkles, Trash2 } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import {
  BuildPanelSkeleton,
  SkillsPanelSkeleton,
  MatchupsPanelSkeleton,
  HeroCardSkeleton,
} from '@/components/LoadingSkeletons';

const Index = () => {
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

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Carrega dados reais da API quando seleciona herói ou muda draft
    const loadHeroData = async () => {
      if (!selectedHero) {
        setCurrentBuild(null);
        return;
      }

      try {
        setLoading(true);
        let build;

        // Se há aliados ou inimigos, busca recomendações ajustadas
        if (allies.length > 0 || enemies.length > 0) {
          build = await apiService.getRecommendations(
            selectedHero.id,
            patch,
            mmrBucket,
            allies,
            enemies
          );
          toast.success('Build atualizada!', {
            description: `Recomendações ajustadas para ${selectedHero.displayName}`,
          });
        } else {
          // Caso contrário, busca dados base do herói
          build = await apiService.getHeroData(
            selectedHero.id,
            patch,
            mmrBucket
          );
        }

        setCurrentBuild(build);
      } catch (error) {
        console.error('Erro ao carregar dados do herói:', error);
        toast.error('Erro ao carregar build', {
          description: 'Não foi possível carregar os dados do herói. Tente novamente.',
        });
      } finally {
        setLoading(false);
      }
    };

    loadHeroData();
  }, [selectedHero, allies, enemies, patch, mmrBucket, setCurrentBuild]);

  const excludedHeroIds = [
    selectedHero?.id,
    ...allies.map(h => h.id),
    ...enemies.map(h => h.id),
  ].filter(Boolean) as string[];

  return (
    <div className="min-h-screen pb-12">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/30 backdrop-blur-md sticky top-0 z-10">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                Guia de Build Dota 2
              </h1>
              <p className="text-muted-foreground mt-1">
                Recomendações inteligentes por patch e MMR, ajustadas ao seu draft
              </p>
            </div>
            
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
      </header>

      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Filtros e Timers */}
        <div className="grid lg:grid-cols-3 gap-6">
          <section className="lg:col-span-2 glass-card rounded-xl p-6 border">
            <FiltersBar
              patch={patch}
              mmrBucket={mmrBucket}
              onPatchChange={setPatch}
              onMMRChange={setMMRBucket}
            />
          </section>
          <section>
            <Timers
              timers={timers}
              onAdd={addTimer}
              onRemove={removeTimer}
              onUpdate={updateTimer}
            />
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

            {/* Build e Recomendações */}
            {loading ? (
              <div className="grid lg:grid-cols-2 gap-6">
                <div className="space-y-6">
                  <BuildPanelSkeleton />
                  <SkillsPanelSkeleton />
                </div>
                <div>
                  <MatchupsPanelSkeleton />
                </div>
              </div>
            ) : currentBuild && (
              <div className="grid lg:grid-cols-2 gap-6">
                <div className="space-y-6">
                  <BuildPanel coreBuild={currentBuild.coreBuild} />
                  <SkillsPanel skillOrder={currentBuild.skillOrder} heroName={selectedHero.displayName} />
                </div>
                <div>
                  <MatchupsPanel matchups={currentBuild.matchups} />
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Index;

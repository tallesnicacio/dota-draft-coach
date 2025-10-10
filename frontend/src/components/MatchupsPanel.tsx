import { Matchup, Synergy } from '@/types/dota';
import { Shield, Sword, Users } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LazyImage } from '@/components/LazyImage';

interface MatchupsPanelProps {
  matchups: {
    countersToMe: Matchup[];
    goodVs: Matchup[];
    synergies: Synergy[];
  };
}

const MatchupCard = ({ matchup }: { matchup: Matchup }) => {
  const isPositive = matchup.winRateDelta > 0;
  const deltaColor = isPositive ? 'success' : 'destructive';

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30 border border-border/50 hover:border-primary/30 transition-colors">
      <LazyImage
        src={matchup.heroImage}
        alt={matchup.hero}
        className="w-12 h-12 rounded-lg object-cover border-2 border-border"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h4 className="font-semibold text-sm">{matchup.hero}</h4>
          <span className={`text-xs font-bold text-${deltaColor}`}>
            {isPositive ? '+' : ''}{matchup.winRateDelta.toFixed(1)}%
          </span>
        </div>
        <p className="text-xs text-muted-foreground line-clamp-2">{matchup.note}</p>
      </div>
    </div>
  );
};

const SynergyCard = ({ synergy }: { synergy: Synergy }) => {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30 border border-border/50 hover:border-primary/30 transition-colors">
      <LazyImage
        src={synergy.heroImage}
        alt={synergy.hero}
        className="w-12 h-12 rounded-lg object-cover border-2 border-border"
      />
      <div className="flex-1 min-w-0">
        <h4 className="font-semibold text-sm mb-1">{synergy.hero}</h4>
        <p className="text-xs text-muted-foreground line-clamp-2">{synergy.note}</p>
      </div>
    </div>
  );
};

export const MatchupsPanel = ({ matchups }: MatchupsPanelProps) => {
  return (
    <div className="glass-card rounded-xl p-6 border">
      <h3 className="text-xl font-bold text-primary mb-4">Matchups e Sinergias</h3>

      <Tabs defaultValue="counters" className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-secondary/50">
          <TabsTrigger value="counters" className="data-[state=active]:bg-destructive/20">
            <Shield className="h-4 w-4 mr-2" />
            Counters
          </TabsTrigger>
          <TabsTrigger value="good" className="data-[state=active]:bg-success/20">
            <Sword className="h-4 w-4 mr-2" />
            Bom Contra
          </TabsTrigger>
          <TabsTrigger value="synergies" className="data-[state=active]:bg-accent/20">
            <Users className="h-4 w-4 mr-2" />
            Sinergias
          </TabsTrigger>
        </TabsList>

        <TabsContent value="counters" className="space-y-3 mt-4">
          {matchups.countersToMe.map((matchup, idx) => (
            <MatchupCard key={idx} matchup={matchup} />
          ))}
        </TabsContent>

        <TabsContent value="good" className="space-y-3 mt-4">
          {matchups.goodVs.map((matchup, idx) => (
            <MatchupCard key={idx} matchup={matchup} />
          ))}
        </TabsContent>

        <TabsContent value="synergies" className="space-y-3 mt-4">
          {matchups.synergies.map((synergy, idx) => (
            <SynergyCard key={idx} synergy={synergy} />
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
};

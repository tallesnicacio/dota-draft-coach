import { useMemo } from 'react';
import { useLiveStore } from '@/store/liveStore';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, Zap, DollarSign, TrendingUp, Heart, Droplet, User } from 'lucide-react';
import { formatGameTime } from '@/utils/gameTimers';

/**
 * LiveGameStatus - Compact game state dashboard
 *
 * Shows current game time, hero stats, and player stats
 */
export function LiveGameStatus() {
  const snapshot = useLiveStore((state) => state.snapshot);
  const isConnected = useLiveStore((state) => state.status === 'connected');

  const stats = useMemo(() => {
    if (!snapshot) return null;

    return {
      gameTime: snapshot.map?.gameTime || 0,
      hero: {
        name: snapshot.hero?.displayName || 'Unknown',
        level: snapshot.hero?.level || 0,
        hp: snapshot.hero?.health || 0,
        maxHp: snapshot.hero?.maxHealth || 0,
        hpPercent: snapshot.hero?.healthPercent || 0,
        mana: snapshot.hero?.mana || 0,
        maxMana: snapshot.hero?.maxMana || 0,
        manaPercent: snapshot.hero?.manaPercent || 0,
        alive: snapshot.hero?.alive ?? true,
      },
      player: {
        kills: snapshot.player?.kills || 0,
        deaths: snapshot.player?.deaths || 0,
        assists: snapshot.player?.assists || 0,
        gold: snapshot.player?.gold || 0,
        lastHits: snapshot.player?.lastHits || 0,
        denies: snapshot.player?.denies || 0,
        gpm: snapshot.player?.gpm || 0,
        xpm: snapshot.player?.xpm || 0,
      },
    };
  }, [snapshot]);

  if (!isConnected || !stats) {
    return null;
  }

  const kda = stats.player.deaths === 0
    ? 'Perfect'
    : ((stats.player.kills + stats.player.assists) / stats.player.deaths).toFixed(1);

  return (
    <Card className="glass-card border-primary/30">
      <CardContent className="p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Game Time */}
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              Tempo de Jogo
            </div>
            <div className="text-2xl font-bold font-mono text-primary">
              {formatGameTime(stats.gameTime)}
            </div>
          </div>

          {/* Hero Info */}
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <User className="w-3 h-3" />
              Herói
            </div>
            <div className="text-base font-semibold truncate">
              {stats.hero.name}
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                Nv {stats.hero.level}
              </Badge>
              {!stats.hero.alive && (
                <Badge variant="destructive" className="text-xs">
                  Morto
                </Badge>
              )}
            </div>
          </div>

          {/* KDA */}
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Zap className="w-3 h-3" />
              KDA
            </div>
            <div className="text-xl font-bold">
              {stats.player.kills}/{stats.player.deaths}/{stats.player.assists}
            </div>
            <Badge
              variant={stats.player.deaths === 0 ? 'default' : 'secondary'}
              className="text-xs"
            >
              {kda} KDA
            </Badge>
          </div>

          {/* Economy */}
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <DollarSign className="w-3 h-3" />
              Economia
            </div>
            <div className="text-xl font-bold text-yellow-400">
              {stats.player.gold}g
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <TrendingUp className="w-3 h-3" />
              {stats.player.gpm} GPM · {stats.player.xpm} XPM
            </div>
          </div>
        </div>

        {/* Health/Mana Bars */}
        <div className="mt-4 space-y-2">
          {/* HP Bar */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1 text-muted-foreground">
                <Heart className="w-3 h-3 text-red-500" />
                Vida
              </div>
              <span className="font-mono">
                {stats.hero.hp} / {stats.hero.maxHp} ({Math.round(stats.hero.hpPercent)}%)
              </span>
            </div>
            <div className="h-2 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-red-600 to-red-400 transition-all duration-300"
                style={{ width: `${stats.hero.hpPercent}%` }}
              />
            </div>
          </div>

          {/* Mana Bar */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1 text-muted-foreground">
                <Droplet className="w-3 h-3 text-blue-500" />
                Mana
              </div>
              <span className="font-mono">
                {stats.hero.mana} / {stats.hero.maxMana} ({Math.round(stats.hero.manaPercent)}%)
              </span>
            </div>
            <div className="h-2 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-600 to-blue-400 transition-all duration-300"
                style={{ width: `${stats.hero.manaPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Farm Stats */}
        <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border/30">
          <span>Last Hits: {stats.player.lastHits}</span>
          <span>·</span>
          <span>Denies: {stats.player.denies}</span>
        </div>
      </CardContent>
    </Card>
  );
}

import { useEffect } from 'react';
import { useTimerStore } from '@/store/timerStore';
import { useGameTimer } from '@/hooks/useGameTimer';
import { useNotifications } from '@/hooks/useNotifications';
import { TimerCard } from './TimerCard';
import { Button } from '@/components/ui/button';
import { Play, Pause, RotateCcw, Settings } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

export const GameTimer = () => {
  const {
    currentTime,
    isRunning,
    timers,
    roshanTimer,
    startGame,
    pauseGame,
    resetGame,
    setRoshanDeath,
  } = useTimerStore();

  useGameTimer();
  const { requestPermission } = useNotifications();

  useEffect(() => {
    requestPermission();
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const groupedTimers = {
    runes: timers.filter(t => t.category === 'runes'),
    objectives: timers.filter(t => t.category === 'objectives'),
    neutral: timers.filter(t => t.category === 'neutral'),
    farming: timers.filter(t => t.category === 'farming'),
    cycle: timers.filter(t => t.category === 'cycle'),
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header com tempo de jogo */}
      <div className="p-4 border-b bg-card/50">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold">Tempo de Jogo</h2>
            <p className="text-4xl font-mono font-bold text-primary mt-2">
              {formatTime(currentTime)}
            </p>
          </div>
          <Settings className="h-6 w-6 text-muted-foreground" />
        </div>

        {/* Controles */}
        <div className="flex gap-2">
          {!isRunning ? (
            <Button onClick={startGame} className="flex-1" size="lg">
              <Play className="h-5 w-5 mr-2" />
              Iniciar Partida
            </Button>
          ) : (
            <Button onClick={pauseGame} variant="secondary" className="flex-1" size="lg">
              <Pause className="h-5 w-5 mr-2" />
              Pausar
            </Button>
          )}
          <Button onClick={resetGame} variant="outline" size="lg">
            <RotateCcw className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Lista de timers */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Runas */}
          <section>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <span className="text-2xl">🔵</span>
              Runas
            </h3>
            <div className="space-y-2">
              {groupedTimers.runes.map(timer => (
                <TimerCard key={timer.id} timer={timer} currentTime={currentTime} />
              ))}
            </div>
          </section>

          <Separator />

          {/* Roshan */}
          <section>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <span className="text-2xl">🐲</span>
              Roshan
            </h3>
            {!roshanTimer.deathTime ? (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setRoshanDeath(currentTime)}
              >
                Marcar morte do Roshan
              </Button>
            ) : (
              <div className="space-y-2 glass-card p-4 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Morto em:</span>
                  <span className="font-mono font-bold">{formatTime(roshanTimer.deathTime)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Respawn:</span>
                  <span className="font-mono font-bold text-warning">
                    {formatTime(roshanTimer.minRespawn!)} - {formatTime(roshanTimer.maxRespawn!)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Aegis expira:</span>
                  <span className="font-mono font-bold text-destructive">
                    {formatTime(roshanTimer.aegisExpiry!)}
                  </span>
                </div>
              </div>
            )}
          </section>

          <Separator />

          {/* Neutral Items */}
          <section>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <span className="text-2xl">📦</span>
              Itens Neutros
            </h3>
            <div className="space-y-2">
              {groupedTimers.neutral.map(timer => (
                <TimerCard key={timer.id} timer={timer} currentTime={currentTime} />
              ))}
            </div>
          </section>

          <Separator />

          {/* Tormentor */}
          <section>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <span className="text-2xl">🏔️</span>
              Tormentor
            </h3>
            <div className="space-y-2">
              {groupedTimers.objectives.map(timer => (
                <TimerCard key={timer.id} timer={timer} currentTime={currentTime} />
              ))}
            </div>
          </section>

          <Separator />

          {/* Farming */}
          <section>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <span className="text-2xl">🌳</span>
              Farm
            </h3>
            <div className="space-y-2">
              {groupedTimers.farming.map(timer => (
                <TimerCard key={timer.id} timer={timer} currentTime={currentTime} />
              ))}
            </div>
          </section>

          <Separator />

          {/* Ciclo Dia/Noite */}
          <section>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <span className="text-2xl">🌙</span>
              Ciclo
            </h3>
            <div className="space-y-2">
              {groupedTimers.cycle.map(timer => (
                <TimerCard key={timer.id} timer={timer} currentTime={currentTime} />
              ))}
            </div>
          </section>
        </div>
      </ScrollArea>
    </div>
  );
};

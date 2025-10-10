import { GameTimer } from '@/types/timers';
import { useTimerStore } from '@/store/timerStore';
import { Bell, BellOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TimerCardProps {
  timer: GameTimer;
  currentTime: number;
}

export const TimerCard = ({ timer, currentTime }: TimerCardProps) => {
  const { toggleTimer } = useTimerStore();

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Calcular próximo spawn considerando intervalos
  let nextSpawn = timer.nextSpawn;
  if (timer.interval && currentTime >= timer.nextSpawn) {
    const cycles = Math.floor((currentTime - timer.nextSpawn) / timer.interval);
    nextSpawn = timer.nextSpawn + ((cycles + 1) * timer.interval);
  }

  const timeRemaining = nextSpawn - currentTime;
  const isActive = timeRemaining > 0 && timeRemaining <= timer.notifyBefore;
  const isPassed = timeRemaining <= 0;

  return (
    <div
      className={cn(
        "flex items-center justify-between p-3 rounded-lg border transition-all",
        timer.enabled ? "glass-card" : "bg-muted/20 opacity-60",
        isActive && timer.enabled && "border-primary glow-primary",
        isPassed && "border-success/50"
      )}
    >
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium">{timer.label}</span>
          {isPassed && !timer.interval && (
            <span className="text-xs text-success">✓ Disponível</span>
          )}
        </div>
        <div className="text-sm text-muted-foreground mt-1">
          {isPassed && timer.interval ? (
            <span className="text-success">Próximo: {formatTime(nextSpawn)}</span>
          ) : isPassed ? (
            <span className="text-success">Disponível agora</span>
          ) : (
            <span>Em {formatTime(nextSpawn)} ({timeRemaining}s)</span>
          )}
        </div>
      </div>

      <button
        onClick={() => toggleTimer(timer.id)}
        className={cn(
          "p-2 rounded-md transition-colors",
          timer.enabled
            ? "text-primary hover:bg-primary/10"
            : "text-muted-foreground hover:bg-muted"
        )}
      >
        {timer.enabled ? (
          <Bell className="h-5 w-5" />
        ) : (
          <BellOff className="h-5 w-5" />
        )}
      </button>
    </div>
  );
};

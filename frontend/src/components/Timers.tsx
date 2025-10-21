import { useState, useEffect } from 'react';
import { Timer as TimerType } from '@/types/dota';
import { Clock, Play, X, Bell, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/components/ui/sonner';

interface TimersProps {
  timers: TimerType[];
  onAdd: (timer: TimerType) => void;
  onRemove: (timerId: string) => void;
  onUpdate: (timerId: string, updates: Partial<TimerType>) => void;
}

const PRESET_TIMERS = [
  { name: 'Runa de Poder', duration: 420 }, // 7 min
  { name: 'Stack Camp', duration: 60 }, // 1 min
  { name: 'Pull Camp', duration: 60 }, // 1 min
  { name: 'Roshan', duration: 480 }, // 8 min (respawn mínimo)
  { name: 'Glyph', duration: 300 }, // 5 min
  { name: 'Scan', duration: 270 }, // 4.5 min
];

export function Timers({ timers, onAdd, onRemove, onUpdate }: TimersProps) {
  const [selectedPreset, setSelectedPreset] = useState(PRESET_TIMERS[0]);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      timers.forEach(timer => {
        if (timer.active && now >= timer.endTime) {
          // Timer acabou
          onUpdate(timer.id, { active: false });

          // Tentar notificar
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(`⏰ ${timer.name}`, {
              body: 'Timer finalizado!',
            });
          }
        }
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timers, onUpdate]);

  const handleStart = () => {
    const now = Date.now();
    const newTimer: TimerType = {
      id: `${Date.now()}-${Math.random()}`,
      name: selectedPreset.name,
      duration: selectedPreset.duration,
      startTime: now,
      endTime: now + selectedPreset.duration * 1000,
      active: true,
      automatic: false,
      source: 'manual',
    };
    onAdd(newTimer);
    toast.success('Timer iniciado!', {
      description: `${selectedPreset.name} - ${formatTime(selectedPreset.duration)}`,
    });
  };

  const requestNotificationPermission = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        toast.success('Notificações habilitadas!', {
          description: 'Você receberá alertas quando os timers terminarem',
        });
      } else {
        toast.error('Notificações bloqueadas', {
          description: 'Habilite as notificações nas configurações do navegador',
        });
      }
    } else if (Notification.permission === 'granted') {
      toast.info('Notificações já habilitadas', {
        description: 'Você já receberá alertas dos timers',
      });
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimeRemaining = (timer: TimerType) => {
    if (!timer.active) return 0;
    const now = Date.now();
    const remaining = Math.max(0, Math.ceil((timer.endTime - now) / 1000));
    return remaining;
  };

  return (
    <Card className="glass-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            Timers de Jogo
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={requestNotificationPermission}
            className="text-xs"
          >
            <Bell className="w-3 h-3 mr-1" />
            Habilitar notificações
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Preset selector */}
        <div className="flex gap-2">
          <Select
            value={selectedPreset.name}
            onValueChange={(value) => {
              const preset = PRESET_TIMERS.find(p => p.name === value);
              if (preset) setSelectedPreset(preset);
            }}
          >
            <SelectTrigger className="flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PRESET_TIMERS.map(preset => (
                <SelectItem key={preset.name} value={preset.name}>
                  {preset.name} ({formatTime(preset.duration)})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handleStart} className="gap-2">
            <Play className="w-4 h-4" />
            Iniciar
          </Button>
        </div>

        {/* Active timers */}
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {timers.length === 0 && (
            <div className="text-sm text-muted-foreground text-center py-4">
              Nenhum timer ativo
            </div>
          )}
          {timers.map(timer => {
            const remaining = getTimeRemaining(timer);
            const isFinished = remaining === 0 && !timer.active;

            return (
              <div
                key={timer.id}
                className={`glass-card p-3 rounded-lg flex items-center justify-between border ${
                  isFinished ? 'border-green-500 animate-pulse' : 'border-border/50'
                }`}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{timer.name}</span>
                    {timer.automatic && (
                      <Badge variant="secondary" className="text-xs gap-1">
                        <Zap className="w-3 h-3" />
                        Auto
                      </Badge>
                    )}
                  </div>
                  <div className={`text-lg font-mono ${isFinished ? 'text-green-400' : ''}`}>
                    {isFinished ? '✓ Pronto!' : formatTime(remaining)}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    onRemove(timer.id);
                    toast.info('Timer removido', {
                      description: timer.name,
                    });
                  }}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            );
          })}
        </div>

        <div className="text-xs text-muted-foreground pt-2 border-t border-border/50">
          Timers funcionam mesmo com o app em segundo plano (se notificações habilitadas)
        </div>
      </CardContent>
    </Card>
  );
}

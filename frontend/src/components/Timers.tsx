import { useState, useEffect } from 'react';
import { Timer as TimerType } from '@/types/dota';
import { Clock, Play, X, Bell, Zap, Sparkles } from 'lucide-react';
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

          // Toast visual no app
          toast.success(`⏰ ${timer.name}`, {
            description: 'Timer finalizado!',
            duration: 10000, // 10 segundos
          });

          // Notificação do navegador (com som e vibração)
          if ('Notification' in window && Notification.permission === 'granted') {
            const notification = new Notification(`⏰ ${timer.name}`, {
              body: 'Timer finalizado!',
              icon: '/pwa-192x192.png',
              badge: '/pwa-192x192.png',
              tag: `timer-${timer.id}`,
              requireInteraction: true, // Mantém a notificação até o usuário fechar
              vibrate: [200, 100, 200, 100, 200], // Padrão de vibração
              silent: false, // Com som
            });

            // Auto-fechar após 10 segundos
            setTimeout(() => notification.close(), 10000);

            // Focar no app quando clicar na notificação
            notification.onclick = () => {
              window.focus();
              notification.close();
            };
          }
        }
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timers, onUpdate]);

  const handleStart = async () => {
    // Solicitar permissão de notificações se ainda não tiver
    if ('Notification' in window && Notification.permission === 'default') {
      await requestNotificationPermission();
    }

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

  const handleDemo = () => {
    const now = Date.now();

    // Criar 3 timers demo com diferentes durações
    const demoTimers = [
      {
        id: `demo-1-${now}`,
        name: '💰 Bounty Rune (Auto)',
        duration: 180,
        startTime: now,
        endTime: now + 180000,
        active: true,
        automatic: true,
        source: 'live-bounty-rune' as const,
      },
      {
        id: `demo-2-${now}`,
        name: '⚡ Power Rune (Auto)',
        duration: 420,
        startTime: now,
        endTime: now + 420000,
        active: true,
        automatic: true,
        source: 'live-power-rune' as const,
      },
      {
        id: `demo-3-${now}`,
        name: '🏕️ Stack Camp (Auto)',
        duration: 60,
        startTime: now - 45000, // 45s já passados
        endTime: now + 15000, // 15s restantes
        active: true,
        automatic: true,
        source: 'live-stack' as const,
      },
    ];

    demoTimers.forEach(timer => onAdd(timer));

    toast.success('Timers Demo criados!', {
      description: '3 timers automáticos de exemplo com progress bars',
    });
  };

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      toast.error('Navegador não suporta notificações', {
        description: 'Use um navegador moderno (Chrome, Firefox, Edge)',
      });
      return false;
    }

    if (Notification.permission === 'granted') {
      toast.success('Notificações já habilitadas!', {
        description: 'Você receberá alertas quando os timers terminarem',
      });
      return true;
    }

    if (Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        toast.success('Notificações habilitadas!', {
          description: 'Você receberá alertas quando os timers terminarem',
        });
        // Notificação de teste
        new Notification('🎮 Dota 2 Coach', {
          body: 'Notificações ativadas! Você será alertado quando os timers terminarem.',
          icon: '/pwa-192x192.png',
          badge: '/pwa-192x192.png',
          vibrate: [200, 100, 200],
          requireInteraction: false,
        });
        return true;
      } else {
        toast.error('Notificações bloqueadas', {
          description: 'Habilite as notificações nas configurações do navegador',
          duration: 5000,
        });
        return false;
      }
    }

    if (Notification.permission === 'denied') {
      toast.error('Notificações bloqueadas permanentemente', {
        description: 'Vá em Configurações do site > Notificações > Permitir',
        duration: 7000,
      });
      return false;
    }

    return false;
  };

  const testNotification = () => {
    if (Notification.permission === 'granted') {
      new Notification('🔔 Teste de Notificação', {
        body: 'Se você viu isso, as notificações estão funcionando!',
        icon: '/pwa-192x192.png',
        badge: '/pwa-192x192.png',
        vibrate: [200, 100, 200],
        requireInteraction: false,
      });
      toast.success('Notificação de teste enviada!');
    } else {
      toast.error('Permissão de notificações necessária', {
        description: 'Clique em "Notif." primeiro para permitir',
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
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDemo}
              className="text-xs"
            >
              <Sparkles className="w-3 h-3 mr-1" />
              Demo
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={requestNotificationPermission}
              className="text-xs"
              title="Permitir notificações"
            >
              <Bell className="w-3 h-3 mr-1" />
              {Notification.permission === 'granted' ? '✓' : 'Notif.'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={testNotification}
              className="text-xs"
              title="Testar notificações"
            >
              <Zap className="w-3 h-3 mr-1" />
              Teste
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Aviso de notificações bloqueadas */}
        {'Notification' in window && Notification.permission === 'denied' && (
          <div className="bg-orange-500/10 border border-orange-500/50 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <Bell className="w-4 h-4 text-orange-400 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-orange-400">
                  Notificações bloqueadas
                </p>
                <p className="text-xs text-orange-300/80 mt-1">
                  Vá em <strong>Configurações do site</strong> → <strong>Notificações</strong> → <strong>Permitir</strong>
                </p>
              </div>
            </div>
          </div>
        )}

        {'Notification' in window && Notification.permission === 'default' && timers.length > 0 && (
          <div className="bg-blue-500/10 border border-blue-500/50 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <Bell className="w-4 h-4 text-blue-400 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-400">
                  Habilite as notificações para alertas
                </p>
                <p className="text-xs text-blue-300/80 mt-1">
                  Clique no botão <strong>Notif.</strong> acima para receber alertas quando os timers terminarem
                </p>
              </div>
            </div>
          </div>
        )}

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
            const progress = timer.active && timer.duration > 0
              ? ((timer.duration - remaining) / timer.duration) * 100
              : 0;

            return (
              <div
                key={timer.id}
                className={`glass-card p-3 rounded-lg border ${
                  isFinished ? 'border-green-500 animate-pulse bg-green-500/10' : 'border-border/50'
                }`}
              >
                <div className="flex items-center justify-between gap-3 mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm truncate">{timer.name}</span>
                      {timer.automatic && (
                        <Badge variant="secondary" className="text-xs gap-1 shrink-0">
                          <Zap className="w-3 h-3" />
                          Auto
                        </Badge>
                      )}
                    </div>
                    <div className={`text-lg font-mono font-bold ${
                      isFinished ? 'text-green-400' : remaining < 10 ? 'text-orange-400' : ''
                    }`}>
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
                    className="shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                {/* Progress Bar */}
                {!isFinished && timer.active && (
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-1000 ${
                        remaining < 10
                          ? 'bg-gradient-to-r from-orange-500 to-red-500'
                          : 'bg-gradient-to-r from-primary to-primary/50'
                      }`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                )}
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

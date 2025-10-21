import { useEffect, useRef } from 'react';
import { useLiveStore } from '@/store/liveStore';
import { toast } from '@/components/ui/sonner';
import { DOTA_EVENTS, formatGameTime } from '@/utils/gameTimers';

/**
 * useInGameAlerts - Sistema de alertas em tempo real
 *
 * Detecta eventos importantes e dispara notificações:
 * - Runas (30s antes de spawnar)
 * - Roshan (timer estimado)
 * - Stacks (5s antes)
 * - Lotus Pool
 * - Tormentor
 */

interface AlertConfig {
  enabled: boolean;
  soundEnabled: boolean;
  desktopNotifications: boolean;
}

const DEFAULT_CONFIG: AlertConfig = {
  enabled: true,
  soundEnabled: true,
  desktopNotifications: true,
};

export function useInGameAlerts(config: AlertConfig = DEFAULT_CONFIG) {
  const snapshot = useLiveStore((state) => state.snapshot);
  const isInGame = useLiveStore((state) => state.status === 'connected' && state.snapshot !== null);

  const lastGameTime = useRef<number>(-1);
  const alertedEvents = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!config.enabled || !isInGame || !snapshot?.map) {
      // Reset when not in game
      alertedEvents.current.clear();
      lastGameTime.current = -1;
      return;
    }

    const gameTime = snapshot.map.gameTime;

    // Só processa se o tempo mudou
    if (gameTime === lastGameTime.current) return;
    lastGameTime.current = gameTime;

    // Checar cada evento
    DOTA_EVENTS.forEach((eventConfig) => {
      const nextSpawnTime = getNextEventTime(eventConfig, gameTime);
      const timeUntilSpawn = nextSpawnTime - gameTime;

      // Alertar no pre-notify window
      const shouldAlert =
        timeUntilSpawn <= eventConfig.preNotify &&
        timeUntilSpawn > 0 &&
        !alertedEvents.current.has(`${eventConfig.type}-${nextSpawnTime}`);

      if (shouldAlert) {
        // Marcar como alertado
        alertedEvents.current.add(`${eventConfig.type}-${nextSpawnTime}`);

        // Determinar prioridade
        const priority = getPriority(eventConfig.type, timeUntilSpawn);

        // Disparar alerta visual
        showVisualAlert(eventConfig, timeUntilSpawn, priority);

        // Desktop notification para eventos críticos
        if (config.desktopNotifications && priority === 'critical') {
          showDesktopNotification(eventConfig, timeUntilSpawn);
        }

        // Som de alerta (opcional)
        if (config.soundEnabled) {
          playAlertSound(priority);
        }
      }

      // Limpar alertas antigos (mais de 2 minutos atrás)
      if (timeUntilSpawn < -120) {
        alertedEvents.current.delete(`${eventConfig.type}-${nextSpawnTime}`);
      }
    });

    // Cleanup de alertas muito antigos
    if (alertedEvents.current.size > 100) {
      alertedEvents.current.clear();
    }
  }, [snapshot, isInGame, config]);
}

function getNextEventTime(config: typeof DOTA_EVENTS[0], currentGameTime: number): number {
  if (currentGameTime < config.firstSpawn) {
    return config.firstSpawn;
  }
  const timeSinceFirst = currentGameTime - config.firstSpawn;
  const intervalsPassed = Math.floor(timeSinceFirst / config.interval);
  return config.firstSpawn + (intervalsPassed + 1) * config.interval;
}

function getPriority(eventType: string, timeUntilSpawn: number): 'critical' | 'high' | 'medium' | 'low' {
  // Eventos críticos: Runas de Bounty/Power, Roshan
  if (eventType === 'bounty-rune' || eventType === 'power-rune') {
    if (timeUntilSpawn <= 10) return 'critical';
    if (timeUntilSpawn <= 20) return 'high';
    return 'medium';
  }

  if (eventType === 'roshan') {
    return 'critical';
  }

  // Stack timing é crítico nos últimos 5s
  if (eventType === 'stack') {
    if (timeUntilSpawn <= 5) return 'critical';
    return 'high';
  }

  // Outros eventos
  if (timeUntilSpawn <= 10) return 'high';
  return 'medium';
}

function showVisualAlert(
  eventConfig: typeof DOTA_EVENTS[0],
  timeUntilSpawn: number,
  priority: 'critical' | 'high' | 'medium' | 'low'
) {
  const minutes = Math.floor(timeUntilSpawn / 60);
  const seconds = Math.floor(timeUntilSpawn % 60);
  const timeStr = minutes > 0
    ? `${minutes}m ${seconds}s`
    : `${seconds}s`;

  const message = `${eventConfig.icon} ${eventConfig.name} em ${timeStr}`;

  // Configurar toast baseado na prioridade
  const toastConfig: any = {
    description: getAlertDescription(eventConfig.type, timeUntilSpawn),
    duration: priority === 'critical' ? 8000 : 5000,
  };

  switch (priority) {
    case 'critical':
      toast.error(message, {
        ...toastConfig,
        className: 'border-red-500 bg-red-950/90',
      });
      break;
    case 'high':
      toast.warning(message, {
        ...toastConfig,
        className: 'border-orange-500 bg-orange-950/90',
      });
      break;
    case 'medium':
      toast.info(message, toastConfig);
      break;
    default:
      toast(message, toastConfig);
  }
}

function getAlertDescription(eventType: string, timeUntilSpawn: number): string {
  switch (eventType) {
    case 'bounty-rune':
      return 'Prepare-se para contestar runas de bounty!';
    case 'power-rune':
      return 'Runa de poder vai spawnar - controle o rio!';
    case 'stack':
      if (timeUntilSpawn <= 5) {
        return 'AGORA! Stack os camps!';
      }
      return 'Prepare-se para stackar camps';
    case 'roshan':
      return 'Roshan pode ter renascido - cheque a pit!';
    case 'tormentor':
      return 'Tormentor disponível - farm e XP garantido';
    case 'lotus':
      return 'Lotus Pool spawnou - cure seu time!';
    case 'water-rune':
      return 'Runas de água disponíveis';
    case 'outpost':
      return 'Outposts dão XP - capture se possível';
    default:
      return 'Objetivo importante disponível';
  }
}

function showDesktopNotification(
  eventConfig: typeof DOTA_EVENTS[0],
  timeUntilSpawn: number
) {
  if (!('Notification' in window)) return;

  if (Notification.permission === 'granted') {
    const minutes = Math.floor(timeUntilSpawn / 60);
    const seconds = Math.floor(timeUntilSpawn % 60);
    const timeStr = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;

    new Notification(`${eventConfig.icon} ${eventConfig.name}`, {
      body: `Spawna em ${timeStr} - ${getAlertDescription(eventConfig.type, timeUntilSpawn)}`,
      icon: '/icon-192x192.png',
      badge: '/icon-192x192.png',
      tag: eventConfig.type,
      requireInteraction: false,
      silent: false,
    });
  } else if (Notification.permission !== 'denied') {
    Notification.requestPermission();
  }
}

function playAlertSound(priority: 'critical' | 'high' | 'medium' | 'low') {
  // Criar som usando Web Audio API
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  // Frequência baseada na prioridade
  switch (priority) {
    case 'critical':
      oscillator.frequency.value = 880; // A5 - agudo
      gainNode.gain.value = 0.3;
      break;
    case 'high':
      oscillator.frequency.value = 660; // E5
      gainNode.gain.value = 0.2;
      break;
    case 'medium':
      oscillator.frequency.value = 523; // C5
      gainNode.gain.value = 0.15;
      break;
    default:
      oscillator.frequency.value = 440; // A4
      gainNode.gain.value = 0.1;
  }

  oscillator.type = 'sine';
  oscillator.start();

  // Fade out
  gainNode.gain.exponentialRampToValueAtTime(
    0.00001,
    audioContext.currentTime + 0.3
  );

  oscillator.stop(audioContext.currentTime + 0.3);
}

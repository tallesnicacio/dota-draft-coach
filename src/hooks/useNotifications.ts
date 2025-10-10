import { useEffect, useRef } from 'react';
import { useTimerStore } from '@/store/timerStore';
import { toast } from 'sonner';

export const useNotifications = () => {
  const { currentTime, timers, notificationSettings, roshanTimer } = useTimerStore();
  const notifiedTimers = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!notificationSettings.enabled) return;

    // Check timers
    timers.forEach((timer) => {
      if (!timer.enabled) return;

      const timeToSpawn = timer.nextSpawn - currentTime;
      const notificationKey = `${timer.id}-${timer.nextSpawn}`;

      // Notify when time is close
      if (
        timeToSpawn > 0 &&
        timeToSpawn <= timer.notifyBefore &&
        !notifiedTimers.current.has(notificationKey)
      ) {
        notifiedTimers.current.add(notificationKey);
        
        const message = `${timer.label} em ${timeToSpawn}s`;
        
        toast.info(message, {
          duration: 3000,
          position: 'top-center',
        });

        // Vibrate
        if (notificationSettings.vibrate && 'vibrate' in navigator) {
          navigator.vibrate(200);
        }

        // Play sound (opcional - pode adicionar depois)
        if (notificationSettings.sound) {
          // Beep básico
          try {
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.value = 800;
            gainNode.gain.value = 0.3;
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.1);
          } catch (e) {
            // Ignore audio errors
          }
        }
      }

      // Reset notification when spawn passes
      if (timeToSpawn < -5) {
        notifiedTimers.current.delete(notificationKey);
      }
    });

    // Check Roshan timers
    if (roshanTimer.minRespawn) {
      const timeToMin = roshanTimer.minRespawn - currentTime;
      const notificationKeyMin = `roshan-min-${roshanTimer.minRespawn}`;

      if (
        timeToMin > 0 &&
        timeToMin <= 30 &&
        !notifiedTimers.current.has(notificationKeyMin)
      ) {
        notifiedTimers.current.add(notificationKeyMin);
        toast.warning(`Roshan respawn mínimo em ${timeToMin}s`, {
          duration: 5000,
          position: 'top-center',
        });

        if (notificationSettings.vibrate && 'vibrate' in navigator) {
          navigator.vibrate([200, 100, 200]);
        }
      }
    }

    if (roshanTimer.aegisExpiry) {
      const timeToExpiry = roshanTimer.aegisExpiry - currentTime;
      const notificationKeyAegis = `aegis-expiry-${roshanTimer.aegisExpiry}`;

      if (
        timeToExpiry > 0 &&
        timeToExpiry <= 30 &&
        !notifiedTimers.current.has(notificationKeyAegis)
      ) {
        notifiedTimers.current.add(notificationKeyAegis);
        toast.error(`Aegis expira em ${timeToExpiry}s!`, {
          duration: 5000,
          position: 'top-center',
        });

        if (notificationSettings.vibrate && 'vibrate' in navigator) {
          navigator.vibrate([300, 100, 300, 100, 300]);
        }
      }
    }
  }, [currentTime, timers, notificationSettings, roshanTimer]);

  const requestPermission = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  };

  return { requestPermission };
};

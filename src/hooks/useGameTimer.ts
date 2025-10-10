import { useEffect } from 'react';
import { useTimerStore } from '@/store/timerStore';

export const useGameTimer = () => {
  const { gameStartTime, isRunning, updateCurrentTime } = useTimerStore();

  useEffect(() => {
    if (!isRunning || !gameStartTime) return;

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - gameStartTime) / 1000);
      updateCurrentTime(elapsed);
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, gameStartTime, updateCurrentTime]);
};

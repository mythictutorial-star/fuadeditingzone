import { useState, useEffect } from 'react';

export const useAnimatedCounter = (end: number, duration: number = 2000, trigger?: any) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime: number | null = null;
    let animationFrame: number;

    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      
      // Easing: Ease Out Quart
      const ease = 1 - Math.pow(1 - progress, 4);
      
      setCount(Math.floor(ease * end));

      if (progress < 1) {
        animationFrame = requestAnimationFrame(step);
      }
    };

    animationFrame = requestAnimationFrame(step);

    return () => cancelAnimationFrame(animationFrame);
  }, [end, duration, trigger]);

  return count;
};
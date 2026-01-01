import { useState, useRef, useEffect } from 'react';

export const useIntersectionObserver = (options: IntersectionObserverInit & { triggerOnce?: boolean }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const currentRef = containerRef.current;
    if (!currentRef) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) {
          setIsVisible(true);
          setIsExiting(false);
          if (options.triggerOnce) {
            observer.unobserve(entry.target);
          }
        } else {
            if (isVisible) { // Only trigger exit if it was previously visible
                setIsExiting(true);
            }
            setIsVisible(false);
        }
      },
      options
    );

    observer.observe(currentRef);

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [options, isVisible]);

  return [containerRef, isVisible, isExiting] as const;
};
import React, { useState, useRef, useEffect } from 'react';

export const LazyImage: React.FC<{ src: string; alt: string; className?: string; loadIndex?: number }> = ({ src, alt, className, loadIndex = 0 }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="relative w-full h-full bg-white/5 rounded-lg overflow-hidden">
      {!isLoaded && (
        <div className="absolute inset-0 shimmer-bg opacity-30"></div>
      )}
      {isInView && (
        <img
          src={src}
          alt={alt}
          onLoad={() => setIsLoaded(true)}
          loading="lazy"
          decoding="async"
          className={`${className} transition-opacity duration-500 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
        />
      )}
    </div>
  );
};
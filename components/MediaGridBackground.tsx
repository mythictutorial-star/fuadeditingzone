import React, { useState, useEffect, useRef } from 'react';
import { graphicWorks, vfxEdits } from '../data';
import { useParallax } from '../contexts/ParallaxContext';

const shuffleArray = (array: any[]) => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
};

// Use lower quality thumbnails for background grid to save bandwidth
const allMedia = [
    ...graphicWorks.map(item => ({ type: 'image' as const, url: item.imageUrl, id: `g-${item.id}` })),
    ...vfxEdits.map(item => ({ type: 'video' as const, url: item.url, id: `v-${item.id}` }))
];

const getGridSize = () => window.innerWidth < 768 ? 16 : 30;

const getShuffledMedia = (size: number) => {
    const shuffled = shuffleArray(allMedia);
    const loopedMedia: typeof allMedia = [];
    while (loopedMedia.length < size) {
        loopedMedia.push(...shuffled);
    }
    return loopedMedia.slice(0, size);
};

const GridCell: React.FC<{ item: typeof allMedia[0] }> = ({ item }) => {
    const videoRef = useRef<HTMLVideoElement>(null);

    const handleMouseEnter = () => {
        if (videoRef.current) {
            videoRef.current.play().catch(() => {});
        }
    };

    const handleMouseLeave = () => {
        if (videoRef.current) {
            videoRef.current.pause();
            videoRef.current.currentTime = 0;
        }
    };

    return (
        <div 
            className="relative w-full h-full rounded-sm overflow-hidden bg-black shadow-lg border border-white/5 group"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            {item.type === 'image' && (
                <img 
                    src={item.url} 
                    alt="VFX & Graphic Design Portfolio Grid Item" 
                    loading="lazy"
                    decoding="async"
                    className="absolute inset-0 w-full h-full object-cover grayscale-[0.5] brightness-50 group-hover:grayscale-0 group-hover:brightness-100 transition-all duration-700" 
                />
            )}
            {item.type === 'video' && item.url && (
                <video 
                    ref={videoRef}
                    src={item.url} 
                    loop 
                    muted 
                    playsInline 
                    preload="none"
                    className="absolute inset-0 w-full h-full object-cover brightness-50 group-hover:brightness-100 transition-all duration-700" 
                />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
        </div>
    );
};

const GridLayer: React.FC<{ items: typeof allMedia; isVisible: boolean }> = React.memo(({ items, isVisible }) => {
    return (
        <div className={`absolute inset-0 grid grid-cols-4 md:grid-cols-6 gap-1 md:gap-2 transition-opacity duration-[2000ms] ease-in-out ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
            {items.map((item, index) => (
                <GridCell key={`${item.id}-${index}`} item={item} />
            ))}
        </div>
    );
});

export const MediaGridBackground: React.FC = () => {
    const [gridOneItems, setGridOneItems] = useState<typeof allMedia>([]);
    const [gridTwoItems, setGridTwoItems] = useState<typeof allMedia>([]);
    const [isGridOneVisible, setIsGridOneVisible] = useState(true);
    const { x, y } = useParallax();

    useEffect(() => {
        const size = getGridSize();
        // Delay grid initialization to prioritize hero section
        const timer = setTimeout(() => {
            setGridOneItems(getShuffledMedia(size));
            setGridTwoItems(getShuffledMedia(size));
        }, 500);
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        const intervalId = setInterval(() => {
            const size = getGridSize();
            if (isGridOneVisible) {
                setGridTwoItems(getShuffledMedia(size));
            } else {
                setGridOneItems(getShuffledMedia(size));
            }
            setIsGridOneVisible(prev => !prev);
        }, 30000);

        return () => clearInterval(intervalId);
    }, [isGridOneVisible]);

    const containerStyle = {
        transform: `perspective(1500px) rotateX(${y * 2}deg) rotateY(${x * 2}deg) scale(1.1)`,
        transition: 'transform 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
        willChange: 'transform' as const,
    };

    return (
        <div 
            className="fixed inset-[-5%] -z-10 pointer-events-none opacity-40 md:opacity-50"
            style={containerStyle}
        >
            {gridOneItems.length > 0 && <GridLayer items={gridOneItems} isVisible={isGridOneVisible} />}
            {gridTwoItems.length > 0 && <GridLayer items={gridTwoItems} isVisible={!isGridOneVisible} />}
            <div className="absolute inset-0 bg-black/40"></div>
        </div>
    );
};
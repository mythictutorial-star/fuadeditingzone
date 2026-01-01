import React, { useRef, useEffect } from 'react';
import { useParallax } from '../contexts/ParallaxContext';

export const VFXBackground = () => {
    const { x, y } = useParallax();
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        // Defer video playback to prioritize main content rendering
        const playVideo = () => {
            if (videoRef.current) {
                videoRef.current.play().catch(() => {});
            }
        };

        if ('requestIdleCallback' in window) {
            window.requestIdleCallback(playVideo);
        } else {
            setTimeout(playVideo, 1000);
        }
    }, []);

    const backgroundStyle = {
      transform: `translateX(${x * 15}px) translateY(${y * 15}px) scale(1.1)`,
      transition: 'transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
      willChange: 'transform' as const
    };

    return (
        <div className="fixed inset-0 w-full h-full -z-20 bg-black overflow-hidden pointer-events-none">
            <video
                ref={videoRef}
                loop
                muted
                playsInline
                preload="metadata"
                poster="https://www.dropbox.com/scl/fi/uq92m0e5o05mvzt65pd43/Gemini_Generated_Image_hhs74dhhs74dhhs7.png?rlkey=kq52p7r4aetsyokvags5dx73x&raw=1"
                className="absolute inset-0 w-full h-full object-cover opacity-15 filter grayscale contrast-125"
                style={backgroundStyle}
                src="https://videos.pexels.com/video-files/4784149/4784149-hd.mp4"
            />
            
            {/* Visual Overlays */}
            <div className="absolute inset-0 bg-gradient-to-br from-red-600/5 via-transparent to-black z-0"></div>
            <div className="absolute inset-0 bg-black/60 z-0"></div>
            
            {/* Scanline Effect */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%)] bg-[length:100%_2px] pointer-events-none z-10 opacity-20"></div>
        </div>
    );
};
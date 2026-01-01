
import React, { useState, useRef, useEffect } from 'react';
import type { VideoWork } from '../hooks/types';
import { useDraggable } from '../hooks/useDraggable';
import { CloseIcon, PlayIcon, PauseIcon, VolumeOnIcon, VolumeOffIcon, ChevronRightIcon } from './Icons';

interface VideoPipPlayerProps {
  video: VideoWork;
  onClose: () => void;
  currentTime: number;
  setCurrentTime: (time: number) => void;
}

export const VideoPipPlayer: React.FC<VideoPipPlayerProps> = ({ video, onClose, currentTime, setCurrentTime }) => {
    const handleRef = useRef<HTMLDivElement>(null);
    const { ref: dragRef, style: dragStyle, isDragging } = useDraggable(handleRef);
    const videoRef = useRef<HTMLVideoElement>(null);
    const ytPlayerRef = useRef<any>(null);

    const [isPlaying, setIsPlaying] = useState(true);
    const [isMuted, setIsMuted] = useState(false);

    const isYouTube = !!video.videoId;

    // --- YouTube API Logic ---
    useEffect(() => {
        // FIX: Using type casting to access YT property on window object
        if (!isYouTube || !(window as any).YT) return;

        const timer = setTimeout(() => {
            const container = document.getElementById('pip-youtube-player');
            if (!container) return;

            // FIX: Using type casting to access YT property on window object
            ytPlayerRef.current = new (window as any).YT.Player('pip-youtube-player', {
                videoId: video.videoId,
                playerVars: {
                    autoplay: 1,
                    mute: isMuted ? 1 : 0,
                    rel: 0,
                    modestbranding: 1,
                    enablejsapi: 1,
                    start: Math.floor(currentTime) // Seamless seek on load
                },
                events: {
                    onReady: (event: any) => {
                        event.target.playVideo();
                    },
                    onStateChange: (event: any) => {
                        // FIX: Using type casting to access YT property on window object
                        if (event.data === (window as any).YT.PlayerState.PLAYING) setIsPlaying(true);
                        // FIX: Using type casting to access YT property on window object
                        else if (event.data === (window as any).YT.PlayerState.PAUSED || event.data === (window as any).YT.PlayerState.ENDED) setIsPlaying(false);
                    }
                }
            });
        }, 100);

        return () => {
            clearTimeout(timer);
            if (ytPlayerRef.current) {
                ytPlayerRef.current.destroy();
                ytPlayerRef.current = null;
            }
        };
    }, [video.videoId, isYouTube]);

    // Periodically sync time back to global state
    useEffect(() => {
        if (!isPlaying) return;
        const interval = setInterval(() => {
            if (isYouTube) {
                if (ytPlayerRef.current && ytPlayerRef.current.getCurrentTime) {
                    setCurrentTime(ytPlayerRef.current.getCurrentTime());
                }
            } else {
                if (videoRef.current) {
                    setCurrentTime(videoRef.current.currentTime);
                }
            }
        }, 1000);
        return () => clearInterval(interval);
    }, [isPlaying, isYouTube, setCurrentTime]);

    const togglePlay = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (isYouTube) {
            if (ytPlayerRef.current) {
                const state = ytPlayerRef.current.getPlayerState();
                // FIX: Using type casting to access YT property on window object
                if (state === (window as any).YT.PlayerState.PLAYING) ytPlayerRef.current.pauseVideo();
                else ytPlayerRef.current.playVideo();
            }
        } else {
            const videoEl = videoRef.current;
            if (!videoEl) return;
            if (videoEl.paused) videoEl.play();
            else videoEl.pause();
        }
    };

    const toggleMute = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsMuted(prev => !prev);
    };

    useEffect(() => {
        if (isYouTube) {
            if (ytPlayerRef.current && ytPlayerRef.current.mute) {
                if (isMuted) ytPlayerRef.current.mute();
                else ytPlayerRef.current.unMute();
            }
            return;
        }
        const videoEl = videoRef.current;
        if (videoEl) {
            const updatePlayingState = () => setIsPlaying(!videoEl.paused);
            videoEl.addEventListener('play', updatePlayingState);
            videoEl.addEventListener('pause', updatePlayingState);
            return () => {
                videoEl.removeEventListener('play', updatePlayingState);
                videoEl.removeEventListener('pause', updatePlayingState);
            };
        }
    }, [isYouTube, isMuted]);

    // Apply startup time for local videos
    useEffect(() => {
        if (!isYouTube && videoRef.current && currentTime > 0) {
            videoRef.current.currentTime = currentTime;
        }
    }, [isYouTube]);

    return (
        <div 
            ref={dragRef}
            style={dragStyle}
            className={`fixed bottom-24 right-4 md:bottom-10 md:right-10 z-[150] w-[260px] md:w-[380px] aspect-video rounded-2xl overflow-hidden shadow-[0_20px_80px_rgba(0,0,0,0.8)] border border-white/20 bg-black transition-all duration-300 ${isDragging ? 'scale-105 shadow-red-600/40 ring-2 ring-red-600/30' : ''} animate-popup-scale-in`}
        >
            <div className="relative w-full h-full group">
                {isYouTube ? (
                    <div id="pip-youtube-player" className="w-full h-full pointer-events-auto"></div>
                ) : (
                    <video 
                        key={video.url}
                        ref={videoRef}
                        src={video.url} 
                        autoPlay
                        loop 
                        muted={isMuted}
                        playsInline
                        className="w-full h-full object-cover"
                    />
                )}
                
                {/* Controls Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-black/60 opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col justify-between pointer-events-none">
                    <div ref={handleRef} className="p-3 text-white text-[10px] font-black uppercase tracking-widest cursor-move flex items-center justify-between pointer-events-auto">
                        <span className="truncate pr-4">{video.title || 'Playing Work'}</span>
                        <div className="flex gap-1">
                            <div className="w-1.5 h-1.5 bg-red-600 rounded-full animate-pulse"></div>
                            <span>PiP</span>
                        </div>
                    </div>

                    <div className="flex items-center justify-center gap-6 p-4 pointer-events-auto">
                        <button onClick={togglePlay} className="text-white p-2.5 rounded-full bg-white/5 hover:bg-red-600 transition-all scale-90 md:scale-100">
                            {isPlaying ? <PauseIcon className="w-5 h-5" /> : <PlayIcon className="w-5 h-5" />}
                        </button>
                        <button onClick={toggleMute} className="text-white p-2.5 rounded-full bg-white/5 hover:bg-white/10 transition-all scale-90 md:scale-100">
                            {isMuted ? <VolumeOffIcon className="w-5 h-5" /> : <VolumeOnIcon className="w-5 h-5" />}
                        </button>
                        <button 
                            onClick={(e) => { e.stopPropagation(); onClose(); }} 
                            className="text-white p-2.5 rounded-full bg-white/10 hover:bg-white/20 transition-all scale-90 md:scale-100 group/ret"
                            title="Return to View"
                        >
                            <ChevronRightIcon className="w-5 h-5 -rotate-90 group-hover:-translate-y-1 transition-transform" />
                        </button>
                    </div>
                </div>
                
                <button 
                    onClick={(e) => { e.stopPropagation(); onClose(); }} 
                    className="absolute top-2 right-2 text-white/50 hover:text-white p-1.5 rounded-full transition-colors z-10 md:hidden"
                >
                    <CloseIcon className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
};

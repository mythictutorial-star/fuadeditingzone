import React, { useEffect } from 'react';
import { CloseIcon, YouTubeIcon, ChevronRightIcon, GlobeAltIcon, HandThumbUpIcon, CheckCircleIcon } from './Icons';
import { useYouTubeChannelStats } from '../hooks/useYouTubeChannelStats';
import { siteConfig } from '../config';

interface YouTubeRedirectPopupProps {
  onClose: () => void;
  onConfirm: () => void;
}

export const YouTubeRedirectPopup: React.FC<YouTubeRedirectPopupProps> = ({ onClose, onConfirm }) => {
    const { stats, loading, formatNumber } = useYouTubeChannelStats();

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    const channelName = stats.channelTitle || siteConfig.branding.name;
    const channelPic = stats.channelProfilePic || siteConfig.branding.profilePicUrl;
    const description = stats.channelDescription || "Explore my official YouTube channel for high-end cinematic visuals, VFX breakdowns, and creative editing projects.";

    return (
        <div role="dialog" aria-modal="true" className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4 animate-fade-in backdrop-blur-xl select-none">
            <div
                className="relative bg-[#0a0a0a] border border-white/10 w-full max-w-lg rounded-[2rem] overflow-hidden shadow-[0_0_150px_rgba(220,38,38,0.2)] animate-popup-scale-in"
                onClick={e => e.stopPropagation()}
            >
                {/* Header Decoration */}
                <div className="h-1.5 bg-red-600 w-full shadow-[0_0_20px_rgba(220,38,38,0.8)]"></div>
                
                <div className="p-6 md:p-12">
                    <div className="flex flex-col items-center mb-6 md:mb-8">
                        {/* Channel Identity */}
                        <div className="relative mb-5 md:mb-6">
                            <div className="w-20 h-20 md:w-32 md:h-32 rounded-full overflow-hidden border-2 border-white/20 shadow-2xl bg-gray-900 ring-4 ring-red-600/20">
                                <img src={channelPic} alt={channelName} className="w-full h-full object-cover object-top" />
                            </div>
                            <div className="absolute -bottom-1 -right-1 bg-red-600 text-white p-1 rounded-full shadow-lg border border-white/20">
                                <CheckCircleIcon className="w-4 h-4 md:w-5 md:h-5" />
                            </div>
                        </div>

                        <div className="text-center space-y-2 w-full">
                            <h2 className="text-xl md:text-3xl font-black text-white uppercase tracking-tighter flex items-center gap-2 justify-center">
                                {channelName}
                                <YouTubeIcon className="w-5 h-5 md:w-6 md:h-6 text-red-600" />
                            </h2>
                            
                            {/* Detailed Stats Row - Optimized for no clipping on mobile */}
                            <div className="flex items-center justify-center gap-4 sm:gap-6 mt-4 w-full px-2">
                                <div className="text-center flex-1">
                                    <p className="text-base md:text-xl font-black text-white leading-none">
                                        {loading ? '...' : formatNumber(stats.subscribers)}
                                    </p>
                                    <span className="text-[7px] md:text-[10px] text-gray-500 font-bold uppercase tracking-widest block mt-1">Subs</span>
                                </div>
                                <div className="w-px h-6 bg-white/10 flex-shrink-0"></div>
                                <div className="text-center flex-1">
                                    <p className="text-base md:text-xl font-black text-white leading-none">
                                        {loading ? '...' : formatNumber(stats.views)}
                                    </p>
                                    <span className="text-[7px] md:text-[10px] text-gray-500 font-bold uppercase tracking-widest block mt-1">Reach</span>
                                </div>
                                <div className="w-px h-6 bg-white/10 flex-shrink-0"></div>
                                <div className="text-center flex-1">
                                    <p className="text-base md:text-xl font-black text-white leading-none">
                                        {loading ? '...' : stats.videoCount}
                                    </p>
                                    <span className="text-[7px] md:text-[10px] text-gray-500 font-bold uppercase tracking-widest block mt-1">Videos</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Channel Description */}
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-5 md:p-6 mb-8 md:mb-10">
                        <h4 className="text-[9px] md:text-[10px] text-red-600 font-black uppercase tracking-[0.2em] mb-2 md:mb-3">About Channel</h4>
                        <p className="text-gray-400 text-[11px] md:text-sm leading-relaxed font-medium line-clamp-4 md:line-clamp-none">
                            {description}
                        </p>
                    </div>

                    <div className="flex flex-col gap-4">
                        <button 
                            onClick={onConfirm}
                            className="btn-angular btn-3d bg-red-600 text-white font-black py-4 md:py-5 px-6 transition-all duration-300 flex items-center justify-center gap-3 shadow-[0_15px_40px_rgba(220,38,38,0.4)] hover:bg-red-700 group/btn"
                        >
                            <span className="uppercase tracking-[0.2em] text-[10px] md:text-xs">Explore Video Portfolio</span>
                            <ChevronRightIcon className="w-3 h-3 md:w-4 md:h-4 transition-transform group-hover/btn:translate-x-1" />
                        </button>
                        
                        <a 
                            href={`https://www.youtube.com/channel/${siteConfig.api.channelId}?sub_confirmation=1`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-2 text-gray-500 hover:text-white text-[8px] md:text-[10px] uppercase tracking-[0.3em] font-black py-2 md:py-3 transition-colors group"
                        >
                            <YouTubeIcon className="w-3.5 h-3.5 md:w-4 md:h-4 group-hover:text-red-600 transition-colors" />
                            Official YouTube Page
                        </a>
                    </div>
                </div>

                <button 
                    onClick={onClose}
                    className="absolute top-4 right-4 md:top-6 md:right-6 text-gray-600 hover:text-white transition-colors bg-white/5 p-1.5 md:p-2 rounded-full border border-white/10"
                >
                    <CloseIcon className="w-4 h-4 md:w-5 md:h-5" />
                </button>
            </div>
        </div>
    );
};

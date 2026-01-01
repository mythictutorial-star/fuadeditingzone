import React, { useState, useEffect } from 'react';
import type { GraphicWork, VideoWork, ModalItem } from '../hooks/types';
import { 
    CloseIcon, ZoomInIcon, ZoomOutIcon, PlayIcon, 
    ThreeDotsIcon, CheckCircleIcon, HeartHoverIcon,
    CommentIcon, ShareIcon, BookmarkIcon,
    EyeIcon, ChevronLeftIcon, ChevronRightIcon, DownloadIcon
} from './Icons';
import { siteConfig } from '../config';
import { motion, AnimatePresence } from 'framer-motion';

interface ModalViewerProps {
  state: { items: ModalItem[]; currentIndex: number };
  onClose: () => void;
  onNext: (idx: number) => void;
  onPrev: (idx: number) => void;
}

export const ModalViewer: React.FC<ModalViewerProps> = ({ state, onClose, onNext, onPrev }) => {
    const { items, currentIndex } = state;
    const currentItem = items[currentIndex];
    const [showShareToast, setShowShareToast] = useState(false);
    
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    const isImage = (item: ModalItem): item is GraphicWork => 'imageUrl' in item || ('mediaUrl' in item && (item as any).mediaType === 'image');
    const isVideo = (item: ModalItem): item is VideoWork => ('url' in item || 'videoId' in item || ('mediaUrl' in item && (item as any).mediaType === 'video'));
    
    const getImageUrl = () => {
        const item = currentItem as any;
        return item.imageUrl || item.mediaUrl || item.thumbnailUrl;
    };

    const getVideoUrl = () => {
        const item = currentItem as any;
        return item.url || item.mediaUrl;
    };

    const handleShare = () => {
        const item = currentItem as any;
        const type = item.userId ? 'post' : 'work';
        const url = `${window.location.origin}/${type}/${item.id}`;
        navigator.clipboard.writeText(url);
        setShowShareToast(true);
        setTimeout(() => setShowShareToast(false), 2000);
    };

    return (
        <div className="fixed inset-0 bg-black z-[9999] flex flex-col animate-fade-in overflow-hidden" onClick={onClose}>
            {/* Immersive Blurred Background */}
            <div className="absolute inset-0 bg-cover bg-center filter blur-2xl brightness-[0.15] opacity-60 scale-110 pointer-events-none" 
                 style={{ backgroundImage: `url(${isImage(currentItem) ? getImageUrl() : (currentItem.thumbnailUrl || siteConfig.branding.profilePicUrl)})` }} />

            {/* Header Overlay */}
            <div className="relative z-[100] flex justify-between items-center p-6 bg-gradient-to-b from-black/60 to-transparent flex-shrink-0">
                <div className="flex items-center gap-3">
                    <img src={siteConfig.branding.logoUrl} className="w-10 h-10 rounded-full border border-white/20" alt="FEZ" />
                    <div className="flex flex-col">
                        <span className="text-white font-bold text-[10px] uppercase tracking-widest">{isImage(currentItem) ? (currentItem as any).category : 'Cinematic Video'}</span>
                        <span className="text-zinc-500 font-bold text-[8px] uppercase tracking-widest">Protocol Viewer</span>
                    </div>
                </div>
                <div className="flex items-center gap-4" onClick={e => e.stopPropagation()}>
                    <button onClick={onClose} className="text-white p-3 rounded-full bg-white/5 border border-white/10 hover:bg-red-600 transition-all shadow-xl">
                        <CloseIcon className="h-6 w-6" />
                    </button>
                </div>
            </div>

            {/* Main Content Area: Optimized for "No Extra Area" */}
            <div className="flex-1 relative w-full flex items-center justify-center p-0 overflow-hidden" onClick={onClose}>
                <div className="relative w-full h-full flex items-center justify-center" onClick={e => e.stopPropagation()}>
                    {isImage(currentItem) ? (
                        <div className="w-full h-full flex items-center justify-center p-4">
                             <img 
                                src={getImageUrl()} 
                                className="max-w-full max-h-full object-contain shadow-[0_0_80px_rgba(0,0,0,0.5)] transition-all duration-700 animate-fade-in" 
                                alt={currentItem.title || "FEZ Artwork"}
                             />
                        </div>
                    ) : isVideo(currentItem) ? (
                        <div className="w-full h-full max-w-7xl max-h-[85vh] aspect-video bg-black rounded-xl shadow-2xl overflow-hidden border border-white/5 mx-4 md:mx-12">
                            {getVideoUrl() ? (
                                <video src={getVideoUrl()} controls autoPlay className="w-full h-full object-contain" />
                            ) : (
                                <iframe src={`https://www.youtube.com/embed/${currentItem.videoId}?autoplay=1`} className="w-full h-full border-0" allowFullScreen></iframe>
                            )}
                        </div>
                    ) : null}

                    {/* Navigation Controls */}
                    <button onClick={(e) => { e.stopPropagation(); onPrev((currentIndex - 1 + items.length) % items.length); }} className="absolute left-2 md:left-6 top-1/2 -translate-y-1/2 text-white/20 hover:text-white p-2 md:p-4 rounded-full transition-all z-[110] bg-black/20 md:bg-transparent backdrop-blur-sm md:backdrop-blur-none">
                        <ChevronLeftIcon className="w-10 h-10 md:w-12 md:h-12" />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); onNext((currentIndex + 1) % items.length); }} className="absolute right-2 md:right-6 top-1/2 -translate-y-1/2 text-white/20 hover:text-white p-2 md:p-4 rounded-full transition-all z-[110] bg-black/20 md:bg-transparent backdrop-blur-sm md:backdrop-blur-none">
                        <ChevronRightIcon className="w-10 h-10 md:w-12 md:h-12" />
                    </button>
                </div>
            </div>

            {/* Bottom Info Bar: Compressed and Immersive */}
            <div className="relative z-[100] bg-black/60 backdrop-blur-3xl border-t border-white/10 p-6 md:p-8 flex-shrink-0" onClick={e => e.stopPropagation()}>
                <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-1.5 flex-1 min-w-0">
                         <h3 className="text-white font-bold text-xl md:text-2xl uppercase tracking-tighter truncate">{currentItem.title || 'Master Design'}</h3>
                         <p className="text-zinc-400 text-[11px] md:text-sm font-medium leading-relaxed italic truncate opacity-80">{currentItem.description || (currentItem as any).caption || 'Exclusive creative project by Fuad Ahmed.'}</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <button onClick={handleShare} className="flex-1 md:flex-none bg-red-600 text-white font-bold py-4 px-10 uppercase tracking-widest text-[10px] shadow-[0_10px_20px_rgba(220,38,38,0.3)] active:scale-95 transition-all">Share Link</button>
                        <div className="hidden md:flex gap-2">
                             <div className="w-1.5 h-1.5 bg-red-600 rounded-full animate-pulse"></div>
                             <div className="w-1.5 h-1.5 bg-zinc-800 rounded-full"></div>
                             <div className="w-1.5 h-1.5 bg-zinc-800 rounded-full"></div>
                        </div>
                    </div>
                </div>
            </div>

            <AnimatePresence>
                {showShareToast && (
                    <motion.div initial={{opacity:0, y: 50}} animate={{opacity:1, y:0}} exit={{opacity:0, y:50}} className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-white text-black px-8 py-4 rounded-full font-bold uppercase text-xs tracking-widest shadow-2xl z-[120]">Link Copied</motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

import React, { useState, useEffect, useRef } from 'react';
import type { GraphicWork, VideoWork, ModalItem } from '../hooks/types';
import { 
    CloseIcon, PlayIcon, CheckCircleIcon, HeartHoverIcon,
    ChatBubbleIcon, SendIcon, ChevronLeftIcon, ChevronRightIcon
} from './Icons';
import { siteConfig } from '../config';
import { motion, AnimatePresence } from 'framer-motion';
import { useUser } from '@clerk/clerk-react';
import { getDatabase, ref, onValue, push, remove, set, get } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';

interface ModalViewerProps {
  state: { items: ModalItem[]; currentIndex: number };
  onClose: () => void;
  onNext: (idx: number) => void;
  onPrev: (idx: number) => void;
}

export const ModalViewer: React.FC<ModalViewerProps> = ({ state, onClose, onNext, onPrev }) => {
    const { items, currentIndex } = state;
    const currentItem = items[currentIndex];
    const { user, isSignedIn } = useUser();
    const db = getDatabase();
    
    const [showShareToast, setShowShareToast] = useState(false);
    const [comments, setComments] = useState<any[]>([]);
    const [newComment, setNewComment] = useState('');
    const [likes, setLikes] = useState<Record<string, boolean>>({});
    const commentsEndRef = useRef<HTMLDivElement>(null);

    const isDynamicPost = !!(currentItem as any).userId;
    const isOwner = user?.id === (currentItem as any).userId;
    const isLiked = user ? !!likes?.[user.id] : false;

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    useEffect(() => {
        if (isDynamicPost && (currentItem as any).id) {
            const postRef = ref(db, `explore_posts/${(currentItem as any).id}`);
            const unsub = onValue(postRef, (snap) => {
                const data = snap.val();
                if (data) {
                    setLikes(data.likes || {});
                    const cms = data.comments ? Object.entries(data.comments).map(([id, val]: [string, any]) => ({ id, ...val })) : [];
                    setComments(cms.sort((a, b) => a.timestamp - b.timestamp));
                }
            });
            return () => unsub();
        } else {
            setComments([]);
            setLikes({});
        }
    }, [currentItem, isDynamicPost]);

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

    const handleLike = async () => {
        if (!isSignedIn || !user || !isDynamicPost) return;
        const likeRef = ref(db, `explore_posts/${(currentItem as any).id}/likes/${user.id}`);
        if (isLiked) await remove(likeRef);
        else await set(likeRef, true);
    };

    const handlePostComment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isSignedIn || !user || !newComment.trim() || !isDynamicPost) return;
        const commentRef = ref(db, `explore_posts/${(currentItem as any).id}/comments`);
        await push(commentRef, {
            userId: user.id,
            userName: user.username || user.fullName,
            userAvatar: user.imageUrl,
            text: newComment.trim(),
            timestamp: Date.now()
        });
        setNewComment('');
        setTimeout(() => commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    };

    return (
        <div className="fixed inset-0 bg-black z-[9999] flex flex-col md:flex-row animate-fade-in overflow-hidden">
            {/* Background Layer */}
            <div className="absolute inset-0 bg-cover bg-center filter blur-2xl brightness-[0.1] opacity-60 scale-110 pointer-events-none" 
                 style={{ backgroundImage: `url(${getImageUrl() || siteConfig.branding.profilePicUrl})` }} />

            {/* Main Visual Content (Left Side on Desktop) */}
            <div className="relative flex-1 flex flex-col min-w-0 bg-black/40">
                {/* Header */}
                <div className="relative z-[100] flex justify-between items-center p-4 md:p-6 bg-gradient-to-b from-black/80 to-transparent flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <img src={siteConfig.branding.logoUrl} className="w-8 h-8 md:w-10 md:h-10 rounded-full border border-white/20" alt="" />
                        <div className="flex flex-col">
                            <span className="text-white font-black text-[9px] md:text-[10px] uppercase tracking-widest">{(currentItem as any).category || 'Portfolio Work'}</span>
                            <span className="text-zinc-500 font-bold text-[7px] md:text-[8px] uppercase tracking-widest">Selected Legend Protocol</span>
                        </div>
                    </div>
                    <button onClick={onClose} className="md:hidden text-white p-2 rounded-full bg-white/5 border border-white/10 hover:bg-red-600 transition-all">
                        <CloseIcon className="h-5 w-5" />
                    </button>
                </div>

                {/* Content Area */}
                <div className="flex-1 relative flex items-center justify-center overflow-hidden">
                    <div className="relative w-full h-full flex items-center justify-center p-2 md:p-8" onClick={onClose}>
                        <div className="relative max-w-full max-h-full flex items-center justify-center" onClick={e => e.stopPropagation()}>
                            {isImage(currentItem) ? (
                                <img src={getImageUrl()} className="max-w-full max-h-full object-contain shadow-2xl animate-fade-in" alt="" />
                            ) : isVideo(currentItem) ? (
                                <div className="w-full h-full max-w-5xl aspect-video bg-black rounded-xl shadow-2xl overflow-hidden border border-white/5">
                                    {getVideoUrl() ? (
                                        <video src={getVideoUrl()} controls autoPlay className="w-full h-full object-contain" />
                                    ) : (
                                        <iframe src={`https://www.youtube.com/embed/${(currentItem as any).videoId}?autoplay=1`} className="w-full h-full border-0" allowFullScreen></iframe>
                                    )}
                                </div>
                            ) : null}

                            {/* Nav Buttons */}
                            <button onClick={(e) => { e.stopPropagation(); onPrev((currentIndex - 1 + items.length) % items.length); }} className="absolute left-0 md:-left-16 top-1/2 -translate-y-1/2 text-white/40 hover:text-white p-2 md:p-4 transition-all">
                                <ChevronLeftIcon className="w-8 h-8 md:w-12 md:h-12" />
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); onNext((currentIndex + 1) % items.length); }} className="absolute right-0 md:-right-16 top-1/2 -translate-y-1/2 text-white/40 hover:text-white p-2 md:p-4 transition-all">
                                <ChevronRightIcon className="w-8 h-8 md:w-12 md:h-12" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Mobile Bottom Info */}
                <div className="md:hidden p-4 bg-black/80 border-t border-white/5 backdrop-blur-xl">
                    <h3 className="text-white font-black text-sm uppercase truncate">{(currentItem as any).title || 'Masterwork'}</h3>
                    <p className="text-zinc-500 text-[10px] mt-1 line-clamp-1 italic">{(currentItem as any).caption || (currentItem as any).description || 'No additional data.'}</p>
                </div>
            </div>

            {/* Social Panel (Right Side on Desktop) */}
            <div className="w-full md:w-[400px] lg:w-[450px] bg-[#080808] border-l border-white/5 flex flex-col flex-shrink-0 z-[110]">
                {/* Panel Header */}
                <div className="hidden md:flex p-6 border-b border-white/5 items-center justify-between">
                    <div className="flex items-center gap-3">
                        <img src={(currentItem as any).userAvatar || siteConfig.branding.logoUrl} className="w-9 h-9 rounded-xl object-cover border border-white/10" alt="" />
                        <div>
                            <p className="text-white font-black text-xs uppercase tracking-tight">@{(currentItem as any).userName || 'selectedlegend'}</p>
                            <p className="text-red-500 font-black text-[8px] uppercase tracking-widest">{(currentItem as any).userRole || 'Visual Artist'}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/5 text-zinc-500 hover:text-white transition-all"><CloseIcon className="w-6 h-6" /></button>
                </div>

                {/* Description & Scrollable Comments */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">
                    <div className="space-y-4">
                        <h3 className="text-white font-black text-xl lg:text-2xl uppercase tracking-tighter">{(currentItem as any).title || 'Masterwork'}</h3>
                        <p className="text-zinc-400 text-sm leading-relaxed poppins-font">{(currentItem as any).caption || (currentItem as any).description || 'Protocol data archived.'}</p>
                        {isDynamicPost && (currentItem as any).tags && (
                            <div className="flex flex-wrap gap-2">
                                {(currentItem as any).tags.map((tag: string, i: number) => (
                                    <span key={i} className="px-2 py-0.5 bg-white/5 border border-white/5 rounded text-[8px] font-black text-zinc-500 uppercase tracking-widest">#{tag}</span>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="pt-8 border-t border-white/5 space-y-6">
                        <div className="flex items-center justify-between">
                            <h4 className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.3em]">Communication Feed</h4>
                            <span className="text-[10px] font-black text-zinc-700 uppercase">{comments.length} Signals</span>
                        </div>
                        
                        {comments.length === 0 ? (
                            <div className="py-20 text-center opacity-20">
                                <ChatBubbleIcon className="w-12 h-12 mx-auto mb-4" />
                                <p className="text-[9px] font-black uppercase tracking-[0.4em]">No signals received</p>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {comments.map((cm) => (
                                    <div key={cm.id} className="flex gap-4 group">
                                        <img src={cm.userAvatar} className="w-8 h-8 rounded-lg object-cover border border-white/10 flex-shrink-0" alt="" />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-[11px] font-black text-white uppercase tracking-tight">@{cm.userName}</span>
                                                <span className="text-[7px] text-zinc-700 font-bold uppercase">{new Date(cm.timestamp).toLocaleDateString()}</span>
                                            </div>
                                            <p className="text-zinc-400 text-xs leading-relaxed break-words poppins-font">{cm.text}</p>
                                        </div>
                                    </div>
                                ))}
                                <div ref={commentsEndRef} />
                            </div>
                        )}
                    </div>
                </div>

                {/* Interaction Footer */}
                <div className="p-6 bg-black/40 border-t border-white/5 space-y-6 backdrop-blur-3xl">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-6">
                            <button onClick={handleLike} className={`flex items-center gap-2 transition-all ${isLiked ? 'text-red-500 scale-110' : 'text-zinc-600 hover:text-white'}`}>
                                <i className={`fa-${isLiked ? 'solid' : 'regular'} fa-heart text-xl`}></i>
                                <span className="text-xs font-black uppercase tracking-widest">{Object.keys(likes).length}</span>
                            </button>
                            <button className="flex items-center gap-2 text-zinc-600">
                                <ChatBubbleIcon className="w-5 h-5" />
                                <span className="text-xs font-black uppercase tracking-widest">{comments.length}</span>
                            </button>
                        </div>
                        <button onClick={handleShare} className="text-zinc-500 hover:text-red-500 transition-colors">
                            <i className="fa-solid fa-share-nodes text-xl"></i>
                        </button>
                    </div>

                    {isDynamicPost && (
                        <form onSubmit={handlePostComment} className="relative">
                            <input 
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                                placeholder={isSignedIn ? "Add signal..." : "Log in to signal"}
                                disabled={!isSignedIn}
                                className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 pl-5 pr-12 text-xs text-white outline-none focus:border-red-600/50 transition-all font-medium placeholder-zinc-700" 
                            />
                            <button 
                                type="submit"
                                disabled={!newComment.trim()}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-red-600 rounded-xl text-white shadow-lg disabled:opacity-0 transition-opacity"
                            >
                                <SendIcon className="w-4 h-4" />
                            </button>
                        </form>
                    )}
                </div>
            </div>

            <AnimatePresence>
                {showShareToast && (
                    <motion.div initial={{opacity:0, y: 20}} animate={{opacity:1, y:0}} exit={{opacity:0}} className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-white text-black px-8 py-3 rounded-full font-black uppercase text-[10px] tracking-widest shadow-2xl z-[200]">Signal Link Copied</motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

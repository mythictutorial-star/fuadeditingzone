
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUser } from '@clerk/clerk-react';
import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getDatabase, ref, push, onValue, query, limitToLast, set, update, get, remove } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';
import { siteConfig } from '../config';
import { PhotoManipulationIcon, SendIcon, CopyIcon, PlayIcon, SparklesIcon, CloseIcon, CheckCircleIcon, ChatBubbleIcon, EyeIcon, SearchIcon, ChevronLeftIcon, ChevronRightIcon, TwoDotsIcon, GlobeAltIcon } from './Icons';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { CreatePostModal } from './CreatePostModal';

const firebaseConfig = {
  databaseURL: "https://fuad-editing-zone-default-rtdb.firebaseio.com/",
  apiKey: "AIzaSyCC3wbQp5713OqHlf1jLZabA0VClDstfKY",
  projectId: "fuad-editing-zone",
  messagingSenderId: "832389657221",
  appId: "1:1032345523456:web:123456789",
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];
const db = getDatabase(app);

const OWNER_HANDLE = 'fuadeditingzone';
const ADMIN_HANDLE = 'studiomuzammil';
const RESTRICTED_HANDLE = 'jiya';

type UserRole = 'Designer' | 'Client';

export interface Comment {
    id: string;
    userId: string;
    userName: string;
    userAvatar: string;
    text: string;
    timestamp: number;
    likes?: Record<string, boolean>;
    replies?: Record<string, Comment>;
}

export interface Post {
    id: string;
    userId: string;
    userName: string;
    userAvatar: string;
    userRole?: UserRole;
    mediaUrl?: string;
    mediaType?: 'image' | 'video' | 'text';
    title?: string;
    caption: string;
    tags?: string[];
    links?: { name: string; url: string }[];
    timestamp: number;
    lastEdited?: number;
    targetSection?: string;
    budget?: string;
    likes?: Record<string, boolean>;
    comments?: Record<string, Comment>;
    privacy?: 'public' | 'friends' | 'private';
}

const PostItem: React.FC<{ 
    post: Post; 
    idx: number; 
    user: any; 
    onOpenProfile?: (id: string) => void; 
    onOpenModal?: (posts: Post[], index: number) => void;
    onShare: (e: React.MouseEvent, id: string) => void;
    onLike: (e: React.MouseEvent, post: Post, isLiked: boolean) => void;
    onEdit: (post: Post) => void;
    onDelete: (post: Post) => void;
    posts: Post[];
}> = ({ post, idx, user, onOpenProfile, onOpenModal, onShare, onLike, onEdit, onDelete, posts }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [showReadMore, setShowReadMore] = useState(false);
    const [isMediaLoaded, setIsMediaLoaded] = useState(false);
    const textRef = useRef<HTMLParagraphElement>(null);
    const isLiked = user ? !!post.likes?.[user.id] : false;

    useEffect(() => {
        const checkLines = () => {
            if (textRef.current) {
                const el = textRef.current;
                const lineHeight = parseInt(window.getComputedStyle(el).lineHeight);
                const height = el.scrollHeight;
                if (height > lineHeight * 2.1) { setShowReadMore(true); } else { setShowReadMore(false); }
            }
        };
        checkLines();
        window.addEventListener('resize', checkLines);
        return () => window.removeEventListener('resize', checkLines);
    }, [post.caption]);

    const hasMedia = post.mediaUrl && (post.mediaType === 'image' || post.mediaType === 'video');

    return (
        <motion.article 
            initial={{ scale: 0.96, opacity: 0, y: 15 }} 
            animate={{ scale: 1, opacity: 1, y: 0 }} 
            transition={{ type: 'spring', damping: 28, stiffness: 150, delay: (idx % 8) * 0.04 }}
            className="break-inside-avoid mb-4 md:mb-6 flex flex-col bg-[#090909] border border-white/5 rounded-[1rem] md:rounded-[1.2rem] overflow-hidden group shadow-lg hover:shadow-[0_15px_40px_rgba(0,0,0,0.6)] transition-all duration-500"
        >
            <div className="relative overflow-hidden bg-transparent cursor-pointer group flex-shrink-0" onClick={() => onOpenModal?.(posts, idx)}>
                {hasMedia ? (
                    <>
                        <div className="hidden pointer-events-none opacity-0">
                            {post.mediaType === 'video' ? (
                                <video src={post.mediaUrl} onLoadedData={() => setTimeout(() => setIsMediaLoaded(true), 50)} muted playsInline preload="auto" />
                            ) : (
                                <img src={post.mediaUrl} onLoad={() => setTimeout(() => setIsMediaLoaded(true), 50)} alt="" loading="eager" />
                            )}
                        </div>
                        <AnimatePresence>
                            {isMediaLoaded && (
                                <motion.div initial={{ y: 60, opacity: 0, scale: 0.98 }} animate={{ y: 0, opacity: 1, scale: 1 }} transition={{ type: "spring", damping: 24, stiffness: 110, delay: (idx % 4) * 0.08 }} className="w-full relative">
                                    {post.mediaType === 'video' ? (
                                        <video src={post.mediaUrl} className="w-full h-auto max-h-[500px] object-cover" muted loop autoPlay playsInline />
                                    ) : (
                                        <img src={post.mediaUrl} className="w-full h-auto max-h-[600px] object-cover" alt="" />
                                    )}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/100 via-black/20 to-transparent opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all duration-500 flex flex-col justify-end p-3 md:p-5">
                                        <h2 className="text-[9px] md:text-sm lg:text-base font-black text-white uppercase tracking-tight leading-[1.2] drop-shadow-[0_2px_10px_rgba(0,0,0,1)] whitespace-normal line-clamp-2">{post.title || 'Untitled Work'}</h2>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </>
                ) : (
                    <div className="w-full aspect-square bg-[#111] flex flex-col items-center justify-center p-6 border-b border-white/5 relative">
                         <div className="absolute top-4 right-4 bg-white/5 p-1.5 rounded-full"><ExternalLink className="w-3 h-3 text-red-600" /></div>
                         <div className="w-12 h-12 rounded-full bg-red-600/10 flex items-center justify-center mb-4 border border-red-600/20">
                            <GlobeAltIcon className="w-6 h-6 text-red-600" />
                         </div>
                         <h2 className="text-xs md:text-sm font-black text-white uppercase tracking-tight leading-tight text-center line-clamp-3">{post.title || 'Inquiry Post'}</h2>
                         <p className="text-[8px] text-zinc-600 font-black uppercase tracking-[0.3em] mt-3">Links Attached</p>
                    </div>
                )}

                {post.budget && (
                    <div className="absolute top-2 left-2 bg-red-600 text-white font-black px-1.5 py-0.5 rounded-md text-[7px] md:text-[8px] uppercase tracking-tighter border border-white/20 shadow-xl backdrop-blur-md z-10">${post.budget}</div>
                )}
            </div>
            <div className="p-3 md:p-5 flex flex-col flex-1 min-h-0">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5 md:gap-2.5 cursor-pointer group/prof" onClick={(e) => { e.stopPropagation(); onOpenProfile?.(post.userId); }}>
                        <div className="relative">
                            <img src={post.userAvatar} className="w-6 h-6 md:w-9 md:h-9 rounded-md md:rounded-lg object-cover border border-white/10 group-hover/prof:border-red-600/50 transition-colors" alt="" />
                            <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 md:w-2.5 md:h-2.5 bg-green-500 border border-black rounded-full"></div>
                        </div>
                        <div className="min-w-0">
                            <p className="text-[8px] md:text-[11px] font-black text-white uppercase truncate tracking-tight flex items-center gap-1">
                                @{ (post.userName || '').toLowerCase() }
                                {post.userName?.toLowerCase() === OWNER_HANDLE && <i className="fa-solid fa-circle-check text-red-600 text-[10px]"></i>}
                                {post.userName?.toLowerCase() === ADMIN_HANDLE && <i className="fa-solid fa-circle-check text-blue-500 text-[10px]"></i>}
                            </p>
                            <p className="text-[6px] md:text-[7px] font-black text-red-500 uppercase tracking-widest mt-0.5">{post.userRole || 'Designer'}</p>
                        </div>
                    </div>
                </div>
                <div className="font-sans relative w-full mt-1 flex-1 min-h-0 flex flex-col">
                    <div className={`h-auto transition-all duration-300 ${isExpanded ? 'max-h-[300px] overflow-y-auto custom-scrollbar pr-1' : 'max-h-[2.8rem] overflow-hidden'}`}>
                        <p ref={textRef} className={`text-zinc-500 text-[9px] md:text-[11px] font-medium leading-[1.4] break-words text-left ${!isExpanded ? 'line-clamp-2' : ''}`}>{post.caption}</p>
                    </div>
                    {showReadMore && (<button onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }} className="text-zinc-600 font-black hover:text-red-500 transition-colors text-[8px] md:text-[9px] mt-1 block text-left uppercase tracking-widest relative z-10">{isExpanded ? '...Hide' : '...More'}</button>)}
                </div>
                <div className="mt-3 pt-3 flex items-center justify-between border-t border-white/5 relative">
                    <div className="flex items-center gap-3 md:gap-4">
                        <button onClick={(e) => onLike(e, post, isLiked)} className={`flex items-center gap-1 text-[8px] md:text-[10px] font-black transition-all ${isLiked ? 'text-red-500' : 'text-zinc-600 hover:text-white'}`}><i className={`fa-${isLiked ? 'solid' : 'regular'} fa-heart text-[12px] md:text-[14px]`}></i>{Object.keys(post.likes || {}).length}</button>
                        <button onClick={() => onOpenModal?.(posts, idx)} className="flex items-center gap-1 text-[8px] md:text-[10px] font-black text-zinc-600 hover:text-white transition-colors"><i className="fa-regular fa-comment text-[12px] md:text-[14px]"></i>{Object.keys(post.comments || {}).length}</button>
                    </div>
                </div>
            </div>
        </motion.article>
    );
};

export const ExploreFeed: React.FC<{ onOpenProfile?: (id: string, username?: string) => void; onOpenModal?: (items: any[], index: number) => void; onBack?: () => void }> = ({ onOpenProfile, onOpenModal, onBack }) => {
    const { user, isSignedIn } = useUser();
    const [posts, setPosts] = useState<Post[]>([]);
    const [isPostModalOpen, setIsPostModalOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        const postsRef = query(ref(db, 'explore_posts'), limitToLast(500));
        const unsubscribe = onValue(postsRef, (snap) => {
            const data = snap.val();
            if (data) {
                let list = Object.entries(data).map(([id, val]: [string, any]) => ({ id, ...val }))
                    .sort((a: any, b: any) => b.timestamp - a.timestamp)
                    .filter((p: any) => p.privacy === 'public' || !p.privacy); // Default to public if not set
                
                // Restriction: Only OWNER can see RESTRICTED posts
                if (user?.username?.toLowerCase() !== OWNER_HANDLE) {
                   list = list.filter(p => (p.userName || '').toLowerCase() !== RESTRICTED_HANDLE);
                }

                setPosts(list as Post[]);
            }
        });
        return () => unsubscribe();
    }, [user]);

    const filteredPosts = useMemo(() => {
        let list = posts;
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            list = posts.filter(post => 
                post.title?.toLowerCase().includes(q) || 
                post.userName?.toLowerCase().includes(q) ||
                post.caption?.toLowerCase().includes(q) ||
                post.tags?.some(t => t.toLowerCase().includes(q))
            );
        }
        return list;
    }, [posts, searchQuery]);

    return (
        <div className="w-full max-w-full mx-auto px-5 md:px-8 pb-48 relative bg-black min-h-screen no-scrollbar">
            <div className="sticky top-0 z-[200] py-4 bg-black/70 backdrop-blur-2xl flex items-center justify-between gap-4 border-b border-white/10 mb-8 -mx-5 md:-mx-8 px-5 md:px-10">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-white hover:bg-red-600 transition-all group"><ArrowLeft className="w-5 h-5 group-hover:scale-110 transition-transform" /></button>
                    <h1 className="text-sm md:text-xl font-black text-white uppercase tracking-widest font-display opacity-90">Marketplace</h1>
                </div>
                <div className="relative w-40 md:w-80"><SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 w-4 h-4" /><input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search assets..." className="w-full bg-white/5 border border-white/10 rounded-full py-2 md:py-2.5 pl-11 md:pl-12 pr-5 text-[9px] md:text-[11px] text-white outline-none focus:border-red-600 transition-all font-bold uppercase tracking-widest placeholder-zinc-800" /></div>
            </div>
            <div className="columns-2 sm:columns-3 lg:columns-4 xl:columns-6 gap-5 md:gap-6 no-scrollbar">
                {filteredPosts.map((post, idx) => (
                    <PostItem key={post.id} post={post} idx={idx} user={user} onOpenProfile={(id) => onOpenProfile?.(id)} onOpenModal={onOpenModal} onShare={() => {}} onLike={() => {}} onEdit={() => {}} onDelete={() => {}} posts={posts} />
                ))}
            </div>
            
            <CreatePostModal isOpen={isPostModalOpen} onClose={() => setIsPostModalOpen(false)} isMarketplaceContext={true} />

            {isSignedIn && (<motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => setIsPostModalOpen(true)} className="fixed bottom-32 right-6 md:bottom-12 md:right-12 z-[110] w-16 h-16 bg-red-600 text-white rounded-2xl flex items-center justify-center shadow-lg border-2 border-white/20 group"><span className="text-4xl font-light transition-transform">+</span></motion.button>)}
        </div>
    );
};

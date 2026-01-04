
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUser } from '@clerk/clerk-react';
import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getDatabase, ref, push, onValue, query, limitToLast, set, update, get, remove } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';
import { siteConfig } from '../config';
import { PhotoManipulationIcon, SendIcon, CopyIcon, PlayIcon, SparklesIcon, CloseIcon, CheckCircleIcon, ChatBubbleIcon, EyeIcon, SearchIcon, ChevronLeftIcon, ChevronRightIcon, TwoDotsIcon, GlobeAltIcon, HomeIcon, MarketIcon } from './Icons';
import { ArrowLeft, ExternalLink, PlusSquare, Bell } from 'lucide-react';
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
const R2_WORKER_URL = 'https://quiet-haze-1898.fuadeditingzone.workers.dev';

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
    userRole?: 'Designer' | 'Client';
    mediaUrl?: string;
    mediaType?: 'image' | 'video' | 'text';
    title?: string;
    caption: string;
    tags?: string[];
    links?: { name: string; url: string }[];
    timestamp: number;
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
    onLike: (e: React.MouseEvent, post: Post, isLiked: boolean) => void;
    posts: Post[];
}> = ({ post, idx, user, onOpenProfile, onOpenModal, onLike, posts }) => {
    const [isMediaLoaded, setIsMediaLoaded] = useState(false);
    const textRef = useRef<HTMLParagraphElement>(null);
    const isLiked = user ? !!post.likes?.[user.id] : false;

    const hasMedia = post.mediaUrl && (post.mediaType === 'image' || post.mediaType === 'video');

    return (
        <motion.article 
            initial={{ opacity: 0, y: 15 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ duration: 0.4, delay: (idx % 10) * 0.05 }}
            className="break-inside-avoid mb-4 md:mb-6 flex flex-col bg-[#0d0d0d] border border-white/5 rounded-[1rem] md:rounded-[1.2rem] overflow-hidden group shadow-lg hover:border-white/10 transition-all duration-300"
        >
            <div className="relative overflow-hidden bg-[#161616] cursor-pointer group flex-shrink-0" onClick={() => onOpenModal?.(posts, idx)}>
                {hasMedia ? (
                    <div className="w-full relative overflow-hidden bg-[#161616]">
                        {post.mediaType === 'video' ? (
                            <video 
                              src={post.mediaUrl} 
                              className={`w-full h-auto object-cover transition-opacity duration-500 ${isMediaLoaded ? 'opacity-100' : 'opacity-0'}`} 
                              muted loop autoPlay playsInline 
                              onLoadedData={() => setIsMediaLoaded(true)}
                            />
                        ) : (
                            <img 
                              src={post.mediaUrl} 
                              className={`w-full h-auto object-cover transition-opacity duration-500 ${isMediaLoaded ? 'opacity-100' : 'opacity-0'}`} 
                              alt="" 
                              onLoad={() => setIsMediaLoaded(true)}
                            />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3 md:p-5">
                            <h2 className="text-[10px] md:text-xs font-black text-white uppercase tracking-tight leading-tight line-clamp-2">{post.title || 'Masterwork'}</h2>
                        </div>
                    </div>
                ) : (
                    <div className="w-full aspect-square bg-[#111] flex flex-col items-center justify-center p-6 border-b border-white/5 relative">
                         <div className="absolute top-4 right-4 bg-white/5 p-1.5 rounded-full"><ExternalLink className="w-3 h-3 text-red-600" /></div>
                         <div className="w-12 h-12 rounded-full bg-red-600/10 flex items-center justify-center mb-4 border border-red-600/20">
                            <GlobeAltIcon className="w-6 h-6 text-red-600" />
                         </div>
                         <h2 className="text-xs md:text-sm font-black text-white uppercase tracking-tight leading-tight text-center line-clamp-3">{post.title || 'Inquiry Post'}</h2>
                    </div>
                )}
            </div>
            <div className="p-3 md:p-5 flex flex-col flex-1 min-h-0 bg-[#0d0d0d]">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5 md:gap-3 cursor-pointer group/prof" onClick={(e) => { e.stopPropagation(); onOpenProfile?.(post.userId); }}>
                        <img src={post.userAvatar} className="w-6 h-6 md:w-8 md:h-8 rounded-full object-cover border border-white/10 group-hover/prof:border-red-600/50 transition-colors" alt="" />
                        <p className="text-[8px] md:text-[10px] font-black text-white uppercase truncate tracking-tight flex items-center gap-1">
                            @{ (post.userName || '').toLowerCase() }
                            {post.userName?.toLowerCase() === OWNER_HANDLE && <i className="fa-solid fa-circle-check text-red-600 text-[9px]"></i>}
                        </p>
                    </div>
                </div>
                <p ref={textRef} className="text-zinc-500 text-[9px] md:text-[10px] font-medium leading-[1.4] break-words text-left line-clamp-2 mt-1">{post.caption}</p>
                <div className="mt-3 pt-3 flex items-center justify-between border-t border-white/5">
                    <div className="flex items-center gap-3 md:gap-4">
                        <button onClick={(e) => onLike(e, post, isLiked)} className={`flex items-center gap-1 text-[8px] md:text-[10px] font-black transition-all ${isLiked ? 'text-red-500' : 'text-zinc-600 hover:text-white'}`}><i className={`fa-${isLiked ? 'solid' : 'regular'} fa-heart text-[10px] md:text-[12px]`}></i>{Object.keys(post.likes || {}).length}</button>
                        <button onClick={() => onOpenModal?.(posts, idx)} className="flex items-center gap-1 text-[8px] md:text-[10px] font-black text-zinc-600 hover:text-white transition-colors"><i className="fa-regular fa-comment text-[10px] md:text-[12px]"></i>{Object.keys(post.comments || {}).length}</button>
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

    // Optimized Initial Load with Hyperdrive
    useEffect(() => {
        const fetchOptimizedPosts = async () => {
            try {
                const res = await fetch(`${R2_WORKER_URL}/api/optimized/posts`);
                if (res.ok) {
                    const data = await res.json();
                    setPosts(data);
                }
            } catch (err) {
                console.warn("Optimized fetch failed, waiting for real-time connection.");
            }
        };
        fetchOptimizedPosts();

        const postsRef = query(ref(db, 'explore_posts'), limitToLast(200));
        const unsubscribe = onValue(postsRef, (snap) => {
            const data = snap.val();
            if (data) {
                let list = Object.entries(data).map(([id, val]: [string, any]) => ({ id, ...val }))
                    .sort((a: any, b: any) => b.timestamp - a.timestamp)
                    .filter((p: any) => p.privacy === 'public' || !p.privacy); 
                
                if (user?.username?.toLowerCase() !== OWNER_HANDLE) {
                   list = list.filter(p => (p.userName || '').toLowerCase() !== RESTRICTED_HANDLE);
                }
                setPosts(list as Post[]);
            }
        });
        return () => unsubscribe();
    }, [user]);

    const handleLike = async (e: React.MouseEvent, post: Post, isLiked: boolean) => {
        e.stopPropagation();
        if (!isSignedIn || !user) return;
        const likeRef = ref(db, `explore_posts/${post.id}/likes/${user.id}`);
        if (isLiked) await remove(likeRef);
        else {
            await set(likeRef, true);
            if (post.userId !== user.id) {
                await push(ref(db, `notifications/${post.userId}`), {
                    type: 'post_like', fromId: user.id, fromName: (user.username || user.fullName || 'user').toLowerCase(),
                    fromAvatar: user.imageUrl, text: `@${(user.username || user.fullName || 'user').toLowerCase()} liked your post.`,
                    timestamp: Date.now(), read: false, postId: post.id
                });
            }
        }
    };

    const filteredPosts = useMemo(() => {
        let list = posts;
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            list = posts.filter(post => 
                post.title?.toLowerCase().includes(q) || 
                post.userName?.toLowerCase().includes(q) ||
                post.caption?.toLowerCase().includes(q)
            );
        }
        return list;
    }, [posts, searchQuery]);

    return (
        <div className="flex h-screen w-full bg-black overflow-hidden relative font-sans">
            <nav className="hidden lg:flex flex-col items-center py-10 gap-12 w-20 flex-shrink-0 border-r border-white/10 bg-black z-[100] fixed left-0 top-0 bottom-0">
                <button onClick={onBack} className="text-white hover:scale-110 transition-transform mb-4">
                    <img src={siteConfig.branding.logoUrl} className="w-9 h-9" alt="" />
                </button>
                <div className="flex flex-col gap-6">
                    <button className="p-3.5 rounded-2xl bg-white text-black scale-110 shadow-lg" title="Marketplace">
                        <MarketIcon className="w-6 h-6" />
                    </button>
                </div>
            </nav>

            <div className="flex-1 flex flex-col lg:ml-20 overflow-y-auto custom-scrollbar no-scrollbar w-full relative px-4 md:px-10 lg:px-14">
                <div className="w-full flex flex-col pb-48">
                    <div className="sticky top-0 z-[200] py-6 bg-black/70 backdrop-blur-2xl flex items-center justify-between gap-3 border-b border-white/10 mb-8">
                        <div className="flex items-center gap-3 min-w-0">
                            <button onClick={onBack} className="p-2 md:p-2.5 rounded-xl bg-white/5 border border-white/10 text-white hover:bg-red-600 transition-all"><ArrowLeft className="w-4 h-4 md:w-5 md:h-5" /></button>
                            <h1 className="text-[10px] md:text-xl font-black text-white uppercase tracking-widest font-display opacity-90 truncate">Marketplace</h1>
                        </div>
                        <div className="relative w-full max-w-[150px] md:max-w-[450px] lg:max-w-[550px]">
                            <SearchIcon className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 text-zinc-600 w-3 h-3 md:w-4 md:h-4" />
                            <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search..." className="w-full bg-white/5 border border-white/10 rounded-full py-2 pl-9 md:pl-11 pr-3 text-[9px] md:text-[11px] text-white outline-none focus:border-red-600 transition-all font-bold uppercase tracking-widest" />
                        </div>
                    </div>
                    
                    <div className="columns-2 sm:columns-3 md:columns-4 lg:columns-5 xl:columns-6 gap-4 md:gap-6 w-full">
                        {filteredPosts.map((post, idx) => (
                            <PostItem key={post.id} post={post} idx={idx} user={user} onOpenProfile={(id) => onOpenProfile?.(id)} onOpenModal={onOpenModal} onLike={handleLike} posts={posts} />
                        ))}
                    </div>
                </div>
            </div>
            
            <CreatePostModal isOpen={isPostModalOpen} onClose={() => setIsPostModalOpen(false)} isMarketplaceContext={true} />

            {isSignedIn && (
                <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => setIsPostModalOpen(true)} className="fixed bottom-28 md:bottom-12 right-6 md:right-12 z-[250] w-14 h-14 md:w-16 md:h-16 bg-red-600 text-white rounded-2xl flex items-center justify-center shadow-[0_15px_40px_rgba(220,38,38,0.4)] border-2 border-white/20">
                    <span className="text-3xl md:text-4xl font-light">+</span>
                </motion.button>
            )}
        </div>
    );
};

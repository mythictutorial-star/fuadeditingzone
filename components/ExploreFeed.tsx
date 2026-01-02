import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUser } from '@clerk/clerk-react';
import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getDatabase, ref, push, onValue, query, limitToLast, set, update, get, remove } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';
import { siteConfig } from '../config';
import { PhotoManipulationIcon, SendIcon, CopyIcon, PlayIcon, SparklesIcon, CloseIcon, CheckCircleIcon, ChatBubbleIcon, EyeIcon, SearchIcon, ChevronLeftIcon, ChevronRightIcon } from './Icons';
import { ArrowLeft } from 'lucide-react';

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
const POSTS_PER_PAGE = 30; 

type UserRole = 'Designer' | 'Client';

interface Comment {
    id: string;
    userId: string;
    userName: string;
    userAvatar: string;
    text: string;
    timestamp: number;
}

interface Post {
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
    timestamp: number;
    lastEdited?: number;
    targetSection?: string;
    budget?: string;
    likes?: Record<string, boolean>;
    comments?: Record<string, Comment>;
}

const PostItem: React.FC<{ 
    post: Post; 
    idx: number; 
    user: any; 
    onOpenProfile?: (id: string) => void; 
    onOpenModal?: (posts: Post[], index: number) => void;
    onShare: (e: React.MouseEvent, id: string) => void;
    onLike: (e: React.MouseEvent, post: Post, isLiked: boolean) => void;
    posts: Post[];
}> = ({ post, idx, user, onOpenProfile, onOpenModal, onShare, onLike, posts }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [showReadMore, setShowReadMore] = useState(false);
    const textRef = useRef<HTMLParagraphElement>(null);
    const isLiked = user ? !!post.likes?.[user.id] : false;

    useEffect(() => {
        const checkLines = () => {
            if (textRef.current) {
                const el = textRef.current;
                const lineHeight = parseInt(window.getComputedStyle(el).lineHeight);
                const height = el.scrollHeight;
                if (height > lineHeight * 3.2) { 
                    setShowReadMore(true);
                } else {
                    setShowReadMore(false);
                }
            }
        };
        checkLines();
        window.addEventListener('resize', checkLines);
        return () => window.removeEventListener('resize', checkLines);
    }, [post.caption]);

    return (
        <motion.article 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="break-inside-avoid flex flex-col bg-[#090909] border border-white/5 rounded-[1rem] md:rounded-[1.2rem] overflow-hidden group shadow-lg hover:shadow-[0_15px_40px_rgba(0,0,0,0.6)] transition-all duration-500"
        >
            {/* Shutter Media Container */}
            <motion.div 
                animate={{ 
                    height: isExpanded ? 0 : 'auto', 
                    opacity: isExpanded ? 0 : 1,
                    marginBottom: isExpanded ? 0 : 0
                }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="relative overflow-hidden bg-black cursor-pointer group flex-shrink-0"
                onClick={() => !isExpanded && onOpenModal?.(posts, idx)}
            >
                {post.mediaType === 'video' ? (
                    <video src={post.mediaUrl} className="w-full h-auto max-h-[500px] object-cover" muted loop autoPlay playsInline />
                ) : (
                    <img src={post.mediaUrl} className="w-full h-auto max-h-[600px] object-cover" alt="" />
                )}

                {/* Behance-style Title Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/100 via-black/30 to-transparent opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all duration-500 flex flex-col justify-end p-4 md:p-5">
                    <h2 className="text-xs md:text-sm lg:text-base font-black text-white uppercase tracking-tight leading-[1.2] drop-shadow-[0_2px_10px_rgba(0,0,0,1)] whitespace-normal">
                        {post.title || 'Creative Masterpiece'}
                    </h2>
                </div>

                {post.budget && (
                    <div className="absolute top-3 left-3 bg-red-600 text-white font-black px-2 py-0.5 rounded-md text-[8px] uppercase tracking-tighter border border-white/20 shadow-xl backdrop-blur-md">
                        ${post.budget}
                    </div>
                )}
                
                <button 
                    onClick={(e) => onShare(e, post.id)} 
                    className="absolute top-3 right-3 p-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white hover:bg-red-600 transition-all opacity-100 md:opacity-0 md:group-hover:opacity-100"
                >
                    <CopyIcon className="w-3.5 h-3.5" />
                </button>
            </motion.div>

            <div className="p-4 md:p-5 flex flex-col flex-1 min-h-0">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5 cursor-pointer group/prof" onClick={(e) => { e.stopPropagation(); onOpenProfile?.(post.userId); }}>
                        <div className="relative">
                            <img src={post.userAvatar} className="w-8 h-8 md:w-9 md:h-9 rounded-lg object-cover border border-white/10 group-hover/prof:border-red-600/50 transition-colors" alt="" />
                            <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 border-2 border-black rounded-full"></div>
                        </div>
                        <div className="min-w-0">
                            <p className="text-[10px] md:text-[11px] font-black text-white uppercase truncate tracking-tight">@{post.userName}</p>
                            <p className="text-[7px] font-black text-red-500 uppercase tracking-widest leading-none mt-0.5">{post.userRole || 'Designer'}</p>
                        </div>
                    </div>
                </div>

                {/* Caption logic with upward expansion */}
                <div className="font-sans relative w-full mt-2 flex-1 min-h-0 flex flex-col">
                    <div className={`transition-all duration-500 ease-in-out ${isExpanded ? 'max-h-[300px] overflow-y-auto no-scrollbar pr-1' : 'max-h-[3.8rem] overflow-hidden'}`}>
                        <p 
                            ref={textRef}
                            className={`text-zinc-500 text-[10px] md:text-[11px] font-medium leading-[1.6] break-words text-left ${!isExpanded ? 'line-clamp-3' : ''}`}
                        >
                            {post.caption}
                        </p>
                    </div>
                    {showReadMore && (
                        <button 
                            onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }} 
                            className="text-zinc-600 font-black hover:text-red-500 transition-colors text-[9px] mt-1.5 block text-left uppercase tracking-widest relative z-10"
                        >
                            {isExpanded ? '...Collapse' : '...Read More'}
                        </button>
                    )}
                </div>

                {/* Persistent Title for expanded state when media is hidden */}
                {isExpanded && post.title && (
                    <motion.h3 
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 1 }} 
                        className="text-[10px] font-black text-white uppercase mt-4 border-t border-white/5 pt-4 tracking-widest"
                    >
                        {post.title}
                    </motion.h3>
                )}

                {post.tags && post.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-4">
                        {post.tags.slice(0, 5).map((tag, i) => (
                            <span key={i} className="text-[8px] font-bold text-zinc-500/80 lowercase tracking-widest bg-white/5 px-1.5 py-0.5 rounded-md transition-colors border border-white/5">
                                #{tag}
                            </span>
                        ))}
                    </div>
                )}

                <div className="mt-4 pt-4 flex items-center justify-between border-t border-white/5">
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={(e) => onLike(e, post, isLiked)} 
                            className={`flex items-center gap-1.5 text-[9px] md:text-[10px] font-black transition-all ${isLiked ? 'text-red-500' : 'text-zinc-600 hover:text-white'}`}
                        >
                            <i className={`fa-${isLiked ? 'solid' : 'regular'} fa-heart text-[14px]`}></i>
                            {Object.keys(post.likes || {}).length}
                        </button>
                        <div className="flex items-center gap-1.5 text-[9px] md:text-[10px] font-black text-zinc-600">
                            <i className="fa-regular fa-comment text-[14px]"></i>
                            {Object.keys(post.comments || {}).length}
                        </div>
                    </div>
                    <div className="flex gap-1 opacity-20 group-hover:opacity-100 transition-opacity">
                        <div className="w-1 h-1 rounded-full bg-white"></div>
                        <div className="w-1 h-1 rounded-full bg-white"></div>
                    </div>
                </div>
            </div>
        </motion.article>
    );
};

export const ExploreFeed: React.FC<{ onOpenProfile?: (id: string, username?: string) => void; onOpenModal?: (items: any[], index: number) => void; onBack?: () => void }> = ({ onOpenProfile, onOpenModal, onBack }) => {
    const { user, isSignedIn } = useUser();
    const [posts, setPosts] = useState<Post[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [isPostModalOpen, setIsPostModalOpen] = useState(false);
    
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);

    const [userRole, setUserRole] = useState<UserRole>('Designer');
    const [title, setTitle] = useState('');
    const [caption, setCaption] = useState('');
    const [budget, setBudget] = useState('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [shareToast, setShareToast] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const postsRef = query(ref(db, 'explore_posts'), limitToLast(500));
        const unsubscribe = onValue(postsRef, (snap) => {
            const data = snap.val();
            if (data) {
                const list = Object.entries(data).map(([id, val]: [string, any]) => ({ id, ...val }))
                    .sort((a: any, b: any) => b.timestamp - a.timestamp);
                setPosts(list as Post[]);
            }
        });
        return () => unsubscribe();
    }, []);

    const filteredPosts = useMemo(() => {
        let list = posts;
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            list = posts.filter(post => 
                post.title?.toLowerCase().includes(q) || 
                post.userName?.toLowerCase().includes(q)
            );
        }
        return list;
    }, [posts, searchQuery]);

    const totalPages = Math.max(1, Math.ceil(filteredPosts.length / POSTS_PER_PAGE));
    const paginatedPosts = useMemo(() => {
        const start = (currentPage - 1) * POSTS_PER_PAGE;
        return filteredPosts.slice(start, start + POSTS_PER_PAGE);
    }, [filteredPosts, currentPage]);

    const handleUpload = async () => {
        if (!user || !caption.trim()) return;
        setIsUploading(true);
        let mediaUrl = "";
        let mediaType: 'image' | 'video' | 'text' = 'text';

        try {
            if (selectedFile) {
                const formData = new FormData();
                formData.append('file', selectedFile);
                formData.append('folder', 'Marketplace');
                const res = await fetch('https://quiet-haze-1898.fuadeditingzone.workers.dev', { method: 'POST', body: formData });
                const result = await res.json();
                mediaUrl = result.url;
                mediaType = selectedFile.type.startsWith('video') ? 'video' : 'image';
            }

            const postData = {
                userId: user.id,
                userName: user.username || user.fullName,
                userAvatar: user.imageUrl,
                userRole,
                mediaUrl,
                mediaType,
                title: title.trim(),
                caption: caption.trim(),
                tags: [],
                budget,
                timestamp: Date.now(),
                targetSection: 'Marketplace Only'
            };

            await push(ref(db, 'explore_posts'), postData);
            setTitle(''); setCaption(''); setBudget(''); setSelectedFile(null);
            setIsPostModalOpen(false);
        } catch (err) { alert("Sync Error"); } finally { setIsUploading(false); }
    };

    const handleLike = async (e: React.MouseEvent, post: Post, isLiked: boolean) => {
        e.stopPropagation();
        if (!isSignedIn || !user) return;
        const likeRef = ref(db, `explore_posts/${post.id}/likes/${user.id}`);
        if (isLiked) await remove(likeRef);
        else await set(likeRef, true);
    };

    const handleShare = (e: React.MouseEvent, postId: string) => {
        e.stopPropagation();
        navigator.clipboard.writeText(`${window.location.origin}/post/${postId}`);
        setShareToast(true);
        setTimeout(() => setShareToast(false), 2000);
    };

    return (
        <div className="w-full max-w-full mx-auto px-2 md:px-4 pb-20 relative bg-black min-h-screen no-scrollbar">
            <AnimatePresence>
                {shareToast && (
                    <motion.div initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} exit={{opacity:0}} className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[300] bg-white text-black px-6 py-2 rounded-full font-black uppercase text-[9px] tracking-[0.2em] shadow-2xl">Signal Captured</motion.div>
                )}
            </AnimatePresence>

            <div className="sticky top-0 z-[200] py-3 bg-black/60 backdrop-blur-2xl flex items-center justify-between gap-4 border-b border-white/5 mb-6 -mx-2 md:-mx-4 px-4 md:px-6">
                <div className="flex items-center gap-3">
                    <button 
                        onClick={onBack}
                        className="p-2 rounded-xl bg-white/5 border border-white/10 text-white hover:bg-red-600 transition-all group"
                    >
                        <ArrowLeft className="w-4 h-4 group-hover:scale-110 transition-transform" />
                    </button>
                    <h1 className="text-base md:text-xl font-black text-white uppercase tracking-widest font-display opacity-90">Marketplace</h1>
                </div>
                <div className="relative w-40 md:w-72">
                    <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-600 w-3.5 h-3.5" />
                    <input 
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Search assets..." 
                        className="w-full bg-white/5 border border-white/10 rounded-full py-2 pl-10 pr-4 text-[11px] text-white outline-none focus:border-red-600 transition-all font-bold uppercase tracking-widest placeholder-zinc-800" 
                    />
                </div>
            </div>

            <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-5 gap-3 md:gap-4 space-y-4 md:space-y-6 no-scrollbar">
                {paginatedPosts.map((post, idx) => (
                    <PostItem 
                        key={post.id} 
                        post={post} 
                        idx={idx} 
                        user={user} 
                        onOpenProfile={(id) => onOpenProfile?.(id)}
                        onOpenModal={onOpenModal}
                        onShare={handleShare}
                        onLike={handleLike}
                        posts={posts}
                    />
                ))}
            </div>

            {totalPages > 1 && (
                <div className="flex justify-center items-center gap-4 mt-12">
                    <button onClick={() => setCurrentPage(prev => Math.max(1, prev-1))} className="p-3 rounded-2xl bg-white/5 border border-white/10 text-zinc-500 hover:text-white transition-all"><ChevronLeftIcon className="w-4 h-4" /></button>
                    <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest px-6">Page {currentPage} of {totalPages}</span>
                    <button onClick={() => setCurrentPage(prev => Math.min(totalPages, prev+1))} className="p-3 rounded-2xl bg-white/5 border border-white/10 text-zinc-500 hover:text-white transition-all"><ChevronRightIcon className="w-4 h-4" /></button>
                </div>
            )}

            <AnimatePresence>
                {isPostModalOpen && (
                    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 backdrop-blur-sm">
                        <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={() => setIsPostModalOpen(false)} className="absolute inset-0 bg-black/80" />
                        <motion.div initial={{scale:0.9, opacity:0}} animate={{scale:1, opacity:1}} exit={{scale:0.9, opacity:0}} className="relative w-full max-w-md bg-[#0a0a0a] border border-white/10 rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,1)] overflow-hidden">
                            <div className="p-5 border-b border-white/5 flex justify-between items-center bg-black/40">
                                <h2 className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Post Signal</h2>
                                <button onClick={() => setIsPostModalOpen(false)} className="p-1.5 rounded-full hover:bg-white/5 text-zinc-500 transition-colors"><CloseIcon className="w-5 h-5" /></button>
                            </div>
                            <div className="p-6 space-y-5">
                                <div className="flex gap-2 p-1 bg-black rounded-xl border border-white/5 w-fit">
                                    {(['Designer', 'Client'] as UserRole[]).map(role => (
                                        <button key={role} onClick={() => setUserRole(role)} className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${userRole === role ? 'bg-red-600 text-white shadow-lg' : 'text-zinc-500 hover:text-white'}`}>{role}</button>
                                    ))}
                                </div>
                                <div className="space-y-4">
                                    <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Signal Label..." className="w-full bg-black border border-white/10 rounded-xl p-3 text-white text-[11px] outline-none focus:border-red-600/50 transition-all font-bold uppercase tracking-widest" />
                                    <textarea value={caption} onChange={e => setCaption(e.target.value)} placeholder="Uplink details..." className="w-full bg-black border border-white/10 rounded-xl p-3 text-white text-[11px] outline-none resize-none h-32 focus:border-red-600/50 transition-all font-medium" />
                                    {userRole === 'Client' && (
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-red-600 font-black text-xs">$</span>
                                            <input type="number" value={budget} onChange={e => setBudget(e.target.value)} placeholder="Budget Allocation" className="w-full bg-black border border-white/10 rounded-xl py-3 pl-8 pr-4 text-white text-[11px] outline-none focus:border-red-600/50 transition-all font-bold" />
                                        </div>
                                    )}
                                </div>
                                <div className="flex items-center justify-between border-t border-white/5 pt-6">
                                    <button onClick={() => fileInputRef.current?.click()} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${selectedFile ? 'bg-green-600 text-white' : 'bg-white/5 text-zinc-500 hover:text-white'}`}>
                                        <PhotoManipulationIcon className="w-4 h-4" /> {selectedFile ? 'Ready' : 'Media'}
                                    </button>
                                    <input type="file" hidden ref={fileInputRef} accept="image/*,video/*" onChange={e => setSelectedFile(e.target.files?.[0] || null)} />
                                    <button disabled={isUploading || !caption.trim()} onClick={handleUpload} className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white px-8 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-[0.3em] transition-all flex items-center gap-2 shadow-xl active:scale-95">
                                        {isUploading ? 'Syncing...' : 'Broadcast'} <SendIcon className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {isSignedIn && (
                <motion.button 
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setIsPostModalOpen(true)}
                    className="fixed bottom-24 right-5 md:bottom-10 md:right-10 z-[110] w-14 h-14 md:w-16 md:h-16 bg-red-600 text-white rounded-[1.2rem] flex items-center justify-center shadow-[0_20px_40px_rgba(220,38,38,0.4)] border-2 border-white/20 group"
                >
                    <span className="text-3xl font-light group-hover:rotate-90 transition-transform">+</span>
                </motion.button>
            )}
        </div>
    );
};
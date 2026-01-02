
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUser } from '@clerk/clerk-react';
import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getDatabase, ref, push, onValue, query, limitToLast, set, update, get, remove } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';
import { siteConfig } from '../config';
import { PhotoManipulationIcon, SendIcon, CopyIcon, PlayIcon, SparklesIcon, CloseIcon, CheckCircleIcon, ChatBubbleIcon, EyeIcon, SearchIcon, ChevronLeftIcon, ChevronRightIcon, TwoDotsIcon } from './Icons';
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
const ADMIN_HANDLE = 'studiomuzammil';
const POSTS_PER_PAGE = 30; 
const R2_WORKER_URL = 'https://quiet-haze-1898.fuadeditingzone.workers.dev';

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

    return (
        <motion.article 
            initial={{ scale: 0.85, opacity: 0 }} 
            animate={{ scale: 1, opacity: 1 }} 
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: (idx % 10) * 0.05 }}
            className="break-inside-avoid mb-4 md:mb-6 flex flex-col bg-[#090909] border border-white/5 rounded-[1rem] md:rounded-[1.2rem] overflow-hidden group shadow-lg hover:shadow-[0_15px_40px_rgba(0,0,0,0.6)] transition-all duration-500"
        >
            <div className="relative overflow-hidden bg-[#0a0a0a] cursor-pointer group flex-shrink-0" onClick={() => onOpenModal?.(posts, idx)}>
                {/* Loader Placeholder */}
                {!isMediaLoaded && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                        <div className="w-6 h-6 border-2 border-red-600/30 border-t-red-600 rounded-full animate-spin"></div>
                    </div>
                )}
                
                {post.mediaType === 'video' ? (
                    <video 
                        src={post.mediaUrl} 
                        className={`w-full h-auto max-h-[500px] object-cover transition-opacity duration-700 ${isMediaLoaded ? 'opacity-100' : 'opacity-0'}`} 
                        muted loop autoPlay playsInline 
                        onLoadedData={() => setIsMediaLoaded(true)}
                    />
                ) : (
                    <img 
                        src={post.mediaUrl} 
                        className={`w-full h-auto max-h-[600px] object-cover transition-opacity duration-700 ${isMediaLoaded ? 'opacity-100' : 'opacity-0'}`} 
                        alt="" 
                        onLoad={() => setIsMediaLoaded(true)}
                    />
                )}

                {isMediaLoaded && (
                    <div className="absolute inset-0 bg-gradient-to-t from-black/100 via-black/30 to-transparent opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all duration-500 flex flex-col justify-end p-3 md:p-5">
                        <h2 className="text-[9px] md:text-sm lg:text-base font-black text-white uppercase tracking-tight leading-[1.2] drop-shadow-[0_2px_10px_rgba(0,0,0,1)] whitespace-normal line-clamp-2">{post.title || 'Untitled Work'}</h2>
                    </div>
                )}
                {post.budget && (
                    <div className="absolute top-2 left-2 bg-red-600 text-white font-black px-1.5 py-0.5 rounded-md text-[7px] md:text-[8px] uppercase tracking-tighter border border-white/20 shadow-xl backdrop-blur-md">${post.budget}</div>
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
    const [isUploading, setIsUploading] = useState(false);
    const [isPostModalOpen, setIsPostModalOpen] = useState(false);
    const [editingPost, setEditingPost] = useState<Post | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [userRole, setUserRole] = useState<UserRole>('Designer');
    const [title, setTitle] = useState('');
    const [caption, setCaption] = useState('');
    const [budget, setBudget] = useState('');
    const [tags, setTags] = useState<string>('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
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
                post.userName?.toLowerCase().includes(q) ||
                post.caption?.toLowerCase().includes(q) ||
                post.tags?.some(t => t.toLowerCase().includes(q))
            );
        }
        return list;
    }, [posts, searchQuery]);

    const handleUpload = async () => {
        if (!user || !caption.trim()) return;
        setIsUploading(true);
        let mediaUrl = editingPost?.mediaUrl || "";
        let mediaType: 'image' | 'video' | 'text' = editingPost?.mediaType || 'text';
        try {
            if (selectedFile) {
                const formData = new FormData();
                formData.append('file', selectedFile);
                formData.append('folder', 'Marketplace');
                const res = await fetch(R2_WORKER_URL, { method: 'POST', body: formData });
                const result = await res.json();
                mediaUrl = result.url;
                mediaType = selectedFile.type.startsWith('video') ? 'video' : 'image';
            }
            const postData: any = {
                userId: user.id,
                userName: (user.username || user.fullName || '').toLowerCase(),
                userAvatar: user.imageUrl,
                userRole,
                mediaUrl,
                mediaType,
                title: title.trim(),
                caption: caption.trim(),
                tags: tags.split(',').map(t => t.trim()).filter(t => t !== "").slice(0, 5),
                budget,
                timestamp: editingPost ? editingPost.timestamp : Date.now(),
                targetSection: editingPost?.targetSection || 'Marketplace Only'
            };
            if (editingPost) await update(ref(db, `explore_posts/${editingPost.id}`), postData);
            else await push(ref(db, 'explore_posts'), postData);
            setTitle(''); setCaption(''); setBudget(''); setTags(''); setSelectedFile(null);
            setIsPostModalOpen(false);
        } catch (err) { alert("Action failed"); } finally { setIsUploading(false); }
    };

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
            <AnimatePresence>
                {isPostModalOpen && (
                    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 backdrop-blur-sm">
                        <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={() => setIsPostModalOpen(false)} className="absolute inset-0 bg-black/80" />
                        <motion.div initial={{scale:0.9, opacity:0}} animate={{scale:1, opacity:1}} exit={{scale:0.9, opacity:0}} className="relative w-full max-w-md bg-[#0a0a0a] border border-white/10 rounded-3xl shadow-2xl overflow-hidden">
                            <div className="p-5 border-b border-white/5 flex justify-between items-center bg-black/40"><h2 className="text-[10px] font-black text-white uppercase tracking-[0.2em]">{editingPost ? 'Edit Post' : 'Create New Post'}</h2><button onClick={() => setIsPostModalOpen(false)} className="p-1.5 rounded-full hover:bg-white/5 text-zinc-500 transition-colors"><CloseIcon className="w-5 h-5" /></button></div>
                            <div className="p-6 space-y-6">
                                <div className="space-y-4">
                                    <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Title" className="w-full bg-black border border-white/10 rounded-xl p-4 text-white text-[11px] outline-none focus:border-red-600/50 transition-all font-black uppercase tracking-widest" />
                                    <textarea value={caption} onChange={e => setCaption(e.target.value)} placeholder="What's on your mind?..." className="w-full bg-black border border-white/10 rounded-xl p-4 text-white text-[11px] outline-none resize-none h-36 focus:border-red-600/50 transition-all font-medium" />
                                </div>
                                <div className="flex items-center justify-between border-t border-white/5 pt-6">
                                    <button onClick={() => fileInputRef.current?.click()} className={`flex items-center gap-3 px-5 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${selectedFile ? 'bg-green-600 text-white' : 'bg-white/5 text-zinc-500 hover:text-white'}`}><PhotoManipulationIcon className="w-5 h-5" /> {selectedFile ? 'Ready' : 'Add Media'}</button>
                                    <input type="file" hidden ref={fileInputRef} accept="image/*,video/*" onChange={e => setSelectedFile(e.target.files?.[0] || null)} />
                                    <button disabled={isUploading || !caption.trim()} onClick={handleUpload} className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white px-10 py-3 rounded-xl text-[9px] font-black uppercase tracking-[0.3em] transition-all flex items-center gap-3 shadow-xl active:scale-95">{isUploading ? 'Uploading...' : 'Share'} <SendIcon className="w-5 h-5" /></button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
            {isSignedIn && (<motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => setIsPostModalOpen(true)} className="fixed bottom-32 right-6 md:bottom-12 md:right-12 z-[110] w-16 h-16 bg-red-600 text-white rounded-2xl flex items-center justify-center shadow-lg border-2 border-white/20 group"><span className="text-4xl font-light transition-transform">+</span></motion.button>)}
        </div>
    );
};

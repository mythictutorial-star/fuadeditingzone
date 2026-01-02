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
    onEdit: (post: Post) => void;
    onDelete: (post: Post) => void;
    posts: Post[];
}> = ({ post, idx, user, onOpenProfile, onOpenModal, onShare, onLike, onEdit, onDelete, posts }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [showReadMore, setShowReadMore] = useState(false);
    const [showOptions, setShowOptions] = useState(false);
    const textRef = useRef<HTMLParagraphElement>(null);
    const isLiked = user ? !!post.likes?.[user.id] : false;
    const isOwner = user?.id === post.userId;

    useEffect(() => {
        const checkLines = () => {
            if (textRef.current) {
                const el = textRef.current;
                const lineHeight = parseInt(window.getComputedStyle(el).lineHeight);
                const height = el.scrollHeight;
                if (height > lineHeight * 2.1) { 
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
            className="break-inside-avoid mb-3 md:mb-6 flex flex-col bg-[#090909] border border-white/5 rounded-[0.8rem] md:rounded-[1.2rem] overflow-hidden group shadow-lg hover:shadow-[0_15px_40px_rgba(0,0,0,0.6)] transition-all duration-500"
        >
            <div 
                className="relative overflow-hidden bg-black cursor-pointer group flex-shrink-0"
                onClick={() => onOpenModal?.(posts, idx)}
            >
                {post.mediaType === 'video' ? (
                    <video src={post.mediaUrl} className="w-full h-auto max-h-[500px] object-cover" muted loop autoPlay playsInline />
                ) : (
                    <img src={post.mediaUrl} className="w-full h-auto max-h-[600px] object-cover" alt="" />
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-black/100 via-black/30 to-transparent opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all duration-500 flex flex-col justify-end p-3 md:p-5">
                    <h2 className="text-[9px] md:text-sm lg:text-base font-black text-white uppercase tracking-tight leading-[1.2] drop-shadow-[0_2px_10px_rgba(0,0,0,1)] whitespace-normal line-clamp-2">
                        {post.title || 'Untitled Work'}
                    </h2>
                </div>

                {post.budget && (
                    <div className="absolute top-2 left-2 bg-red-600 text-white font-black px-1.5 py-0.5 rounded-md text-[7px] md:text-[8px] uppercase tracking-tighter border border-white/20 shadow-xl backdrop-blur-md">
                        ${post.budget}
                    </div>
                )}
                
                <div className="absolute top-2 right-2 flex flex-col gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all">
                    <button 
                        onClick={(e) => onShare(e, post.id)} 
                        className="p-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white hover:bg-red-600 transition-all"
                    >
                        <CopyIcon className="w-3 h-3 md:w-3.5 md:h-3.5" />
                    </button>
                </div>
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
                                @{post.userName}
                                {post.userName === OWNER_HANDLE && <i className="fa-solid fa-circle-check text-red-600 text-[10px]"></i>}
                                {post.userName === ADMIN_HANDLE && <i className="fa-solid fa-circle-check text-blue-500 text-[10px]"></i>}
                            </p>
                            <p className="text-[6px] md:text-[7px] font-black text-red-500 uppercase tracking-widest leading-none mt-0.5">{post.userRole || 'Designer'}</p>
                        </div>
                    </div>
                </div>

                <div className="font-sans relative w-full mt-1 flex-1 min-h-0 flex flex-col">
                    <div className={`h-auto transition-all duration-300 ${isExpanded ? 'max-h-[300px] overflow-y-auto custom-scrollbar pr-1' : 'max-h-[2.8rem] overflow-hidden'}`}>
                        <p 
                            ref={textRef}
                            className={`text-zinc-500 text-[9px] md:text-[11px] font-medium leading-[1.4] break-words text-left ${!isExpanded ? 'line-clamp-2' : ''}`}
                        >
                            {post.caption}
                        </p>
                    </div>
                    {showReadMore && (
                        <button 
                            onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }} 
                            className="text-zinc-600 font-black hover:text-red-500 transition-colors text-[8px] md:text-[9px] mt-1 block text-left uppercase tracking-widest relative z-10"
                        >
                            {isExpanded ? '...Hide' : '...More'}
                        </button>
                    )}
                </div>

                {/* Post 5 tags - gray color and small texts box */}
                {post.tags && post.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3 mb-1">
                        {post.tags.slice(0, 5).map((tag, i) => (
                            <span key={i} className="px-2 py-0.5 bg-zinc-800/40 border border-zinc-700/30 rounded text-[6px] md:text-[8px] font-black text-zinc-400 uppercase tracking-widest">
                                {tag}
                            </span>
                        ))}
                    </div>
                )}

                <div className="mt-3 pt-3 flex items-center justify-between border-t border-white/5 relative">
                    <div className="flex items-center gap-3 md:gap-4">
                        <button 
                            onClick={(e) => onLike(e, post, isLiked)} 
                            className={`flex items-center gap-1 text-[8px] md:text-[10px] font-black transition-all ${isLiked ? 'text-red-500' : 'text-zinc-600 hover:text-white'}`}
                        >
                            <i className={`fa-${isLiked ? 'solid' : 'regular'} fa-heart text-[12px] md:text-[14px]`}></i>
                            {Object.keys(post.likes || {}).length}
                        </button>
                        <div className="flex items-center gap-1 text-[8px] md:text-[10px] font-black text-zinc-600">
                            <i className="fa-regular fa-comment text-[12px] md:text-[14px]"></i>
                            {Object.keys(post.comments || {}).length}
                        </div>
                    </div>

                    {/* Bottom Right Options Menu */}
                    <div className="relative">
                        {isOwner && (
                            <button 
                                onClick={(e) => { e.stopPropagation(); setShowOptions(!showOptions); }}
                                className="p-1 text-zinc-600 hover:text-red-500 transition-all flex items-center justify-center group/dots"
                            >
                                <TwoDotsIcon className="w-4 h-4" />
                            </button>
                        )}
                        <AnimatePresence>
                            {showOptions && (
                                <motion.div 
                                    initial={{ opacity: 0, scale: 0.9, y: 10 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.9, y: 10 }}
                                    className="absolute bottom-full right-0 mb-2 w-28 bg-[#0c0c0c] border border-white/10 rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.8)] z-[60] overflow-hidden"
                                >
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); onEdit(post); setShowOptions(false); }} 
                                        className="w-full text-left px-4 py-2.5 text-[9px] font-black text-white hover:bg-white/5 uppercase tracking-widest border-b border-white/5 transition-colors"
                                    >
                                        Edit
                                    </button>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); onDelete(post); setShowOptions(false); }} 
                                        className="w-full text-left px-4 py-2.5 text-[9px] font-black text-red-500 hover:bg-red-500/10 uppercase tracking-widest transition-colors"
                                    >
                                        Delete
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>
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
    const [currentPage, setCurrentPage] = useState(1);

    const [userRole, setUserRole] = useState<UserRole>('Designer');
    const [title, setTitle] = useState('');
    const [caption, setCaption] = useState('');
    const [budget, setBudget] = useState('');
    const [tags, setTags] = useState<string>('');
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
                post.userName?.toLowerCase().includes(q) ||
                post.caption?.toLowerCase().includes(q) ||
                post.tags?.some(t => t.toLowerCase().includes(q))
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
        let mediaUrl = editingPost?.mediaUrl || "";
        let mediaType: 'image' | 'video' | 'text' = editingPost?.mediaType || 'text';

        try {
            if (selectedFile) {
                if (editingPost?.mediaUrl) {
                    await deleteMediaFromR2(editingPost.mediaUrl);
                }
                const formData = new FormData();
                formData.append('file', selectedFile);
                formData.append('folder', 'Marketplace');
                const res = await fetch(R2_WORKER_URL, { method: 'POST', body: formData });
                const result = await res.json();
                mediaUrl = result.url;
                mediaType = selectedFile.type.startsWith('video') ? 'video' : 'image';
            }

            const tagList = tags.split(',').map(t => t.trim()).filter(t => t !== "").slice(0, 5);

            const postData: any = {
                userId: user.id,
                userName: user.username || user.fullName,
                userAvatar: user.imageUrl,
                userRole,
                mediaUrl,
                mediaType,
                title: title.trim(),
                caption: caption.trim(),
                tags: tagList,
                budget,
                timestamp: editingPost ? editingPost.timestamp : Date.now(),
                lastEdited: editingPost ? Date.now() : null,
                targetSection: editingPost?.targetSection || 'Marketplace Only'
            };

            if (editingPost) {
                await update(ref(db, `explore_posts/${editingPost.id}`), postData);
            } else {
                await push(ref(db, 'explore_posts'), postData);
            }

            resetForm();
            setIsPostModalOpen(false);
            setEditingPost(null);
        } catch (err) { alert("Action failed"); } finally { setIsUploading(false); }
    };

    const handleDelete = async (post: Post) => {
        if (!window.confirm("Confirm deletion? This will permanently wipe the media from storage.")) return;
        try {
            if (post.mediaUrl) {
                await deleteMediaFromR2(post.mediaUrl);
            }
            await remove(ref(db, `explore_posts/${post.id}`));
        } catch (e) { alert("Deletion failed"); }
    };

    const deleteMediaFromR2 = async (url: string) => {
        try {
            await fetch(`${R2_WORKER_URL}?url=${encodeURIComponent(url)}`, { method: 'DELETE' });
        } catch (e) {
            console.warn("R2 cleanup skipped or failed", e);
        }
    };

    const handleEdit = (post: Post) => {
        setEditingPost(post);
        setTitle(post.title || '');
        setCaption(post.caption || '');
        setUserRole(post.userRole || 'Designer');
        setBudget(post.budget || '');
        setTags(post.tags?.join(', ') || '');
        setIsPostModalOpen(true);
    };

    const resetForm = () => {
        setTitle(''); setCaption(''); setBudget(''); setTags(''); setSelectedFile(null);
        setEditingPost(null);
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
                    <motion.div initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} exit={{opacity:0}} className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[300] bg-white text-black px-6 py-2 rounded-full font-black uppercase text-[9px] tracking-[0.2em] shadow-2xl">Link Copied</motion.div>
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
                    <h1 className="text-sm md:text-xl font-black text-white uppercase tracking-widest font-display opacity-90">Marketplace</h1>
                </div>
                <div className="relative w-36 md:w-72">
                    <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-600 w-3 md:w-3.5 h-3 md:h-3.5" />
                    <input 
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Search posts..." 
                        className="w-full bg-white/5 border border-white/10 rounded-full py-1.5 md:py-2 pl-9 md:pl-10 pr-4 text-[9px] md:text-[11px] text-white outline-none focus:border-red-600 transition-all font-bold uppercase tracking-widest placeholder-zinc-800" 
                    />
                </div>
            </div>

            <div className="columns-2 sm:columns-3 lg:columns-4 xl:columns-6 gap-2 md:gap-4 no-scrollbar">
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
                        onEdit={handleEdit}
                        onDelete={handleDelete}
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
                        <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={() => { setIsPostModalOpen(false); resetForm(); }} className="absolute inset-0 bg-black/80" />
                        <motion.div initial={{scale:0.9, opacity:0}} animate={{scale:1, opacity:1}} exit={{scale:0.9, opacity:0}} className="relative w-full max-w-md bg-[#0a0a0a] border border-white/10 rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,1)] overflow-hidden">
                            <div className="p-5 border-b border-white/5 flex justify-between items-center bg-black/40">
                                <h2 className="text-[10px] font-black text-white uppercase tracking-[0.2em]">{editingPost ? 'Update Signal' : 'Initialize Creation'}</h2>
                                <button onClick={() => { setIsPostModalOpen(false); resetForm(); }} className="p-1.5 rounded-full hover:bg-white/5 text-zinc-500 transition-colors"><CloseIcon className="w-5 h-5" /></button>
                            </div>
                            <div className="p-6 space-y-5">
                                <div className="flex gap-2 p-1 bg-black rounded-xl border border-white/5 w-fit">
                                    {(['Designer', 'Client'] as UserRole[]).map(role => (
                                        <button key={role} onClick={() => setUserRole(role)} className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${userRole === role ? 'bg-red-600 text-white shadow-lg' : 'text-zinc-500 hover:text-white'}`}>{role}</button>
                                    ))}
                                </div>
                                <div className="space-y-4">
                                    <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Title" className="w-full bg-black border border-white/10 rounded-xl p-3 text-white text-[11px] outline-none focus:border-red-600/50 transition-all font-black uppercase tracking-widest" />
                                    <textarea value={caption} onChange={e => setCaption(e.target.value)} placeholder="Description..." className="w-full bg-black border border-white/10 rounded-xl p-3 text-white text-[11px] outline-none resize-none h-32 focus:border-red-600/50 transition-all font-medium" />
                                    <input value={tags} onChange={e => setTags(e.target.value)} placeholder="Tags (comma separated, max 5)" className="w-full bg-black border border-white/10 rounded-xl p-3 text-white text-[10px] outline-none focus:border-red-600/50 transition-all font-medium italic" />
                                    
                                    {userRole === 'Client' && (
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-red-600 font-black text-xs">$</span>
                                            <input type="number" value={budget} onChange={e => setBudget(e.target.value)} placeholder="Budget Allocation" className="w-full bg-black border border-white/10 rounded-xl py-3 pl-8 pr-4 text-white text-[11px] outline-none focus:border-red-600/50 transition-all font-bold" />
                                        </div>
                                    )}
                                </div>
                                <div className="flex items-center justify-between border-t border-white/5 pt-6">
                                    <button onClick={() => fileInputRef.current?.click()} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${selectedFile ? 'bg-green-600 text-white' : 'bg-white/5 text-zinc-500 hover:text-white'}`}>
                                        <PhotoManipulationIcon className="w-4 h-4" /> {selectedFile ? 'Media Ready' : (editingPost ? 'Change Media' : 'Add Media')}
                                    </button>
                                    <input type="file" hidden ref={fileInputRef} accept="image/*,video/*" onChange={e => setSelectedFile(e.target.files?.[0] || null)} />
                                    <button disabled={isUploading || !caption.trim()} onClick={handleUpload} className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white px-8 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-[0.3em] transition-all flex items-center gap-2 shadow-xl active:scale-95">
                                        {isUploading ? (editingPost ? 'Updating...' : 'Posting...') : (editingPost ? 'Update' : 'Post')} <SendIcon className="w-4 h-4" />
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
                    onClick={() => { resetForm(); setIsPostModalOpen(true); }}
                    className="fixed bottom-24 right-5 md:bottom-10 md:right-10 z-[110] w-14 h-14 md:w-16 md:h-16 bg-red-600 text-white rounded-[1.2rem] flex items-center justify-center shadow-[0_20px_40px_rgba(220,38,38,0.4)] border-2 border-white/20 group"
                >
                    <span className="text-3xl font-light group-hover:rotate-90 transition-transform">+</span>
                </motion.button>
            )}
        </div>
    );
};

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUser } from '@clerk/clerk-react';
import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getDatabase, ref, push, onValue, query, limitToLast, set, update, get, remove } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';
import { siteConfig } from '../config';
import { PhotoManipulationIcon, SendIcon, CopyIcon, PlayIcon, SparklesIcon, CloseIcon, CheckCircleIcon, ChatBubbleIcon, EyeIcon, SearchIcon, ChevronLeftIcon, ChevronRightIcon } from './Icons';

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
const POSTS_PER_PAGE = 15;

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
    tags: string[];
    timestamp: number;
    lastEdited?: number;
    targetSection?: string;
    budget?: string;
    likes?: Record<string, boolean>;
    comments?: Record<string, Comment>;
}

const getWordCount = (str: string) => str.trim().split(/\s+/).filter(Boolean).length;

const PostCaption: React.FC<{ text: string }> = ({ text }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isTruncated, setIsTruncated] = useState(false);
    const textRef = useRef<HTMLParagraphElement>(null);

    useEffect(() => {
        const checkTruncation = () => {
            if (textRef.current) {
                const el = textRef.current;
                setIsTruncated(el.scrollHeight > el.offsetHeight);
            }
        };
        checkTruncation();
        window.addEventListener('resize', checkTruncation);
        const timer = setTimeout(checkTruncation, 150);
        return () => {
            window.removeEventListener('resize', checkTruncation);
            clearTimeout(timer);
        };
    }, [text]);

    return (
        <div className="font-sans relative w-full">
            <p 
                ref={textRef}
                className={`text-zinc-400 text-[11px] md:text-[13px] leading-relaxed break-words text-left transition-all duration-300 ${!isExpanded ? 'line-clamp-2' : ''}`}
            >
                {text}
            </p>
            {isTruncated && (
                <button 
                    onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }} 
                    className="text-zinc-500 font-black hover:text-zinc-400 transition-colors text-[10px] md:text-[11px] mt-1 block text-left uppercase tracking-widest relative z-10"
                >
                    {isExpanded ? 'Show Less' : 'Read More'}
                </button>
            )}
        </div>
    );
};

export const ExploreFeed: React.FC<{ onOpenProfile?: (id: string, username?: string) => void; onOpenModal?: (items: any[], index: number) => void }> = ({ onOpenProfile, onOpenModal }) => {
    const { user, isSignedIn } = useUser();
    const [posts, setPosts] = useState<Post[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    
    // Search State
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);

    // Form State
    const [userRole, setUserRole] = useState<UserRole>('Designer');
    const [title, setTitle] = useState('');
    const [caption, setCaption] = useState('');
    const [budget, setBudget] = useState('');
    const [tagInputs, setTagInputs] = useState(['', '', '', '', '']);
    
    // Edit State
    const [editingPostId, setEditingPostId] = useState<string | null>(null);
    const [editTitle, setEditTitle] = useState('');
    const [editCaption, setEditCaption] = useState('');
    const [editBudget, setEditBudget] = useState('');
    const [editTags, setEditTags] = useState(['', '', '', '', '']);
    const [cooldownMessage, setCooldownMessage] = useState<string | null>(null);

    const [targetSection, setTargetSection] = useState<string>('Marketplace Only');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [activeCommentsPost, setActiveCommentsPost] = useState<string | null>(null);
    const [newComment, setNewComment] = useState('');
    const [shareToast, setShareToast] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const isOwner = user?.username === OWNER_HANDLE;

    // Validation Logic
    const titleWords = getWordCount(title);
    const captionWords = getWordCount(caption);
    const descLimit = userRole === 'Designer' ? 150 : 1000;

    useEffect(() => {
        const postsRef = query(ref(db, 'explore_posts'), limitToLast(500));
        const unsubscribe = onValue(postsRef, (snap) => {
            const data = snap.val();
            if (data) {
                const list = Object.entries(data).map(([id, val]: [string, any]) => {
                    const post = val as any;
                    return {
                        id,
                        ...post,
                        title: post.title ? post.title.split(/\s+/).slice(0, 10).join(' ') : '',
                        tags: (post.tags || []).slice(0, 5)
                    };
                }).sort((a: any, b: any) => b.timestamp - a.timestamp);
                setPosts(list as Post[]);
            }
        });
        return () => unsubscribe();
    }, []);

    // Filter Logic
    const filteredPosts = useMemo(() => {
        let list = posts;
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            list = posts.filter(post => {
                const titleMatch = post.title?.toLowerCase().includes(q);
                const tagMatch = post.tags?.some(tag => tag.toLowerCase().includes(q));
                const userMatch = post.userName?.toLowerCase().includes(q);
                return titleMatch || tagMatch || userMatch;
            });
        }
        return list;
    }, [posts, searchQuery]);

    // Reset page on search change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery]);

    // Paginated content
    const totalPages = Math.max(1, Math.ceil(filteredPosts.length / POSTS_PER_PAGE));
    const paginatedPosts = useMemo(() => {
        const start = (currentPage - 1) * POSTS_PER_PAGE;
        return filteredPosts.slice(start, start + POSTS_PER_PAGE);
    }, [filteredPosts, currentPage]);

    const handlePageChange = (page: number) => {
        if (page < 1 || page > totalPages) return;
        setCurrentPage(page);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDelete = async (postId: string) => {
        if (!window.confirm("Perform Permanent Deletion? This cannot be undone.")) return;
        await remove(ref(db, `explore_posts/${postId}`));
    };

    const startEditing = (post: Post) => {
        const now = Date.now();
        const baseTime = post.lastEdited || post.timestamp;
        const hoursPassed = (now - baseTime) / (1000 * 60 * 60);

        if (hoursPassed < 5) {
            const remaining = Math.ceil(5 - hoursPassed);
            setCooldownMessage(`Security Protocol: Signal modification available in ${remaining}h`);
            setTimeout(() => setCooldownMessage(null), 3000);
            return;
        }

        setEditingPostId(post.id);
        setEditTitle(post.title || '');
        setEditCaption(post.caption || '');
        setEditBudget(post.budget || '');
        const currentTags = [...(post.tags || [])];
        while (currentTags.length < 5) currentTags.push('');
        setEditTags(currentTags);
    };

    const handleUpdate = async (postId: string) => {
        const post = posts.find(p => p.id === postId);
        if (!post) return;

        const cleanTags = editTags.map(t => t.trim()).filter(t => t !== '').slice(0, 5);
        const cleanTitle = editTitle.trim().split(/\s+/).slice(0, 10).join(' ');

        await update(ref(db, `explore_posts/${postId}`), {
            title: cleanTitle,
            caption: editCaption.trim(),
            budget: editBudget,
            tags: cleanTags,
            lastEdited: Date.now()
        });

        setEditingPostId(null);
    };

    const handleUpload = async () => {
        if (!user || !caption.trim() || titleWords > 10 || captionWords > descLimit) return;
        setIsUploading(true);
        let mediaUrl = "";
        let mediaType: 'image' | 'video' | 'text' = 'text';

        try {
            if (selectedFile) {
                const formData = new FormData();
                formData.append('file', selectedFile);
                formData.append('folder', 'UserPosts');
                const uploadRes = await fetch('https://quiet-haze-1898.fuadeditingzone.workers.dev', { method: 'POST', body: formData });
                const result = await uploadRes.json();
                mediaUrl = result.url;
                mediaType = selectedFile.type.startsWith('video') ? 'video' : 'image';
            }

            const cleanTags = tagInputs.map(t => t.trim()).filter(t => t !== '').slice(0, 5);
            const cleanTitle = title.trim().split(/\s+/).slice(0, 10).join(' ');

            const postData = {
                userId: user.id,
                userName: user.username || user.fullName,
                userAvatar: user.imageUrl,
                userRole,
                mediaUrl,
                mediaType,
                title: cleanTitle,
                caption: caption.trim(),
                tags: cleanTags,
                budget: userRole === 'Client' ? budget : '',
                timestamp: Date.now(),
                targetSection: isOwner ? targetSection : 'Marketplace Only'
            };

            await push(ref(db, 'explore_posts'), postData);
            setTitle(''); setCaption(''); setBudget(''); setTagInputs(['', '', '', '', '']); setSelectedFile(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
        } catch (err: any) { alert(`Error: ${err.message}`); } finally { setIsUploading(false); }
    };

    const handleLike = async (post: Post, isLiked: boolean) => {
        if (!isSignedIn || !user) return;
        const likeRef = ref(db, `explore_posts/${post.id}/likes/${user.id}`);
        if (isLiked) await remove(likeRef);
        else {
            await set(likeRef, true);
            if (post.userId !== user.id) {
                await push(ref(db, `notifications/${post.userId}`), {
                    type: 'like', fromId: user.id, fromName: user.username || user.fullName, fromAvatar: user.imageUrl, postId: post.id, timestamp: Date.now(), read: false
                });
            }
        }
    };

    const handleComment = async (postId: string) => {
        if (!isSignedIn || !user || !newComment.trim()) return;
        const commentData = { userId: user.id, userName: user.username || user.fullName, userAvatar: user.imageUrl, text: newComment.trim(), timestamp: Date.now() };
        await push(ref(db, `explore_posts/${postId}/comments`), commentData);
        setNewComment('');
    };

    const handleShare = (postId: string) => {
        const url = `${window.location.origin}/marketplace/post/${postId}`;
        navigator.clipboard.writeText(url);
        setShareToast(true);
        setTimeout(() => setShareToast(false), 2000);
    };

    const getBadge = (username: string) => {
        if (username === OWNER_HANDLE) return <i className="fa-solid fa-circle-check text-red-600 ml-1.5 text-[10px] md:text-[14px]"></i>;
        if (username === ADMIN_HANDLE) return <i className="fa-solid fa-circle-check text-blue-500 ml-1.5 text-[10px] md:text-[14px]"></i>;
        return null;
    };

    return (
        <div className="w-full max-w-screen-2xl mx-auto px-4 md:px-6 lg:px-8 space-y-8 pb-32 overflow-x-hidden no-scrollbar">
            <AnimatePresence>
                {shareToast && (
                    <motion.div initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} exit={{opacity:0, y:20}} className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[200] bg-white text-black px-6 py-3 rounded-full font-black uppercase text-[10px] tracking-widest shadow-2xl">Link Copied</motion.div>
                )}
                {cooldownMessage && (
                    <motion.div initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} exit={{opacity:0, y:20}} className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[200] bg-red-600 text-white px-6 py-3 rounded-full font-black uppercase text-[10px] tracking-widest shadow-2xl border border-white/20">{cooldownMessage}</motion.div>
                )}
            </AnimatePresence>

            {/* Marketplace Header with Search */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <h1 className="text-2xl md:text-4xl font-black text-white uppercase tracking-tighter font-display">Marketplace</h1>
                    <button 
                        onClick={() => setIsSearchOpen(!isSearchOpen)}
                        className={`p-2 rounded-xl transition-all ${isSearchOpen ? 'bg-red-600 text-white shadow-lg shadow-red-600/20' : 'bg-white/5 text-zinc-500 hover:text-white hover:bg-white/10'}`}
                    >
                        <SearchIcon className="w-5 h-5 md:w-6 md:h-6" />
                    </button>
                </div>

                <AnimatePresence>
                    {isSearchOpen && (
                        <motion.div 
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className="relative flex-1 max-w-md w-full"
                        >
                            <input 
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                placeholder="Search title, @user or #tags..."
                                className="w-full bg-black border border-white/10 rounded-2xl py-3 px-5 text-xs md:text-sm text-white outline-none focus:border-red-600 shadow-2xl placeholder-zinc-600 poppins-font transition-all"
                                autoFocus
                            />
                            {searchQuery && (
                                <button 
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors"
                                >
                                    <CloseIcon className="w-4 h-4" />
                                </button>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {isSignedIn && (
                <div className="bg-[#0a0a0a] border border-white/10 rounded-[2rem] p-5 md:p-10 shadow-2xl space-y-6 w-full max-w-3xl mx-auto card-fix">
                    <div className="flex flex-col gap-6">
                        {/* Role Selection */}
                        <div className="flex gap-4 p-1 bg-black rounded-xl border border-white/5 self-start">
                            {(['Designer', 'Client'] as UserRole[]).map(role => (
                                <button key={role} onClick={() => setUserRole(role)} className={`px-5 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${userRole === role ? 'bg-red-600 text-white shadow-lg' : 'text-zinc-500 hover:text-white'}`}>{role}</button>
                            ))}
                        </div>

                        <div className="flex gap-4 md:gap-5">
                            <img src={user.imageUrl} className="w-12 h-12 md:w-16 md:h-16 rounded-full border border-red-600/30 flex-shrink-0 object-cover" alt="Profile" />
                            <div className="flex-1 space-y-4 font-sans min-w-0">
                                {/* Title Field */}
                                <div className="space-y-1.5">
                                    <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Entry subject (Max 10 words)..." className={`w-full bg-black border rounded-xl p-3 md:p-4 text-white text-xs outline-none transition-colors ${titleWords >= 10 ? 'border-red-600' : 'border-white/5 focus:border-red-600/50'}`} />
                                    {titleWords >= 10 && <p className="text-red-500 text-[9px] font-black uppercase tracking-widest animate-pulse">Word limit reached!</p>}
                                </div>

                                {isOwner && (
                                    <select value={targetSection} onChange={e => setTargetSection(e.target.value)} className="w-full bg-black border border-white/5 rounded-xl p-3 md:p-4 text-red-500 text-[10px] font-black uppercase tracking-widest outline-none focus:border-red-600/50 appearance-none cursor-pointer">
                                        <option>Marketplace Only</option>
                                        <option>Photo Manipulation</option>
                                        <option>Thumbnail Designs</option>
                                        <option>Banner Designs</option>
                                        <option>VFX</option>
                                    </select>
                                )}

                                {/* Description Field */}
                                <div className="space-y-1.5">
                                    <textarea value={caption} onChange={e => setCaption(e.target.value)} placeholder={`Tell us more (Max ${descLimit} words)...`} className={`w-full bg-black border rounded-xl p-3 md:p-4 text-white text-xs outline-none resize-none h-24 md:h-32 transition-colors ${captionWords >= descLimit ? 'border-red-600' : 'border-white/5 focus:border-red-600/50'}`} />
                                    <div className="flex justify-between items-center">
                                        <p className={`text-[9px] font-black uppercase tracking-widest ${captionWords >= descLimit ? 'text-red-500 animate-pulse' : 'text-zinc-600'}`}>{captionWords} / {descLimit} Words</p>
                                    </div>
                                </div>

                                {/* Budget Field for Clients */}
                                {userRole === 'Client' && (
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-red-600 font-black text-xs">$</span>
                                        <input type="number" value={budget} onChange={e => setBudget(e.target.value)} placeholder="Project Budget" className="w-full bg-black border border-white/5 rounded-xl py-3 pl-8 pr-4 text-white text-xs outline-none focus:border-red-600/50" />
                                    </div>
                                )}

                                {/* 5 Separate Tag Inputs */}
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest ml-1">Meta Tags (max 5)</label>
                                    <div className="flex flex-col md:flex-row gap-2">
                                        {tagInputs.map((val, idx) => (
                                            <div key={idx} className="flex-1 flex items-center bg-black border border-white/5 rounded-xl overflow-hidden px-3 group focus-within:border-red-600/50">
                                                <span className="text-red-600 font-black text-xs pr-1">#</span>
                                                <input value={val} onChange={e => {
                                                    const next = [...tagInputs];
                                                    next[idx] = e.target.value.replace(/\s+/g, '');
                                                    setTagInputs(next);
                                                }} className="bg-transparent w-full py-2 text-white text-[11px] outline-none" placeholder="tag" />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex items-center justify-between border-t border-white/5 pt-4 md:pt-6">
                        <div className="flex gap-2">
                            <input type="file" hidden ref={fileInputRef} accept="image/*,video/*" onChange={e => setSelectedFile(e.target.files?.[0] || null)} />
                            <button onClick={() => fileInputRef.current?.click()} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all ${selectedFile ? 'bg-green-600 text-white' : 'bg-white/5 text-zinc-400 hover:bg-white/10'}`}>
                                <PhotoManipulationIcon className="w-4 h-4 md:w-5 md:h-5" /> {selectedFile ? 'Asset Ready' : 'Add Media'}
                            </button>
                        </div>
                        <button disabled={isUploading || !caption.trim() || titleWords > 10 || captionWords > descLimit} onClick={handleUpload} className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white px-6 md:px-10 py-2.5 md:py-3 rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 shadow-xl font-display">
                            {isUploading ? '...' : 'Post Signal'} <SendIcon className="w-4 h-4 md:w-5 md:h-5" />
                        </button>
                    </div>
                </div>
            )}

            {/* Layout: Masonry columns with Paginated Content */}
            <div className="w-full md:columns-2 lg:columns-3 md:gap-6 md:space-y-6 min-h-[400px] flex flex-col md:block">
                {paginatedPosts.map((post, idx) => {
                    const postLikes = Object.keys(post.likes || {}).length;
                    const isLikedByMe = user ? !!post.likes?.[user.id] : false;
                    const isMyPost = user?.id === post.userId;
                    const isEditingThisPost = editingPostId === post.id;
                    const commentsList = Object.entries(post.comments || {}).map(([id, val]) => ({ id, ...(val as any) }));

                    return (
                        <article 
                            key={post.id} 
                            className="w-full bg-[#080808] border border-white/10 rounded-[2rem] overflow-hidden shadow-2xl flex flex-col card-fix break-inside-avoid mb-6 md:mb-6"
                        >
                            {/* Profile Header */}
                            <div className="p-4 md:p-4 flex items-center justify-between bg-black/60 border-b border-white/5">
                                <div className="flex items-center gap-3 cursor-pointer group min-w-0" onClick={() => onOpenProfile?.(post.userId, post.userName)}>
                                    <div className="relative">
                                        <img src={post.userAvatar} className="w-9 h-9 rounded-full border-2 border-white/10 object-cover flex-shrink-0" alt="" />
                                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-black rounded-full"></div>
                                    </div>
                                    <div className="min-w-0 text-left">
                                        <div className="flex items-center">
                                            <p className="text-[12px] font-black text-white uppercase truncate group-hover:text-red-500 transition-colors font-display tracking-tight">@{post.userName}</p>
                                            {getBadge(post.userName)}
                                        </div>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <span className={`text-[7px] px-1.5 py-0.5 rounded bg-white/5 border border-white/10 font-black uppercase tracking-tighter ${post.userRole === 'Client' ? 'text-blue-400' : 'text-red-500'}`}>{post.userRole || 'Designer'}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-1.5">
                                    {isMyPost && (
                                        <>
                                            <button onClick={() => startEditing(post)} className="p-2 rounded-full bg-white/5 text-zinc-500 hover:text-white transition-all active:scale-90" title="Modify Signal"><i className="fa-solid fa-pen-to-square text-[10px]"></i></button>
                                            <button onClick={() => handleDelete(post.id)} className="p-2 rounded-full bg-white/5 text-zinc-600 hover:text-red-600 transition-all active:scale-90" title="Retract Signal"><i className="fa-solid fa-trash text-[10px]"></i></button>
                                        </>
                                    )}
                                    <button onClick={() => handleShare(post.id)} title="Copy URL" className="p-2 rounded-full bg-white/5 text-zinc-500 hover:text-white transition-all active:scale-90"><CopyIcon className="w-3.5 h-3.5" /></button>
                                </div>
                            </div>

                            {/* Media Section */}
                            {post.mediaUrl && !isEditingThisPost && (
                                <div 
                                    className="w-full bg-[#050505] flex items-center justify-center relative group overflow-hidden border-b border-white/5 cursor-pointer"
                                    onClick={() => onOpenModal?.(posts, idx)}
                                >
                                    {post.mediaType === 'video' ? (
                                        <video src={post.mediaUrl} className="w-full h-auto max-h-[85vh] object-contain" />
                                    ) : (
                                        <img src={post.mediaUrl} className="w-full h-auto max-h-[85vh] object-contain transition-transform duration-1000 group-hover:scale-105" alt={post.title || "Asset"} />
                                    )}
                                    
                                    {/* Budget Badge on Media */}
                                    {post.budget && (
                                        <div className="absolute top-3 left-3 bg-red-600/90 backdrop-blur-md text-white font-black px-3 py-1 rounded-full text-[9px] uppercase tracking-[0.15em] shadow-2xl border border-white/20">
                                            ${post.budget}
                                        </div>
                                    )}

                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all duration-500">
                                        <div className="p-3 bg-red-600 rounded-full shadow-3xl scale-75 group-hover:scale-100 transition-transform">
                                            <EyeIcon className="w-6 h-6 text-white" />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Content Section / Edit Form */}
                            <div className="p-5 md:p-5 space-y-3.5 flex-1 flex flex-col items-start text-left">
                                {isEditingThisPost ? (
                                    <div className="w-full space-y-4 font-sans animate-fade-in">
                                        <div className="flex items-center justify-between">
                                            <h4 className="text-[10px] font-black text-red-500 uppercase tracking-widest">Protocol Modulation</h4>
                                            <button onClick={() => setEditingPostId(null)} className="text-zinc-500 hover:text-white transition-colors"><CloseIcon className="w-4 h-4" /></button>
                                        </div>
                                        <input value={editTitle} onChange={e => setEditTitle(e.target.value)} placeholder="Entry subject..." className="w-full bg-black border border-white/10 rounded-xl p-3 text-white text-xs outline-none focus:border-red-600/50" />
                                        <textarea value={editCaption} onChange={e => setEditCaption(e.target.value)} rows={4} placeholder="Modulation details..." className="w-full bg-black border border-white/10 rounded-xl p-3 text-white text-xs outline-none resize-none focus:border-red-600/50" />
                                        {post.userRole === 'Client' && (
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-red-600 font-black text-xs">$</span>
                                                <input type="number" value={editBudget} onChange={e => setEditBudget(e.target.value)} className="w-full bg-black border border-white/10 rounded-xl p-3 pl-8 text-white text-xs outline-none focus:border-red-600/50" />
                                            </div>
                                        )}
                                        <div className="space-y-2">
                                            {editTags.map((t, i) => (
                                                <div key={i} className="flex items-center bg-black border border-white/10 rounded-xl px-3 py-1">
                                                    <span className="text-red-500 font-bold text-xs mr-2">#</span>
                                                    <input value={t} onChange={e => { const n = [...editTags]; n[i] = e.target.value.replace(/\s+/g, ''); setEditTags(n); }} className="bg-transparent w-full py-1 text-white text-[11px] outline-none" />
                                                </div>
                                            ))}
                                        </div>
                                        <button onClick={() => handleUpdate(post.id)} className="w-full py-3 bg-red-600 text-white font-black uppercase text-[10px] tracking-widest rounded-xl shadow-lg hover:bg-red-700 transition-all">Apply Modification</button>
                                    </div>
                                ) : (
                                    <>
                                        {post.title && (
                                            <h2 className="text-[13px] md:text-[14px] font-black text-white uppercase tracking-tight whitespace-normal break-words w-full font-display border-b border-white/10 pb-2.5 leading-tight no-clip">
                                                {post.title}
                                            </h2>
                                        )}
                                        
                                        <PostCaption key={`caption-${post.id}`} text={post.caption} />
                                        
                                        {!post.mediaUrl && post.budget && (
                                            <div className="w-full p-3 bg-red-600/10 border border-red-600/20 rounded-xl flex items-center justify-between">
                                                <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">Budget</span>
                                                <span className="text-xs font-black text-white">${post.budget}</span>
                                            </div>
                                        )}

                                        {/* Tags display */}
                                        {post.tags && post.tags.length > 0 && (
                                            <div className="flex flex-wrap gap-1">
                                                {post.tags.slice(0, 5).map((tag, i) => (
                                                    <span key={i} className="text-[8px] font-black text-red-500 uppercase tracking-tight bg-red-600/5 px-2 py-0.5 rounded-lg">#{tag}</span>
                                                ))}
                                            </div>
                                        )}

                                        {post.lastEdited && (
                                            <p className="text-[7px] font-black uppercase tracking-widest text-zinc-600">Sync: Signal Modulated</p>
                                        )}
                                        
                                        {/* Engagement Controls */}
                                        <div className="mt-2 w-full">
                                            <div className="flex flex-row items-center gap-5 pt-3.5 border-t border-white/5">
                                                <button onClick={() => handleLike(post, isLikedByMe)} className={`flex items-center gap-2 transition-all ${isLikedByMe ? 'text-red-600' : 'text-zinc-500 hover:text-white'}`}>
                                                    <div className={`p-2 rounded-xl flex-shrink-0 ${isLikedByMe ? 'bg-red-600/20' : 'bg-white/5'} transition-all`}>
                                                        <i className={`fa-${isLikedByMe ? 'solid' : 'regular'} fa-heart text-sm`}></i>
                                                    </div>
                                                    <span className="text-sm font-medium font-sans leading-none">{postLikes}</span>
                                                </button>
                                                <button onClick={() => setActiveCommentsPost(activeCommentsPost === post.id ? null : post.id)} className={`flex items-center gap-2 transition-all ${activeCommentsPost === post.id ? 'text-red-500' : 'text-zinc-500 hover:text-white'}`}>
                                                    <div className={`p-2 rounded-xl flex-shrink-0 ${activeCommentsPost === post.id ? 'bg-red-600/20' : 'bg-white/5'} transition-all`}>
                                                        <i className={`fa-${activeCommentsPost === post.id ? 'solid' : 'regular'} fa-comment text-sm`}></i>
                                                    </div>
                                                    <span className="text-sm font-medium font-sans leading-none">{commentsList.length}</span>
                                                </button>
                                            </div>

                                            <AnimatePresence>
                                                {activeCommentsPost === post.id && (
                                                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="pt-4 space-y-3 overflow-hidden">
                                                        <div className="space-y-3 max-h-[180px] overflow-y-auto custom-scrollbar pr-1.5">
                                                            {commentsList.map(c => (
                                                                <div key={c.id} className="flex gap-2.5 items-start font-sans text-left">
                                                                    <img src={c.userAvatar} className="w-7 h-7 rounded-lg flex-shrink-0 object-cover border border-white/10" alt="" />
                                                                    <div className="bg-white/5 p-2.5 rounded-xl flex-1 min-w-0 border border-white/5">
                                                                        <div className="flex items-center cursor-pointer mb-0.5" onClick={() => onOpenProfile?.(c.userId, c.userName)}>
                                                                            <p className="text-[9px] font-black text-white uppercase truncate">@{c.userName}</p>
                                                                            {getBadge(c.userName)}
                                                                        </div>
                                                                        <p className="text-[10px] text-zinc-400 leading-relaxed break-words">{c.text}</p>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                        {isSignedIn && (
                                                            <div className="flex gap-2 items-center font-sans mt-1.5">
                                                                <input value={newComment} onChange={e => setNewComment(e.target.value)} onKeyPress={e => e.key === 'Enter' && handleComment(post.id)} placeholder="..." className="flex-1 bg-black border border-white/10 rounded-xl px-3 py-2 text-[10px] outline-none focus:border-red-600 transition-all text-white min-w-0 font-bold" />
                                                                <button onClick={() => handleComment(post.id)} disabled={!newComment.trim()} className="p-2.5 bg-red-600 text-white rounded-xl active:scale-90 transition-all flex-shrink-0 shadow-lg disabled:opacity-50"><SendIcon className="w-3.5 h-3.5" /></button>
                                                            </div>
                                                        )}
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    </>
                                )}
                            </div>
                        </article>
                    );
                })}

                {filteredPosts.length === 0 && (
                    <div className="col-span-full py-32 text-center">
                        <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
                            <SearchIcon className="w-8 h-8 text-zinc-700" />
                        </div>
                        <h3 className="text-white font-black uppercase tracking-widest text-lg">No Results Found</h3>
                        <p className="text-zinc-500 text-xs mt-2 uppercase tracking-widest">Signal lost on this frequency.</p>
                        <button onClick={() => setSearchQuery('')} className="mt-8 text-red-500 font-black text-[10px] uppercase tracking-[0.4em] border-b border-red-500/20 pb-1 hover:border-red-500 transition-all">Reset Filter</button>
                    </div>
                )}
            </div>

            {/* Pagination Control Bar */}
            {filteredPosts.length > POSTS_PER_PAGE && (
                <div className="w-full flex justify-center items-center gap-2 md:gap-4 py-12">
                    <button 
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="p-3 rounded-xl bg-white/5 border border-white/10 text-zinc-400 hover:text-red-500 hover:bg-white/10 disabled:opacity-30 disabled:hover:text-zinc-400 disabled:hover:bg-white/5 transition-all"
                    >
                        <ChevronLeftIcon className="w-5 h-5" />
                    </button>

                    <div className="flex items-center gap-1 md:gap-2">
                        {[...Array(totalPages)].map((_, i) => {
                            const page = i + 1;
                            // Show first, last, and a few around current page
                            if (page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1)) {
                                return (
                                    <button
                                        key={page}
                                        onClick={() => handlePageChange(page)}
                                        className={`w-10 h-10 md:w-12 md:h-12 rounded-xl border font-black text-[10px] md:text-xs transition-all ${currentPage === page ? 'bg-red-600 border-red-500 text-white shadow-lg shadow-red-600/20 scale-110' : 'bg-white/5 border-white/10 text-zinc-500 hover:text-white hover:bg-white/10'}`}
                                    >
                                        {page}
                                    </button>
                                );
                            } else if (page === currentPage - 2 || page === currentPage + 2) {
                                return <span key={page} className="text-zinc-700 px-1 font-black">...</span>;
                            }
                            return null;
                        })}
                    </div>

                    <button 
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="p-3 rounded-xl bg-white/5 border border-white/10 text-zinc-400 hover:text-red-500 hover:bg-white/10 disabled:opacity-30 disabled:hover:text-zinc-400 disabled:hover:bg-white/5 transition-all"
                    >
                        <ChevronRightIcon className="w-5 h-5" />
                    </button>
                </div>
            )}
        </div>
    );
};
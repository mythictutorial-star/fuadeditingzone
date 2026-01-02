
import React, { useState, useEffect, useRef } from 'react';
import type { GraphicWork, VideoWork, ModalItem } from '../hooks/types';
import type { Comment as PostComment } from './ExploreFeed';
import { 
    CloseIcon, PlayIcon, CheckCircleIcon, HeartHoverIcon,
    ChatBubbleIcon, SendIcon, ChevronLeftIcon, ChevronRightIcon
} from './Icons';
import { siteConfig } from '../config';
import { motion, AnimatePresence } from 'framer-motion';
import { useUser } from '@clerk/clerk-react';
import { getDatabase, ref, onValue, push, remove, set, get, update } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';

interface ModalViewerProps {
  state: { items: ModalItem[]; currentIndex: number };
  onClose: () => void;
  onNext: (idx: number) => void;
  onPrev: (idx: number) => void;
  highlightCommentId?: string | null;
}

const OWNER_HANDLE = 'fuadeditingzone';
const ADMIN_HANDLE = 'studiomuzammil';

const VerificationBadge: React.FC<{ username?: string }> = ({ username }) => {
    if (!username) return null;
    const isOwner = username === OWNER_HANDLE;
    const isAdmin = username === ADMIN_HANDLE;
    if (!isOwner && !isAdmin) return null;
    return (
        <i className={`fa-solid fa-circle-check ${isOwner ? 'text-red-600' : 'text-blue-500'} text-[10px] md:text-[12px] ml-1`}></i>
    );
};

const CommentItem: React.FC<{
    comment: PostComment;
    postId: string;
    postOwnerId: string;
    user: any;
    db: any;
    isHighlighted?: boolean;
    isReply?: boolean;
    parentCommentId?: string;
}> = ({ comment, postId, postOwnerId, user, db, isHighlighted, isReply, parentCommentId }) => {
    const [isReplying, setIsReplying] = useState(false);
    const [replyText, setReplyText] = useState('');
    const [showReplies, setShowReplies] = useState(false);
    const itemRef = useRef<HTMLDivElement>(null);

    const isLikedByMe = user ? !!comment.likes?.[user.id] : false;
    const isLikedByOwner = !!comment.likes?.[postOwnerId];
    const likesCount = Object.keys(comment.likes || {}).length;
    const replies = comment.replies ? Object.entries(comment.replies).map(([id, val]: [string, any]) => ({ id, ...val })) : [];

    useEffect(() => {
        if (isHighlighted && itemRef.current) {
            itemRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, [isHighlighted]);

    const handleLikeComment = async () => {
        if (!user) return;
        const commentPath = isReply 
            ? `explore_posts/${postId}/comments/${parentCommentId}/replies/${comment.id}/likes/${user.id}`
            : `explore_posts/${postId}/comments/${comment.id}/likes/${user.id}`;
        
        const likeRef = ref(db, commentPath);
        const snap = await get(likeRef);
        if (snap.exists()) await remove(likeRef);
        else await set(likeRef, true);
    };

    const handlePostReply = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !replyText.trim()) return;
        const replyRef = ref(db, `explore_posts/${postId}/comments/${comment.id}/replies`);
        await push(replyRef, {
            userId: user.id,
            userName: user.username || user.fullName,
            userAvatar: user.imageUrl,
            text: replyText.trim(),
            timestamp: Date.now()
        });
        
        if (comment.userId !== user.id) {
            await push(ref(db, `notifications/${comment.userId}`), {
                type: 'comment_reply',
                fromId: user.id,
                fromName: user.username || user.fullName,
                fromAvatar: user.imageUrl,
                text: `@${user.username || user.fullName} replied to your comment.`,
                timestamp: Date.now(),
                read: false,
                postId,
                commentId: comment.id
            });
        }

        setReplyText('');
        setIsReplying(false);
        setShowReplies(true);
    };

    return (
        <div ref={itemRef} className={`group flex flex-col gap-3 ${isHighlighted ? 'bg-red-600/5 ring-1 ring-red-600/20 rounded-xl p-3 -mx-3' : ''} transition-all`}>
            <div className="flex gap-3">
                <img src={comment.userAvatar} className="w-8 h-8 rounded-lg object-cover border border-white/10 flex-shrink-0" alt="" />
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1 mb-1">
                        <span className="text-[11px] font-black text-white uppercase tracking-tight">@{comment.userName}</span>
                        <VerificationBadge username={comment.userName} />
                        <span className="text-[7px] text-zinc-700 font-bold uppercase ml-auto">{new Date(comment.timestamp).toLocaleDateString()}</span>
                        {comment.userId === postOwnerId && <span className="text-[6px] bg-red-600/20 text-red-500 px-1 rounded font-black border border-red-600/30 ml-2">AUTHOR</span>}
                    </div>
                    <p className="text-zinc-300 text-xs leading-relaxed break-words font-sans">{comment.text}</p>
                    <div className="mt-2 flex items-center gap-4">
                        {!isReply && (
                            <button onClick={() => setIsReplying(!isReplying)} className="text-[8px] font-black text-zinc-600 hover:text-white uppercase tracking-widest transition-colors">Reply</button>
                        )}
                        <div className="flex items-center gap-2">
                             <button onClick={handleLikeComment} className={`flex items-center gap-1.5 transition-all ${isLikedByMe ? 'text-red-500' : 'text-zinc-600 hover:text-red-500'}`}>
                                <i className={`fa-${isLikedByMe ? 'solid' : 'regular'} fa-heart text-[10px]`}></i>
                                {likesCount > 0 && <span className="text-[8px] font-black">{likesCount}</span>}
                            </button>
                            {isLikedByOwner && (
                                <div className="flex items-center gap-1.5" title="Liked by author">
                                    <span className="w-px h-2 bg-zinc-800"></span>
                                    <div className="relative">
                                        <i className="fa-solid fa-heart text-[8px] text-red-600"></i>
                                        <div className="absolute inset-0 bg-red-600/20 blur-[4px] rounded-full"></div>
                                    </div>
                                    <span className="text-[7px] font-black text-zinc-500 uppercase tracking-widest">Author liked</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <AnimatePresence>
                {isReplying && (
                    <motion.form 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        onSubmit={handlePostReply}
                        className="ml-11 relative"
                    >
                        <input 
                            autoFocus
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            placeholder={`Reply to @${comment.userName}...`}
                            className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-4 pr-10 text-[10px] text-white outline-none focus:border-red-600/50 transition-all font-medium placeholder-zinc-700" 
                        />
                        <button type="submit" className="absolute right-1 top-1/2 -translate-y-1/2 p-1.5 text-red-600"><SendIcon className="w-3.5 h-3.5"/></button>
                    </motion.form>
                )}
            </AnimatePresence>

            {replies.length > 0 && (
                <div className="ml-11 space-y-4 pt-2">
                    <button onClick={() => setShowReplies(!showReplies)} className="flex items-center gap-2 text-[8px] font-black text-zinc-600 hover:text-zinc-400 uppercase tracking-widest group">
                        <span className="w-6 h-[1px] bg-zinc-800 group-hover:bg-zinc-600 transition-colors"></span>
                        {showReplies ? 'Hide replies' : `View ${replies.length} replies`}
                    </button>
                    <AnimatePresence>
                        {showReplies && (
                            <motion.div 
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="space-y-4 overflow-hidden"
                            >
                                {replies.map((reply) => (
                                    <CommentItem 
                                        key={reply.id}
                                        comment={reply}
                                        postId={postId}
                                        postOwnerId={postOwnerId}
                                        user={user}
                                        db={db}
                                        isReply
                                        parentCommentId={comment.id}
                                    />
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            )}
        </div>
    );
};

export const ModalViewer: React.FC<ModalViewerProps> = ({ state, onClose, onNext, onPrev, highlightCommentId }) => {
    const { items, currentIndex } = state;
    const currentItem = items[currentIndex];
    const { user, isSignedIn } = useUser();
    const db = getDatabase();
    
    const [showShareToast, setShowShareToast] = useState(false);
    const [comments, setComments] = useState<any[]>([]);
    const [newComment, setNewComment] = useState('');
    const [likes, setLikes] = useState<Record<string, boolean>>({});
    
    const commentsEndRef = useRef<HTMLDivElement>(null);
    const commentsSectionRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    const isDynamicPost = !!(currentItem as any).userId;
    const isOwnerOfPost = user?.id === (currentItem as any).userId;
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

    const handleScrollToComments = () => {
        if (window.innerWidth < 768) {
             if (commentsSectionRef.current) {
                commentsSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        } else {
            if (scrollContainerRef.current && commentsSectionRef.current) {
                scrollContainerRef.current.scrollTo({
                    top: commentsSectionRef.current.offsetTop - 20,
                    behavior: 'smooth'
                });
            }
        }
    };

    const handleLike = async () => {
        if (!isSignedIn || !user || !isDynamicPost) return;
        const likeRef = ref(db, `explore_posts/${(currentItem as any).id}/likes/${user.id}`);
        if (isLiked) await remove(likeRef);
        else {
            await set(likeRef, true);
            if ((currentItem as any).userId !== user.id) {
                await push(ref(db, `notifications/${(currentItem as any).userId}`), {
                    type: 'post_like',
                    fromId: user.id,
                    fromName: user.username || user.fullName,
                    fromAvatar: user.imageUrl,
                    text: `@${user.username || user.fullName} liked your post.`,
                    timestamp: Date.now(),
                    read: false,
                    postId: (currentItem as any).id
                });
            }
        }
    };

    const handlePostComment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isSignedIn || !user || !newComment.trim() || !isDynamicPost) return;
        const postId = (currentItem as any).id;
        const postAuthorId = (currentItem as any).userId;
        const commentRef = ref(db, `explore_posts/${postId}/comments`);
        const newCommentRef = await push(commentRef, {
            userId: user.id,
            userName: user.username || user.fullName,
            userAvatar: user.imageUrl,
            text: newComment.trim(),
            timestamp: Date.now()
        });
        
        if (postAuthorId !== user.id) {
            await push(ref(db, `notifications/${postAuthorId}`), {
                type: 'post_comment',
                fromId: user.id,
                fromName: user.username || user.fullName,
                fromAvatar: user.imageUrl,
                text: `@${user.username || user.fullName} commented on your post.`,
                timestamp: Date.now(),
                read: false,
                postId,
                commentId: newCommentRef.key
            });
        }

        setNewComment('');
        setTimeout(() => {
            if (commentsEndRef.current) {
                commentsEndRef.current.scrollIntoView({ behavior: 'smooth' });
            }
        }, 100);
    };

    return (
        <div className="fixed inset-0 bg-black/95 z-[5000000] flex items-center justify-center p-0 md:p-10 animate-fade-in overflow-hidden">
            <div className="absolute inset-0 bg-cover bg-center filter blur-3xl brightness-[0.1] opacity-40 scale-110 pointer-events-none" 
                 style={{ backgroundImage: `url(${getImageUrl() || siteConfig.branding.profilePicUrl})` }} />

            {/* Main Modal Container */}
            <div className="relative w-full h-full md:max-w-[1000px] md:max-h-[85vh] bg-black flex flex-col md:flex-row md:rounded-2xl overflow-hidden shadow-[0_0_100px_rgba(0,0,0,1)] border border-white/10">
                
                <div className="relative flex-1 flex flex-col min-w-0 bg-black/60 overflow-hidden h-full">
                    {/* Header: Profile Info Only on Mobile, Close Only on Desktop */}
                    <div className="relative z-[100] flex justify-between items-center p-4 md:p-6 bg-gradient-to-b from-black/90 to-transparent flex-shrink-0">
                        <div className="md:hidden flex items-center gap-3">
                            <img src={(currentItem as any).userAvatar || siteConfig.branding.logoUrl} className="w-8 h-8 rounded-full object-cover" alt="" />
                            <div className="flex flex-col">
                                <div className="flex items-center">
                                    <span className="text-white font-black text-[10px] uppercase tracking-tight">@{(currentItem as any).userName || 'selectedlegend'}</span>
                                    <VerificationBadge username={(currentItem as any).userName} />
                                </div>
                                <span className="text-zinc-500 font-bold text-[7px] uppercase tracking-widest">{(currentItem as any).category || (currentItem as any).userRole || 'Visual Artist'}</span>
                            </div>
                        </div>
                        <div className="hidden md:block"></div> {/* Spacer for desktop close button position */}
                        <button onClick={onClose} className="text-white p-2 rounded-full bg-white/5 border border-white/10 hover:bg-red-600 transition-all">
                            <CloseIcon className="h-5 w-5" />
                        </button>
                    </div>

                    {/* Main Content Area */}
                    <div className="flex-1 relative overflow-y-auto no-scrollbar md:flex md:items-center md:justify-center">
                        <div className="w-full min-h-full flex flex-col md:items-center md:justify-center p-0" onClick={onClose}>
                            <div className="relative w-full flex flex-col md:items-center md:justify-center" onClick={e => e.stopPropagation()}>
                                
                                {/* Media Player Container */}
                                <div className="relative w-full max-h-[65vh] md:max-h-[85vh] flex items-center justify-center bg-black/40">
                                    {isImage(currentItem) ? (
                                        <img src={getImageUrl()} className="max-w-full max-h-[65vh] md:max-h-[85vh] object-contain animate-fade-in pointer-events-none" alt="" />
                                    ) : isVideo(currentItem) ? (
                                        <div className="w-full max-h-[65vh] md:max-h-[85vh] flex items-center justify-center">
                                            <div className="w-full aspect-video bg-black overflow-hidden flex items-center justify-center">
                                                {getVideoUrl() ? (
                                                    <video src={getVideoUrl()} controls autoPlay className="max-w-full max-h-full object-contain" />
                                                ) : (
                                                    <iframe src={`https://www.youtube.com/embed/${(currentItem as any).videoId}?autoplay=1`} className="w-full h-full border-0" allowFullScreen></iframe>
                                                )}
                                            </div>
                                        </div>
                                    ) : null}

                                    {/* Navigation Arrows */}
                                    <button onClick={(e) => { e.stopPropagation(); onPrev((currentIndex - 1 + items.length) % items.length); }} className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white p-2 md:p-3 bg-black/20 rounded-full transition-all">
                                        <ChevronLeftIcon className="w-6 h-6 md:w-8 md:h-8" />
                                    </button>
                                    <button onClick={(e) => { e.stopPropagation(); onNext((currentIndex + 1) % items.length); }} className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white p-2 md:p-3 bg-black/20 rounded-full transition-all">
                                        <ChevronRightIcon className="w-6 h-6 md:w-8 md:h-8" />
                                    </button>
                                </div>

                                {/* Mobile-Only Interaction Flow */}
                                <div className="md:hidden flex flex-col bg-[#050505] p-5 pb-32 w-full">
                                    <div className="flex items-center justify-between mb-5">
                                        <div className="flex items-center gap-7">
                                            <button onClick={handleLike} className={`transition-all ${isLiked ? 'text-red-500 scale-125' : 'text-white/80 hover:text-white'}`}>
                                                <i className={`fa-${isLiked ? 'solid' : 'regular'} fa-heart text-2xl`}></i>
                                            </button>
                                            <button onClick={handleScrollToComments} className="text-white/80 hover:text-white">
                                                <ChatBubbleIcon className="w-7 h-7" />
                                            </button>
                                            <button onClick={handleShare} className="text-white/80 hover:text-white">
                                                <i className="fa-solid fa-share-nodes text-2xl"></i>
                                            </button>
                                        </div>
                                    </div>

                                    <div className="space-y-3 mb-8">
                                        <p className="text-[12px] font-black text-white uppercase tracking-wider">
                                            {Object.keys(likes).length} Likes
                                        </p>
                                        <h3 className="text-white font-black text-sm uppercase tracking-tight">{(currentItem as any).title || 'Portfolio Work'}</h3>
                                        <p className="text-zinc-400 text-xs leading-relaxed font-sans">{(currentItem as any).caption || (currentItem as any).description || 'No details available.'}</p>
                                        {isDynamicPost && (currentItem as any).tags && (
                                            <div className="flex flex-wrap gap-2 mt-2">
                                                {(currentItem as any).tags.map((tag: string, i: number) => (
                                                    <span key={i} className="text-[9px] font-black text-red-600/60 uppercase">#{tag}</span>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Mobile Comments Section */}
                                    <div ref={commentsSectionRef} className="pt-6 border-t border-white/5 space-y-6">
                                        <div className="flex justify-between items-center">
                                            <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                                                Comments ({comments.length})
                                            </h4>
                                        </div>
                                        
                                        {comments.length === 0 ? (
                                            <div className="py-10 text-center opacity-20">
                                                <ChatBubbleIcon className="w-10 h-10 mx-auto mb-3" />
                                                <p className="text-[8px] font-black uppercase tracking-widest">No comments yet</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-6">
                                                {comments.map((cm) => (
                                                    <CommentItem 
                                                        key={cm.id}
                                                        comment={cm}
                                                        postId={(currentItem as any).id}
                                                        postOwnerId={(currentItem as any).userId}
                                                        user={user}
                                                        db={db}
                                                    />
                                                ))}
                                                <div ref={commentsEndRef} />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Desktop Sidebar: Profile Info and Comments */}
                <div className="hidden md:flex w-[380px] bg-[#080808] border-l border-white/10 flex-col flex-shrink-0 h-full overflow-hidden">
                    <div className="flex p-6 border-b border-white/5 items-center justify-between bg-black/20 backdrop-blur-xl">
                        <div className="flex items-center gap-3">
                            <img src={(currentItem as any).userAvatar || siteConfig.branding.logoUrl} className="w-10 h-10 rounded-xl object-cover border border-white/10" alt="" />
                            <div className="flex flex-col">
                                <div className="flex items-center">
                                    <p className="text-white font-black text-xs uppercase tracking-tight">@{(currentItem as any).userName || 'selectedlegend'}</p>
                                    <VerificationBadge username={(currentItem as any).userName} />
                                </div>
                                <p className="text-red-500 font-black text-[8px] uppercase tracking-widest">{(currentItem as any).userRole || 'Visual Artist'}</p>
                            </div>
                        </div>
                    </div>

                    <div ref={scrollContainerRef} className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-10 no-scrollbar bg-black/40">
                        <div className="space-y-4">
                            <h3 className="text-white font-black text-xl lg:text-2xl uppercase tracking-tighter leading-tight">{(currentItem as any).title || 'Masterwork'}</h3>
                            <p className="text-zinc-400 text-sm leading-relaxed font-sans">{(currentItem as any).caption || (currentItem as any).description || 'No description provided.'}</p>
                            {isDynamicPost && (currentItem as any).tags && (
                                <div className="flex flex-wrap gap-2">
                                    {(currentItem as any).tags.map((tag: string, i: number) => (
                                        <span key={i} className="px-2.5 py-1 bg-white/5 border border-white/5 rounded text-[8px] font-black text-zinc-500 uppercase tracking-widest">#{tag}</span>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div ref={commentsSectionRef} className="pt-8 border-t border-white/5 space-y-8">
                            <div className="flex items-center justify-between">
                                <h4 className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.3em]">Communication</h4>
                                <span className="text-[10px] font-black text-zinc-700 uppercase">{comments.length} Comments</span>
                            </div>
                            
                            {comments.length === 0 ? (
                                <div className="py-24 text-center opacity-20">
                                    <ChatBubbleIcon className="w-12 h-12 mx-auto mb-4" />
                                    <p className="text-[9px] font-black uppercase tracking-[0.4em]">No comments yet</p>
                                </div>
                            ) : (
                                <div className="space-y-8 pb-10">
                                    {comments.map((cm) => (
                                        <CommentItem 
                                            key={cm.id}
                                            comment={cm}
                                            postId={(currentItem as any).id}
                                            postOwnerId={(currentItem as any).userId}
                                            user={user}
                                            db={db}
                                            isHighlighted={cm.id === highlightCommentId}
                                        />
                                    ))}
                                    <div ref={commentsEndRef} />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Desktop Footer Actions */}
                    <div className="p-6 bg-black/60 border-t border-white/5 space-y-6 backdrop-blur-3xl flex-shrink-0">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-8">
                                <button onClick={handleLike} className={`flex items-center gap-2.5 transition-all ${isLiked ? 'text-red-500 scale-110' : 'text-white/60 hover:text-white'}`}>
                                    <i className={`fa-${isLiked ? 'solid' : 'regular'} fa-heart text-2xl`}></i>
                                    <span className="text-xs font-black uppercase tracking-widest">{Object.keys(likes).length}</span>
                                </button>
                                <button onClick={handleScrollToComments} className="flex items-center gap-2.5 text-white/60 hover:text-white transition-colors">
                                    <ChatBubbleIcon className="w-6 h-6" />
                                    <span className="text-xs font-black uppercase tracking-widest">{comments.length}</span>
                                </button>
                            </div>
                            <button onClick={handleShare} className="text-white/40 hover:text-red-500 transition-colors">
                                <i className="fa-solid fa-share-nodes text-2xl"></i>
                            </button>
                        </div>

                        {isDynamicPost && (
                            <form onSubmit={handlePostComment} className="relative">
                                <input 
                                    value={newComment}
                                    onChange={(e) => setNewComment(e.target.value)}
                                    placeholder={isSignedIn ? "Add a comment..." : "Log in to comment"}
                                    disabled={!isSignedIn}
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-6 pr-14 text-xs text-white outline-none focus:border-red-600/50 transition-all font-medium placeholder-zinc-800" 
                                />
                                <button 
                                    type="submit"
                                    disabled={!newComment.trim()}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 bg-red-600 rounded-xl text-white shadow-xl disabled:opacity-0 transition-opacity active:scale-90"
                                >
                                    <SendIcon className="w-5 h-5" />
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            </div>

            {/* Mobile Bottom Input Stickier */}
            <div className="md:hidden fixed bottom-2 bg-black/95 border-t border-white/10 p-4 z-[120] backdrop-blur-3xl w-[calc(100%-24px)] mx-3 rounded-[1.8rem] shadow-2xl">
                {isDynamicPost ? (
                    <form onSubmit={handlePostComment} className="relative w-full">
                        <input 
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            placeholder={isSignedIn ? "Add a comment..." : "Log in to comment"}
                            disabled={!isSignedIn}
                            className="w-full bg-white/5 border border-white/10 rounded-full py-3.5 pl-6 pr-14 text-xs text-white outline-none focus:border-red-600/50 transition-all font-medium" 
                        />
                        <button 
                            type="submit"
                            disabled={!newComment.trim()}
                            className="absolute right-1.5 top-1/2 -translate-y-1/2 p-2 bg-red-600 rounded-full text-white shadow-lg disabled:opacity-0 transition-opacity"
                        >
                            <SendIcon className="w-4 h-4" />
                        </button>
                    </form>
                ) : (
                    <div className="text-center py-2">
                        <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Portfolio View</p>
                    </div>
                )}
            </div>

            <AnimatePresence>
                {showShareToast && (
                    <motion.div initial={{opacity:0, y: 20}} animate={{opacity:1, y:0}} exit={{opacity:0}} className="fixed bottom-32 left-1/2 -translate-x-1/2 bg-white text-black px-8 py-3 rounded-full font-black uppercase text-[10px] tracking-widest shadow-2xl z-[5000001]">Link Copied</motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};


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
            <div className="flex gap-4">
                <img src={comment.userAvatar} className="w-8 h-8 rounded-lg object-cover border border-white/10 flex-shrink-0" alt="" />
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-[11px] font-black text-white uppercase tracking-tight">@{comment.userName}</span>
                        <span className="text-[7px] text-zinc-700 font-bold uppercase">{new Date(comment.timestamp).toLocaleDateString()}</span>
                        {comment.userId === postOwnerId && <span className="text-[6px] bg-red-600/20 text-red-500 px-1 rounded font-black border border-red-600/30">AUTHOR</span>}
                    </div>
                    <p className="text-zinc-400 text-xs leading-relaxed break-words poppins-font">{comment.text}</p>
                    <div className="mt-2 flex items-center gap-4">
                        {!isReply && (
                            <button onClick={() => setIsReplying(!isReplying)} className="text-[8px] font-black text-zinc-600 hover:text-white uppercase tracking-widest transition-colors">Reply</button>
                        )}
                        <button onClick={handleLikeComment} className={`flex items-center gap-1.5 transition-all ${isLikedByOwner ? 'text-red-500' : 'text-zinc-600 hover:text-red-500'}`}>
                            <i className={`fa-${isLikedByOwner ? 'solid' : 'regular'} fa-heart text-[10px]`}></i>
                            {likesCount > 0 && <span className="text-[8px] font-black">{likesCount}</span>}
                        </button>
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
                        className="ml-12 relative"
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
                <div className="ml-12 space-y-4 pt-2">
                    <button onClick={() => setShowReplies(!showReplies)} className="flex items-center gap-2 text-[8px] font-black text-zinc-600 hover:text-zinc-400 uppercase tracking-widest group">
                        <span className="w-8 h-[1px] bg-zinc-800 group-hover:bg-zinc-600 transition-colors"></span>
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
        if (commentsSectionRef.current) {
            commentsSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
        setTimeout(() => commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    };

    return (
        <div className="fixed inset-0 bg-black z-[9999] flex flex-col md:flex-row animate-fade-in overflow-hidden">
            <div className="absolute inset-0 bg-cover bg-center filter blur-2xl brightness-[0.1] opacity-60 scale-110 pointer-events-none" 
                 style={{ backgroundImage: `url(${getImageUrl() || siteConfig.branding.profilePicUrl})` }} />

            <div className="relative flex-1 flex flex-col min-w-0 bg-black/40 overflow-hidden">
                {/* Unified Header for both Mobile and Desktop */}
                <div className="relative z-[100] flex justify-between items-center p-4 md:p-6 bg-gradient-to-b from-black/80 to-transparent flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <img src={(currentItem as any).userAvatar || siteConfig.branding.logoUrl} className="w-8 h-8 md:w-10 md:h-10 rounded-full border border-white/20 object-cover" alt="" />
                        <div className="flex flex-col">
                            <span className="text-white font-black text-[10px] md:text-xs uppercase tracking-tight">@{(currentItem as any).userName || 'selectedlegend'}</span>
                            <span className="text-zinc-500 font-bold text-[7px] md:text-[8px] uppercase tracking-widest">{(currentItem as any).category || (currentItem as any).userRole || 'Visual Artist'}</span>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-white p-2 rounded-full bg-white/5 border border-white/10 hover:bg-red-600 transition-all">
                        <CloseIcon className="h-5 w-5" />
                    </button>
                </div>

                <div className="flex-1 relative flex items-center justify-center overflow-hidden">
                    <div className="relative w-full h-full flex items-center justify-center p-2 md:p-4" onClick={onClose}>
                        <div className="relative w-full h-full flex items-center justify-center" onClick={e => e.stopPropagation()}>
                            {isImage(currentItem) ? (
                                <img src={getImageUrl()} className="max-w-full max-h-full object-contain shadow-2xl animate-fade-in pointer-events-none" alt="" />
                            ) : isVideo(currentItem) ? (
                                <div className="w-full h-full flex items-center justify-center">
                                    <div className="w-full h-full max-w-5xl aspect-video bg-black rounded-xl shadow-2xl overflow-hidden border border-white/5 flex items-center justify-center">
                                        {getVideoUrl() ? (
                                            <video src={getVideoUrl()} controls autoPlay className="max-w-full max-h-full object-contain" />
                                        ) : (
                                            <iframe src={`https://www.youtube.com/embed/${(currentItem as any).videoId}?autoplay=1`} className="w-full h-full border-0" allowFullScreen></iframe>
                                        )}
                                    </div>
                                </div>
                            ) : null}

                            <button onClick={(e) => { e.stopPropagation(); onPrev((currentIndex - 1 + items.length) % items.length); }} className="absolute left-0 md:-left-16 top-1/2 -translate-y-1/2 text-white/40 hover:text-white p-2 md:p-4 transition-all">
                                <ChevronLeftIcon className="w-8 h-8 md:w-12 md:h-12" />
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); onNext((currentIndex + 1) % items.length); }} className="absolute right-0 md:-right-16 top-1/2 -translate-y-1/2 text-white/40 hover:text-white p-2 md:p-4 transition-all">
                                <ChevronRightIcon className="w-8 h-8 md:w-12 md:h-12" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Mobile Caption Bar - Simplified for Insta-style */}
                <div className="md:hidden px-4 py-3 bg-black/80 border-t border-white/5 backdrop-blur-xl flex-shrink-0">
                    <h3 className="text-white font-black text-sm uppercase truncate">{(currentItem as any).title || 'Masterwork'}</h3>
                    <p className="text-zinc-500 text-[10px] mt-1 line-clamp-1 italic">{(currentItem as any).caption || (currentItem as any).description || 'No description provided.'}</p>
                </div>
            </div>

            <div className="w-full md:w-[400px] lg:w-[450px] bg-[#080808] border-l border-white/5 flex flex-col flex-shrink-0 z-[110] h-full overflow-hidden">
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

                <div ref={scrollContainerRef} className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8 no-scrollbar">
                    <div className="space-y-4">
                        <h3 className="text-white font-black text-xl lg:text-2xl uppercase tracking-tighter">{(currentItem as any).title || 'Masterwork'}</h3>
                        <p className="text-zinc-400 text-sm leading-relaxed poppins-font">{(currentItem as any).caption || (currentItem as any).description || 'No description provided.'}</p>
                        {isDynamicPost && (currentItem as any).tags && (
                            <div className="flex flex-wrap gap-2">
                                {(currentItem as any).tags.map((tag: string, i: number) => (
                                    <span key={i} className="px-2 py-0.5 bg-white/5 border border-white/5 rounded text-[8px] font-black text-zinc-500 uppercase tracking-widest">#{tag}</span>
                                ))}
                            </div>
                        )}
                    </div>

                    <div ref={commentsSectionRef} className="pt-8 border-t border-white/5 space-y-6">
                        <div className="flex items-center justify-between">
                            <h4 className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.3em]">Comments</h4>
                            <span className="text-[10px] font-black text-zinc-700 uppercase">{comments.length} Signals</span>
                        </div>
                        
                        {comments.length === 0 ? (
                            <div className="py-20 text-center opacity-20">
                                <ChatBubbleIcon className="w-12 h-12 mx-auto mb-4" />
                                <p className="text-[9px] font-black uppercase tracking-[0.4em]">No comments yet</p>
                            </div>
                        ) : (
                            <div className="space-y-8">
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

                <div className="p-6 bg-black/40 border-t border-white/5 space-y-6 backdrop-blur-3xl flex-shrink-0">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-6">
                            <button onClick={handleLike} className={`flex items-center gap-2 transition-all ${isLiked ? 'text-red-500 scale-110' : 'text-zinc-600 hover:text-white'}`}>
                                <i className={`fa-${isLiked ? 'solid' : 'regular'} fa-heart text-xl`}></i>
                                <span className="text-xs font-black uppercase tracking-widest">{Object.keys(likes).length}</span>
                            </button>
                            <button onClick={handleScrollToComments} className="flex items-center gap-2 text-zinc-600 hover:text-white transition-colors">
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
                                placeholder={isSignedIn ? "Add a comment..." : "Log in to comment"}
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
                    <motion.div initial={{opacity:0, y: 20}} animate={{opacity:1, y:0}} exit={{opacity:0}} className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-white text-black px-8 py-3 rounded-full font-black uppercase text-[10px] tracking-widest shadow-2xl z-[200]">Link Copied</motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

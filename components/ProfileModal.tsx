

import React, { useMemo, useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUser } from '@clerk/clerk-react';
import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getDatabase, ref, update, onValue, set, remove, push, query, orderByChild, equalTo, get } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';
import { 
  CloseIcon, GlobeAltIcon, ChevronLeftIcon, InstagramIcon, FacebookIcon, 
  YouTubeIcon, TikTokIcon, BehanceIcon, GalleryIcon, CopyIcon,
  ChatBubbleIcon, EyeIcon, UserCircleIcon, BriefcaseIcon, SparklesIcon, LockIcon
} from './Icons';
import { siteConfig } from '../config';
import { Lock, ShieldCheck, KeyRound, ArrowRight, AlertTriangle, ShieldAlert, Clock } from 'lucide-react';

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

const NETWORK_CONFIGS: Record<string, { icon: any; baseUrl: string }> = {
    'Facebook': { icon: FacebookIcon, baseUrl: 'https://facebook.com/' },
    'Instagram': { icon: InstagramIcon, baseUrl: 'https://instagram.com/' },
    'YouTube': { icon: YouTubeIcon, baseUrl: 'https://youtube.com/@' },
    'TikTok': { icon: TikTokIcon, baseUrl: 'https://tiktok.com/@' },
    'Behance': { icon: BehanceIcon, baseUrl: 'https://behance.net/' }
};

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  viewingUserId?: string | null;
  onOpenModal?: (items: any[], index: number) => void;
  onMessageUser?: (userId: string) => void;
  onShowProfile?: (userId: string, username?: string) => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose, viewingUserId, onOpenModal, onMessageUser, onShowProfile }) => {
    const { user: clerkUser, isLoaded } = useUser();
    const [targetUser, setTargetUser] = useState<any>(null);
    const [userPosts, setUserPosts] = useState<any[]>([]);
    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState<any>({});
    const [userListMode, setUserListMode] = useState<'followers' | 'following' | null>(null);
    const [resolvedUserList, setResolvedUserList] = useState<any[]>([]);
    const [showCopyToast, setShowCopyToast] = useState(false);
    const [showSecurity, setShowSecurity] = useState(false);
    const [lockCountdown, setLockCountdown] = useState<string | null>(null);
    
    const [socialState, setSocialState] = useState({ 
      isFollowing: false, 
      friendStatus: 'none', 
      followers: [] as string[], 
      following: [] as string[] 
    });

    const currentProfileId = viewingUserId || clerkUser?.id;
    const isMyOwnProfile = clerkUser?.id === currentProfileId;
    const isViewingOther = !!viewingUserId && !isMyOwnProfile;

    const isJiya = targetUser?.username?.toLowerCase() === RESTRICTED_HANDLE;
    const isOwner = clerkUser?.username?.toLowerCase() === OWNER_HANDLE;
    const isAdmin = clerkUser?.username?.toLowerCase() === ADMIN_HANDLE;
    const hasAccessToJiya = isOwner;

    useEffect(() => {
        if (isOpen && currentProfileId) {
            const userRef = ref(db, `users/${currentProfileId}`);
            const unsubUser = onValue(userRef, (snap) => {
                const data = snap.val() || {};
                setTargetUser(data);
                const initializedData = {
                    ...data,
                    profile: {
                        bio: 'New member.',
                        origin: 'Location not set',
                        profession: 'Designer',
                        skills: ['Visual Effects', 'Graphic Design'],
                        networks: [
                            { name: 'Facebook', handle: '' }, { name: 'Instagram', handle: '' },
                            { name: 'YouTube', handle: '' }, { name: 'TikTok', handle: '' }, { name: 'Behance', handle: '' }
                        ],
                        ...data.profile
                    }
                };
                if (!isEditing) setEditData(initializedData);
            });

            if (!isJiya || hasAccessToJiya) {
                const unsubFollowers = onValue(ref(db, `social/${currentProfileId}/followers`), (snap) => {
                  setSocialState(prev => ({ ...prev, followers: snap.exists() ? Object.keys(snap.val()) : [] }));
                });
                const unsubFollowing = onValue(ref(db, `social/${currentProfileId}/following`), (snap) => {
                  setSocialState(prev => ({ ...prev, following: snap.exists() ? Object.keys(snap.val()) : [] }));
                });

                const postsQuery = query(ref(db, 'explore_posts'), orderByChild('userId'), equalTo(currentProfileId));
                const unsubPosts = onValue(postsQuery, (snap) => {
                    const data = snap.val();
                    if (data) {
                        const list = Object.entries(data).map(([id, val]: [string, any]) => ({ id, ...val }))
                            .sort((a, b) => a.timestamp - b.timestamp);
                        setUserPosts(list);
                    } else {
                        setUserPosts([]);
                    }
                });

                return () => { unsubUser(); unsubFollowers(); unsubFollowing(); unsubPosts(); };
            }

            return () => { unsubUser(); };
        }
    }, [isOpen, currentProfileId, isEditing, isJiya, hasAccessToJiya]);

    useEffect(() => {
        if (!targetUser?.lockedUntil) {
            setLockCountdown(null);
            return;
        }

        const interval = setInterval(() => {
            const now = Date.now();
            const diff = targetUser.lockedUntil - now;
            if (diff <= 0) {
                setLockCountdown(null);
                clearInterval(interval);
                return;
            }

            const h = Math.floor(diff / 3600000);
            const m = Math.floor((diff % 3600000) / 60000);
            const s = Math.floor((diff % 60000) / 1000);
            setLockCountdown(`${h}h ${m}m ${s}s`);
        }, 1000);

        return () => clearInterval(interval);
    }, [targetUser?.lockedUntil]);

    useEffect(() => {
        if (userListMode && isOpen) {
            const listIds = userListMode === 'followers' ? socialState.followers : socialState.following;
            const fetchList = async () => {
                const results = await Promise.all(listIds.map(async (id) => {
                    const snap = await get(ref(db, `users/${id}`));
                    return { id, ...snap.val() };
                }));
                setResolvedUserList(results);
            };
            fetchList();
        }
    }, [userListMode, socialState.followers, socialState.following, isOpen]);

    useEffect(() => {
        if (!isViewingOther || !clerkUser || !viewingUserId) return;
        if (isJiya && !hasAccessToJiya) return;

        const unsubFol = onValue(ref(db, `social/${clerkUser.id}/following/${viewingUserId}`), (snap) => {
            setSocialState(prev => ({ ...prev, isFollowing: snap.exists() }));
        });

        const friendsRef = ref(db, `social/${clerkUser.id}/friends/${viewingUserId}`);
        const sentRequestRef = ref(db, `social/${clerkUser.id}/requests/sent/${viewingUserId}`);
        const receivedRequestRef = ref(db, `social/${clerkUser.id}/requests/received/${viewingUserId}`);

        const unsubFriends = onValue(friendsRef, (sFriends) => {
            if (sFriends.exists()) {
                setSocialState(prev => ({ ...prev, friendStatus: 'accepted' }));
            } else {
                onValue(sentRequestRef, (sSent) => {
                    if (sSent.exists()) {
                        setSocialState(prev => ({ ...prev, friendStatus: 'requested' }));
                    } else {
                        onValue(receivedRequestRef, (sRec) => {
                            if (sRec.exists()) {
                                setSocialState(prev => ({ ...prev, friendStatus: 'pending' }));
                            } else {
                                setSocialState(prev => ({ ...prev, friendStatus: 'none' }));
                            }
                        });
                    }
                });
            }
        });

        return () => { unsubFol(); unsubFriends(); };
    }, [isViewingOther, clerkUser, viewingUserId, isJiya, hasAccessToJiya]);

    const handleAction = async (type: 'follow' | 'friend') => {
        if (!clerkUser || !viewingUserId) return;
        if (type === 'follow') {
            const path = `social/${clerkUser.id}/following/${viewingUserId}`;
            const fPath = `social/${viewingUserId}/followers/${clerkUser.id}`;
            if (socialState.isFollowing) {
                await remove(ref(db, path));
                await remove(ref(fPath));
            } else {
                await set(ref(db, path), true);
                await set(ref(fPath), true);
                await push(ref(db, `notifications/${viewingUserId}`), { 
                    type: 'follow', fromId: clerkUser.id, fromName: (clerkUser.username || clerkUser.fullName || '').toLowerCase(), fromAvatar: clerkUser.imageUrl, timestamp: Date.now(), read: false 
                });
            }
        } else {
            if (socialState.friendStatus === 'accepted') {
                if (window.confirm(`Unfriend @${(targetUser?.username || '').toLowerCase()}?`)) {
                    await remove(ref(db, `social/${clerkUser.id}/friends/${viewingUserId}`));
                    await remove(ref(db, `social/${viewingUserId}/friends/${clerkUser.id}`));
                    await remove(ref(db, `social/${clerkUser.id}/requests/sent/${viewingUserId}`));
                    await remove(ref(db, `social/${viewingUserId}/requests/received/${clerkUser.id}`));
                }
            } else if (socialState.friendStatus === 'pending') {
                await remove(ref(db, `social/${clerkUser.id}/requests/received/${viewingUserId}`));
                await remove(ref(db, `social/${targetUser.id}/requests/sent/${clerkUser.id}`));
                await set(ref(db, `social/${clerkUser.id}/friends/${viewingUserId}`), true);
                await set(ref(db, `social/${viewingUserId}/friends/${clerkUser.id}`), true);
                await push(ref(db, `notifications/${viewingUserId}`), { 
                    type: 'friend_accepted', fromId: clerkUser.id, fromName: (clerkUser.username || clerkUser.fullName || '').toLowerCase(), fromAvatar: clerkUser.imageUrl, timestamp: Date.now(), read: false 
                });
            } else if (socialState.friendStatus === 'requested') {
                if (window.confirm("Cancel friend request?")) {
                    await remove(ref(db, `social/${clerkUser.id}/requests/sent/${viewingUserId}`));
                    await remove(ref(db, `social/${viewingUserId}/requests/received/${clerkUser.id}`));
                }
            } else if (socialState.friendStatus === 'none') {
                await set(ref(db, `social/${clerkUser.id}/requests/sent/${viewingUserId}`), { timestamp: Date.now() });
                await set(ref(viewingUserId ? db : null, `social/${viewingUserId}/requests/received/${clerkUser.id}`), { timestamp: Date.now() });
                await push(ref(db, `notifications/${viewingUserId}`), { 
                    type: 'friend_request', fromId: clerkUser.id, fromName: (clerkUser.username || clerkUser.fullName || '').toLowerCase(), fromAvatar: clerkUser.imageUrl, timestamp: Date.now(), read: false 
                });
            }
        }
    };

    const handleSaveProfile = async () => {
        if (isMyOwnProfile) {
            await update(ref(db, `users/${clerkUser?.id}`), editData);
            setIsEditing(false);
        }
    };

    const handleCopyProfileLink = () => {
        const username = (targetUser?.username || clerkUser?.username || currentProfileId).toLowerCase();
        const url = `${window.location.origin}/@${username}`;
        navigator.clipboard.writeText(url);
        setShowCopyToast(true);
        setTimeout(() => setShowCopyToast(false), 2000);
    };

    const handleSwitchToOtherProfile = (id: string, username: string) => {
        onShowProfile?.(id, username.toLowerCase());
        setUserListMode(null);
    };

    const handleResetPasscode = async () => {
        if (!clerkUser) return;
        const current = targetUser?.chat_passcode;
        if (current) {
            const old = prompt("Enter previous 4-digit passcode:");
            if (old !== current) { alert("Incorrect previous passcode."); return; }
        }
        const next = prompt("Enter new 4-digit passcode:");
        if (next && next.length === 4 && /^\d+$/.test(next)) {
            await set(ref(db, `users/${clerkUser.id}/chat_passcode`), next);
            alert("Passcode updated successfully.");
        } else {
            alert("Invalid passcode. Must be 4 digits.");
        }
    };

    const handleAdminAction = async () => {
        if (!isOwner && !isAdmin) return;
        const action = prompt("ADMIN CONSOLE: (1) Lock Account (2) Add Warning (3) Clear All");
        if (action === '1') {
            const hours = prompt("Lock for how many hours?");
            if (hours) {
                const expiry = Date.now() + (parseInt(hours) * 3600000);
                await update(ref(db, `users/${currentProfileId}`), { lockedUntil: expiry });
                await push(ref(db, `notifications/${currentProfileId}`), {
                    type: 'security_alert',
                    text: `CRITICAL: Your account has been locked for ${hours} hours by the moderation team.`,
                    timestamp: Date.now(),
                    read: false,
                    fromName: 'Security Hub'
                });
                alert("Account locked.");
            }
        } else if (action === '2') {
            const msg = prompt("Enter warning message:");
            if (msg) {
                await update(ref(db, `users/${currentProfileId}`), { 
                    warning: { message: msg, timestamp: Date.now() } 
                });
                await push(ref(db, `notifications/${currentProfileId}`), {
                    type: 'security_warning',
                    text: `WARNING: You have received a formal warning: "${msg}". Please follow community guidelines.`,
                    timestamp: Date.now(),
                    read: false,
                    fromName: 'Moderation'
                });
                alert("Warning added.");
            }
        } else if (action === '3') {
            await update(ref(db, `users/${currentProfileId}`), { lockedUntil: null, warning: null });
            await push(ref(db, `notifications/${currentProfileId}`), {
                type: 'security_info',
                text: `NOTICE: All restrictions on your account have been lifted.`,
                timestamp: Date.now(),
                read: false,
                fromName: 'System'
            });
            alert("Statuses cleared.");
        }
    };

    const getVerifiedBadge = (u: string) => {
        const low = u?.toLowerCase();
        const delay = (u?.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % 60);
        if (low === OWNER_HANDLE) return <i style={{ animationDelay: `-${delay}s` }} className="fa-solid fa-circle-check text-red-600 ml-1.5 text-sm md:text-lg fez-verified-badge"></i>;
        if (low === ADMIN_HANDLE) return <i style={{ animationDelay: `-${delay}s` }} className="fa-solid fa-circle-check text-blue-500 ml-1.5 text-sm md:text-lg fez-verified-badge"></i>;
        return null;
    };

    if (!isLoaded || !clerkUser || !isOpen) return null;

    if (isJiya && !hasAccessToJiya) {
        return (
            <AnimatePresence>
                <div className="fixed inset-0 z-[4000000] flex items-center justify-center">
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/98 backdrop-blur-3xl" />
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full h-full bg-[#050505] flex flex-col items-center justify-center p-10 text-center">
                        <button onClick={onClose} className="absolute top-8 right-8 p-3 bg-white/5 rounded-full text-white hover:bg-red-600 transition-all"><CloseIcon className="w-6 h-6" /></button>
                        <div className="w-32 h-32 md:w-48 md:h-48 rounded-[3rem] border-4 border-white/5 p-1 mb-8">
                            <img src={targetUser?.avatar} className="w-full h-full object-cover rounded-[2.8rem] opacity-30 grayscale" alt="" />
                        </div>
                        <div className="flex items-center gap-2 mb-4">
                            <h2 className="text-3xl font-black text-white uppercase tracking-tighter">@{targetUser?.username?.toLowerCase()}</h2>
                        </div>
                        <div className="bg-red-600/10 border border-red-600/30 p-8 rounded-[2.5rem] max-w-sm w-full">
                            <Lock className="w-10 h-10 text-red-600 mx-auto mb-4" />
                            <h3 className="text-white font-black uppercase tracking-widest text-sm mb-2">Private Account</h3>
                            <p className="text-zinc-500 text-xs leading-relaxed">Only @fuadeditingzone has authorization to view this profile and its content.</p>
                        </div>
                    </motion.div>
                </div>
            </AnimatePresence>
        );
    }

    const isLocked = targetUser?.lockedUntil && targetUser.lockedUntil > Date.now();
    const hasWarning = !!targetUser?.warning;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[4000000] flex items-center justify-center">
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/98 backdrop-blur-3xl" />
                <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 30 }} className="relative w-full h-full bg-[#050505] border-0 flex flex-col overflow-hidden shadow-2xl">
                    
                    <div className="p-5 md:p-8 flex items-center justify-between border-b border-white/5 bg-black/40 backdrop-blur-xl flex-shrink-0">
                        <div className="flex items-center gap-4">
                            <button onClick={() => { if (userListMode) setUserListMode(null); else if (showSecurity) setShowSecurity(false); else onClose(); }} className="p-3 rounded-full hover:bg-white/5 transition-all text-white"><ChevronLeftIcon className="w-6 h-6" /></button>
                            <div className="flex items-center">
                                <h2 className="text-base md:text-xl font-black text-white uppercase tracking-widest truncate max-w-[200px]">
                                    {showSecurity ? 'Privacy & Security' : (targetUser?.username || clerkUser.username || '').toLowerCase()}
                                </h2>
                                {!showSecurity && getVerifiedBadge(targetUser?.username || clerkUser.username)}
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            {(isOwner || isAdmin) && !isMyOwnProfile && (
                                <button onClick={handleAdminAction} className="p-2.5 bg-yellow-600/10 rounded-xl border border-yellow-600/20 text-yellow-500 hover:bg-yellow-600 hover:text-white transition-all"><ShieldAlert size={20} /></button>
                            )}
                            {!showSecurity && isMyOwnProfile && (
                                <button onClick={() => setShowSecurity(true)} className="p-2.5 bg-white/5 rounded-xl border border-white/10 text-zinc-400 hover:text-white transition-all"><ShieldCheck size={20} /></button>
                            )}
                            {isMyOwnProfile && !showSecurity && <button onClick={() => isEditing ? handleSaveProfile() : setIsEditing(true)} className={`px-5 py-2.5 rounded-xl font-black text-[10px] md:text-xs uppercase tracking-widest transition-all ${isEditing ? 'bg-green-600 text-white' : 'bg-white/5 text-zinc-400 hover:text-white border border-white/5'}`}>{isEditing ? 'Save Profile' : 'Edit Profile'}</button>}
                            <button onClick={onClose} className="p-2.5 bg-red-600 rounded-full text-white shadow-lg hover:scale-110 active:scale-95 transition-all"><CloseIcon className="w-6 h-6" /></button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar relative no-scrollbar">
                        {/* Global Status Banner */}
                        {isLocked && (
                            <div className="bg-red-600 text-white p-3 text-center flex items-center justify-center gap-6 shadow-lg sticky top-0 z-50">
                                <div className="flex items-center gap-2">
                                    <Lock size={16} className="animate-pulse" />
                                    <span className="text-[10px] md:text-xs font-black uppercase tracking-widest">Account Locked</span>
                                </div>
                                <div className="flex items-center gap-2 bg-black/20 px-3 py-1 rounded-lg">
                                    <Clock size={12} />
                                    <span className="text-[10px] md:text-xs font-black tabular-nums">{lockCountdown || 'EXPIRED'}</span>
                                </div>
                            </div>
                        )}

                        {hasWarning && (
                            <div className="bg-yellow-600/10 border-b border-yellow-600/30 p-4 text-center flex flex-col items-center justify-center gap-1 shadow-inner sticky top-0 z-40 backdrop-blur-md">
                                <div className="flex items-center gap-2 text-yellow-500">
                                    <AlertTriangle size={14} />
                                    <span className="text-[9px] font-black uppercase tracking-widest">Community Warning</span>
                                </div>
                                <p className="text-[11px] md:text-sm text-zinc-200 font-medium italic">"{targetUser.warning.message}"</p>
                            </div>
                        )}

                        {showSecurity ? (
                            <div className="p-8 md:p-16 max-w-2xl mx-auto space-y-10">
                                <div className="space-y-4">
                                    <h4 className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.3em] px-1">Passcode Protection</h4>
                                    <button 
                                        onClick={handleResetPasscode}
                                        className="w-full flex items-center justify-between p-6 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all group"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-2xl bg-red-600/10 flex items-center justify-center text-red-500 border border-red-600/20">
                                                <KeyRound size={24} />
                                            </div>
                                            <div className="text-left">
                                                <p className="text-sm font-black text-white uppercase tracking-widest">Chat Passcode</p>
                                                <p className="text-[10px] text-zinc-500 font-bold mt-1 uppercase tracking-tight">{targetUser?.chat_passcode ? 'Passcode is Active' : 'Not Set'}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="text-[9px] font-black text-red-500 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">Change</span>
                                            <ArrowRight size={16} className="text-zinc-600" />
                                        </div>
                                    </button>
                                </div>

                                <div className="space-y-4 pt-10 border-t border-white/5">
                                    <h4 className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.3em] px-1">System Security</h4>
                                    <div className="p-6 bg-red-600/5 border border-red-600/10 rounded-2xl">
                                        {/* Changed technical 'verification signal' to humanized 'verification code' */}
                                        <p className="text-[11px] text-zinc-400 leading-relaxed font-medium italic">
                                            "PASSCODE RECOVERY: If you lose your code, use the 'Forgot Passcode' option in the chat screen. A secure verification code will be broadcast to your Activity hub."
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ) : userListMode ? (
                            <div className="p-8 md:p-16 max-w-2xl mx-auto space-y-6">
                                <h3 className="text-2xl font-black text-white uppercase tracking-[0.2em] mb-10">{userListMode === 'followers' ? 'Followers' : 'Following'}</h3>
                                {resolvedUserList.length === 0 ? (
                                    <div className="py-20 text-center opacity-20"><UserCircleIcon className="w-20 h-20 mx-auto mb-6" /><p className="text-sm font-black uppercase tracking-[0.5em]">No users found</p></div>
                                ) : (
                                    resolvedUserList.map(u => (
                                        <div key={u.id} onClick={() => handleSwitchToOtherProfile(u.id, u.username)} className="flex items-center justify-between p-4 bg-white/10 border border-white/5 rounded-2xl cursor-pointer hover:bg-white/20 transition-all group">
                                            <div className="flex items-center gap-4">
                                                <img src={u.avatar} className="w-12 h-12 rounded-xl object-cover border border-white/10" alt="" />
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-1">
                                                        <p className="text-sm font-black text-white uppercase tracking-tight truncate">@{(u.username || '').toLowerCase()}</p>
                                                        {getVerifiedBadge(u.username)}
                                                    </div>
                                                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest truncate">{u.profile?.profession || 'Designer'}</p>
                                                </div>
                                            </div>
                                            <ChevronLeftIcon className="w-5 h-5 text-zinc-600 rotate-180 group-hover:text-red-500 transition-all" />
                                        </div>
                                    ))
                                )}
                            </div>
                        ) : (
                            <div className="p-8 md:p-16 max-w-5xl mx-auto space-y-8">
                                <div className="flex flex-col md:flex-row items-center gap-10 md:gap-16">
                                    <div className={`w-32 h-32 md:w-48 md:h-48 rounded-[2.5rem] md:rounded-[3.5rem] border-2 p-1.5 flex-shrink-0 transition-transform hover:scale-105 duration-500 ${targetUser?.username?.toLowerCase() === OWNER_HANDLE ? 'border-red-600 shadow-[0_0_30px_rgba(220,38,38,0.4)]' : targetUser?.username?.toLowerCase() === ADMIN_HANDLE ? 'border-blue-500 shadow-[0_0_30px_rgba(59,130,246,0.4)]' : 'border-white/10'}`}>
                                        <img src={targetUser?.avatar || clerkUser.imageUrl} className="w-full h-full object-cover rounded-[2.2rem] md:rounded-[3.2rem]" alt="" />
                                    </div>
                                    <div className="flex-1 text-center md:text-left">
                                        <div className="flex flex-col md:flex-row items-center gap-5 mb-5">
                                            <div className="flex items-center gap-2">
                                                <h3 className="text-2xl md:text-4xl font-black text-white tracking-tighter">@{(targetUser?.username || clerkUser.username || '').toLowerCase()}</h3>
                                                {getVerifiedBadge(targetUser?.username || clerkUser.username)}
                                            </div>
                                            <div className="flex gap-3">
                                                {isViewingOther ? (
                                                    <><button disabled={isLocked} onClick={() => handleAction('follow')} className={`px-6 py-2.5 rounded-xl font-black text-[10px] md:text-xs uppercase tracking-widest transition-all ${isLocked ? 'opacity-20 cursor-not-allowed grayscale' : (socialState.isFollowing ? 'bg-white/10 text-white border border-white/10 hover:text-red-500' : 'bg-red-600 text-white shadow-xl hover:bg-red-700')}`}>{socialState.isFollowing ? 'Following' : 'Follow'}</button>
                                                      <button disabled={isLocked} onClick={() => handleAction('friend')} className={`px-6 py-2.5 rounded-xl font-black text-[10px] md:text-xs uppercase tracking-widest transition-all ${isLocked ? 'opacity-20 cursor-not-allowed grayscale' : (socialState.friendStatus === 'accepted' ? 'bg-green-600/20 text-green-500 border border-green-600/30' : 'bg-white/5 border border-white/10 text-white hover:bg-white/10')}`}>{socialState.friendStatus === 'accepted' ? 'Friends' : socialState.friendStatus === 'pending' ? 'Accept?' : socialState.friendStatus === 'requested' ? 'Requested' : 'Add Friend'}</button>
                                                      <button disabled={isLocked} onClick={() => onMessageUser?.(viewingUserId!)} className={`p-2.5 bg-white/5 border border-white/10 rounded-xl font-bold text-white hover:bg-white/10 active:scale-95 transition-all ${isLocked ? 'opacity-20 cursor-not-allowed' : ''}`}><ChatBubbleIcon className="w-5 h-5" /></button></>
                                                ) : (!isEditing && <button onClick={() => setIsEditing(true)} className="px-6 py-2.5 bg-white/10 border border-white/10 rounded-xl font-black text-[10px] uppercase tracking-widest text-white hover:bg-white/20 transition-all">Edit Profile</button>)}
                                            </div>
                                        </div>
                                        <div className="flex justify-center md:justify-start gap-8 md:gap-12 mb-8">
                                            <div className="text-center md:text-left"><p className="text-xl md:text-3xl font-black text-white leading-none">{userPosts.length}</p><p className="text-[9px] md:text-[10px] text-zinc-500 uppercase font-black tracking-widest mt-1">Posts</p></div>
                                            <button onClick={() => setUserListMode('followers')} className="text-center md:text-left hover:opacity-80 transition-all group"><p className="text-xl md:text-3xl font-black text-white leading-none group-hover:text-red-500">{socialState.followers.length}</p><p className="text-[9px] md:text-[10px] text-zinc-500 uppercase font-black tracking-widest mt-1">Followers</p></button>
                                            <button onClick={() => setUserListMode('following')} className="text-center md:text-left hover:opacity-80 transition-all group"><p className="text-xl md:text-3xl font-black text-white leading-none group-hover:text-red-500">{socialState.following.length}</p><p className="text-[9px] md:text-[10px] text-zinc-500 uppercase font-black tracking-widest mt-1">Following</p></button>
                                        </div>
                                        <div className="space-y-4">
                                            {isEditing ? (
                                                <div className="space-y-4 max-w-lg">
                                                    <input value={editData.name || ''} onChange={e => setEditData({...editData, name: e.target.value})} placeholder="Display Name" className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white font-bold text-base md:text-lg outline-none focus:border-red-600" />
                                                    <textarea value={editData.profile?.bio || ''} onChange={e => setEditData({...editData, profile: {...editData.profile, bio: e.target.value}})} placeholder="About you..." className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-zinc-400 text-xs md:text-sm italic outline-none h-24 resize-none" />
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div className="relative"><GlobeAltIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600"/><input value={editData.profile?.origin} onChange={e => setEditData({...editData, profile: {...editData.profile, origin: e.target.value}})} placeholder="Location" className="w-full bg-black border border-white/10 pl-9 pr-4 py-2.5 rounded-xl text-xs text-white outline-none focus:border-red-600"/></div>
                                                        <div className="relative"><BriefcaseIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600"/><input value={editData.profile?.profession} onChange={e => setEditData({...editData, profile: {...editData.profile, profession: e.target.value}})} placeholder="Role" className="w-full bg-black border border-white/10 pl-9 pr-4 py-2.5 rounded-xl text-xs text-white outline-none focus:border-red-600"/></div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="space-y-3">
                                                  <p className="text-lg md:text-2xl font-black text-white uppercase tracking-tight leading-none">{targetUser?.name || clerkUser.fullName}</p>
                                                  <p className="text-zinc-400 text-sm md:text-lg font-medium italic leading-relaxed opacity-80">"{targetUser?.profile?.bio || 'Visual Artist & Designer.'}"</p>
                                                  
                                                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-6 gap-y-3 pt-2">
                                                      <div className="flex items-center gap-2 text-zinc-500">
                                                          <BriefcaseIcon className="w-4 h-4 text-red-600 opacity-60" />
                                                          <span className="text-[10px] md:text-xs font-black uppercase tracking-widest">{targetUser?.profile?.profession || 'Designer'}</span>
                                                      </div>
                                                      <div className="flex items-center gap-2 text-zinc-500">
                                                          <GlobeAltIcon className="w-4 h-4 text-red-600 opacity-60" />
                                                          <span className="text-[10px] md:text-xs font-black uppercase tracking-widest">{targetUser?.profile?.origin || 'Earth'}</span>
                                                      </div>
                                                  </div>

                                                  <div className="flex items-center justify-center md:justify-start gap-4 pt-3">
                                                      {(targetUser?.profile?.networks || []).map((net: any, i: number) => {
                                                          const cfg = NETWORK_CONFIGS[net.name] || { icon: GlobeAltIcon, baseUrl: '' };
                                                          return net.handle && (
                                                              <a key={i} href={`${cfg.baseUrl}${net.handle}`} target="_blank" rel="noopener noreferrer" title={net.name} className="p-2 bg-white/5 hover:bg-red-600/20 rounded-lg border border-white/5 transition-all text-zinc-400 hover:text-red-500">
                                                                  <cfg.icon className="w-4 h-4" />
                                                              </a>
                                                          );
                                                      })}
                                                  </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {isEditing && (
                                    <div className="bg-white/5 p-6 rounded-2xl border border-white/5 space-y-6 max-w-5xl mx-auto">
                                        <div className="flex justify-between items-center"><h4 className="text-[10px] md:text-xs font-black text-red-600 uppercase tracking-[0.3em]">Social Networks</h4><button onClick={() => { const name = window.prompt("Platform: Facebook, Instagram, YouTube, TikTok, Behance:"); if (name && NETWORK_CONFIGS[name]) setEditData({...editData, profile: {...editData.profile, networks: [...(editData.profile.networks || []), { name, handle: '' }]}}); }} className="text-[10px] text-zinc-500 hover:text-red-600 transition-colors">+ Add Platform</button></div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            {(editData.profile?.networks || []).map((net: any, i: number) => {
                                                const cfg = NETWORK_CONFIGS[net.name] || { icon: GlobeAltIcon, baseUrl: '' };
                                                return (
                                                    <div key={i} className="bg-black border border-white/10 rounded-xl p-3 flex items-center gap-3">
                                                        <cfg.icon className="w-5 h-5 text-zinc-500" />
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-[8px] text-zinc-600 font-black uppercase mb-1">{net.name}</p>
                                                            <input value={net.handle} onChange={e => { const n = [...editData.profile.networks]; n[i].handle = e.target.value.replace('@','').toLowerCase(); setEditData({...editData, profile: {...editData.profile, networks: n}}); }} className="bg-transparent text-sm text-white w-full outline-none font-bold" placeholder="username" />
                                                        </div>
                                                        <button onClick={() => setEditData({...editData, profile: {...editData.profile, networks: editData.profile.networks.filter((_:any,idx:number)=>idx!==i)}})} className="text-zinc-600 hover:text-red-600"><CloseIcon className="w-4 h-4"/></button>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-10 pt-12 border-t border-white/10">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <GalleryIcon className="w-6 h-6 text-zinc-600" />
                                            <h4 className="text-lg md:text-2xl font-black text-white uppercase tracking-[0.4em] font-display">Gallery</h4>
                                        </div>
                                        <div className="h-px bg-white/5 flex-1 mx-8 hidden md:block"></div>
                                        <span className="text-[10px] md:text-xs font-black text-zinc-600 uppercase tracking-widest">{userPosts.length} Posts</span>
                                    </div>
                                    <div className="columns-2 sm:columns-3 gap-3 md:gap-4 no-scrollbar">
                                        {userPosts.map((post, i) => (
                                            <div key={post.id || i} onClick={() => onOpenModal?.(userPosts, i)} className="break-inside-avoid mb-4 bg-white/[0.03] rounded-xl overflow-hidden group relative cursor-pointer border border-white/5 shadow-2xl transition-all duration-500">
                                                {post.mediaType === 'video' ? (
                                                    <video src={post.mediaUrl} className="w-full h-auto max-h-[500px] object-cover" muted loop autoPlay playsInline />
                                                ) : (
                                                    <img src={post.mediaUrl} className="w-full h-auto max-h-[600px] object-cover" alt="" />
                                                )}
                                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col items-center justify-center backdrop-blur-[2px]">
                                                    <div className="flex gap-8 text-sm font-black text-white uppercase tracking-widest scale-90 group-hover:scale-100 transition-all">
                                                        <span className="flex items-center gap-2 text-white"><i className="fa-solid fa-heart text-red-500 drop-shadow-[0_0_8px_rgba(220,38,38,0.5)]"></i> {Object.keys(post.likes || {}).length}</span>
                                                        <span className="flex items-center gap-2 text-white"><i className="fa-solid fa-comment text-white/50"></i> {Object.keys(post.comments || {}).length}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    {userPosts.length === 0 && (
                                        <div className="py-32 text-center opacity-20">
                                            <GalleryIcon className="w-16 h-16 mx-auto mb-6" />
                                            <p className="text-xs md:text-sm font-black uppercase tracking-[0.8em]">No posts yet</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Admin/System Bottom Tag */}
                    <div className="p-10 text-center opacity-30 mt-auto bg-black/40 border-t border-white/5">
                        <img src={siteConfig.branding.logoUrl} className="h-8 mx-auto grayscale invert mb-4" alt="" />
                        <p className="text-[8px] font-black uppercase tracking-[0.5em] text-white">Zone Protocol v4.0</p>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

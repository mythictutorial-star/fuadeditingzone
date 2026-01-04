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
import { Lock, ShieldCheck, KeyRound, ArrowRight, AlertTriangle, ShieldAlert, Clock, Palette, Plus, UserMinus, UserX } from 'lucide-react';

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

const BADGE_COLORS = [
    { name: 'Classic Red', hex: '#ef4444' },
    { name: 'Ocean Blue', hex: '#3b82f6' },
    { name: 'Neon Green', hex: '#22c55e' },
    { name: 'Luxury Gold', hex: '#eab308' },
    { name: 'Vibrant Purple', hex: '#a855f7' },
    { name: 'Deep Pink', hex: '#ec4899' },
    { name: 'Pure White', hex: '#ffffff' }
];

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
    const [showSecurity, setShowSecurity] = useState(false);
    const [lockCountdown, setLockCountdown] = useState<string | null>(null);
    const [isBadgePickerOpen, setIsBadgePickerOpen] = useState(false);
    
    const [socialState, setSocialState] = useState({ 
      isFollowing: false, 
      friendStatus: 'none', 
      followers: [] as string[], 
      following: [] as string[] 
    });

    const currentProfileId = viewingUserId || clerkUser?.id;
    const isMyOwnProfile = clerkUser?.id === currentProfileId;
    const isViewingOther = !!viewingUserId && !isMyOwnProfile;

    const targetUsername = (targetUser?.username || '').toLowerCase();
    const isJiya = targetUsername === RESTRICTED_HANDLE;
    const isOwner = clerkUser?.username?.toLowerCase() === OWNER_HANDLE;
    const isAdmin = clerkUser?.username?.toLowerCase() === ADMIN_HANDLE;
    const hasAccessToJiya = isOwner || clerkUser?.username?.toLowerCase() === RESTRICTED_HANDLE;

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
                            .sort((a, b) => b.timestamp - a.timestamp);
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

        // Relation modification: Unfollow/Unfriend requires identity check
        const myUserSnap = await get(ref(db, `users/${clerkUser.id}`));
        const myPasscode = myUserSnap.val()?.chat_passcode;
        const isRemoving = (type === 'follow' && socialState.isFollowing) || (type === 'friend' && socialState.friendStatus === 'accepted');

        if (isRemoving && myPasscode) {
            const code = prompt("Identity Check: Enter your 4-digit passcode to modify this relationship:");
            if (code === null) return;
            if (code !== myPasscode) {
                alert("Authorization Denied: Incorrect passcode.");
                return;
            }
        }

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
                    await remove(ref(db, `social/${clerkUser.id}/following/${viewingUserId}`));
                    await remove(ref(db, `social/${viewingUserId}/followers/${clerkUser.id}`));
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

    const handlePasscodeSetupOrChange = async () => {
        if (!clerkUser) return;
        const currentCode = targetUser?.chat_passcode;
        
        if (currentCode) {
            const shouldRelock = window.confirm("Security Alert: Hide locked profiles and conversations again?");
            if (shouldRelock) {
                alert("Vault Secured: Locked content is now hidden.");
                window.location.reload(); 
                return;
            }

            const old = prompt("Identity Check: Enter your current 4-digit passcode to modify settings:");
            if (old === null) return;
            if (old !== currentCode) { alert("Verification Denied: Incorrect current passcode."); return; }
        }

        const next = prompt(currentCode ? "Verification Approved. Enter your new 4-digit passcode:" : "Secure Vault: Setup a new 4-digit passcode for locked threads:");
        if (next && next.length === 4 && /^\d+$/.test(next)) {
            await set(ref(db, `users/${clerkUser.id}/chat_passcode`), next);
            alert("Security protocol updated: Passcode active.");
        } else if (next !== null) {
            alert("Invalid Input: Passcode must be exactly 4 digits.");
        }
    };

    // Define handleSwitchToOtherProfile to fix "Cannot find name" errors
    const handleSwitchToOtherProfile = (userId: string, username?: string) => {
        setUserListMode(null);
        onShowProfile?.(userId, username);
    };

    const getVerifiedBadge = (u: string, custom?: any) => {
        if (!u) return null;
        const low = u.toLowerCase();
        const vLow = clerkUser?.username?.toLowerCase();
        
        if (vLow === RESTRICTED_HANDLE && low === OWNER_HANDLE) {
            return <span className="ml-1.5 px-2 py-0.5 bg-red-600 text-white rounded text-[8px] font-black uppercase tracking-widest border border-white/20">Husband</span>;
        }
        if (vLow === OWNER_HANDLE && low === RESTRICTED_HANDLE) {
            return <span className="ml-1.5 px-2 py-0.5 bg-red-600 text-white rounded text-[8px] font-black uppercase tracking-widest border border-white/20">Wife</span>;
        }

        if (low === OWNER_HANDLE) return <i className="fa-solid fa-circle-check text-red-600 ml-1.5 text-sm md:text-lg fez-verified-badge"></i>;
        if (low === ADMIN_HANDLE) return <i className="fa-solid fa-circle-check text-blue-500 ml-1.5 text-sm md:text-lg fez-verified-badge"></i>;
        
        if (low === RESTRICTED_HANDLE && (vLow === OWNER_HANDLE || vLow === RESTRICTED_HANDLE)) {
            return (
                <span className="relative inline-flex items-center ml-1.5 fez-verified-badge">
                    <i className="fa-solid fa-circle-check text-red-600 text-sm md:text-lg"></i>
                    <i className="fa-solid fa-circle-check text-blue-500 text-[6px] md:text-[8px] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"></i>
                </span>
            );
        }

        if (custom?.active && custom?.color) {
            return <i className="fa-solid fa-circle-check ml-1.5 text-sm md:text-lg fez-verified-badge" style={{ color: custom.color }}></i>;
        }

        return null;
    };

    if (!isLoaded || !clerkUser || !isOpen) return null;

    const isLocked = targetUser?.lockedUntil && targetUser.lockedUntil > Date.now();
    const hasWarning = !!targetUser?.warning;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[4000000] flex items-center justify-center overflow-hidden">
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/98 backdrop-blur-3xl" />
                <motion.div 
                   initial={{ opacity: 0, y: 30 }} 
                   animate={{ opacity: 1, y: 0 }} 
                   exit={{ opacity: 0, y: 30 }} 
                   className="relative w-full h-full bg-[#050505] border-0 flex flex-col overflow-hidden shadow-2xl safe-area-padding"
                   style={{ paddingBottom: 'env(safe-area-inset-bottom)', paddingTop: 'env(safe-area-inset-top)' }}
                >
                    {/* Header */}
                    <div className="p-5 md:p-8 flex items-center justify-between border-b border-white/5 bg-black/40 backdrop-blur-xl flex-shrink-0">
                        <div className="flex items-center gap-4">
                            <button onClick={() => { if (userListMode) setUserListMode(null); else if (showSecurity) setShowSecurity(false); else onClose(); }} className="p-3 rounded-full hover:bg-white/5 transition-all text-white"><ChevronLeftIcon className="w-6 h-6" /></button>
                            <div className="flex items-center">
                                <h2 className="text-base md:text-xl font-black text-white uppercase tracking-widest truncate max-w-[200px]">
                                    {showSecurity ? 'Security Protocol' : (targetUser?.username || clerkUser.username || '').toLowerCase()}
                                </h2>
                                {!showSecurity && getVerifiedBadge(targetUser?.username || clerkUser.username, targetUser?.custom_badge)}
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            {!showSecurity && isMyOwnProfile && (
                                <button onClick={() => setShowSecurity(true)} className="p-2.5 bg-white/5 rounded-xl border border-white/10 text-zinc-400 hover:text-white transition-all"><ShieldCheck size={20} /></button>
                            )}
                            {isMyOwnProfile && !showSecurity && <button onClick={() => isEditing ? handleSaveProfile() : setIsEditing(true)} className={`px-5 py-2.5 rounded-xl font-black text-[10px] md:text-xs uppercase tracking-widest transition-all ${isEditing ? 'bg-green-600 text-white' : 'bg-white/5 text-zinc-400 hover:text-white border border-white/5'}`}>{isEditing ? 'Save Profile' : 'Edit Profile'}</button>}
                            <button onClick={onClose} className="p-2.5 bg-red-600 rounded-full text-white shadow-lg hover:scale-110 active:scale-95 transition-all"><CloseIcon className="w-6 h-6" /></button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar relative no-scrollbar pb-24 md:pb-12">
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

                        {showSecurity ? (
                            <div className="p-8 md:p-16 max-w-2xl mx-auto space-y-10">
                                <div className="space-y-0">
                                    <h4 className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.3em] px-1 mb-4">Vault Authentication</h4>
                                    {!targetUser?.chat_passcode && (
                                        <button onClick={handlePasscodeSetupOrChange} className="w-full flex items-center justify-between p-6 bg-red-600/5 border border-red-600/20 rounded-2xl hover:bg-red-600/10 transition-all group">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-2xl bg-red-600/10 flex items-center justify-center text-red-500 border border-red-600/20"><Plus size={24} /></div>
                                                <div className="text-left">
                                                    <p className="text-sm font-black text-white uppercase tracking-widest">Setup Vault Passcode</p>
                                                    <p className="text-[10px] text-zinc-500 font-bold mt-1 uppercase tracking-tight">Access Restricted Content</p>
                                                </div>
                                            </div>
                                            <ArrowRight size={16} className="text-zinc-600" />
                                        </button>
                                    )}
                                    {targetUser?.chat_passcode && (
                                        <button onClick={handlePasscodeSetupOrChange} className="w-full flex items-center justify-between p-6 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all group">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-2xl bg-red-600/10 flex items-center justify-center text-red-500 border border-red-600/20"><KeyRound size={24} /></div>
                                                <div className="text-left">
                                                    <p className="text-sm font-black text-white uppercase tracking-widest">Change Passcode</p>
                                                    <p className="text-[10px] text-zinc-500 font-bold mt-1 uppercase tracking-tight">Active Protection Layer</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="text-[9px] font-black text-red-500 uppercase tracking-widest">Manage</span>
                                                <ArrowRight size={16} className="text-zinc-600" />
                                            </div>
                                        </button>
                                    )}
                                </div>
                            </div>
                        ) : userListMode ? (
                            <div className="p-6 md:p-16 max-w-4xl mx-auto space-y-6">
                                <h3 className="text-2xl font-black text-white uppercase tracking-[0.2em] mb-10 text-center md:text-left">{userListMode === 'followers' ? 'Network Base' : 'Following Zone'}</h3>
                                {resolvedUserList.length === 0 ? (
                                    <div className="py-20 text-center opacity-20"><UserCircleIcon className="w-20 h-20 mx-auto mb-6" /><p className="text-sm font-black uppercase tracking-[0.5em]">Network Offline</p></div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {resolvedUserList.map(u => (
                                            <div key={u.id} className="flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-2xl group hover:bg-white/10 transition-all">
                                                <div className="flex items-center gap-4 cursor-pointer min-w-0" onClick={() => handleSwitchToOtherProfile(u.id, u.username)}>
                                                    <img src={u.avatar} className="w-14 h-14 rounded-full object-cover border border-white/10" alt="" />
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-1">
                                                            <p className="text-sm font-black text-white uppercase tracking-tight truncate">@{(u.username || '').toLowerCase()}</p>
                                                            {getVerifiedBadge(u.username, u.custom_badge)}
                                                        </div>
                                                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest truncate">{u.profile?.profession || 'Designer'}</p>
                                                    </div>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button onClick={() => onMessageUser?.(u.id)} className="p-3 bg-white/5 hover:bg-red-600 text-white rounded-xl transition-all"><ChatBubbleIcon className="w-4 h-4" /></button>
                                                    <button onClick={() => handleSwitchToOtherProfile(u.id, u.username)} className="p-3 bg-white/5 hover:bg-white/10 text-zinc-400 rounded-xl transition-all"><ArrowRight size={16} /></button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="p-8 md:p-16 max-w-5xl mx-auto space-y-8">
                                <div className="flex flex-col md:flex-row items-center gap-10 md:gap-16">
                                    <div className={`w-32 h-32 md:w-48 md:h-48 rounded-[2.5rem] md:rounded-[3.5rem] border-2 p-1.5 flex-shrink-0 transition-transform hover:scale-105 duration-500 ${targetUsername === OWNER_HANDLE ? 'border-red-600 shadow-[0_0_30px_rgba(220,38,38,0.4)]' : targetUsername === ADMIN_HANDLE ? 'border-blue-500 shadow-[0_0_30px_rgba(59,130,246,0.4)]' : 'border-white/10'}`}>
                                        <img src={targetUser?.avatar || clerkUser.imageUrl} className="w-full h-full object-cover rounded-[2.2rem] md:rounded-[3.2rem]" alt="" />
                                    </div>
                                    <div className="flex-1 text-center md:text-left">
                                        <div className="flex flex-col md:flex-row items-center gap-5 mb-5">
                                            <div className="flex items-center gap-2">
                                                <h3 className="text-2xl md:text-4xl font-black text-white tracking-tighter">@{(targetUser?.username || clerkUser.username || '').toLowerCase()}</h3>
                                                {getVerifiedBadge(targetUser?.username || clerkUser.username, targetUser?.custom_badge)}
                                            </div>
                                            <div className="flex gap-3">
                                                {isViewingOther ? (
                                                    <><AnimatePresence>
                                                        {socialState.friendStatus !== 'accepted' && (
                                                            <motion.button 
                                                                initial={{ opacity: 0, scale: 0.9 }} 
                                                                animate={{ opacity: 1, scale: 1 }} 
                                                                disabled={isLocked} 
                                                                onClick={() => handleAction('follow')} 
                                                                className={`px-6 py-2.5 rounded-xl font-black text-[10px] md:text-xs uppercase tracking-widest transition-all ${isLocked ? 'opacity-20 cursor-not-allowed grayscale' : (socialState.isFollowing ? 'bg-white/10 text-red-500 border border-red-600/30 hover:bg-red-600 hover:text-white' : 'bg-red-600 text-white shadow-xl hover:bg-red-700')}`}
                                                            >
                                                                {socialState.isFollowing ? 'Unfollow' : 'Follow'}
                                                            </motion.button>
                                                        )}
                                                      </AnimatePresence>
                                                      <button disabled={isLocked} onClick={() => handleAction('friend')} className={`px-6 py-2.5 rounded-xl font-black text-[10px] md:text-xs uppercase tracking-widest transition-all ${isLocked ? 'opacity-20 cursor-not-allowed grayscale' : (socialState.friendStatus === 'accepted' ? 'bg-zinc-800 text-zinc-500 hover:bg-red-600 hover:text-white' : 'bg-white/5 border border-white/10 text-white hover:bg-white/10')}`}>{socialState.friendStatus === 'accepted' ? 'Friends' : socialState.friendStatus === 'pending' ? 'Accept Request' : socialState.friendStatus === 'requested' ? 'Cancel Request' : 'Add Friend'}</button>
                                                      <button disabled={isLocked} onClick={() => onMessageUser?.(viewingUserId!)} className={`p-2.5 bg-white/5 border border-white/10 rounded-xl font-bold text-white hover:bg-white/10 active:scale-95 transition-all ${isLocked ? 'opacity-20 cursor-not-allowed' : ''}`}><ChatBubbleIcon className="w-5 h-5" /></button></>
                                                ) : (!isEditing && <button onClick={() => setIsEditing(true)} className="px-6 py-2.5 bg-white/10 border border-white/10 rounded-xl font-black text-[10px] uppercase tracking-widest text-white hover:bg-white/20 transition-all">Edit Identity</button>)}
                                            </div>
                                        </div>
                                        <div className="flex justify-center md:justify-start gap-8 md:gap-12 mb-8">
                                            <div className="text-center md:text-left"><p className="text-xl md:text-3xl font-black text-white leading-none">{userPosts.length}</p><p className="text-[9px] md:text-[10px] text-zinc-500 uppercase font-black tracking-widest mt-1">Works</p></div>
                                            <button onClick={() => setUserListMode('followers')} className="text-center md:text-left hover:opacity-80 transition-all group"><p className="text-xl md:text-3xl font-black text-white leading-none group-hover:text-red-500">{socialState.followers.length}</p><p className="text-[9px] md:text-[10px] text-zinc-500 uppercase font-black tracking-widest mt-1">Followers</p></button>
                                            <button onClick={() => setUserListMode('following')} className="text-center md:text-left hover:opacity-80 transition-all group"><p className="text-xl md:text-3xl font-black text-white leading-none group-hover:text-red-500">{socialState.following.length}</p><p className="text-[9px] md:text-[10px] text-zinc-500 uppercase font-black tracking-widest mt-1">Following</p></button>
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-10 pt-12 border-t border-white/10">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <GalleryIcon className="w-6 h-6 text-zinc-600" />
                                            <h4 className="text-lg md:text-2xl font-black text-white uppercase tracking-[0.4em] font-display">Artifacts</h4>
                                        </div>
                                        <span className="text-[10px] md:text-xs font-black text-zinc-600 uppercase tracking-widest">{userPosts.length} Entries</span>
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
                                                        <span className="flex items-center gap-2 text-white"><i className="fa-solid fa-heart text-red-500"></i> {Object.keys(post.likes || {}).length}</span>
                                                        <span className="flex items-center gap-2 text-white"><i className="fa-solid fa-comment text-white/50"></i> {Object.keys(post.comments || {}).length}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};
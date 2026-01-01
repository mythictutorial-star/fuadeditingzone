import React, { useMemo, useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUser } from '@clerk/clerk-react';
import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getDatabase, ref, update, onValue, set, remove, push, query, orderByChild, equalTo, get } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';
// Add missing ChatBubbleIcon and EyeIcon to imports
import { 
  CloseIcon, GlobeAltIcon, ChevronLeftIcon, InstagramIcon, FacebookIcon, 
  YouTubeIcon, TikTokIcon, BehanceIcon, GalleryIcon, CopyIcon,
  ChatBubbleIcon, EyeIcon
} from './Icons';
import { siteConfig } from '../config';

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
    
    const [socialState, setSocialState] = useState({ 
      isFollowing: false, 
      friendStatus: 'none', 
      followers: [] as string[], 
      following: [] as string[] 
    });

    const currentProfileId = viewingUserId || clerkUser?.id;
    const isMyOwnProfile = clerkUser?.id === currentProfileId;
    const isViewingOther = !!viewingUserId && !isMyOwnProfile;

    useEffect(() => {
        if (isOpen && currentProfileId) {
            const userRef = ref(db, `users/${currentProfileId}`);
            const unsubUser = onValue(userRef, (snap) => {
                const data = snap.val() || {};
                setTargetUser(data);
                const initializedData = {
                    ...data,
                    profile: {
                        bio: 'Identity synchronized.',
                        origin: 'Location Hidden',
                        profession: 'Visual Architecture',
                        skills: ['VFX Master', 'Graphic Design'],
                        networks: [
                            { name: 'Facebook', handle: '' }, { name: 'Instagram', handle: '' },
                            { name: 'YouTube', handle: '' }, { name: 'TikTok', handle: '' }, { name: 'Behance', handle: '' }
                        ],
                        ...data.profile
                    }
                };
                if (!isEditing) setEditData(initializedData);
            });

            const unsubFollowers = onValue(ref(db, `social/${currentProfileId}/followers`), (snap) => {
              setSocialState(prev => ({ ...prev, followers: snap.exists() ? Object.keys(snap.val()) : [] }));
            });
            const unsubFollowing = onValue(ref(db, `social/${currentProfileId}/following`), (snap) => {
              setSocialState(prev => ({ ...prev, following: snap.exists() ? Object.keys(snap.val()) : [] }));
            });

            const postsQuery = query(ref(db, 'explore_posts'), orderByChild('userId'), equalTo(currentProfileId));
            const unsubPosts = onValue(postsQuery, (snap) => {
                const data = snap.val();
                setUserPosts(data ? Object.values(data).sort((a: any, b: any) => b.timestamp - a.timestamp) : []);
            });

            return () => { unsubUser(); unsubFollowers(); unsubFollowing(); unsubPosts(); };
        }
    }, [isOpen, currentProfileId, isEditing]);

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
        const unsubFol = onValue(ref(db, `social/${clerkUser.id}/following/${viewingUserId}`), (snap) => setSocialState(prev => ({ ...prev, isFollowing: snap.exists() })));
        const unsubFri = onValue(ref(db, `social/${clerkUser.id}/friends/${viewingUserId}`), (snap) => {
            if (snap.exists()) setSocialState(prev => ({ ...prev, friendStatus: 'accepted' }));
            else {
              onValue(ref(db, `social/${clerkUser.id}/requests/sent/${viewingUserId}`), (s1) => {
                if (s1.exists()) setSocialState(prev => ({ ...prev, friendStatus: 'requested' }));
                else {
                    onValue(ref(db, `social/${clerkUser.id}/requests/received/${viewingUserId}`), (s2) => {
                        if (s2.exists()) setSocialState(prev => ({ ...prev, friendStatus: 'pending' }));
                        else setSocialState(prev => ({ ...prev, friendStatus: 'none' }));
                    });
                }
              });
            }
        });
        return () => { unsubFol(); unsubFri(); };
    }, [isViewingOther, clerkUser, viewingUserId]);

    const handleAction = async (type: 'follow' | 'friend') => {
        if (!clerkUser || !viewingUserId) return;
        if (type === 'follow') {
            const path = `social/${clerkUser.id}/following/${viewingUserId}`;
            const fPath = `social/${viewingUserId}/followers/${clerkUser.id}`;
            if (socialState.isFollowing) {
                await remove(ref(db, path));
                await remove(ref(db, `social/${viewingUserId}/followers/${clerkUser.id}`));
            } else {
                await set(ref(db, path), true);
                await set(ref(db, `social/${viewingUserId}/followers/${clerkUser.id}`), true);
                await push(ref(db, `notifications/${viewingUserId}`), { 
                    type: 'follow', fromId: clerkUser.id, fromName: clerkUser.username || clerkUser.fullName, fromAvatar: clerkUser.imageUrl, timestamp: Date.now(), read: false 
                });
            }
        } else {
            if (socialState.friendStatus === 'accepted') {
                if (window.confirm(`Unfriend @${targetUser?.username}?`)) {
                    await remove(ref(db, `social/${clerkUser.id}/friends/${viewingUserId}`));
                    await remove(ref(db, `social/${viewingUserId}/friends/${clerkUser.id}`));
                }
            } else if (socialState.friendStatus === 'pending') {
                await remove(ref(db, `social/${clerkUser.id}/requests/received/${viewingUserId}`));
                await remove(ref(db, `social/${viewingUserId}/requests/sent/${clerkUser.id}`));
                await set(ref(db, `social/${clerkUser.id}/friends/${viewingUserId}`), true);
                await set(ref(db, `social/${viewingUserId}/friends/${clerkUser.id}`), true);
                await push(ref(db, `notifications/${viewingUserId}`), { 
                    type: 'friend_accepted', fromId: clerkUser.id, fromName: clerkUser.username || clerkUser.fullName, fromAvatar: clerkUser.imageUrl, timestamp: Date.now(), read: false 
                });
            } else if (socialState.friendStatus === 'none') {
                await set(ref(db, `social/${clerkUser.id}/requests/sent/${viewingUserId}`), { timestamp: Date.now() });
                await set(ref(db, `social/${viewingUserId}/requests/received/${clerkUser.id}`), { timestamp: Date.now() });
                await push(ref(db, `notifications/${viewingUserId}`), { 
                    type: 'friend_request', fromId: clerkUser.id, fromName: clerkUser.username || clerkUser.fullName, fromAvatar: clerkUser.imageUrl, timestamp: Date.now(), read: false 
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
        const username = targetUser?.username || clerkUser?.username || currentProfileId;
        const url = `${window.location.origin}/@${username}`;
        navigator.clipboard.writeText(url);
        setShowCopyToast(true);
        setTimeout(() => setShowCopyToast(false), 2000);
    };

    const handleSwitchToOtherProfile = (id: string, username: string) => {
        onShowProfile?.(id, username);
        setUserListMode(null);
    };

    const getVerifiedBadge = (u: string) => (u === OWNER_HANDLE ? <i className="fa-solid fa-circle-check text-red-600 ml-1.5 text-sm md:text-lg"></i> : u === ADMIN_HANDLE ? <i className="fa-solid fa-circle-check text-blue-500 ml-1.5 text-sm md:text-lg"></i> : null);

    if (!isLoaded || !clerkUser || !isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[2000000] flex items-center justify-center">
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/98 backdrop-blur-3xl" />
                <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 30 }} className="relative w-full h-full bg-[#050505] border-0 flex flex-col overflow-hidden shadow-2xl">
                    
                    <div className="p-5 md:p-8 flex items-center justify-between border-b border-white/5 bg-black/40 backdrop-blur-xl flex-shrink-0">
                        <div className="flex items-center gap-4">
                            <button onClick={() => userListMode ? setUserListMode(null) : onClose()} className="p-3 rounded-full hover:bg-white/5 transition-all text-white"><ChevronLeftIcon className="w-6 h-6" /></button>
                            <div className="flex items-center">
                                <h2 className="text-base md:text-xl font-black text-white uppercase tracking-widest truncate max-w-[200px]">{targetUser?.username || clerkUser.username}</h2>
                                {getVerifiedBadge(targetUser?.username || clerkUser.username)}
                                <button onClick={handleCopyProfileLink} className="ml-4 p-2.5 bg-white/5 hover:bg-red-600/20 rounded-xl text-zinc-500 hover:text-red-500 transition-all border border-white/5" title="Copy Protocol URL">
                                    <CopyIcon className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            {isMyOwnProfile && <button onClick={() => isEditing ? handleSaveProfile() : setIsEditing(true)} className={`px-5 py-2.5 rounded-xl font-black text-[10px] md:text-xs uppercase tracking-widest transition-all ${isEditing ? 'bg-green-600 text-white' : 'bg-white/5 text-zinc-400 hover:text-white border border-white/5'}`}>{isEditing ? 'SYNC_DNA' : 'EDIT_MODE'}</button>}
                            <button onClick={onClose} className="p-2.5 bg-red-600 rounded-full text-white shadow-lg hover:scale-110 active:scale-95 transition-all"><CloseIcon className="w-6 h-6" /></button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar relative">
                        <AnimatePresence>
                            {showCopyToast && (
                                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute top-6 left-1/2 -translate-x-1/2 z-[100] bg-white text-black px-6 py-2 rounded-full font-black text-[10px] uppercase tracking-[0.3em] shadow-2xl">Signal Intercepted</motion.div>
                            )}
                        </AnimatePresence>

                        <div className="p-8 md:p-16 max-w-5xl mx-auto space-y-12">
                            <div className="flex flex-col md:flex-row items-center gap-10 md:gap-16">
                                <div className={`w-32 h-32 md:w-48 md:h-48 rounded-[2.5rem] md:rounded-[3.5rem] border-2 p-1.5 flex-shrink-0 transition-transform hover:scale-105 duration-500 ${targetUser?.username === OWNER_HANDLE ? 'border-red-600 shadow-[0_0_30px_rgba(220,38,38,0.4)]' : targetUser?.username === ADMIN_HANDLE ? 'border-blue-500 shadow-[0_0_30px_rgba(59,130,246,0.4)]' : 'border-white/10'}`}>
                                    <img src={targetUser?.avatar || clerkUser.imageUrl} className="w-full h-full object-cover rounded-[2.2rem] md:rounded-[3.2rem]" alt="" />
                                </div>
                                <div className="flex-1 text-center md:text-left">
                                    <div className="flex flex-col md:flex-row items-center gap-5 mb-5">
                                        <h3 className="text-2xl md:text-4xl font-black text-white tracking-tighter">@{targetUser?.username || clerkUser.username}</h3>
                                        <div className="flex gap-3">
                                            {isViewingOther ? (
                                                <><button onClick={() => handleAction('follow')} className={`px-6 py-2.5 rounded-xl font-black text-[10px] md:text-xs uppercase tracking-widest transition-all ${socialState.isFollowing ? 'bg-white/10 text-white border border-white/10' : 'bg-red-600 text-white shadow-xl hover:bg-red-700'}`}>{socialState.isFollowing ? 'CONNECTED' : 'FOLLOW'}</button>
                                                  <button onClick={() => handleAction('friend')} className={`px-6 py-2.5 rounded-xl font-black text-[10px] md:text-xs uppercase tracking-widest transition-all ${socialState.friendStatus === 'accepted' ? 'bg-green-600/20 text-green-500 border border-green-600/30' : 'bg-white/5 border border-white/10 text-white hover:bg-white/10'}`}>{socialState.friendStatus === 'accepted' ? 'TRUSTED' : socialState.friendStatus === 'pending' ? 'ACCEPT?' : socialState.friendStatus === 'requested' ? 'SIGNAL_OUT' : 'SYNC_REQUEST'}</button>
                                                  <button onClick={() => onMessageUser?.(viewingUserId!)} className="p-2.5 bg-white/5 border border-white/10 rounded-xl font-bold text-white hover:bg-white/10 active:scale-95 transition-all"><ChatBubbleIcon className="w-5 h-5" /></button></>
                                            ) : (!isEditing && <button onClick={() => setIsEditing(true)} className="px-6 py-2.5 bg-white/10 border border-white/10 rounded-xl font-black text-[10px] uppercase tracking-widest text-white hover:bg-white/20 transition-all">CONFIGURE_IDENTITY</button>)}
                                        </div>
                                    </div>
                                    <div className="flex justify-center md:justify-start gap-8 md:gap-12 mb-8">
                                        <div className="text-center md:text-left"><p className="text-xl md:text-3xl font-black text-white leading-none">{userPosts.length}</p><p className="text-[9px] md:text-[10px] text-zinc-500 uppercase font-black tracking-widest mt-1">Signals</p></div>
                                        <button onClick={() => setUserListMode('followers')} className="text-center md:text-left hover:opacity-80 transition-all group"><p className="text-xl md:text-3xl font-black text-white leading-none group-hover:text-red-500">{socialState.followers.length}</p><p className="text-[9px] md:text-[10px] text-zinc-500 uppercase font-black tracking-widest mt-1">Network</p></button>
                                        <button onClick={() => setUserListMode('following')} className="text-center md:text-left hover:opacity-80 transition-all group"><p className="text-xl md:text-3xl font-black text-white leading-none group-hover:text-red-500">{socialState.following.length}</p><p className="text-[9px] md:text-[10px] text-zinc-500 uppercase font-black tracking-widest mt-1">Following</p></button>
                                    </div>
                                    <div className="space-y-2">
                                        {isEditing ? (
                                            <><input value={editData.name || ''} onChange={e => setEditData({...editData, name: e.target.value})} placeholder="Display Identity" className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white font-bold text-base md:text-lg outline-none focus:border-red-600 mb-3" />
                                              <textarea value={editData.profile?.bio || ''} onChange={e => setEditData({...editData, profile: {...editData.profile, bio: e.target.value}})} placeholder="Identity description..." className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-zinc-400 text-xs md:text-sm italic outline-none h-24 resize-none" /></>
                                        ) : (
                                            <><p className="text-lg md:text-2xl font-black text-white uppercase tracking-tight leading-none">{targetUser?.name || clerkUser.fullName}</p>
                                              <p className="text-zinc-400 text-sm md:text-lg font-medium italic leading-relaxed opacity-80">"{targetUser?.profile?.bio || 'Active participant in the FEZ Zone.'}"</p></>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-6 bg-white/5 p-8 rounded-[2rem] border border-white/5">
                                    <div className="flex flex-wrap gap-x-8 gap-y-4 text-[10px] md:text-xs uppercase tracking-[0.2em] font-black">
                                        <div className="flex flex-col gap-1.5"><span className="text-red-600">Location_Node:</span> {isEditing ? <input value={editData.profile?.origin} onChange={e => setEditData({...editData, profile: {...editData.profile, origin: e.target.value}})} className="bg-black/50 border border-white/10 px-3 py-1.5 rounded-lg outline-none text-white" /> : <span className="text-white text-base">{targetUser?.profile?.origin || 'HIDDEN_PORT'}</span>}</div>
                                        <div className="flex flex-col gap-1.5"><span className="text-red-600">Primary_Role:</span> {isEditing ? <input value={editData.profile?.profession} onChange={e => setEditData({...editData, profile: {...editData.profile, profession: e.target.value}})} className="bg-black/50 border border-white/10 px-3 py-1.5 rounded-lg outline-none text-white" /> : <span className="text-white text-base">{targetUser?.profile?.profession || 'VISUAL_ARTIST'}</span>}</div>
                                    </div>
                                    <div className="pt-4">
                                        <span className="text-[10px] md:text-xs text-red-600 font-black uppercase tracking-[0.3em] block mb-4">CAPABILITY_MATRIX</span>
                                        <div className="flex flex-wrap gap-2.5">
                                            {(isEditing ? (editData.profile?.skills || []) : (targetUser?.profile?.skills || [])).map((s: string, i: number) => (
                                                <span key={i} className="px-4 py-2 bg-black/60 border border-white/10 rounded-xl text-[10px] md:text-xs font-bold text-zinc-300 flex items-center gap-3 transition-colors hover:border-red-600/50">{s} {isEditing && <button onClick={() => setEditData({...editData, profile: {...editData.profile, skills: editData.profile.skills.filter((_:any,idx:number)=>idx!==i)}})} className="text-red-600 hover:scale-125 transition-transform"><CloseIcon className="w-3 h-3" /></button>}</span>
                                            ))}
                                            {isEditing && <button onClick={() => { const s = window.prompt("Signal Type:"); if(s) setEditData({...editData, profile: {...editData.profile, skills: [...(editData.profile.skills||[]), s]}}); }} className="px-4 py-2 bg-red-600/20 text-red-500 rounded-xl text-[10px] font-black uppercase tracking-widest border border-red-600/30 hover:bg-red-600 hover:text-white transition-all">+_APPEND</button>}
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-6 bg-white/5 p-8 rounded-[2rem] border border-white/5">
                                    <div className="flex justify-between items-center"><h4 className="text-[10px] md:text-xs font-black text-red-600 uppercase tracking-[0.3em]">SOCIAL_NODES</h4>{isMyOwnProfile && isEditing && <button onClick={() => { const name = window.prompt("Identity: Facebook, Instagram, YouTube, TikTok, Behance:"); if (name && NETWORK_CONFIGS[name]) setEditData({...editData, profile: {...editData.profile, networks: [...(editData.profile.networks || []), { name, handle: '' }]}}); }} className="text-[10px] text-zinc-500 hover:text-red-600 transition-colors">+_CONNECT</button>}</div>
                                    <div className="grid grid-cols-1 gap-3">
                                        {(isEditing ? (editData.profile?.networks || []) : (targetUser?.profile?.networks || [])).map((net: any, i: number) => {
                                            const cfg = NETWORK_CONFIGS[net.name] || { icon: GlobeAltIcon, baseUrl: '' };
                                            return isEditing ? (
                                                <div key={i} className="bg-black/40 border border-white/10 rounded-xl p-3 flex items-center gap-3">
                                                    <cfg.icon className="w-5 h-5 text-zinc-500" />
                                                    <div className="flex-1">
                                                        <p className="text-[8px] text-zinc-600 font-black uppercase mb-1">{net.name}</p>
                                                        <input value={net.handle} onChange={e => { const n = [...editData.profile.networks]; n[i].handle = e.target.value.replace('@',''); setEditData({...editData, profile: {...editData.profile, networks: n}}); }} className="bg-transparent text-sm text-white w-full outline-none font-bold" placeholder="username" />
                                                    </div>
                                                </div>
                                            ) : (net.handle && <a key={i} href={`${cfg.baseUrl}${net.handle}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-4 bg-black/40 rounded-xl border border-white/5 hover:border-red-600/30 hover:bg-red-600/5 transition-all group"><div className="flex items-center gap-4"><cfg.icon className="w-6 h-6 text-zinc-400 group-hover:text-red-500 transition-colors" /><span className="text-sm font-bold text-zinc-300 group-hover:text-white transition-colors">@{net.handle}</span></div><ChevronLeftIcon className="w-4 h-4 text-zinc-600 rotate-180" /></a>);
                                        })}
                                        {(!isEditing && (!targetUser?.profile?.networks || targetUser?.profile?.networks.every((n:any)=>!n.handle))) && <p className="text-center py-8 text-zinc-700 font-black text-[10px] uppercase tracking-widest">NO_COMM_CHANNELS_OPEN</p>}
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-8 pt-12 border-t border-white/10">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-lg md:text-2xl font-black text-white uppercase tracking-[0.4em] font-display">ARCHIVED_MASTERWORKS</h4>
                                    <div className="h-px bg-white/5 flex-1 mx-8 hidden md:block"></div>
                                    <span className="text-[10px] md:text-xs font-black text-zinc-600 uppercase tracking-widest">{userPosts.length} OBJECTS</span>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-6">
                                    {userPosts.map((post, i) => (
                                        <div key={i} onClick={() => onOpenModal?.(userPosts, i)} className="aspect-square bg-white/5 rounded-[1.5rem] md:rounded-[2rem] overflow-hidden group relative cursor-pointer border border-white/10 shadow-2xl transition-all hover:scale-[1.02] duration-500">
                                            {post.mediaType === 'video' ? <video src={post.mediaUrl} className="w-full h-full object-cover" /> : <img src={post.mediaUrl} className="w-full h-full object-cover" alt="" />}
                                            <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-all duration-500 flex flex-col items-center justify-center backdrop-blur-sm">
                                                <div className="flex gap-6 text-sm font-black text-white uppercase tracking-widest scale-90 group-hover:scale-100 transition-transform">
                                                    <span className="flex items-center gap-2 text-red-500"><i className="fa-solid fa-heart"></i> {Object.keys(post.likes || {}).length}</span>
                                                    <span className="flex items-center gap-2"><i className="fa-solid fa-comment"></i> {Object.keys(post.comments || {}).length}</span>
                                                </div>
                                                <div className="mt-4 p-2 bg-white/10 rounded-full"><EyeIcon className="w-6 h-6 text-white" /></div>
                                            </div>
                                        </div>
                                    ))}
                                    {userPosts.length === 0 && <div className="col-span-2 md:col-span-3 py-32 text-center opacity-20"><GalleryIcon className="w-16 h-16 mx-auto mb-6" /><p className="text-xs md:text-sm font-black uppercase tracking-[0.8em]">SIGNAL_LOST • NO_DATA_FOUND</p></div>}
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};
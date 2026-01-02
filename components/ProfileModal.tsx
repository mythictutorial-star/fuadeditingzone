import React, { useMemo, useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUser } from '@clerk/clerk-react';
import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getDatabase, ref, update, onValue, set, remove, push, query, orderByChild, equalTo, get } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';
import { 
  CloseIcon, GlobeAltIcon, ChevronLeftIcon, InstagramIcon, FacebookIcon, 
  YouTubeIcon, TikTokIcon, BehanceIcon, GalleryIcon, CopyIcon,
  ChatBubbleIcon, EyeIcon, UserCircleIcon, BriefcaseIcon, SparklesIcon
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
    }, [isViewingOther, clerkUser, viewingUserId]);

    const handleAction = async (type: 'follow' | 'friend') => {
        if (!clerkUser || !viewingUserId) return;
        if (type === 'follow') {
            const path = `social/${clerkUser.id}/following/${viewingUserId}`;
            const fPath = `social/${viewingUserId}/followers/${clerkUser.id}`;
            if (socialState.isFollowing) {
                await remove(ref(db, path));
                await remove(ref(db, fPath));
            } else {
                await set(ref(db, path), true);
                await set(ref(fPath), true);
                await push(ref(db, `notifications/${viewingUserId}`), { 
                    type: 'follow', fromId: clerkUser.id, fromName: clerkUser.username || clerkUser.fullName, fromAvatar: clerkUser.imageUrl, timestamp: Date.now(), read: false 
                });
            }
        } else {
            if (socialState.friendStatus === 'accepted') {
                if (window.confirm(`Unfriend @${targetUser?.username}?`)) {
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
                    type: 'friend_accepted', fromId: clerkUser.id, fromName: clerkUser.username || clerkUser.fullName, fromAvatar: clerkUser.imageUrl, timestamp: Date.now(), read: false 
                });
            } else if (socialState.friendStatus === 'requested') {
                if (window.confirm("Cancel friend request?")) {
                    await remove(ref(db, `social/${clerkUser.id}/requests/sent/${viewingUserId}`));
                    await remove(ref(db, `social/${viewingUserId}/requests/received/${clerkUser.id}`));
                }
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
        const textToCopy = `@${username} | ${url}`;
        navigator.clipboard.writeText(textToCopy);
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
                                <button onClick={handleCopyProfileLink} className="ml-4 flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-red-600/20 rounded-xl text-zinc-500 hover:text-red-500 transition-all border border-white/5" title="Copy Info">
                                    <CopyIcon className="w-4 h-4" />
                                    <span className="text-[9px] font-black uppercase tracking-widest hidden sm:inline">Copy Info</span>
                                </button>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            {isMyOwnProfile && <button onClick={() => isEditing ? handleSaveProfile() : setIsEditing(true)} className={`px-5 py-2.5 rounded-xl font-black text-[10px] md:text-xs uppercase tracking-widest transition-all ${isEditing ? 'bg-green-600 text-white' : 'bg-white/5 text-zinc-400 hover:text-white border border-white/5'}`}>{isEditing ? 'Save Profile' : 'Edit Profile'}</button>}
                            <button onClick={onClose} className="p-2.5 bg-red-600 rounded-full text-white shadow-lg hover:scale-110 active:scale-95 transition-all"><CloseIcon className="w-6 h-6" /></button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar relative">
                        <AnimatePresence>
                            {showCopyToast && (
                                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute top-6 left-1/2 -translate-x-1/2 z-[100] bg-white text-black px-6 py-2 rounded-full font-black text-[10px] uppercase tracking-[0.3em] shadow-2xl">Identity Captured</motion.div>
                            )}
                        </AnimatePresence>

                        {userListMode ? (
                            <div className="p-8 md:p-16 max-w-2xl mx-auto space-y-6">
                                <h3 className="text-2xl font-black text-white uppercase tracking-[0.2em] mb-10">{userListMode === 'followers' ? 'Followers' : 'Following'}</h3>
                                {resolvedUserList.length === 0 ? (
                                    <div className="py-20 text-center opacity-20"><UserCircleIcon className="w-20 h-20 mx-auto mb-6" /><p className="text-sm font-black uppercase tracking-[0.5em]">Sector Empty</p></div>
                                ) : (
                                    resolvedUserList.map(u => (
                                        <div key={u.id} onClick={() => handleSwitchToOtherProfile(u.id, u.username)} className="flex items-center justify-between p-4 bg-white/10 border border-white/5 rounded-2xl cursor-pointer hover:bg-white/20 transition-all group">
                                            <div className="flex items-center gap-4">
                                                <img src={u.avatar} className="w-12 h-12 rounded-xl object-cover border border-white/10" alt="" />
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-1">
                                                        <p className="text-sm font-black text-white uppercase tracking-tight truncate">@{u.username}</p>
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
                                    <div className={`w-32 h-32 md:w-48 md:h-48 rounded-[2.5rem] md:rounded-[3.5rem] border-2 p-1.5 flex-shrink-0 transition-transform hover:scale-105 duration-500 ${targetUser?.username === OWNER_HANDLE ? 'border-red-600 shadow-[0_0_30px_rgba(220,38,38,0.4)]' : targetUser?.username === ADMIN_HANDLE ? 'border-blue-500 shadow-[0_0_30px_rgba(59,130,246,0.4)]' : 'border-white/10'}`}>
                                        <img src={targetUser?.avatar || clerkUser.imageUrl} className="w-full h-full object-cover rounded-[2.2rem] md:rounded-[3.2rem]" alt="" />
                                    </div>
                                    <div className="flex-1 text-center md:text-left">
                                        <div className="flex flex-col md:flex-row items-center gap-5 mb-5">
                                            <div className="flex items-center gap-2">
                                                <h3 className="text-2xl md:text-4xl font-black text-white tracking-tighter">@{targetUser?.username || clerkUser.username}</h3>
                                                {getVerifiedBadge(targetUser?.username || clerkUser.username)}
                                            </div>
                                            <div className="flex gap-3">
                                                {isViewingOther ? (
                                                    <><button onClick={() => handleAction('follow')} className={`px-6 py-2.5 rounded-xl font-black text-[10px] md:text-xs uppercase tracking-widest transition-all ${socialState.isFollowing ? 'bg-white/10 text-white border border-white/10 hover:text-red-500' : 'bg-red-600 text-white shadow-xl hover:bg-red-700'}`}>{socialState.isFollowing ? 'Following' : 'Follow'}</button>
                                                      <button onClick={() => handleAction('friend')} className={`px-6 py-2.5 rounded-xl font-black text-[10px] md:text-xs uppercase tracking-widest transition-all ${socialState.friendStatus === 'accepted' ? 'bg-green-600/20 text-green-500 border border-green-600/30' : 'bg-white/5 border border-white/10 text-white hover:bg-white/10'}`}>{socialState.friendStatus === 'accepted' ? 'Friends' : socialState.friendStatus === 'pending' ? 'Accept?' : socialState.friendStatus === 'requested' ? 'Requested' : 'Add Friend'}</button>
                                                      <button onClick={() => onMessageUser?.(viewingUserId!)} className="p-2.5 bg-white/5 border border-white/10 rounded-xl font-bold text-white hover:bg-white/10 active:scale-95 transition-all"><ChatBubbleIcon className="w-5 h-5" /></button></>
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
                                                          <span className="text-[10px] md:text-xs font-black uppercase tracking-widest">{targetUser?.profile?.profession || 'VISUAL ARTIST'}</span>
                                                      </div>
                                                      <div className="flex items-center gap-2 text-zinc-500">
                                                          <GlobeAltIcon className="w-4 h-4 text-red-600 opacity-60" />
                                                          <span className="text-[10px] md:text-xs font-black uppercase tracking-widest">{targetUser?.profile?.origin || 'Earth'}</span>
                                                      </div>
                                                  </div>

                                                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 pt-2">
                                                      <SparklesIcon className="w-4 h-4 text-red-600 opacity-60 mr-1" />
                                                      {(targetUser?.profile?.skills || []).map((s: string, i: number) => (
                                                          <span key={i} className="text-[9px] md:text-[10px] font-bold text-zinc-400 uppercase tracking-[0.1em] px-2 py-0.5 border border-white/5 rounded-md bg-white/[0.02]">{s}</span>
                                                      ))}
                                                      {isEditing && <button onClick={() => { const s = window.prompt("Add Skill:"); if(s) setEditData({...editData, profile: {...editData.profile, skills: [...(editData.profile.skills||[]), s]}}); }} className="text-[9px] text-red-500 font-black uppercase">+ Add Skill</button>}
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
                                        <div className="flex justify-between items-center"><h4 className="text-[10px] md:text-xs font-black text-red-600 uppercase tracking-[0.3em]">Configure Networks</h4><button onClick={() => { const name = window.prompt("Platform: Facebook, Instagram, YouTube, TikTok, Behance:"); if (name && NETWORK_CONFIGS[name]) setEditData({...editData, profile: {...editData.profile, networks: [...(editData.profile.networks || []), { name, handle: '' }]}}); }} className="text-[10px] text-zinc-500 hover:text-red-600 transition-colors">+ Add Platform</button></div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            {(editData.profile?.networks || []).map((net: any, i: number) => {
                                                const cfg = NETWORK_CONFIGS[net.name] || { icon: GlobeAltIcon, baseUrl: '' };
                                                return (
                                                    <div key={i} className="bg-black border border-white/10 rounded-xl p-3 flex items-center gap-3">
                                                        <cfg.icon className="w-5 h-5 text-zinc-500" />
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-[8px] text-zinc-600 font-black uppercase mb-1">{net.name}</p>
                                                            <input value={net.handle} onChange={e => { const n = [...editData.profile.networks]; n[i].handle = e.target.value.replace('@',''); setEditData({...editData, profile: {...editData.profile, networks: n}}); }} className="bg-transparent text-sm text-white w-full outline-none font-bold" placeholder="username" />
                                                        </div>
                                                        <button onClick={() => setEditData({...editData, profile: {...editData.profile, networks: editData.profile.networks.filter((_:any,idx:number)=>idx!==i)}})} className="text-zinc-600 hover:text-red-600"><CloseIcon className="w-4 h-4"/></button>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                        <div className="pt-4 border-t border-white/5">
                                            <h4 className="text-[10px] font-black text-red-600 uppercase tracking-[0.3em] mb-4">Edit Skills</h4>
                                            <div className="flex flex-wrap gap-2">
                                                {(editData.profile?.skills || []).map((s: string, i: number) => (
                                                    <span key={i} className="px-3 py-1.5 bg-black border border-white/10 rounded-lg text-[10px] font-bold text-zinc-300 flex items-center gap-2">{s}<button onClick={() => setEditData({...editData, profile: {...editData.profile, skills: editData.profile.skills.filter((_:any,idx:number)=>idx!==i)}})} className="text-red-600"><CloseIcon className="w-3 h-3"/></button></span>
                                                ))}
                                            </div>
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
                                        <span className="text-[10px] md:text-xs font-black text-zinc-600 uppercase tracking-widest">{userPosts.length} Items</span>
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
                                            <p className="text-xs md:text-sm font-black uppercase tracking-[0.8em]">No signals archived</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                    
                    <div className="p-4 bg-black/80 border-t border-white/5 flex items-center justify-center md:hidden flex-shrink-0">
                         <p className="text-[8px] font-black text-zinc-700 uppercase tracking-[0.5em]">Identity Profile V2.0</p>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};
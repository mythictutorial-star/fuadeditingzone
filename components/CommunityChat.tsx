import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUser, SignInButton, useClerk } from '@clerk/clerk-react';
import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getDatabase, ref, push, onValue, set, update, get, query, limitToLast, remove } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';
import { GlobeAltIcon, UserCircleIcon, SearchIcon, SendIcon, ChevronLeftIcon, UserGroupIcon, CloseIcon, HomeIcon, MarketIcon, ChevronRightIcon, LockIcon, UnlockIcon } from './Icons';
import { SidebarSubNav } from './Sidebar';
import { ArrowLeft, Edit, LayoutDashboard, MessageSquare, Heart, PlusSquare, Compass, Bell, Check, Trash2, Info, Volume2, VolumeX, ShieldAlert, UserMinus, ShieldCheck, KeyRound, Fingerprint, Lock, Unlock, AlertTriangle, ShieldCheck as Shield, Image as ImageIcon, Film, X, Video, Phone } from 'lucide-react';
import { siteConfig } from '../config';
import { CreatePostModal } from './CreatePostModal';

const firebaseConfig = {
  databaseURL: "https://fuad-editing-zone-default-rtdb.firebaseio.com/",
  apiKey: "AIzaSyCC3wbQp5713OqHlf1jLZabA0VClDstfKY",
  projectId: "fuad-editing-zone",
  messagingSenderId: "832389657221",
  appId: "1:1032345523456:web:123456789",
};

if (!getApps().length) initializeApp(firebaseConfig);
const db = getDatabase();

const OWNER_HANDLE = 'fuadeditingzone';
const RESTRICTED_HANDLE = 'jiya';
const R2_WORKER_URL = 'https://quiet-haze-1898.fuadeditingzone.workers.dev';
const R2_PUBLIC_DOMAIN = 'https://pub-c35a446ba9db4c89b71a674f0248f02a.r2.dev';

const uploadMediaToR2 = async (file: File): Promise<string> => {
    const sanitizedName = `${Date.now()}-${file.name.replace(/[^a-z0-9.]/gi, '_')}`;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', 'Messages/');
    formData.append('filename', sanitizedName);
    const response = await fetch(R2_WORKER_URL, { method: 'POST', body: formData });
    const result = await response.json();
    return `${R2_PUBLIC_DOMAIN}/Messages/${result.url ? result.url.split('/').pop() : sanitizedName}`;
};

interface ChatUser { id: string; name: string; username: string; avatar?: string; role?: string; online?: boolean; }
interface Message { id?: string; senderId: string; senderName: string; senderUsername?: string; senderAvatar?: string; senderRole?: string; text?: string; mediaUrl?: string; mediaType?: 'image' | 'video'; timestamp: number; }

const UserAvatar: React.FC<{ user: Partial<ChatUser>; className?: string; onClick?: (e: React.MouseEvent) => void }> = ({ user, className = "w-10 h-10", onClick }) => {
    const username = user.username || 'user';
    const firstLetter = username.charAt(0).toUpperCase();
    return (
        <div onClick={onClick} className={`${className} rounded-full border border-white/5 flex-shrink-0 overflow-hidden relative group cursor-pointer bg-zinc-800 flex items-center justify-center`}>
            {user.avatar ? <img src={user.avatar} className="w-full h-full object-cover" alt="" /> : <span className="text-white font-black text-lg">{firstLetter}</span>}
        </div>
    );
};

const ConnectionStatus: React.FC<{ activePreset?: string }> = ({ activePreset }) => {
    const presets = siteConfig.api.realtimeKit.presets;
    const isLive = activePreset === presets.LIVESTREAM_HOST || activePreset === presets.LIVESTREAM_VIEWER;
    const isGroup = activePreset === presets.GROUP_HOST || activePreset === presets.GROUP_GUEST;
    return (
        <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/10">
            <div className={`w-2 h-2 rounded-full animate-pulse shadow-[0_0_8px] ${isLive ? 'bg-red-600 shadow-red-600' : isGroup ? 'bg-blue-600 shadow-blue-600' : 'bg-zinc-600 shadow-zinc-600'}`}></div>
        </div>
    );
};

export const CommunityChat: React.FC<{ 
  onShowProfile?: (id: string, username?: string) => void; 
  initialTargetUserId?: string | null; 
  onBack?: () => void; 
  onNavigateMarket?: () => void;
  forceSearchTab?: boolean;
  onSearchTabConsumed?: () => void;
  onThreadStateChange?: (active: boolean) => void;
  onOpenPost?: (postId: string, commentId?: string) => void;
}> = ({ onShowProfile, initialTargetUserId, onBack, onNavigateMarket, forceSearchTab, onSearchTabConsumed, onThreadStateChange, onOpenPost }) => {
  const { user: clerkUser, isSignedIn } = useUser();
  const [users, setUsers] = useState<ChatUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<ChatUser | null>(null);
  const [isGlobal, setIsGlobal] = useState(false); 
  const [sidebarTab, setSidebarTab] = useState<'messages' | 'search'>('messages');
  const [inboxView, setInboxView] = useState<'primary' | 'requests'>('primary');
  const [sidebarSearchQuery, setSidebarSearchQuery] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isMobileChatOpen, setIsMobileChatOpen] = useState(false); 
  const [friendsList, setFriendsList] = useState<string[]>([]);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isActivityOpen, setIsActivityOpen] = useState(false);
  const [activePreset, setActivePreset] = useState<string>(siteConfig.api.realtimeKit.presets.LIVESTREAM_VIEWER);
  const [isMediaUploading, setIsMediaUploading] = useState(false);
  const [pendingMedia, setPendingMedia] = useState<{ file: File; preview: string; type: 'image' | 'video' } | null>(null);
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const mediaInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isOwner = clerkUser?.username?.toLowerCase() === OWNER_HANDLE;

  useEffect(() => {
    onThreadStateChange?.(isMobileChatOpen && (!!selectedUser || isGlobal));
  }, [isMobileChatOpen, selectedUser, isGlobal, onThreadStateChange]);

  useEffect(() => {
    const unsubUsers = onValue(ref(db, 'users'), (snap) => {
      const data = snap.val();
      if (data) {
          const list = Object.values(data) as ChatUser[];
          setUsers(list);
          if(initialTargetUserId) {
              const target = list.find(u => u.id === initialTargetUserId || u.username?.toLowerCase() === initialTargetUserId?.toLowerCase());
              if(target) openChat(target);
          }
      }
    });
    if (clerkUser) {
        onValue(ref(db, `social/${clerkUser.id}/friends`), (snap) => setFriendsList(snap.exists() ? Object.keys(snap.val()) : []));
        onValue(ref(db, `users/${clerkUser.id}/unread`), (snap) => setUnreadCounts(snap.val() || {}));
        onValue(ref(db, `notifications/${clerkUser.id}`), (snap) => {
            const data = snap.val() || {};
            const rawList = Object.entries(data).map(([id, val]: [string, any]) => ({ id, ...val }));
            const merged = rawList.reduce((acc: any[], n: any) => {
                const existingIdx = acc.findIndex(item => item.fromId === n.fromId && item.type === n.type);
                if (existingIdx !== -1 && (n.type === 'message_request' || n.type === 'post_like')) {
                    acc[existingIdx].count = (acc[existingIdx].count || 1) + 1;
                    acc[existingIdx].timestamp = Math.max(acc[existingIdx].timestamp, n.timestamp);
                } else { acc.push(n); }
                return acc;
            }, []);
            setNotifications(merged.sort((a, b) => b.timestamp - a.timestamp));
        });
    }
    return () => unsubUsers();
  }, [clerkUser, initialTargetUserId]);

  const chatPath = useMemo(() => {
    if (isGlobal) return 'community/global';
    if (!clerkUser?.id || !selectedUser?.id) return null;
    return `messages/${[clerkUser.id, selectedUser.id].sort().join('_')}`;
  }, [isGlobal, clerkUser?.id, selectedUser?.id]);

  useEffect(() => {
    if (!chatPath) return;
    const unsub = onValue(query(ref(db, chatPath), limitToLast(100)), (snap) => {
        const data = snap.val();
        setMessages(data ? Object.entries(data).map(([id, val]: [string, any]) => ({ id, ...val })).sort((a, b) => a.timestamp - b.timestamp) : []);
    });
    if (!isGlobal && selectedUser && clerkUser) update(ref(db, `users/${clerkUser.id}/unread`), { [selectedUser.id]: 0 });
    return () => unsub();
  }, [chatPath, isGlobal, selectedUser?.id, clerkUser?.id]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, isMobileChatOpen]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!isSignedIn || !chatPath || !clerkUser || (!inputValue.trim() && !pendingMedia)) return;
    setIsMediaUploading(true);
    try {
        let mediaUrl = '';
        let mediaType: 'image' | 'video' | undefined = undefined;
        if (pendingMedia) { mediaUrl = await uploadMediaToR2(pendingMedia.file); mediaType = pendingMedia.type; }
        const newMessage: Message = { senderId: clerkUser.id, senderName: clerkUser.fullName || clerkUser.username || "User", senderUsername: (clerkUser.username || '').toLowerCase(), senderAvatar: clerkUser.imageUrl, text: inputValue.trim() || undefined, mediaUrl: mediaUrl || undefined, mediaType: mediaType, timestamp: Date.now() };
        setInputValue(''); setPendingMedia(null);
        await push(ref(db, chatPath), newMessage);
        if (!isGlobal && selectedUser) {
            await set(ref(db, `users/${clerkUser.id}/conversations/${selectedUser.id}`), true);
            await set(ref(db, `users/${selectedUser.id}/conversations/${clerkUser.id}`), true);
            get(ref(db, `users/${selectedUser.id}/unread/${clerkUser.id}`)).then(snap => set(ref(db, `users/${selectedUser.id}/unread/${clerkUser.id}`), (snap.val() || 0) + 1));
            const isFriend = friendsList.includes(selectedUser.id) || selectedUser.username === OWNER_HANDLE;
            if (!isFriend && messages.filter(m => m.senderId === clerkUser.id).length === 0) {
                await push(ref(db, `notifications/${selectedUser.id}`), { type: 'message_request', fromId: clerkUser.id, fromName: (clerkUser.username || clerkUser.fullName || '').toLowerCase(), text: `@${(clerkUser.username || clerkUser.fullName || '').toLowerCase()} requested to message you`, timestamp: Date.now(), read: false });
            }
        }
    } catch (err) { alert("Failed to send."); } finally { setIsMediaUploading(false); }
  };

  const openChat = (user: ChatUser | null) => {
      if (user === null) { setIsGlobal(true); setSelectedUser(null); setIsMobileChatOpen(true); setActivePreset(siteConfig.api.realtimeKit.presets.LIVESTREAM_VIEWER); }
      else { setIsGlobal(false); setSelectedUser(user); setIsMobileChatOpen(true); setActivePreset(siteConfig.api.realtimeKit.presets.GROUP_GUEST); }
  };

  const handleAcceptRequest = async () => {
    if (!clerkUser || !selectedUser) return;
    await set(ref(db, `social/${clerkUser.id}/friends/${selectedUser.id}`), true);
    await set(ref(db, `social/${selectedUser.id}/friends/${clerkUser.id}`), true);
    await push(ref(db, `notifications/${selectedUser.id}`), { type: 'friend_accepted', fromId: clerkUser.id, fromName: (clerkUser.username || clerkUser.fullName || '').toLowerCase(), text: `@${(clerkUser.username || clerkUser.fullName || '').toLowerCase()} accepted your request`, timestamp: Date.now(), read: false });
    setInboxView('primary');
  };

  const isFriend = useMemo(() => {
    if (!selectedUser) return false;
    return friendsList.includes(selectedUser.id) || selectedUser.username === OWNER_HANDLE;
  }, [selectedUser, friendsList]);

  const handleCallAttempt = (type: 'audio' | 'video') => {
    if (isFriend) {
        console.log(`[RealtimeKit] ${type.toUpperCase()} call initialized.`);
    } else {
        alert(`Calling feature locked. Please add @${selectedUser?.username} to your friends list to enable ${type} calling.`);
    }
  };

  const maskUser = (u: ChatUser) => {
      if (u.username === RESTRICTED_HANDLE && !isOwner) {
          return { ...u, name: "Community Member", username: "masked_member", avatar: undefined };
      }
      return u;
  };

  const filteredUsers = useMemo(() => {
      if (sidebarTab === 'search') {
          if (!sidebarSearchQuery.trim()) return [];
          return users
            .filter(u => u.username?.toLowerCase().includes(sidebarSearchQuery.toLowerCase()))
            .map(maskUser);
      }
      const pool = inboxView === 'primary' 
        ? users.filter(u => friendsList.includes(u.id) || u.username === OWNER_HANDLE || u.id === clerkUser?.id)
        : users.filter(u => Object.keys(unreadCounts).includes(u.id) && !friendsList.includes(u.id) && u.username !== OWNER_HANDLE);
      return pool.map(maskUser);
  }, [users, sidebarTab, inboxView, sidebarSearchQuery, friendsList, clerkUser?.id, isOwner]);

  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-black font-sans px-2.5 md:px-0">
      <div className="flex-1 flex flex-row min-h-0 h-full w-full">
        {/* Desktop Nav */}
        <nav className="hidden lg:flex flex-col items-center py-10 gap-10 w-20 border-r border-white/5 bg-black flex-shrink-0">
            <button onClick={onBack} className="hover:scale-110 transition-transform"><img src={siteConfig.branding.logoUrl} className="w-8 h-8" alt="" /></button>
            <button onClick={() => { setIsActivityOpen(false); setIsMobileChatOpen(false); }} className={`p-3 rounded-2xl ${!isActivityOpen && !selectedUser ? 'bg-white text-black' : 'text-zinc-500'}`}><HomeIcon className="w-6 h-6" /></button>
            <button onClick={() => { setIsActivityOpen(true); setActivePreset(siteConfig.api.realtimeKit.presets.LIVESTREAM_VIEWER); }} className={`p-3 rounded-2xl ${isActivityOpen ? 'bg-white text-black' : 'text-zinc-500'}`}><Bell className="w-6 h-6" /></button>
            <button onClick={() => onNavigateMarket()} className="p-3 rounded-2xl text-zinc-500"><MarketIcon className="w-6 h-6" /></button>
        </nav>

        <div className="flex-1 flex flex-row overflow-hidden relative">
            {/* Sidebar */}
            <aside className={`${isMobileChatOpen || isActivityOpen ? 'hidden' : 'flex'} md:flex w-full md:w-[320px] flex-col flex-shrink-0 bg-black border-r border-white/5 min-h-0`}>
                <div className="p-6 space-y-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <button onClick={onBack} className="md:hidden p-2 bg-white/5 rounded-lg text-white hover:text-red-500 transition-colors"><HomeIcon className="w-5 h-5"/></button>
                            <h2 className="text-xl font-black text-white lowercase">{(clerkUser?.username || 'user')}</h2>
                        </div>
                        <button onClick={() => setSidebarTab(sidebarTab === 'search' ? 'messages' : 'search')} className="text-white hover:text-red-500 transition-colors"><SearchIcon className="w-5 h-5" /></button>
                    </div>
                    {sidebarTab === 'search' && <input ref={searchInputRef} value={sidebarSearchQuery} onChange={e => setSidebarSearchQuery(e.target.value)} placeholder="Type to search members..." className="w-full bg-zinc-900 border-none rounded-xl py-3 px-4 text-white text-[10px] outline-none focus:ring-1 focus:ring-red-600/30" />}
                    <div className="flex gap-6 border-b border-white/5">
                        <button onClick={() => setInboxView('primary')} className={`pb-3 text-xs font-black uppercase tracking-widest transition-all ${inboxView === 'primary' ? 'text-white border-b-2 border-white' : 'text-zinc-500'}`}>Primary</button>
                        <button onClick={() => setInboxView('requests')} className={`pb-3 text-xs font-black uppercase tracking-widest transition-all relative ${inboxView === 'requests' ? 'text-white border-b-2 border-white' : 'text-zinc-500'}`}>Requests {filteredUsers.length > 0 && inboxView === 'requests' && <span className="ml-1 bg-red-600 text-white text-[8px] px-1.5 py-0.5 rounded-full animate-pulse">{filteredUsers.length}</span>}</button>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto no-scrollbar space-y-1">
                    <button onClick={() => openChat(null)} className={`w-full flex items-center gap-4 px-6 py-4 transition-all ${isGlobal ? 'bg-white/5' : 'hover:bg-zinc-900'}`}>
                        <div className="w-12 h-12 rounded-full bg-red-600/10 flex items-center justify-center border border-red-600/20 text-red-500"><GlobeAltIcon className="w-6 h-6" /></div>
                        <div className="text-left"><p className="text-sm font-bold text-white">Global Feed</p><p className="text-[10px] text-zinc-500">Public broadcast</p></div>
                    </button>
                    {filteredUsers.map(u => (
                        <button key={u.id} onClick={() => openChat(u)} className={`w-full flex items-center gap-4 px-6 py-4 transition-all ${selectedUser?.id === u.id && !isGlobal ? 'bg-white/5' : 'hover:bg-zinc-900'}`}>
                            <UserAvatar user={u} className="w-12 h-12" />
                            <div className="text-left flex-1 min-w-0">
                                <p className="text-sm font-bold text-white truncate">{u.name}</p>
                                <p className="text-[10px] text-zinc-500 uppercase tracking-widest">@{u.username?.toLowerCase()}</p>
                            </div>
                            {unreadCounts[u.id] > 0 && <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse shadow-[0_0_8px_red]"></div>}
                        </button>
                    ))}
                </div>
            </aside>

            {/* Main Content Area */}
            <main className={`${isMobileChatOpen || isActivityOpen ? 'flex' : 'hidden'} md:flex flex-1 flex-col min-h-0 bg-black relative`}>
                {isActivityOpen ? (
                    <div className="flex-1 flex flex-col h-full bg-black">
                        <div className="p-6 md:p-10 border-b border-white/5 flex items-center justify-between bg-black flex-shrink-0 px-2.5">
                            <div className="flex items-center gap-4"><h2 className="text-xl md:text-3xl font-black text-white uppercase tracking-[0.2em]">Activity</h2><ConnectionStatus activePreset={activePreset} /></div>
                            <button onClick={() => { setIsActivityOpen(false); setActivePreset(siteConfig.api.realtimeKit.presets.LIVESTREAM_VIEWER); }} className="p-2 hover:bg-white/5 rounded-full transition-colors"><CloseIcon className="w-6 h-6 text-white" /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto no-scrollbar space-y-1">
                            {notifications.length === 0 ? <div className="h-full flex items-center justify-center opacity-20"><p className="text-sm uppercase font-black tracking-[0.5em]">No Activity</p></div> : notifications.map(n => (
                                <div key={n.id} onClick={() => { if(n.fromId) onShowProfile?.(n.fromId); }} className="p-8 border-b border-white/5 bg-black transition-all hover:bg-zinc-900 cursor-pointer">
                                    <p className="text-sm md:text-lg text-white leading-relaxed font-bold lowercase">{n.text}{n.count > 1 ? ` (${n.count})` : ''}</p>
                                    <p className="text-[10px] text-zinc-600 font-black uppercase mt-2 tracking-widest">{new Date(n.timestamp).toLocaleTimeString()}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : !selectedUser && !isGlobal ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-10 opacity-20 text-center px-2.5">
                        <i className="fa-regular fa-paper-plane text-5xl mb-6"></i>
                        <p className="text-xs uppercase font-black tracking-widest">Select a thread to start</p>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col min-h-0 h-full">
                        <div className="p-4 md:p-8 flex items-center justify-between border-b border-white/5 bg-black/40 backdrop-blur-xl z-10 px-2.5">
                            <div className="flex items-center gap-4">
                                <button onClick={() => setIsMobileChatOpen(false)} className="md:hidden p-2 bg-white/5 rounded-lg"><ChevronLeftIcon className="w-5 h-5 text-white" /></button>
                                <div onClick={() => { if (!isGlobal) { const masked = maskUser(selectedUser!); if (masked.username !== 'masked_member') onShowProfile?.(selectedUser!.id); } }} className="flex items-center gap-3 cursor-pointer">
                                    {isGlobal ? <div className="w-10 h-10 rounded-full bg-red-600/10 flex items-center justify-center text-red-500 border border-red-600/20"><GlobeAltIcon className="w-5 h-5" /></div> : <UserAvatar user={maskUser(selectedUser!)} className="w-10 h-10" />}
                                    <div className="min-w-0">
                                        <h3 className="text-sm font-black text-white uppercase truncate leading-none mb-1">{isGlobal ? 'Global Hub' : maskUser(selectedUser!).name}</h3>
                                        <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest leading-none">{isGlobal ? 'Public Broadcast' : `@${maskUser(selectedUser!).username?.toLowerCase()}`}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <ConnectionStatus activePreset={activePreset} />
                                {!isGlobal && (
                                    <div className="flex items-center gap-2">
                                        <button 
                                            onClick={() => handleCallAttempt('audio')} 
                                            className={`p-2.5 rounded-xl transition-all flex items-center justify-center relative ${isFriend ? 'bg-white/5 hover:bg-blue-600 text-zinc-400 hover:text-white shadow-lg' : 'bg-white/5 text-zinc-700'}`} 
                                            title={isFriend ? "Audio Call" : "Add friend to call"}
                                        >
                                            <Phone size={18}/>
                                            {!isFriend && <Lock size={8} className="absolute top-1 right-1 text-red-600" />}
                                        </button>
                                        <button 
                                            onClick={() => handleCallAttempt('video')} 
                                            className={`p-2.5 rounded-xl transition-all flex items-center justify-center relative ${isFriend ? 'bg-white/5 hover:bg-blue-600 text-zinc-400 hover:text-white shadow-lg' : 'bg-white/5 text-zinc-700'}`} 
                                            title={isFriend ? "Video Call" : "Add friend to call"}
                                        >
                                            <Video size={18}/>
                                            {!isFriend && <Lock size={8} className="absolute top-1 right-1 text-red-600" />}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Message List */}
                        <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar p-6 space-y-6 px-2.5 md:px-10">
                            {messages.map((m, i) => {
                                const isMe = m.senderId === clerkUser?.id;
                                const isMsgRestricted = m.senderUsername === RESTRICTED_HANDLE && !isOwner;
                                return (
                                    <div key={m.id || i} className={`flex gap-3 ${isMe ? 'flex-row-reverse' : 'flex-row'} items-end group`}>
                                        <UserAvatar user={isMsgRestricted ? { avatar: undefined, username: 'masked' } : { avatar: m.senderAvatar, username: m.senderUsername }} className="w-7 h-7" />
                                        <div className={`max-w-[75%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                            <div className={`px-4 py-3 rounded-2xl text-xs md:text-sm font-medium leading-relaxed break-words shadow-lg ${isMe ? 'bg-red-600 text-white rounded-br-none' : 'bg-zinc-900 text-zinc-200 rounded-bl-none border border-white/5'}`}>{m.text}</div>
                                            <span className="text-[7px] text-zinc-700 font-black uppercase mt-1 tracking-widest">{new Date(m.timestamp).toLocaleTimeString()}</span>
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area */}
                        <div className="p-6 border-t border-white/5 bg-black md:pb-6 pb-24 px-2.5">
                            {!isGlobal && !friendsList.includes(selectedUser?.id || '') && selectedUser?.username !== OWNER_HANDLE ? (
                                <div className="bg-zinc-900 border border-white/5 p-4 rounded-2xl flex items-center justify-between shadow-xl">
                                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Authorized friends only</p>
                                    <button onClick={handleAcceptRequest} className="bg-red-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all shadow-lg shadow-red-600/20">Accept Request</button>
                                </div>
                            ) : (
                                <form onSubmit={handleSendMessage} className="flex items-center gap-3 bg-zinc-900 border border-white/10 rounded-2xl p-2 focus-within:border-red-600/40 transition-all shadow-xl max-w-5xl mx-auto">
                                    <button type="button" onClick={() => mediaInputRef.current?.click()} className="p-3 text-zinc-500 hover:text-white transition-colors" title="Attach"><ImageIcon size={18}/></button>
                                    <textarea ref={textareaRef} value={inputValue} onChange={e => setInputValue(e.target.value)} onKeyDown={e => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }} placeholder="Message..." rows={1} className="flex-1 bg-transparent border-none text-sm text-white py-2 outline-none resize-none max-h-32" />
                                    <button type="submit" disabled={isMediaUploading || !inputValue.trim()} className="bg-red-600 text-white p-3 rounded-xl hover:bg-red-700 active:scale-90 transition-all disabled:opacity-50 shadow-lg shadow-red-600/20"><SendIcon className="w-5 h-5" /></button>
                                    <input type="file" ref={mediaInputRef} hidden accept="image/*,video/*" />
                                </form>
                            )}
                        </div>
                    </div>
                )}
            </main>
        </div>
      </div>
      <CreatePostModal isOpen={isCreatePostOpen} onClose={() => setIsCreatePostOpen(false)} />
    </div>
  );
};

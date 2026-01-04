import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUser } from '@clerk/clerk-react';
import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getDatabase, ref, push, onValue, set, update, get, query, limitToLast, remove } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';
import { GlobeAltIcon, SearchIcon, SendIcon, ChevronLeftIcon, ChevronRightIcon, CloseIcon, HomeIcon, MarketIcon, LockIcon, ChatBubbleIcon } from './Icons';
import { Info, Image as ImageIcon, Lock, Bell, User, ShieldCheck, Check, MoreHorizontal, Slash, ShieldAlert } from 'lucide-react';
import { siteConfig } from '../config';

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
const ADMIN_HANDLE = 'studiomuzammil';
const RESTRICTED_HANDLE = 'jiya';
const R2_WORKER_URL = 'https://quiet-haze-1898.fuadeditingzone.workers.dev';

const UserAvatar: React.FC<{ user: Partial<ChatUser>; className?: string; onClick?: (e: React.MouseEvent) => void }> = ({ user, className = "w-10 h-10", onClick }) => {
    const username = user.username || 'guest';
    const firstLetter = username.charAt(0).toUpperCase();
    return (
        <div onClick={onClick} className={`${className} rounded-full border border-white/5 flex-shrink-0 overflow-hidden relative group cursor-pointer bg-zinc-800 flex items-center justify-center transition-transform active:scale-90`}>
            {user.avatar ? <img src={user.avatar} className="w-full h-full object-cover" alt="" /> : <span className="text-white font-black text-lg">{firstLetter}</span>}
        </div>
    );
};

const VerificationBadge: React.FC<{ username?: string }> = ({ username }) => {
    const { user: clerkUser } = useUser();
    if (!username) return null;
    const low = username.toLowerCase();
    const viewerLow = clerkUser?.username?.toLowerCase();
    
    const isOwner = low === OWNER_HANDLE;
    const isAdmin = low === ADMIN_HANDLE;
    const isJiya = low === RESTRICTED_HANDLE;
    const canSeeJiyaBadge = viewerLow === OWNER_HANDLE || viewerLow === RESTRICTED_HANDLE;

    if (isOwner) return <i className="fa-solid fa-circle-check text-red-600 text-[10px] ml-1 fez-verified-badge"></i>;
    if (isAdmin) return <i className="fa-solid fa-circle-check text-blue-500 text-[10px] ml-1 fez-verified-badge"></i>;
    if (isJiya && canSeeJiyaBadge) {
        return (
            <span className="relative inline-flex items-center ml-1 fez-verified-badge" title="Special Verification">
                <i className="fa-solid fa-circle-check text-red-600 text-[10px]"></i>
                <i className="fa-solid fa-circle-check text-blue-500 text-[5px] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"></i>
            </span>
        );
    }
    return null;
};

interface ChatUser { id: string; name: string; username: string; avatar?: string; role?: string; online?: boolean; lastActive?: number; }
interface Message { id?: string; senderId: string; senderName: string; senderUsername?: string; senderAvatar?: string; text?: string; mediaUrl?: string; mediaType?: 'image' | 'video'; timestamp: number; }

export const CommunityChat: React.FC<{ 
  onShowProfile?: (id: string, username?: string) => void; 
  initialTargetUserId?: string | null; 
  onBack?: () => void; 
  onNavigateMarket?: () => void;
  onThreadStateChange?: (active: boolean) => void;
  forceSearchTab?: boolean;
  onSearchTabConsumed?: () => void;
  onOpenPost?: (postId: string, commentId?: string) => void;
}> = ({ onShowProfile, initialTargetUserId, onBack, onNavigateMarket, onThreadStateChange, forceSearchTab, onSearchTabConsumed, onOpenPost }) => {
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
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lastSentTimeRef = useRef<number>(0);

  const isOwner = clerkUser?.username?.toLowerCase() === OWNER_HANDLE;

  useEffect(() => {
    if (forceSearchTab) {
        setSidebarTab('search');
        onSearchTabConsumed?.();
    }
  }, [forceSearchTab, onSearchTabConsumed]);

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
            setNotifications(rawList.sort((a, b) => b.timestamp - a.timestamp));
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

  const isSelectedFriend = useMemo(() => {
    if (!selectedUser) return false;
    return friendsList.includes(selectedUser.id) || selectedUser.username === OWNER_HANDLE;
  }, [selectedUser, friendsList]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!isSignedIn || !chatPath || !clerkUser || !inputValue.trim()) return;

    const now = Date.now();
    if (now - lastSentTimeRef.current < 1000) return;
    lastSentTimeRef.current = now;

    setIsMediaUploading(true);
    
    const newMessage: Message = { 
      senderId: clerkUser.id, 
      senderName: clerkUser.fullName || clerkUser.username || "User", 
      senderUsername: (clerkUser.username || '').toLowerCase(), 
      senderAvatar: clerkUser.imageUrl, 
      text: inputValue.trim(), 
      timestamp: Date.now() 
    };

    try {
        const response = await fetch(`${R2_WORKER_URL}/api/messages`, {
            method: 'POST',
            body: JSON.stringify({ ...newMessage, threadId: chatPath })
        });
        
        if (!response.ok) throw new Error("Hyperdrive Gateway Error");
        setInputValue('');
    } catch (err) {
        try {
            await push(ref(db, chatPath), newMessage);
            setInputValue('');
            if (!isGlobal && selectedUser) {
                await set(ref(db, `users/${clerkUser.id}/conversations/${selectedUser.id}`), true);
                await set(ref(db, `users/${selectedUser.id}/conversations/${clerkUser.id}`), true);
                const unreadRef = ref(db, `users/${selectedUser.id}/unread/${clerkUser.id}`);
                const snap = await get(unreadRef);
                await set(unreadRef, (snap.val() || 0) + 1);
            }
        } catch (fbErr) {
            alert("Broadcast Error: Zone link offline.");
        }
    } finally {
        setIsMediaUploading(false);
    }
  };

  const openChat = (user: ChatUser | null) => {
      setIsDetailsOpen(false);
      if (user === null) { setIsGlobal(true); setSelectedUser(null); setIsMobileChatOpen(true); setActivePreset(siteConfig.api.realtimeKit.presets.LIVESTREAM_VIEWER); }
      else { setIsGlobal(false); setSelectedUser(user); setIsMobileChatOpen(true); setActivePreset(siteConfig.api.realtimeKit.presets.GROUP_GUEST); }
  };

  const navigateToProfile = (userId: string, username: string) => {
    const handle = username.toLowerCase();
    window.history.pushState(null, '', `/@${handle}`);
    onShowProfile?.(userId, handle);
  };

  const maskUser = (u: ChatUser) => {
      if (u.username === RESTRICTED_HANDLE && !isOwner) {
          return { ...u, name: "Community Member", username: "guest", avatar: undefined };
      }
      return u;
  };

  const getTimeAgo = (timestamp?: number) => {
    if (!timestamp) return 'inactive';
    const diff = Date.now() - timestamp;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  const filteredUsers = useMemo(() => {
      if (sidebarTab === 'search') {
          if (!sidebarSearchQuery.trim()) return [];
          return users.filter(u => u.username?.toLowerCase().includes(sidebarSearchQuery.toLowerCase())).map(maskUser);
      }
      const pool = inboxView === 'primary' 
        ? users.filter(u => friendsList.includes(u.id) || u.username === OWNER_HANDLE || u.id === clerkUser?.id)
        : users.filter(u => unreadCounts[u.id] > 0 && !friendsList.includes(u.id));
      return pool.map(maskUser);
  }, [users, sidebarTab, inboxView, sidebarSearchQuery, friendsList, clerkUser?.id, isOwner, unreadCounts]);

  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-black font-sans">
      <div className="flex-1 flex flex-row min-h-0 h-full w-full">
        <nav className="hidden lg:flex flex-col items-center py-10 gap-10 w-20 border-r border-white/5 bg-black flex-shrink-0">
            <button onClick={onBack} className="hover:scale-110 transition-transform"><img src={siteConfig.branding.logoUrl} className="w-8 h-8" alt="" /></button>
            <button onClick={() => { setIsActivityOpen(false); setIsMobileChatOpen(false); setIsDetailsOpen(false); }} className={`p-3 rounded-2xl ${!isActivityOpen && !selectedUser ? 'bg-white text-black' : 'text-zinc-500'}`}><HomeIcon className="w-6 h-6" /></button>
            <button onClick={() => { setIsActivityOpen(true); setActivePreset(siteConfig.api.realtimeKit.presets.LIVESTREAM_VIEWER); }} className={`p-3 rounded-2xl ${isActivityOpen ? 'bg-white text-black' : 'text-zinc-500'}`}><Bell className="w-6 h-6" /></button>
            <button onClick={() => onNavigateMarket()} className="p-3 rounded-2xl text-zinc-500"><MarketIcon className="w-6 h-6" /></button>
        </nav>

        <div className="flex-1 flex flex-row overflow-hidden relative">
            <aside className={`${isMobileChatOpen || isActivityOpen ? 'hidden' : 'flex'} md:flex w-full md:w-[320px] flex-col flex-shrink-0 bg-black border-r border-white/5 min-h-0`}>
                <div className="p-6 space-y-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <h2 className="text-xl font-black text-white lowercase">{(clerkUser?.username || 'user')}</h2>
                        </div>
                        <button onClick={() => setSidebarTab(sidebarTab === 'search' ? 'messages' : 'search')} className={`transition-all ${sidebarTab === 'search' ? 'text-red-600 rotate-90 scale-110' : 'text-white hover:text-red-500'}`}><SearchIcon className="w-5 h-5" /></button>
                    </div>
                    {sidebarTab === 'search' ? (
                        <div className="flex items-center gap-2 animate-fade-in">
                            <button onClick={() => { setSidebarTab('messages'); setSidebarSearchQuery(''); }} className="p-2 bg-white/5 rounded-xl text-zinc-400 hover:text-white transition-colors"><ChevronLeftIcon className="w-5 h-5" /></button>
                            <input autoFocus value={sidebarSearchQuery} onChange={e => setSidebarSearchQuery(e.target.value)} placeholder="Search by name..." className="flex-1 bg-zinc-900 border-none rounded-xl py-3 px-4 text-white text-[10px] outline-none focus:ring-1 focus:ring-red-600/30" />
                        </div>
                    ) : (
                        <div className="flex gap-6 border-b border-white/5">
                            <button onClick={() => setInboxView('primary')} className={`pb-3 text-xs font-black uppercase tracking-widest transition-all ${inboxView === 'primary' ? 'text-white border-b-2 border-white' : 'text-zinc-500'}`}>Primary</button>
                            <button onClick={() => setInboxView('requests')} className={`pb-3 text-xs font-black uppercase tracking-widest transition-all relative ${inboxView === 'requests' ? 'text-white border-b-2 border-white' : 'text-zinc-500'}`}>Requests {filteredUsers.length > 0 && inboxView === 'requests' && <span className="ml-1 bg-red-600 text-white text-[8px] px-1.5 py-0.5 rounded-full">{filteredUsers.length}</span>}</button>
                        </div>
                    )}
                </div>
                <div className="flex-1 overflow-y-auto no-scrollbar space-y-1">
                    {!sidebarSearchQuery && (
                        <button onClick={() => openChat(null)} className={`w-full flex items-center gap-4 px-6 py-4 transition-all ${isGlobal ? 'bg-white/5' : 'hover:bg-zinc-900'}`}>
                            <div className="w-12 h-12 rounded-full bg-red-600/10 flex items-center justify-center border border-red-600/20 text-red-500"><GlobeAltIcon className="w-6 h-6" /></div>
                            <div className="text-left"><p className="text-sm font-bold text-white">Global Feed</p><p className="text-[10px] text-zinc-500 uppercase tracking-widest font-black">Open Network</p></div>
                        </button>
                    )}
                    {filteredUsers.map(u => (
                        <button 
                          key={u.id} 
                          onClick={() => sidebarTab === 'search' ? navigateToProfile(u.id, u.username) : openChat(u)} 
                          className={`w-full flex items-center gap-4 px-6 py-4 transition-all ${selectedUser?.id === u.id && !isGlobal ? 'bg-white/5' : 'hover:bg-zinc-900'}`}
                        >
                            <UserAvatar user={u} className="w-12 h-12" />
                            <div className="text-left flex-1 min-w-0">
                                <p className="text-sm font-bold text-white truncate">{u.name}</p>
                                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest leading-none">@{u.username?.toLowerCase()}</p>
                            </div>
                            {unreadCounts[u.id] > 0 && <div className="w-2.5 h-2.5 bg-red-600 rounded-full animate-pulse shadow-[0_0_8px_red]"></div>}
                        </button>
                    ))}
                </div>
            </aside>

            <main className={`${isMobileChatOpen || isActivityOpen ? 'flex' : 'hidden'} md:flex flex-1 flex-row min-h-0 bg-black relative`}>
                <div className="flex-1 flex flex-col min-h-0 relative">
                    {isActivityOpen ? (
                        <div className="flex-1 flex flex-col h-full bg-black">
                            <div className="p-6 md:p-10 border-b border-white/5 flex items-center justify-between bg-black flex-shrink-0">
                                <h2 className="text-xl md:text-3xl font-black text-white uppercase tracking-[0.2em]">Activity</h2>
                                <button onClick={() => setIsActivityOpen(false)} className="p-2 hover:bg-white/5 rounded-full transition-colors"><CloseIcon className="w-6 h-6 text-white" /></button>
                            </div>
                            <div className="flex-1 overflow-y-auto no-scrollbar space-y-1">
                                {notifications.length === 0 ? <div className="h-full flex flex-col items-center justify-center opacity-20"><p className="text-sm uppercase font-black tracking-[0.5em]">No Activity</p></div> : notifications.map(n => (
                                    <div key={n.id} onClick={() => n.fromId && navigateToProfile(n.fromId, (users.find(u => u.id === n.fromId)?.username || n.fromName || 'guest'))} className="p-8 border-b border-white/5 bg-black hover:bg-zinc-900 cursor-pointer">
                                        <p className="text-sm md:text-lg text-white font-bold">{n.text}</p>
                                        <p className="text-[10px] text-zinc-600 uppercase mt-2 tracking-widest">{new Date(n.timestamp).toLocaleTimeString()}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : !selectedUser && !isGlobal ? (
                        <div className="flex-1 flex flex-col items-center justify-center p-10 opacity-20 text-center">
                            <ChatBubbleIcon className="w-16 h-16 mb-6" />
                            <p className="text-xs uppercase font-black tracking-widest">Select a channel to enter</p>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col min-h-0 h-full">
                            <div className="p-4 md:p-6 flex items-center justify-between border-b border-white/5 bg-black/40 backdrop-blur-xl z-10 px-2.5">
                                <div className="flex items-center gap-4">
                                    <button onClick={() => setIsMobileChatOpen(false)} className="md:hidden p-2 bg-white/5 rounded-lg"><ChevronLeftIcon className="w-5 h-5 text-white" /></button>
                                    <div onClick={() => { if (!isGlobal && selectedUser) navigateToProfile(selectedUser.id, (users.find(u => u.id === selectedUser.id)?.username || selectedUser.username)); }} className="flex items-center gap-3 cursor-pointer group">
                                        {isGlobal ? <div className="w-10 h-10 rounded-full bg-red-600/10 flex items-center justify-center text-red-500 border border-red-600/20"><GlobeAltIcon className="w-5 h-5" /></div> : <UserAvatar user={users.find(u => u.id === selectedUser?.id) || selectedUser!} className="w-10 h-10" />}
                                        <div className="min-w-0">
                                            <div className="flex items-center">
                                                <h3 className="text-sm font-black text-white uppercase truncate leading-none mb-1 group-hover:text-red-500 transition-colors">{isGlobal ? 'Global Feed' : (users.find(u => u.id === selectedUser?.id)?.username || selectedUser?.username)?.toLowerCase()}</h3>
                                                {!isGlobal && <VerificationBadge username={users.find(u => u.id === selectedUser?.id)?.username || selectedUser?.username} />}
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <div className={`w-1.5 h-1.5 rounded-full ${isGlobal || (users.find(u => u.id === selectedUser?.id)?.online) ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,1)] animate-pulse' : 'bg-zinc-600'}`}></div>
                                                <p className="text-[8px] text-zinc-500 font-bold uppercase tracking-widest leading-none">
                                                  {isGlobal ? 'Open Public Network' : (users.find(u => u.id === selectedUser?.id)?.online ? 'Active' : `Active ${getTimeAgo(users.find(u => u.id === selectedUser?.id)?.lastActive)}`)}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    {!isGlobal && (
                                        <button onClick={() => setIsDetailsOpen(!isDetailsOpen)} className={`p-2.5 rounded-xl transition-all flex items-center justify-center ${isDetailsOpen ? 'bg-red-600 text-white' : 'text-zinc-400 hover:text-white hover:bg-white/5'}`}><Info size={20} /></button>
                                    )}
                                </div>
                            </div>

                            <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar px-2.5 pb-10 pt-6 space-y-8">
                                {messages.map((m, i) => {
                                    const isMe = m.senderId === clerkUser?.id;
                                    const isMsgRestricted = m.senderUsername === RESTRICTED_HANDLE && !isOwner;
                                    
                                    const currentSender = users.find(u => u.id === m.senderId);
                                    const sender = isMsgRestricted 
                                        ? { name: 'Community Member', username: 'guest', avatar: undefined } 
                                        : { 
                                            name: currentSender?.name || m.senderName || 'Guest', 
                                            username: currentSender?.username || m.senderUsername || 'guest', 
                                            avatar: currentSender?.avatar || m.senderAvatar 
                                          };
                                    
                                    return (
                                        <div key={m.id || i} className={`flex gap-3 ${isMe ? 'flex-row-reverse' : 'flex-row'} items-end group`}>
                                            <UserAvatar user={sender} className="w-8 h-8" onClick={() => { if(!isMsgRestricted && m.senderId) navigateToProfile(m.senderId, sender.username!); }} />
                                            <div className={`max-w-[85%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                                <div className="flex items-center gap-1.5 mb-1.5 px-1 cursor-pointer group/msg" onClick={() => { if(!isMsgRestricted && m.senderId) navigateToProfile(m.senderId, sender.username!); }}>
                                                    <span className="text-[9px] font-black text-zinc-500 uppercase tracking-[0.2em] group-hover/msg:text-white transition-colors">{sender.username?.toLowerCase()}</span>
                                                    <VerificationBadge username={sender.username} />
                                                </div>
                                                <div className={`px-4 py-3 rounded-2xl text-[13px] md:text-sm font-medium leading-relaxed break-all whitespace-pre-wrap shadow-lg ${isMe ? 'bg-red-600 text-white rounded-br-none' : 'bg-zinc-900 text-zinc-200 rounded-bl-none border border-white/5'}`}>{m.text}</div>
                                                <span className="text-[7px] text-zinc-700 font-black uppercase mt-1.5 tracking-widest">{new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                            </div>
                                        </div>
                                    );
                                })}
                                <div ref={messagesEndRef} />
                            </div>

                            <div className={`p-4 md:p-6 border-t border-white/5 bg-black px-2.5 ${isMobileChatOpen && (selectedUser || isGlobal) ? 'pb-6 md:pb-6' : 'pb-24 md:pb-6'}`}>
                                {!isGlobal && !isSelectedFriend ? (
                                    <div className="bg-zinc-900 border border-white/5 p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
                                        <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] text-center md:text-left">Thread Connection Required</p>
                                        <button className="w-full md:w-auto bg-red-600 text-white px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all shadow-lg shadow-red-600/20">Connect</button>
                                    </div>
                                ) : (
                                    <form onSubmit={handleSendMessage} className="flex items-center gap-3 bg-zinc-900 border border-white/10 rounded-2xl p-2.5 focus-within:border-red-600/40 transition-all shadow-2xl max-w-6xl mx-auto w-full">
                                        <textarea 
                                          ref={textareaRef} 
                                          value={inputValue} 
                                          onChange={e => setInputValue(e.target.value)} 
                                          onKeyDown={e => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }} 
                                          placeholder="Type a message..." 
                                          rows={1} 
                                          className="flex-1 bg-transparent border-none text-sm text-white py-2 px-2 outline-none resize-none max-h-32 min-h-[40px]" 
                                        />
                                        <button type="submit" disabled={isMediaUploading || !inputValue.trim()} className="bg-red-600 text-white p-2.5 rounded-xl hover:bg-red-700 active:scale-90 transition-all disabled:opacity-50 shadow-lg shadow-red-600/20 flex-shrink-0"><SendIcon className="w-5 h-5" /></button>
                                    </form>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <AnimatePresence>
                  {isDetailsOpen && selectedUser && !isGlobal && (
                    <motion.aside 
                      initial={{ x: '100%', opacity: 0 }} 
                      animate={{ x: 0, opacity: 1 }} 
                      exit={{ x: '100%', opacity: 0 }}
                      className="absolute md:relative right-0 inset-y-0 w-full md:w-[320px] bg-black border-l border-white/5 z-50 flex flex-col overflow-hidden shadow-2xl"
                    >
                      <div className="p-6 border-b border-white/5 flex items-center justify-between">
                         <h2 className="text-xs font-black text-white uppercase tracking-[0.2em]">Details</h2>
                         <button onClick={() => setIsDetailsOpen(false)} className="p-1 hover:bg-white/5 rounded-full"><CloseIcon className="w-5 h-5 text-zinc-500" /></button>
                      </div>
                      <div className="flex-1 overflow-y-auto no-scrollbar p-8 text-center space-y-10">
                         <div className="flex flex-col items-center gap-4">
                            <div className="w-24 h-24 rounded-full border-2 border-red-600 p-1">
                                <img src={users.find(u => u.id === selectedUser.id)?.avatar || selectedUser.avatar || siteConfig.branding.logoUrl} className="w-full h-full object-cover rounded-full" alt="" />
                            </div>
                            <div>
                               <div className="flex items-center justify-center gap-1">
                                  <h3 className="text-lg font-black text-white uppercase tracking-tighter">{users.find(u => u.id === selectedUser.id)?.name || selectedUser.name}</h3>
                                  <VerificationBadge username={users.find(u => u.id === selectedUser.id)?.username || selectedUser.username} />
                               </div>
                               <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-1">@{ (users.find(u => u.id === selectedUser.id)?.username || selectedUser.username)?.toLowerCase() }</p>
                            </div>
                            <button onClick={() => navigateToProfile(selectedUser.id, selectedUser.username)} className="bg-white text-black px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all">View Profile</button>
                         </div>

                         <div className="space-y-6 text-left">
                            <div className="space-y-3">
                               <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest ml-1">Chat Settings</p>
                               <div className="bg-zinc-900/50 rounded-2xl border border-white/5 overflow-hidden">
                                  <button className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-all border-b border-white/5">
                                     <div className="flex items-center gap-3 text-zinc-300"><Lock size={16} /><span className="text-[10px] font-bold uppercase">Lock Chat</span></div>
                                     <div className="w-8 h-4 bg-zinc-800 rounded-full relative"><div className="absolute left-1 top-1 w-2 h-2 bg-zinc-600 rounded-full"></div></div>
                                  </button>
                                  <button onClick={() => navigateToProfile(selectedUser.id, selectedUser.username)} className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-all border-b border-white/5">
                                     <div className="flex items-center gap-3 text-zinc-300"><ShieldCheck size={16} /><span className="text-[10px] font-bold uppercase">Change Passcode</span></div>
                                     <ChevronRightIcon className="w-4 h-4 text-zinc-700" />
                                  </button>
                                  <button className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-all">
                                     <div className="flex items-center gap-3 text-zinc-300"><Bell size={16} /><span className="text-[10px] font-bold uppercase">Mute Messages</span></div>
                                     <div className="w-8 h-4 bg-zinc-800 rounded-full relative"><div className="absolute left-1 top-1 w-2 h-2 bg-zinc-600 rounded-full"></div></div>
                                  </button>
                               </div>
                            </div>

                            <div className="space-y-3">
                               <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest ml-1">Privacy & Safety</p>
                               <div className="bg-zinc-900/50 rounded-2xl border border-white/5 overflow-hidden">
                                  <button className="w-full p-4 flex items-center justify-between hover:bg-red-600/10 transition-all text-red-500">
                                     <div className="flex items-center gap-3"><ShieldAlert size={16} /><span className="text-[10px] font-bold uppercase">Block Member</span></div>
                                     <Slash size={14} className="opacity-50" />
                                  </button>
                               </div>
                            </div>
                         </div>
                      </div>
                      <div className="p-8 text-center opacity-20 border-t border-white/5">
                         <p className="text-[8px] font-black uppercase tracking-[0.4em]">Encrypted Interaction</p>
                      </div>
                    </motion.aside>
                  )}
                </AnimatePresence>
            </main>
        </div>
      </div>
    </div>
  );
};
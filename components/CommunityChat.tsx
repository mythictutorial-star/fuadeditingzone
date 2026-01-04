import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUser } from '@clerk/clerk-react';
import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getDatabase, ref, push, onValue, set, update, get, query, limitToLast, remove } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';
import { GlobeAltIcon, SearchIcon, SendIcon, ChevronLeftIcon, CloseIcon, HomeIcon, MarketIcon, LockIcon, ChatBubbleIcon } from './Icons';
import { Phone, Video, Image as ImageIcon, Lock, Bell } from 'lucide-react';
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
const ADMIN_HANDLE = 'studiomuzammil';
const RESTRICTED_HANDLE = 'jiya';

const UserAvatar: React.FC<{ user: Partial<ChatUser>; className?: string; onClick?: (e: React.MouseEvent) => void }> = ({ user, className = "w-10 h-10", onClick }) => {
    const username = user.username || 'guest';
    const firstLetter = username.charAt(0).toUpperCase();
    return (
        <div onClick={onClick} className={`${className} rounded-full border border-white/5 flex-shrink-0 overflow-hidden relative group cursor-pointer bg-zinc-800 flex items-center justify-center`}>
            {user.avatar ? <img src={user.avatar} className="w-full h-full object-cover" alt="" /> : <span className="text-white font-black text-lg">{firstLetter}</span>}
        </div>
    );
};

const VerificationBadge: React.FC<{ username?: string }> = ({ username }) => {
    if (!username) return null;
    const low = username.toLowerCase();
    const isOwner = low === OWNER_HANDLE;
    const isAdmin = low === ADMIN_HANDLE;
    if (!isOwner && !isAdmin) return null;
    const delay = (username.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % 60);
    return (
        <i style={{ animationDelay: `-${delay}s` }} className={`fa-solid fa-circle-check ${isOwner ? 'text-red-600' : 'text-blue-500'} text-[10px] ml-1 fez-verified-badge`}></i>
    );
};

const ConnectionStatus: React.FC<{ activePreset?: string }> = ({ activePreset }) => {
    const presets = siteConfig.api.realtimeKit.presets;
    const isLive = activePreset === presets.LIVESTREAM_HOST || activePreset === presets.LIVESTREAM_VIEWER;
    const isGroup = activePreset === presets.GROUP_HOST || activePreset === presets.GROUP_GUEST;
    return (
        <div className="flex items-center gap-2 px-1.5 py-1 bg-white/5 rounded-full border border-white/10">
            <div className={`w-2.5 h-2.5 rounded-full animate-pulse shadow-[0_0_8px] ${isLive ? 'bg-red-600 shadow-red-600' : isGroup ? 'bg-blue-600 shadow-blue-600' : 'bg-zinc-600 shadow-zinc-600'}`}></div>
        </div>
    );
};

interface ChatUser { id: string; name: string; username: string; avatar?: string; role?: string; online?: boolean; }
interface Message { id?: string; senderId: string; senderName: string; senderUsername?: string; senderAvatar?: string; text?: string; mediaUrl?: string; mediaType?: 'image' | 'video'; timestamp: number; }

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
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);
  const [showLockAlert, setShowLockAlert] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
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
    setIsMediaUploading(true);
    try {
        const newMessage: Message = { 
          senderId: clerkUser.id, 
          senderName: clerkUser.fullName || clerkUser.username || "User", 
          senderUsername: (clerkUser.username || '').toLowerCase(), 
          senderAvatar: clerkUser.imageUrl, 
          text: inputValue.trim(), 
          timestamp: Date.now() 
        };
        setInputValue('');
        await push(ref(db, chatPath), newMessage);
        if (!isGlobal && selectedUser) {
            await set(ref(db, `users/${clerkUser.id}/conversations/${selectedUser.id}`), true);
            await set(ref(db, `users/${selectedUser.id}/conversations/${clerkUser.id}`), true);
            const unreadRef = ref(db, `users/${selectedUser.id}/unread/${clerkUser.id}`);
            const snap = await get(unreadRef);
            await set(unreadRef, (snap.val() || 0) + 1);
        }
    } catch (err) { alert("Zone Error: Message failed to broadcast."); } finally { setIsMediaUploading(false); }
  };

  const handleAcceptRequest = async () => {
    if (!clerkUser || !selectedUser) return;
    await set(ref(db, `social/${clerkUser.id}/friends/${selectedUser.id}`), true);
    await set(ref(db, `social/${selectedUser.id}/friends/${clerkUser.id}`), true);
    await push(ref(db, `notifications/${selectedUser.id}`), { type: 'friend_accepted', fromId: clerkUser.id, fromName: (clerkUser.username || clerkUser.fullName || '').toLowerCase(), text: `@${(clerkUser.username || clerkUser.fullName || '').toLowerCase()} joined your circle`, timestamp: Date.now(), read: false });
  };

  const handleCallAttempt = () => {
    if (isSelectedFriend) {
        setActivePreset(siteConfig.api.realtimeKit.presets.GROUP_HOST);
    } else {
        setShowLockAlert(true);
        setTimeout(() => setShowLockAlert(false), 3000);
    }
  };

  const openChat = (user: ChatUser | null) => {
      if (user === null) { setIsGlobal(true); setSelectedUser(null); setIsMobileChatOpen(true); setActivePreset(siteConfig.api.realtimeKit.presets.LIVESTREAM_VIEWER); }
      else { setIsGlobal(false); setSelectedUser(user); setIsMobileChatOpen(true); setActivePreset(siteConfig.api.realtimeKit.presets.GROUP_GUEST); }
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
          return users.filter(u => u.username?.toLowerCase().includes(sidebarSearchQuery.toLowerCase())).map(maskUser);
      }
      const pool = inboxView === 'primary' 
        ? users.filter(u => friendsList.includes(u.id) || u.username === OWNER_HANDLE || u.id === clerkUser?.id)
        : users.filter(u => unreadCounts[u.id] > 0 && !friendsList.includes(u.id));
      return pool.map(maskUser);
  }, [users, sidebarTab, inboxView, sidebarSearchQuery, friendsList, clerkUser?.id, isOwner, unreadCounts]);

  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-black font-sans px-2.5 md:px-0">
      <div className="flex-1 flex flex-row min-h-0 h-full w-full">
        {/* Nav Bar */}
        <nav className="hidden lg:flex flex-col items-center py-10 gap-10 w-20 border-r border-white/5 bg-black flex-shrink-0">
            <button onClick={onBack} className="hover:scale-110 transition-transform"><img src={siteConfig.branding.logoUrl} className="w-8 h-8" alt="" /></button>
            <button onClick={() => { setIsActivityOpen(false); setIsMobileChatOpen(false); }} className={`p-3 rounded-2xl ${!isActivityOpen && !selectedUser ? 'bg-white text-black' : 'text-zinc-500'}`}><HomeIcon className="w-6 h-6" /></button>
            <button onClick={() => { setIsActivityOpen(true); setActivePreset(siteConfig.api.realtimeKit.presets.LIVESTREAM_VIEWER); }} className={`p-3 rounded-2xl ${isActivityOpen ? 'bg-white text-black' : 'text-zinc-500'}`}><Bell className="w-6 h-6" /></button>
            <button onClick={() => onNavigateMarket()} className="p-3 rounded-2xl text-zinc-500"><MarketIcon className="w-6 h-6" /></button>
        </nav>

        <div className="flex-1 flex flex-row overflow-hidden relative">
            <aside className={`${isMobileChatOpen || isActivityOpen ? 'hidden' : 'flex'} md:flex w-full md:w-[320px] flex-col flex-shrink-0 bg-black border-r border-white/5 min-h-0`}>
                <div className="p-6 space-y-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <button onClick={onBack} className="md:hidden p-2 bg-white/5 rounded-lg text-white hover:text-red-500 transition-colors"><HomeIcon className="w-5 h-5"/></button>
                            <h2 className="text-xl font-black text-white lowercase">{(clerkUser?.username || 'user')}</h2>
                        </div>
                        <button onClick={() => setSidebarTab(sidebarTab === 'search' ? 'messages' : 'search')} className="text-white hover:text-red-500 transition-colors"><SearchIcon className="w-5 h-5" /></button>
                    </div>
                    {sidebarTab === 'search' && <input value={sidebarSearchQuery} onChange={e => setSidebarSearchQuery(e.target.value)} placeholder="Type a name..." className="w-full bg-zinc-900 border-none rounded-xl py-3 px-4 text-white text-[10px] outline-none focus:ring-1 focus:ring-red-600/30" />}
                    <div className="flex gap-6 border-b border-white/5">
                        <button onClick={() => setInboxView('primary')} className={`pb-3 text-xs font-black uppercase tracking-widest transition-all ${inboxView === 'primary' ? 'text-white border-b-2 border-white' : 'text-zinc-500'}`}>Threads</button>
                        <button onClick={() => setInboxView('requests')} className={`pb-3 text-xs font-black uppercase tracking-widest transition-all relative ${inboxView === 'requests' ? 'text-white border-b-2 border-white' : 'text-zinc-500'}`}>Requests {filteredUsers.length > 0 && inboxView === 'requests' && <span className="ml-1 bg-red-600 text-white text-[8px] px-1.5 py-0.5 rounded-full">{filteredUsers.length}</span>}</button>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto no-scrollbar space-y-1">
                    <button onClick={() => openChat(null)} className={`w-full flex items-center gap-4 px-6 py-4 transition-all ${isGlobal ? 'bg-white/5' : 'hover:bg-zinc-900'}`}>
                        <div className="w-12 h-12 rounded-full bg-red-600/10 flex items-center justify-center border border-red-600/20 text-red-500"><GlobeAltIcon className="w-6 h-6" /></div>
                        <div className="text-left"><p className="text-sm font-bold text-white">Public Hub</p><p className="text-[10px] text-zinc-500 uppercase tracking-widest font-black">Broadcast</p></div>
                    </button>
                    {filteredUsers.map(u => (
                        <button key={u.id} onClick={() => openChat(u)} className={`w-full flex items-center gap-4 px-6 py-4 transition-all ${selectedUser?.id === u.id && !isGlobal ? 'bg-white/5' : 'hover:bg-zinc-900'}`}>
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

            <main className={`${isMobileChatOpen || isActivityOpen ? 'flex' : 'hidden'} md:flex flex-1 flex-col min-h-0 bg-black relative`}>
                <AnimatePresence>
                    {showLockAlert && (
                        <motion.div initial={{ opacity: 0, scale: 0.9, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }} className="absolute top-24 right-6 z-[60] bg-red-600/90 backdrop-blur-xl border border-red-500 p-4 rounded-2xl shadow-2xl">
                            <p className="text-[10px] font-black uppercase tracking-widest text-white">Connect to Unlock Calls</p>
                        </motion.div>
                    )}
                </AnimatePresence>

                {isActivityOpen ? (
                    <div className="flex-1 flex flex-col h-full bg-black">
                        <div className="p-6 md:p-10 border-b border-white/5 flex items-center justify-between bg-black flex-shrink-0 px-2.5">
                            <h2 className="text-xl md:text-3xl font-black text-white uppercase tracking-[0.2em]">Activity</h2>
                            <button onClick={() => setIsActivityOpen(false)} className="p-2 hover:bg-white/5 rounded-full transition-colors"><CloseIcon className="w-6 h-6 text-white" /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto no-scrollbar space-y-1">
                            {notifications.length === 0 ? <div className="h-full flex items-center justify-center opacity-20"><p className="text-sm uppercase font-black tracking-[0.5em]">No History</p></div> : notifications.map(n => (
                                <div key={n.id} onClick={() => n.fromId && onShowProfile?.(n.fromId)} className="p-8 border-b border-white/5 bg-black hover:bg-zinc-900 cursor-pointer">
                                    <p className="text-sm md:text-lg text-white font-bold">{n.text}</p>
                                    <p className="text-[10px] text-zinc-600 uppercase mt-2 tracking-widest">{new Date(n.timestamp).toLocaleTimeString()}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : !selectedUser && !isGlobal ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-10 opacity-20 text-center px-2.5">
                        <ChatBubbleIcon className="w-16 h-16 mb-6" />
                        <p className="text-xs uppercase font-black tracking-widest">Select a channel to enter</p>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col min-h-0 h-full">
                        <div className="p-4 md:p-8 flex items-center justify-between border-b border-white/5 bg-black/40 backdrop-blur-xl z-10 px-2.5">
                            <div className="flex items-center gap-4">
                                <button onClick={() => setIsMobileChatOpen(false)} className="md:hidden p-2 bg-white/5 rounded-lg"><ChevronLeftIcon className="w-5 h-5 text-white" /></button>
                                <div onClick={() => { if (!isGlobal) { const masked = maskUser(selectedUser!); if (masked.username !== 'masked_member') onShowProfile?.(selectedUser!.id, masked.username); } }} className="flex items-center gap-3 cursor-pointer">
                                    {isGlobal ? <div className="w-10 h-10 rounded-full bg-red-600/10 flex items-center justify-center text-red-500 border border-red-600/20"><GlobeAltIcon className="w-5 h-5" /></div> : <UserAvatar user={maskUser(selectedUser!)} className="w-10 h-10" />}
                                    <div className="min-w-0">
                                        <div className="flex items-center">
                                            <h3 className="text-sm font-black text-white uppercase truncate leading-none mb-1">{isGlobal ? 'Public Hub' : maskUser(selectedUser!).name}</h3>
                                            {!isGlobal && <VerificationBadge username={maskUser(selectedUser!).username} />}
                                        </div>
                                        <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest leading-none">{isGlobal ? 'Zone Broadcast' : `@${maskUser(selectedUser!).username?.toLowerCase()}`}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <ConnectionStatus activePreset={activePreset} />
                                {!isGlobal && (
                                    <div className="flex items-center gap-2">
                                        <button onClick={handleCallAttempt} className={`p-2.5 rounded-xl transition-all flex items-center justify-center relative ${isSelectedFriend ? 'bg-white/5 hover:bg-blue-600 text-white shadow-lg' : 'bg-white/5 text-zinc-700 opacity-50'}`}><Phone size={18}/>{!isSelectedFriend && <Lock size={8} className="absolute top-1 right-1 text-red-600" />}</button>
                                        <button onClick={handleCallAttempt} className={`p-2.5 rounded-xl transition-all flex items-center justify-center relative ${isSelectedFriend ? 'bg-white/5 hover:bg-blue-600 text-white shadow-lg' : 'bg-white/5 text-zinc-700 opacity-50'}`}><Video size={18}/>{!isSelectedFriend && <Lock size={8} className="absolute top-1 right-1 text-red-600" />}</button>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar p-6 space-y-6 px-2.5 md:px-10">
                            {messages.map((m, i) => {
                                const isMe = m.senderId === clerkUser?.id;
                                const isMsgRestricted = m.senderUsername === RESTRICTED_HANDLE && !isOwner;
                                const sender = isMsgRestricted ? { name: 'Community Member', username: 'guest', avatar: undefined } : { name: m.senderName || 'Guest', username: m.senderUsername || 'guest', avatar: m.senderAvatar };
                                
                                return (
                                    <div key={m.id || i} className={`flex gap-3 ${isMe ? 'flex-row-reverse' : 'flex-row'} items-end group`}>
                                        <UserAvatar user={sender} className="w-8 h-8 md:w-9 md:h-9" onClick={() => { if(!isMsgRestricted && m.senderId) onShowProfile?.(m.senderId, m.senderUsername); }} />
                                        <div className={`max-w-[85%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                            <div className="flex items-center gap-1.5 mb-1 px-1 cursor-pointer" onClick={() => { if(!isMsgRestricted && m.senderId) onShowProfile?.(m.senderId, m.senderUsername); }}>
                                                <span className="text-[8px] md:text-[9px] font-black text-zinc-500 uppercase tracking-widest">{sender.name}</span>
                                                <VerificationBadge username={sender.username} />
                                            </div>
                                            <div className={`px-4 py-3 rounded-2xl text-xs md:text-sm font-medium leading-relaxed break-all whitespace-pre-wrap shadow-lg ${isMe ? 'bg-red-600 text-white rounded-br-none' : 'bg-zinc-900 text-zinc-200 rounded-bl-none border border-white/5'}`}>{m.text}</div>
                                            <span className="text-[7px] text-zinc-700 font-black uppercase mt-1 tracking-widest">{new Date(m.timestamp).toLocaleTimeString()}</span>
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={messagesEndRef} />
                        </div>

                        <div className="p-6 border-t border-white/5 bg-black pb-6 px-2.5">
                            {!isGlobal && !isSelectedFriend ? (
                                <div className="bg-zinc-900 border border-white/5 p-4 rounded-2xl flex items-center justify-between shadow-xl">
                                    <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Restricted Thread</p>
                                    <button onClick={handleAcceptRequest} className="bg-red-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all shadow-lg shadow-red-600/20">Connect</button>
                                </div>
                            ) : (
                                <form onSubmit={handleSendMessage} className="flex items-center gap-3 bg-zinc-900 border border-white/10 rounded-2xl p-2 focus-within:border-red-600/40 transition-all shadow-xl max-w-5xl mx-auto">
                                    <button type="button" onClick={() => mediaInputRef.current?.click()} className="p-3 text-zinc-500 hover:text-white transition-colors"><ImageIcon size={18}/></button>
                                    <textarea ref={textareaRef} value={inputValue} onChange={e => setInputValue(e.target.value)} onKeyDown={e => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }} placeholder="Message..." rows={1} className="flex-1 bg-transparent border-none text-sm text-white py-2 outline-none resize-none max-h-32" />
                                    <button type="submit" disabled={isMediaUploading || !inputValue.trim()} className="bg-red-600 text-white p-3 rounded-xl hover:bg-red-700 active:scale-90 transition-all shadow-lg shadow-red-600/20"><SendIcon className="w-5 h-5" /></button>
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

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUser, SignInButton, useClerk } from '@clerk/clerk-react';
import { ref, push, onValue, set, update, get, query, limitToLast, remove } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';
import { db } from '../firebase'; // Using centralized Singleton DB
import { GlobeAltIcon, SearchIcon, ChevronLeftIcon, CloseIcon, HomeIcon, MarketIcon, ChevronRightIcon } from './Icons';
import { SidebarSubNav } from './Sidebar';
import { ArrowLeft, Edit, MessageSquare, Bell, Check, Trash2, Info, Volume2, VolumeX, ShieldAlert, UserMinus, KeyRound, Fingerprint, Lock, Unlock, AlertTriangle, X, PlusSquare } from 'lucide-react';
import { siteConfig } from '../config';
import { CreatePostModal } from './CreatePostModal';

const OWNER_HANDLE = 'fuadeditingzone';
const ADMIN_HANDLE = 'studiomuzammil';
const RESTRICTED_HANDLE = 'jiya';

interface ChatUser {
  id: string;
  name: string;
  username: string;
  avatar?: string;
  role?: string;
  online?: boolean;
}

interface Message {
  id?: string;
  senderId: string;
  senderName: string;
  senderUsername?: string;
  senderAvatar?: string;
  text: string;
  timestamp: number;
}

const UserAvatar: React.FC<{ user: Partial<ChatUser>; className?: string; onClick?: (e: React.MouseEvent) => void }> = ({ user, className = "w-10 h-10", onClick }) => {
    const username = user.username || 'user';
    const firstLetter = username.charAt(0).toUpperCase();
    const bgColors = ['bg-red-500', 'bg-blue-500', 'bg-purple-500', 'bg-orange-500', 'bg-indigo-500'];
    const bgClass = bgColors[username.length % bgColors.length];

    return (
        <div onClick={onClick} className={`${className} rounded-full border border-white/5 flex-shrink-0 overflow-hidden relative cursor-pointer ${user.avatar ? '' : bgClass + ' flex items-center justify-center'}`}>
            {user.avatar ? <img src={user.avatar} className="w-full h-full object-cover" alt="" /> : <span className="text-white font-black text-lg">{firstLetter}</span>}
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
}> = ({ onShowProfile, initialTargetUserId, onBack, onNavigateMarket, forceSearchTab, onSearchTabConsumed, onThreadStateChange }) => {
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
  const [conversations, setConversations] = useState<Record<string, boolean>>({});
  const [mutedUsers, setMutedUsers] = useState<Record<string, boolean>>({});
  const [blockedByMe, setBlockedByMe] = useState<Record<string, boolean>>({});
  const [lockedChats, setLockedChats] = useState<Record<string, boolean>>({});
  const [notifications, setNotifications] = useState<any[]>([]);
  
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);
  const [isActivityOpen, setIsActivityOpen] = useState(false);
  const [isChatInfoOpen, setIsChatInfoOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    onThreadStateChange?.(isMobileChatOpen && (!!selectedUser || isGlobal));
  }, [isMobileChatOpen, selectedUser, isGlobal, onThreadStateChange]);

  useEffect(() => {
    const unsubUsers = onValue(ref(db, 'users'), (snapshot) => {
      const data = snapshot.val();
      if (data) setUsers(Object.values(data) as ChatUser[]);
    });

    if (clerkUser) {
        onValue(ref(db, `social/${clerkUser.id}/friends`), (snap) => setFriendsList(snap.exists() ? Object.keys(snap.val()) : []));
        onValue(ref(db, `users/${clerkUser.id}/unread`), (snap) => setUnreadCounts(snap.val() || {}));
        onValue(ref(db, `users/${clerkUser.id}/conversations`), (snap) => setConversations(snap.val() || {}));
        onValue(ref(db, `users/${clerkUser.id}/muted`), (snap) => setMutedUsers(snap.val() || {}));
        onValue(ref(db, `users/${clerkUser.id}/blocked`), (snap) => setBlockedByMe(snap.val() || {}));
        onValue(ref(db, `users/${clerkUser.id}/locked_chats`), (snap) => setLockedChats(snap.val() || {}));
        onValue(ref(db, `notifications/${clerkUser.id}`), (snap) => {
            const data = snap.val() || {};
            setNotifications(Object.entries(data).map(([id, val]: [string, any]) => ({ id, ...val })).sort((a, b) => b.timestamp - a.timestamp));
        });
    }

    return () => unsubUsers();
  }, [clerkUser]);

  const chatPath = useMemo(() => {
    if (isGlobal) return 'community/global';
    if (!clerkUser?.id || !selectedUser?.id) return null;
    return `messages/${[clerkUser.id, selectedUser.id].sort().join('_')}`;
  }, [isGlobal, clerkUser?.id, selectedUser?.id]);

  useEffect(() => {
    if (!chatPath) return;
    const unsub = onValue(query(ref(db, chatPath), limitToLast(50)), (snap) => {
        const data = snap.val();
        if (data) {
            setMessages(Object.entries(data).map(([id, val]: [string, any]) => ({ id, ...val })).sort((a, b) => a.timestamp - b.timestamp));
        } else {
            setMessages([]);
        }
    });
    if (!isGlobal && selectedUser && clerkUser) {
        update(ref(db, `users/${clerkUser.id}/unread`), { [selectedUser.id]: 0 });
    }
    return () => unsub();
  }, [chatPath, isGlobal, selectedUser?.id, clerkUser?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const text = inputValue.trim();
    if (!isSignedIn || !chatPath || !clerkUser || !text) return;
    
    try {
        const newMessage: Message = { 
          senderId: clerkUser.id, 
          senderName: clerkUser.fullName || clerkUser.username || "User", 
          senderUsername: (clerkUser.username || '').toLowerCase(),
          senderAvatar: clerkUser.imageUrl,
          text: text,
          timestamp: Date.now() 
        };
        
        setInputValue('');
        if (textareaRef.current) textareaRef.current.style.height = 'auto';
        
        await push(ref(db, chatPath), newMessage);
        
        if (!isGlobal && selectedUser) {
            await set(ref(db, `users/${clerkUser.id}/conversations/${selectedUser.id}`), true);
            await set(ref(db, `users/${selectedUser.id}/conversations/${clerkUser.id}`), true);
            const recipientUnreadRef = ref(db, `users/${selectedUser.id}/unread/${clerkUser.id}`);
            get(recipientUnreadRef).then(snap => set(recipientUnreadRef, (snap.val() || 0) + 1));
        }
    } catch (err) {
        console.error("Text Send Error:", err);
        alert("Full Reset Triggered: Connection Failed.");
    }
  };

  const openChat = (user: ChatUser | null) => {
      if (user === null) { setIsGlobal(true); setSelectedUser(null); }
      else { setIsGlobal(false); setSelectedUser(user); }
      setIsMobileChatOpen(true);
  };

  const filteredUsers = useMemo(() => {
    const base = users.filter(u => clerkUser?.id !== u.id && !blockedByMe[u.id]);
    if (sidebarTab === 'search') {
        return base.filter(u => u.name?.toLowerCase().includes(sidebarSearchQuery.toLowerCase()));
    }
    const talkIds = Object.keys(conversations);
    return base.filter(u => talkIds.includes(u.id) || u.username === OWNER_HANDLE);
  }, [users, clerkUser, sidebarTab, sidebarSearchQuery, conversations, blockedByMe]);

  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-black font-sans px-4 md:px-0">
      <div className="flex-1 flex flex-row min-h-0 h-full w-full">
        
        <nav className="hidden lg:flex flex-col items-center py-10 gap-12 w-20 flex-shrink-0 border-r border-white/10 bg-black z-[100] fixed left-0 top-0 bottom-0">
            <button onClick={onBack} className="text-white hover:scale-110 mb-4"><HomeIcon className="w-6 h-6" /></button>
            <div className="flex flex-col gap-6">
                <button onClick={() => { setSidebarTab('messages'); setSelectedUser(null); }} className={`p-3.5 rounded-2xl ${sidebarTab === 'messages' && !selectedUser ? 'bg-white text-black' : 'text-zinc-500'}`}><MessageSquare className="w-6 h-6" /></button>
                <button onClick={() => setSidebarTab('search')} className={`p-3.5 rounded-2xl ${sidebarTab === 'search' ? 'bg-white text-black' : 'text-zinc-500'}`}><SearchIcon className="w-6 h-6" /></button>
                <button onClick={() => setIsActivityOpen(true)} className="p-3.5 rounded-2xl text-zinc-500"><Bell className="w-6 h-6" /></button>
            </div>
            <div className="mt-auto pb-4">{clerkUser && <img src={clerkUser.imageUrl} className="w-10 h-10 rounded-2xl border border-white/10" />}</div>
        </nav>

        <div className="flex-1 flex flex-col items-start lg:ml-20 overflow-hidden w-full relative">
            <div className="w-full flex-1 flex flex-row overflow-hidden relative">
                
                <aside className={`${isMobileChatOpen ? 'hidden' : 'flex'} md:flex w-full md:w-[320px] flex-col flex-shrink-0 bg-black md:border-r border-white/10`}>
                    <div className="p-6 border-b border-white/5">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-black text-white lowercase">@{clerkUser?.username || 'member'}</h2>
                            <button onClick={() => setSidebarTab('search')}><Edit size={20} className="text-white" /></button>
                        </div>
                        <div className="relative">
                            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                            <input value={sidebarSearchQuery} onChange={e => setSidebarSearchQuery(e.target.value)} placeholder="Search..." className="w-full bg-[#111] rounded-lg py-2 pl-10 pr-4 text-sm text-white outline-none" />
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto no-scrollbar py-2">
                        <button onClick={() => openChat(null)} className={`w-full flex items-center gap-4 px-6 py-4 transition-all ${isGlobal ? 'bg-white/10' : 'hover:bg-white/5'}`}>
                            <div className="w-12 h-12 rounded-full bg-red-600/10 flex items-center justify-center text-red-600 border border-red-600/20"><GlobeAltIcon className="w-6 h-6"/></div>
                            <div className="text-left"><p className="text-sm font-bold text-white">Global Broadcast</p><p className="text-[10px] text-zinc-500">Public Channel</p></div>
                        </button>
                        {filteredUsers.map(u => (
                            <div key={u.id} onClick={() => openChat(u)} className={`w-full flex items-center gap-4 px-6 py-4 transition-all cursor-pointer ${selectedUser?.id === u.id ? 'bg-white/10' : 'hover:bg-white/5'}`}>
                                <UserAvatar user={u} className="w-12 h-12" />
                                <div className="text-left min-w-0 flex-1">
                                    <p className="text-sm font-bold text-white truncate">{u.name}</p>
                                    <p className="text-[10px] text-zinc-500 truncate">@{u.username}</p>
                                </div>
                                {unreadCounts[u.id] > 0 && <div className="w-2 h-2 bg-red-600 rounded-full shadow-[0_0_8px_rgba(220,38,38,1)]" />}
                            </div>
                        ))}
                    </div>
                </aside>

                <main className={`${isMobileChatOpen ? 'flex' : 'hidden'} md:flex flex-1 flex-col bg-black relative`}>
                    {!isGlobal && !selectedUser ? (
                        <div className="flex-1 flex flex-col items-center justify-center p-10 opacity-20"><MessageSquare size={100}/><p className="mt-4 font-black uppercase tracking-widest">Safe Connection Stable</p></div>
                    ) : (
                        <>
                            <div className="p-6 border-b border-white/5 flex items-center justify-between backdrop-blur-md sticky top-0 z-10 bg-black/60">
                                <div className="flex items-center gap-4">
                                    <button onClick={() => setIsMobileChatOpen(false)} className="md:hidden"><ChevronLeftIcon className="w-6 h-6 text-white"/></button>
                                    <div className="flex items-center gap-3">
                                        {isGlobal ? <GlobeAltIcon className="w-8 h-8 text-red-600"/> : <UserAvatar user={selectedUser!} className="w-10 h-10"/>}
                                        <div>
                                            <h3 className="text-sm font-black text-white uppercase">{isGlobal ? 'Global Stream' : selectedUser?.name}</h3>
                                            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">{isGlobal ? 'Public' : `@${selectedUser?.username}`}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-4 flex flex-col">
                                {messages.map((msg, i) => {
                                    const isMe = msg.senderId === clerkUser?.id;
                                    return (
                                        <div key={msg.id || i} className={`flex gap-3 ${isMe ? 'flex-row-reverse' : 'flex-row'} items-end`}>
                                            <UserAvatar user={{ username: msg.senderUsername, avatar: msg.senderAvatar }} className="w-7 h-7" />
                                            <div className={`max-w-[75%] ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                                                <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${isMe ? 'bg-red-600 text-white rounded-br-none' : 'bg-[#1a1a1a] text-zinc-200 rounded-bl-none border border-white/5'}`}>
                                                    {msg.text}
                                                </div>
                                                <span className="text-[7px] text-zinc-600 uppercase font-bold mt-1">{new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                            </div>
                                        </div>
                                    );
                                })}
                                <div ref={messagesEndRef} />
                            </div>

                            <div className="p-4 md:p-8 bg-black border-t border-white/5">
                                <form onSubmit={handleSendMessage} className="flex items-end gap-3 p-1.5 bg-[#0a0a0a] border border-white/10 rounded-3xl min-h-[54px] focus-within:border-red-600/40 transition-all">
                                    <textarea 
                                        ref={textareaRef}
                                        value={inputValue} 
                                        onChange={e => setInputValue(e.target.value)} 
                                        onKeyDown={e => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); }}}
                                        placeholder="Type text message..." 
                                        rows={1}
                                        className="flex-1 bg-transparent px-4 py-3 text-sm text-white outline-none resize-none placeholder-zinc-700 max-h-32" 
                                    />
                                    <button 
                                        type="submit"
                                        disabled={!inputValue.trim()} 
                                        className="px-6 py-3 text-red-600 font-black uppercase text-[10px] tracking-widest disabled:opacity-20 active:scale-90 transition-all"
                                    >
                                        Send
                                    </button>
                                </form>
                            </div>
                        </>
                    )}
                </main>
            </div>
        </div>
      </div>
      <CreatePostModal isOpen={isCreatePostOpen} onClose={() => setIsCreatePostOpen(false)} />
    </div>
  );
};

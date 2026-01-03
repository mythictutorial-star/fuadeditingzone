
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUser, SignInButton } from '@clerk/clerk-react';
import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getDatabase, ref, push, onValue, set, update, get, query, limitToLast, remove } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';
import { GlobeAltIcon, UserCircleIcon, SearchIcon, SendIcon, ChevronLeftIcon, UserGroupIcon, CloseIcon, HomeIcon, MarketIcon, ChevronRightIcon } from './Icons';
import { SidebarSubNav } from './Sidebar';
import { ArrowLeft, Edit, LayoutDashboard, MessageSquare, Heart, PlusSquare, Compass, Bell, Check, Trash2, Info, Volume2, VolumeX, ShieldAlert, UserMinus, ShieldCheck } from 'lucide-react';
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
  senderRole?: string;
  text: string;
  timestamp: number;
}

const getAvatarStyles = (username: string) => {
    const colors = [
        'bg-red-500', 'bg-blue-500', 'bg-green-500', 
        'bg-purple-500', 'bg-pink-500', 'bg-orange-500', 
        'bg-indigo-500', 'bg-teal-500', 'bg-cyan-500'
    ];
    const index = (username || 'user').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
    return colors[index];
};

const UserAvatar: React.FC<{ user: Partial<ChatUser>; className?: string; onClick?: (e: React.MouseEvent) => void }> = ({ user, className = "w-10 h-10", onClick }) => {
    const username = user.username || 'user';
    const firstLetter = username.charAt(0).toUpperCase();
    const bgClass = getAvatarStyles(username);

    return (
        <div 
            onClick={onClick}
            className={`${className} rounded-full border border-white/5 flex-shrink-0 overflow-hidden relative group cursor-pointer ${user.avatar ? '' : bgClass + ' flex items-center justify-center'}`}
        >
            {user.avatar ? (
                <img src={user.avatar} className="w-full h-full object-cover" alt="" />
            ) : (
                <span className="text-white font-black text-lg">{firstLetter}</span>
            )}
        </div>
    );
};

const getIdentity = (username: string, role?: string, hideRole = false) => {
    const low = username?.toLowerCase();
    const isOwner = low === OWNER_HANDLE;
    const isAdmin = low === ADMIN_HANDLE;
    const delay = (username?.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % 60);
    
    let displayRole = role || 'Designer';
    if (isOwner) displayRole = 'Owner';
    if (isAdmin) displayRole = 'Admin';

    return (
        <div className="flex items-center gap-1.5 ml-1.5 flex-shrink-0">
            {(isOwner || isAdmin) && (
                <i style={{ animationDelay: `-${delay}s` }} className={`fa-solid fa-circle-check ${isOwner ? 'text-[#ff0000]' : 'text-[#3b82f6]'} text-[12px] md:text-[14px] drop-shadow-[0_0_8px_rgba(255,255,255,0.2)] fez-verified-badge`}></i>
            )}
            {!hideRole && (
              <span className={`text-[7px] md:text-[8px] font-black px-1.5 py-0.5 rounded border leading-none tracking-[0.1em] ${
                  isOwner ? 'bg-red-600/10 text-red-600 border-red-600/20' : 
                  isAdmin ? 'bg-blue-600/10 text-blue-600 border-blue-600/20' : 
                  displayRole === 'Client' ? 'bg-zinc-800 text-zinc-400 border-white/5' :
                  'bg-white/5 text-zinc-400 border-white/10'
              }`}>
                  {displayRole.toUpperCase()}
              </span>
            )}
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
}> = ({ onShowProfile, initialTargetUserId, onBack, onNavigateMarket, forceSearchTab, onSearchTabConsumed }) => {
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
  const [mutedUsers, setMutedUsers] = useState<Record<string, boolean>>({});
  const [blockedByMe, setBlockedByMe] = useState<Record<string, boolean>>({});
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);
  const [isChatInfoOpen, setIsChatInfoOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (forceSearchTab) {
      setSidebarTab('search');
      setIsMobileChatOpen(false); 
      setTimeout(() => searchInputRef.current?.focus(), 100);
      onSearchTabConsumed?.();
    }
  }, [forceSearchTab, onSearchTabConsumed]);

  useEffect(() => {
    const usersRef = ref(db, 'users');
    const unsubUsers = onValue(usersRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
          const list = Object.values(data) as ChatUser[];
          setUsers(list);
          
          if(initialTargetUserId) {
              const target = list.find(u => u.id === initialTargetUserId || u.username?.toLowerCase() === initialTargetUserId?.toLowerCase());
              if(target) {
                  if (target.username?.toLowerCase() === RESTRICTED_HANDLE && clerkUser?.username?.toLowerCase() !== OWNER_HANDLE) {
                      return;
                  }
                  setIsGlobal(false);
                  setSelectedUser(target);
                  setIsMobileChatOpen(true);
                  setSidebarTab('messages');
              }
          }
      }
    });

    if (clerkUser) {
        onValue(ref(db, `social/${clerkUser.id}/friends`), (snap) => {
            setFriendsList(snap.exists() ? Object.keys(snap.val()) : []);
        });
        onValue(ref(db, `users/${clerkUser.id}/unread`), (snap) => {
            setUnreadCounts(snap.val() || {});
        });
        onValue(ref(db, `users/${clerkUser.id}/muted`), (snap) => {
            setMutedUsers(snap.val() || {});
        });
        onValue(ref(db, `users/${clerkUser.id}/blocked`), (snap) => {
            setBlockedByMe(snap.val() || {});
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
    if (!chatPath) {
        setMessages([]);
        return;
    }
    const unsub = onValue(query(ref(db, chatPath), limitToLast(100)), (snap) => {
        const data = snap.val();
        if (data) {
            const list = Object.entries(data).map(([id, val]: [string, any]) => ({ id, ...val }))
                .sort((a, b) => a.timestamp - b.timestamp);
            setMessages(list);
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
  }, [messages, isMobileChatOpen]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSignedIn || !inputValue.trim() || !chatPath || !clerkUser) return;
    
    // 3-message limit check for non-friends
    const isFriend = selectedUser ? (friendsList.includes(selectedUser.id) || selectedUser.username?.toLowerCase() === OWNER_HANDLE) : true;
    const mySentMessages = messages.filter(m => m.senderId === clerkUser.id);
    if (!isFriend && mySentMessages.length >= 3) return;

    const myProfile = users.find(u => u.id === clerkUser.id);
    const newMessage = { 
      senderId: clerkUser.id, 
      senderName: clerkUser.fullName || clerkUser.username || "Anonymous", 
      senderUsername: (clerkUser.username || '').toLowerCase(),
      senderAvatar: clerkUser.imageUrl,
      senderRole: myProfile?.role || 'Designer',
      text: inputValue.trim(), 
      timestamp: Date.now() 
    };
    setInputValue('');
    await push(ref(db, chatPath), newMessage);
    if (!isGlobal && selectedUser) {
        const recipientUnreadRef = ref(db, `users/${selectedUser.id}/unread/${clerkUser.id}`);
        get(recipientUnreadRef).then(snap => set(recipientUnreadRef, (snap.val() || 0) + 1));
    }
  };

  const { primaryUsers, requestUsers, requestCount } = useMemo(() => {
    let baseList = users.filter(u => !blockedByMe[u.id]);
    if (clerkUser?.username?.toLowerCase() !== OWNER_HANDLE) {
        baseList = baseList.filter(u => (u.username || '').toLowerCase() !== RESTRICTED_HANDLE);
    }

    const messagedIds = Object.keys(unreadCounts);
    const primary: ChatUser[] = [];
    const requests: ChatUser[] = [];

    baseList.forEach(u => {
        const isMessaged = messagedIds.includes(u.id) || u.username?.toLowerCase() === OWNER_HANDLE;
        if (!isMessaged && u.id !== clerkUser?.id) return;
        
        const isFriend = friendsList.includes(u.id) || u.username?.toLowerCase() === OWNER_HANDLE || u.id === clerkUser?.id;
        
        if (isFriend) {
            primary.push(u);
        } else {
            requests.push(u);
        }
    });

    return { primaryUsers: primary, requestUsers: requests, requestCount: requests.length };
  }, [users, clerkUser, unreadCounts, friendsList, blockedByMe]);

  const filteredUsers = useMemo(() => {
    if (sidebarTab === 'search') {
        if (!sidebarSearchQuery.trim()) return [];
        const q = sidebarSearchQuery.toLowerCase();
        return users.filter(u => !blockedByMe[u.id] && (u.name?.toLowerCase().includes(q) || u.username?.toLowerCase().includes(q)));
    }
    return inboxView === 'primary' ? primaryUsers : requestUsers;
  }, [sidebarTab, sidebarSearchQuery, inboxView, primaryUsers, requestUsers, users, blockedByMe]);

  const openChat = (user: ChatUser | null) => {
      setMessages([]);
      if (user === null) { 
          if (isGlobal) { setIsGlobal(false); setSelectedUser(null); } else { setIsGlobal(true); setSelectedUser(null); }
      } else { 
          if (user.username?.toLowerCase() === RESTRICTED_HANDLE && clerkUser?.username?.toLowerCase() !== OWNER_HANDLE) {
              return;
          }
          setIsGlobal(false); 
          setSelectedUser(user); 
      }
      setIsMobileChatOpen(true);
  };

  const handleAcceptRequest = async () => {
    if (!clerkUser || !selectedUser) return;
    await set(ref(db, `social/${clerkUser.id}/friends/${selectedUser.id}`), true);
    await set(ref(db, `social/${selectedUser.id}/friends/${clerkUser.id}`), true);
    setInboxView('primary');
  };

  const handleDeleteRequest = async () => {
    if (!clerkUser || !selectedUser || !chatPath) return;
    if (window.confirm(`Delete chat request from @${selectedUser.username}?`)) {
        await remove(ref(db, chatPath));
        await update(ref(db, `users/${clerkUser.id}/unread`), { [selectedUser.id]: 0 });
        setSelectedUser(null);
        setIsMobileChatOpen(false);
    }
  };

  const handleToggleMute = async () => {
      if (!clerkUser || !selectedUser) return;
      const path = `users/${clerkUser.id}/muted/${selectedUser.id}`;
      if (mutedUsers[selectedUser.id]) {
          await remove(ref(db, path));
      } else {
          await set(ref(db, path), true);
      }
  };

  const handleBlockUser = async () => {
      if (!clerkUser || !selectedUser) return;
      const low = selectedUser.username?.toLowerCase();
      if (low === OWNER_HANDLE || low === ADMIN_HANDLE) {
          alert("You cannot block an Admin or the Owner.");
          return;
      }
      if (window.confirm(`Block @${selectedUser.username}? You will no longer see their messages or posts.`)) {
          await set(ref(db, `users/${clerkUser.id}/blocked/${selectedUser.id}`), true);
          setSelectedUser(null);
          setIsChatInfoOpen(false);
          setIsMobileChatOpen(false);
      }
  };

  const UnreadBadge: React.FC<{ count: number }> = ({ count }) => {
    if (!count || count <= 0) return null;
    return <div className="absolute -top-1 -right-1 bg-red-600 text-white text-[8px] font-black min-w-[16px] h-[16px] flex items-center justify-center rounded-full border border-black px-1 shadow-lg z-10">{count}</div>;
  };

  const handleStartNewMessage = () => {
    setSidebarTab('search');
    setTimeout(() => searchInputRef.current?.focus(), 100);
  };

  const isCurrentChatAFriend = selectedUser ? (friendsList.includes(selectedUser.id) || selectedUser.username?.toLowerCase() === OWNER_HANDLE) : true;
  const mySentMessagesCount = messages.filter(m => m.senderId === clerkUser?.id).length;
  const isInputLocked = !isGlobal && !isCurrentChatAFriend && mySentMessagesCount >= 3;

  return (
    <div className="flex flex-col h-full w-full overflow-hidden relative bg-black font-sans">
      <div className="flex-1 flex flex-row min-h-0 h-full w-full">
        
        {/* Instagram-style Vertical Rail */}
        <nav className="hidden lg:flex flex-col items-center py-8 gap-10 w-[72px] flex-shrink-0 border-r border-white/10 bg-black z-[100]">
            <button onClick={onBack} className="text-white hover:scale-110 transition-transform">
                <img src={siteConfig.branding.logoUrl} className="w-7 h-7" alt="" />
            </button>
            <div className="flex flex-col gap-8">
                <button onClick={() => { setSidebarTab('messages'); setIsGlobal(false); setSelectedUser(null); setInboxView('primary'); }} className={`transition-all ${sidebarTab === 'messages' && !isGlobal && !selectedUser ? 'text-white scale-110' : 'text-white opacity-40 hover:opacity-100'}`} title="Messages"><HomeIcon className="w-7 h-7" /></button>
                <button onClick={() => { setSidebarTab('search'); }} className={`transition-all ${sidebarTab === 'search' ? 'text-white scale-110' : 'text-white opacity-40 hover:opacity-100'}`} title="Search"><SearchIcon className="w-7 h-7" /></button>
                <button onClick={onNavigateMarket} className="text-white opacity-40 hover:opacity-100 transition-all" title="Marketplace"><MarketIcon className="w-7 h-7" /></button>
                <button onClick={() => { const btn = document.querySelector('[title="Notifications"]') as HTMLButtonElement; if(btn) btn.click(); }} className="text-white hover:opacity-70 transition-all" title="Activity"><Bell className="w-7 h-7" /></button>
                <button onClick={() => setIsCreatePostOpen(true)} className="text-white hover:opacity-70 transition-all"><PlusSquare className="w-7 h-7" /></button>
            </div>
            <div className="mt-auto">
                {clerkUser && (
                    <button 
                        onClick={() => onShowProfile?.(clerkUser.id, (clerkUser.username || '').toLowerCase())}
                        className="w-8 h-8 rounded-full border-2 border-white/20 overflow-hidden hover:border-white transition-all hover:scale-110"
                        title="Your Profile"
                    >
                        <img src={clerkUser.imageUrl} className="w-full h-full object-cover" alt="" />
                    </button>
                )}
            </div>
        </nav>

        {/* Sidebar Container */}
        <aside className={`${isMobileChatOpen ? 'hidden' : 'flex'} md:flex w-full md:w-[320px] lg:w-[380px] flex-col flex-shrink-0 min-h-0 bg-black border-r border-white/10 animate-fade-in`}>
          {sidebarTab === 'search' ? (
            <div className="flex flex-col h-full animate-fade-in">
                <div className="p-8 pb-4">
                    <div className="flex items-center gap-4 mb-8">
                         <button onClick={() => setSidebarTab('messages')} className="p-2 -ml-2 rounded-full hover:bg-white/5 text-white transition-colors">
                            <ArrowLeft className="w-6 h-6" />
                         </button>
                         <h2 className="text-2xl font-black text-white uppercase tracking-tight">Search</h2>
                    </div>
                    <div className="relative group">
                        <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 w-4 h-4 group-focus-within:text-zinc-400 transition-colors" />
                        <input 
                            ref={searchInputRef}
                            value={sidebarSearchQuery} 
                            onChange={e => setSidebarSearchQuery(e.target.value)} 
                            placeholder="Search members..." 
                            className="w-full bg-[#262626] border-none rounded-lg py-2.5 pl-11 pr-3 text-white text-sm outline-none transition-all placeholder-zinc-500" 
                        />
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar px-2 space-y-1 mt-4">
                    {sidebarSearchQuery.trim() === '' ? (
                        <div className="py-20 text-center opacity-30 flex flex-col items-center gap-4">
                             <p className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-500">Search for accounts</p>
                        </div>
                    ) : filteredUsers.length === 0 ? (
                        <div className="py-20 text-center opacity-30">
                            <p className="text-sm font-bold text-zinc-500">No results found.</p>
                        </div>
                    ) : (
                        filteredUsers.map(u => (
                            <div key={u.id} className="w-full flex items-center gap-4 p-3 rounded-lg transition-all text-left hover:bg-white/5 cursor-pointer group" onClick={() => onShowProfile?.(u.id, (u.username || '').toLowerCase())}>
                                <UserAvatar user={u} className="w-12 h-12" />
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-1.5 mb-0.5">
                                        <span className="text-sm font-black text-white truncate">{u.name}</span>
                                        {(u.username?.toLowerCase() === OWNER_HANDLE || u.username?.toLowerCase() === ADMIN_HANDLE) && (
                                            <i className={`fa-solid fa-circle-check ${u.username?.toLowerCase() === OWNER_HANDLE ? 'text-[#ff0000]' : 'text-[#3b82f6]'} text-[10px] fez-verified-badge`}></i>
                                        )}
                                    </div>
                                    <p className="text-xs text-zinc-500 truncate">@{ (u.username || '').toLowerCase() } • {u.role || 'Designer'}</p>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
          ) : (
            <div className="flex flex-col h-full animate-fade-in">
                <div className="p-4 flex flex-col gap-5">
                    <div className="flex items-center justify-between px-2 pt-2">
                        <div className="flex items-center gap-2 cursor-pointer" onClick={() => clerkUser && onShowProfile?.(clerkUser.id, clerkUser.username || '')}>
                            <h2 className="text-xl font-black text-white lowercase tracking-tight">{(clerkUser?.username || OWNER_HANDLE).toLowerCase()}</h2>
                            <i className="fa-solid fa-chevron-down text-[10px] text-zinc-500"></i>
                        </div>
                        <div className="flex items-center gap-3">
                            <button onClick={handleStartNewMessage} className="text-white hover:opacity-70 transition-opacity">
                                <SearchIcon className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                    
                    <div className="lg:hidden"><SidebarSubNav active="community" onSwitch={(t) => t === 'marketplace' && onNavigateMarket?.()} /></div>
                    
                    <div className="flex items-center justify-between px-2">
                        <div className="flex items-center gap-6">
                            <button onClick={() => setInboxView('primary')} className={`text-sm font-black tracking-tight transition-all relative ${inboxView === 'primary' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>
                                Primary
                                {inboxView === 'primary' && <motion.div layoutId="inboxTab" className="absolute -bottom-1 left-0 right-0 h-0.5 bg-white" />}
                            </button>
                            <button onClick={() => setInboxView('requests')} className={`text-sm font-black tracking-tight transition-all relative ${inboxView === 'requests' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>
                                Requests
                                {requestCount > 0 && <span className="ml-2 px-1.5 py-0.5 bg-red-600 text-white text-[8px] font-black rounded-full animate-pulse">{requestCount}</span>}
                                {inboxView === 'requests' && <motion.div layoutId="inboxTab" className="absolute -bottom-1 left-0 right-0 h-0.5 bg-white" />}
                            </button>
                        </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <button onClick={() => openChat(null)} className={`flex items-center gap-4 px-4 py-3 rounded-lg transition-all ${isGlobal ? 'bg-white/5 text-white' : 'bg-transparent text-zinc-400 hover:bg-white/5 hover:text-white'}`}>
                            <div className="w-12 h-12 rounded-full bg-red-600/10 flex items-center justify-center border border-red-600/30 flex-shrink-0">
                                <i className="fa-solid fa-earth-americas text-lg text-red-600"></i>
                            </div>
                            <div className="text-left flex-1 min-w-0">
                                <span className="text-sm font-bold block">Global Feed</span>
                                <span className="text-xs text-zinc-500 truncate">Public community broadcast</span>
                            </div>
                        </button>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar px-2 space-y-1 mt-2">
                    {filteredUsers.length === 0 ? (
                        <div className="py-20 text-center opacity-30">
                            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-500">{inboxView === 'primary' ? 'No active messages' : 'No message requests'}</p>
                        </div>
                    ) : (
                        filteredUsers.map(u => {
                            const isMe = u.id === clerkUser?.id;
                            const isSelected = selectedUser?.id === u.id && !isGlobal;
                            const isMuted = mutedUsers[u.id];
                            return (
                                <div key={u.id} onClick={() => openChat(u)} className={`w-full flex items-center gap-4 p-3 rounded-lg transition-all text-left group relative cursor-pointer ${isSelected ? 'bg-white/10' : 'bg-transparent hover:bg-white/5'}`}>
                                    <div className="relative shrink-0">
                                        <UserAvatar user={u} className="w-14 h-14" />
                                        <UnreadBadge count={unreadCounts[u.id] || 0} />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-col">
                                            <div className="flex items-center gap-1.5 mb-0.5 overflow-hidden">
                                                <span className={`text-sm font-black truncate leading-none ${unreadCounts[u.id] > 0 ? 'text-white' : 'text-zinc-200'}`}>{u.name}</span>
                                                {(u.username?.toLowerCase() === OWNER_HANDLE || u.username?.toLowerCase() === ADMIN_HANDLE) && (
                                                    <i className={`fa-solid fa-circle-check ${u.username?.toLowerCase() === OWNER_HANDLE ? 'text-[#ff0000]' : 'text-[#3b82f6]'} text-[10px] fez-verified-badge`}></i>
                                                )}
                                                {isMuted && <VolumeX size={10} className="text-zinc-600 ml-1" />}
                                            </div>
                                            <p className="text-[10px] text-zinc-500 truncate font-bold uppercase tracking-widest mt-1">@{ (u.username || '').toLowerCase() }</p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
          )}
        </aside>

        {/* Main Content Area */}
        <main className={`${isMobileChatOpen ? 'flex' : 'hidden'} md:flex flex-1 flex-col min-h-0 bg-black animate-fade-in`}>
          {!isGlobal && !selectedUser ? (
            <div className="flex-1 flex flex-col items-center justify-center p-10 text-center animate-fade-in">
              <div className="w-24 h-24 rounded-full border-2 border-white flex items-center justify-center mb-6"><i className="fa-regular fa-paper-plane text-4xl text-white"></i></div>
              <h2 className="text-xl font-bold text-white mb-2">Your messages</h2>
              <p className="text-sm text-zinc-500 mb-6">Send a private message to a member.</p>
              <button onClick={handleStartNewMessage} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded-lg text-sm transition-colors active:scale-95 shadow-lg shadow-red-600/20">Send message</button>
            </div>
          ) : (
            <>
              <div className="px-5 py-3 md:px-8 md:py-4 flex items-center justify-between border-b border-white/10 flex-shrink-0 backdrop-blur-2xl sticky top-0 z-[50] bg-black/60">
                <div className="flex items-center gap-4 min-w-0">
                  <button onClick={() => setIsMobileChatOpen(false)} className="md:hidden p-2 rounded-lg bg-white/5 border border-white/10 text-white"><ChevronLeftIcon className="w-5 h-5" /></button>
                  <div onClick={() => !isGlobal && onShowProfile?.(selectedUser!.id, selectedUser!.username?.toLowerCase())} className="relative cursor-pointer">
                    {isGlobal ? (<div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-red-600/10 flex items-center justify-center border border-white/10"><i className="fa-solid fa-earth-americas text-white text-xl"></i></div>) : (<UserAvatar user={selectedUser!} className={`w-10 h-10 md:w-12 md:h-12 border ${selectedUser?.username?.toLowerCase() === OWNER_HANDLE ? 'border-red-600' : 'border-white/10'}`} />)}
                  </div>
                  <div className="min-w-0 cursor-pointer" onClick={() => !isGlobal && onShowProfile?.(selectedUser!.id, selectedUser!.username?.toLowerCase())}>
                    <h3 className="text-sm md:text-base font-black text-white uppercase tracking-tight flex items-center leading-none">{isGlobal ? 'Global Stream' : selectedUser?.name}{!isGlobal && getIdentity(selectedUser!.username, selectedUser!.role)}</h3>
                    <p className="text-[10px] text-zinc-500 font-bold tracking-widest mt-1 leading-none">{isGlobal ? 'Public Broadcast' : `@${(selectedUser?.username || '').toLowerCase()}`}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-zinc-400">
                    {!isGlobal && <button onClick={() => setIsChatInfoOpen(true)} className="hover:text-white transition-colors p-2 bg-white/5 rounded-full"><Info size={20} /></button>}
                </div>
              </div>

              {/* Accept Request Bar */}
              {!isGlobal && !isCurrentChatAFriend && (
                <div className="bg-[#111] border-b border-white/10 p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-center sm:text-left">
                    <p className="text-xs font-black text-white uppercase tracking-widest">Message Request</p>
                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-tight mt-1">Accept this request to continue the conversation.</p>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={handleAcceptRequest} className="bg-white text-black px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] flex items-center gap-2 hover:bg-zinc-200 active:scale-95 transition-all shadow-lg"><Check size={14}/> Accept</button>
                    <button onClick={handleDeleteRequest} className="bg-red-600/10 border border-red-600/20 text-red-500 px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] flex items-center gap-2 hover:bg-red-600 hover:text-white active:scale-95 transition-all"><Trash2 size={14}/> Delete</button>
                  </div>
                </div>
              )}

              <div className="flex-1 overflow-y-auto custom-scrollbar p-5 md:p-10 flex flex-col gap-4 md:gap-6">
                {messages.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center opacity-10 animate-pulse"><i className="fa-solid fa-shield-halved text-5xl mb-6"></i><p className="text-[12px] font-black uppercase tracking-[0.5em]">{isGlobal ? 'Connecting...' : 'Secure Connection'}</p></div>
                ) : (
                  messages.map((msg, i) => {
                    const isMe = msg.senderId === clerkUser?.id;
                    return (
                      <div key={msg.id || i} className={`flex gap-3 ${isMe ? 'flex-row-reverse' : 'flex-row'} items-end max-w-full group animate-fade-in`}>
                        <UserAvatar user={{ id: msg.senderId, username: msg.senderUsername, avatar: msg.senderAvatar }} className={`w-7 h-7 md:w-8 md:h-8 border shadow-lg group-hover:scale-105 transition-transform ${msg.senderUsername?.toLowerCase() === OWNER_HANDLE ? 'border-red-600' : 'border-white/10'}`} onClick={() => onShowProfile?.(msg.senderId, (msg.senderUsername || '').toLowerCase())} />
                        <div className={`max-w-[75%] md:max-w-[65%] ${isMe ? 'items-end' : 'items-start'} flex flex-col min-w-0`}>
                          {!isMe && (<div className="flex items-center mb-1 px-1 cursor-pointer opacity-70 hover:opacity-100 transition-opacity" onClick={() => onShowProfile?.(msg.senderId, (msg.senderUsername || '').toLowerCase())}><span className="text-[10px] font-black text-white uppercase tracking-tight truncate leading-none">{msg.senderName}</span></div>)}
                          <div className={`px-4 py-2.5 rounded-2xl text-[13px] md:text-sm border font-medium leading-relaxed ${isMe ? 'bg-red-600 border-red-600 text-white rounded-br-none shadow-lg shadow-red-600/10' : (msg.senderUsername?.toLowerCase() === OWNER_HANDLE ? 'bg-[#262626] border-red-600/40 text-white rounded-bl-none' : 'bg-[#262626] border-white/5 text-zinc-200 rounded-bl-none')}`} style={{ overflowWrap: 'anywhere' }}>{msg.text}</div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="p-4 md:p-6 bg-black border-t border-white/10 flex-shrink-0">
                {isSignedIn ? (
                  <div className="max-w-4xl mx-auto flex flex-col gap-3">
                    {isInputLocked ? (
                      <div className="bg-red-600/5 border border-red-600/20 rounded-2xl p-4 text-center">
                        <p className="text-[10px] md:text-xs font-black text-red-500 uppercase tracking-widest">Waiting for @{selectedUser?.username} to accept your request.</p>
                        <p className="text-[8px] text-zinc-600 font-bold uppercase tracking-tight mt-1">You can only send 3 messages to non-friends.</p>
                      </div>
                    ) : (
                      <form onSubmit={handleSendMessage} className="flex items-center gap-3 p-1.5 border border-white/20 rounded-3xl transition-all focus-within:border-red-600/50">
                        <button type="button" className="p-2 text-white hover:text-red-500 transition-colors"><i className="fa-regular fa-face-smile text-xl"></i></button>
                        <input value={inputValue} onChange={e => setInputValue(e.target.value)} placeholder="Message..." className="flex-1 bg-transparent px-2 py-2 text-sm text-white outline-none min-w-0 placeholder-zinc-500" />
                        {inputValue.trim() ? (<button type="submit" className="text-red-600 hover:text-red-500 font-bold px-4 py-2 text-sm transition-colors active:scale-90">Send</button>) : (<div className="flex items-center gap-3 pr-2 text-white"><button type="button" className="hover:text-red-500 transition-opacity"><i className="fa-solid fa-microphone text-lg"></i></button><button type="button" className="hover:text-red-500 transition-opacity"><i className="fa-regular fa-image text-lg"></i></button><button type="button" className="hover:text-red-500 transition-opacity"><i className="fa-regular fa-heart text-xl"></i></button></div>)}
                      </form>
                    )}
                    
                    {!isGlobal && !isCurrentChatAFriend && !isInputLocked && (
                      <p className="text-[8px] text-zinc-600 font-black uppercase tracking-[0.2em] text-center">
                        {3 - mySentMessagesCount} messages left until acceptance required
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="py-4 text-center">
                    <SignInButton mode="modal"><button className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-12 rounded-lg text-sm transition-all active:scale-95 shadow-xl shadow-red-600/20">Log In to Chat</button></SignInButton>
                  </div>
                )}
              </div>
            </>
          )}
        </main>
      </div>

      <AnimatePresence>
        {isChatInfoOpen && selectedUser && (
            <motion.div 
                initial={{ opacity: 0, x: '100%' }} 
                animate={{ opacity: 1, x: 0 }} 
                exit={{ opacity: 0, x: '100%' }} 
                className="fixed inset-0 z-[1000] bg-black flex flex-col md:max-w-md md:left-auto border-l border-white/10"
            >
                <div className="p-6 border-b border-white/5 flex items-center justify-between bg-black/40 backdrop-blur-xl">
                    <button onClick={() => setIsChatInfoOpen(false)} className="p-2 -ml-2 rounded-full hover:bg-white/5 text-white"><ChevronLeftIcon className="w-6 h-6" /></button>
                    <h2 className="text-sm font-black text-white uppercase tracking-widest">Details</h2>
                    <div className="w-10"></div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-10">
                    <div className="flex flex-col items-center text-center">
                        <UserAvatar user={selectedUser} className="w-24 h-24 mb-4 ring-4 ring-white/5" />
                        <h3 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-1.5">{selectedUser.name}{getIdentity(selectedUser.username, selectedUser.role)}</h3>
                        <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest mt-1">@{selectedUser.username.toLowerCase()}</p>
                        
                        <div className="mt-8 flex gap-4">
                            <button onClick={() => { setIsChatInfoOpen(false); onShowProfile?.(selectedUser.id, selectedUser.username); }} className="px-6 py-2.5 bg-white text-black rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-zinc-200 transition-all active:scale-95">View Profile</button>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <h4 className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.3em] px-1 mb-4">Chat Settings</h4>
                        
                        <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10">
                            <div className="flex items-center gap-3">
                                {mutedUsers[selectedUser.id] ? <VolumeX className="text-red-500" size={20} /> : <Volume2 className="text-zinc-400" size={20} />}
                                <span className="text-sm font-bold text-white">Mute Messages</span>
                            </div>
                            <button 
                                onClick={handleToggleMute}
                                className={`w-12 h-6 rounded-full transition-all relative ${mutedUsers[selectedUser.id] ? 'bg-red-600' : 'bg-zinc-800'}`}
                            >
                                <motion.div 
                                    animate={{ x: mutedUsers[selectedUser.id] ? 26 : 2 }} 
                                    className="absolute top-1 left-0 w-4 h-4 bg-white rounded-full shadow-lg" 
                                />
                            </button>
                        </div>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-white/5">
                        <h4 className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.3em] px-1">Privacy & Safety</h4>
                        
                        <button 
                            onClick={handleBlockUser}
                            className="w-full flex items-center justify-between p-4 bg-red-600/10 hover:bg-red-600/20 rounded-2xl border border-red-600/20 transition-all group"
                        >
                            <div className="flex items-center gap-3 text-red-500">
                                <UserMinus size={20} />
                                <span className="text-sm font-black uppercase tracking-widest">Block Member</span>
                            </div>
                            <ShieldAlert size={16} className="text-red-600 opacity-50 group-hover:opacity-100" />
                        </button>

                        <button className="w-full flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/10 transition-all group">
                            <div className="flex items-center gap-3 text-zinc-300">
                                <ShieldCheck size={20} />
                                <span className="text-sm font-bold">Report Account</span>
                            </div>
                            <ChevronRightIcon className="w-4 h-4 text-zinc-600" />
                        </button>
                    </div>
                </div>

                <div className="p-10 text-center opacity-30">
                    <img src={siteConfig.branding.logoUrl} className="h-8 mx-auto grayscale invert mb-4" alt="" />
                    <p className="text-[8px] font-black uppercase tracking-[0.5em] text-white">Encrypted Interaction</p>
                </div>
            </motion.div>
        )}
      </AnimatePresence>

      <CreatePostModal isOpen={isCreatePostOpen} onClose={() => setIsCreatePostOpen(false)} />
    </div>
  );
};

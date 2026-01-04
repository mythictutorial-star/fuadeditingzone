
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUser } from '@clerk/clerk-react';
import { ref, push, onValue, set, update, get, query, limitToLast, remove } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';
import { db } from '../firebase'; 
import { GlobeAltIcon, SearchIcon, ChevronLeftIcon, CloseIcon, HomeIcon, MarketIcon, ChevronRightIcon } from './Icons';
import { SidebarSubNav } from './Sidebar';
import { ArrowLeft, Edit, MessageSquare, Bell, Check, Trash2, Info, Volume2, VolumeX, ShieldAlert, UserMinus, KeyRound, Fingerprint, Lock, Unlock, AlertTriangle, X, PlusSquare, Settings, User, Shield, UserX, BellRing, Reply } from 'lucide-react';
import { siteConfig } from '../config';
import { CreatePostModal } from './CreatePostModal';

const OWNER_HANDLE = 'fuadeditingzone';
const ADMIN_HANDLE = 'studiomuzammil';

interface ChatUser {
  id: string;
  name: string;
  username: string;
  avatar?: string;
  role?: string;
  online?: boolean;
  fcmToken?: string;
  profile?: {
    bio?: string;
    gender?: string;
    profession?: string;
  };
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
  replyTo?: {
    id: string;
    text: string;
    senderName: string;
  };
}

const getIdentity = (username: string) => {
    if (!username) return null;
    const low = username.toLowerCase();
    const delay = (username.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % 60);
    
    return (
        <>
            {low === OWNER_HANDLE && <i style={{ animationDelay: `-${delay}s` }} className="fa-solid fa-circle-check text-red-600 ml-1 text-[10px] md:text-sm fez-verified-badge"></i>}
            {low === ADMIN_HANDLE && <i style={{ animationDelay: `-${delay}s` }} className="fa-solid fa-circle-check text-blue-500 ml-1 text-[10px] md:text-sm fez-verified-badge"></i>}
        </>
    );
};

const formatChatTime = (timestamp: number) => {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const oneDay = 24 * 60 * 60 * 1000;

  if (diff < oneDay && date.getDate() === now.getDate()) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  } else if (diff < oneDay * 7) {
    return date.toLocaleDateString([], { weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: true });
  } else {
    return date.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
  }
};

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

const PasscodeOverlay: React.FC<{ 
    mode: 'set' | 'enter' | 'change';
    onSuccess: (pass?: string) => void; 
    onCancel: () => void;
    storedPasscode?: string;
    targetName?: string;
}> = ({ mode, onSuccess, onCancel, storedPasscode, targetName }) => {
    const [digits, setDigits] = useState<string[]>([]);
    const [tempPass, setTempPass] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const timer = setTimeout(() => inputRef.current?.focus(), 100);
        return () => clearTimeout(timer);
    }, []);

    const handleDigitInput = (val: string) => {
        const clean = val.replace(/[^0-9]/g, '').split('').slice(0, 4);
        setDigits(clean);
        setError(null);

        if (clean.length === 4) {
            const code = clean.join('');
            setTimeout(() => {
                if (mode === 'set') {
                    if (!tempPass) {
                        setTempPass(code);
                        setDigits([]);
                    } else {
                        if (code === tempPass) onSuccess(code);
                        else { setError("Codes don't match."); setDigits([]); setTempPass(null); }
                    }
                } else {
                    if (code === storedPasscode) onSuccess(code);
                    else { setError("Incorrect passcode."); setDigits([]); }
                }
            }, 300);
        }
    };

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[6000000] bg-black/80 backdrop-blur-xl flex flex-col items-center justify-center p-8 text-center" onClick={() => inputRef.current?.focus()}>
            <div className="flex flex-col items-center mb-12 max-w-xs">
                <div className="w-16 h-16 rounded-full bg-red-600/10 flex items-center justify-center border border-red-600/20 mb-8"><Lock className="text-red-600" /></div>
                <h2 className="text-xl font-black text-white uppercase tracking-widest mb-2">{mode === 'set' ? (tempPass ? 'Confirm Code' : 'Set Chat Code') : 'Enter Code'}</h2>
                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest leading-relaxed">
                    {mode === 'set' ? 'Secure your conversations with a unique 4-digit code' : `Verify identity to access @${targetName?.toLowerCase()}`}
                </p>
            </div>
            <input ref={inputRef} type="text" pattern="[0-9]*" inputMode="numeric" value={digits.join('')} onChange={(e) => handleDigitInput(e.target.value)} className="absolute opacity-0 pointer-events-none" />
            <div className="flex gap-6 mb-12">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className={`w-4 h-4 rounded-full border-2 transition-all duration-300 ${digits.length > i ? 'bg-red-600 border-red-600 scale-125 shadow-[0_0_15px_rgba(220,38,38,0.5)]' : 'bg-transparent border-zinc-800'}`}></div>
                ))}
            </div>
            {error && <p className="text-red-500 text-[10px] font-black uppercase tracking-widest mb-12 animate-pulse">{error}</p>}
            <button onClick={(e) => { e.stopPropagation(); onCancel(); }} className="py-3 px-8 text-[9px] font-black text-zinc-500 border border-white/5 rounded-full uppercase tracking-widest hover:text-white transition-colors">Cancel</button>
        </motion.div>
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
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [isMobileChatOpen, setIsMobileChatOpen] = useState(false); 
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [conversations, setConversations] = useState<Record<string, number | boolean>>({});
  const [mutedUsers, setMutedUsers] = useState<Record<string, boolean>>({});
  const [blockedByMe, setBlockedByMe] = useState<Record<string, boolean>>({});
  const [lockedChats, setLockedChats] = useState<Record<string, boolean>>({});
  const [userPasscode, setUserPasscode] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);
  const [isActivityOpen, setIsActivityOpen] = useState(false);
  const [isSearchOverlayOpen, setIsSearchOverlayOpen] = useState(false);
  const [isChatInfoOpen, setIsChatInfoOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'profile' | 'security'>('profile');
  const [searchQuery, setSearchQuery] = useState('');
  const [passcodeMode, setPasscodeMode] = useState<'set' | 'enter' | 'change' | null>(null);
  const [verifiedTarget, setVerifiedTarget] = useState<string | null>(null);
  const [reportMode, setReportMode] = useState(false);
  
  const [settingsData, setSettingsData] = useState({ name: '', username: '', bio: '', gender: '' });
  const [blockedUsersData, setBlockedUsersData] = useState<ChatUser[]>([]);
  const [pushEnabled, setPushEnabled] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const handleLocationChange = () => {
      const path = window.location.pathname;
      setIsSearchOverlayOpen(path.includes('/search'));
      setIsActivityOpen(path.includes('/activity'));
      setIsSettingsOpen(path.includes('/settings'));
    };
    handleLocationChange();
    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);

  const openOverlay = (name: 'search' | 'activity' | 'settings' | 'inbox') => {
      if (name === 'inbox') {
          window.history.pushState(null, '', '/community');
          setIsSearchOverlayOpen(false); setIsActivityOpen(false); setIsSettingsOpen(false);
      } else {
          window.history.pushState(null, '', `/community/${name}`);
          if (name === 'search') setIsSearchOverlayOpen(true);
          if (name === 'activity') setIsActivityOpen(true);
          if (name === 'settings') setIsSettingsOpen(true);
      }
  };

  useEffect(() => {
    onThreadStateChange?.(isMobileChatOpen && (!!selectedUser || isGlobal));
  }, [isMobileChatOpen, selectedUser, isGlobal, onThreadStateChange]);

  useEffect(() => {
    const unsubUsers = onValue(ref(db, 'users'), (snapshot) => {
      const data = snapshot.val();
      if (data) setUsers(Object.values(data) as ChatUser[]);
    });

    if (clerkUser) {
        onValue(ref(db, `users/${clerkUser.id}`), (snap) => {
            const data = snap.val();
            if (data) {
                setSettingsData({ 
                    name: data.name || '', 
                    username: data.username || '', 
                    bio: data.profile?.bio || '', 
                    gender: data.profile?.gender || 'Prefer not to say' 
                });
                setPushEnabled(!!data.fcmToken);
            }
        });
        onValue(ref(db, `users/${clerkUser.id}/unread`), (snap) => setUnreadCounts(snap.val() || {}));
        onValue(ref(db, `users/${clerkUser.id}/conversations`), (snap) => setConversations(snap.val() || {}));
        onValue(ref(db, `users/${clerkUser.id}/muted`), (snap) => setMutedUsers(snap.val() || {}));
        onValue(ref(db, `users/${clerkUser.id}/blocked`), (snap) => setBlockedByMe(snap.val() || {}));
        onValue(ref(db, `users/${clerkUser.id}/locked_chats`), (snap) => setLockedChats(snap.val() || {}));
        onValue(ref(db, `users/${clerkUser.id}/chat_passcode`), (snap) => setUserPasscode(snap.val() || null));
        onValue(ref(db, `notifications/${clerkUser.id}`), (snap) => {
            const data = snap.val() || {};
            setNotifications(Object.entries(data).map(([id, val]: [string, any]) => ({ id, ...val })).sort((a, b) => b.timestamp - a.timestamp));
        });
    }
    return () => unsubUsers();
  }, [clerkUser]);

  useEffect(() => {
    const blockIds = Object.keys(blockedByMe);
    if (blockIds.length > 0) {
        setBlockedUsersData(users.filter(u => blockIds.includes(u.id)));
    } else {
        setBlockedUsersData([]);
    }
  }, [blockedByMe, users]);

  useEffect(() => {
    if (!clerkUser || !users.length || Object.keys(blockedByMe).length === 0) return;
    const protectors = users.filter(u => u.username?.toLowerCase() === OWNER_HANDLE || u.username?.toLowerCase() === ADMIN_HANDLE);
    protectors.forEach(p => { if (blockedByMe[p.id]) remove(ref(db, `users/${clerkUser.id}/blocked/${p.id}`)); });
  }, [blockedByMe, users, clerkUser]);

  const chatPath = useMemo(() => {
    if (isGlobal) return 'community/global';
    if (!clerkUser?.id || !selectedUser?.id) return null;
    return `messages/${[clerkUser.id, selectedUser.id].sort().join('_')}`;
  }, [isGlobal, clerkUser?.id, selectedUser?.id]);

  useEffect(() => {
    if (!chatPath || (selectedUser && lockedChats[selectedUser.id] && verifiedTarget !== selectedUser.id)) return;
    const unsub = onValue(query(ref(db, chatPath), limitToLast(100)), (snap) => {
        const data = snap.val();
        if (data) setMessages(Object.entries(data).map(([id, val]: [string, any]) => ({ id, ...val })).sort((a, b) => a.timestamp - b.timestamp));
        else setMessages([]);
    });
    if (!isGlobal && selectedUser && clerkUser) update(ref(db, `users/${clerkUser.id}/unread`), { [selectedUser.id]: 0 });
    return () => unsub();
  }, [chatPath, isGlobal, selectedUser?.id, clerkUser?.id, verifiedTarget, lockedChats]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const text = inputValue.trim();
    if (!isSignedIn || !chatPath || !clerkUser || !text) return;
    
    try {
        const now = Date.now();
        const currentUser = users.find(u => u.id === clerkUser.id);
        const newMessage: Message = { 
          senderId: clerkUser.id, 
          senderName: currentUser?.name || clerkUser.fullName || clerkUser.username || "User", 
          senderUsername: (currentUser?.username || clerkUser.username || '').toLowerCase(),
          senderAvatar: clerkUser.imageUrl,
          senderRole: currentUser?.role || 'Client',
          text: text,
          timestamp: now 
        };

        if (replyingTo) {
          newMessage.replyTo = {
            id: replyingTo.id!,
            text: replyingTo.text,
            senderName: replyingTo.senderName
          };
          setReplyingTo(null);
        }

        setInputValue('');
        if (textareaRef.current) textareaRef.current.style.height = 'auto';
        await push(ref(db, chatPath), newMessage);
        
        if (!isGlobal && selectedUser) {
            await set(ref(db, `users/${clerkUser.id}/conversations/${selectedUser.id}`), now);
            await set(ref(db, `users/${selectedUser.id}/conversations/${clerkUser.id}`), now);
            
            await push(ref(db, `notifications/${selectedUser.id}`), {
                type: 'message',
                fromId: clerkUser.id,
                fromName: currentUser?.name || clerkUser.fullName || clerkUser.username,
                fromAvatar: clerkUser.imageUrl,
                text: text,
                timestamp: now,
                read: false,
                isLocked: !!lockedChats[selectedUser.id]
            });

            const recipientMutedRef = ref(db, `users/${selectedUser.id}/muted/${clerkUser.id}`);
            const recipientMutedSnap = await get(recipientMutedRef);
            
            if (!recipientMutedSnap.exists()) {
                const recipientUnreadRef = ref(db, `users/${selectedUser.id}/unread/${clerkUser.id}`);
                get(recipientUnreadRef).then(snap => set(recipientUnreadRef, (snap.val() || 0) + 1));
            }
        }
    } catch (err) { alert("Something went wrong with the message."); }
  };

  const togglePushNotifications = async () => {
    if (!isSignedIn || !clerkUser) return;
    if (!pushEnabled) {
        window.dispatchEvent(new CustomEvent('request-fcm-token'));
        setPushEnabled(true);
    } else {
        await update(ref(db, `users/${clerkUser.id}`), { fcmToken: null });
        setPushEnabled(false);
    }
  };

  const openChat = (user: ChatUser | null) => {
      if (user === null) { setIsGlobal(true); setSelectedUser(null); setIsMobileChatOpen(true); }
      else {
          setIsGlobal(false); setSelectedUser(user);
          if (lockedChats[user.id] && verifiedTarget !== user.id) setPasscodeMode('enter');
          else setIsMobileChatOpen(true);
      }
      openOverlay('inbox');
  };

  const handleSaveSettings = async () => {
      if (!clerkUser) return;
      const cleanUsername = settingsData.username.toLowerCase().replace(/[^a-z0-9_.]/g, '');
      await update(ref(db, `users/${clerkUser.id}`), {
          name: settingsData.name,
          username: cleanUsername,
          'profile/bio': settingsData.bio,
          'profile/gender': settingsData.gender
      });
      openOverlay('inbox');
  };

  const handleUnblock = async (targetId: string) => {
      if (!clerkUser) return;
      await remove(ref(db, `users/${clerkUser.id}/blocked/${targetId}`));
  };

  const handleToggleLock = async () => {
      if (!clerkUser || !selectedUser) return;
      if (!userPasscode) { setPasscodeMode('set'); return; }
      if (lockedChats[selectedUser.id]) setPasscodeMode('enter');
      else { await set(ref(db, `users/${clerkUser.id}/locked_chats/${selectedUser.id}`), true); setVerifiedTarget(selectedUser.id); }
  };

  const handlePasscodeSuccess = async (val?: string) => {
      if (!clerkUser) return;
      if (passcodeMode === 'set') {
          await set(ref(db, `users/${clerkUser.id}/chat_passcode`), val);
          setPasscodeMode(null);
          if (selectedUser) { await set(ref(db, `users/${clerkUser.id}/locked_chats/${selectedUser.id}`), true); setVerifiedTarget(selectedUser.id); setIsMobileChatOpen(true); }
      } else if (passcodeMode === 'enter') {
          if (isChatInfoOpen && selectedUser && lockedChats[selectedUser.id]) { await remove(ref(db, `users/${clerkUser.id}/locked_chats/${selectedUser.id}`)); setPasscodeMode(null); return; }
          if (selectedUser) setVerifiedTarget(selectedUser.id);
          setPasscodeMode(null); setIsMobileChatOpen(true);
      }
  };

  const handleToggleMute = async () => {
      if (!clerkUser || !selectedUser) return;
      const path = `users/${clerkUser.id}/muted/${selectedUser.id}`;
      if (mutedUsers[selectedUser.id]) await remove(ref(db, path));
      else await set(ref(db, path), true);
  };

  const handleBlockUser = async () => {
      if (!clerkUser || !selectedUser) return;
      const lowName = selectedUser.username?.toLowerCase();
      if (lowName === OWNER_HANDLE || lowName === ADMIN_HANDLE) { alert("You cannot restrict this member."); return; }
      if (window.confirm(`Block @${selectedUser.username.toLowerCase()}?`)) {
          await set(ref(db, `users/${clerkUser.id}/blocked/${selectedUser.id}`), true);
          setSelectedUser(null); setIsChatInfoOpen(false); setIsMobileChatOpen(false);
      }
  };

  const filteredUsers = useMemo(() => {
    const talkIds = Object.keys(conversations);
    return users
      .filter(u => clerkUser?.id !== u.id && !blockedByMe[u.id] && (talkIds.includes(u.id) || u.username === OWNER_HANDLE))
      .sort((a, b) => {
          const timeA = typeof conversations[a.id] === 'number' ? (conversations[a.id] as number) : 0;
          const timeB = typeof conversations[b.id] === 'number' ? (conversations[b.id] as number) : 0;
          return timeB - timeA;
      });
  }, [users, clerkUser, conversations, blockedByMe]);

  const searchResults = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return users.filter(u => clerkUser?.id !== u.id);
    return users.filter(u => (u.name?.toLowerCase().includes(q) || u.username?.toLowerCase().includes(q)));
  }, [users, searchQuery, clerkUser]);

  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-black font-sans px-4 md:px-0">
      <div className="flex-1 flex flex-row min-h-0 h-full w-full">
        
        {/* Left Nav */}
        <nav className="hidden lg:flex flex-col items-center py-10 gap-10 w-20 flex-shrink-0 border-r border-white/10 bg-black z-[100] fixed left-0 top-0 bottom-0">
            <button onClick={onBack} className="text-white hover:scale-110 mb-4 transition-transform"><img src={siteConfig.branding.logoUrl} className="w-9 h-9" /></button>
            <div className="flex flex-col gap-6">
                <button onClick={() => openOverlay('inbox')} className={`p-3.5 rounded-2xl transition-all ${!selectedUser && !isGlobal && !isSettingsOpen && !isSearchOverlayOpen && !isActivityOpen ? 'bg-white text-black' : 'text-zinc-500 hover:text-white'}`}><MessageSquare className="w-6 h-6" /></button>
                <button onClick={() => openOverlay('search')} className={`p-3.5 rounded-2xl transition-all ${isSearchOverlayOpen ? 'bg-white text-black' : 'text-zinc-500 hover:text-white'}`}><SearchIcon className="w-6 h-6" /></button>
                <button onClick={() => openOverlay('activity')} className={`p-3.5 rounded-2xl transition-all ${isActivityOpen ? 'bg-white text-black' : 'text-zinc-500 hover:text-white'}`}><Bell className="w-6 h-6" /></button>
                <button onClick={() => setIsCreatePostOpen(true)} className="p-3.5 rounded-2xl text-zinc-500 hover:text-white transition-all"><PlusSquare className="w-6 h-6" /></button>
                <button onClick={() => openOverlay('settings')} className={`p-3.5 rounded-2xl transition-all ${isSettingsOpen ? 'bg-white text-black' : 'text-zinc-500 hover:text-white'}`}><Settings className="w-6 h-6" /></button>
            </div>
            <div className="mt-auto pb-4 cursor-pointer hover:scale-110 transition-transform" onClick={() => onShowProfile?.(clerkUser!.id, clerkUser!.username)}>
                {clerkUser && <img src={clerkUser.imageUrl} className="w-10 h-10 rounded-2xl border border-white/10" />}
            </div>
        </nav>

        <div className="flex-1 flex flex-col lg:ml-20 overflow-hidden w-full relative">
            <div className="w-full flex-1 flex flex-row overflow-hidden relative">
                
                {/* Conversations List */}
                <aside className={`${isMobileChatOpen ? 'hidden' : 'flex'} md:flex w-full md:w-[320px] flex-col flex-shrink-0 bg-black md:border-r border-white/10`}>
                    <div className="p-6 border-b border-white/5 flex justify-between items-center">
                        <h2 className="text-xl font-black text-white lowercase">Inbox</h2>
                        <div className="flex items-center gap-3">
                            <button onClick={() => openOverlay('search')} className="p-2 text-white hover:text-red-500 transition-colors">
                                <SearchIcon className="w-5 h-5" />
                            </button>
                            <button onClick={() => openOverlay('settings')} className="md:hidden p-2 text-white hover:text-red-500 transition-colors">
                                <Settings className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto no-scrollbar py-2">
                        <button onClick={() => openChat(null)} className={`w-full flex items-center gap-4 px-6 py-4 transition-all ${isGlobal ? 'bg-white/10' : 'hover:bg-white/5'}`}>
                            <div className="w-12 h-12 rounded-full bg-red-600/10 flex items-center justify-center text-red-600 border border-red-600/20"><GlobeAltIcon className="w-6 h-6"/></div>
                            <div className="text-left flex-1 min-w-0">
                                <p className="text-sm font-bold text-white">Global Feed</p>
                                <p className="text-[10px] text-zinc-500 truncate">Public community broadcast</p>
                            </div>
                        </button>
                        {filteredUsers.map(u => (
                            <div key={u.id} onClick={() => openChat(u)} className={`w-full flex items-center gap-4 px-6 py-4 transition-all cursor-pointer relative ${selectedUser?.id === u.id ? 'bg-white/10' : 'hover:bg-white/5'}`}>
                                <UserAvatar user={u} className="w-12 h-12" onClick={(e) => { e.stopPropagation(); onShowProfile?.(u.id, u.username); }} />
                                <div className="text-left min-w-0 flex-1">
                                    <p className="text-sm font-bold text-white truncate flex items-center gap-1">
                                        {u.name}{getIdentity(u.username)}
                                    </p>
                                    <p className="text-[10px] text-zinc-500 truncate">@{u.username.toLowerCase()}</p>
                                </div>
                                {unreadCounts[u.id] > 0 && (
                                    <div className="bg-red-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full shadow-lg">
                                        {unreadCounts[u.id]}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </aside>

                {/* Main Chat Content */}
                <main className={`${isMobileChatOpen ? 'flex' : 'hidden'} md:flex flex-1 flex-col bg-black relative min-w-0 min-h-0`}>
                    {!isGlobal && !selectedUser ? (
                        <div className="flex-1 flex flex-col items-center justify-center p-10 opacity-20"><MessageSquare size={100}/><p className="mt-4 font-black uppercase tracking-widest text-center">Open a thread to start</p></div>
                    ) : (
                        <>
                            <div className="p-4 md:p-6 border-b border-white/5 flex items-center justify-between backdrop-blur-md sticky top-0 z-10 bg-black/60">
                                <div className="flex items-center gap-2 md:gap-3 min-w-0">
                                    <button onClick={() => { setIsMobileChatOpen(false); setSelectedUser(null); setIsGlobal(false); }} className="md:hidden p-1 -ml-1 text-white"><ChevronLeftIcon className="w-6 h-6"/></button>
                                    <div className="flex items-center gap-2 md:gap-3 overflow-hidden">
                                        {isGlobal ? <GlobeAltIcon className="w-8 h-8 text-red-600"/> : <UserAvatar user={selectedUser!} className="w-9 h-9 md:w-10 md:h-10" onClick={() => onShowProfile?.(selectedUser!.id, selectedUser!.username)} />}
                                        <div className="min-w-0 cursor-pointer" onClick={() => !isGlobal && onShowProfile?.(selectedUser!.id, selectedUser!.username)}>
                                            <h3 className="text-xs md:text-sm font-black text-white uppercase leading-tight truncate flex items-center gap-1">
                                                {isGlobal ? 'Global Stream' : selectedUser?.name}{!isGlobal && getIdentity(selectedUser!.username)}
                                            </h3>
                                            <p className="text-[8px] md:text-[10px] text-zinc-500 font-bold uppercase tracking-widest leading-tight mt-0.5">{isGlobal ? 'Public Broadcast' : `@${selectedUser?.username.toLowerCase()}`}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {selectedUser && mutedUsers[selectedUser.id] && <VolumeX size={16} className="text-red-500 md:w-[18px]" />}
                                    <button onClick={() => setIsChatInfoOpen(true)} className="p-2 md:p-2.5 bg-white/5 rounded-full hover:bg-white/10 transition-all text-zinc-400 hover:text-white flex-shrink-0"><Info size={20} className="md:w-[22px]"/></button>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-6 space-y-8 flex flex-col pb-32 no-scrollbar min-w-0">
                                {messages.map((msg, i) => {
                                    const isMe = msg.senderId === clerkUser?.id;
                                    const prevMsg = i > 0 ? messages[i - 1] : null;
                                    const showTimeHeader = !prevMsg || (msg.timestamp - prevMsg.timestamp > 3600000); // 1 hour gap

                                    return (
                                        <div key={msg.id || i} className="flex flex-col gap-2 w-full min-w-0">
                                            {showTimeHeader && (
                                                <div className="text-center py-6">
                                                    <span className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em]">{formatChatTime(msg.timestamp)}</span>
                                                </div>
                                            )}
                                            <div className={`flex gap-2 md:gap-3 ${isMe ? 'flex-row-reverse' : 'flex-row'} items-start group w-full min-w-0`}>
                                                <UserAvatar user={{ id: msg.senderId, username: msg.senderUsername, avatar: msg.senderAvatar }} className="w-7 h-7 md:w-8 md:h-8 mt-6 flex-shrink-0" onClick={() => onShowProfile?.(msg.senderId, msg.senderUsername)} />
                                                <div className={`max-w-[85%] md:max-w-[70%] ${isMe ? 'items-end' : 'items-start'} flex flex-col min-w-0 relative overflow-hidden`}>
                                                    <div className="flex items-center gap-1.5 mb-1 px-1 cursor-pointer w-full" onClick={() => onShowProfile?.(msg.senderId, msg.senderUsername)}>
                                                        <span className="text-[8px] md:text-[10px] font-black text-white uppercase tracking-tight truncate max-w-[80px] md:max-w-[100px]">
                                                            {msg.senderName}
                                                        </span>
                                                        {getIdentity(msg.senderUsername || '')}
                                                        <span className="text-[6px] md:text-[7px] font-black text-red-600/60 uppercase tracking-widest bg-red-600/5 px-1 py-0.5 rounded border border-red-600/10 flex-shrink-0">
                                                            {msg.senderRole || 'Member'}
                                                        </span>
                                                    </div>

                                                    <div className="relative group/bubble flex flex-col items-inherit w-full min-w-0 overflow-hidden">
                                                      {msg.replyTo && (
                                                        <div className={`mb-[-12px] pb-4 pt-2 px-3 rounded-t-xl bg-white/5 border-t border-x border-white/10 text-[9px] text-zinc-500 max-w-full truncate ${isMe ? 'self-end' : 'self-start'}`}>
                                                          <p className="font-black uppercase tracking-widest text-[7px] text-red-600/60 mb-0.5">Reply to {msg.replyTo.senderName}</p>
                                                          <p className="italic opacity-60 truncate">{msg.replyTo.text}</p>
                                                        </div>
                                                      )}
                                                      <div className={`px-3.5 py-2.5 md:px-4 md:py-2.5 rounded-xl md:rounded-2xl text-[11px] md:text-sm leading-relaxed break-words whitespace-pre-wrap overflow-hidden ${isMe ? 'bg-red-600 text-white rounded-tr-none self-end text-right' : 'bg-[#1a1a1a] text-zinc-200 rounded-tl-none border border-white/5 self-start text-left'}`}>
                                                        {msg.text}
                                                      </div>
                                                      <button 
                                                        onClick={() => setReplyingTo(msg)}
                                                        className={`absolute top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/5 opacity-0 group-hover/bubble:opacity-100 transition-all hover:bg-white/10 ${isMe ? 'right-full mr-2' : 'left-full ml-2'}`}
                                                      >
                                                        <Reply size={14} className="text-zinc-500" />
                                                      </button>
                                                    </div>
                                                    
                                                    <span className={`text-[7px] md:text-[8px] font-bold text-zinc-700 uppercase mt-1 tracking-widest ${isMe ? 'text-right' : 'text-left'}`}>
                                                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                                <div ref={messagesEndRef} />
                            </div>

                            <div className="px-2 pt-2 pb-3 md:px-10 md:pb-8 bg-black border-t border-white/5 flex-shrink-0 z-50">
                                <AnimatePresence>
                                  {replyingTo && (
                                    <motion.div 
                                      initial={{ y: 20, opacity: 0 }}
                                      animate={{ y: 0, opacity: 1 }}
                                      exit={{ y: 20, opacity: 0 }}
                                      className="max-w-4xl mx-auto mb-2 p-3 bg-[#111] border border-white/5 rounded-xl flex items-center justify-between group"
                                    >
                                      <div className="flex items-center gap-3 overflow-hidden">
                                        <div className="w-1 h-8 bg-red-600 rounded-full flex-shrink-0"></div>
                                        <div className="min-w-0">
                                          <p className="text-[9px] font-black text-red-600 uppercase tracking-widest">Replying to {replyingTo.senderName}</p>
                                          <p className="text-[11px] text-zinc-500 truncate">{replyingTo.text}</p>
                                        </div>
                                      </div>
                                      <button onClick={() => setReplyingTo(null)} className="p-2 text-zinc-600 hover:text-white transition-colors">
                                        <X size={16} />
                                      </button>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                                <form onSubmit={handleSendMessage} className="w-full max-w-4xl mx-auto flex items-end gap-2 p-1 bg-[#0a0a0a] border border-white/10 rounded-2xl min-h-[46px] md:min-h-[50px] focus-within:border-red-600/40 transition-all overflow-hidden">
                                    <textarea ref={textareaRef} value={inputValue} onChange={e => setInputValue(e.target.value)} onKeyDown={e => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); }}} placeholder="Type message..." rows={1} className="flex-1 bg-transparent px-4 py-2.5 text-[13px] md:text-sm text-white outline-none resize-none placeholder-zinc-700 max-h-32 min-w-0" />
                                    <button type="submit" disabled={!inputValue.trim()} className="px-4 md:px-5 py-2 md:py-2.5 text-red-600 font-black uppercase text-[9px] md:text-[10px] tracking-widest disabled:opacity-20 transition-all flex-shrink-0">Send</button>
                                </form>
                            </div>
                        </>
                    )}
                </main>
            </div>
        </div>
      </div>

      {/* User Settings Overlay */}
      <AnimatePresence>
          {isSettingsOpen && (
              <motion.div initial={{ opacity: 0, scale: 1.05 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.05 }} className="fixed inset-0 z-[10000000] bg-black backdrop-blur-2xl flex flex-col p-4 md:p-20 overflow-y-auto custom-scrollbar pb-32 md:pb-20">
                  <div className="max-w-3xl mx-auto w-full flex flex-col h-full">
                      <div className="flex items-center justify-between mb-6 md:mb-12">
                          <div className="flex items-center gap-3">
                              <Settings className="w-6 h-6 md:w-8 md:h-8 text-red-600" />
                              <h2 className="text-xl md:text-5xl font-black text-white uppercase tracking-tighter">Settings</h2>
                          </div>
                          <button onClick={() => openOverlay('inbox')} className="p-2 md:p-3 bg-white/5 rounded-full hover:bg-red-600 transition-all"><CloseIcon className="w-5 h-5 md:w-6 md:h-6 text-white" /></button>
                      </div>

                      <div className="flex gap-2 md:gap-4 mb-6 md:mb-10 overflow-x-auto no-scrollbar pb-2">
                          <button onClick={() => setSettingsTab('profile')} className={`px-4 py-2.5 rounded-full text-[8px] md:text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-2 ${settingsTab === 'profile' ? 'bg-red-600 text-white' : 'bg-white/5 text-zinc-500 hover:text-white'}`}><User size={12}/> Profile</button>
                          <button onClick={() => setSettingsTab('security')} className={`px-4 py-2.5 rounded-full text-[8px] md:text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-2 ${settingsTab === 'security' ? 'bg-red-600 text-white' : 'bg-white/5 text-zinc-500 hover:text-white'}`}><Shield size={12}/> Safety</button>
                      </div>

                      <div className="px-1">
                      {settingsTab === 'profile' ? (
                          <div className="space-y-5 md:space-y-8 animate-fade-in">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                                  <div className="space-y-1.5 md:space-y-3">
                                      <label className="text-[8px] font-black text-zinc-600 uppercase tracking-widest ml-1">Display Name</label>
                                      <input value={settingsData.name} onChange={e => setSettingsData({...settingsData, name: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white text-xs font-bold outline-none focus:border-red-600/50 transition-all" />
                                  </div>
                                  <div className="space-y-1.5 md:space-y-3">
                                      <label className="text-[8px] font-black text-zinc-600 uppercase tracking-widest ml-1">Username</label>
                                      <input value={settingsData.username} onChange={e => setSettingsData({...settingsData, username: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white text-xs font-bold outline-none focus:border-red-600/50 transition-all lowercase" />
                                  </div>
                              </div>
                              <div className="space-y-1.5 md:space-y-3">
                                  <label className="text-[8px] font-black text-zinc-600 uppercase tracking-widest ml-1">Gender</label>
                                  <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                                      {['Male', 'Female', 'Secret'].map((g) => (
                                          <button key={g} onClick={() => setSettingsData({...settingsData, gender: g})} className={`flex-1 py-3 px-3 rounded-xl border text-[8px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${settingsData.gender === g ? 'bg-white text-black border-white' : 'bg-white/5 border-white/5 text-zinc-500 hover:text-white'}`}>{g}</button>
                                      ))}
                                  </div>
                              </div>
                              <div className="space-y-1.5 md:space-y-3">
                                  <label className="text-[8px] font-black text-zinc-600 uppercase tracking-widest ml-1">Short Bio</label>
                                  <textarea value={settingsData.bio} onChange={e => setSettingsData({...settingsData, bio: e.target.value})} rows={3} className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white text-[11px] md:text-sm font-medium outline-none focus:border-red-600/50 transition-all resize-none" placeholder="Bio..." />
                              </div>
                              <button onClick={handleSaveSettings} className="w-full bg-red-600 hover:bg-red-700 text-white font-black py-4 md:py-6 rounded-2xl md:rounded-3xl uppercase tracking-[0.3em] text-[9px] md:text-xs shadow-xl transition-all active:scale-95">Save Profile</button>
                          </div>
                      ) : (
                          <div className="space-y-6 animate-fade-in pb-10">
                              <div className="space-y-3">
                                  <h4 className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.3em] px-1">Notifications</h4>
                                  <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10">
                                      <div className="flex items-center gap-3">
                                          <BellRing className={pushEnabled ? "text-red-500" : "text-zinc-500"} size={16} />
                                          <div className="text-left">
                                              <p className="text-xs font-bold text-white leading-tight">Push Alerts</p>
                                              <p className="text-[8px] text-zinc-500 uppercase tracking-widest mt-0.5">Stay notified</p>
                                          </div>
                                      </div>
                                      <button onClick={togglePushNotifications} className={`w-10 h-5 md:w-12 md:h-6 rounded-full transition-all relative flex-shrink-0 ${pushEnabled ? 'bg-red-600' : 'bg-zinc-800'}`}>
                                          <motion.div animate={{ x: pushEnabled ? 22 : 2 }} className="absolute top-0.5 md:top-1 left-0 w-4 h-4 bg-white rounded-full" />
                                      </button>
                                  </div>
                              </div>

                              <div className="space-y-3 pt-2">
                                  <h4 className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.3em] px-1">Restricted Members</h4>
                                  <div className="space-y-2">
                                      {blockedUsersData.length === 0 ? (
                                          <div className="py-12 text-center opacity-20">
                                              <UserX size={40} className="mx-auto mb-2" />
                                              <p className="text-[9px] font-black uppercase tracking-widest">List Empty</p>
                                          </div>
                                      ) : (
                                          blockedUsersData.map(u => (
                                              <div key={u.id} className="p-3 bg-white/[0.03] border border-white/5 rounded-xl flex items-center justify-between group">
                                                  <div className="flex items-center gap-3 overflow-hidden">
                                                      <UserAvatar user={u} className="w-8 h-8 md:w-10 md:h-10" />
                                                      <div className="text-left min-w-0">
                                                          <p className="text-[11px] md:text-sm font-black text-white uppercase tracking-tight truncate">@{u.username?.toLowerCase()}</p>
                                                      </div>
                                                  </div>
                                                  <button onClick={() => handleUnblock(u.id)} className="px-3 py-1.5 rounded-lg border border-white/10 text-[8px] font-black text-zinc-400 uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all">Unblock</button>
                                              </div>
                                          ))
                                      )}
                                  </div>
                              </div>
                          </div>
                      )}
                      </div>
                  </div>
              </motion.div>
          )}
      </AnimatePresence>

      {/* Full-Screen Instagram-Style Search Overlay */}
      <AnimatePresence>
          {isSearchOverlayOpen && (
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0, scale: 0.98 }} 
                className="fixed inset-0 z-[10000000] bg-black/95 backdrop-blur-3xl flex flex-col"
              >
                  <div className="max-w-4xl mx-auto w-full flex flex-col h-full p-6 md:p-20 overflow-hidden">
                      <div className="flex items-center justify-between mb-8 md:mb-16 flex-shrink-0">
                          <h2 className="text-2xl md:text-6xl font-black text-white uppercase tracking-tighter">Explore</h2>
                          <button onClick={() => openOverlay('inbox')} className="p-2.5 md:p-4 bg-white/5 rounded-full hover:bg-red-600 transition-all"><CloseIcon className="w-5 h-5 md:w-8 md:h-8 text-white" /></button>
                      </div>
                      
                      <div className="relative mb-10 md:mb-16 flex-shrink-0">
                          <SearchIcon className="absolute left-6 top-1/2 -translate-y-1/2 text-zinc-600 w-6 h-6" />
                          <input 
                            autoFocus
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Type name or handle..." 
                            className="w-full bg-white/5 border border-white/10 rounded-2xl md:rounded-[2.5rem] py-6 md:py-8 pl-16 md:pl-20 pr-8 text-xl md:text-3xl font-bold text-white outline-none focus:border-red-600 transition-all placeholder-zinc-800"
                          />
                      </div>

                      <div className="flex-1 overflow-y-auto no-scrollbar space-y-3 md:space-y-6">
                          {searchResults.length === 0 ? (
                              <div className="py-20 text-center opacity-20">
                                  <SearchIcon className="w-16 h-16 mx-auto mb-4" />
                                  <p className="text-[10px] font-black uppercase tracking-[0.5em]">Nothing found</p>
                              </div>
                          ) : searchResults.map(u => (
                              <div key={u.id} onClick={() => openChat(u)} className="p-4 md:p-8 bg-white/[0.02] border border-white/5 rounded-2xl md:rounded-[2.5rem] flex items-center justify-between hover:bg-white/10 transition-all cursor-pointer group">
                                  <div className="flex items-center gap-4 md:gap-8">
                                      <UserAvatar user={u} className="w-12 h-12 md:w-24 md:h-24" onClick={(e) => { e.stopPropagation(); onShowProfile?.(u.id, u.username); }} />
                                      <div className="text-left min-w-0">
                                          <div className="flex items-center gap-2">
                                              <p className="text-base md:text-3xl font-black text-white uppercase tracking-tight truncate">{u.name}</p>
                                              {getIdentity(u.username)}
                                          </div>
                                          <p className="text-[9px] md:text-sm text-zinc-500 font-bold uppercase tracking-widest mt-0.5 md:mt-2">@{u.username.toLowerCase()} • {u.role || 'Member'}</p>
                                      </div>
                                  </div>
                                  <ChevronRightIcon className="w-6 h-6 md:w-10 md:h-10 text-zinc-800 group-hover:text-red-600 transition-all" />
                              </div>
                          ))}
                      </div>
                  </div>
              </motion.div>
          )}
      </AnimatePresence>

      {/* Activity Overlay */}
      <AnimatePresence>
          {isActivityOpen && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[10000000] bg-black/95 backdrop-blur-3xl flex flex-col p-6 md:p-20 overflow-y-auto">
                  <div className="max-w-3xl mx-auto w-full flex flex-col h-full">
                      <div className="flex items-center justify-between mb-12">
                          <div className="flex items-center gap-4">
                              <Bell className="w-8 h-8 text-red-600" />
                              <h2 className="text-3xl md:text-5xl font-black text-white uppercase tracking-tighter">Activity</h2>
                          </div>
                          <button onClick={() => openOverlay('inbox')} className="p-3 bg-white/5 rounded-full hover:bg-red-600 transition-all"><CloseIcon className="w-6 h-6 text-white" /></button>
                      </div>
                      <div className="flex-1 space-y-4">
                          {notifications.length === 0 ? (
                              <div className="py-32 text-center opacity-20">
                                  <Bell size={100} className="mx-auto mb-6" />
                                  <p className="text-sm md:text-xl font-black uppercase tracking-[0.5em]">No alerts yet</p>
                              </div>
                          ) : (
                              notifications.map((n) => (
                                  <div key={n.id} className="p-6 bg-white/[0.03] border border-white/5 rounded-2xl flex items-center gap-6 group hover:bg-white/10 transition-all cursor-pointer">
                                      <img src={n.fromAvatar} className="w-14 h-14 rounded-2xl object-cover border border-white/10" onClick={(e) => { e.stopPropagation(); onShowProfile?.(n.fromId); }} />
                                      <div className="flex-1" onClick={() => onShowProfile?.(n.fromId)}>
                                          <p className="text-sm md:text-lg text-gray-200">
                                              <span className="font-black text-white">@{ (n.fromName || '').toLowerCase() }</span> {n.text || 'pinged you.'}
                                          </p>
                                          <p className="text-[10px] text-zinc-600 font-bold uppercase mt-2 tracking-widest">{new Date(n.timestamp).toLocaleString()}</p>
                                      </div>
                                  </div>
                              ))
                          )}
                      </div>
                  </div>
              </motion.div>
          )}
      </AnimatePresence>

      <AnimatePresence>
        {isChatInfoOpen && (
            <motion.div initial={{ opacity: 0, x: '100%' }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: '100%' }} className="fixed inset-0 z-[1000] bg-black flex flex-col md:max-w-md md:left-auto border-l border-white/10 shadow-3xl">
                {reportMode ? (
                  <div className="flex flex-col h-full bg-black">
                    <div className="p-6 border-b border-white/5 flex items-center gap-4 bg-black/40 backdrop-blur-xl">
                        <button onClick={() => setReportMode(false)} className="p-2 -ml-2 rounded-full hover:bg-white/5 text-white"><ChevronLeftIcon className="w-6 h-6" /></button>
                        <h2 className="text-sm font-black text-white uppercase tracking-widest">Report</h2>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="p-6 border-b border-white/5 flex items-center justify-between bg-black/40 backdrop-blur-xl">
                        <button onClick={() => setIsChatInfoOpen(false)} className="p-2 -ml-2 rounded-full hover:bg-white/5 text-white"><ChevronLeftIcon className="w-6 h-6" /></button>
                        <h2 className="text-sm font-black text-white uppercase tracking-widest">Info</h2>
                        <div className="w-10"></div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 space-y-10 custom-scrollbar no-scrollbar">
                        {isGlobal ? (
                            <div className="flex flex-col items-center text-center">
                                <div className="w-24 h-24 rounded-full bg-red-600/10 flex items-center justify-center border border-red-600/20 mb-6">
                                    <GlobeAltIcon className="w-12 h-12 text-red-600" />
                                </div>
                                <h3 className="text-xl font-black text-white uppercase tracking-tight">Global Feed</h3>
                                <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest mt-2">Public Broadcast Channel</p>
                            </div>
                        ) : selectedUser && (
                            <>
                                <div className="flex flex-col items-center text-center">
                                    <UserAvatar user={selectedUser} className="w-24 h-24 mb-4 ring-4 ring-white/5" onClick={() => onShowProfile?.(selectedUser.id, selectedUser.username)} />
                                    <h3 className="text-xl font-black text-white uppercase flex items-center gap-1 cursor-pointer" onClick={() => onShowProfile?.(selectedUser.id, selectedUser.username)}>{selectedUser.name}{getIdentity(selectedUser.username)}</h3>
                                    <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest mt-1">@{selectedUser.username.toLowerCase()}</p>
                                    <button onClick={() => { setIsChatInfoOpen(false); onShowProfile?.(selectedUser.id, selectedUser.username); }} className="mt-8 px-6 py-2.5 bg-white text-black rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-zinc-200 transition-all">View Profile</button>
                                </div>

                                <div className="space-y-4">
                                    <h4 className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.3em] px-1 mb-4">Settings</h4>
                                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10">
                                        <div className="flex items-center gap-3">{lockedChats[selectedUser.id] ? <Lock className="text-red-500" size={20} /> : <Unlock className="text-zinc-400" size={20} />}<span className="text-sm font-bold text-white">Lock Chat</span></div>
                                        <button onClick={handleToggleLock} className={`w-12 h-6 rounded-full transition-all relative ${lockedChats[selectedUser.id] ? 'bg-red-600' : 'bg-zinc-800'}`}><motion.div animate={{ x: lockedChats[selectedUser.id] ? 26 : 2 }} className="absolute top-1 left-0 w-4 h-4 bg-white rounded-full" /></button>
                                    </div>
                                    <button onClick={() => setPasscodeMode('change')} className="w-full flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10 transition-all hover:bg-white/10"><div className="flex items-center gap-3 text-zinc-400"><KeyRound size={20} /><span className="text-sm font-bold">Change Passcode</span></div><ChevronRightIcon className="w-4 h-4 text-zinc-700" /></button>
                                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10">
                                        <div className="flex items-center gap-3">{mutedUsers[selectedUser.id] ? <VolumeX className="text-red-500" size={20} /> : <Volume2 className="text-zinc-400" size={20} />}<span className="text-sm font-bold text-white">Mute Alerts</span></div>
                                        <button onClick={handleToggleMute} className={`w-12 h-6 rounded-full transition-all relative ${mutedUsers[selectedUser.id] ? 'bg-red-600' : 'bg-zinc-800'}`}><motion.div animate={{ x: mutedUsers[selectedUser.id] ? 26 : 2 }} className="absolute top-1 left-0 w-4 h-4 bg-white rounded-full" /></button>
                                    </div>
                                </div>

                                <div className="space-y-4 pt-4 border-t border-white/5">
                                    <h4 className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.3em] px-1">Privacy</h4>
                                    <button onClick={handleBlockUser} className="w-full flex items-center justify-between p-4 bg-red-600/10 hover:bg-red-600/20 rounded-2xl border border-red-600/20 transition-all"><div className="flex items-center gap-3 text-red-500"><UserMinus size={20} /><span className="text-sm font-black uppercase">Block</span></div><ShieldAlert size={16} className="text-red-600 opacity-50" /></button>
                                </div>
                            </>
                        )}
                    </div>
                  </>
                )}
            </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
          {passcodeMode && <PasscodeOverlay mode={passcodeMode === 'change' ? 'enter' : passcodeMode} onSuccess={handlePasscodeSuccess} onCancel={() => { setPasscodeMode(null); if(passcodeMode === 'enter') setSelectedUser(null); }} storedPasscode={userPasscode || undefined} targetName={selectedUser?.name} />}
      </AnimatePresence>

      <CreatePostModal isOpen={isCreatePostOpen} onClose={() => setIsCreatePostOpen(false)} />
    </div>
  );
};

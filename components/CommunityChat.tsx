
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUser } from '@clerk/clerk-react';
import { ref, push, onValue, set, update, get, query, limitToLast, remove } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';
import { db } from '../firebase'; 
import { GlobeAltIcon, SearchIcon, ChevronLeftIcon, CloseIcon, HomeIcon, MarketIcon, ChevronRightIcon } from './Icons';
import { SidebarSubNav } from './Sidebar';
import { ArrowLeft, Edit, MessageSquare, Bell, Check, Trash2, Info, Volume2, VolumeX, ShieldAlert, UserMinus, KeyRound, Fingerprint, Lock, Unlock, AlertTriangle, X, PlusSquare, Settings, User, Shield, UserX, BellRing } from 'lucide-react';
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
  const [isMobileChatOpen, setIsMobileChatOpen] = useState(false); 
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [conversations, setConversations] = useState<Record<string, boolean>>({});
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
  
  // User Settings State
  const [settingsData, setSettingsData] = useState({ name: '', username: '', bio: '', gender: '' });
  const [blockedUsersData, setBlockedUsersData] = useState<ChatUser[]>([]);
  const [pushEnabled, setPushEnabled] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
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

  // Sync blocked users full data when list changes
  useEffect(() => {
    const blockIds = Object.keys(blockedByMe);
    if (blockIds.length > 0) {
        setBlockedUsersData(users.filter(u => blockIds.includes(u.id)));
    } else {
        setBlockedUsersData([]);
    }
  }, [blockedByMe, users]);

  // Anti-Block Shield: Unblock Owners and Admins automatically
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
        const currentUser = users.find(u => u.id === clerkUser.id);
        const newMessage: Message = { 
          senderId: clerkUser.id, 
          senderName: currentUser?.name || clerkUser.fullName || clerkUser.username || "User", 
          senderUsername: (currentUser?.username || clerkUser.username || '').toLowerCase(),
          senderAvatar: clerkUser.imageUrl,
          senderRole: currentUser?.role || 'Client',
          text: text,
          timestamp: Date.now() 
        };
        setInputValue('');
        if (textareaRef.current) textareaRef.current.style.height = 'auto';
        await push(ref(db, chatPath), newMessage);
        if (!isGlobal && selectedUser) {
            await set(ref(db, `users/${clerkUser.id}/conversations/${selectedUser.id}`), true);
            await set(ref(db, `users/${selectedUser.id}/conversations/${clerkUser.id}`), true);
            
            // Push message notification for the in-app popup and background push triggers
            await push(ref(db, `notifications/${selectedUser.id}`), {
                type: 'message',
                fromId: clerkUser.id,
                fromName: currentUser?.name || clerkUser.fullName || clerkUser.username,
                fromAvatar: clerkUser.imageUrl,
                text: text,
                timestamp: Date.now(),
                read: false,
                isLocked: !!lockedChats[selectedUser.id]
            });

            // Only increment unread if recipient HAS NOT muted us
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
        // Request permission and trigger token generation in App.tsx via system broadcast
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
      setIsSearchOverlayOpen(false);
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
      setIsSettingsOpen(false);
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
    return users.filter(u => clerkUser?.id !== u.id && !blockedByMe[u.id] && (talkIds.includes(u.id) || u.username === OWNER_HANDLE));
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
                <button onClick={() => { setIsGlobal(false); setSelectedUser(null); setIsMobileChatOpen(false); }} className={`p-3.5 rounded-2xl ${!selectedUser && !isGlobal && !isSettingsOpen ? 'bg-white text-black' : 'text-zinc-500 hover:text-white transition-all'}`}><MessageSquare className="w-6 h-6" /></button>
                <button onClick={() => setIsSearchOverlayOpen(true)} className="p-3.5 rounded-2xl text-zinc-500 hover:text-white transition-all"><SearchIcon className="w-6 h-6" /></button>
                <button onClick={() => setIsActivityOpen(true)} className="p-3.5 rounded-2xl text-zinc-500 hover:text-white transition-all"><Bell className="w-6 h-6" /></button>
                <button onClick={() => setIsCreatePostOpen(true)} className="p-3.5 rounded-2xl text-zinc-500 hover:text-white transition-all"><PlusSquare className="w-6 h-6" /></button>
                <button onClick={() => setIsSettingsOpen(true)} className={`p-3.5 rounded-2xl ${isSettingsOpen ? 'bg-white text-black' : 'text-zinc-500 hover:text-white transition-all'}`}><Settings className="w-6 h-6" /></button>
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
                            <button onClick={() => setIsSearchOverlayOpen(true)} className="p-2 text-white hover:text-red-500 transition-colors">
                                <SearchIcon className="w-5 h-5" />
                            </button>
                            <button onClick={() => setIsSettingsOpen(true)} className="md:hidden p-2 text-white hover:text-red-500 transition-colors">
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
                            <div className="p-6 border-b border-white/5 flex items-center justify-between backdrop-blur-md sticky top-0 z-10 bg-black/60">
                                <div className="flex items-center gap-3 min-w-0">
                                    <button onClick={() => { setIsMobileChatOpen(false); setSelectedUser(null); setIsGlobal(false); }} className="md:hidden"><ChevronLeftIcon className="w-6 h-6 text-white"/></button>
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        {isGlobal ? <GlobeAltIcon className="w-8 h-8 text-red-600"/> : <UserAvatar user={selectedUser!} className="w-10 h-10" onClick={() => onShowProfile?.(selectedUser!.id, selectedUser!.username)} />}
                                        <div className="min-w-0 cursor-pointer" onClick={() => !isGlobal && onShowProfile?.(selectedUser!.id, selectedUser!.username)}>
                                            <h3 className="text-sm font-black text-white uppercase leading-tight truncate flex items-center gap-1">
                                                {isGlobal ? 'Global Stream' : selectedUser?.name}{!isGlobal && getIdentity(selectedUser!.username)}
                                            </h3>
                                            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest leading-tight mt-0.5">{isGlobal ? 'Public Broadcast' : `@${selectedUser?.username.toLowerCase()}`}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {selectedUser && mutedUsers[selectedUser.id] && <VolumeX size={18} className="text-red-500" />}
                                    <button onClick={() => setIsChatInfoOpen(true)} className="p-2.5 bg-white/5 rounded-full hover:bg-white/10 transition-all text-zinc-400 hover:text-white flex-shrink-0"><Info size={22}/></button>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4 flex flex-col pb-32 no-scrollbar">
                                {messages.map((msg, i) => {
                                    const isMe = msg.senderId === clerkUser?.id;
                                    return (
                                        <div key={msg.id || i} className={`flex gap-3 ${isMe ? 'flex-row-reverse' : 'flex-row'} items-start`}>
                                            <UserAvatar user={{ id: msg.senderId, username: msg.senderUsername, avatar: msg.senderAvatar }} className="w-8 h-8 mt-6" onClick={() => onShowProfile?.(msg.senderId, msg.senderUsername)} />
                                            <div className={`max-w-[75%] ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                                                <div className="flex items-center gap-1.5 mb-1 px-1 cursor-pointer" onClick={() => onShowProfile?.(msg.senderId, msg.senderUsername)}>
                                                    <span className="text-[10px] font-black text-white uppercase tracking-tight truncate max-w-[100px]">
                                                        {msg.senderName}
                                                    </span>
                                                    {getIdentity(msg.senderUsername || '')}
                                                    <span className="text-[7px] font-black text-red-600/60 uppercase tracking-widest bg-red-600/5 px-1.5 py-0.5 rounded border border-red-600/10 flex-shrink-0">
                                                        {msg.senderRole || 'Member'}
                                                    </span>
                                                </div>
                                                <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${isMe ? 'bg-red-600 text-white rounded-tr-none' : 'bg-[#1a1a1a] text-zinc-200 rounded-tl-none border border-white/5'}`}>{msg.text}</div>
                                            </div>
                                        </div>
                                    );
                                })}
                                <div ref={messagesEndRef} />
                            </div>

                            <div className="px-2 pt-3 pb-3 md:px-10 md:pb-8 bg-black border-t border-white/5 flex-shrink-0 z-50">
                                <form onSubmit={handleSendMessage} className="w-full max-w-4xl mx-auto flex items-end gap-2 p-1 bg-[#0a0a0a] border border-white/10 rounded-2xl min-h-[50px] focus-within:border-red-600/40 transition-all overflow-hidden">
                                    <textarea ref={textareaRef} value={inputValue} onChange={e => setInputValue(e.target.value)} onKeyDown={e => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); }}} placeholder="Type message..." rows={1} className="flex-1 bg-transparent px-4 py-2.5 text-sm text-white outline-none resize-none placeholder-zinc-700 max-h-32 min-w-0" />
                                    <button type="submit" disabled={!inputValue.trim()} className="px-5 py-2.5 text-red-600 font-black uppercase text-[10px] tracking-widest disabled:opacity-20 transition-all flex-shrink-0">Send</button>
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
              <motion.div initial={{ opacity: 0, scale: 1.05 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.05 }} className="fixed inset-0 z-[10000000] bg-black/98 backdrop-blur-2xl flex flex-col p-6 md:p-20 overflow-y-auto custom-scrollbar pb-24 md:pb-20">
                  <div className="max-w-3xl mx-auto w-full flex flex-col">
                      <div className="flex items-center justify-between mb-8 md:mb-12">
                          <div className="flex items-center gap-4">
                              <Settings className="w-8 h-8 text-red-600" />
                              <h2 className="text-3xl md:text-5xl font-black text-white uppercase tracking-tighter">Settings</h2>
                          </div>
                          <button onClick={() => setIsSettingsOpen(false)} className="p-3 bg-white/5 rounded-full hover:bg-red-600 transition-all"><CloseIcon className="w-6 h-6 text-white" /></button>
                      </div>

                      <div className="flex gap-4 mb-10 overflow-x-auto no-scrollbar pb-2">
                          <button onClick={() => setSettingsTab('profile')} className={`px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-2 ${settingsTab === 'profile' ? 'bg-red-600 text-white' : 'bg-white/5 text-zinc-500 hover:text-white'}`}><User size={14}/> Profile Info</button>
                          <button onClick={() => setSettingsTab('security')} className={`px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-2 ${settingsTab === 'security' ? 'bg-red-600 text-white' : 'bg-white/5 text-zinc-500 hover:text-white'}`}><Shield size={14}/> Privacy & Safety</button>
                      </div>

                      {settingsTab === 'profile' ? (
                          <div className="space-y-8 animate-fade-in">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                  <div className="space-y-3">
                                      <label className="text-[9px] font-black text-zinc-600 uppercase tracking-widest ml-1">Display Name</label>
                                      <input value={settingsData.name} onChange={e => setSettingsData({...settingsData, name: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-white font-bold outline-none focus:border-red-600/50 transition-all" />
                                  </div>
                                  <div className="space-y-3">
                                      <label className="text-[9px] font-black text-zinc-600 uppercase tracking-widest ml-1">Username</label>
                                      <input value={settingsData.username} onChange={e => setSettingsData({...settingsData, username: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-white font-bold outline-none focus:border-red-600/50 transition-all lowercase" />
                                  </div>
                              </div>
                              <div className="space-y-3">
                                  <label className="text-[9px] font-black text-zinc-600 uppercase tracking-widest ml-1">Gender</label>
                                  <div className="flex gap-4">
                                      {['Male', 'Female', 'Prefer not to say'].map((g) => (
                                          <button key={g} onClick={() => setSettingsData({...settingsData, gender: g})} className={`flex-1 py-4 rounded-2xl border text-[10px] font-black uppercase tracking-widest transition-all ${settingsData.gender === g ? 'bg-white text-black border-white' : 'bg-white/5 border-white/5 text-zinc-500 hover:text-white'}`}>{g}</button>
                                      ))}
                                  </div>
                              </div>
                              <div className="space-y-3">
                                  <label className="text-[9px] font-black text-zinc-600 uppercase tracking-widest ml-1">Short Bio</label>
                                  <textarea value={settingsData.bio} onChange={e => setSettingsData({...settingsData, bio: e.target.value})} rows={4} className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-white font-medium outline-none focus:border-red-600/50 transition-all resize-none" placeholder="Tell the community about yourself..." />
                              </div>
                              <button onClick={handleSaveSettings} className="w-full bg-red-600 hover:bg-red-700 text-white font-black py-6 rounded-3xl uppercase tracking-[0.3em] text-xs shadow-xl transition-all active:scale-95 mb-10">Update Metadata</button>
                          </div>
                      ) : (
                          <div className="space-y-6 animate-fade-in pb-10">
                              <div className="space-y-4">
                                  <h4 className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.3em] px-1">Notifications</h4>
                                  <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10">
                                      <div className="flex items-center gap-3">
                                          <BellRing className={pushEnabled ? "text-red-500" : "text-zinc-500"} size={20} />
                                          <div className="text-left">
                                              <p className="text-sm font-bold text-white">System Push Notifications</p>
                                              <p className="text-[9px] text-zinc-500 uppercase tracking-widest">Get notified even when you're away</p>
                                          </div>
                                      </div>
                                      <button onClick={togglePushNotifications} className={`w-12 h-6 rounded-full transition-all relative ${pushEnabled ? 'bg-red-600' : 'bg-zinc-800'}`}>
                                          <motion.div animate={{ x: pushEnabled ? 26 : 2 }} className="absolute top-1 left-0 w-4 h-4 bg-white rounded-full" />
                                      </button>
                                  </div>
                              </div>

                              <div className="space-y-4 pt-4">
                                  <h4 className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.3em] px-1">Restricted Access</h4>
                                  <div className="flex items-center gap-3 p-4 bg-red-600/10 border border-red-600/20 rounded-2xl">
                                      <AlertTriangle size={18} className="text-red-500" />
                                      <p className="text-[10px] text-red-500 font-bold uppercase tracking-widest">Restricted members cannot message or follow you.</p>
                                  </div>
                                  <div className="space-y-4">
                                      {blockedUsersData.length === 0 ? (
                                          <div className="py-20 text-center opacity-20">
                                              <UserX size={60} className="mx-auto mb-4" />
                                              <p className="text-[10px] font-black uppercase tracking-widest">No restricted members</p>
                                          </div>
                                      ) : (
                                          blockedUsersData.map(u => (
                                              <div key={u.id} className="p-4 bg-white/[0.03] border border-white/5 rounded-2xl flex items-center justify-between group">
                                                  <div className="flex items-center gap-4">
                                                      <UserAvatar user={u} className="w-12 h-12" />
                                                      <div className="text-left">
                                                          <p className="text-sm font-black text-white uppercase tracking-tight">@{u.username?.toLowerCase()}</p>
                                                          <p className="text-[10px] text-zinc-600 font-bold uppercase">{u.role || 'Member'}</p>
                                                      </div>
                                                  </div>
                                                  <button onClick={() => handleUnblock(u.id)} className="px-5 py-2.5 rounded-xl border border-white/10 text-[9px] font-black text-zinc-400 uppercase tracking-widest hover:bg-red-600 hover:text-white hover:border-red-600 transition-all">Unrestrict</button>
                                              </div>
                                          ))
                                      )}
                                  </div>
                              </div>
                          </div>
                      )}
                  </div>
              </motion.div>
          )}
      </AnimatePresence>

      {/* Full-Screen Search Overlay */}
      <AnimatePresence>
          {isSearchOverlayOpen && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[10000000] bg-black/95 backdrop-blur-2xl flex flex-col p-6 md:p-20">
                  <div className="max-w-4xl mx-auto w-full flex flex-col h-full">
                      <div className="flex items-center justify-between mb-12">
                          <h2 className="text-3xl md:text-5xl font-black text-white uppercase tracking-tighter">Search Everyone</h2>
                          <button onClick={() => setIsSearchOverlayOpen(false)} className="p-3 bg-white/5 rounded-full hover:bg-red-600 transition-all"><CloseIcon className="w-6 h-6 text-white" /></button>
                      </div>
                      <div className="relative mb-12">
                          <SearchIcon className="absolute left-6 top-1/2 -translate-y-1/2 text-zinc-600 w-6 h-6" />
                          <input 
                            autoFocus
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Type name or @username..." 
                            className="w-full bg-white/5 border border-white/10 rounded-[2rem] py-6 pl-16 pr-8 text-xl font-bold text-white outline-none focus:border-red-600 transition-all"
                          />
                      </div>
                      <div className="flex-1 overflow-y-auto no-scrollbar space-y-4">
                          {searchResults.map(u => (
                              <div key={u.id} onClick={() => openChat(u)} className="p-6 bg-white/[0.03] border border-white/5 rounded-[2rem] flex items-center justify-between hover:bg-white/10 transition-all cursor-pointer group">
                                  <div className="flex items-center gap-6">
                                      <UserAvatar user={u} className="w-16 h-16 md:w-20 md:h-20" onClick={(e) => { e.stopPropagation(); onShowProfile?.(u.id, u.username); }} />
                                      <div className="text-left">
                                          <div className="flex items-center gap-2">
                                              <p className="text-xl md:text-2xl font-black text-white uppercase tracking-tight">{u.name}</p>
                                              {getIdentity(u.username)}
                                          </div>
                                          <p className="text-xs md:text-sm text-zinc-500 font-bold uppercase tracking-widest mt-1">@{u.username.toLowerCase()} • {u.role || 'Member'}</p>
                                      </div>
                                  </div>
                                  <ChevronRightIcon className="w-8 h-8 text-zinc-800 group-hover:text-red-600 transition-all" />
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
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[10000000] bg-black/95 backdrop-blur-2xl flex flex-col p-6 md:p-20">
                  <div className="max-w-3xl mx-auto w-full flex flex-col h-full">
                      <div className="flex items-center justify-between mb-12">
                          <div className="flex items-center gap-4">
                              <Bell className="w-8 h-8 text-red-600" />
                              <h2 className="text-3xl md:text-5xl font-black text-white uppercase tracking-tighter">Activity</h2>
                          </div>
                          <button onClick={() => setIsActivityOpen(false)} className="p-3 bg-white/5 rounded-full hover:bg-red-600 transition-all"><CloseIcon className="w-6 h-6 text-white" /></button>
                      </div>
                      <div className="flex-1 overflow-y-auto no-scrollbar space-y-4">
                          {notifications.length === 0 ? (
                              <div className="py-32 text-center opacity-20">
                                  <Bell size={100} className="mx-auto mb-6" />
                                  <p className="text-sm md:text-xl font-black uppercase tracking-[0.5em]">No new alerts</p>
                              </div>
                          ) : (
                              notifications.map((n) => (
                                  <div key={n.id} className="p-6 bg-white/[0.03] border border-white/5 rounded-[2rem] flex items-center gap-6 group hover:bg-white/10 transition-all cursor-pointer">
                                      <img src={n.fromAvatar} className="w-14 h-14 rounded-2xl object-cover" onClick={(e) => { e.stopPropagation(); onShowProfile?.(n.fromId); }} />
                                      <div className="flex-1" onClick={() => onShowProfile?.(n.fromId)}>
                                          <p className="text-sm md:text-lg text-gray-200">
                                              <span className="font-black text-white">@{ (n.fromName || '').toLowerCase() }</span> {n.text || 'sent you a signal.'}
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
                        <h2 className="text-sm font-black text-white uppercase tracking-widest">Report Member</h2>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="p-6 border-b border-white/5 flex items-center justify-between bg-black/40 backdrop-blur-xl">
                        <button onClick={() => setIsChatInfoOpen(false)} className="p-2 -ml-2 rounded-full hover:bg-white/5 text-white"><ChevronLeftIcon className="w-6 h-6" /></button>
                        <h2 className="text-sm font-black text-white uppercase tracking-widest">Details</h2>
                        <div className="w-10"></div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 space-y-10 custom-scrollbar no-scrollbar">
                        {isGlobal ? (
                            <div className="flex flex-col items-center text-center">
                                <div className="w-24 h-24 rounded-full bg-red-600/10 flex items-center justify-center border border-red-600/20 mb-6">
                                    <GlobeAltIcon className="w-12 h-12 text-red-600" />
                                </div>
                                <h3 className="text-xl font-black text-white uppercase tracking-tight">Global Stream</h3>
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
                                    <h4 className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.3em] px-1 mb-4">Chat Settings</h4>
                                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10">
                                        <div className="flex items-center gap-3">{lockedChats[selectedUser.id] ? <Lock className="text-red-500" size={20} /> : <Unlock className="text-zinc-400" size={20} />}<span className="text-sm font-bold text-white">Lock Chat</span></div>
                                        <button onClick={handleToggleLock} className={`w-12 h-6 rounded-full transition-all relative ${lockedChats[selectedUser.id] ? 'bg-red-600' : 'bg-zinc-800'}`}><motion.div animate={{ x: lockedChats[selectedUser.id] ? 26 : 2 }} className="absolute top-1 left-0 w-4 h-4 bg-white rounded-full" /></button>
                                    </div>
                                    <button onClick={() => setPasscodeMode('change')} className="w-full flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10 transition-all hover:bg-white/10"><div className="flex items-center gap-3 text-zinc-400"><KeyRound size={20} /><span className="text-sm font-bold">Change Passcode</span></div><ChevronRightIcon className="w-4 h-4 text-zinc-700" /></button>
                                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10">
                                        <div className="flex items-center gap-3">{mutedUsers[selectedUser.id] ? <VolumeX className="text-red-500" size={20} /> : <Volume2 className="text-zinc-400" size={20} />}<span className="text-sm font-bold text-white">Mute Notifications</span></div>
                                        <button onClick={handleToggleMute} className={`w-12 h-6 rounded-full transition-all relative ${mutedUsers[selectedUser.id] ? 'bg-red-600' : 'bg-zinc-800'}`}><motion.div animate={{ x: mutedUsers[selectedUser.id] ? 26 : 2 }} className="absolute top-1 left-0 w-4 h-4 bg-white rounded-full" /></button>
                                    </div>
                                </div>

                                <div className="space-y-4 pt-4 border-t border-white/5">
                                    <h4 className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.3em] px-1">Privacy & Safety</h4>
                                    <button onClick={handleBlockUser} className="w-full flex items-center justify-between p-4 bg-red-600/10 hover:bg-red-600/20 rounded-2xl border border-red-600/20 transition-all"><div className="flex items-center gap-3 text-red-500"><UserMinus size={20} /><span className="text-sm font-black uppercase">Block Member</span></div><ShieldAlert size={16} className="text-red-600 opacity-50" /></button>
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

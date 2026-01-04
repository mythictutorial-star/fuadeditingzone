
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUser } from '@clerk/clerk-react';
import { ref, push, onValue, set, update, get, query, limitToLast, remove } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';
import { db } from '../firebase'; 
import { GlobeAltIcon, SearchIcon, ChevronLeftIcon, CloseIcon, HomeIcon, MarketIcon, ChevronRightIcon } from './Icons';
import { SidebarSubNav } from './Sidebar';
import { ArrowLeft, Edit, MessageSquare, Bell, Check, Trash2, Info, Volume2, VolumeX, ShieldAlert, UserMinus, KeyRound, Fingerprint, Lock, Unlock, AlertTriangle, X, PlusSquare, Settings, User, Shield, UserX, BellRing, Reply, Paperclip, Image as ImageIcon, Film } from 'lucide-react';
import { siteConfig } from '../config';
import { CreatePostModal } from './CreatePostModal';

const OWNER_HANDLE = 'fuadeditingzone';
const ADMIN_HANDLE = 'studiomuzammil';
const RESTRICTED_HANDLE = 'jiya';
const R2_WORKER_URL = 'https://quiet-haze-1898.fuadeditingzone.workers.dev';

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
  mediaUrl?: string;
  mediaType?: 'image' | 'video';
}

const getIdentity = (username: string) => {
    if (!username) return null;
    const low = username.toLowerCase();
    const delay = (username.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % 60);
    
    return (
        <>
            {(low === OWNER_HANDLE || low === RESTRICTED_HANDLE) && <i style={{ animationDelay: `-${delay}s` }} className="fa-solid fa-circle-check text-red-600 ml-1 text-[10px] md:text-sm fez-verified-badge"></i>}
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
  onOpenChatWithUser?: (userId: string | null) => void; 
}> = ({ onShowProfile, initialTargetUserId, onBack, onNavigateMarket, forceSearchTab, onSearchTabConsumed, onThreadStateChange, onOpenChatWithUser }) => {
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

  // Media states
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isOwner = clerkUser?.username?.toLowerCase() === OWNER_HANDLE;

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
    if (initialTargetUserId && users.length > 0 && clerkUser) {
        const userToSelect = users.find(u => u.id === initialTargetUserId);
        if (userToSelect) {
            if (lockedChats[userToSelect.id] && userPasscode === null) {
                setPasscodeMode('set');
                setSelectedUser(userToSelect); 
                setIsMobileChatOpen(true);
            } else if (lockedChats[userToSelect.id] && verifiedTarget !== userToSelect.id) {
                setPasscodeMode('enter');
                setSelectedUser(userToSelect);
                setIsMobileChatOpen(true);
            } else {
                openChat(userToSelect);
            }
        }
    }
  }, [initialTargetUserId, users, clerkUser, lockedChats, userPasscode, verifiedTarget]);

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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 50 * 1024 * 1024) { // 50MB limit
        alert("File too large. Max 50MB allowed.");
        return;
      }
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const text = inputValue.trim();
    if (!isSignedIn || !chatPath || !clerkUser || (!text && !selectedFile)) return;
    
    setIsUploadingMedia(true);

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

        if (selectedFile) {
            const formData = new FormData();
            formData.append('file', selectedFile);
            formData.append('folder', 'Messages');
            const res = await fetch(R2_WORKER_URL, { method: 'POST', body: formData });
            const result = await res.json();
            if (result.url) {
                newMessage.mediaUrl = result.url;
                newMessage.mediaType = selectedFile.type.startsWith('video') ? 'video' : 'image';
            }
        }

        if (replyingTo) {
          newMessage.replyTo = {
            id: replyingTo.id!,
            text: replyingTo.text,
            senderName: replyingTo.senderName
          };
          setReplyingTo(null);
        }

        setInputValue('');
        setSelectedFile(null);
        setPreviewUrl(null);
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
                text: newMessage.mediaUrl ? (text || `[Shared ${newMessage.mediaType}]`) : text,
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
    finally { setIsUploadingMedia(false); }
  };

  const openChat = (user: ChatUser | null) => {
      if (user === null) { setIsGlobal(true); setSelectedUser(null); setIsMobileChatOpen(true); }
      else {
          setIsGlobal(false); setSelectedUser(user);
          if (lockedChats[user.id] && verifiedTarget !== user.id) setPasscodeMode('enter');
          else setIsMobileChatOpen(true);
      }
      window.history.pushState(null, '', '/community');
  };

  const filteredUsers = useMemo(() => {
    const talkIds = Object.keys(conversations);
    return users
      .filter(u => {
          if (clerkUser?.id === u.id) return false;
          if (blockedByMe[u.id]) return false;
          // STRICT PRIVACY: Only @fuadeditingzone can see @jiya
          if (u.username?.toLowerCase() === RESTRICTED_HANDLE && !isOwner) return false;
          return talkIds.includes(u.id) || u.username === OWNER_HANDLE;
      })
      .sort((a, b) => {
          const timeA = typeof conversations[a.id] === 'number' ? (conversations[a.id] as number) : 0;
          const timeB = typeof conversations[b.id] === 'number' ? (conversations[b.id] as number) : 0;
          return timeB - timeA;
      });
  }, [users, clerkUser, conversations, blockedByMe, isOwner]);

  const searchResults = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return users.filter(u => {
        if (clerkUser?.id === u.id) return false;
        // STRICT PRIVACY
        if (u.username?.toLowerCase() === RESTRICTED_HANDLE && !isOwner) return false;
        if (!q) return true;
        return (u.name?.toLowerCase().includes(q) || u.username?.toLowerCase().includes(q));
    });
  }, [users, searchQuery, clerkUser, isOwner]);

  const handlePasscodeSuccess = (passcode?: string) => {
      if (passcodeMode === 'set' && passcode && clerkUser) {
          update(ref(db, `users/${clerkUser.id}`), { chat_passcode: passcode });
          setUserPasscode(passcode);
      }
      if (selectedUser) setVerifiedTarget(selectedUser.id);
      setPasscodeMode(null);
  };

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

  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-black font-sans px-4 md:px-0">
      {passcodeMode && selectedUser && (
        <PasscodeOverlay 
          mode={passcodeMode} 
          onSuccess={handlePasscodeSuccess} 
          onCancel={() => { setPasscodeMode(null); setSelectedUser(null); setIsMobileChatOpen(false); }}
          storedPasscode={userPasscode || undefined}
          targetName={selectedUser.username}
        />
      )}
      <div className="flex-1 flex flex-row min-h-0 h-full w-full">
        
        <nav className="hidden lg:flex flex-col items-center py-10 gap-10 w-20 flex-shrink-0 border-r border-white/10 bg-black z-[100] fixed left-0 top-0 bottom-0">
            <button onClick={onBack} className="text-white hover:scale-110 mb-4 transition-transform"><img src={siteConfig.branding.logoUrl} className="w-9 h-9" /></button>
            <div className="flex flex-col gap-6">
                <button onClick={() => openOverlay('inbox')} className={`p-3.5 rounded-2xl transition-all ${!selectedUser && !isGlobal && !isSettingsOpen && !isSearchOverlayOpen && !isActivityOpen ? 'bg-white text-black' : 'text-zinc-500 hover:text-white'}`}><MessageSquare className="w-6 h-6" /></button>
                <button onClick={() => openOverlay('search')} className={`p-3.5 rounded-2xl transition-all ${isSearchOverlayOpen ? 'bg-white text-black' : 'text-zinc-500 hover:text-white'}`}><SearchIcon className="w-6 h-6" /></button>
                <button onClick={() => openOverlay('activity')} className={`p-3.5 rounded-2xl transition-all ${isActivityOpen ? 'bg-white text-black' : 'text-zinc-500 hover:text-white'}`}><Bell className="w-6 h-6" /></button>
                <button onClick={() => setIsCreatePostOpen(true)} className="p-3.5 rounded-2xl text-zinc-500 hover:text-white transition-all"><PlusSquare className="w-6 h-6" /></button>
                <button onClick={() => openOverlay('settings')} className={`p-3.5 rounded-2xl transition-all ${isSettingsOpen ? 'bg-white text-black' : 'text-zinc-500 hover:text-white'}`}><Settings className="w-6 h-6" /></button>
            </div>
        </nav>

        <div className="flex-1 flex flex-col lg:ml-20 overflow-hidden w-full relative">
            <div className="w-full flex-1 flex flex-row overflow-hidden relative">
                
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

                            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-6 space-y-8 flex flex-col pb-8 md:pb-32 no-scrollbar">
                                {messages.map((msg, i) => {
                                    const isMe = msg.senderId === clerkUser?.id;
                                    const prevMsg = i > 0 ? messages[i - 1] : null;
                                    const showTimeHeader = !prevMsg || (msg.timestamp - prevMsg.timestamp > 3600000); 

                                    return (
                                        <div key={msg.id || i} className="flex flex-col gap-2 w-full min-w-0">
                                            {showTimeHeader && (
                                                <div className="text-center py-6">
                                                    <span className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em]">{formatChatTime(msg.timestamp)}</span>
                                                </div>
                                            )}
                                            <div className={`flex gap-2 md:gap-3 ${isMe ? 'flex-row-reverse' : 'flex-row'} items-start group w-full min-w-0`}>
                                                <UserAvatar user={{ id: msg.senderId, username: msg.senderUsername, avatar: msg.senderAvatar }} className="w-7 h-7 md:w-8 h-8 mt-6 flex-shrink-0" onClick={() => onShowProfile?.(msg.senderId, msg.senderUsername)} />
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
                                                      
                                                      {msg.mediaUrl && (
                                                        <div className={`my-2 overflow-hidden rounded-xl bg-black/40 border border-white/10 group shadow-2xl ${isMe ? 'self-end' : 'self-start'}`}>
                                                          {msg.mediaType === 'image' ? (
                                                            <img src={msg.mediaUrl} className="max-w-[260px] md:max-w-[320px] h-auto object-cover hover:scale-[1.02] transition-transform duration-500 cursor-zoom-in" alt="Media" />
                                                          ) : (
                                                            <video src={msg.mediaUrl} controls className="max-w-[260px] md:max-w-[320px] h-auto" />
                                                          )}
                                                        </div>
                                                      )}

                                                      {msg.text && (
                                                        <div className={`px-3.5 py-2.5 md:px-4 md:py-2.5 rounded-xl md:rounded-2xl text-[11px] md:text-sm leading-relaxed break-words whitespace-pre-wrap overflow-hidden ${isMe ? 'bg-red-600 text-white rounded-tr-none self-end text-right' : 'bg-zinc-800 text-zinc-200 rounded-tl-none border border-white/5 self-start text-left'}`}>
                                                          {msg.text}
                                                        </div>
                                                      )}
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
                                  {(replyingTo || previewUrl) && (
                                    <motion.div 
                                      initial={{ y: 20, opacity: 0 }}
                                      animate={{ y: 0, opacity: 1 }}
                                      exit={{ y: 20, opacity: 0 }}
                                      className="max-w-4xl mx-auto mb-2 p-3 bg-[#111] border border-white/5 rounded-xl flex items-center justify-between group"
                                    >
                                      {replyingTo && (
                                        <div className="flex items-center gap-3 overflow-hidden">
                                          <div className="w-1 h-8 bg-red-600 rounded-full flex-shrink-0"></div>
                                          <div className="min-w-0">
                                            <p className="text-[9px] font-black text-red-600 uppercase tracking-widest">Replying to {replyingTo.senderName}</p>
                                            <p className="text-[11px] text-zinc-500 truncate">{replyingTo.text}</p>
                                          </div>
                                        </div>
                                      )}
                                      {previewUrl && (
                                        <div className="flex items-center gap-3 overflow-hidden">
                                          <div className="w-10 h-10 rounded-lg overflow-hidden bg-black border border-white/10 flex-shrink-0">
                                            {selectedFile?.type.startsWith('video') ? (
                                                <div className="w-full h-full flex items-center justify-center bg-red-600/10"><Film className="text-red-600 w-5 h-5"/></div>
                                            ) : (
                                                <img src={previewUrl} className="w-full h-full object-cover" alt="Preview" />
                                            )}
                                          </div>
                                          <div className="min-w-0">
                                            <p className="text-[9px] font-black text-red-600 uppercase tracking-widest">Attachment</p>
                                            <p className="text-[11px] text-zinc-500 truncate">{selectedFile?.name}</p>
                                          </div>
                                        </div>
                                      )}
                                      <button onClick={() => { setReplyingTo(null); setSelectedFile(null); setPreviewUrl(null); }} className="p-2 text-zinc-600 hover:text-white transition-colors">
                                        <X size={16} />
                                      </button>
                                    </motion.div>
                                  )}
                                </AnimatePresence>

                                <form onSubmit={handleSendMessage} className="w-full max-w-4xl mx-auto flex items-end gap-2 p-1 bg-[#0a0a0a] border border-white/10 rounded-2xl min-h-[46px] md:min-h-[50px] focus-within:border-red-600/40 transition-all overflow-hidden">
                                    <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="image/png,image/jpeg,video/mp4" hidden />
                                    <button 
                                        type="button" 
                                        onClick={() => fileInputRef.current?.click()}
                                        className="p-2.5 md:p-3 text-zinc-500 hover:text-red-600 transition-colors"
                                        title="Attach File (.jpg, .png, .mp4)"
                                    >
                                        <Paperclip className="w-5 h-5" />
                                    </button>
                                    <textarea ref={textareaRef} value={inputValue} onChange={e => setInputValue(e.target.value)} onKeyDown={e => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); }}} placeholder="Type message..." rows={1} className="flex-1 bg-transparent px-2 py-2.5 text-[13px] md:text-sm text-white outline-none resize-none placeholder-zinc-700 max-h-32 min-w-0" />
                                    <button type="submit" disabled={isUploadingMedia || (!inputValue.trim() && !selectedFile)} className="px-4 md:px-5 py-2 md:py-2.5 text-red-600 font-black uppercase text-[9px] md:text-[10px] tracking-widest disabled:opacity-20 transition-all flex-shrink-0 flex items-center gap-2">
                                        {isUploadingMedia ? (
                                            <div className="w-4 h-4 border-2 border-red-600/30 border-t-red-600 rounded-full animate-spin"></div>
                                        ) : 'Send'}
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

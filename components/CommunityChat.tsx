import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUser } from '@clerk/clerk-react';
import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getDatabase, ref, push, onValue, set, update, get, query, limitToLast, remove } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';
import { GlobeAltIcon, SearchIcon, SendIcon, ChevronLeftIcon, ChevronRightIcon, CloseIcon, HomeIcon, MarketIcon, LockIcon, ChatBubbleIcon } from './Icons';
import { Info, Image as ImageIcon, Lock, Bell, User, ShieldCheck, Check, MoreHorizontal, Slash, ShieldAlert, KeyRound, Eye, EyeOff, Fingerprint, LockKeyhole } from 'lucide-react';
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

const UserAvatar: React.FC<{ user: Partial<ChatUser>; className?: string; onClick?: (e: React.MouseEvent) => void }> = ({ user, className = "w-10 h-10", onClick }) => {
    const username = user.username || 'guest';
    const firstLetter = username.charAt(0).toUpperCase();
    return (
        <div onClick={onClick} className={`${className} rounded-full border border-white/5 flex-shrink-0 overflow-hidden relative group cursor-pointer bg-zinc-800 flex items-center justify-center transition-transform active:scale-90`}>
            {user.avatar ? <img src={user.avatar} className="w-full h-full object-cover" alt="" /> : <span className="text-white font-black text-lg">{firstLetter}</span>}
        </div>
    );
};

const VerificationBadge: React.FC<{ username?: string; custom_badge?: any; viewer?: string }> = ({ username, custom_badge, viewer }) => {
    if (!username) return null;
    const low = username.toLowerCase();
    const vLow = viewer?.toLowerCase();
    
    if (vLow === RESTRICTED_HANDLE && low === OWNER_HANDLE) {
        return <span className="ml-1 px-1.5 py-0.5 bg-red-600/20 text-red-500 rounded text-[7px] font-black uppercase tracking-widest border border-red-600/30">Husband</span>;
    }
    if (vLow === OWNER_HANDLE && low === RESTRICTED_HANDLE) {
        return <span className="ml-1 px-1.5 py-0.5 bg-red-600/20 text-red-500 rounded text-[7px] font-black uppercase tracking-widest border border-red-600/30">Wife</span>;
    }

    if (low === OWNER_HANDLE) return <i className="fa-solid fa-circle-check text-red-600 text-[10px] ml-1 fez-verified-badge"></i>;
    if (low === ADMIN_HANDLE) return <i className="fa-solid fa-circle-check text-blue-500 text-[10px] ml-1 fez-verified-badge"></i>;
    
    if (low === RESTRICTED_HANDLE && (vLow === OWNER_HANDLE || vLow === RESTRICTED_HANDLE)) {
        return (
            <span className="relative inline-flex items-center ml-1 fez-verified-badge">
                <i className="fa-solid fa-circle-check text-red-600 text-[10px]"></i>
                <i className="fa-solid fa-circle-check text-blue-500 text-[5px] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"></i>
            </span>
        );
    }
    if (custom_badge?.active && custom_badge?.color) {
        return <i className="fa-solid fa-circle-check text-[10px] ml-1 fez-verified-badge" style={{ color: custom_badge.color }}></i>;
    }
    return null;
};

// Added helper function to resolve "Cannot find name 'getTimeAgo'" error
const getTimeAgo = (timestamp?: number) => {
    if (!timestamp) return 'a while ago';
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(timestamp).toLocaleDateString();
};

interface ChatUser { id: string; name: string; username: string; avatar?: string; role?: string; online?: boolean; lastActive?: number; custom_badge?: any; }
interface Message { id?: string; senderId: string; senderName: string; senderUsername?: string; senderAvatar?: string; text?: string; timestamp: number; }

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

  // Security and Vault States
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const [passcodeVerified, setPasscodeVerified] = useState(false);
  const [passcodeErrorCount, setPasscodeErrorCount] = useState(0);
  const [showResetFlow, setShowResetFlow] = useState(false);
  const [localSettings, setLocalSettings] = useState<any>({ locked: false, muted: false, blocked: false });
  const [allChatSettings, setAllChatSettings] = useState<Record<string, any>>({});
  const [passcodeInput, setPasscodeInput] = useState('');
  
  // WhatsApp Style Vault Pull
  const [isVaultUnlocked, setIsVaultUnlocked] = useState(false);
  const [vaultPasscodeModalOpen, setVaultPasscodeModalOpen] = useState(false);
  const [pullProgress, setPullProgress] = useState(0);
  const [isPulling, setIsPulling] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const hiddenInputRef = useRef<HTMLInputElement>(null);
  const vaultHiddenInputRef = useRef<HTMLInputElement>(null);
  const lastSentTimeRef = useRef<number>(0);
  const typingTimeoutRef = useRef<any>(null);

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

  const chatPath = useMemo(() => {
    if (isGlobal) return 'community/global';
    if (!clerkUser?.id || !selectedUser?.id) return null;
    return `messages/${[clerkUser.id, selectedUser.id].sort().join('_')}`;
  }, [isGlobal, clerkUser?.id, selectedUser?.id]);

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
        
        onValue(ref(db, `users/${clerkUser.id}/chat_settings`), (snap) => {
            const settings = snap.val() || {};
            setAllChatSettings(settings);
            if (selectedUser) {
                setLocalSettings(settings[selectedUser.id] || { locked: false, muted: false, blocked: false });
            }
        });
    }
    return () => unsubUsers();
  }, [clerkUser, initialTargetUserId, selectedUser?.id]);

  useEffect(() => {
    if (!chatPath || !clerkUser || !selectedUser) return;
    const typingRef = ref(db, `typing/${chatPath}/${selectedUser.id}`);
    const unsub = onValue(typingRef, (snap) => {
        setOtherUserTyping(snap.val() === true);
    });
    return () => unsub();
  }, [chatPath, selectedUser?.id]);

  const handleTyping = (text: string) => {
      setInputValue(text);
      if (!chatPath || !clerkUser) return;
      const myTypingRef = ref(db, `typing/${chatPath}/${clerkUser.id}`);
      set(myTypingRef, true);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
          set(myTypingRef, false);
      }, 3000);
  };

  useEffect(() => {
    if (!chatPath) return;
    const unsub = onValue(query(ref(db, chatPath), limitToLast(100)), (snap) => {
        const data = snap.val();
        setMessages(data ? Object.entries(data).map(([id, val]: [string, any]) => ({ id, ...val })).sort((a, b) => a.timestamp - b.timestamp) : []);
    });
    if (!isGlobal && selectedUser && clerkUser) update(ref(db, `users/${clerkUser.id}/unread`), { [selectedUser.id]: 0 });
    return () => unsub();
  }, [chatPath, isGlobal, selectedUser?.id, clerkUser?.id]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, isMobileChatOpen, otherUserTyping]);

  useEffect(() => {
      if (passcodeInput.length === 4) {
          if (vaultPasscodeModalOpen) verifyVaultPasscode();
          else verifyPasscode();
      }
  }, [passcodeInput]);

  // Aggressive focus helpers
  useEffect(() => {
    if ((localSettings.locked && !passcodeVerified && !isGlobal && selectedUser) || vaultPasscodeModalOpen) {
        const timer = setTimeout(() => {
            hiddenInputRef.current?.focus();
            vaultHiddenInputRef.current?.focus();
        }, 300);
        return () => clearTimeout(timer);
    }
  }, [localSettings.locked, passcodeVerified, isGlobal, selectedUser, vaultPasscodeModalOpen]);

  const isSelectedFriend = useMemo(() => {
    if (!selectedUser) return false;
    return friendsList.includes(selectedUser.id) || selectedUser.username === OWNER_HANDLE;
  }, [selectedUser, friendsList]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!isSignedIn || !chatPath || !clerkUser || !inputValue.trim() || localSettings.blocked) return;
    const now = Date.now();
    if (now - lastSentTimeRef.current < 1000) return;
    lastSentTimeRef.current = now;
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    set(ref(db, `typing/${chatPath}/${clerkUser.id}`), false);
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
        await push(ref(db, chatPath), newMessage);
        setInputValue('');
        if (!isGlobal && selectedUser) {
            await set(ref(db, `users/${clerkUser.id}/conversations/${selectedUser.id}`), true);
            await set(ref(db, `users/${selectedUser.id}/conversations/${clerkUser.id}`), true);
            const unreadRef = ref(db, `users/${selectedUser.id}/unread/${clerkUser.id}`);
            const snap = await get(unreadRef);
            await set(unreadRef, (snap.val() || 0) + 1);
        }
    } catch (fbErr) { console.error(fbErr); }
    finally { setIsMediaUploading(false); }
  };

  const toggleSetting = async (key: string) => {
      if (!clerkUser || !selectedUser) return;
      if (key === 'blocked' && (selectedUser.username === OWNER_HANDLE || selectedUser.username === ADMIN_HANDLE)) {
          alert("Authority Immunity: This member cannot be blocked.");
          return;
      }
      const val = !localSettings[key];
      await update(ref(db, `users/${clerkUser.id}/chat_settings/${selectedUser.id}`), { [key]: val });
      setLocalSettings({ ...localSettings, [key]: val });
  };

  const verifyPasscode = async () => {
      const snap = await get(ref(db, `users/${clerkUser?.id}/chat_passcode`));
      const code = snap.val() || '0000';
      if (passcodeInput === code) { setPasscodeVerified(true); setPasscodeErrorCount(0); setPasscodeInput(''); }
      else {
          const errors = passcodeErrorCount + 1; setPasscodeErrorCount(errors); setPasscodeInput('');
          if (errors >= 5) setShowResetFlow(true);
          else alert(`Incorrect code. Attempt ${errors}/5`);
      }
  };

  const verifyVaultPasscode = async () => {
      const snap = await get(ref(db, `users/${clerkUser?.id}/chat_passcode`));
      const code = snap.val() || '0000';
      if (passcodeInput === code) { setIsVaultUnlocked(true); setVaultPasscodeModalOpen(false); setPasscodeErrorCount(0); setPasscodeInput(''); }
      else {
          const errors = passcodeErrorCount + 1; setPasscodeErrorCount(errors); setPasscodeInput('');
          if (errors >= 5) setShowResetFlow(true);
          else alert(`Incorrect code. Attempt ${errors}/5`);
      }
  };

  const handlePasscodeReset = async () => {
      const confirmed = window.confirm("Security Protocol: Verification required to reset vault. Continue?");
      if (confirmed) {
          const newCode = prompt("IDENTITY VALIDATED. Enter a new 4-digit passcode:");
          if (newCode && /^\d{4}$/.test(newCode)) {
              await set(ref(db, `users/${clerkUser?.id}/chat_passcode`), newCode);
              if (vaultPasscodeModalOpen) setIsVaultUnlocked(true);
              else setPasscodeVerified(true);
              setPasscodeErrorCount(0); setShowResetFlow(false); setVaultPasscodeModalOpen(false); setPasscodeInput('');
          }
      }
  };

  const openChat = (user: ChatUser | null) => {
      setIsDetailsOpen(false); setPasscodeVerified(false); setPasscodeInput(''); setPasscodeErrorCount(0); setShowResetFlow(false);
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

  const filteredUsers = useMemo(() => {
      if (sidebarTab === 'search') {
          if (!sidebarSearchQuery.trim()) return [];
          return users.filter(u => u.username?.toLowerCase().includes(sidebarSearchQuery.toLowerCase())).map(maskUser);
      }
      const pool = inboxView === 'primary' 
        ? users.filter(u => friendsList.includes(u.id) || u.username === OWNER_HANDLE || u.id === clerkUser?.id)
        : users.filter(u => unreadCounts[u.id] > 0 && !friendsList.includes(u.id));
      
      return pool.map(maskUser).filter(u => {
          const isLocked = allChatSettings[u.id]?.locked;
          if (isLocked) return isVaultUnlocked;
          return true;
      });
  }, [users, sidebarTab, inboxView, sidebarSearchQuery, friendsList, clerkUser?.id, isOwner, unreadCounts, allChatSettings, isVaultUnlocked]);

  const targetRealUser = useMemo(() => {
      if (!selectedUser) return null;
      return users.find(u => u.id === selectedUser.id) || selectedUser;
  }, [users, selectedUser]);

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
                <div className="p-6 space-y-6 flex-shrink-0">
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

                <div className="flex-1 relative flex flex-col min-h-0">
                    <motion.div 
                        drag="y"
                        dragConstraints={{ top: 0, bottom: 100 }}
                        onDrag={(e, info) => {
                           if (inboxView === 'primary' && sidebarTab === 'messages' && !isVaultUnlocked) {
                               setPullProgress(info.offset.y);
                               setIsPulling(true);
                           }
                        }}
                        onDragEnd={(e, info) => {
                           if (info.offset.y > 70) {
                               setVaultPasscodeModalOpen(true);
                           }
                           setPullProgress(0);
                           setIsPulling(false);
                        }}
                        className="flex-1 flex flex-col min-h-0"
                    >
                        {/* Pull-to-reveal area */}
                        <motion.div 
                           style={{ height: pullProgress, opacity: pullProgress / 80 }}
                           className="flex items-center justify-center overflow-hidden bg-white/[0.02]"
                        >
                           <div className={`transition-all duration-300 ${pullProgress > 60 ? 'scale-110 text-red-600 drop-shadow-[0_0_8px_red]' : 'scale-90 text-zinc-700'}`}>
                              <LockKeyhole size={28} />
                           </div>
                        </motion.div>

                        <div className="flex-1 overflow-y-auto no-scrollbar space-y-1 overscroll-contain">
                            {isVaultUnlocked && (
                                <div className="bg-red-600/5 border-y border-white/5 p-4 flex items-center justify-between animate-fade-in">
                                    <div className="flex items-center gap-2">
                                        <LockKeyhole size={14} className="text-red-600" />
                                        <span className="text-[10px] font-black text-white uppercase tracking-widest">Archive Unlocked</span>
                                    </div>
                                    <button onClick={() => setIsVaultUnlocked(false)} className="text-[8px] font-black text-zinc-500 uppercase tracking-widest hover:text-white border border-white/10 px-2 py-1 rounded">Lock Hub</button>
                                </div>
                            )}

                            {!sidebarSearchQuery && (
                                <button onClick={() => openChat(null)} className={`w-full flex items-center gap-4 px-6 py-4 transition-all ${isGlobal ? 'bg-white/5' : 'hover:bg-zinc-900'}`}>
                                    <div className="w-12 h-12 rounded-full bg-red-600/10 flex items-center justify-center border border-red-600/20 text-red-500"><GlobeAltIcon className="w-6 h-6" /></div>
                                    <div className="text-left"><p className="text-sm font-bold text-white">Global Feed</p><p className="text-[10px] text-zinc-500 uppercase tracking-widest font-black">Open Network</p></div>
                                </button>
                            )}
                            
                            {filteredUsers.map(u => {
                                const isBlocked = localSettings.blocked && selectedUser?.id === u.id;
                                if (isBlocked) return null;
                                const isItemLocked = allChatSettings[u.id]?.locked;
                                
                                return (
                                    <button 
                                        key={u.id} 
                                        onClick={() => sidebarTab === 'search' ? navigateToProfile(u.id, u.username) : openChat(u)} 
                                        className={`w-full flex items-center gap-4 px-6 py-4 transition-all ${selectedUser?.id === u.id && !isGlobal ? 'bg-white/5' : 'hover:bg-zinc-900'} ${isItemLocked ? 'bg-red-600/[0.03]' : ''}`}
                                    >
                                        <UserAvatar user={u} className="w-12 h-12" />
                                        <div className="text-left flex-1 min-w-0">
                                            <div className="flex items-center gap-1">
                                                <p className="text-sm font-bold text-white truncate">{u.name}</p>
                                                <VerificationBadge username={u.username} custom_badge={u.custom_badge} viewer={clerkUser?.username} />
                                                {isItemLocked && (
                                                   <span className="ml-auto flex items-center justify-center w-5 h-5 bg-red-600/10 rounded-lg border border-red-600/20">
                                                      <LockKeyhole size={10} className="text-red-600" />
                                                   </span>
                                                )}
                                            </div>
                                            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest leading-none">@{u.username?.toLowerCase()}</p>
                                        </div>
                                        {unreadCounts[u.id] > 0 && <div className="w-2.5 h-2.5 bg-red-600 rounded-full animate-pulse shadow-[0_0_8px_red]"></div>}
                                    </button>
                                );
                            })}
                        </div>
                    </motion.div>
                </div>
            </aside>

            <main className={`${isMobileChatOpen || isActivityOpen ? 'flex' : 'hidden'} md:flex flex-1 flex-row min-h-0 bg-black relative`}>
                <div className="flex-1 flex flex-col min-h-0 relative">
                    {localSettings.locked && !passcodeVerified && !isGlobal && selectedUser ? (
                        <div 
                          className="flex-1 flex flex-col items-center justify-center p-10 text-center space-y-12 bg-black/60 backdrop-blur-3xl cursor-pointer"
                          onClick={() => hiddenInputRef.current?.focus()}
                        >
                            <div className="w-24 h-24 rounded-full bg-red-600/10 flex items-center justify-center border border-red-600/20 text-red-500 mb-2">
                                <Lock size={40} />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-white uppercase tracking-[0.2em] mb-3">Thread Encryption</h3>
                                <p className="text-zinc-500 text-[9px] font-bold uppercase tracking-widest leading-relaxed opacity-60 max-w-xs mx-auto">Security clearance required for this conversation.</p>
                            </div>
                            
                            <div className="relative">
                                <div className="flex gap-6 items-center">
                                    {[...Array(4)].map((_, i) => (
                                        <div key={i} className={`w-4 h-4 rounded-full transition-all duration-300 ${passcodeInput.length > i ? 'bg-red-600 scale-125 shadow-[0_0_12px_red]' : 'bg-zinc-800 border border-white/10'}`}></div>
                                    ))}
                                </div>
                                <input 
                                    ref={hiddenInputRef}
                                    type="tel"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    maxLength={4}
                                    value={passcodeInput}
                                    onChange={e => setPasscodeInput(e.target.value.replace(/\D/g,''))}
                                    className="absolute inset-0 opacity-0 cursor-default h-full w-full"
                                    autoFocus
                                />
                            </div>

                            {showResetFlow && (
                                <button onClick={(e) => { e.stopPropagation(); handlePasscodeReset(); }} className="px-8 py-3 bg-white/5 border border-white/10 text-white rounded-full font-black uppercase text-[10px] tracking-widest hover:bg-white/10 transition-all flex items-center gap-2">
                                    <KeyRound size={14}/> Recovery Hub
                                </button>
                            )}
                            
                            <button onClick={(e) => { e.stopPropagation(); setIsMobileChatOpen(false); }} className="text-zinc-700 font-black uppercase text-[9px] tracking-[0.3em] hover:text-white transition-colors pt-10">Return to Feed</button>
                        </div>
                    ) : isActivityOpen ? (
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
                            <p className="text-xs uppercase font-black tracking-widest">Open a channel to connect</p>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col min-h-0 h-full">
                            <div className="p-4 md:p-6 flex items-center justify-between border-b border-white/5 bg-black/40 backdrop-blur-xl z-10 px-2.5">
                                <div className="flex items-center gap-4">
                                    <button onClick={() => setIsMobileChatOpen(false)} className="md:hidden p-2 bg-white/5 rounded-lg"><ChevronLeftIcon className="w-5 h-5 text-white" /></button>
                                    <div onClick={() => { if (!isGlobal && selectedUser) navigateToProfile(selectedUser.id, (users.find(u => u.id === selectedUser.id)?.username || selectedUser.username)); }} className="flex items-center gap-3 cursor-pointer group">
                                        {isGlobal ? <div className="w-10 h-10 rounded-full bg-red-600/10 flex items-center justify-center text-red-500 border border-red-600/20"><GlobeAltIcon className="w-5 h-5" /></div> : <UserAvatar user={targetRealUser!} className="w-10 h-10" />}
                                        <div className="min-w-0">
                                            <div className="flex items-center">
                                                <h3 className="text-sm font-black text-white uppercase truncate leading-none mb-1 group-hover:text-red-500 transition-colors">{isGlobal ? 'Global Feed' : (targetRealUser?.username || selectedUser?.username)?.toLowerCase()}</h3>
                                                {!isGlobal && <VerificationBadge username={targetRealUser?.username || selectedUser?.username} custom_badge={targetRealUser?.custom_badge} viewer={clerkUser?.username} />}
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <div className={`w-1.5 h-1.5 rounded-full ${isGlobal || (targetRealUser?.online) ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,1)] animate-pulse' : 'bg-zinc-600'}`}></div>
                                                <p className="text-[8px] text-zinc-500 font-bold uppercase tracking-widest leading-none">
                                                  {isGlobal ? 'Open Public Network' : (targetRealUser?.online ? 'Online' : `Online ${getTimeAgo(targetRealUser?.lastActive)}`)}
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
                                            avatar: currentSender?.avatar || m.senderAvatar,
                                            custom_badge: currentSender?.custom_badge
                                          };
                                    
                                    return (
                                        <div key={m.id || i} className={`flex gap-3 ${isMe ? 'flex-row-reverse' : 'flex-row'} items-end group`}>
                                            <UserAvatar user={sender} className="w-8 h-8" onClick={() => { if(!isMsgRestricted && m.senderId) navigateToProfile(m.senderId, sender.username!); }} />
                                            <div className={`max-w-[85%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                                <div className="flex items-center gap-1.5 mb-1.5 px-1 cursor-pointer group/msg" onClick={() => { if(!isMsgRestricted && m.senderId) navigateToProfile(m.senderId, sender.username!); }}>
                                                    <span className="text-[9px] font-black text-zinc-500 uppercase tracking-[0.2em] group-hover/msg:text-white transition-colors">{sender.username?.toLowerCase()}</span>
                                                    <VerificationBadge username={sender.username} custom_badge={sender.custom_badge} viewer={clerkUser?.username} />
                                                </div>
                                                <div className={`px-4 py-3 rounded-2xl text-[13px] md:text-sm font-medium leading-relaxed break-all whitespace-pre-wrap shadow-lg ${isMe ? 'bg-red-600 text-white rounded-br-none' : 'bg-zinc-900 text-zinc-200 rounded-bl-none border border-white/5'}`}>{m.text}</div>
                                                <span className="text-[7px] text-zinc-700 font-black uppercase mt-1.5 tracking-widest">{new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                            </div>
                                        </div>
                                    );
                                })}
                                
                                {otherUserTyping && (
                                    <div className="flex gap-3 items-end animate-fade-in">
                                        <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center overflow-hidden">
                                            <div className="flex gap-1">
                                                <div className="w-1 h-1 bg-zinc-400 rounded-full animate-bounce"></div>
                                                <div className="w-1 h-1 bg-zinc-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                                                <div className="w-1 h-1 bg-zinc-400 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                                            </div>
                                        </div>
                                        <p className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.3em] italic">typing...</p>
                                    </div>
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            <div className={`p-4 md:p-6 border-t border-white/5 bg-black px-2.5 ${isMobileChatOpen && (selectedUser || isGlobal) ? 'pb-6 md:pb-6' : 'pb-24 md:pb-6'}`}>
                                {!isGlobal && !isSelectedFriend ? (
                                    <div className="bg-zinc-900 border border-white/5 p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
                                        <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] text-center md:text-left">Connection Required</p>
                                        <button className="w-full md:w-auto bg-red-600 text-white px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all shadow-lg shadow-red-600/20">Connect</button>
                                    </div>
                                ) : (
                                    <form onSubmit={handleSendMessage} className="flex items-center gap-3 bg-zinc-900 border border-white/10 rounded-2xl p-2.5 focus-within:border-red-600/40 transition-all shadow-2xl max-w-6xl mx-auto w-full">
                                        <textarea 
                                          ref={textareaRef} 
                                          value={inputValue} 
                                          onChange={e => handleTyping(e.target.value)} 
                                          onKeyDown={e => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }} 
                                          placeholder="Type a message..." 
                                          rows={1} 
                                          className="flex-1 bg-transparent border-none text-sm text-white py-2 px-2 outline-none resize-none max-h-32 min-h-[40px]" 
                                        />
                                        <button type="submit" disabled={isMediaUploading || !inputValue.trim() || localSettings.blocked} className="bg-red-600 text-white p-2.5 rounded-xl hover:bg-red-700 active:scale-90 transition-all disabled:opacity-50 shadow-lg shadow-red-600/20 flex-shrink-0"><SendIcon className="w-5 h-5" /></button>
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
                                <img src={targetRealUser?.avatar || selectedUser.avatar || siteConfig.branding.logoUrl} className="w-full h-full object-cover rounded-full" alt="" />
                            </div>
                            <div>
                               <div className="flex items-center justify-center gap-1">
                                  <h3 className="text-lg font-black text-white uppercase tracking-tighter">{targetRealUser?.name || selectedUser.name}</h3>
                                  <VerificationBadge username={targetRealUser?.username || selectedUser.username} custom_badge={targetRealUser?.custom_badge} viewer={clerkUser?.username} />
                               </div>
                               <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-1">@{ (targetRealUser?.username || selectedUser.username)?.toLowerCase() }</p>
                            </div>
                            <div className="mt-2 px-4 py-1.5 bg-white/5 rounded-lg border border-white/10">
                                <p className="text-[8px] font-black text-zinc-500 uppercase tracking-widest mb-0.5">Role</p>
                                <p className="text-[10px] font-black text-red-600 uppercase tracking-widest">
                                  {targetRealUser?.username === OWNER_HANDLE ? 'Selected Legend' : (targetRealUser?.username === ADMIN_HANDLE ? 'VFX Admin' : 'Community Member')}
                                </p>
                            </div>
                            <button onClick={() => navigateToProfile(selectedUser.id, selectedUser.username)} className="bg-white text-black px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all">View Profile</button>
                         </div>

                         <div className="space-y-6 text-left">
                            <div className="space-y-3">
                               <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest ml-1">Privacy Controls</p>
                               <div className="bg-zinc-900/50 rounded-2xl border border-white/5 overflow-hidden">
                                  <button onClick={() => toggleSetting('locked')} className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-all border-b border-white/5">
                                     <div className="flex items-center gap-3 text-zinc-300"><Lock size={16} /><span className="text-[10px] font-bold uppercase">Lock Thread</span></div>
                                     <div className={`w-8 h-4 rounded-full relative transition-colors ${localSettings.locked ? 'bg-red-600' : 'bg-zinc-800'}`}>
                                        <div className={`absolute top-1 w-2 h-2 bg-white rounded-full transition-all ${localSettings.locked ? 'left-5' : 'left-1'}`}></div>
                                     </div>
                                  </button>
                                  <button onClick={() => toggleSetting('muted')} className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-all">
                                     <div className="flex items-center gap-3 text-zinc-300"><Bell size={16} /><span className="text-[10px] font-bold uppercase">Mute Channel</span></div>
                                     <div className={`w-8 h-4 rounded-full relative transition-colors ${localSettings.muted ? 'bg-red-600' : 'bg-zinc-800'}`}>
                                        <div className={`absolute top-1 w-2 h-2 bg-white rounded-full transition-all ${localSettings.muted ? 'left-5' : 'left-1'}`}></div>
                                     </div>
                                  </button>
                               </div>
                            </div>

                            <div className="space-y-3">
                               <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest ml-1">Safety</p>
                               <div className="bg-zinc-900/50 rounded-2xl border border-white/5 overflow-hidden">
                                  <button onClick={() => toggleSetting('blocked')} className="w-full p-4 flex items-center justify-between hover:bg-red-600/10 transition-all text-red-500">
                                     <div className="flex items-center gap-3"><ShieldAlert size={16} /><span className="text-[10px] font-bold uppercase">Block User</span></div>
                                     <Slash size={14} className={`transition-opacity ${localSettings.blocked ? 'opacity-100' : 'opacity-30'}`} />
                                  </button>
                               </div>
                            </div>
                         </div>
                      </div>
                    </motion.aside>
                  )}
                </AnimatePresence>
            </main>
        </div>
      </div>

      {/* Vault Passcode Modal */}
      <AnimatePresence>
        {vaultPasscodeModalOpen && (
          <div className="fixed inset-0 z-[6000000] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setVaultPasscodeModalOpen(false)} className="absolute inset-0 bg-black/95 backdrop-blur-2xl" />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.9, opacity: 0 }} 
              className="relative w-full max-w-sm flex flex-col items-center text-center space-y-12 cursor-pointer"
              onClick={() => vaultHiddenInputRef.current?.focus()}
            >
               <div className="w-20 h-20 rounded-full bg-red-600/10 flex items-center justify-center border border-red-600/20 text-red-500 mb-2">
                   <Lock size={32} />
               </div>
               <div>
                   <h3 className="text-xl font-black text-white uppercase tracking-[0.2em] mb-3">Locked Hub</h3>
                   <p className="text-zinc-500 text-[9px] font-bold uppercase tracking-widest opacity-60">Identity verification required to reveal hidden threads.</p>
               </div>

               <div className="relative">
                    <div className="flex gap-6 items-center">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className={`w-4 h-4 rounded-full transition-all duration-300 ${passcodeInput.length > i ? 'bg-red-600 scale-125 shadow-[0_0_12px_red]' : 'bg-zinc-800 border border-white/10'}`}></div>
                        ))}
                    </div>
                    <input 
                        ref={vaultHiddenInputRef}
                        type="tel"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={4}
                        value={passcodeInput}
                        onChange={e => setPasscodeInput(e.target.value.replace(/\D/g,''))}
                        className="absolute inset-0 opacity-0 cursor-default h-full w-full"
                        autoFocus
                    />
               </div>

               {showResetFlow && (
                   <button onClick={(e) => { e.stopPropagation(); handlePasscodeReset(); }} className="px-8 py-3 bg-white/5 border border-white/10 text-white rounded-full font-black uppercase text-[10px] tracking-widest hover:bg-white/10 transition-all flex items-center gap-2">
                       <KeyRound size={14}/> Recovery Hub
                   </button>
               )}

               <button onClick={(e) => { e.stopPropagation(); setVaultPasscodeModalOpen(false); }} className="text-zinc-700 font-black uppercase text-[9px] tracking-[0.3em] hover:text-white transition-colors pt-10">Dismiss</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
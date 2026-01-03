
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUser, SignInButton, useClerk } from '@clerk/clerk-react';
import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getDatabase, ref, push, onValue, set, update, get, query, limitToLast, remove } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { GlobeAltIcon, UserCircleIcon, SearchIcon, SendIcon, ChevronLeftIcon, UserGroupIcon, CloseIcon, HomeIcon, MarketIcon, ChevronRightIcon, LockIcon, UnlockIcon } from './Icons';
import { SidebarSubNav } from './Sidebar';
import { ArrowLeft, Edit, LayoutDashboard, MessageSquare, Heart, PlusSquare, Compass, Bell, Check, Trash2, Info, Volume2, VolumeX, ShieldAlert, UserMinus, ShieldCheck, KeyRound, Fingerprint, Lock, Unlock, AlertTriangle, ShieldCheck as Shield, Image as ImageIcon, Film, X } from 'lucide-react';
import { siteConfig } from '../config';
import { CreatePostModal } from './CreatePostModal';

// Firebase Priority: Proper initialization check
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

// R2 Credentials & S3 Client Setup
const R2_PUBLIC_DOMAIN = 'https://pub-c35a446ba9db4c89b71a674f0248f02a.r2.dev';
const R2_BUCKET_NAME = 'pub-c35a446ba9db4c89b71a674f0248f02a';

const s3Client = new S3Client({
  region: 'auto',
  endpoint: 'https://af6242186ef611cf46b450432dcda328.r2.cloudflarestorage.com',
  credentials: {
    accessKeyId: '33ee13a93f78b70795d137e80f99f9fa',
    secretAccessKey: 'c7ce8fd8fc45a310184ac3b4fa98646991b8bea2b8798576764553f676d02fe2',
  },
  forcePathStyle: true,
});

/**
 * CLEAN UPLOAD FUNCTION:
 * Converts file to Uint8Array and uses PutObjectCommand with ContentType
 */
const uploadMediaToR2 = async (file: File): Promise<string> => {
    const fileName = `${Date.now()}-${file.name.replace(/[^a-z0-9.]/gi, '_')}`;
    
    try {
        const arrayBuffer = await file.arrayBuffer();
        const body = new Uint8Array(arrayBuffer);

        const command = new PutObjectCommand({
            Bucket: R2_BUCKET_NAME,
            Key: `Messages/${fileName}`,
            Body: body,
            ContentType: file.type,
        });

        await s3Client.send(command);
        return `${R2_PUBLIC_DOMAIN}/Messages/${fileName}`;
    } catch (err: any) {
        // Crucial: console.dir for debugging status codes/details
        console.dir(err);
        throw err;
    }
};

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
  text?: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video';
  timestamp: number;
}

const getIdentity = (username: string) => {
    if (!username) return null;
    const low = username.toLowerCase();
    const delay = (username.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % 60);
    return (
        <>
            {low === OWNER_HANDLE && <i style={{ animationDelay: `-${delay}s` }} className="fa-solid fa-circle-check text-red-600 ml-1.5 text-sm md:text-lg fez-verified-badge"></i>}
            {low === ADMIN_HANDLE && <i style={{ animationDelay: `-${delay}s` }} className="fa-solid fa-circle-check text-blue-500 ml-1.5 text-sm md:text-lg fez-verified-badge"></i>}
        </>
    );
};

const UserAvatar: React.FC<{ user: Partial<ChatUser>; className?: string; onClick?: (e: React.MouseEvent) => void }> = ({ user, className = "w-10 h-10", onClick }) => {
    const username = user.username || 'user';
    const firstLetter = username.charAt(0).toUpperCase();
    const bgColors = ['bg-red-500', 'bg-blue-500', 'bg-purple-500', 'bg-orange-500', 'bg-indigo-500'];
    const bgClass = bgColors[username.length % bgColors.length];

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
  const [conversations, setConversations] = useState<Record<string, boolean>>({});
  const [lockedChats, setLockedChats] = useState<Record<string, boolean>>({});
  const [userPasscode, setUserPasscode] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isActivityOpen, setIsActivityOpen] = useState(false);
  const [isChatInfoOpen, setIsChatInfoOpen] = useState(false);
  const [isMediaUploading, setIsMediaUploading] = useState(false);
  const [pendingMedia, setPendingMedia] = useState<{ file: File; preview: string; type: 'image' | 'video' } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mediaInputRef = useRef<HTMLInputElement>(null);

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
        onValue(ref(db, `users/${clerkUser.id}/locked_chats`), (snap) => setLockedChats(snap.val() || {}));
        onValue(ref(db, `users/${clerkUser.id}/chat_passcode`), (snap) => setUserPasscode(snap.val() || null));
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
    const unsub = onValue(query(ref(db, chatPath), limitToLast(100)), (snap) => {
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

  useEffect(() => {
    if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [inputValue]);

  /**
   * SEPARATE LOGIC HANDLER:
   * Immediate Firebase send for text-only, sequential for media.
   */
  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!isSignedIn || !chatPath || !clerkUser) return;
    if (!inputValue.trim() && !pendingMedia) return;
    
    // Friend restriction logic
    const isFriend = selectedUser ? (friendsList.includes(selectedUser.id) || selectedUser.username?.toLowerCase() === OWNER_HANDLE) : true;
    const mySentMessages = messages.filter(m => m.senderId === clerkUser.id);
    if (!isFriend && mySentMessages.length >= 3) {
      alert("Please wait for response or acceptance.");
      return;
    }

    const currentText = inputValue.trim();
    const currentMedia = pendingMedia;
    
    // Clear inputs immediately for speed
    setInputValue('');
    setPendingMedia(null);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    try {
        const messageBase: Message = { 
          senderId: clerkUser.id, 
          senderName: clerkUser.fullName || clerkUser.username || "User", 
          senderUsername: (clerkUser.username || '').toLowerCase(),
          senderAvatar: clerkUser.imageUrl,
          timestamp: Date.now() 
        };

        if (!currentMedia) {
            // SEPARATE LOGIC: Send text directly to Firebase immediately
            await push(ref(db, chatPath), { ...messageBase, text: currentText });
            await syncConversations();
        } else {
            // SEPARATE LOGIC: Media exists -> R2 first
            setIsMediaUploading(true);
            const mediaUrl = await uploadMediaToR2(currentMedia.file);
            
            // Sync to Firebase only after R2 is 100% successful
            await push(ref(db, chatPath), { 
                ...messageBase, 
                text: currentText || undefined, 
                mediaUrl, 
                mediaType: currentMedia.type 
            });
            await syncConversations();
        }
    } catch (err: any) {
        console.error("FAILED TO SYNC MESSAGE:", err);
        alert("Signal Lost: Check Firebase connection or R2 keys in Inspect Tool.");
    } finally {
        setIsMediaUploading(false);
    }
  };

  const syncConversations = async () => {
    if (!isGlobal && selectedUser && clerkUser) {
        await set(ref(db, `users/${clerkUser.id}/conversations/${selectedUser.id}`), true);
        await set(ref(db, `users/${selectedUser.id}/conversations/${clerkUser.id}`), true);
        const unreadRef = ref(db, `users/${selectedUser.id}/unread/${clerkUser.id}`);
        const snap = await get(unreadRef);
        await set(unreadRef, (snap.val() || 0) + 1);
    }
  };

  const handleMediaSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const type = file.type.startsWith('video') ? 'video' : 'image';
    setPendingMedia({ file, preview: URL.createObjectURL(file), type });
    if (mediaInputRef.current) mediaInputRef.current.value = '';
  };

  const openChat = (user: ChatUser | null) => {
    if (user === null) { setIsGlobal(true); setSelectedUser(null); }
    else { setIsGlobal(false); setSelectedUser(user); }
    setIsMobileChatOpen(true);
  };

  const { filteredList } = useMemo(() => {
    const base = users.filter(u => clerkUser?.id !== u.id);
    if (sidebarTab === 'search') return { filteredList: base.filter(u => u.name?.toLowerCase().includes(sidebarSearchQuery.toLowerCase())) };
    const talkIds = Object.keys(conversations);
    return { filteredList: base.filter(u => talkIds.includes(u.id) || u.username === OWNER_HANDLE) };
  }, [users, conversations, sidebarSearchQuery, sidebarTab, clerkUser]);

  return (
    <div className="flex flex-col h-full w-full overflow-hidden relative bg-black font-sans px-4 md:px-0">
      <div className="flex-1 flex flex-row min-h-0 h-full w-full">
        
        {/* Desktop Nav */}
        <nav className="hidden lg:flex flex-col items-center py-10 gap-12 w-20 flex-shrink-0 border-r border-white/10 bg-black z-[100] fixed left-0 top-0 bottom-0">
            <button onClick={onBack} className="mb-4"><img src={siteConfig.branding.logoUrl} className="w-9 h-9" /></button>
            <div className="flex flex-col gap-6">
                <button onClick={() => { setSidebarTab('messages'); setSelectedUser(null); }} className={`p-3.5 rounded-2xl ${sidebarTab === 'messages' && !selectedUser ? 'bg-white text-black' : 'text-zinc-500'}`}><HomeIcon className="w-6 h-6" /></button>
                <button onClick={() => setSidebarTab('search')} className={`p-3.5 rounded-2xl ${sidebarTab === 'search' ? 'bg-white text-black' : 'text-zinc-500'}`}><SearchIcon className="w-6 h-6" /></button>
                <button onClick={() => setIsActivityOpen(true)} className="p-3.5 rounded-2xl text-zinc-500"><Bell className="w-6 h-6" /></button>
            </div>
            <div className="mt-auto pb-4">{clerkUser && <img src={clerkUser.imageUrl} className="w-10 h-10 rounded-2xl border-2 border-white/10" />}</div>
        </nav>

        <div className="flex-1 flex flex-col items-start lg:ml-20 overflow-hidden w-full relative">
            <div className="w-full flex-1 flex flex-row overflow-hidden relative">
                
                {/* User List Sidebar */}
                <aside className={`${isMobileChatOpen ? 'hidden' : 'flex'} md:flex w-full md:w-[320px] flex-col border-r border-white/10 bg-black`}>
                    <div className="p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-black text-white lowercase">@{clerkUser?.username || 'user'}</h2>
                            <button onClick={() => setSidebarTab('search')}><Edit className="w-5 h-5 text-white" /></button>
                        </div>
                        <div className="relative">
                            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                            <input value={sidebarSearchQuery} onChange={e => setSidebarSearchQuery(e.target.value)} placeholder="Search..." className="w-full bg-[#1a1a1a] rounded-lg py-2 pl-10 pr-4 text-sm text-white outline-none" />
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar px-2 space-y-1">
                        <button onClick={() => openChat(null)} className={`w-full flex items-center gap-4 p-4 rounded-xl ${isGlobal ? 'bg-white/10' : 'hover:bg-white/5'}`}>
                            <div className="w-12 h-12 rounded-full bg-red-600/10 flex items-center justify-center text-red-600"><GlobeAltIcon className="w-6 h-6"/></div>
                            <div className="text-left"><p className="text-sm font-bold text-white">Global Broadcast</p></div>
                        </button>
                        {filteredList.map(u => (
                            <div key={u.id} onClick={() => openChat(u)} className={`w-full flex items-center gap-4 p-4 rounded-xl cursor-pointer ${selectedUser?.id === u.id ? 'bg-white/10' : 'hover:bg-white/5'}`}>
                                <UserAvatar user={u} className="w-12 h-12" />
                                <div className="text-left min-w-0">
                                    <p className="text-sm font-bold text-white truncate">{u.name}</p>
                                    <p className="text-[10px] text-zinc-500 truncate">@{u.username?.toLowerCase()}</p>
                                </div>
                                {unreadCounts[u.id] > 0 && <div className="ml-auto w-2 h-2 bg-red-600 rounded-full" />}
                            </div>
                        ))}
                    </div>
                </aside>

                {/* Main Chat Area */}
                <main className={`${isMobileChatOpen ? 'flex' : 'hidden'} md:flex flex-1 flex-col bg-black relative`}>
                  {!isGlobal && !selectedUser ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-10 opacity-20"><MessageSquare size={80}/><p className="mt-4 font-black uppercase tracking-widest">Select a channel</p></div>
                  ) : (
                    <>
                      <div className="p-6 border-b border-white/10 flex items-center justify-between backdrop-blur-md sticky top-0 z-10 bg-black/60">
                        <div className="flex items-center gap-4">
                          <button onClick={() => setIsMobileChatOpen(false)} className="md:hidden"><ChevronLeftIcon className="w-6 h-6 text-white"/></button>
                          <div className="flex items-center gap-3">
                            {isGlobal ? <GlobeAltIcon className="w-8 h-8 text-red-600"/> : <UserAvatar user={selectedUser!} className="w-10 h-10"/>}
                            <div>
                                <h3 className="text-sm font-black text-white uppercase">{isGlobal ? 'Global Stream' : selectedUser?.name}{getIdentity(selectedUser?.username || '')}</h3>
                                <p className="text-[10px] text-zinc-500 font-bold tracking-widest">{isGlobal ? 'Public' : `@${selectedUser?.username}`}</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6 flex flex-col no-scrollbar">
                        {messages.map((msg, i) => {
                            const isMe = msg.senderId === clerkUser?.id;
                            return (
                                <div key={msg.id || i} className={`flex gap-3 ${isMe ? 'flex-row-reverse' : 'flex-row'} items-end`}>
                                    <UserAvatar user={{ username: msg.senderUsername, avatar: msg.senderAvatar }} className="w-8 h-8" />
                                    <div className={`max-w-[70%] ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                                        <div className={`px-4 py-2.5 rounded-2xl text-sm ${isMe ? 'bg-red-600 text-white rounded-br-none' : 'bg-[#222] text-zinc-200 rounded-bl-none border border-white/5'}`}>
                                            {msg.mediaUrl ? (
                                                msg.mediaType === 'video' ? <video src={msg.mediaUrl} controls className="max-w-full rounded-lg" /> : <img src={msg.mediaUrl} className="max-w-full rounded-lg" />
                                            ) : msg.text}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        <div ref={messagesEndRef} />
                      </div>

                      <div className="p-4 md:p-8 border-t border-white/10 bg-black">
                        <AnimatePresence>
                            {pendingMedia && (
                                <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="mb-4 relative w-20 h-20 rounded-xl overflow-hidden border border-red-600/50">
                                    <img src={pendingMedia.preview} className="w-full h-full object-cover" />
                                    <button onClick={() => setPendingMedia(null)} className="absolute top-1 right-1 bg-black/60 rounded-full p-1"><X size={12}/></button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                        
                        <div className="flex items-end gap-3 p-1.5 bg-[#111] border border-white/15 rounded-3xl min-h-[56px]">
                            <button onClick={() => mediaInputRef.current?.click()} className="p-3 text-zinc-500 hover:text-white flex-shrink-0"><ImageIcon size={22} /></button>
                            <textarea 
                                ref={textareaRef}
                                value={inputValue} 
                                onChange={e => setInputValue(e.target.value)} 
                                onKeyDown={e => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); }}}
                                placeholder={isMediaUploading ? "Uploading media..." : "Message..."} 
                                rows={1}
                                className="flex-1 bg-transparent py-3 text-sm text-white outline-none resize-none placeholder-zinc-700" 
                            />
                            <button 
                                onClick={() => handleSendMessage()} 
                                disabled={isMediaUploading || (!inputValue.trim() && !pendingMedia)} 
                                className="px-5 py-3 text-red-600 font-black uppercase text-[11px] tracking-widest disabled:opacity-30 flex-shrink-0"
                            >
                                {isMediaUploading ? '...' : 'Send'}
                            </button>
                            <input type="file" ref={mediaInputRef} onChange={handleMediaSelect} hidden accept="image/*,video/*" />
                        </div>
                      </div>
                    </>
                  )}
                </main>
            </div>
        </div>
      </div>
    </div>
  );
};

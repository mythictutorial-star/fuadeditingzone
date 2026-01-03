
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUser, SignInButton } from '@clerk/clerk-react';
import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getDatabase, ref, push, onValue, set, update, get, query, limitToLast } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';
import { GlobeAltIcon, UserCircleIcon, SearchIcon, SendIcon, ChevronLeftIcon, UserGroupIcon } from './Icons';
import { SidebarSubNav } from './Sidebar';
import { ArrowLeft } from 'lucide-react';

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
            className={`${className} rounded-xl border border-white/5 flex-shrink-0 overflow-hidden relative group cursor-pointer ${user.avatar ? '' : bgClass + ' flex items-center justify-center'}`}
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
                <i style={{ animationDelay: `-${delay}s` }} className={`fa-solid fa-circle-check ${isOwner ? 'text-[#ff0000]' : 'text-[#3b82f6]'} text-[12px] md:text-[14px] fez-verified-badge`}></i>
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

export const CommunityChat: React.FC<{ onShowProfile?: (id: string, username?: string) => void; initialTargetUserId?: string | null; onBack?: () => void; onNavigateMarket?: () => void }> = ({ onShowProfile, initialTargetUserId, onBack, onNavigateMarket }) => {
  const { user: clerkUser, isSignedIn } = useUser();
  const [users, setUsers] = useState<ChatUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<ChatUser | null>(null);
  const [isGlobal, setIsGlobal] = useState(true);
  const [sidebarSearchQuery, setSidebarSearchQuery] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isMobileChatOpen, setIsMobileChatOpen] = useState(false); 
  const [showFriendsOnly, setShowFriendsOnly] = useState(false);
  const [friendsList, setFriendsList] = useState<string[]>([]);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hasResolvedInitial = useRef(false);

  const activeCount = useMemo(() => Math.floor(Math.random() * 20) + 142, []);

  useEffect(() => {
    // Fetch all registered community users for global discovery
    const usersRef = ref(db, 'users');
    const unsubUsers = onValue(usersRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
          const list = Object.values(data) as ChatUser[];
          setUsers(list);
          
          if(initialTargetUserId && !hasResolvedInitial.current) {
              const target = list.find(u => u.id === initialTargetUserId || u.username?.toLowerCase() === initialTargetUserId?.toLowerCase());
              if(target) {
                  setIsGlobal(false);
                  setSelectedUser(target);
                  setIsMobileChatOpen(true);
                  hasResolvedInitial.current = true;
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
    
    const chatQuery = query(ref(db, chatPath), limitToLast(100));
    const unsub = onValue(chatQuery, (snap) => {
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

  const filteredUsers = useMemo(() => {
    let list = users;
    if (!sidebarSearchQuery) {
        if (showFriendsOnly) {
            list = list.filter(u => friendsList.includes(u.id));
        } else if (isSignedIn) {
            const messagedIds = Object.keys(unreadCounts);
            // Show owner and people you've messaged
            list = list.filter(u => messagedIds.includes(u.id) || u.username?.toLowerCase() === OWNER_HANDLE);
        } else {
            list = list.filter(u => u.username?.toLowerCase() === OWNER_HANDLE || u.username?.toLowerCase() === ADMIN_HANDLE);
        }
    } else {
        const q = sidebarSearchQuery.toLowerCase();
        // search all community members, INCLUDING self
        list = users.filter(u => 
            u.name?.toLowerCase().includes(q) || 
            u.username?.toLowerCase().includes(q)
        );
    }
    return list.slice(0, 100);
  }, [users, sidebarSearchQuery, clerkUser?.id, showFriendsOnly, friendsList, isSignedIn, unreadCounts]);

  const openChat = (user: ChatUser | null) => {
      setMessages([]);
      if (user === null) { 
          setIsGlobal(true); 
          setSelectedUser(null); 
      } else { 
          setIsGlobal(false); 
          setSelectedUser(user); 
      }
      setIsMobileChatOpen(true);
  };

  const UnreadBadge: React.FC<{ count: number }> = ({ count }) => {
    if (!count || count <= 0) return null;
    return <div className="absolute -top-1.5 -right-1.5 bg-red-600 text-white text-[8px] font-black min-w-[18px] h-[18px] flex items-center justify-center rounded-full border-2 border-black px-1 shadow-lg z-10">{count}</div>;
  };

  return (
    <div className="flex flex-col h-full w-full overflow-hidden relative">
      <div className="flex-1 flex flex-row min-h-0 h-full w-full">
        <aside className={`${isMobileChatOpen ? 'hidden' : 'flex'} md:flex w-full md:w-[260px] lg:w-[320px] flex-col flex-shrink-0 min-h-0 bg-black/40 backdrop-blur-3xl border-r border-white/5 animate-fade-in`}>
          <div className="p-4 flex flex-col gap-3">
            <SidebarSubNav active="community" onSwitch={(t) => t === 'marketplace' && onNavigateMarket?.()} />
            
            <div className="flex items-center gap-2">
              {clerkUser && (
                <>
                  <button onClick={() => setShowFriendsOnly(!showFriendsOnly)} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border transition-all ${showFriendsOnly ? 'bg-white/10 border-white/20 text-white shadow-lg' : 'bg-white/5 border-white/10 text-zinc-500 hover:text-white'}`}><UserGroupIcon className="w-4 h-4" /><span className="text-[10px] font-black uppercase tracking-widest">Friends</span></button>
                  <button onClick={() => onShowProfile?.(clerkUser.id, (clerkUser.username || '').toLowerCase())} className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 text-zinc-500 hover:text-white transition-all flex items-center justify-center flex-shrink-0" title="Your Profile"><UserCircleIcon className="w-5 h-5" /></button>
                </>
              )}
            </div>

            <div className="relative group">
              <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-600 w-4 h-4 group-focus-within:text-white transition-colors" />
              <input value={sidebarSearchQuery} onChange={e => setSidebarSearchQuery(e.target.value)} placeholder="Find Community users..." className="w-full bg-black/60 border border-white/10 rounded-xl py-3 pl-11 pr-3 text-white text-[10px] outline-none focus:border-white/30 transition-all font-bold placeholder-zinc-800 shadow-inner" />
            </div>

            <div className="flex flex-col gap-1.5">
                <button onClick={() => openChat(null)} className={`flex items-center gap-3 px-4 py-3.5 rounded-xl border transition-all ${isGlobal ? 'bg-white/10 border-white/20 text-white shadow-xl' : 'bg-white/5 border-white/5 text-zinc-400 hover:text-white'}`}><i className="fa-solid fa-earth-americas text-xl"></i><span className="text-[10px] font-black uppercase tracking-[0.2em]">Global Feed</span></button>
            </div>
          </div>

          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <div className="flex items-center justify-between px-5 mb-4">
                <h4 className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.3em]">
                    {sidebarSearchQuery ? 'Community Members' : (showFriendsOnly ? 'Friends' : 'Inbox')}
                </h4>
                <div className="flex items-center gap-1.5 opacity-60"><div className="w-1 h-1 rounded-full bg-green-500"></div><span className="text-[7px] font-black text-zinc-500 uppercase">{activeCount} online</span></div>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar px-3 space-y-1.5">
              {filteredUsers.length === 0 ? (
                  <div className="py-20 text-center opacity-30 flex flex-col items-center">
                    <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-5"><SearchIcon className="w-8 h-8" /></div>
                    <p className="text-[10px] font-black uppercase tracking-[0.3em]">{sidebarSearchQuery ? 'No members found' : 'No messages yet'}</p>
                  </div>
              ) : (
                filteredUsers.map(u => {
                  const isMe = u.id === clerkUser?.id;
                  return (
                    <button key={u.id} onClick={() => openChat(u)} className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left group relative ${selectedUser?.id === u.id && !isGlobal ? 'bg-white/10 border-white/10' : 'bg-transparent border-transparent hover:bg-white/5'}`}>
                      <div className="relative shrink-0">
                        <UserAvatar user={u} onClick={(e) => { e.stopPropagation(); onShowProfile?.(u.id, u.username?.toLowerCase()); }} />
                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-zinc-900 rounded-full shadow-lg"></div>
                        <UnreadBadge count={unreadCounts[u.id] || 0} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 mb-0.5 overflow-hidden">
                          <span className={`text-[11px] font-black uppercase truncate leading-none ${unreadCounts[u.id] > 0 ? 'text-white' : 'text-zinc-400 group-hover:text-white'}`}>{u.name} {isMe && '(You)'}</span>
                          {(u.username?.toLowerCase() === OWNER_HANDLE || u.username?.toLowerCase() === ADMIN_HANDLE) && (
                            <i className={`fa-solid fa-circle-check ${u.username?.toLowerCase() === OWNER_HANDLE ? 'text-[#ff0000]' : 'text-[#3b82f6]'} text-[10px] fez-verified-badge`}></i>
                          )}
                        </div>
                        <span className="text-[8px] text-zinc-500 font-bold uppercase tracking-tighter truncate block opacity-60">@{ (u.username || '').toLowerCase() }</span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </aside>

        <main className={`${isMobileChatOpen ? 'flex' : 'hidden'} md:flex flex-1 flex-col min-h-0 bg-black/20 animate-fade-in`}>
          <div className="px-5 py-4 md:px-10 md:py-6 flex items-center justify-between bg-black/60 border-b border-white/5 flex-shrink-0 backdrop-blur-2xl sticky top-0 z-[50]">
            <div className="flex items-center gap-5 min-w-0">
              <button onClick={onBack} className="hidden md:flex p-2.5 rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all group mr-2"><ArrowLeft className="w-5 h-5 group-hover:scale-110 transition-transform" /></button>
              <button onClick={() => setIsMobileChatOpen(false)} className="md:hidden p-2.5 rounded-xl bg-white/5 border border-white/10 text-white"><ChevronLeftIcon className="w-5 h-5" /></button>
              
              <div onClick={() => !isGlobal && onShowProfile?.(selectedUser!.id, selectedUser!.username?.toLowerCase())} className="relative cursor-pointer">
                {isGlobal ? (
                    <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl bg-white/10 flex items-center justify-center border-2 border-white/20">
                        <i className="fa-solid fa-earth-americas text-white text-2xl"></i>
                    </div>
                ) : (
                    <UserAvatar user={selectedUser!} className={`w-12 h-12 md:w-14 md:h-14 border-2 ${selectedUser?.username?.toLowerCase() === OWNER_HANDLE ? 'border-red-600' : 'border-white/20'}`} />
                )}
              </div>

              <div className="min-w-0 cursor-pointer" onClick={() => !isGlobal && onShowProfile?.(selectedUser!.id, selectedUser!.username?.toLowerCase())}>
                <h3 className="text-base md:text-2xl font-black text-white uppercase tracking-tighter flex items-center leading-none">{isGlobal ? 'Global Stream' : selectedUser?.name}{!isGlobal && getIdentity(selectedUser!.username, selectedUser!.role)}</h3>
                <p className="text-[9px] md:text-[11px] text-zinc-500 font-black uppercase tracking-[0.4em] mt-1.5 leading-none">{isGlobal ? 'Public Feed' : `@${(selectedUser?.username || '').toLowerCase()}`}</p>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-5 md:p-12 flex flex-col gap-6 md:gap-10">
            {messages.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center opacity-10 animate-pulse">
                    <i className="fa-solid fa-shield-halved text-5xl mb-6"></i>
                    <p className="text-[12px] font-black uppercase tracking-[0.5em]">{isGlobal ? 'Opening Stream...' : 'Private Connection Secure'}</p>
                </div>
            ) : (
              messages.map((msg, i) => {
                const isMe = msg.senderId === clerkUser?.id;
                const low = msg.senderUsername?.toLowerCase();
                const isOwner = low === OWNER_HANDLE;
                return (
                  <div key={msg.id || i} className={`flex gap-3 md:gap-6 ${isMe ? 'flex-row-reverse' : 'flex-row'} items-end max-w-full group animate-fade-in`}>
                    <UserAvatar 
                        user={{ id: msg.senderId, username: msg.senderUsername, avatar: msg.senderAvatar }} 
                        className={`w-8 h-8 md:w-12 md:h-12 border shadow-lg group-hover:scale-105 transition-transform ${isOwner ? 'border-red-600' : 'border-white/10'}`}
                        onClick={() => onShowProfile?.(msg.senderId, (msg.senderUsername || '').toLowerCase())}
                    />
                    <div className={`max-w-[85%] md:max-w-[70%] ${isMe ? 'items-end' : 'items-start'} flex flex-col min-w-0`}>
                      <div className={`flex items-center mb-1.5 px-1 transition-all ${isMe ? 'flex-row-reverse' : 'flex-row'} cursor-pointer opacity-70 group-hover:opacity-100`} onClick={() => onShowProfile?.(msg.senderId, (msg.senderUsername || '').toLowerCase())}>
                        <span className="text-[10px] md:text-[13px] font-black text-white uppercase tracking-tight truncate leading-none">{low === OWNER_HANDLE ? "FUAD EDITING ZONE" : msg.senderName}</span>
                        {getIdentity(msg.senderUsername || '', msg.senderRole)}
                      </div>
                      <div className={`p-4 md:p-5 rounded-2xl md:rounded-[2.2rem] text-[13px] md:text-[15px] border font-medium leading-relaxed shadow-xl ${isMe ? 'bg-white/10 border-white/20 text-white rounded-br-none' : (isOwner ? 'bg-zinc-900 border-red-600/40 text-white rounded-bl-none' : 'bg-white/5 border-white/10 text-zinc-200 rounded-bl-none')}`} style={{ overflowWrap: 'anywhere' }}>{msg.text}</div>
                      <span className="text-[7px] md:text-[8px] text-zinc-700 font-bold uppercase mt-2 tracking-widest">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-5 md:p-10 bg-black/60 border-t border-white/5 flex-shrink-0 backdrop-blur-3xl">
            {isSignedIn ? (
              <form onSubmit={handleSendMessage} className="max-w-5xl mx-auto flex gap-4 md:gap-6 p-2 bg-[#050505] border border-white/10 rounded-2xl md:rounded-[3rem] shadow-2xl focus-within:border-white/20 transition-all">
                <input value={inputValue} onChange={e => setInputValue(e.target.value)} placeholder={isGlobal ? "Broadcast a message..." : "Send private message..."} className="flex-1 bg-transparent px-6 md:px-10 py-3 md:py-5 text-sm md:text-base font-medium text-white outline-none min-w-0 placeholder-zinc-800" />
                <button type="submit" disabled={!inputValue.trim()} className="bg-white text-black hover:bg-zinc-200 w-12 h-12 md:w-16 md:h-16 flex items-center justify-center rounded-xl md:rounded-[2.5rem] transition-all shadow-xl disabled:opacity-20 flex-shrink-0 active:scale-90"><SendIcon className="w-6 h-6 md:w-7 md:h-7" /></button>
              </form>
            ) : (
              <div className="py-8 text-center space-y-5">
                <p className="text-xs md:text-sm text-zinc-600 font-black uppercase tracking-[0.5em]">Authorization Required</p>
                <SignInButton mode="modal"><button className="bg-red-600 hover:bg-red-700 text-white font-black py-4 md:py-5 px-12 md:px-24 rounded-2xl md:rounded-[3rem] uppercase text-[10px] md:text-xs tracking-[0.5em] transition-all active:scale-95 border border-white/10 shadow-2xl">Log In Now</button></SignInButton>
              </div>
            )}
            {!isGlobal && isSignedIn && (
                <p className="text-center text-[8px] text-zinc-700 font-black uppercase tracking-[0.4em] mt-5 flex items-center justify-center gap-2">
                    <i className="fa-solid fa-lock text-[10px] text-zinc-800"></i> Encrypted Direct Environment
                </p>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

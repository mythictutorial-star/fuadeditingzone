
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUser, SignInButton } from '@clerk/clerk-react';
import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getDatabase, ref, push, onValue, set, update, get, query, limitToLast } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';
import { GlobeAltIcon, UserCircleIcon, SearchIcon, SendIcon, ChevronLeftIcon, UserGroupIcon, CloseIcon } from './Icons';
import { SidebarSubNav } from './Sidebar';
import { ArrowLeft, Edit } from 'lucide-react';

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

export const CommunityChat: React.FC<{ onShowProfile?: (id: string, username?: string) => void; initialTargetUserId?: string | null; onBack?: () => void; onNavigateMarket?: () => void }> = ({ onShowProfile, initialTargetUserId, onBack, onNavigateMarket }) => {
  const { user: clerkUser, isSignedIn } = useUser();
  const [users, setUsers] = useState<ChatUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<ChatUser | null>(null);
  const [isGlobal, setIsGlobal] = useState(false); // Default to no chat open
  const [sidebarSearchQuery, setSidebarSearchQuery] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isMobileChatOpen, setIsMobileChatOpen] = useState(false); 
  const [showFriendsOnly, setShowFriendsOnly] = useState(false);
  const [friendsList, setFriendsList] = useState<string[]>([]);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hasResolvedInitial = useRef(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const activeCount = useMemo(() => Math.floor(Math.random() * 20) + 142, []);

  useEffect(() => {
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
            list = list.filter(u => messagedIds.includes(u.id) || u.username?.toLowerCase() === OWNER_HANDLE);
        } else {
            list = list.filter(u => u.username?.toLowerCase() === OWNER_HANDLE || u.username?.toLowerCase() === ADMIN_HANDLE);
        }
    } else {
        const q = sidebarSearchQuery.toLowerCase();
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
          // Toggle logic: if already global, deselect everything
          if (isGlobal) {
              setIsGlobal(false);
              setSelectedUser(null);
          } else {
              setIsGlobal(true); 
              setSelectedUser(null); 
          }
      } else { 
          setIsGlobal(false); 
          setSelectedUser(user); 
      }
      setIsMobileChatOpen(true);
  };

  const UnreadBadge: React.FC<{ count: number }> = ({ count }) => {
    if (!count || count <= 0) return null;
    return <div className="absolute -top-1 -right-1 bg-red-600 text-white text-[8px] font-black min-w-[16px] h-[16px] flex items-center justify-center rounded-full border border-black px-1 shadow-lg z-10">{count}</div>;
  };

  const handleStartNewMessage = () => {
    searchInputRef.current?.focus();
  };

  return (
    <div className="flex flex-col h-full w-full overflow-hidden relative bg-black font-sans">
      <div className="flex-1 flex flex-row min-h-0 h-full w-full">
        {/* Sidebar Container */}
        <aside className={`${isMobileChatOpen ? 'hidden' : 'flex'} md:flex w-full md:w-[320px] lg:w-[380px] flex-col flex-shrink-0 min-h-0 bg-black border-r border-white/10 animate-fade-in`}>
          
          {/* Sidebar Header */}
          <div className="p-4 flex flex-col gap-5">
            <div className="flex items-center justify-between px-2 pt-2">
                <div className="flex items-center gap-2">
                    <h2 className="text-xl font-black text-white lowercase tracking-tight">{(clerkUser?.username || OWNER_HANDLE).toLowerCase()}</h2>
                    <i className="fa-solid fa-chevron-down text-[10px] text-zinc-500"></i>
                </div>
                <button onClick={handleStartNewMessage} className="text-white hover:opacity-70 transition-opacity">
                    <Edit className="w-5 h-5" />
                </button>
            </div>

            <SidebarSubNav active="community" onSwitch={(t) => t === 'marketplace' && onNavigateMarket?.()} />
            
            {/* Search Input */}
            <div className="relative group">
              <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 w-4 h-4 group-focus-within:text-zinc-400 transition-colors" />
              <input 
                ref={searchInputRef}
                value={sidebarSearchQuery} 
                onChange={e => setSidebarSearchQuery(e.target.value)} 
                placeholder="Search" 
                className="w-full bg-[#262626] border-none rounded-lg py-2.5 pl-11 pr-3 text-white text-sm outline-none transition-all placeholder-zinc-500" 
              />
            </div>

            {/* Top Row Tabs */}
            <div className="flex items-center justify-between px-2">
                <h4 className="text-sm font-bold text-white tracking-tight">Messages</h4>
                <button className="text-xs font-bold text-zinc-500 hover:text-white transition-colors">Requests</button>
            </div>
            
            <div className="flex flex-col gap-1.5">
                <button 
                  onClick={() => openChat(null)} 
                  onDoubleClick={() => { setIsGlobal(false); setSelectedUser(null); }}
                  className={`flex items-center gap-4 px-4 py-3 rounded-lg transition-all ${isGlobal ? 'bg-white/5 text-white' : 'bg-transparent text-zinc-400 hover:bg-white/5 hover:text-white'}`}
                >
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

          {/* User List */}
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <div className="flex-1 overflow-y-auto custom-scrollbar px-2 space-y-1">
              {filteredUsers.length === 0 ? (
                  <div className="py-20 text-center opacity-30 flex flex-col items-center">
                    <p className="text-sm font-bold uppercase tracking-widest text-zinc-500">{sidebarSearchQuery ? 'No members found' : 'No messages yet'}</p>
                  </div>
              ) : (
                filteredUsers.map(u => {
                  const isMe = u.id === clerkUser?.id;
                  const isSelected = selectedUser?.id === u.id && !isGlobal;
                  return (
                    <button key={u.id} onClick={() => openChat(u)} className={`w-full flex items-center gap-4 p-3 rounded-lg transition-all text-left group relative ${isSelected ? 'bg-white/10' : 'bg-transparent hover:bg-white/5'}`}>
                      <div className="relative shrink-0">
                        <UserAvatar user={u} className="w-14 h-14" onClick={(e) => { e.stopPropagation(); onShowProfile?.(u.id, u.username?.toLowerCase()); }} />
                        <UnreadBadge count={unreadCounts[u.id] || 0} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 mb-0.5 overflow-hidden">
                          <span className={`text-sm font-medium truncate leading-none ${unreadCounts[u.id] > 0 ? 'text-white font-black' : 'text-zinc-200'}`}>{u.name} {isMe && '(You)'}</span>
                          {(u.username?.toLowerCase() === OWNER_HANDLE || u.username?.toLowerCase() === ADMIN_HANDLE) && (
                            <i className={`fa-solid fa-circle-check ${u.username?.toLowerCase() === OWNER_HANDLE ? 'text-[#ff0000]' : 'text-[#3b82f6]'} text-[10px] fez-verified-badge`}></i>
                          )}
                        </div>
                        <p className="text-xs text-zinc-500 truncate">@{ (u.username || '').toLowerCase() } • Active</p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className={`${isMobileChatOpen ? 'flex' : 'hidden'} md:flex flex-1 flex-col min-h-0 bg-black animate-fade-in`}>
          
          {!isGlobal && !selectedUser ? (
            /* "Your Messages" Placeholder View */
            <div className="flex-1 flex flex-col items-center justify-center p-10 text-center animate-fade-in">
              <div className="w-24 h-24 rounded-full border-2 border-white flex items-center justify-center mb-6">
                <i className="fa-regular fa-paper-plane text-4xl text-white"></i>
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Your messages</h2>
              <p className="text-sm text-zinc-500 mb-6">Send a message to start a chat.</p>
              <button 
                onClick={handleStartNewMessage}
                className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded-lg text-sm transition-colors active:scale-95 shadow-lg shadow-red-600/20"
              >
                Send message
              </button>
            </div>
          ) : (
            /* Active Chat View */
            <>
              <div className="px-5 py-3 md:px-8 md:py-4 flex items-center justify-between border-b border-white/10 flex-shrink-0 backdrop-blur-2xl sticky top-0 z-[50] bg-black/60">
                <div className="flex items-center gap-4 min-w-0">
                  <button onClick={() => setIsMobileChatOpen(false)} className="md:hidden p-2 rounded-lg bg-white/5 border border-white/10 text-white"><ChevronLeftIcon className="w-5 h-5" /></button>
                  
                  <div onClick={() => !isGlobal && onShowProfile?.(selectedUser!.id, selectedUser!.username?.toLowerCase())} className="relative cursor-pointer">
                    {isGlobal ? (
                        <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-red-600/10 flex items-center justify-center border border-white/10">
                            <i className="fa-solid fa-earth-americas text-white text-xl"></i>
                        </div>
                    ) : (
                        <UserAvatar user={selectedUser!} className={`w-10 h-10 md:w-12 md:h-12 border ${selectedUser?.username?.toLowerCase() === OWNER_HANDLE ? 'border-red-600' : 'border-white/10'}`} />
                    )}
                  </div>

                  <div className="min-w-0 cursor-pointer" onClick={() => !isGlobal && onShowProfile?.(selectedUser!.id, selectedUser!.username?.toLowerCase())}>
                    <h3 className="text-sm md:text-base font-black text-white uppercase tracking-tight flex items-center leading-none">
                        {isGlobal ? 'Global Stream' : selectedUser?.name}
                        {!isGlobal && getIdentity(selectedUser!.username, selectedUser!.role)}
                    </h3>
                    <p className="text-[10px] text-zinc-500 font-bold tracking-widest mt-1 leading-none">
                        {isGlobal ? 'Public Broadcast' : `@${(selectedUser?.username || '').toLowerCase()}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-zinc-400">
                    <button className="hover:text-white transition-colors"><i className="fa-solid fa-phone text-lg"></i></button>
                    <button className="hover:text-white transition-colors"><i className="fa-solid fa-video text-lg"></i></button>
                    <button className="hover:text-white transition-colors"><i className="fa-solid fa-circle-info text-xl"></i></button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar p-5 md:p-10 flex flex-col gap-4 md:gap-6">
                {messages.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center opacity-10 animate-pulse">
                        <i className="fa-solid fa-shield-halved text-5xl mb-6"></i>
                        <p className="text-[12px] font-black uppercase tracking-[0.5em]">{isGlobal ? 'Connecting...' : 'Secure Connection'}</p>
                    </div>
                ) : (
                  messages.map((msg, i) => {
                    const isMe = msg.senderId === clerkUser?.id;
                    const low = msg.senderUsername?.toLowerCase();
                    const isOwner = low === OWNER_HANDLE;
                    return (
                      <div key={msg.id || i} className={`flex gap-3 ${isMe ? 'flex-row-reverse' : 'flex-row'} items-end max-w-full group animate-fade-in`}>
                        <UserAvatar 
                            user={{ id: msg.senderId, username: msg.senderUsername, avatar: msg.senderAvatar }} 
                            className={`w-7 h-7 md:w-8 md:h-8 border shadow-lg group-hover:scale-105 transition-transform ${isOwner ? 'border-red-600' : 'border-white/10'}`}
                            onClick={() => onShowProfile?.(msg.senderId, (msg.senderUsername || '').toLowerCase())}
                        />
                        <div className={`max-w-[75%] md:max-w-[65%] ${isMe ? 'items-end' : 'items-start'} flex flex-col min-w-0`}>
                          {!isMe && (
                              <div className="flex items-center mb-1 px-1 cursor-pointer opacity-70 hover:opacity-100 transition-opacity" onClick={() => onShowProfile?.(msg.senderId, (msg.senderUsername || '').toLowerCase())}>
                                <span className="text-[10px] font-black text-white uppercase tracking-tight truncate leading-none">{msg.senderName}</span>
                              </div>
                          )}
                          <div className={`px-4 py-2.5 rounded-2xl text-[13px] md:text-sm border font-medium leading-relaxed ${isMe ? 'bg-red-600 border-red-600 text-white rounded-br-none shadow-lg shadow-red-600/10' : (isOwner ? 'bg-[#262626] border-red-600/40 text-white rounded-bl-none' : 'bg-[#262626] border-white/5 text-zinc-200 rounded-bl-none')}`} style={{ overflowWrap: 'anywhere' }}>{msg.text}</div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input Container */}
              <div className="p-4 md:p-6 bg-black border-t border-white/10 flex-shrink-0">
                {isSignedIn ? (
                  <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto flex items-center gap-3 p-1.5 border border-white/20 rounded-3xl transition-all focus-within:border-red-600/50">
                    <button type="button" className="p-2 text-white hover:text-red-500 transition-colors"><i className="fa-regular fa-face-smile text-xl"></i></button>
                    <input 
                      value={inputValue} 
                      onChange={e => setInputValue(e.target.value)} 
                      placeholder="Message..." 
                      className="flex-1 bg-transparent px-2 py-2 text-sm text-white outline-none min-w-0 placeholder-zinc-500" 
                    />
                    {inputValue.trim() ? (
                        <button type="submit" className="text-red-600 hover:text-red-500 font-bold px-4 py-2 text-sm transition-colors active:scale-90">Send</button>
                    ) : (
                        <div className="flex items-center gap-3 pr-2 text-white">
                            <button type="button" className="hover:text-red-500 transition-opacity"><i className="fa-solid fa-microphone text-lg"></i></button>
                            <button type="button" className="hover:text-red-500 transition-opacity"><i className="fa-regular fa-image text-lg"></i></button>
                            <button type="button" className="hover:text-red-500 transition-opacity"><i className="fa-regular fa-heart text-xl"></i></button>
                        </div>
                    )}
                  </form>
                ) : (
                  <div className="py-4 text-center">
                    <SignInButton mode="modal">
                        <button className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-12 rounded-lg text-sm transition-all active:scale-95 shadow-xl shadow-red-600/20">
                            Log In to Chat
                        </button>
                    </SignInButton>
                  </div>
                )}
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
};

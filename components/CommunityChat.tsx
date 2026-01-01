import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUser, SignInButton } from '@clerk/clerk-react';
import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getDatabase, ref, push, onChildAdded, onValue, set, update, get, remove, query, limitToLast, orderByChild, equalTo } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';
import { GlobeAltIcon, UserCircleIcon, SearchIcon, SendIcon, ChevronLeftIcon } from './Icons';

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
  avatar: string;
  role?: string;
  online?: boolean;
}

interface Message {
  id?: string;
  senderId: string;
  senderName: string;
  senderUsername?: string;
  senderAvatar: string;
  senderRole?: string;
  text: string;
  timestamp: number;
}

const getIdentity = (username: string, role?: string, hideRole = false) => {
    const isOwner = username === OWNER_HANDLE;
    const isAdmin = username === ADMIN_HANDLE;
    
    let displayRole = role || 'Designer';
    if (isOwner) displayRole = 'Owner';
    if (isAdmin) displayRole = 'Admin';

    return (
        <div className="flex items-center gap-1.5 ml-1.5 flex-shrink-0">
            {(isOwner || isAdmin) && (
                <i className={`fa-solid fa-circle-check ${isOwner ? 'text-[#ff0000]' : 'text-[#3b82f6]'} text-[12px] md:text-[14px] drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]`}></i>
            )}
            {!hideRole && (
              <span className={`text-[7px] md:text-[8px] font-black px-1.5 py-0.5 rounded border leading-none tracking-[0.1em] ${
                  isOwner ? 'bg-red-600/10 text-red-600 border-red-600/20' : 
                  isAdmin ? 'bg-blue-600/10 text-blue-600 border-blue-600/20' : 
                  displayRole === 'Client' ? 'bg-zinc-800 text-zinc-400 border-white/5' :
                  'bg-red-600/5 text-red-500 border-red-600/10'
              }`}>
                  {displayRole.toUpperCase()}
              </span>
            )}
        </div>
    );
};

export const CommunityChat: React.FC<{ onShowProfile?: (id: string, username?: string) => void; initialTargetUserId?: string | null }> = ({ onShowProfile, initialTargetUserId }) => {
  const { user: clerkUser, isSignedIn } = useUser();
  const [users, setUsers] = useState<ChatUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<ChatUser | null>(null);
  const [isGlobal, setIsGlobal] = useState(true);
  const [sidebarSearchQuery, setSidebarSearchQuery] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isMobileChatOpen, setIsMobileChatOpen] = useState(true); 
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    onValue(ref(db, 'users'), (snapshot) => {
      const data = snapshot.val();
      if (data) {
          const list = Object.values(data) as ChatUser[];
          setUsers(list);
          if(initialTargetUserId) {
              const target = list.find(u => u.id === initialTargetUserId || u.username === initialTargetUserId);
              if(target) {
                  setIsGlobal(false);
                  setSelectedUser(target);
                  setIsMobileChatOpen(true);
              }
          }
      }
    });
  }, [initialTargetUserId]);

  const chatPath = useMemo(() => {
    if (isGlobal) return 'community/global';
    if (!clerkUser?.id || !selectedUser?.id) return null;
    return `messages/${[clerkUser.id, selectedUser.id].sort().join('_')}`;
  }, [isGlobal, clerkUser?.id, selectedUser?.id]);

  useEffect(() => {
    if (!chatPath) return;
    setMessages([]);
    const chatQuery = query(ref(db, chatPath), limitToLast(50));
    return onChildAdded(chatQuery, (snap) => {
      setMessages(prev => [...prev, { ...snap.val() as Message, id: snap.key }]);
    });
  }, [chatPath]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isMobileChatOpen]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSignedIn || !inputValue.trim() || !chatPath || !clerkUser) return;

    const myProfile = users.find(u => u.id === clerkUser.id);
    const myRole = myProfile?.role || 'Designer';

    const newMessage = { 
      senderId: clerkUser.id, 
      senderName: clerkUser.fullName || clerkUser.username || "Anonymous", 
      senderUsername: clerkUser.username,
      senderAvatar: clerkUser.imageUrl,
      senderRole: myRole,
      text: inputValue.trim(), 
      timestamp: Date.now() 
    };
    setInputValue('');
    await push(ref(db, chatPath), newMessage);
  };

  const filteredUsers = useMemo(() => {
    return users
      .filter(u => u.id !== clerkUser?.id)
      .filter(u => 
        u.name?.toLowerCase().includes(sidebarSearchQuery.toLowerCase()) || 
        u.username?.toLowerCase().includes(sidebarSearchQuery.toLowerCase())
      ).slice(0, 50);
  }, [users, sidebarSearchQuery, clerkUser]);

  const openSignal = (user: ChatUser | null) => {
      if (user === null) {
          setIsGlobal(true);
          setSelectedUser(null);
      } else {
          setIsGlobal(false);
          setSelectedUser(user);
      }
      setIsMobileChatOpen(true);
  };

  return (
    <div className="flex flex-col h-full w-full overflow-hidden relative">
      <div className="flex-1 flex flex-row min-h-0 h-full w-full">
        
        {/* NETWORK SIDEBAR - COMPACT */}
        <aside className={`${isMobileChatOpen ? 'hidden' : 'flex'} md:flex w-full md:w-[260px] lg:w-[300px] flex-col flex-shrink-0 min-h-0 bg-black/40 backdrop-blur-3xl border-r border-white/5 animate-fade-in`}>
          
          <div className="p-4 flex flex-col gap-4">
            <div className="flex items-center justify-end">
              {clerkUser && (
                <button onClick={() => onShowProfile?.(clerkUser.id, clerkUser.username || undefined)} className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 text-zinc-500 hover:text-white transition-all flex items-center justify-center">
                  <UserCircleIcon className="w-5 h-5" />
                </button>
              )}
            </div>

            <div className="relative group">
              <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-600 w-4 h-4 group-focus-within:text-red-500 transition-colors" />
              <input 
                value={sidebarSearchQuery} 
                onChange={e => setSidebarSearchQuery(e.target.value)} 
                placeholder="Find designer..." 
                className="w-full bg-black/60 border border-white/10 rounded-xl py-2.5 pl-10 pr-3 text-white text-[10px] outline-none focus:border-red-600/50 transition-all font-bold placeholder-zinc-800 shadow-inner" 
              />
            </div>

            <button 
              onClick={() => openSignal(null)} 
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all ${isGlobal ? 'bg-red-600 border-red-500 text-white' : 'bg-white/5 border-white/5 text-zinc-400 hover:text-white'}`}
            >
              <GlobeAltIcon className="w-5 h-5" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">Global</span>
            </button>
          </div>

          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <h4 className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.3em] px-5 mb-3">Inbox</h4>
            <div className="flex-1 overflow-y-auto custom-scrollbar px-3 space-y-1.5">
              {filteredUsers.length === 0 ? (
                  <div className="py-12 text-center opacity-20">
                      <SearchIcon className="w-8 h-8 mx-auto mb-2" />
                      <p className="text-[8px] font-black uppercase tracking-[0.4em]">Standby</p>
                  </div>
              ) : (
                filteredUsers.map(u => (
                  <button 
                    key={u.id} 
                    onClick={() => openSignal(u)} 
                    className={`w-full flex items-center gap-3 p-2.5 rounded-xl border transition-all text-left group ${selectedUser?.id === u.id && !isGlobal ? 'bg-red-600/10 border-red-600/30' : 'bg-transparent border-transparent hover:bg-white/5'}`}
                  >
                    <div className="relative shrink-0">
                      <img src={u.avatar} className={`w-10 h-10 rounded-xl border object-cover ${u.username === OWNER_HANDLE ? 'border-red-600 shadow-[0_0_10px_rgba(220,38,38,0.2)]' : 'border-white/10'}`} alt="" />
                      <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border border-zinc-900 rounded-full"></div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 mb-0.5 overflow-hidden">
                          <span className="text-[11px] font-black text-white uppercase truncate leading-none">{u.name}</span>
                          {(u.username === OWNER_HANDLE || u.username === ADMIN_HANDLE) && (
                            <i className={`fa-solid fa-circle-check ${u.username === OWNER_HANDLE ? 'text-[#ff0000]' : 'text-[#3b82f6]'} text-[10px] flex-shrink-0`}></i>
                          )}
                      </div>
                      <span className="text-[8px] text-zinc-500 font-bold uppercase tracking-tighter truncate block opacity-60">Status: Stable</span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </aside>

        {/* CHAT AREA - COMPACT & SEAMLESS */}
        <main className={`${isMobileChatOpen ? 'flex' : 'hidden'} md:flex flex-1 flex-col min-h-0 bg-transparent animate-fade-in`}>
          
          <div className="px-4 py-3 md:px-8 md:py-4 flex items-center justify-between bg-black/40 border-b border-white/5 flex-shrink-0 backdrop-blur-xl">
            <div className="flex items-center gap-4 min-w-0">
              <button onClick={() => setIsMobileChatOpen(false)} className="md:hidden p-2 rounded-xl bg-white/5 border border-white/10 text-white">
                 <ChevronLeftIcon className="w-5 h-5" />
              </button>
              
              <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl bg-red-600/10 flex items-center justify-center border-2 overflow-hidden flex-shrink-0 ${!isGlobal && selectedUser?.username === OWNER_HANDLE ? 'border-red-600 shadow-[0_0_20px_rgba(220,38,38,0.3)]' : 'border-white/10'}`}>
                {isGlobal ? <GlobeAltIcon className="w-6 h-6 text-red-600" /> : <img src={selectedUser?.avatar} className="w-full h-full object-cover" alt="" />}
              </div>
              
              <div className="min-w-0">
                <h3 className="text-sm md:text-xl font-black text-white uppercase tracking-tighter flex items-center leading-none">
                  {isGlobal ? 'Global' : selectedUser?.name}
                  {!isGlobal && getIdentity(selectedUser!.username, selectedUser!.role)}
                </h3>
                <p className="text-[8px] md:text-[10px] text-zinc-500 font-black uppercase tracking-[0.4em] mt-1 leading-none">{isGlobal ? 'Uplink Established • 24/7' : `@${selectedUser?.username} • Secured Node`}</p>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8 lg:p-10 flex flex-col gap-5 md:gap-8">
            {messages.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center opacity-10">
                <GlobeAltIcon className="w-12 h-12 text-white mb-6" />
                <p className="text-[12px] font-black uppercase tracking-[0.5em]">Establishing Connection...</p>
              </div>
            ) : (
              messages.map(msg => {
                const isMe = msg.senderId === clerkUser?.id;
                const isOwner = msg.senderUsername === OWNER_HANDLE;
                const isAdmin = msg.senderUsername === ADMIN_HANDLE;

                return (
                  <div key={msg.id} className={`flex gap-3 md:gap-6 ${isMe ? 'flex-row-reverse' : 'flex-row'} items-end max-w-full group`}>
                    <img 
                      src={msg.senderAvatar} 
                      className={`w-7 h-7 md:w-10 md:h-10 rounded-lg border object-cover cursor-pointer flex-shrink-0 shadow-lg transition-transform ${isOwner ? 'border-red-600 shadow-[0_0_10px_rgba(220,38,38,0.4)]' : 'border-white/10'}`} 
                      alt="" 
                      onClick={() => onShowProfile?.(msg.senderId, msg.senderUsername || msg.senderId)} 
                    />
                    <div className={`max-w-[85%] md:max-w-[70%] ${isMe ? 'items-end' : 'items-start'} flex flex-col min-w-0`}>
                      <div className={`flex items-center mb-1 px-1 transition-all ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                        <span className="text-[10px] md:text-[12px] font-black text-white uppercase tracking-tight truncate leading-none">
                            {msg.senderName}
                        </span>
                        {getIdentity(msg.senderUsername || '', msg.senderRole)}
                      </div>
                      
                      <div className={`p-3 md:p-4 rounded-xl md:rounded-[1.8rem] text-[12px] md:text-[14px] border font-medium leading-relaxed shadow-xl poppins-font ${isMe ? 'bg-red-600/15 border-red-600/30 text-white rounded-br-none' : (isOwner ? 'bg-zinc-900 border-red-600/40 text-white rounded-bl-none shadow-red-600/5' : 'bg-white/5 border-white/10 text-zinc-200 rounded-bl-none')}`} style={{ overflowWrap: 'anywhere' }}>
                        {msg.text}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 md:p-8 bg-black/40 border-t border-white/5 flex-shrink-0 backdrop-blur-2xl">
            {isSignedIn ? (
              <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto flex gap-3 md:gap-4 p-1.5 bg-[#050505] border border-white/10 rounded-2xl md:rounded-[2.5rem] shadow-2xl focus-within:border-red-600/50 transition-all">
                <input 
                  value={inputValue} 
                  onChange={e => setInputValue(e.target.value)} 
                  placeholder="Type a signal..." 
                  className="flex-1 bg-transparent px-5 md:px-8 py-2.5 md:py-4 text-xs md:text-sm font-bold text-white outline-none min-w-0 placeholder-zinc-800" 
                />
                <button 
                  type="submit" 
                  disabled={!inputValue.trim()} 
                  className="bg-red-600 hover:bg-red-700 text-white w-10 h-10 md:w-14 md:h-14 flex items-center justify-center rounded-xl md:rounded-2xl active:scale-90 transition-all shadow-xl disabled:opacity-20 flex-shrink-0"
                >
                  <SendIcon className="w-5 h-5 md:w-6 md:h-6" />
                </button>
              </form>
            ) : (
              <div className="py-6 text-center space-y-4">
                <p className="text-[10px] md:text-[11px] text-zinc-600 font-black uppercase tracking-[0.4em]">Auth Protocol Required</p>
                <SignInButton mode="modal">
                  <button className="bg-red-600 hover:bg-red-700 text-white font-black py-3 md:py-4 px-10 md:px-16 rounded-xl md:rounded-2xl uppercase text-[9px] md:text-[10px] tracking-[0.4em] transition-all active:scale-95 border border-white/10">
                    Log In
                  </button>
                </SignInButton>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};
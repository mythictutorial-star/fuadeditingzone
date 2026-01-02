
import React, { useState, useEffect, useCallback } from 'react';
import { 
  SignedIn, 
  SignedOut, 
  SignInButton, 
  UserButton,
  useUser
} from '@clerk/clerk-react';
import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getDatabase, ref, onValue, set, remove, push, update, get } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';
import { siteConfig } from '../config';
import { HomeIcon, BriefcaseIcon, VfxIcon, UserCircleIcon, ChatBubbleIcon, SparklesIcon, CloseIcon, CheckCircleIcon, GlobeAltIcon, UserPlusIcon, SendIcon, MarketIcon, ShoppingCartIcon } from './Icons';
import { motion, AnimatePresence } from 'framer-motion';

const firebaseConfig = {
  databaseURL: "https://fuad-editing-zone-default-rtdb.firebaseio.com/",
  apiKey: "AIzaSyCC3wbQp5713OqHlf1jLZabA0VClDstfKY",
  projectId: "fuad-editing-zone",
  messagingSenderId: "832389657221",
  appId: "1:1032345523456:web:123456789",
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];
const db = getDatabase(app);

const OWNER_HANDLE = 'fuadeditingzone';
const ADMIN_HANDLE = 'studiomuzammil';

const getBadge = (u: string) => (u === OWNER_HANDLE ? <i className="fa-solid fa-circle-check text-red-600 ml-1.5 text-sm"></i> : u === ADMIN_HANDLE ? <i className="fa-solid fa-circle-check text-blue-500 ml-1.5 text-sm"></i> : null);

interface NavProps {
  onScrollTo: (section: string) => void;
  onNavigateMarketplace?: () => void;
  onNavigateCommunity?: () => void;
  onOpenChatWithUser?: (userId: string) => void;
  onOpenProfile?: (userId: string) => void;
  activeRoute?: string;
  onOpenPost?: (postId: string, commentId?: string) => void;
}

export const SidebarSubNav: React.FC<{ active: 'marketplace' | 'community', onSwitch: (target: 'marketplace' | 'community') => void }> = ({ active, onSwitch }) => {
  return (
    <div className="hidden md:flex p-1 gap-1 bg-white/5 border border-white/10 rounded-xl mb-4 backdrop-blur-md">
       <button 
         onClick={() => onSwitch('marketplace')} 
         className={`flex-1 py-2 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all ${active === 'marketplace' ? 'bg-red-600 text-white shadow-lg shadow-red-600/20' : 'text-zinc-500 hover:text-white hover:bg-red-600/10'}`}
       >
         Market
       </button>
       <button 
         onClick={() => onSwitch('community')} 
         className={`flex-1 py-2 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all ${active === 'community' ? 'bg-red-600 text-white shadow-lg shadow-red-600/20' : 'text-zinc-500 hover:text-white hover:bg-red-600/10'}`}
       >
         Social
       </button>
    </div>
  );
};

const RequestHub: React.FC<{ isOpen: boolean; setIsOpen: (v: boolean) => void; onShowUser: (id: string) => void }> = ({ isOpen, setIsOpen, onShowUser }) => {
    const { user } = useUser();
    const [tab, setTab] = useState<'received' | 'sent'>('received');
    const [receivedRequests, setReceivedRequests] = useState<any[]>([]);
    const [sentRequests, setSentRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!user) return;
        
        const recRef = ref(db, `social/${user.id}/requests/received`);
        const sentRef = ref(db, `social/${user.id}/requests/sent`);

        const unsubRec = onValue(recRef, async (snap) => {
            const data = snap.val() || {};
            const ids = Object.keys(data);
            const list = await Promise.all(ids.map(async (id) => {
                const uSnap = await get(ref(db, `users/${id}`));
                return { id, ...uSnap.val(), timestamp: data[id].timestamp };
            }));
            setReceivedRequests(list.sort((a, b) => b.timestamp - a.timestamp));
        });

        const unsubSent = onValue(sentRef, async (snap) => {
            const data = snap.val() || {};
            const ids = Object.keys(data);
            const list = await Promise.all(ids.map(async (id) => {
                const uSnap = await get(ref(db, `users/${id}`));
                return { id, ...uSnap.val(), timestamp: data[id].timestamp };
            }));
            setSentRequests(list.sort((a, b) => b.timestamp - a.timestamp));
        });

        return () => { unsubRec(); unsubSent(); };
    }, [user]);

    const handleAccept = async (targetId: string) => {
        if (!user) return;
        setLoading(true);
        try {
            await remove(ref(db, `social/${user.id}/requests/received/${targetId}`));
            await remove(ref(db, `social/${targetId}/requests/sent/${user.id}`));
            await set(ref(db, `social/${user.id}/friends/${targetId}`), true);
            await set(ref(db, `social/${targetId}/friends/${user.id}`), true);
            await push(ref(db, `notifications/${targetId}`), {
                type: 'friend_accepted',
                fromId: user.id,
                fromName: user.username || user.fullName,
                fromAvatar: user.imageUrl,
                text: `@${user.username || user.fullName} accepted your friend request!`,
                timestamp: Date.now(),
                read: false
            });
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    const handleReject = async (targetId: string) => {
        if (!user) return;
        setLoading(true);
        try {
            await remove(ref(db, `social/${user.id}/requests/received/${targetId}`));
            await remove(ref(db, `social/${targetId}/requests/sent/${user.id}`));
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    const handleCancel = async (targetId: string) => {
        if (!user) return;
        setLoading(true);
        try {
            await remove(ref(db, `social/${user.id}/requests/sent/${targetId}`));
            await remove(ref(db, `social/${targetId}/requests/received/${user.id}`));
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    return (
        <div className="relative">
            <button onClick={() => setIsOpen(!isOpen)} className="relative p-2 rounded-xl hover:bg-red-600/10 transition-all text-gray-400 hover:text-red-500" title="Friend Requests">
                <UserPlusIcon className="w-5 h-5" />
                {receivedRequests.length > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 text-white text-[9px] font-black flex items-center justify-center rounded-full border border-black shadow-lg">
                        {receivedRequests.length}
                    </span>
                )}
            </button>
            <AnimatePresence>
                {isOpen && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="fixed md:absolute right-4 left-4 md:left-auto md:right-0 top-20 md:top-full w-auto md:w-[340px] bg-[#0c0c0c] border border-white/10 rounded-2xl shadow-[0_30px_70px_rgba(0,0,0,0.9)] overflow-hidden z-[999999]">
                        <div className="p-5 border-b border-white/5 bg-black/40 backdrop-blur-xl flex justify-between items-center">
                            <span className="text-xs font-black text-white uppercase tracking-[0.2em]">Friend Requests</span>
                            <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-white/5 rounded-full transition-colors"><CloseIcon className="w-4 h-4 text-zinc-500" /></button>
                        </div>
                        
                        <div className="flex bg-black/20 border-b border-white/5">
                            <button onClick={() => setTab('received')} className={`flex-1 py-3.5 text-[10px] font-black uppercase tracking-widest transition-all relative ${tab === 'received' ? 'text-red-500' : 'text-zinc-600 hover:text-zinc-400'}`}>
                                Received
                                {receivedRequests.length > 0 && <span className="ml-2 px-1.5 py-0.5 bg-red-600 text-white rounded-full text-[8px]">{receivedRequests.length}</span>}
                                {tab === 'received' && <motion.div layoutId="request-tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-600" />}
                            </button>
                            <button onClick={() => setTab('sent')} className={`flex-1 py-3.5 text-[10px] font-black uppercase tracking-widest transition-all relative ${tab === 'sent' ? 'text-red-500' : 'text-zinc-600 hover:text-zinc-400'}`}>
                                Sent
                                {sentRequests.length > 0 && <span className="ml-2 px-1.5 py-0.5 bg-zinc-800 text-zinc-400 rounded-full text-[8px]">{sentRequests.length}</span>}
                                {tab === 'sent' && <motion.div layoutId="request-tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-600" />}
                            </button>
                        </div>

                        <div className="max-h-[420px] overflow-y-auto custom-scrollbar p-4 space-y-4">
                            {tab === 'received' ? (
                                receivedRequests.length === 0 ? (
                                    <div className="py-16 text-center opacity-20">
                                        <UserPlusIcon className="w-12 h-12 mx-auto mb-4" />
                                        <p className="text-[10px] uppercase font-black tracking-widest text-zinc-400">No pending requests</p>
                                    </div>
                                ) : (
                                    receivedRequests.map((req) => (
                                        <div key={req.id} className="p-4 bg-white/[0.03] border border-white/5 rounded-2xl flex flex-col gap-4 hover:bg-white/[0.06] transition-all">
                                            <div className="flex items-center gap-4 cursor-pointer group/user" onClick={() => { onShowUser(req.id); setIsOpen(false); }}>
                                                <div className="relative">
                                                    <img src={req.avatar} className="w-12 h-12 rounded-xl object-cover border border-white/10 group-hover/user:border-red-600/50 transition-all shadow-xl" alt="" />
                                                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-black rounded-full"></div>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-1">
                                                        <p className="text-[12px] font-black text-white uppercase tracking-tight truncate">@{req.username || 'Anonymous'}</p>
                                                        {getBadge(req.username)}
                                                    </div>
                                                    <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest mt-0.5 truncate">{req.profile?.profession || 'Designer'}</p>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <button disabled={loading} onClick={() => handleAccept(req.id)} className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-[0_10px_20px_rgba(220,38,38,0.3)] active:scale-95 disabled:opacity-50">Confirm</button>
                                                <button disabled={loading} onClick={() => handleReject(req.id)} className="flex-1 bg-white/5 hover:bg-white/10 text-zinc-300 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-white/10 active:scale-95 disabled:opacity-50">Delete</button>
                                            </div>
                                        </div>
                                    ))
                                )
                            ) : (
                                sentRequests.length === 0 ? (
                                    <div className="py-16 text-center opacity-20">
                                        <SendIcon className="w-12 h-12 mx-auto mb-4" />
                                        <p className="text-[10px] uppercase font-black tracking-widest text-zinc-400">No active requests</p>
                                    </div>
                                ) : (
                                    sentRequests.map((req) => (
                                        <div key={req.id} className="p-4 bg-white/[0.03] border border-white/5 rounded-2xl flex flex-col gap-4 hover:bg-white/[0.06] transition-all">
                                            <div className="flex items-center gap-4 cursor-pointer group/user" onClick={() => { onShowUser(req.id); setIsOpen(false); }}>
                                                <img src={req.avatar} className="w-12 h-12 rounded-xl object-cover border border-white/10 group-hover/user:border-red-600/50 transition-all shadow-xl" alt="" />
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-1">
                                                        <p className="text-[12px] font-black text-white uppercase tracking-tight truncate">@{req.username || 'Anonymous'}</p>
                                                        {getBadge(req.username)}
                                                    </div>
                                                    <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest mt-0.5 italic">Requested</p>
                                                </div>
                                            </div>
                                            <button disabled={loading} onClick={() => handleCancel(req.id)} className="w-full bg-zinc-800/50 hover:bg-red-600/20 hover:text-red-500 text-zinc-500 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-white/5 active:scale-95 disabled:opacity-50">Cancel Request</button>
                                        </div>
                                    ))
                                )
                            )}
                        </div>
                        
                        <div className="p-4 bg-black/40 border-t border-white/5 text-center">
                            <p className="text-[8px] font-black text-zinc-700 uppercase tracking-[0.4em]">Community</p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

const NotificationHub: React.FC<{ isOpen: boolean; setIsOpen: (v: boolean) => void; onShowUser: (id: string) => void; onGoToInbox: (id: string) => void; onOpenPost?: (postId: string, commentId?: string) => void }> = ({ isOpen, setIsOpen, onShowUser, onGoToInbox, onOpenPost }) => {
    const { user } = useUser();
    const [notifications, setNotifications] = useState<any[]>([]);

    useEffect(() => {
        if (!user) return;
        const notifyRef = ref(db, `notifications/${user.id}`);
        const globalRef = ref(db, 'notifications/global');
        
        onValue(notifyRef, (snap) => {
            const data = snap.val() || {};
            const list = Object.entries(data)
                .map(([id, info]: [string, any]) => ({ id, ...info }))
                .filter(n => n.type !== 'friend_request');
            
            onValue(globalRef, (gSnap) => {
              const gData = gSnap.val() || {};
              const gList = Object.entries(gData).map(([id, info]: [string, any]) => ({ id, ...info, isGlobal: true }));
              setNotifications([...list, ...gList].sort((a, b) => b.timestamp - a.timestamp));
            });
        });
    }, [user]);

    const handleNotificationClick = async (n: any) => {
        if (!n.isGlobal) await update(ref(db, `notifications/${user?.id}/${n.id}`), { read: true });
        
        if (n.type === 'post_like' || n.type === 'post_comment' || n.type === 'comment_reply') {
            onOpenPost?.(n.postId, n.commentId);
        } else if (n.fromId && n.fromId !== 'system') {
            onShowUser(n.fromId);
        }
        setIsOpen(false);
    };

    return (
        <div className="relative">
            <button onClick={() => setIsOpen(!isOpen)} className="relative p-2 rounded-xl hover:bg-red-600/10 transition-all text-gray-400 hover:text-red-500" title="Notifications">
                <i className="fa-solid fa-bell text-[14px]"></i>
                {notifications.some(n => !n.read && !n.isGlobal) && <span className="absolute top-1 right-1 w-2 h-2 bg-red-600 rounded-full border border-black animate-pulse"></span>}
            </button>
            <AnimatePresence>
                {isOpen && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="fixed md:absolute right-4 left-4 md:left-auto md:right-0 top-20 md:top-full w-auto md:w-[300px] bg-[#0a0a0a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-[999999]">
                        <div className="p-4 border-b border-white/5 bg-black flex justify-between items-center">
                            <span className="text-[10px] font-black text-white uppercase tracking-widest">Notifications</span>
                            <button onClick={() => setIsOpen(false)}><CloseIcon className="w-4 h-4 text-zinc-500" /></button>
                        </div>
                        <div className="max-h-[300px] overflow-y-auto custom-scrollbar p-2 space-y-1">
                            {notifications.length === 0 ? (
                                <p className="text-[9px] uppercase font-black tracking-widest text-zinc-600 text-center py-6">Empty</p>
                            ) : (
                                notifications.map((n) => (
                                    <div key={n.id} onClick={() => handleNotificationClick(n)} className={`p-3 rounded-xl cursor-pointer transition-all border border-transparent ${!n.read && !n.isGlobal ? 'bg-red-600/5 border-red-600/10' : 'opacity-50 hover:bg-white/5'}`}>
                                        <div className="flex gap-3 items-center">
                                            {n.fromAvatar && <img src={n.fromAvatar} className="w-6 h-6 rounded-full object-cover" alt="" />}
                                            <div className="flex-1 min-w-0">
                                                <p className={`text-[10px] ${n.type === 'daily_spotlight' ? 'text-red-500 font-black' : 'text-gray-200'}`}>{n.text || 'Notification received.'}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export const DesktopHeader: React.FC<NavProps> = ({ onScrollTo, onNavigateMarketplace, onNavigateCommunity, onOpenChatWithUser, onOpenProfile, activeRoute, onOpenPost }) => {
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isRequestsOpen, setIsRequestsOpen] = useState(false);
  
  return (
    <header className="hidden md:flex items-center justify-between h-20 px-10 bg-transparent">
        <div onClick={() => onScrollTo('home')} className="cursor-pointer flex items-center gap-4">
            <img src={siteConfig.branding.logoUrl} alt="Logo" className="h-9 w-9 rounded-full shadow-lg" />
            <div className="flex items-center gap-1">
                <span className="font-black text-white text-sm uppercase tracking-[0.2em] font-display">{siteConfig.branding.name}</span>
                {getBadge(OWNER_HANDLE)}
            </div>
        </div>
        <nav className="flex items-center gap-6">
            <button onClick={() => onScrollTo('home')} className={`text-[9px] font-black uppercase tracking-[0.3em] transition-all ${activeRoute === 'home' ? 'text-white' : 'text-gray-400 hover:text-white'}`}>Home</button>
            <button onClick={() => onScrollTo('portfolio')} className={`text-[9px] font-black uppercase tracking-[0.3em] text-gray-400 hover:text-white transition-all`}>Portfolio</button>
            <button onClick={onNavigateMarketplace} className={`text-[9px] font-black uppercase tracking-[0.3em] transition-all ${activeRoute === 'marketplace' ? 'text-red-500' : 'text-gray-400 hover:text-white'}`}>Marketplace</button>
            <button onClick={onNavigateCommunity} className={`text-[9px] font-black uppercase tracking-[0.3em] transition-all ${activeRoute === 'community' ? 'text-red-500' : 'text-gray-400 hover:text-white'}`}>Community</button>
            <button onClick={() => onScrollTo('contact')} className="text-[9px] font-black uppercase tracking-[0.3em] text-gray-400 hover:text-white transition-all border px-4 py-1.5 rounded-lg border-white/10 hover:bg-red-600 hover:text-white">Order</button>
        </nav>
        <div className="flex items-center gap-4">
            <SignedIn>
              <RequestHub isOpen={isRequestsOpen} setIsOpen={(v) => { setIsRequestsOpen(v); setIsNotificationsOpen(false); }} onShowUser={onOpenProfile!} />
              <NotificationHub isOpen={isNotificationsOpen} setIsOpen={(v) => { setIsNotificationsOpen(v); setIsRequestsOpen(false); }} onShowUser={onOpenProfile!} onGoToInbox={onOpenChatWithUser!} onOpenPost={onOpenPost} />
              <UserButton appearance={{ elements: { userButtonAvatarBox: "w-9 h-9 border border-white/20" } }} />
            </SignedIn>
            <SignedOut>
              <SignInButton mode="modal"><button className="text-[9px] font-black text-gray-400 hover:text-white uppercase tracking-[0.4em]">Log In</button></SignInButton>
            </SignedOut>
        </div>
    </header>
  );
};

export const MobileHeader: React.FC<NavProps> = ({ onScrollTo, onNavigateMarketplace, onNavigateCommunity, onOpenChatWithUser, onOpenProfile, onOpenPost }) => {
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
    const [isRequestsOpen, setIsRequestsOpen] = useState(false);
    return (
        <header className="md:hidden flex items-center justify-between h-20 px-6 bg-transparent">
            <div onClick={() => onScrollTo('home')} className="flex items-center gap-3">
                <img src={siteConfig.branding.logoUrl} alt="Logo" className="h-8 w-8 rounded-full shadow-lg" />
                <div className="flex items-center gap-1">
                    <span className="font-bold text-white tracking-widest text-[8px] uppercase font-display">FUAD EDITING ZONE</span>
                    {getBadge(OWNER_HANDLE)}
                </div>
            </div>
            <div className="flex items-center gap-3">
                <SignedIn>
                    <RequestHub isOpen={isRequestsOpen} setIsOpen={(v) => { setIsRequestsOpen(v); setIsNotificationsOpen(false); }} onShowUser={onOpenProfile!} />
                    <NotificationHub isOpen={isNotificationsOpen} setIsOpen={(v) => { setIsNotificationsOpen(v); setIsRequestsOpen(false); }} onShowUser={onOpenProfile!} onGoToInbox={onOpenChatWithUser!} onOpenPost={onOpenPost} />
                    <UserButton />
                </SignedIn>
                <SignedOut><SignInButton mode="modal"><button className="text-[8px] font-black text-red-500 uppercase tracking-widest bg-red-600/10 px-3 py-1.5 rounded-lg border border-red-600/30">Log In</button></SignInButton></SignedOut>
            </div>
        </header>
    );
};

export const MobileFooterNav: React.FC<{ onScrollTo: (target: any) => void; onNavigateMarketplace: () => void; onNavigateCommunity: () => void; activeRoute?: string }> = ({ onScrollTo, onNavigateMarketplace, onNavigateCommunity, activeRoute }) => (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-[100] bg-black/90 backdrop-blur-2xl rounded-t-[2rem] h-20 flex justify-around items-center shadow-2xl border-t border-white/5 px-6">
        <button onClick={() => onScrollTo('home')} className={`flex flex-col items-center gap-1 transition-all ${activeRoute === 'home' ? 'text-red-500 scale-110' : 'text-zinc-500'}`}>
            <HomeIcon className="w-5 h-5" />
            <span className="text-[8px] font-black uppercase tracking-widest">Home</span>
        </button>
        <button onClick={onNavigateMarketplace} className={`flex flex-col items-center gap-1 transition-all ${activeRoute === 'marketplace' ? 'text-red-500 scale-110' : 'text-zinc-500'}`}>
            <MarketIcon className="w-5 h-5" />
            <span className="text-[8px] font-black uppercase tracking-widest">Market</span>
        </button>
        <button onClick={onNavigateCommunity} className={`flex flex-col items-center gap-1 transition-all ${activeRoute === 'community' ? 'text-red-500 scale-110' : 'text-zinc-500'}`}>
            <ChatBubbleIcon className="w-5 h-5" />
            <span className="text-[8px] font-black uppercase tracking-widest">Social</span>
        </button>
        <button onClick={() => onScrollTo('contact')} className={`flex flex-col items-center gap-1 transition-all text-zinc-500`}>
            <ShoppingCartIcon className="w-5 h-5" />
            <span className="text-[8px] font-black uppercase tracking-widest">Order</span>
        </button>
    </nav>
);

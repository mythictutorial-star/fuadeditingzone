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
import { HomeIcon, BriefcaseIcon, VfxIcon, UserCircleIcon, ChatBubbleIcon, SparklesIcon, CloseIcon, CheckCircleIcon, GlobeAltIcon, UserPlusIcon, SendIcon, MarketIcon, ShoppingCartIcon, SearchIcon, ChevronRightIcon } from './Icons';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';

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
const RESTRICTED_HANDLE = 'jiya';

const VerifiedBadge: React.FC<{ username: string; custom_badge?: any }> = ({ username, custom_badge }) => {
    const { user: clerkUser } = useUser();
    const low = username.toLowerCase();
    const viewerLow = clerkUser?.username?.toLowerCase();
    
    if (low === OWNER_HANDLE) return <i className="fa-solid fa-circle-check text-red-600 ml-1.5 text-sm fez-verified-badge"></i>;
    if (low === ADMIN_HANDLE) return <i className="fa-solid fa-circle-check text-blue-500 ml-1.5 text-sm fez-verified-badge"></i>;
    
    if (low === RESTRICTED_HANDLE && (viewerLow === OWNER_HANDLE || viewerLow === RESTRICTED_HANDLE)) {
        return (
            <span className="relative inline-flex items-center ml-1.5 fez-verified-badge">
                <i className="fa-solid fa-circle-check text-red-600 text-sm"></i>
                <i className="fa-solid fa-circle-check text-blue-500 text-[5px] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"></i>
            </span>
        );
    }
    if (custom_badge?.active && custom_badge?.color) {
        return <i className="fa-solid fa-circle-check text-sm ml-1.5 fez-verified-badge" style={{ color: custom_badge.color }}></i>;
    }
    return null;
};

interface NavProps {
  onScrollTo: (section: string) => void;
  onNavigateMarketplace?: () => void;
  onNavigateCommunity?: () => void;
  onOpenChatWithUser?: (userId: string) => void;
  onOpenProfile?: (userId: string) => void;
  activeRoute?: string;
  onOpenPost?: (postId: string, commentId?: string) => void;
  onOpenMobileSearch?: () => void;
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
                fromName: (user.username || user.fullName || '').toLowerCase(),
                fromAvatar: user.imageUrl,
                text: `@${(user.username || user.fullName || '').toLowerCase()} accepted your request`,
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
                        <div className="max-h-[420px] overflow-y-auto custom-scrollbar p-4 space-y-4">
                            {tab === 'received' ? (
                                receivedRequests.length === 0 ? (
                                    <div className="py-16 text-center opacity-20"><UserPlusIcon className="w-12 h-12 mx-auto mb-4" /><p className="text-[10px] uppercase font-black tracking-widest text-zinc-400">No pending requests</p></div>
                                ) : (
                                    receivedRequests.map((req) => (
                                        <div key={req.id} className="p-4 bg-white/[0.03] border border-white/5 rounded-2xl flex flex-col gap-4 hover:bg-white/[0.06] transition-all">
                                            <div className="flex items-center gap-4 cursor-pointer group/user" onClick={() => { onShowUser(req.id); setIsOpen(false); }}>
                                                <img src={req.avatar} className="w-12 h-12 rounded-xl object-cover border border-white/10 shadow-xl" alt="" />
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-1">
                                                        <p className="text-[12px] font-black text-white uppercase tracking-tight truncate">@{ (req.username || 'anonymous').toLowerCase() }</p>
                                                        <VerifiedBadge username={req.username} custom_badge={req.custom_badge} />
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
                                    <div className="py-16 text-center opacity-20"><UserPlusIcon className="w-12 h-12 mx-auto mb-4" /><p className="text-[10px] uppercase font-black tracking-widest text-zinc-400">No active requests</p></div>
                                ) : (
                                    sentRequests.map((req) => (
                                        <div key={req.id} className="p-4 bg-white/[0.03] border border-white/5 rounded-2xl flex flex-col gap-4 hover:bg-white/[0.06] transition-all">
                                            <div className="flex items-center gap-4 cursor-pointer group/user" onClick={() => { onShowUser(req.id); setIsOpen(false); }}>
                                                <img src={req.avatar} className="w-12 h-12 rounded-xl object-cover border border-white/10 shadow-xl" alt="" />
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-1">
                                                        <p className="text-[12px] font-black text-white uppercase tracking-tight truncate">@{ (req.username || 'anonymous').toLowerCase() }</p>
                                                        <VerifiedBadge username={req.username} custom_badge={req.custom_badge} />
                                                    </div>
                                                    <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest mt-0.5 italic">Requested</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )
                            )}
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
    const [hasPendingMsgRequests, setHasPendingMsgRequests] = useState(false);

    useEffect(() => {
        if (!user) return;
        const notifyRef = ref(db, `notifications/${user.id}`);
        const globalRef = ref(db, 'notifications/global');
        
        onValue(notifyRef, (snap) => {
            const data = snap.val() || {};
            const rawList = Object.entries(data)
                .map(([id, info]: [string, any]) => ({ id, ...info }));
            
            onValue(globalRef, (gSnap) => {
              const gData = gSnap.val() || {};
              const gList = Object.entries(gData).map(([id, info]: [string, any]) => ({ id, ...info, isGlobal: true }));
              const merged = [...rawList, ...gList].reduce((acc: any[], n: any) => {
                  const existingIndex = acc.findIndex(item => item.fromId === n.fromId && item.type === n.type && !n.isGlobal);
                  if (existingIndex !== -1 && n.type === 'post_like') {
                      acc[existingIndex].count = (acc[existingIndex].count || 1) + 1;
                      acc[existingIndex].timestamp = Math.max(acc[existingIndex].timestamp, n.timestamp);
                  } else {
                      acc.push(n);
                  }
                  return acc;
              }, []);

              setNotifications(merged.sort((a, b) => b.timestamp - a.timestamp));
            });
        });

        const unreadRef = ref(db, `users/${user.id}/unread`);
        const friendsRef = ref(db, `social/${user.id}/friends`);
        onValue(unreadRef, (snap) => {
            const unreads = snap.val() || {};
            get(friendsRef).then(fSnap => {
                const friends = fSnap.exists() ? Object.keys(fSnap.val()) : [];
                const requestIds = Object.keys(unreads).filter(id => unreads[id] > 0 && !friends.includes(id) && id !== OWNER_HANDLE);
                setHasPendingMsgRequests(requestIds.length > 0);
            });
        });
    }, [user]);

    const handleNotificationClick = async (n: any) => {
        if (!n.isGlobal) await update(ref(db, `notifications/${user?.id}/${n.id}`), { read: true });
        
        if (n.type === 'post_like' || n.type === 'post_comment' || n.type === 'comment_reply') {
            onOpenPost?.(n.postId, n.commentId);
        } else if (n.type === 'user_report' && n.targetId) {
            onShowUser(n.targetId);
        } else if (n.fromId && n.fromId !== 'system') {
            onShowUser(n.fromId);
        }
        setIsOpen(false);
    };

    return (
        <div className="relative">
            <button onClick={() => setIsOpen(!isOpen)} className="relative p-2 rounded-xl hover:bg-red-600/10 transition-all text-gray-400 hover:text-red-500" title="Notifications">
                <i className="fa-solid fa-bell text-[14px]"></i>
                {(notifications.some(n => !n.read && !n.isGlobal) || hasPendingMsgRequests) && <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-600 rounded-full border border-black animate-pulse"></span>}
            </button>
            <AnimatePresence>
                {isOpen && (
                    <motion.div initial={{ opacity: 0, scale: 1.05 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.05 }} className="fixed inset-0 bg-black z-[10000000] flex flex-col overflow-hidden">
                        <div className="p-6 md:p-10 border-b border-white/5 bg-black flex justify-between items-center">
                            <h2 className="text-xl md:text-3xl font-black text-white uppercase tracking-[0.2em]">Activity</h2>
                            <button onClick={() => setIsOpen(false)} className="p-3 bg-white/5 rounded-full hover:bg-red-600 transition-all"><CloseIcon className="w-6 h-6 text-white" /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-20 max-w-4xl mx-auto w-full space-y-2">
                            {hasPendingMsgRequests && (
                                <div onClick={() => { setIsOpen(false); onGoToInbox(''); }} className="p-6 cursor-pointer bg-red-600/5 hover:bg-red-600/10 transition-all">
                                    <p className="text-sm md:text-lg font-black text-white uppercase tracking-tight">New Message Requests</p>
                                    <p className="text-[10px] text-zinc-500 font-bold uppercase mt-1">Non-friends are trying to reach you</p>
                                </div>
                            )}
                            {notifications.length === 0 && !hasPendingMsgRequests ? (
                                <div className="h-full flex flex-col items-center justify-center text-center opacity-20">
                                     <p className="text-sm md:text-xl font-black uppercase tracking-[0.5em] text-zinc-600">No Activity Yet</p>
                                </div>
                            ) : (
                                notifications.map((n) => (
                                    <div key={n.id} onClick={() => handleNotificationClick(n)} className={`p-6 cursor-pointer transition-all border-b border-white/5 ${!n.read && !n.isGlobal ? 'bg-red-600/5' : 'bg-black opacity-60 hover:opacity-100 hover:bg-white/[0.03]'}`}>
                                        <p className="text-sm md:text-lg leading-snug text-gray-200">
                                            <span className="font-black text-white">@{ (n.fromName || '').toLowerCase() }</span> {n.text}{n.count > 1 ? ` (${n.count})` : ''}
                                        </p>
                                        <p className="text-[10px] text-zinc-700 font-bold uppercase mt-2 tracking-widest">{new Date(n.timestamp).toLocaleString()}</p>
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
  const logoControls = useAnimation();

  const handleLogoClick = async () => {
    onScrollTo('home');
    await logoControls.start({
        rotate: 360,
        transition: { duration: 0.6, ease: "easeInOut" }
    });
    logoControls.set({ rotate: 0 });
  };
  
  return (
    <header className="hidden md:flex items-center justify-between h-20 px-10 bg-transparent">
        <div onClick={handleLogoClick} className="cursor-pointer flex items-center gap-4 group">
            <motion.img animate={logoControls} src={siteConfig.branding.logoUrl} alt="Logo" className="h-9 w-9" />
            <div className="flex items-center gap-1">
                <span className="font-black text-white text-sm uppercase tracking-[0.2em] font-display transition-colors">{siteConfig.branding.name}</span>
                <VerifiedBadge username={OWNER_HANDLE} />
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

export const MobileHeader: React.FC<NavProps> = ({ onScrollTo, onNavigateMarketplace, onNavigateCommunity, onOpenChatWithUser, onOpenProfile, onOpenPost, onOpenMobileSearch }) => {
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
    const [isRequestsOpen, setIsRequestsOpen] = useState(false);
    const logoControls = useAnimation();

    const handleLogoClick = async () => {
      onScrollTo('home');
      await logoControls.start({
          rotate: 360,
          transition: { duration: 0.6, ease: "easeInOut" }
      });
      logoControls.set({ rotate: 0 });
    };

    return (
        <header className="md:hidden flex items-center justify-between h-20 px-6 bg-transparent">
            <div onClick={handleLogoClick} className="flex items-center gap-3">
                <motion.img animate={logoControls} src={siteConfig.branding.logoUrl} alt="Logo" className="h-8 w-8" />
                <div className="flex items-center gap-1">
                    <span className="font-bold text-white tracking-widest text-[8px] uppercase font-display">FUAD EDITING ZONE</span>
                    <VerifiedBadge username={OWNER_HANDLE} />
                </div>
            </div>
            <div className="flex items-center gap-3">
                <button onClick={onOpenMobileSearch} className="p-2 text-white hover:text-red-500 transition-colors">
                    <SearchIcon className="w-5 h-5" />
                </button>
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

export const MobileFooterNav: React.FC<{ onScrollTo: (target: any) => void; onNavigateMarketplace: () => void; onNavigateCommunity: () => void; onCreatePost: () => void; activeRoute?: string; isMinimized?: boolean; hideFAB?: boolean }> = ({ onScrollTo, onNavigateMarketplace, onNavigateCommunity, onCreatePost, activeRoute, isMinimized, hideFAB }) => {
    const { isSignedIn } = useUser();
    if (isMinimized) return null;

    return (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-[100] pointer-events-none">
            {activeRoute !== 'home' && isSignedIn && !hideFAB && (
                <div className="flex justify-end p-6 pointer-events-auto">
                    <motion.button 
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={onCreatePost}
                        className="w-14 h-14 bg-red-600 text-white rounded-2xl flex items-center justify-center shadow-2xl border border-white/20 active:bg-red-700 transition-colors"
                    >
                        <span className="text-3xl font-light">+</span>
                    </motion.button>
                </div>
            )}
            <motion.nav 
                initial={false}
                animate={{ y: 0, opacity: 0.9 }}
                className="pointer-events-auto bg-black backdrop-blur-2xl rounded-t-[2rem] h-20 flex justify-around items-center shadow-2xl border-t border-white/5 px-6 z-[100]"
            >
                {activeRoute !== 'home' && (
                    <button onClick={() => onScrollTo('home')} className={`flex flex-col items-center gap-1 transition-all ${activeRoute === 'home' ? 'text-red-500 scale-110' : 'text-zinc-500'}`}>
                        <HomeIcon className="w-5 h-5" />
                        <span className="text-[8px] font-black uppercase tracking-widest">Home</span>
                    </button>
                )}
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
            </motion.nav>
        </div>
    );
};
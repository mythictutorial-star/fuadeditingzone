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
import { HomeIcon, BriefcaseIcon, VfxIcon, UserCircleIcon, ChatBubbleIcon, SparklesIcon, CloseIcon, CheckCircleIcon, GlobeAltIcon, UserGroupIcon } from './Icons';
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

// FIX: Added missing getBadge function to show verified checkmarks for owner and admin
const getBadge = (u: string) => (u === OWNER_HANDLE ? <i className="fa-solid fa-circle-check text-red-600 ml-1.5 text-sm"></i> : u === ADMIN_HANDLE ? <i className="fa-solid fa-circle-check text-blue-500 ml-1.5 text-sm"></i> : null);

interface NavProps {
  onScrollTo: (section: string) => void;
  onNavigateMarketplace?: () => void;
  onNavigateCommunity?: () => void;
  onOpenChatWithUser?: (userId: string) => void;
  onOpenProfile?: (userId: string) => void;
  activeRoute?: string;
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
    const [requests, setRequests] = useState<any[]>([]);

    useEffect(() => {
        if (!user) return;
        const notifyRef = ref(db, `notifications/${user.id}`);
        onValue(notifyRef, (snap) => {
            const data = snap.val() || {};
            const list = Object.entries(data)
                .map(([id, info]: [string, any]) => ({ id, ...info }))
                .filter(n => n.type === 'friend_request')
                .sort((a, b) => b.timestamp - a.timestamp);
            setRequests(list);
        });
    }, [user]);

    const handleAction = async (n: any) => {
        await update(ref(db, `notifications/${user?.id}/${n.id}`), { read: true });
        onShowUser(n.fromId);
        setIsOpen(false);
    };

    return (
        <div className="relative">
            <button onClick={() => setIsOpen(!isOpen)} className="relative p-2 rounded-xl hover:bg-red-600/10 transition-all text-gray-400 hover:text-red-500">
                <UserGroupIcon className="w-5 h-5" />
                {requests.some(n => !n.read) && <span className="absolute top-1 right-1 w-2 h-2 bg-red-600 rounded-full border border-black animate-pulse"></span>}
            </button>
            <AnimatePresence>
                {isOpen && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="fixed md:absolute right-4 left-4 md:left-auto md:right-0 top-20 md:top-full w-auto md:w-[300px] bg-[#0a0a0a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-[999999]">
                        <div className="p-4 border-b border-white/5 bg-black flex justify-between items-center">
                            <span className="text-[10px] font-black text-white uppercase tracking-widest">Network Requests</span>
                            <button onClick={() => setIsOpen(false)}><CloseIcon className="w-4 h-4 text-zinc-500" /></button>
                        </div>
                        <div className="max-h-[300px] overflow-y-auto custom-scrollbar p-2 space-y-1">
                            {requests.length === 0 ? (
                                <p className="text-[9px] uppercase font-black tracking-widest text-zinc-600 text-center py-6">No signals</p>
                            ) : (
                                requests.map((n) => (
                                    <div key={n.id} onClick={() => handleAction(n)} className={`p-3 rounded-xl cursor-pointer transition-all border border-transparent flex gap-3 items-center ${!n.read ? 'bg-red-600/5 border-red-600/10' : 'opacity-50 hover:bg-white/5'}`}>
                                        <img src={n.fromAvatar} className="w-7 h-7 rounded-full object-cover border border-white/10" alt="" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[10px] text-gray-200 truncate"><span className="font-black text-red-500">@{n.fromName}</span> sent a request.</p>
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

const NotificationHub: React.FC<{ isOpen: boolean; setIsOpen: (v: boolean) => void; onShowUser: (id: string) => void; onGoToInbox: (id: string) => void }> = ({ isOpen, setIsOpen, onShowUser, onGoToInbox }) => {
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
        if (n.fromId && n.fromId !== 'system') onShowUser(n.fromId);
        setIsOpen(false);
    };

    return (
        <div className="relative">
            <button onClick={() => setIsOpen(!isOpen)} className="relative p-2 rounded-xl hover:bg-red-600/10 transition-all text-gray-400 hover:text-red-500">
                <i className="fa-solid fa-bell text-[14px]"></i>
                {notifications.some(n => !n.read && !n.isGlobal) && <span className="absolute top-1 right-1 w-2 h-2 bg-red-600 rounded-full border border-black animate-pulse"></span>}
            </button>
            <AnimatePresence>
                {isOpen && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="fixed md:absolute right-4 left-4 md:left-auto md:right-0 top-20 md:top-full w-auto md:w-[300px] bg-[#0a0a0a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-[999999]">
                        <div className="p-4 border-b border-white/5 bg-black flex justify-between items-center">
                            <span className="text-[10px] font-black text-white uppercase tracking-widest">Protocol Logs</span>
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
                                                <p className={`text-[10px] ${n.type === 'daily_spotlight' ? 'text-red-500 font-black' : 'text-gray-200'}`}>{n.text || 'System signal received.'}</p>
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

export const DesktopHeader: React.FC<NavProps> = ({ onScrollTo, onNavigateMarketplace, onNavigateCommunity, onOpenChatWithUser, onOpenProfile, activeRoute }) => {
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
            <button onClick={() => onScrollTo('portfolio')} className={`text-[9px] font-black uppercase tracking-[0.3em] text-gray-400 hover:text-white transition-all`}>Work</button>
            <button onClick={onNavigateMarketplace} className={`text-[9px] font-black uppercase tracking-[0.3em] transition-all ${activeRoute === 'marketplace' ? 'text-red-500' : 'text-gray-400 hover:text-white'}`}>Marketplace</button>
            <button onClick={onNavigateCommunity} className={`text-[9px] font-black uppercase tracking-[0.3em] transition-all ${activeRoute === 'community' ? 'text-red-500' : 'text-gray-400 hover:text-white'}`}>Community</button>
            <button onClick={() => onScrollTo('contact')} className="text-[9px] font-black uppercase tracking-[0.3em] text-gray-400 hover:text-white transition-all border px-4 py-1.5 rounded-lg border-white/10 hover:bg-red-600 hover:text-white">Order</button>
        </nav>
        <div className="flex items-center gap-4">
            <SignedIn>
              <RequestHub isOpen={isRequestsOpen} setIsOpen={(v) => { setIsRequestsOpen(v); setIsNotificationsOpen(false); }} onShowUser={onOpenProfile!} />
              <NotificationHub isOpen={isNotificationsOpen} setIsOpen={(v) => { setIsNotificationsOpen(v); setIsRequestsOpen(false); }} onShowUser={onOpenProfile!} onGoToInbox={onOpenChatWithUser!} />
              <UserButton appearance={{ elements: { userButtonAvatarBox: "w-9 h-9 border border-white/20" } }} />
            </SignedIn>
            <SignedOut>
              <SignInButton mode="modal"><button className="text-[9px] font-black text-gray-400 hover:text-white uppercase tracking-[0.4em]">Log In</button></SignInButton>
            </SignedOut>
        </div>
    </header>
  );
};

export const MobileHeader: React.FC<NavProps> = ({ onScrollTo, onNavigateMarketplace, onNavigateCommunity, onOpenChatWithUser, onOpenProfile }) => {
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
                    <NotificationHub isOpen={isNotificationsOpen} setIsOpen={(v) => { setIsNotificationsOpen(v); setIsRequestsOpen(false); }} onShowUser={onOpenProfile!} onGoToInbox={onOpenChatWithUser!} />
                    <UserButton />
                </SignedIn>
                <SignedOut><SignInButton mode="modal"><button className="text-[8px] font-black text-red-500 uppercase tracking-widest bg-red-600/10 px-3 py-1.5 rounded-lg border border-red-600/30">Verify</button></SignInButton></SignedOut>
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
            <GlobeAltIcon className="w-5 h-5" />
            <span className="text-[8px] font-black uppercase tracking-widest">Market</span>
        </button>
        <button onClick={onNavigateCommunity} className={`flex flex-col items-center gap-1 transition-all ${activeRoute === 'community' ? 'text-red-500 scale-110' : 'text-zinc-500'}`}>
            <ChatBubbleIcon className="w-5 h-5" />
            <span className="text-[8px] font-black uppercase tracking-widest">Social</span>
        </button>
        <button onClick={() => onScrollTo('contact')} className={`flex flex-col items-center gap-1 transition-all text-zinc-500`}>
            <BriefcaseIcon className="w-5 h-5" />
            <span className="text-[8px] font-black uppercase tracking-widest">Order</span>
        </button>
    </nav>
);
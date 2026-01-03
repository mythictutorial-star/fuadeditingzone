
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUser, SignIn } from '@clerk/clerk-react';
import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getDatabase, ref, onValue, limitToLast, query, get, update, push, set } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';

import type { GraphicWork, VideoWork, ModalItem } from './hooks/types';
import { siteConfig } from './config';

import { DesktopHeader, MobileHeader, MobileFooterNav } from './components/Sidebar';
import { Home } from './components/Home';
import { Portfolio } from './components/Portfolio';
import { Contact } from './components/Contact';
import { AboutAndFooter } from './components/AboutAndFooter';
import { CommunityChat } from './components/CommunityChat';
import { ModalViewer } from './components/ModalViewer';
import { VFXBackground } from './components/VFXBackground';
import { ChatBubbleIcon, CloseIcon } from './components/Icons';
import { ParallaxProvider } from './contexts/ParallaxContext';
import { MediaGridBackground } from './components/MediaGridBackground';
import { ServicesListPopup } from './components/ServicesListPopup';
import { VideoPipPlayer } from './components/VideoPipPlayer';
import { YouTubeRedirectPopup } from './components/YouTubeRedirectPopup';
import { PwaInstallPrompt } from './components/PwaInstallPrompt';
import { ProfileModal } from './components/ProfileModal';
import { ExploreFeed } from './components/ExploreFeed';
import { CreatePostModal } from './components/CreatePostModal';

// Shared Firebase Instance initialization
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
const RESTRICTED_HANDLE = 'jiya';

export default function App() {
  const { isSignedIn, user, isLoaded } = useUser();
  const [route, setRoute] = useState<'home' | 'marketplace' | 'community'>(
    window.location.pathname === '/marketplace' ? 'marketplace' : 
    window.location.pathname === '/community' ? 'community' : 'home'
  );
  
  const [modalState, setModalState] = useState<{ items: ModalItem[]; currentIndex: number } | null>(null);
  const [targetUserId, setTargetUserId] = useState<string | null>(null);
  const [viewingProfileId, setViewingProfileId] = useState<string | null>(null);
  const [highlightCommentId, setHighlightCommentId] = useState<string | null>(null);
  const [isServicesPopupOpen, setIsServicesPopupOpen] = useState(false);
  const [isYouTubeRedirectOpen, setIsYouTubeRedirectOpen] = useState(false);
  const [activeYouTubeId, setActiveYouTubeId] = useState<string>(siteConfig.content.portfolio.animeEdits[0].videoId || 'oAEDU-nycsE');
  const [isYtPlaying, setIsYtPlaying] = useState(false);
  const [playingVfxVideo, setPlayingVfxVideo] = useState<VideoWork | null>(null);
  const [pipVideo, setPipVideo] = useState<VideoWork | null>(null);
  const [videoCurrentTime, setVideoCurrentTime] = useState(0);
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);
  const [mobileSearchTriggered, setMobileSearchTriggered] = useState(false);
  const [isMessageThreadActive, setIsMessageThreadActive] = useState(false);

  // Sync user profile to database on load
  useEffect(() => {
    if (isLoaded && isSignedIn && user) {
      const userRef = ref(db, `users/${user.id}`);
      update(userRef, {
        id: user.id,
        name: user.fullName || user.username || 'Member',
        username: (user.username || 'user').toLowerCase(),
        avatar: user.imageUrl,
        lastActive: Date.now()
      });
    }
  }, [isLoaded, isSignedIn, user]);

  const navigateTo = (path: 'home' | 'marketplace' | 'community') => {
    setRoute(path);
    window.history.pushState(null, '', path === 'home' ? '/' : `/${path}`);
    setIsMessageThreadActive(false);
  };

  const handleOpenProfile = (id: string) => {
    setViewingProfileId(id);
    window.history.pushState(null, '', `/profile/${id}`);
  };

  return (
    <ParallaxProvider>
      <div className="text-white bg-black overflow-x-hidden flex flex-col h-[100dvh] max-h-[100dvh] font-sans no-clip">
          <VFXBackground /><MediaGridBackground />
          
          <div className={`fixed top-0 left-0 right-0 z-[100] transition-opacity duration-300 ${route !== 'home' ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
            <DesktopHeader 
                onScrollTo={(target) => { navigateTo('home'); setTimeout(() => document.getElementById(target)?.scrollIntoView({behavior:'smooth'}), 100); }} 
                onNavigateMarketplace={() => navigateTo('marketplace')} 
                onNavigateCommunity={() => navigateTo('community')} 
                activeRoute={route} 
            />
            <MobileHeader 
                onScrollTo={(target) => { navigateTo('home'); setTimeout(() => document.getElementById(target)?.scrollIntoView({behavior:'smooth'}), 100); }} 
                onNavigateMarketplace={() => navigateTo('marketplace')} 
                onNavigateCommunity={() => navigateTo('community')} 
            />
          </div>
          
          <main className="relative z-10 flex-1 flex flex-col min-h-0">
            <div className={`w-full h-full flex flex-col min-h-0 overflow-y-auto no-scrollbar scroll-smooth ${route !== 'home' ? 'hidden' : 'block'}`}>
                <Home onOpenServices={() => setIsServicesPopupOpen(true)} onOrderNow={() => {}} onYouTubeClick={() => setIsYouTubeRedirectOpen(true)} />
                <Portfolio openModal={(items: any, idx: number) => setModalState({items, currentIndex: idx})} />
                <Contact onStartOrder={() => {}} />
                <AboutAndFooter />
            </div>

            <div className={`w-full h-full flex flex-col min-h-0 overflow-y-auto no-scrollbar ${route !== 'marketplace' ? 'hidden' : 'block'}`}>
                <ExploreFeed onOpenProfile={handleOpenProfile} onOpenModal={(items: any, idx: number) => setModalState({items, currentIndex: idx})} onBack={() => navigateTo('home')} />
            </div>

            <div className={`flex-1 flex flex-col min-h-0 overflow-hidden pb-24 md:pb-0 ${route !== 'community' ? 'hidden' : 'flex'}`}>
                <CommunityChat 
                  onShowProfile={handleOpenProfile} 
                  initialTargetUserId={targetUserId} 
                  onBack={() => navigateTo('home')} 
                  onNavigateMarket={() => navigateTo('marketplace')} 
                  onThreadStateChange={setIsMessageThreadActive}
                />
            </div>
          </main>

          <ProfileModal isOpen={!!viewingProfileId} onClose={() => setViewingProfileId(null)} viewingUserId={viewingProfileId} />
          {modalState && <ModalViewer state={modalState} onClose={() => setModalState(null)} onNext={(idx) => setModalState({...modalState, currentIndex: idx})} onPrev={(idx) => setModalState({...modalState, currentIndex: idx})} />}
          {isServicesPopupOpen && <ServicesListPopup onClose={() => setIsServicesPopupOpen(false)} />}
          {isYouTubeRedirectOpen && <YouTubeRedirectPopup onClose={() => setIsYouTubeRedirectOpen(false)} onConfirm={() => { setIsYouTubeRedirectOpen(false); navigateTo('home'); }} />}
          <PwaInstallPrompt />
          <MobileFooterNav onScrollTo={() => navigateTo('home')} onNavigateMarketplace={() => navigateTo('marketplace')} onNavigateCommunity={() => navigateTo('community')} onCreatePost={() => setIsCreatePostOpen(true)} activeRoute={route} hideFAB={isMessageThreadActive} />
          <CreatePostModal isOpen={isCreatePostOpen} onClose={() => setIsCreatePostOpen(false)} />
      </div>
    </ParallaxProvider>
  );
}

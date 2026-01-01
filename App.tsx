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

const firebaseConfig = {
  databaseURL: "https://fuad-editing-zone-default-rtdb.firebaseio.com/",
  apiKey: "AIzaSyCC3wbQp5713OqHlf1jLZabA0VClDstfKY",
  projectId: "fuad-editing-zone",
  messagingSenderId: "832389657221",
  appId: "1:1032345523456:web:123456789",
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];
const db = getDatabase(app);

const updateSEO = (title: string, desc: string, image?: string) => {
  if ((window as any).updatePortalMetadata) {
    const absoluteImg = image ? (image.startsWith('http') ? image : window.location.origin + image) : undefined;
    (window as any).updatePortalMetadata(title, desc, absoluteImg);
  }
};

export default function App() {
  const { isSignedIn, user } = useUser();
  const [route, setRoute] = useState<'home' | 'marketplace' | 'community'>(
    window.location.pathname === '/marketplace' ? 'marketplace' : 
    window.location.pathname === '/community' ? 'community' : 'home'
  );
  
  const [isYouTubeApiReady, setIsYouTubeApiReady] = useState(false);
  const [modalState, setModalState] = useState<{ items: ModalItem[]; currentIndex: number } | null>(null);
  const [targetUserId, setTargetUserId] = useState<string | null>(null);
  const [viewingProfileId, setViewingProfileId] = useState<string | null>(null);
  
  const [isServicesPopupOpen, setIsServicesPopupOpen] = useState(false);
  const [isYouTubeRedirectOpen, setIsYouTubeRedirectOpen] = useState(false);
  const [activeYouTubeId, setActiveYouTubeId] = useState<string>(siteConfig.content.portfolio.animeEdits[0].videoId || 'oAEDU-nycsE');
  const [isYtPlaying, setIsYtPlaying] = useState(false);
  const [playingVfxVideo, setPlayingVfxVideo] = useState<VideoWork | null>(null);
  const [pipVideo, setPipVideo] = useState<VideoWork | null>(null);
  const [videoCurrentTime, setVideoCurrentTime] = useState(0);

  const resolveProfileFromUrl = async (path: string) => {
    if (path.startsWith('/@')) {
      const handle = path.substring(2);
      const usersSnap = await get(ref(db, 'users'));
      const usersData = usersSnap.val();
      if (usersData) {
          const userEntry = Object.entries(usersData).find(([id, data]: [string, any]) => data.username === handle || id === handle);
          if (userEntry) {
            setViewingProfileId(userEntry[0]);
            return true;
          }
      }
    }
    return false;
  };

  useEffect(() => {
    const handleInitialLink = async () => {
      const path = window.location.pathname;
      if (path.startsWith('/work/')) {
        const id = path.split('/')[2];
        const allWorks = [...siteConfig.content.portfolio.graphicWorks, ...siteConfig.content.portfolio.vfxEdits];
        const index = allWorks.findIndex(w => String(w.id) === id);
        if (index !== -1) setModalState({ items: allWorks, currentIndex: index });
      } else if (path.startsWith('/post/')) {
        const id = path.split('/')[2];
        const postSnap = await get(ref(db, `explore_posts/${id}`));
        if (postSnap.exists()) setModalState({ items: [{ id, ...postSnap.val() }], currentIndex: 0 });
      } else if (path.startsWith('/profile/')) {
        setViewingProfileId(path.split('/')[2]);
      } else {
        const resolved = await resolveProfileFromUrl(path);
        if (!resolved) {
          setRoute(path === '/marketplace' ? 'marketplace' : path === '/community' ? 'community' : 'home');
        }
      }
    };
    handleInitialLink();
  }, []);

  useEffect(() => {
    if (modalState) {
      const item = modalState.items[modalState.currentIndex] as any;
      const title = item.title || 'Exclusive Masterpiece';
      const desc = item.description || item.caption || "Official work from Fuad Editing Zone.";
      const img = item.imageUrl || item.thumbnailUrl || (item.mediaUrl && item.mediaType === 'image' ? item.mediaUrl : siteConfig.branding.profilePicUrl);
      updateSEO(title, desc, img);
    } else if (viewingProfileId) {
      updateSEO("Profile", "View designer profile on FEZ Zone", siteConfig.branding.logoUrl);
    } else {
      if (route === 'home') updateSEO(siteConfig.seo.title, siteConfig.seo.description, siteConfig.branding.profilePicUrl);
      else if (route === 'marketplace') updateSEO("Marketplace", "Discover premium assets.", siteConfig.branding.logoUrl);
      else if (route === 'community') updateSEO("Community Hub", "Professional design network.", siteConfig.branding.logoUrl);
    }
  }, [modalState, route, viewingProfileId]);

  const handleSetModal = (items: ModalItem[], index: number) => {
    const item = items[index] as any;
    const path = item.userId ? `/post/${item.id}` : `/work/${item.id}`;
    window.history.pushState(null, '', path);
    setModalState({ items, currentIndex: index });
  };

  const handleCloseModal = () => {
    let base = route === 'home' ? '/' : `/${route}`;
    if (viewingProfileId) {
        get(ref(db, `users/${viewingProfileId}`)).then(snap => {
            const userData = snap.val();
            const handle = userData?.username || viewingProfileId;
            window.history.pushState(null, '', `/@${handle}`);
        });
    } else {
        window.history.pushState(null, '', base);
    }
    setModalState(null);
  };

  useEffect(() => {
    const handlePopState = async () => {
      const path = window.location.pathname;
      if (!path.includes('/work/') && !path.includes('/post/')) setModalState(null);
      
      const resolved = await resolveProfileFromUrl(path);
      if (!resolved && !path.includes('/profile/')) {
        setViewingProfileId(null);
      }
      
      setRoute(path === '/marketplace' ? 'marketplace' : path === '/community' ? 'community' : 'home');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateTo = (path: 'home' | 'marketplace' | 'community') => {
    setRoute(path);
    window.history.pushState(null, '', path === 'home' ? '/' : `/${path}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenProfile = (userId: string, username?: string) => {
    const handle = username || userId;
    window.history.pushState(null, '', `/@${handle}`);
    setViewingProfileId(userId);
  };

  const handleCloseProfile = () => {
    const base = route === 'home' ? '/' : `/${route}`;
    window.history.pushState(null, '', base);
    setViewingProfileId(null);
  };

  const handleOpenChatWithUser = (userId: string) => {
    setTargetUserId(userId);
    setViewingProfileId(null);
    navigateTo('community');
  };

  const handleScrollTo = (target: string) => {
    if (route !== 'home') {
      navigateTo('home');
      setTimeout(() => {
        const el = document.getElementById(target);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } else {
      const el = document.getElementById(target);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  useEffect(() => {
    if (!(window as any).YT) {
      const tag = document.createElement('script');
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
      (window as any).onYouTubeIframeAPIReady = () => setIsYouTubeApiReady(true);
    } else { setIsYouTubeApiReady(true); }
  }, []);

  const normalizedModalItems = useMemo(() => {
    if (!modalState) return [];
    return modalState.items.map(item => {
        const post = item as any;
        if (post.mediaUrl) {
            return { ...post, imageUrl: post.mediaType === 'image' ? post.mediaUrl : undefined, url: post.mediaType === 'video' ? post.mediaUrl : undefined, category: post.targetSection || 'Marketplace Post' };
        }
        return item;
    });
  }, [modalState]);

  return (
    <ParallaxProvider>
      <div className="text-white bg-black overflow-x-hidden flex flex-col h-[100dvh] max-h-[100dvh] font-sans no-clip">
          <VFXBackground /><MediaGridBackground />
          <div className="fixed top-0 left-0 right-0 z-[100]">
            <DesktopHeader onScrollTo={handleScrollTo} onNavigateMarketplace={() => navigateTo('marketplace')} onNavigateCommunity={() => navigateTo('community')} onOpenChatWithUser={handleOpenChatWithUser} onOpenProfile={handleOpenProfile} activeRoute={route} />
            <MobileHeader onScrollTo={handleScrollTo} onNavigateMarketplace={() => navigateTo('marketplace')} onNavigateCommunity={() => navigateTo('community')} onOpenChatWithUser={handleOpenChatWithUser} onOpenProfile={handleOpenProfile} />
          </div>
          
          <main className={`relative z-10 flex-1 flex flex-col min-h-0 ${route === 'community' ? 'h-[calc(100dvh-80px)] md:h-[calc(100dvh-80px)] pt-20' : ''}`}>
            {route === 'home' && (
              <div className="flex flex-col">
                <Home onOpenServices={() => setIsServicesPopupOpen(true)} onOrderNow={() => handleScrollTo('contact')} onYouTubeClick={() => setIsYouTubeRedirectOpen(true)} />
                <Portfolio openModal={handleSetModal} isYouTubeApiReady={isYouTubeApiReady} playingVfxVideo={playingVfxVideo} setPlayingVfxVideo={setPlayingVfxVideo} pipVideo={pipVideo} setPipVideo={setPipVideo} activeYouTubeId={activeYouTubeId} setActiveYouTubeId={setActiveYouTubeId} isYtPlaying={isYtPlaying} setIsYtPlaying={setIsYtPlaying} currentTime={videoCurrentTime} setCurrentTime={setVideoCurrentTime} />
                <Contact onStartOrder={() => {}} />
                <AboutAndFooter />
              </div>
            )}
            {route === 'marketplace' && (
              <div className="container mx-auto px-4 py-24 md:py-28 flex flex-col min-h-0 overflow-y-auto custom-scrollbar">
                <ExploreFeed onOpenProfile={handleOpenProfile} onOpenModal={handleSetModal} />
              </div>
            )}
            {route === 'community' && (
              <div className="flex-1 flex flex-col min-h-0 overflow-hidden pb-24 md:pb-0">
                <CommunityChat onShowProfile={handleOpenProfile} initialTargetUserId={targetUserId} />
              </div>
            )}
          </main>

          <ProfileModal 
            isOpen={!!viewingProfileId} 
            onClose={handleCloseProfile} 
            viewingUserId={viewingProfileId} 
            onOpenModal={handleSetModal} 
            onMessageUser={handleOpenChatWithUser}
            onShowProfile={handleOpenProfile}
          />
          {modalState && <ModalViewer state={{ ...modalState, items: normalizedModalItems }} onClose={handleCloseModal} onNext={(idx) => handleSetModal(modalState.items, idx)} onPrev={(idx) => handleSetModal(modalState.items, idx)} />}
          {isServicesPopupOpen && <ServicesListPopup onClose={() => setIsServicesPopupOpen(false)} />}
          {isYouTubeRedirectOpen && <YouTubeRedirectPopup onClose={() => setIsYouTubeRedirectOpen(false)} onConfirm={() => { setIsYouTubeRedirectOpen(false); handleScrollTo('portfolio'); }} />}
          {pipVideo && <VideoPipPlayer video={pipVideo} onClose={() => setPipVideo(null)} currentTime={videoCurrentTime} setCurrentTime={setVideoCurrentTime} />}
          <PwaInstallPrompt />
          <MobileFooterNav onScrollTo={handleScrollTo} onNavigateMarketplace={() => navigateTo('marketplace')} onNavigateCommunity={() => navigateTo('community')} activeRoute={route} />
      </div>
    </ParallaxProvider>
  );
}
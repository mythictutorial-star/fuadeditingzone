import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUser, SignIn } from '@clerk/clerk-react';
import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getDatabase, ref, onValue, limitToLast, query, get, update, push, set, remove } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';

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

const updateSEO = (title: string, desc: string, image?: string) => {
  if ((window as any).updatePortalMetadata) {
    const absoluteImg = image ? (image.startsWith('http') ? image : window.location.origin + image) : undefined;
    (window as any).updatePortalMetadata(title, desc, absoluteImg);
  }
};

export default function App() {
  const { isSignedIn, user, isLoaded } = useUser();
  const [route, setRoute] = useState<'home' | 'marketplace' | 'community'>(
    window.location.pathname === '/marketplace' ? 'marketplace' : 
    window.location.pathname === '/community' ? 'community' : 'home'
  );
  
  const [isYouTubeApiReady, setIsYouTubeApiReady] = useState(false);
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

  useEffect(() => {
    if (isLoaded && isSignedIn && user) {
        const hasWiped = localStorage.getItem('fez_overhaul_v1');
        if (!hasWiped) {
            remove(ref(db, `notifications/${user.id}`)).then(() => {
                localStorage.setItem('fez_overhaul_v1', 'true');
            });
        }
    }
  }, [isLoaded, isSignedIn, user]);

  useEffect(() => {
    if (isLoaded && isSignedIn && user) {
      const userRef = ref(db, `users/${user.id}`);
      get(userRef).then((snapshot) => {
        const currentData = snapshot.val();
        if (!currentData || currentData.username !== (user.username || user.firstName || 'user').toLowerCase()) {
          update(userRef, { id: user.id, name: user.fullName || user.username, username: (user.username || user.firstName || 'user').toLowerCase(), avatar: user.imageUrl, lastActive: Date.now() });
        }
      });
    }
  }, [isLoaded, isSignedIn, user]);

  const resolveProfileFromUrl = async (path: string) => {
    if (path.startsWith('/@')) {
      const handle = path.substring(2).toLowerCase();
      if (handle === RESTRICTED_HANDLE && user?.username?.toLowerCase() !== OWNER_HANDLE) return false;
      const usersSnap = await get(ref(db, 'users'));
      const usersData = usersSnap.val();
      if (usersData) {
          const userEntry = Object.entries(usersData).find(([id, data]: [string, any]) => data.username?.toLowerCase() === handle || id === handle);
          if (userEntry) { setViewingProfileId(userEntry[0]); return true; }
      }
    }
    return false;
  };

  const handleOpenPost = async (postId: string, commentId?: string) => {
      const postSnap = await get(ref(db, `explore_posts/${postId}`));
      if (postSnap.exists()) {
          const postData = postSnap.val();
          if (postData.userName?.toLowerCase() === RESTRICTED_HANDLE && user?.username?.toLowerCase() !== OWNER_HANDLE) return;
          setModalState({ items: [{ id: postId, ...postData }], currentIndex: 0 });
          setHighlightCommentId(commentId || null);
          window.history.pushState(null, '', `/post/${postId}${commentId ? `?commentId=${commentId}` : ''}`);
      }
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
        if (postSnap.exists()) {
            const postData = postSnap.val();
            if (postData.userName?.toLowerCase() === RESTRICTED_HANDLE && user?.username?.toLowerCase() !== OWNER_HANDLE) { setRoute('home'); return; }
            setModalState({ items: [{ id, ...postData }], currentIndex: 0 });
            const searchParams = new URLSearchParams(window.location.search);
            if (searchParams.get('commentId')) setHighlightCommentId(searchParams.get('commentId'));
        }
      } else {
        const resolved = await resolveProfileFromUrl(path);
        if (!resolved) setRoute(path === '/marketplace' ? 'marketplace' : path === '/community' ? 'community' : 'home');
      }
    };
    handleInitialLink();
  }, [user]);

  const handleSetModal = (items: ModalItem[], index: number) => {
    const item = items[index] as any;
    if (item.userName?.toLowerCase() === RESTRICTED_HANDLE && user?.username?.toLowerCase() !== OWNER_HANDLE) return;
    window.history.pushState(null, '', item.userId ? `/post/${item.id}` : `/work/${item.id}`);
    setModalState({ items, currentIndex: index });
    setHighlightCommentId(null);
  };

  const navigateTo = (path: 'home' | 'marketplace' | 'community') => {
    setRoute(path);
    window.history.pushState(null, '', path === 'home' ? '/' : `/${path}`);
    if (path === 'home') window.scrollTo({ top: 0, behavior: 'smooth' });
    setIsMessageThreadActive(false);
  };

  const handleOpenProfile = async (userId: string, username?: string) => {
    let handle = username?.toLowerCase();
    if (!handle) { const snap = await get(ref(db, `users/${userId}`)); handle = snap.val()?.username?.toLowerCase() || userId; }
    if (handle === RESTRICTED_HANDLE && user?.username?.toLowerCase() !== OWNER_HANDLE) return;
    window.history.pushState(null, '', `/@${handle}`);
    setViewingProfileId(userId);
  };

  const handleOpenChatWithUser = async (userId: string) => {
    const snap = await get(ref(db, `users/${userId}`));
    const handle = snap.val()?.username?.toLowerCase();
    if (handle === RESTRICTED_HANDLE && user?.username?.toLowerCase() !== OWNER_HANDLE) return;
    setTargetUserId(userId); setViewingProfileId(null); navigateTo('community');
  };

  const handleScrollTo = (target: string) => {
    if (route !== 'home') { navigateTo('home'); setTimeout(() => { const el = document.getElementById(target); if (el) el.scrollIntoView({ behavior: 'smooth' }); }, 100); }
    else { const el = document.getElementById(target); if (el) el.scrollIntoView({ behavior: 'smooth' }); }
  };

  useEffect(() => {
    if (!(window as any).YT) {
      const tag = document.createElement('script'); tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName('script')[0]; firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
      (window as any).onYouTubeIframeAPIReady = () => setIsYouTubeApiReady(true);
    } else { setIsYouTubeApiReady(true); }
  }, []);

  return (
    <ParallaxProvider>
      <div className="text-white bg-black overflow-x-hidden flex flex-col h-[100dvh] max-h-[100dvh] font-sans no-clip">
          <VFXBackground /><MediaGridBackground />
          
          <div className={`fixed top-0 left-0 right-0 z-[100] transition-opacity duration-300 ${route !== 'home' ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
            <DesktopHeader onScrollTo={handleScrollTo} onNavigateMarketplace={() => navigateTo('marketplace')} onNavigateCommunity={() => navigateTo('community')} onOpenChatWithUser={handleOpenChatWithUser} onOpenProfile={handleOpenProfile} activeRoute={route} onOpenPost={handleOpenPost} />
            <MobileHeader onScrollTo={handleScrollTo} onNavigateMarketplace={() => navigateTo('marketplace')} onNavigateCommunity={() => navigateTo('community')} onOpenChatWithUser={handleOpenChatWithUser} onOpenProfile={handleOpenProfile} onOpenPost={handleOpenPost} onOpenMobileSearch={() => { navigateTo('community'); setMobileSearchTriggered(true); }} />
          </div>
          
          <main className={`relative z-10 flex-1 flex flex-col min-h-0 ${route !== 'home' ? 'pt-0' : ''}`}>
            <div className={`w-full h-full flex flex-col min-h-0 overflow-y-auto no-scrollbar scroll-smooth ${route !== 'home' ? 'hidden' : 'block'}`}>
                <Home onOpenServices={() => setIsServicesPopupOpen(true)} onOrderNow={() => handleScrollTo('contact')} onYouTubeClick={() => setIsYouTubeRedirectOpen(true)} />
                <Portfolio openModal={handleSetModal} isYouTubeApiReady={isYouTubeApiReady} playingVfxVideo={playingVfxVideo} setPlayingVfxVideo={setPlayingVfxVideo} pipVideo={pipVideo} setPipVideo={setPipVideo} activeYouTubeId={activeYouTubeId} setActiveYouTubeId={setActiveYouTubeId} isYtPlaying={isYtPlaying} setIsYtPlaying={setIsYtPlaying} currentTime={videoCurrentTime} setCurrentTime={setVideoCurrentTime} />
                <Contact onStartOrder={() => {}} />
                <AboutAndFooter />
            </div>
            <div className={`w-full h-full flex flex-col min-h-0 overflow-y-auto custom-scrollbar no-scrollbar ${route !== 'marketplace' ? 'hidden' : 'block'}`}>
                <ExploreFeed onOpenProfile={handleOpenProfile} onOpenModal={handleSetModal} onBack={() => navigateTo('home')} />
            </div>
            <div className={`flex-1 flex flex-col min-h-0 overflow-hidden ${route !== 'community' ? 'hidden' : 'flex'}`}>
                <CommunityChat onShowProfile={handleOpenProfile} initialTargetUserId={targetUserId} onBack={() => navigateTo('home')} onNavigateMarket={() => navigateTo('marketplace')} forceSearchTab={mobileSearchTriggered} onSearchTabConsumed={() => setMobileSearchTriggered(false)} onThreadStateChange={setIsMessageThreadActive} onOpenPost={handleOpenPost} />
            </div>
          </main>

          <ProfileModal isOpen={!!viewingProfileId} onClose={() => setViewingProfileId(null)} viewingUserId={viewingProfileId} onOpenModal={handleSetModal} onMessageUser={handleOpenChatWithUser} onShowProfile={handleOpenProfile} />
          {modalState && <ModalViewer state={modalState} onClose={() => setModalState(null)} onNext={(idx) => handleSetModal(modalState.items, idx)} onPrev={(idx) => handleSetModal(modalState.items, idx)} highlightCommentId={highlightCommentId} />}
          {isServicesPopupOpen && <ServicesListPopup onClose={() => setIsServicesPopupOpen(false)} />}
          {isYouTubeRedirectOpen && <YouTubeRedirectPopup onClose={() => setIsYouTubeRedirectOpen(false)} onConfirm={() => { setIsYouTubeRedirectOpen(false); handleScrollTo('portfolio'); }} />}
          {pipVideo && <VideoPipPlayer video={pipVideo} onClose={() => setPipVideo(null)} currentTime={videoCurrentTime} setCurrentTime={setVideoCurrentTime} />}
          <PwaInstallPrompt />
          <MobileFooterNav 
            onScrollTo={handleScrollTo} 
            onNavigateMarketplace={() => navigateTo('marketplace')} 
            onNavigateCommunity={() => navigateTo('community')} 
            onCreatePost={() => setIsCreatePostOpen(true)}
            activeRoute={route} 
            isMinimized={isCreatePostOpen || isMessageThreadActive} 
            hideFAB={false} 
          />
          <CreatePostModal isOpen={isCreatePostOpen} onClose={() => setIsCreatePostOpen(false)} />
      </div>
    </ParallaxProvider>
  );
}
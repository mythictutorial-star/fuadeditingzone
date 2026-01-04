
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUser, SignIn } from '@clerk/clerk-react';
import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getDatabase, ref, onValue, limitToLast, query, get, update, push, set } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';
import { getMessaging, getToken, onMessage } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging.js';

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
import { MessageNotificationToast } from './components/MessageNotificationToast';

const firebaseConfig = {
  databaseURL: "https://fuad-editing-zone-default-rtdb.firebaseio.com/",
  apiKey: "AIzaSyCC3wbQp5713OqHlf1jLZabA0VClDstfKY",
  projectId: "fuad-editing-zone",
  messagingSenderId: "832389657221",
  appId: "1:1032345523456:web:123456789",
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];
const db = getDatabase(app);
const messaging = getMessaging(app);

const VAPID_KEY = "BE7pik37RZvIuKStwPfrAucx4DhCTQ3BK9ehWMpThmtxKaKZfGkurRqWGECejo8Wu_LqHh-k5JMnGetyEJ4Uukc"; 

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
    window.location.pathname.startsWith('/community') ? 'community' : 'home'
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
  
  const [activeToast, setActiveToast] = useState<{ senderName: string; senderAvatar?: string; texts: string[]; isLocked: boolean; senderId: string } | null>(null);
  const lastProcessedNotificationId = useRef<string | null>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isMessageThreadActive, setIsMessageThreadActive] = useState(false);

  useEffect(() => {
    if (isLoaded && isSignedIn && user) {
      const userRef = ref(db, `users/${user.id}`);
      const userData = {
        id: user.id,
        name: user.fullName || user.username || 'Community Member',
        username: (user.username || user.firstName || 'user').toLowerCase(),
        avatar: user.imageUrl,
        lastActive: Date.now()
      };
      get(userRef).then((snapshot) => {
        const currentData = snapshot.val();
        if (!currentData || currentData.name !== userData.name || currentData.username !== userData.username || currentData.avatar !== userData.avatar) {
          update(userRef, userData);
        }
      });
    }
  }, [isLoaded, isSignedIn, user]);

  const resolveProfileFromUrl = async (path: string) => {
    if (path.startsWith('/@')) {
      const handle = path.substring(2).toLowerCase();
      // STRICT PRIVACY: Only @fuadeditingzone can see @jiya
      if (handle === RESTRICTED_HANDLE && user?.username?.toLowerCase() !== OWNER_HANDLE) {
          return false;
      }
      const usersSnap = await get(ref(db, 'users'));
      const usersData = usersSnap.val();
      if (usersData) {
          const userEntry = Object.entries(usersData).find(([id, data]: [string, any]) => data.username?.toLowerCase() === handle || id === handle);
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
      const searchParams = new URLSearchParams(window.location.search);
      const commentId = searchParams.get('commentId');
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
            // Privacy check for posts
            if (postData.userName?.toLowerCase() === RESTRICTED_HANDLE && user?.username?.toLowerCase() !== OWNER_HANDLE) {
               setRoute('home');
               return;
            }
            setModalState({ items: [{ id, ...postData }], currentIndex: 0 });
            if (commentId) setHighlightCommentId(commentId);
        }
      } else {
        const resolved = await resolveProfileFromUrl(path);
        if (!resolved) setRoute(path === '/marketplace' ? 'marketplace' : path.startsWith('/community') ? 'community' : 'home');
      }
    };
    if (isLoaded) handleInitialLink();
  }, [isLoaded, user]);

  return (
    <ParallaxProvider>
      <div className="text-white bg-black overflow-x-hidden flex flex-col h-[100dvh] max-h-[100dvh] font-sans no-clip">
          <VFXBackground /><MediaGridBackground />
          <div className={`fixed top-0 left-0 right-0 z-[100] transition-opacity duration-300 ${route !== 'home' ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
            <DesktopHeader onScrollTo={(t) => {}} onNavigateMarketplace={() => setRoute('marketplace')} onNavigateCommunity={() => setRoute('community')} onOpenChatWithUser={(id) => {}} onOpenProfile={(id) => setViewingProfileId(id)} activeRoute={route} onOpenPost={() => {}} />
            <MobileHeader onScrollTo={(t) => {}} onNavigateMarketplace={() => setRoute('marketplace')} onNavigateCommunity={() => setRoute('community')} onOpenChatWithUser={(id) => {}} onOpenProfile={(id) => setViewingProfileId(id)} onOpenPost={() => {}} onOpenMobileSearch={() => {}} />
          </div>
          <main className={`relative z-10 flex-1 flex flex-col min-h-0 ${route !== 'home' ? 'pt-0' : ''}`}>
            <div className={`w-full h-full flex flex-col min-h-0 overflow-y-auto no-scrollbar scroll-smooth ${route !== 'home' ? 'hidden' : 'block'}`}>
                <Home onOpenServices={() => setIsServicesPopupOpen(true)} onOrderNow={() => {}} />
                <Portfolio openModal={(it, idx) => setModalState({items: it, currentIndex: idx})} isYouTubeApiReady={isYouTubeApiReady} playingVfxVideo={playingVfxVideo} setPlayingVfxVideo={setPlayingVfxVideo} pipVideo={pipVideo} setPipVideo={setPipVideo} activeYouTubeId={activeYouTubeId} setActiveYouTubeId={setActiveYouTubeId} isYtPlaying={isYtPlaying} setIsYtPlaying={setIsYtPlaying} currentTime={videoCurrentTime} setCurrentTime={setVideoCurrentTime} />
                <Contact onStartOrder={() => {}} />
                <AboutAndFooter />
            </div>
            <div className={`w-full h-full flex flex-col min-h-0 overflow-y-auto custom-scrollbar no-scrollbar ${route !== 'marketplace' ? 'hidden' : 'block'}`}>
                <ExploreFeed onOpenProfile={(id) => setViewingProfileId(id)} onOpenModal={(it, idx) => setModalState({items: it, currentIndex: idx})} onBack={() => setRoute('home')} />
            </div>
            <div className={`flex-1 flex flex-col min-h-0 overflow-hidden ${route !== 'community' ? 'hidden' : 'flex'} ${isMessageThreadActive ? '' : 'pb-24'} md:pb-0`}>
                <CommunityChat 
                  onShowProfile={(id) => setViewingProfileId(id)} 
                  initialTargetUserId={targetUserId} 
                  onBack={() => setRoute('home')} 
                  onNavigateMarket={() => setRoute('marketplace')} 
                  onThreadStateChange={(active) => setIsMessageThreadActive(active)}
                />
            </div>
          </main>
          <ProfileModal isOpen={!!viewingProfileId} onClose={() => setViewingProfileId(null)} viewingUserId={viewingProfileId} onOpenModal={(it, idx) => setModalState({items: it, currentIndex: idx})} onMessageUser={(id) => { setTargetUserId(id); setRoute('community'); setViewingProfileId(null); }} onShowProfile={(id) => setViewingProfileId(id)} />
          {modalState && <ModalViewer state={modalState} onClose={() => setModalState(null)} onNext={(idx) => setModalState(prev => prev ? {...prev, currentIndex: idx} : null)} onPrev={(idx) => setModalState(prev => prev ? {...prev, currentIndex: idx} : null)} highlightCommentId={highlightCommentId} />}
          {isServicesPopupOpen && <ServicesListPopup onClose={() => setIsServicesPopupOpen(false)} />}
          <PwaInstallPrompt />
          <MobileFooterNav onScrollTo={() => {}} onNavigateMarketplace={() => setRoute('marketplace')} onNavigateCommunity={() => setRoute('community')} onCreatePost={() => setIsCreatePostOpen(true)} activeRoute={route} isMinimized={isCreatePostOpen} isHidden={isMessageThreadActive} />
          <CreatePostModal isOpen={isCreatePostOpen} onClose={() => setIsCreatePostOpen(false)} />
      </div>
    </ParallaxProvider>
  );
}

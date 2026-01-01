import React from 'react';
import ReactDOM from 'react-dom/client';
import { ClerkProvider } from '@clerk/clerk-react';
import App from './App';

const CLERK_PUBLISHABLE_KEY = "pk_test_YWJsZS1qYXktMzkuY2xlcmsuYWNjb3VudHMuZGV2JA";

if (!CLERK_PUBLISHABLE_KEY) {
  throw new Error("Missing Clerk Publishable Key");
}

// Register Service Worker for FCM
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/firebase-messaging-sw.js')
    .then((registration) => {
      console.log('Neural SW registered: ', registration);
    })
    .catch((err) => {
      console.log('Neural SW registration failed: ', err);
    });
}

const rootElement = document.getElementById('root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <ClerkProvider 
        publishableKey={CLERK_PUBLISHABLE_KEY} 
        afterSignOutUrl="/"
        appearance={{
          variables: {
            colorPrimary: '#ff0000',
            colorBackground: '#0a0a0a',
            colorText: '#ffffff',
            colorTextSecondary: '#888888',
            colorInputBackground: '#111111',
            colorInputText: '#ffffff',
            colorDanger: '#ef4444',
            borderRadius: '1.25rem',
          },
          elements: {
            rootBox: "w-full",
            card: "bg-[#0a0a0a] border border-white/10 shadow-[0_0_80px_rgba(0,0,0,1)] overflow-hidden",
            userButtonPopoverCard: "bg-[#0a0a0a] border border-white/10 shadow-3xl",
            userButtonPopoverActionButton: "hover:bg-white/5 transition-colors py-4 px-6 text-white",
            userButtonPopoverActionButtonText: "text-white font-black uppercase tracking-widest text-[9px]",
            userButtonPopoverActionButtonIcon: "text-red-600 w-4 h-4",
            userButtonPopoverFooter: "hidden",
            
            userProfile: {
              root: "bg-[#050505] border-none rounded-[3rem]",
              navbar: "bg-[#0a0a0a] border-r border-white/5 p-6",
              navbarButton: "text-white opacity-40 font-black uppercase tracking-widest text-[8px] hover:opacity-100 hover:bg-white/5 rounded-xl mb-1 px-4 py-3 transition-all",
              navbarButton__active: "text-white opacity-100 bg-red-600/10 border border-red-600/20 shadow-lg",
              pageScrollBox: "bg-[#050505] p-6 md:p-12 custom-scrollbar",
              headerTitle: "text-white font-black uppercase tracking-tight text-3xl",
              headerSubtitle: "text-gray-500 text-[10px] uppercase tracking-widest font-bold",
              sectionTitleText: "text-white font-black uppercase tracking-widest text-[9px] border-b border-white/5 pb-4 mb-8",
            },

            profileSectionPrimaryButton: "text-red-500 hover:text-red-400 font-black text-[9px] uppercase tracking-widest",
            actionButton: "text-white hover:text-red-500 font-bold",
            menuItemButton: "text-white hover:bg-white/5",
            menuItemText: "text-white font-bold",
            
            formFieldLabel: "text-zinc-600 font-black uppercase text-[8px] tracking-[0.3em] mb-2 ml-1",
            formFieldInput: "bg-[#111] border-white/10 text-white text-sm h-14 focus:border-red-600 transition-all rounded-2xl px-5 shadow-inner",
            formButtonPrimary: "bg-red-600 hover:bg-red-700 text-white font-black uppercase tracking-[0.5em] text-[10px] h-14 shadow-[0_10px_30px_rgba(220,38,38,0.3)] active:scale-95 transition-all",
            
            dividerLine: "bg-white/5",
            dividerText: "text-zinc-700 text-[8px] font-black uppercase tracking-widest",
            alert: "bg-red-600/10 border border-red-600/20 text-white rounded-2xl text-[9px] font-bold p-5 shadow-lg",
            scrollBox: "custom-scrollbar overflow-y-auto"
          }
        }}
      >
        <App />
      </ClerkProvider>
    </React.StrictMode>
  );
}


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
        }
      }}
    >
      <App />
    </ClerkProvider>
  );
}

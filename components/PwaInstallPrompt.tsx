import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { siteConfig } from '../config';
import { DownloadIcon, CloseIcon, CheckCircleIcon } from './Icons';

export const PwaInstallPrompt: React.FC = () => {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [isVisible, setIsVisible] = useState(false);
    const [isIos, setIsIos] = useState(false);

    useEffect(() => {
        // Check if already installed
        if (window.matchMedia('(display-mode: standalone)').matches) {
            return;
        }

        // Detect iOS
        const userAgent = window.navigator.userAgent.toLowerCase();
        const ios = /iphone|ipad|ipod/.test(userAgent);
        setIsIos(ios);

        const handleBeforeInstallPrompt = (e: Event) => {
            // Prevent Chrome 67 and earlier from automatically showing the prompt
            e.preventDefault();
            // Stash the event so it can be triggered later.
            setDeferredPrompt(e);
            
            // Show the prompt after a delay for better UX
            setTimeout(() => {
                setIsVisible(true);
            }, 5000);
        };

        // For iOS, show the prompt manually since beforeinstallprompt isn't supported
        if (ios) {
            setTimeout(() => {
                setIsVisible(true);
            }, 8000);
        }

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        };
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt) return;
        
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        
        if (outcome === 'accepted') {
            setDeferredPrompt(null);
            setIsVisible(false);
        }
    };

    const closePrompt = () => {
        setIsVisible(false);
        // Don't show again for this session
        sessionStorage.setItem('fez_pwa_dismissed', 'true');
    };

    if (sessionStorage.getItem('fez_pwa_dismissed')) return null;

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0, y: 50, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8, y: 20 }}
                    className="fixed bottom-24 md:bottom-8 left-4 right-4 md:left-auto md:right-8 z-[200] max-w-sm"
                >
                    <div className="bg-black/80 backdrop-blur-2xl border border-red-600/30 rounded-2xl p-5 shadow-[0_20px_50px_rgba(220,38,38,0.2)] relative overflow-hidden group">
                        {/* Decorative background glow */}
                        <div className="absolute -top-10 -right-10 w-32 h-32 bg-red-600/10 blur-3xl rounded-full"></div>
                        
                        <button 
                            onClick={closePrompt}
                            className="absolute top-3 right-3 text-gray-500 hover:text-white transition-colors"
                        >
                            <CloseIcon className="w-4 h-4" />
                        </button>

                        <div className="flex gap-4 items-start">
                            <div className="relative flex-shrink-0">
                                <div className="w-12 h-12 rounded-xl overflow-hidden border border-white/10 ring-2 ring-red-600/20">
                                    <img src={siteConfig.branding.logoUrl} alt="Logo" className="w-full h-full object-cover" />
                                </div>
                                <div className="absolute -bottom-1 -right-1 bg-red-600 rounded-full p-0.5 border border-black">
                                    <CheckCircleIcon className="w-2.5 h-2.5 text-white" />
                                </div>
                            </div>

                            <div className="flex-1">
                                <h4 className="text-sm font-black text-white uppercase tracking-tight mb-1">Install FEZ Zone</h4>
                                <p className="text-[10px] text-gray-400 font-medium leading-relaxed">
                                    {isIos 
                                        ? "Tap the Share icon and 'Add to Home Screen' for the best experience."
                                        : "Get the full app experience with offline access and fast loading."}
                                </p>
                                
                                {!isIos && deferredPrompt && (
                                    <button
                                        onClick={handleInstallClick}
                                        className="mt-3 w-full bg-red-600 hover:bg-red-700 text-white text-[10px] font-bold py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95"
                                    >
                                        <DownloadIcon className="w-3 h-3" />
                                        <span>Install Now</span>
                                    </button>
                                )}
                                
                                {isIos && (
                                    <div className="mt-3 flex items-center justify-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white/60 text-[9px] uppercase tracking-widest font-bold">
                                        <i className="fa-solid fa-arrow-up-from-bracket text-blue-400"></i>
                                        <span>Tap Share & Add to Home</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
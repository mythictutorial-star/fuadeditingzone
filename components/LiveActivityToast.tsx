import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { YouTubeIcon, SparklesIcon, CheckCircleIcon } from './Icons';

const COUNTRIES = ["USA", "Germany", "United Kingdom", "Canada", "India", "Bangladesh", "France", "Brazil", "Japan"];
const ACTIONS = ["just viewed VFX Edits", "is looking at Photo Manipulations", "viewed Lokiverse Legend Edit", "checked out the service list", "is exploring the master gallery"];

export const LiveActivityToast: React.FC = () => {
    const [notification, setNotification] = useState<{ country: string; action: string } | null>(null);

    useEffect(() => {
        const triggerNotification = () => {
            const country = COUNTRIES[Math.floor(Math.random() * COUNTRIES.length)];
            const action = ACTIONS[Math.floor(Math.random() * ACTIONS.length)];
            setNotification({ country, action });

            setTimeout(() => {
                setNotification(null);
            }, 6000);
        };

        const timer = setInterval(() => {
            if (Math.random() > 0.4) triggerNotification();
        }, 25000);

        // Initial trigger
        const initial = setTimeout(triggerNotification, 10000);

        return () => {
            clearInterval(timer);
            clearTimeout(initial);
        };
    }, []);

    return (
        <AnimatePresence>
            {notification && (
                <motion.div
                    initial={{ opacity: 0, x: -50, scale: 0.9 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8, x: -20 }}
                    className="fixed bottom-24 md:bottom-10 left-4 z-[200] w-full max-w-[260px] md:max-w-[320px]"
                >
                    <div className="bg-[#0c0c0c]/90 backdrop-blur-2xl border border-red-600/30 rounded-xl p-3 md:p-4 shadow-[0_15px_40px_rgba(0,0,0,0.8)] flex gap-3 items-center">
                        <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg bg-red-600/10 flex items-center justify-center border border-red-600/20 flex-shrink-0">
                            <YouTubeIcon className="w-5 h-5 text-red-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-0.5">
                                <span className="text-[10px] md:text-xs font-black text-white uppercase tracking-tight truncate">Live Activity</span>
                                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                            </div>
                            <p className="text-[9px] md:text-[11px] text-gray-400 font-medium leading-tight">
                                <span className="text-white font-bold">Someone from {notification.country}</span> {notification.action}
                            </p>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock } from 'lucide-react';

interface MessageNotificationToastProps {
    isVisible: boolean;
    senderName: string;
    senderAvatar?: string;
    texts: string[];
    isLocked: boolean;
    onClose: () => void;
    onClick: () => void;
}

export const MessageNotificationToast: React.FC<MessageNotificationToastProps> = ({ 
    isVisible, senderName, senderAvatar, texts, isLocked, onClose, onClick 
}) => {
    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ y: 50, opacity: 0, scale: 0.9 }}
                    animate={{ y: 0, opacity: 1, scale: 1 }}
                    exit={{ y: 20, opacity: 0, scale: 0.9 }}
                    className="fixed bottom-24 right-4 md:bottom-6 md:right-6 z-[10000000] w-[260px] md:w-[320px]"
                >
                    <div 
                        onClick={onClick}
                        className="bg-black/95 backdrop-blur-xl rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.6)] border border-white/10 overflow-hidden cursor-pointer active:scale-95 transition-transform"
                    >
                        <div className="px-4 py-2 border-b border-white/5 flex items-center justify-between">
                            <span className="text-[8px] font-black text-zinc-500 uppercase tracking-[0.2em]">New Connection</span>
                            <span className="text-[8px] font-bold text-zinc-600 lowercase">now</span>
                        </div>

                        <div className="p-4 flex gap-3">
                            <div className="relative flex-shrink-0">
                                {senderAvatar ? (
                                    <img src={senderAvatar} className="w-10 h-10 rounded-full object-cover border border-white/10" alt="" />
                                ) : (
                                    <div className="w-10 h-10 rounded-full bg-zinc-900 flex items-center justify-center border border-white/5">
                                        <i className="fa-solid fa-user text-zinc-600 text-[10px]"></i>
                                    </div>
                                )}
                                {isLocked && (
                                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-red-600 rounded-full flex items-center justify-center border border-black">
                                        <Lock className="w-2 h-2 text-white" />
                                    </div>
                                )}
                            </div>
                            <div className="flex-1 min-w-0 flex flex-col justify-center">
                                <h4 className="text-[11px] font-black text-white uppercase tracking-tight truncate mb-1">@{senderName.toLowerCase()}</h4>
                                <div className="space-y-1">
                                    {isLocked ? (
                                        <p className="text-[10px] text-zinc-400 font-medium italic">Sent a secured signal</p>
                                    ) : (
                                        texts.map((t, i) => (
                                            <p key={i} className="text-[10px] text-zinc-300 font-medium leading-tight line-clamp-2 animate-fade-in break-words">
                                                {t}
                                            </p>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="h-0.5 w-full bg-white/5">
                            <motion.div 
                                initial={{ width: "100%" }}
                                animate={{ width: "0%" }}
                                transition={{ duration: 5, ease: "linear" }}
                                className="h-full bg-red-600"
                            />
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};


import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock } from 'lucide-react';

interface MessageNotificationToastProps {
    isVisible: boolean;
    senderName: string;
    senderAvatar?: string;
    text: string;
    isLocked: boolean;
    onClose: () => void;
    onClick: () => void;
}

export const MessageNotificationToast: React.FC<MessageNotificationToastProps> = ({ 
    isVisible, senderName, senderAvatar, text, isLocked, onClose, onClick 
}) => {
    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ y: -100, opacity: 0, scale: 0.9 }}
                    animate={{ y: 0, opacity: 1, scale: 1 }}
                    exit={{ y: -100, opacity: 0, scale: 0.9 }}
                    className="fixed top-4 left-4 right-4 md:left-auto md:right-6 md:top-6 z-[10000000] md:w-[380px]"
                >
                    <div 
                        onClick={onClick}
                        className="bg-white/90 backdrop-blur-3xl rounded-[1.5rem] md:rounded-[1.8rem] shadow-[0_20px_60px_rgba(0,0,0,0.4)] overflow-hidden cursor-pointer active:scale-95 transition-transform"
                    >
                        {/* iOS Style Header */}
                        <div className="px-5 py-2.5 border-b border-black/5 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="w-5 h-5 bg-[#34d399] rounded-lg flex items-center justify-center">
                                    <i className="fa-solid fa-comment text-[10px] text-white"></i>
                                </div>
                                <span className="text-[9px] font-bold text-black/40 uppercase tracking-[0.1em]">Messages</span>
                            </div>
                            <span className="text-[9px] font-bold text-black/30 lowercase">now</span>
                        </div>

                        {/* Content Area */}
                        <div className="p-5 flex gap-4">
                            <div className="relative flex-shrink-0">
                                {senderAvatar ? (
                                    <img src={senderAvatar} className="w-12 h-12 rounded-full object-cover border border-black/5" alt="" />
                                ) : (
                                    <div className="w-12 h-12 rounded-full bg-zinc-200 flex items-center justify-center">
                                        <i className="fa-solid fa-user text-zinc-400"></i>
                                    </div>
                                )}
                                {isLocked && (
                                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-black rounded-full flex items-center justify-center border-2 border-white">
                                        <Lock className="w-2.5 h-2.5 text-white" />
                                    </div>
                                )}
                            </div>
                            <div className="flex-1 min-w-0 flex flex-col justify-center">
                                <h4 className="text-sm font-black text-black tracking-tight truncate">{senderName}</h4>
                                <p className="text-xs text-black/70 font-medium leading-relaxed line-clamp-2 mt-0.5">
                                    {isLocked ? "Sent a message" : text}
                                </p>
                            </div>
                        </div>

                        {/* Slide to close bar indicator (aesthetic only) */}
                        <div className="w-10 h-1 bg-black/10 mx-auto rounded-full mb-1.5 opacity-40"></div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

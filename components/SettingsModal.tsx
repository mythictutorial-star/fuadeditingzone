import React, { useEffect } from 'react';
import { CloseIcon, GlobeAltIcon } from './Icons';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onChangeLanguage: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, onChangeLanguage }) => {
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        if (isOpen) {
            window.addEventListener('keydown', handleKeyDown);
        }
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div role="dialog" aria-modal="true" className="fixed inset-0 bg-black/80 backdrop-blur-md z-[70] flex items-center justify-center animate-fade-in p-4" onClick={onClose}>
            <div
                className="relative bg-black rounded-3xl w-full max-w-[320px] p-10 text-center border border-white/10 shadow-2xl"
                style={{ animation: 'fade-in-scale 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards' }}
                onClick={e => e.stopPropagation()}
            >
                <button
                    onClick={onClose}
                    aria-label="Close settings"
                    className="absolute top-6 right-6 text-gray-400 hover:text-white transition-colors p-1 rounded-full focus:outline-none"
                >
                    <CloseIcon className="w-5 h-5" />
                </button>

                <h2 className="text-2xl font-black text-white uppercase tracking-widest mb-10">Settings</h2>
                
                <div className="text-left space-y-6">
                    <div>
                        <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-4 ml-1">Communication Language</label>
                        <button 
                            onClick={() => {
                                onClose();
                                onChangeLanguage();
                            }}
                            className="w-full flex items-center justify-center gap-4 bg-white/5 text-white font-black py-5 px-6 rounded-2xl transition-all hover:bg-white/10 hover:border-red-600/30 border border-white/5 uppercase tracking-widest text-[11px]"
                        >
                            <GlobeAltIcon className="w-5 h-5 text-red-600" />
                            <span>Switch Language</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
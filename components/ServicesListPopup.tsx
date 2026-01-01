import React, { useEffect, useMemo, useState } from 'react';
import { siteConfig } from '../config';
import { CloseIcon, ChevronRightIcon } from './Icons';
import type { Service } from '../hooks/types';

interface ServicesListPopupProps {
  onClose: () => void;
}

const ServiceItem: React.FC<{ service: Service }> = ({ service }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const Icon = service.icon;
    const proServices = ['VFX', 'YouTube Thumbnails', 'Photo Manipulation/Social Media', 'Banner Designs', 'AMV EDIT', 'Graphic Design'];
    const isPro = proServices.includes(service.name);
    
    return (
        <div 
            onClick={() => setIsExpanded(!isExpanded)}
            className={`flex flex-col p-5 bg-white/5 rounded-xl border transition-all duration-300 cursor-pointer ${
                isExpanded ? 'border-red-600/50 bg-white/10' : 'border-white/10 hover:border-white/30 hover:bg-white/10'
            }`}
        >
            <div className="flex items-center gap-5">
                <div className="flex-shrink-0 w-11 h-11 rounded-lg bg-red-600/10 flex items-center justify-center border border-red-600/20">
                    {Icon && <Icon className="w-6 h-6 text-red-500" />}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <h4 className="font-bold text-white text-sm md:text-base leading-snug uppercase tracking-wide">
                            {service.name}
                        </h4>
                        {isPro && (
                            <span className="bg-red-600 text-white text-[7px] md:text-[9px] px-1 py-0 rounded-sm font-black ring-1 ring-white/20">PRO</span>
                        )}
                    </div>
                </div>
                <ChevronRightIcon className={`w-4 h-4 text-zinc-600 transition-transform duration-300 ${isExpanded ? 'rotate-90' : ''}`} />
            </div>
            
            {isExpanded && (
                <div className="mt-4 pt-4 border-t border-white/5 animate-fade-in">
                    <p className="text-xs md:text-sm text-zinc-400 leading-relaxed font-light">
                        {service.description}
                    </p>
                </div>
            )}
        </div>
    );
};

export const ServicesListPopup: React.FC<ServicesListPopupProps> = ({ onClose }) => {
    const allServices = siteConfig.content.services.all;

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', onClose);
    }, [onClose]);

    const graphicServices = useMemo(() => 
        allServices.filter(s => s.category === 'Graphic Design'), 
    [allServices]);

    const vfxServices = useMemo(() => 
        allServices.filter(s => s.category === 'Video Editing'), 
    [allServices]);

    return (
        <div 
            className="fixed inset-0 bg-black/80 z-[100000] flex items-center justify-center p-4 animate-fade-in backdrop-blur-sm select-none"
            onClick={onClose}
        >
            <div
                className="bg-black border border-white/20 w-full max-w-md md:max-w-4xl h-auto max-h-[90vh] flex flex-col shadow-[0_0_100px_rgba(0,0,0,1)] animate-popup-scale-in overflow-hidden rounded-2xl"
                onClick={e => e.stopPropagation()}
            >
                <div className="p-6 border-b border-white/10 flex justify-between items-center bg-black flex-shrink-0">
                    <div className="pr-4">
                        <h2 className="text-xl md:text-2xl font-bold text-white uppercase tracking-tighter truncate">How I Can Help</h2>
                        <p className="text-zinc-500 text-[10px] md:text-xs mt-0.5 uppercase tracking-widest font-bold">Services & Expertise</p>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-2 rounded-full bg-white/5 hover:bg-red-600 text-zinc-400 transition-colors flex-shrink-0"
                    >
                        <CloseIcon className="w-5 h-5 md:w-6 md:h-6" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-12 bg-black custom-scrollbar">
                    {graphicServices.length > 0 && (
                        <div>
                            <h3 className="text-red-600 text-[10px] md:text-xs font-bold uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                                <span className="w-10 h-px bg-red-600/30"></span>
                                Graphic Design
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                {graphicServices.map(service => (
                                    <ServiceItem key={service.name} service={service} />
                                ))}
                            </div>
                        </div>
                    )}

                    {vfxServices.length > 0 && (
                        <div>
                            <h3 className="text-red-600 text-[10px] md:text-xs font-bold uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                                <span className="w-10 h-px bg-red-600/30"></span>
                                Video & VFX
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                {vfxServices.map(service => (
                                    <ServiceItem key={service.name} service={service} />
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-6 bg-black border-t border-white/10 flex-shrink-0">
                    <button 
                        onClick={onClose}
                        className="w-full btn-angular bg-red-600 text-white hover:bg-red-700 py-4 font-bold uppercase tracking-widest text-[11px] md:text-xs transition-all duration-300 shadow-[0_10px_25px_rgba(220,38,38,0.4)] flex items-center justify-center gap-2"
                    >
                        <span>Back to Site</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

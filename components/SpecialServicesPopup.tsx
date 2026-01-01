import React, { useEffect } from 'react';
import { SparklesIcon, BriefcaseIcon, PhotoManipulationIcon, VfxIcon, ChevronRightIcon } from './Icons';
import { LazyImage } from './LazyImage';
import { siteConfig } from '../config';

interface SpecialServicesPopupProps {
  onClose: () => void;
}

interface ServiceExample {
  name: string;
  icon: React.ReactElement;
  image?: string;
  video?: string;
}

export const SpecialServicesPopup: React.FC<SpecialServicesPopupProps> = ({ onClose }) => {
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') e.preventDefault();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const serviceExamples: ServiceExample[] = [
      { name: "Photo Manipulation", icon: <PhotoManipulationIcon className="w-full h-full"/>, image: siteConfig.content.portfolio.graphicWorks[0].imageUrl },
      { name: "YouTube Thumbnails", icon: <BriefcaseIcon className="w-full h-full"/>, image: siteConfig.content.portfolio.graphicWorks[5].imageUrl },
      { name: "Cinematic VFX", icon: <VfxIcon className="w-full h-full"/>, video: siteConfig.content.portfolio.vfxEdits[0].url },
      { name: "Anime Edits", icon: <SparklesIcon className="w-full h-full"/>, image: siteConfig.content.portfolio.animeEdits[0].thumbnailUrl },
    ];

    return (
        <div role="dialog" aria-modal="true" className="fixed inset-0 bg-black/80 z-[70] flex items-center justify-center p-4 animate-fade-in backdrop-blur-sm select-none">
            <div
                className="relative bg-[#111] border border-white/10 w-full max-w-sm flex flex-col shadow-2xl shadow-red-900/20 animate-popup-scale-in overflow-hidden"
                style={{ maxHeight: '85vh' }}
                onClick={e => e.stopPropagation()}
            >
                <div className="overflow-y-auto p-6 custom-scrollbar">
                    <div className="text-center mb-6">
                        <h2 className="text-2xl font-bold text-white uppercase tracking-tighter">Special Skills</h2>
                        <p className="text-gray-400 text-xs mt-1 font-medium opacity-70">
                           FEZ • Featured Capabilities
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      {serviceExamples.map(service => (
                        <div 
                            key={service.name} 
                            className="relative group h-24 overflow-hidden bg-black border border-white/10 hover:border-red-500/50 transition-all duration-300 cursor-pointer"
                            onMouseEnter={(e) => {
                                const video = e.currentTarget.querySelector('video');
                                if (video) video.play().catch(() => {});
                            }}
                            onMouseLeave={(e) => {
                                const video = e.currentTarget.querySelector('video');
                                if (video) { video.pause(); video.currentTime = 0; }
                            }}
                        >
                           <div className="absolute inset-0">
                               {service.video ? (
                                <video src={service.video} loop muted playsInline className="w-full h-full object-cover object-top" />
                              ) : (
                                <LazyImage src={service.image!} alt={service.name} className="w-full h-full object-cover object-top" />
                              )}
                           </div>
                           
                           <div className="absolute bottom-0 left-0 right-0 p-3 text-center bg-gradient-to-t from-black/90 via-black/60 to-transparent">
                                <h3 className="text-white font-bold text-[10px] uppercase tracking-widest">{service.name}</h3>
                           </div>
                        </div>
                      ))}
                    </div>
                </div>

                <div className="p-6 bg-[#0a0a0a] border-t border-white/5 flex flex-col items-center justify-center">
                     <button 
                        onClick={onClose}
                        className="group relative bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-8 btn-angular btn-3d transition-all duration-300 flex items-center justify-center gap-3 shadow-[0_5px_15px_rgba(220,38,38,0.3)] hover:shadow-[0_8px_25px_rgba(220,38,38,0.5)]"
                        aria-label="Next"
                     >
                         <span className="uppercase tracking-[0.2em] text-xs">Continue to Site</span>
                         <ChevronRightIcon className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-1" />
                         <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                     </button>
                </div>
            </div>
        </div>
    );
};
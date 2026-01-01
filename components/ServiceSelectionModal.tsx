import React, { useState, useMemo } from 'react';
import { siteConfig } from '../config';
import { CloseIcon, WhatsAppIcon, EmailIcon, ChevronRightIcon } from './Icons';
import type { Service } from '../hooks/types';

interface ServiceSelectionModalProps {
    platform: 'whatsapp' | 'email';
    onClose: () => void;
}

export const ServiceSelectionModal: React.FC<ServiceSelectionModalProps> = ({ platform, onClose }) => {
    const [selectedServices, setSelectedServices] = useState<string[]>([]);
    const allServices = siteConfig.content.services.all;
    const proServices = ['VFX', 'YouTube Thumbnails', 'Photo Manipulation/Social Media', 'Banner Designs', 'AMV EDIT'];

    // Filter services and append an "Other" option to each category
    const graphicServices = useMemo(() => {
        const filtered = allServices.filter(s => s.category === 'Graphic Design');
        return [...filtered, { name: 'Other (Graphic Design)', category: 'Graphic Design', description: 'Any other custom graphic design requirement you might have.' } as Service];
    }, [allServices]);

    const vfxServices = useMemo(() => {
        const filtered = allServices.filter(s => s.category === 'Video Editing');
        return [...filtered, { name: 'Other (Video Editing)', category: 'Video Editing', description: 'Custom VFX or video editing requests not listed above.' } as Service];
    }, [allServices]);

    const toggleService = (name: string) => {
        setSelectedServices(prev => 
            prev.includes(name) ? prev.filter(s => s !== name) : [...prev, name]
        );
    };

    const handleProceed = () => {
        if (selectedServices.length === 0) return;

        const serviceList = selectedServices.join(', ');
        const message = `Hello Fuad Ahmed, I am interested in your services: ${serviceList}. Please let me know the details and pricing for these.`;
        const encodedMessage = encodeURIComponent(message);
        const subject = encodeURIComponent("Project Inquiry - Fuad Editing Zone");

        if (platform === 'whatsapp') {
            window.open(`https://wa.me/${siteConfig.branding.whatsAppNumber}?text=${encodedMessage}`, '_blank');
        } else {
            // Force browser-based Gmail composer instead of default system mail client
            const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${siteConfig.branding.email}&su=${subject}&body=${encodedMessage}`;
            window.open(gmailUrl, '_blank');
        }
        onClose();
    };

    const ServiceButton: React.FC<{ service: Service }> = ({ service }) => {
        const isSelected = selectedServices.includes(service.name);
        const isPro = proServices.includes(service.name);
        return (
            <button
                onClick={() => toggleService(service.name)}
                className={`text-left p-5 rounded-xl border transition-all duration-300 group flex flex-col ${
                    isSelected
                        ? 'bg-red-600/30 border-red-600 text-white shadow-[0_0_15px_rgba(220,38,38,0.15)]'
                        : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/30 hover:bg-white/10'
                }`}
            >
                <div className="flex justify-between items-center w-full">
                    <div className="flex items-center gap-2 pr-3 min-w-0">
                        <span className="font-bold text-xs md:text-sm leading-snug uppercase tracking-normal truncate">
                            {service.name}
                        </span>
                        {isPro && (
                            <span className="bg-red-600 text-white text-[7px] md:text-[8px] px-1 py-0 rounded-sm font-black ring-1 ring-white/20 flex-shrink-0">PRO</span>
                        )}
                    </div>
                    <div className={`w-4 h-4 rounded-full border-2 transition-colors flex-shrink-0 ${
                        isSelected
                            ? 'bg-red-600 border-red-600'
                            : 'border-white/20'
                    }`}></div>
                </div>
                {isSelected && service.description && (
                    <div className="mt-4 pt-4 border-t border-white/5 animate-fade-in w-full">
                        <p className="text-[11px] md:text-xs text-gray-400 leading-relaxed font-light lowercase">
                            {service.description}
                        </p>
                    </div>
                )}
            </button>
        );
    };

    return (
        <div 
            className="fixed inset-0 bg-black z-[999] flex items-center justify-center p-4 animate-fade-in"
            onClick={onClose}
        >
            <div 
                className="bg-black border border-white/20 w-full max-w-md md:max-w-3xl h-auto max-h-[90vh] flex flex-col shadow-[0_0_100px_rgba(0,0,0,1)] animate-popup-scale-in overflow-hidden rounded-2xl"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-6 border-b border-white/10 flex justify-between items-center bg-black flex-shrink-0">
                    <div className="pr-4">
                        <h2 className="text-xl md:text-2xl font-bold text-white uppercase tracking-tighter truncate">Select Services</h2>
                        <p className="text-gray-500 text-[10px] md:text-xs mt-0.5 uppercase tracking-widest font-bold">Fuad Editing Zone</p>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-gray-400 transition-colors flex-shrink-0"
                    >
                        <CloseIcon className="w-5 h-5 md:w-6 md:h-6" />
                    </button>
                </div>

                {/* Selection Area */}
                <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-10 bg-black custom-scrollbar">
                    {/* Graphic Design Section */}
                    <div>
                        <h3 className="text-red-600 text-[10px] md:text-xs font-bold uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                            <span className="w-10 h-px bg-red-600/30"></span>
                            Graphic Design
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-1">
                            {graphicServices.map(service => (
                                <ServiceButton key={service.name} service={service} />
                            ))}
                        </div>
                    </div>

                    {/* VFX Section */}
                    <div>
                        <h3 className="text-red-600 text-[10px] md:text-xs font-bold uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                            <span className="w-10 h-px bg-red-600/30"></span>
                            VFX & Video Editing
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-1">
                            {vfxServices.map(service => (
                                <ServiceButton key={service.name} service={service} />
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 bg-black border-t border-white/10 flex-shrink-0">
                    <button 
                        disabled={selectedServices.length === 0}
                        onClick={handleProceed}
                        className={`w-full btn-angular btn-3d flex items-center justify-center gap-3 py-4 font-bold uppercase tracking-widest text-[11px] md:text-xs transition-all duration-300 ${
                            selectedServices.length > 0
                                ? 'bg-red-600 text-white hover:bg-red-700 shadow-[0_10px_25px_rgba(220,38,38,0.4)]'
                                : 'bg-gray-900 text-gray-600 cursor-not-allowed border border-white/5'
                        }`}
                    >
                        {platform === 'whatsapp' ? (
                            <WhatsAppIcon className="w-5 h-5" />
                        ) : (
                            <EmailIcon className="w-5 h-5" />
                        )}
                        <span>Checkout via {platform === 'whatsapp' ? 'WhatsApp' : 'Email'}</span>
                        <ChevronRightIcon className="w-4 h-4" />
                    </button>
                    
                    <div className="mt-4 flex justify-between items-center px-1">
                         <span className="text-[10px] md:text-xs text-gray-400 uppercase tracking-widest font-black text-center w-full">
                            {selectedServices.length} ITEMS SELECTED • CINEMATIC EXCELLENCE GUARANTEED
                         </span>
                    </div>
                </div>
            </div>
        </div>
    );
};
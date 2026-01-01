import React from 'react';
import { siteConfig } from '../config';
import { InteractiveCard } from './InteractiveCard';
import { CheckCircleIcon } from './Icons';

export const IntroCard = () => {
    const { introCard } = siteConfig.content;
    const { branding } = siteConfig;
    const proSkills = ['VFX Mastery', 'Graphic Design', 'YouTube Thumbnail', 'Photo Manipulation', 'Banner Designs', 'Social Media Post', 'AMV EDIT'];

    const sortedAboutSkills = [...introCard.skills].sort((a, b) => {
        const aIsPro = proSkills.includes(a);
        const bIsPro = proSkills.includes(b);
        if (aIsPro && !bIsPro) return -1;
        if (!aIsPro && bIsPro) return 1;
        return 0;
    });

    return (
        <section id="about" className="py-16 md:py-24 relative overflow-visible">
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1/3 h-2/3 opacity-5 pointer-events-none blur-3xl overflow-hidden hidden lg:block">
                <img src={branding.profilePicUrl} alt="" className="w-full h-full object-cover object-top scale-150 rotate-12" />
            </div>

            <div className="container mx-auto px-6 relative z-10">
                <InteractiveCard className="relative w-full max-w-5xl mx-auto bg-gradient-to-br from-zinc-900/80 to-black/90 backdrop-blur-2xl rounded-[1.5rem] md:rounded-[2rem] border border-white/10 p-6 md:p-16 shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-visible">
                    <div className="flex flex-col md:flex-row items-center gap-8 md:gap-16">
                        <div className="relative flex-shrink-0 group">
                            <div className="relative w-36 h-36 md:w-64 md:h-64 rounded-xl md:rounded-2xl overflow-hidden border-2 border-white/30 shadow-2xl transition-transform duration-500 group-hover:scale-[1.02] z-10">
                                <img 
                                    src={branding.profilePicUrl} 
                                    alt={introCard.title} 
                                    className="w-full h-full object-cover object-top" 
                                />
                            </div>
                            <div className="absolute -inset-3 md:-inset-4 rounded-2xl md:rounded-3xl ring-1 ring-red-600/20 animate-pulse pointer-events-none z-0"></div>
                            <div className="absolute -inset-6 md:-inset-8 rounded-[2rem] md:rounded-[2.5rem] ring-1 ring-white/5 animate-float-3d pointer-events-none z-0" style={{ animationDuration: '15s' }}></div>

                            <div className="absolute -bottom-2 -right-2 md:-bottom-4 md:-right-4 bg-red-600 text-white p-1.5 md:p-2.5 rounded-lg md:rounded-xl shadow-2xl flex items-center gap-1.5 border border-white/20 z-20">
                                <CheckCircleIcon className="w-3.5 h-3.5 md:w-5 md:h-5" />
                                <span className="text-[8px] md:text-[10px] font-bold uppercase tracking-widest pr-1">Professional</span>
                            </div>
                        </div>

                        <div className="text-center md:text-left flex-1">
                            <div className="inline-block px-2.5 py-0.5 md:px-3 md:py-1 bg-red-600/10 border border-red-600/20 rounded-md md:rounded-lg mb-3 md:mb-4">
                                <span className="text-[10px] md:text-xs font-bold text-red-500 uppercase tracking-[0.3em]">Fuad Ahmed</span>
                            </div>
                            <h3 className="text-2xl md:text-5xl font-bold text-white mb-1 md:mb-2 tracking-tight">
                                Meet the Artist
                            </h3>
                            <p className="text-base md:text-xl text-zinc-400 font-medium mb-4 md:mb-6 italic">
                                "Creating high-impact visuals since 2020."
                            </p>
                            
                            <div className="w-full h-px bg-gradient-to-r from-red-600/50 via-white/10 to-transparent mb-6 md:mb-8"></div>
                            
                            <p className="text-zinc-300 text-sm md:text-lg leading-relaxed max-w-2xl break-keep hyphens-none mb-6 md:mb-8 font-light">
                                I specialize in cinematic video editing and professional graphic design. My goal is to bring a premium, high-quality look to every project I touch, whether it's a YouTube thumbnail or a full-scale VFX animation.
                            </p>
                            
                            <div className="flex flex-wrap justify-center md:justify-start gap-2 md:gap-3">
                                {sortedAboutSkills.map(skill => (
                                    <span 
                                        key={skill}
                                        className="flex items-center bg-white/5 border border-white/10 text-zinc-300 text-[9px] md:text-xs font-bold px-3 py-1.5 md:px-5 md:py-2 rounded-lg transition-all duration-300 cursor-default hover:bg-red-600 hover:text-white hover:border-red-600"
                                    >
                                        {skill}
                                        {proSkills.includes(skill) && (
                                            <span className="ml-1.5 bg-red-600 text-white text-[7px] md:text-[9px] px-1 py-0 rounded-sm font-black ring-1 ring-white/20">PRO</span>
                                        )}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                </InteractiveCard>
            </div>
        </section>
    );
};

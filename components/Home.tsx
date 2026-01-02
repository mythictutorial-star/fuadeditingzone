import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { siteConfig } from '../config';
import { ThreeDotsIcon, CheckCircleIcon, YouTubeIcon, SparklesIcon } from './Icons';
import { useYouTubeChannelStats } from '../hooks/useYouTubeChannelStats';
import { useAnimatedCounter } from '../hooks/useAnimatedCounter';
import { useParallax } from '../contexts/ParallaxContext';

const AnimatedDigit: React.FC<{ digit: string }> = React.memo(({ digit }) => {
    const d = parseInt(digit, 10);
    const h = 1.4; 
    const y = -d * h; 

    return (
        <span className="inline-block w-[0.75em] h-[1.4em] overflow-hidden align-bottom leading-[1.4]">
            <span 
                className="inline-block transition-transform duration-1000 ease-[cubic-bezier(0.16,1,0.3,1)] w-full text-center"
                style={{ transform: `translateY(${y}em)`, willChange: 'transform' }}
            >
                {[...Array(10)].map((_, i) => (
                    <span key={i} className="block h-[1.4em]">{i}</span>
                ))}
            </span>
        </span>
    );
});

const StretchyCounter: React.FC<{ value: number }> = ({ value }) => {
    const formatted = new Intl.NumberFormat('en-US').format(value);
    
    return (
        <span className="flex items-center justify-center tabular-nums">
            {formatted.split('').map((char, index) => {
                if (/\d/.test(char)) {
                    return <AnimatedDigit key={`${char}-${index}`} digit={char} />;
                }
                return <span key={index} className="w-[0.45em] inline-block text-center">{char}</span>;
            })}
        </span>
    );
};

interface HomeProps {
  onOpenServices: () => void;
  onOrderNow: () => void;
  onYouTubeClick?: () => void;
}

export const Home: React.FC<HomeProps> = ({ 
    onOpenServices, 
    onOrderNow,
    onYouTubeClick
}) => {
    const { stats, loading } = useYouTubeChannelStats();
    const { x, y } = useParallax();
    const [parallaxEnabled, setParallaxEnabled] = useState(false);
    const [isImageLoaded, setIsImageLoaded] = useState(false);
    
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setRefreshTrigger(prev => prev + 1);
        }, 30000);
        return () => clearInterval(interval);
    }, []);
    
    const animatedSubs = useAnimatedCounter(stats.subscribers, 5000, refreshTrigger);
    const animatedViews = useAnimatedCounter(stats.views, 5000, refreshTrigger);
    
    useEffect(() => {
        const timer = setTimeout(() => setParallaxEnabled(true), 1500);
        return () => clearTimeout(timer);
    }, []);

    const proSkills = ['VFX Mastery', 'YouTube Thumbnail', 'Photo Manipulation', 'Banner Designs', 'Social Media Post', 'AMV EDIT', 'Graphic Design'];
    const sortedHeroSkills = [...siteConfig.content.introCard.skills].sort((a, b) => {
        const aIsPro = proSkills.includes(a);
        const bIsPro = proSkills.includes(b);
        if (aIsPro && !bIsPro) return -1;
        if (!aIsPro && bIsPro) return 1;
        return 0;
    }).slice(0, 4);

    const headlineStyle = {
        transform: parallaxEnabled 
            ? `perspective(1200px) rotateX(${y * -0.6}deg) rotateY(${x * 0.6}deg)` 
            : 'perspective(1200px) rotateX(0deg) rotateY(0deg)',
        transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        willChange: 'transform',
        backfaceVisibility: 'hidden' as const
    };

    return (
        <section 
            id="home" 
            className="min-h-[100dvh] w-full flex flex-col items-center justify-center relative select-none overflow-hidden bg-black py-8 px-6 md:px-12"
        >
            <div className="absolute inset-0 z-0 bg-black"></div>

            <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={isImageLoaded ? { opacity: 1, y: 0 } : { opacity: 0 }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                className="relative z-30 w-full text-center flex flex-col items-center max-w-3xl" 
                style={headlineStyle}
            >
                <div className="relative flex flex-col md:flex-row items-center justify-center mb-4 md:mb-5 gap-3 md:gap-6">
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={isImageLoaded ? { opacity: 1, scale: 1 } : { opacity: 0 }}
                        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
                        className="relative group flex-shrink-0 z-40"
                    >
                        <div className="absolute -inset-2 bg-red-600/5 rounded-full blur-xl animate-pulse"></div>
                        <div className="relative w-16 h-16 md:w-24 md:h-24 rounded-full overflow-hidden border border-white/10 bg-black shadow-xl ring-1 ring-white/5">
                            <motion.img 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                src={siteConfig.branding.profilePicUrl} 
                                alt="Fuad Ahmed" 
                                onLoad={() => setIsImageLoaded(true)}
                                className="w-full h-full object-cover object-top origin-top transition-all duration-700" 
                            />
                        </div>
                        <div className="absolute -bottom-0.5 -right-0.5 bg-red-600 text-white p-0.5 rounded-full shadow-lg border border-white/20 z-50">
                            <CheckCircleIcon className="w-2 md:w-3 text-white" />
                        </div>
                    </motion.div>

                    <div className="flex flex-col items-center md:items-start leading-none z-10 min-w-0">
                        <motion.h1 
                            initial={{ opacity: 0, x: 15 }}
                            animate={isImageLoaded ? { opacity: 1, x: 0 } : { opacity: 0 }}
                            transition={{ duration: 0.8, delay: 0.3 }}
                            className="font-black text-white tracking-tighter uppercase m-0 p-0 font-display flex flex-col items-center md:items-start"
                        >
                            <span className="text-2xl sm:text-4xl md:text-[2.8rem] block -mb-[0.02em] relative leading-[0.8] opacity-90 whitespace-nowrap">FUAD</span>
                            <span className="text-2xl sm:text-4xl md:text-[2.8rem] block text-red-600 relative leading-[0.8] opacity-100 whitespace-nowrap">AHMED</span>
                        </motion.h1>
                    </div>
                </div>

                <div className="flex flex-wrap justify-center items-center gap-1.5 mb-4 md:mb-6 px-2 max-w-2xl">
                    {sortedHeroSkills.map((skill, i) => (
                        <motion.span 
                            key={skill}
                            initial={{ opacity: 0, y: 5 }}
                            animate={isImageLoaded ? { opacity: 1, y: 0 } : { opacity: 0 }}
                            transition={{ delay: 0.5 + (0.05 * i), duration: 0.3 }}
                            className="flex items-center bg-white/5 border border-white/10 rounded-md px-2.5 py-1 text-[7px] md:text-[9px] font-bold text-zinc-300 uppercase tracking-widest hover:text-white transition-colors whitespace-nowrap"
                        >
                            {skill}
                            {proSkills.includes(skill) && (
                                <span className="ml-1 md:ml-1.5 bg-red-600 text-white text-[5px] md:text-[7px] px-1 py-0 rounded-sm font-black ring-1 ring-white/10">PRO</span>
                            )}
                        </motion.span>
                    ))}
                    <motion.button 
                        initial={{ opacity: 0 }}
                        animate={isImageLoaded ? { opacity: 1 } : { opacity: 0 }}
                        transition={{ delay: 0.8 }}
                        onClick={(e) => { e.stopPropagation(); onOpenServices(); }}
                        className="w-6 h-6 md:w-8 md:h-8 flex items-center justify-center bg-white/5 hover:bg-red-600 border border-white/10 rounded-md transition-all"
                    >
                        <ThreeDotsIcon className="w-3 md:w-3.5 text-white" />
                    </motion.button>
                </div>

                <div className="flex flex-col md:flex-row items-center gap-4 md:gap-8 w-full justify-center">
                    <motion.button 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={isImageLoaded ? { opacity: 1, scale: 1 } : { opacity: 0 }}
                        transition={{ delay: 0.9, duration: 0.6 }}
                        onClick={(e) => { e.stopPropagation(); onOrderNow(); }}
                        className="relative bg-white text-black text-[9px] font-black px-8 py-3 rounded-full hover:scale-105 active:scale-95 transition-all shadow-lg uppercase tracking-[0.2em] flex-shrink-0"
                    >
                        Get a Quote
                    </motion.button>
                    
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={isImageLoaded ? { opacity: 1 } : { opacity: 0 }}
                        transition={{ delay: 1.1, duration: 0.8 }}
                        className="flex items-center gap-4 sm:gap-8 px-2"
                    >
                        <div className="text-left cursor-pointer flex-shrink-0" onClick={onYouTubeClick}>
                            <div className="flex items-center gap-1.5 mb-0.5">
                                <div className="text-xl sm:text-2xl md:text-3xl font-black text-white leading-none font-display">
                                    {loading ? '---' : <StretchyCounter value={animatedSubs} />}
                                </div>
                                <div className="w-1 h-1 bg-red-600 rounded-full animate-pulse"></div>
                            </div>
                            <span className="text-[7px] md:text-[8px] text-zinc-500 font-black uppercase tracking-[0.15em] whitespace-nowrap">Followers</span>
                        </div>

                        <div className="text-left border-l border-white/10 pl-4 sm:pl-8 cursor-pointer flex-shrink-0" onClick={onYouTubeClick}>
                            <div className="flex items-center gap-1.5 mb-0.5">
                                <div className="text-xl sm:text-2xl md:text-3xl font-black text-white leading-none font-display">
                                    {loading ? '---' : <StretchyCounter value={animatedViews} />}
                                </div>
                                <YouTubeIcon className="w-3 md:w-4 text-red-600 opacity-60" />
                            </div>
                            <span className="text-[7px] md:text-[8px] text-zinc-500 font-black uppercase tracking-[0.15em] whitespace-nowrap">Reach</span>
                        </div>
                    </motion.div>
                </div>
            </motion.div>
        </section>
    );
};
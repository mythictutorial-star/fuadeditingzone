import React from 'react';
import { siteConfig } from '../config';
import { IntroCard } from './IntroCard';

export const AboutAndFooter: React.FC = () => {
    return (
        <div className="relative z-10 select-none">
            
            <IntroCard />
            
            <footer id="footer" className="bg-black/30">
                <div className="container mx-auto px-6 text-center text-gray-400 py-16">
                    
                    <div className="border-t border-white/10 pt-10">
                        <p className="text-sm">&copy; {new Date().getFullYear()} Designed & Developed by {siteConfig.branding.author}</p>
                        
                        <div className="mt-6 text-xs flex flex-col justify-center items-center gap-2 text-gray-500">
                             <div className="flex flex-wrap justify-center items-center gap-x-4 gap-y-2">
                                <span className="font-semibold">Powered by:</span>
                                <a href="https://aistudio.google.com/" target="_blank" rel="noopener noreferrer" className="hover:text-red-500 transition-colors">AI Studio</a>
                                <a href="https://github.com/" target="_blank" rel="noopener noreferrer" className="hover:text-red-500 transition-colors">GitHub</a>
                                <a href="https://www.cloudflare.com/" target="_blank" rel="noopener noreferrer" className="hover:text-red-500 transition-colors">Cloudflare</a>
                            </div>
                            <div className="flex flex-wrap justify-center items-center gap-x-4 gap-y-2 mt-4">
                               <a href="https://www.freeprivacypolicy.com/live/7c5660d5-a851-4105-b7f7-ee7d4f9bf494" target="_blank" rel="noopener noreferrer" className="hover:text-red-500 transition-colors">Privacy Policy</a>
                            </div>
                       </div>
                    </div>
                </div>
            </footer>
        </div>
    );
};

import React, { useState, useEffect, useMemo } from 'react';
import { CheckCircleIcon, SearchIcon } from './Icons';

interface LanguagePreferenceModalProps {
  onSelectLanguage: (language: string) => void;
  currentLanguage: string;
}

const ALL_LANGUAGES = [
    { code: 'Auto', name: 'Auto Detect' },
    { code: 'English', name: 'English' },
    { code: 'Urdu', name: 'اردو (Urdu)' },
    { code: 'Hindi', name: 'हिन्दी (Hindi)' },
    { code: 'Bangla', name: 'বাংলা (Bangla)' },
    { code: 'Arabic', name: 'العربية (Arabic)' },
    { code: 'Spanish', name: 'Español (Spanish)' },
    { code: 'French', name: 'Français (French)' },
    { code: 'German', name: 'Deutsch (German)' },
    { code: 'Japanese', name: '日本語 (Japanese)' },
    { code: 'Korean', name: '한국어 (Korean)' },
    { code: 'Chinese', name: '中文 (Chinese)' },
    { code: 'Russian', name: 'Русский (Russian)' },
    { code: 'Portuguese', name: 'Português (Portuguese)' },
    { code: 'Italian', name: 'Italiano (Italian)' },
    { code: 'Turkish', name: 'Türkçe (Turkish)' },
    { code: 'Indonesian', name: 'Bahasa Indonesia (Indonesian)' },
    { code: 'Vietnamese', name: 'Tiếng Việt (Vietnamese)' },
    { code: 'Thai', name: 'ไทย (Thai)' },
];

export const LanguagePreferenceModal: React.FC<LanguagePreferenceModalProps> = ({ onSelectLanguage, currentLanguage }) => {
    const [selectedLanguage, setSelectedLanguage] = useState(currentLanguage);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
             if (e.key === 'Escape') e.preventDefault();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const handleConfirm = () => {
        onSelectLanguage(selectedLanguage);
    };

    const filteredLanguages = useMemo(() => ALL_LANGUAGES.filter(lang => 
        lang.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        lang.code.toLowerCase().includes(searchQuery.toLowerCase())
    ), [searchQuery]);

    const LanguageButton: React.FC<{ lang: { code: string; name: string } }> = ({ lang }) => {
        const isSelected = selectedLanguage === lang.code;
        return (
            <button
                onClick={() => setSelectedLanguage(lang.code)}
                className={`relative w-full text-left p-4 rounded-lg transition-all duration-300 ${
                    isSelected
                        ? 'bg-red-500/20'
                        : 'bg-white/5 hover:bg-white/10'
                }`}
            >
                <span className="font-bold text-white">{lang.name}</span>
                {lang.code === 'Auto' && <p className="text-xs text-gray-400 mt-1">Switches language based on your messages.</p>}
                {isSelected && <CheckCircleIcon className="absolute top-1/2 -translate-y-1/2 right-4 w-6 h-6 text-red-500" />}
            </button>
        );
    };

    return (
        <div role="dialog" aria-modal="true" className="fixed inset-0 bg-black/80 backdrop-blur-md z-[70] flex items-center justify-center animate-fade-in p-4">
            <div
                className="relative bg-black rounded-xl w-full max-w-md flex flex-col p-8 max-h-[90vh]"
                style={{ animation: 'fade-in-scale 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards' }}
                onClick={e => e.stopPropagation()}
            >
                <div className="text-center mb-6 flex-shrink-0">
                    <h2 className="text-3xl font-bold text-gradient-white-gray mb-2">Choose a Language</h2>
                    <p className="text-gray-400">How should I speak with you?</p>
                </div>

                <div className="relative mb-6 flex-shrink-0">
                    <input
                        type="search"
                        placeholder="Search for any language..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-black/30 border-none rounded-full pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 bg-white/5"
                    />
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500">
                        <SearchIcon className="w-5 h-5" />
                    </div>
                </div>

                <div className="space-y-3 mb-6 overflow-y-auto flex-grow pr-2">
                    {filteredLanguages.map(lang => (
                        <LanguageButton key={lang.code} lang={lang} />
                    ))}
                    {filteredLanguages.length === 0 && (
                        <p className="text-center text-gray-400 py-4">No languages found.</p>
                    )}
                </div>

                {/* Angular Shape */}
                <button
                    onClick={handleConfirm}
                    className="btn-angular w-full bg-red-600 text-white font-bold py-4 px-4 transition-all duration-300 hover:bg-red-700 transform hover:scale-105 focus:outline-none flex-shrink-0"
                >
                    Let's Talk
                </button>
            </div>
        </div>
    );
};
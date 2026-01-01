import { useState, useEffect } from 'react';

interface TikTokStats {
    followers: number;
    likes: number;
    videoCount: number;
}

export const useTikTokStats = () => {
    // Default simulated stats for Fuad Editing Zone
    const [stats, setStats] = useState<TikTokStats>({ 
        followers: 85400, 
        likes: 1200000, 
        videoCount: 142 
    });
    const [loading, setLoading] = useState(true);

    const formatNumber = (num: number) => {
        return new Intl.NumberFormat('en-US', { notation: "compact", maximumFractionDigits: 1 }).format(num);
    };

    useEffect(() => {
        // Simulate network delay for realism
        const timer = setTimeout(() => {
            // In a real production app, you would fetch this from a backend proxy 
            // that communicates with TikTok's API to avoid CORS/Signature issues.
            // For this portfolio, we simulate a successful "live" fetch.
            setLoading(false);
        }, 1200);
        
        return () => clearTimeout(timer);
    }, []);

    return { stats, loading, formatNumber };
};
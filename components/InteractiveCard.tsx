import React, { useRef } from 'react';

export const InteractiveCard: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => {
    const cardRef = useRef<HTMLDivElement>(null);

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        const card = cardRef.current;
        if (!card) return;

        const { left, top, width, height } = card.getBoundingClientRect();
        const x = e.clientX - left;
        const y = e.clientY - top;

        const rotateX = -((y - height / 2) / (height / 2)) * 8; // Max rotation 8 degrees
        const rotateY = ((x - width / 2) / (width / 2)) * 8;

        // Using scale3d and backface-visibility for sharper rendering
        card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.03, 1.03, 1.03)`;
        
        const glare = card.querySelector('.glare') as HTMLElement;
        if (glare) {
            glare.style.opacity = '1';
            glare.style.background = `radial-gradient(circle at ${x}px ${y}px, rgba(255,255,255,0.4), rgba(255,255,255,0) 50%)`;
        }
    };

    const handleMouseLeave = () => {
        const card = cardRef.current;
        if (!card) return;
        card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
        const glare = card.querySelector('.glare') as HTMLElement;
        if (glare) glare.style.opacity = '0';
    };

    return (
        <div 
            ref={cardRef}
            className={`interactive-3d-card ${className || ''}`}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            style={{ 
                backfaceVisibility: 'hidden', 
                WebkitBackfaceVisibility: 'hidden',
                transformStyle: 'preserve-3d',
                willChange: 'transform'
            }}
        >
            {children}
            <div className="glare pointer-events-none"></div>
        </div>
    );
};
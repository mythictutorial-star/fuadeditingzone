import React, { useRef, useEffect } from 'react';
import { siteConfig } from '../config';

export const CustomCursor: React.FC<{ isVisible: boolean }> = ({ isVisible }) => {
    const cursorRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        const cursorEl = cursorRef.current;

        if (isTouchDevice || !cursorEl) {
            if (cursorEl) cursorEl.style.display = 'none';
            return;
        }

        let animationFrameId: number;
        const lastPosition = { x: -100, y: -100 }; // Start off-screen

        const onMouseMove = (e: MouseEvent) => {
            lastPosition.x = e.clientX;
            lastPosition.y = e.clientY;
        };

        const renderLoop = () => {
            if (cursorEl) {
                cursorEl.style.transform = `translate3d(${lastPosition.x}px, ${lastPosition.y}px, 0)`;
            }
            animationFrameId = requestAnimationFrame(renderLoop);
        };

        window.addEventListener('mousemove', onMouseMove, { passive: true });
        renderLoop();

        return () => {
            cancelAnimationFrame(animationFrameId);
            window.removeEventListener('mousemove', onMouseMove);
        };
    }, []);

    return (
        <div ref={cursorRef} className={`custom-cursor ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
            <img src={siteConfig.branding.logoUrl} alt="cursor" className="cursor-logo" />
        </div>
    );
};
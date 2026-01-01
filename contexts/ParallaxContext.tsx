import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';

interface ParallaxContextType {
    x: number;
    y: number;
}

const ParallaxContext = createContext<ParallaxContextType>({ x: 0, y: 0 });

export const useParallax = () => useContext(ParallaxContext);

interface ParallaxProviderProps {
    children: ReactNode;
}

export const ParallaxProvider: React.FC<ParallaxProviderProps> = ({ children }) => {
    const [parallaxState, setParallaxState] = useState({ x: 0, y: 0 });
    const targetPosition = useRef({ x: 0, y: 0 });
    const animationFrameId = useRef<number | null>(null);

    useEffect(() => {
        const handleMouseMove = (event: MouseEvent) => {
            const { clientX, clientY } = event;
            const x = (clientX / window.innerWidth) * 2 - 1;
            const y = (clientY / window.innerHeight) * 2 - 1;
            targetPosition.current = { x, y };
        };

        const handleDeviceOrientation = (event: DeviceOrientationEvent) => {
            if (event.gamma !== null && event.beta !== null) {
                const x = Math.min(Math.max(event.gamma / 45, -1), 1);
                const y = Math.min(Math.max((event.beta - 45) / 45, -1), 1);
                targetPosition.current = { x, y };
            }
        };

        const isTouchDevice = 'ontouchstart' in window;
        if (isTouchDevice) {
            window.addEventListener('deviceorientation', handleDeviceOrientation);
        } else {
            window.addEventListener('mousemove', handleMouseMove);
        }

        const animate = () => {
            setParallaxState(current => {
                const newX = current.x + (targetPosition.current.x - current.x) * 0.1; // Lerp for smoothness
                const newY = current.y + (targetPosition.current.y - current.y) * 0.1;
                return { x: newX, y: newY };
            });
            animationFrameId.current = requestAnimationFrame(animate);
        };

        animate();

        return () => {
            if (isTouchDevice) {
                window.removeEventListener('deviceorientation', handleDeviceOrientation);
            } else {
                window.removeEventListener('mousemove', handleMouseMove);
            }
            if (animationFrameId.current !== null) {
                cancelAnimationFrame(animationFrameId.current);
            }
        };
    }, []);

    return (
        <ParallaxContext.Provider value={parallaxState}>
            {children}
        </ParallaxContext.Provider>
    );
};
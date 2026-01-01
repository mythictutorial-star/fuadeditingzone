import React, { useRef, useEffect, useState } from 'react';
import { GalleryIcon, CloseIcon } from './Icons';

interface ContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  onGalleryOpen: () => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, onClose, onGalleryOpen }) => {
    const menuRef = useRef<HTMLDivElement>(null);
    const [position, setPosition] = useState({ x, y, opacity: 0 });

    useEffect(() => {
        if (menuRef.current) {
            const { innerWidth, innerHeight } = window;
            const { offsetWidth, offsetHeight } = menuRef.current;
            let newX = x;
            let newY = y;
            if (x + offsetWidth > innerWidth - 10) {
                newX = x - offsetWidth;
            }
            if (y + offsetHeight > innerHeight - 10) {
                newY = y - offsetHeight;
            }
            setPosition({ x: newX, y: newY, opacity: 1 });
        }
    }, [x, y]);

    return (
        <div
            ref={menuRef}
            className="fixed z-[9999] w-64 bg-gray-900/90 backdrop-blur-xl rounded-lg shadow-2xl shadow-black/50 overflow-hidden"
            style={{ 
                top: `${position.y}px`, 
                left: `${position.x}px`,
                opacity: position.opacity,
                animation: 'fade-in-scale 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards'
            }}
            onClick={e => e.stopPropagation()}
            onContextMenu={e => {
                e.preventDefault();
                onClose();
            }}
        >
            <div className="p-2 space-y-1">
                <button
                    onClick={onGalleryOpen}
                    className="group w-full flex items-center text-left px-3 py-2 text-sm text-gray-200 rounded-md hover:bg-red-500/20 hover:text-white transition-all duration-200 focus:outline-none focus-visible:bg-red-500/20 focus-visible:text-white"
                >
                    <GalleryIcon className="w-5 h-5 mr-3 text-gray-400 group-hover:text-red-400 transition-colors" />
                    <span>View Works Gallery</span>
                </button>
            </div>
            <div className="border-t border-gray-700/50 p-2">
                 <button
                    onClick={onClose}
                    className="group w-full flex items-center text-left px-3 py-2 text-sm text-gray-400 rounded-md hover:bg-white/10 hover:text-gray-200 transition-all duration-200 focus:outline-none focus-visible:bg-white/10 focus-visible:text-gray-200"
                >
                    <CloseIcon className="w-5 h-5 mr-3 text-gray-500 group-hover:text-gray-400 transition-colors" />
                    <span>Close Menu</span>
                </button>
            </div>
        </div>
    );
};
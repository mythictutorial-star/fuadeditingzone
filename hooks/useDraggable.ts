import { useRef, useEffect, useState, useCallback, RefObject } from 'react';

export const useDraggable = (handleRef: RefObject<HTMLElement>) => {
    const dragRef = useRef<HTMLDivElement>(null);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const isDraggingRef = useRef(false);
    const dragStartPos = useRef({ x: 0, y: 0 });
    const elementStartPos = useRef({ x: 0, y: 0 });
    const untransformedPos = useRef({ left: 0, top: 0 });
    const elementRect = useRef({ width: 0, height: 0 });

    const onPointerMove = useCallback((e: PointerEvent) => {
        if (!isDraggingRef.current || !dragRef.current) return;
        e.preventDefault();

        const deltaX = e.clientX - dragStartPos.current.x;
        const deltaY = e.clientY - dragStartPos.current.y;

        let newX = elementStartPos.current.x + deltaX;
        let newY = elementStartPos.current.y + deltaY;

        // Calculate element's potential on-screen position based on its untransformed state and new translation
        const potentialLeft = untransformedPos.current.left + newX;
        const potentialTop = untransformedPos.current.top + newY;
        
        const { innerWidth, innerHeight } = window;
        const { width, height } = elementRect.current;

        // Add a margin to prevent the element from being dragged completely off-screen, ensuring controls are accessible.
        const margin = 16;
        const clampedLeft = Math.max(margin, Math.min(potentialLeft, innerWidth - width - margin));
        const clampedTop = Math.max(margin, Math.min(potentialTop, innerHeight - height - margin));

        // Convert the clamped on-screen position back to a translate value
        newX = clampedLeft - untransformedPos.current.left;
        newY = clampedTop - untransformedPos.current.top;

        setPosition({ x: newX, y: newY });
    }, []);

    const onPointerUp = useCallback(() => {
        if (isDraggingRef.current) {
            isDraggingRef.current = false;
            setIsDragging(false);
            document.removeEventListener('pointermove', onPointerMove);
            document.removeEventListener('pointerup', onPointerUp);
        }
    }, [onPointerMove]);

    const onPointerDown = useCallback((e: PointerEvent) => {
        if (!handleRef.current || !handleRef.current.contains(e.target as Node) || !dragRef.current) {
            return;
        }
        
        const targetEl = e.target as HTMLElement;
        if (targetEl.closest('button, a, input, textarea')) {
            return;
        }
        
        e.preventDefault();

        isDraggingRef.current = true;
        setIsDragging(true);
        dragStartPos.current = { x: e.clientX, y: e.clientY };
        elementStartPos.current = { ...position };

        const rect = dragRef.current.getBoundingClientRect();
        elementRect.current = { width: rect.width, height: rect.height };
        // This calculates the element's top-left corner as if it had no transform applied.
        untransformedPos.current = { left: rect.left - position.x, top: rect.top - position.y };
        
        document.addEventListener('pointermove', onPointerMove);
        document.addEventListener('pointerup', onPointerUp);
    }, [handleRef, position, onPointerMove, onPointerUp]);

    useEffect(() => {
        const handle = handleRef.current;
        if (handle) {
            handle.addEventListener('pointerdown', onPointerDown as EventListener);
            return () => {
                handle.removeEventListener('pointerdown', onPointerDown as EventListener);
                document.removeEventListener('pointermove', onPointerMove);
                document.removeEventListener('pointerup', onPointerUp);
            };
        }
    }, [handleRef, onPointerDown, onPointerMove, onPointerUp]);

    return { ref: dragRef, style: { transform: `translate(${position.x}px, ${position.y}px)` }, isDragging };
};
import { useState, useRef, useEffect } from 'react';

interface VerticalResizerProps {
    topMinHeight?: number;
    bottomMinHeight?: number;
    defaultTopHeight?: number;
    onResize?: (topHeight: number, bottomHeight: number) => void;
    containerRef?: React.RefObject<HTMLDivElement>;
}

/**
 * VerticalResizer Component
 * A thin horizontal divider that allows resizing of vertically stacked sections
 * 
 * Usage: Place between two sections in a flex column container
 */
export const VerticalResizer = ({
    topMinHeight = 150,
    bottomMinHeight = 150,
    defaultTopHeight,
    onResize,
    containerRef
}: VerticalResizerProps) => {
    const [isDragging, setIsDragging] = useState(false);
    const resizerRef = useRef<HTMLDivElement>(null);

    const handleMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isDragging || !containerRef?.current) return;

            const container = containerRef.current;
            const containerRect = container.getBoundingClientRect();
            const containerHeight = containerRect.height;
            
            // Calculate new top section height
            const newTopHeight = e.clientY - containerRect.top;
            const newBottomHeight = containerHeight - newTopHeight;

            // Check constraints
            if (newTopHeight >= topMinHeight && newBottomHeight >= bottomMinHeight) {
                // Calculate percentages
                const topPercent = (newTopHeight / containerHeight) * 100;
                const bottomPercent = (newBottomHeight / containerHeight) * 100;

                // Update the flex-basis of the sections
                const sections = container.querySelectorAll('.resizable-section');
                if (sections[0] && sections[1]) {
                    (sections[0] as HTMLElement).style.flex = `0 0 ${topPercent}%`;
                    (sections[1] as HTMLElement).style.flex = `0 0 ${bottomPercent}%`;
                }

                onResize?.(newTopHeight, newBottomHeight);
            }
        };

        const handleMouseUp = () => {
            setIsDragging(false);
        };

        if (isDragging) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = 'row-resize';
            document.body.style.userSelect = 'none';
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        };
    }, [isDragging, topMinHeight, bottomMinHeight, containerRef, onResize]);

    return (
        <div
            ref={resizerRef}
            className={`vertical-resizer ${isDragging ? 'dragging' : ''}`}
            onMouseDown={handleMouseDown}
            style={{
                height: '6px',
                cursor: 'row-resize',
                backgroundColor: isDragging ? 'var(--primary-color)' : 'transparent',
                borderTop: '1px solid var(--surface-border)',
                borderBottom: '1px solid var(--surface-border)',
                position: 'relative',
                zIndex: 10,
                transition: 'background-color 0.2s',
                flexShrink: 0
            }}
            onMouseEnter={(e) => {
                if (!isDragging) {
                    e.currentTarget.style.backgroundColor = 'var(--surface-border)';
                }
            }}
            onMouseLeave={(e) => {
                if (!isDragging) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                }
            }}
        >
            {/* Visual indicator */}
            <div
                style={{
                    position: 'absolute',
                    left: '50%',
                    top: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '40px',
                    height: '3px',
                    borderRadius: '2px',
                    backgroundColor: isDragging ? 'var(--primary-color)' : 'var(--surface-400)',
                    opacity: isDragging ? 1 : 0,
                    transition: 'opacity 0.2s'
                }}
            />
        </div>
    );
};

import { useState, useRef, useEffect } from 'react';
import { Button } from 'primereact/button';

interface ResizablePanelProps {
    children: React.ReactNode;
    minWidth?: number;
    maxWidth?: number;
    defaultWidth?: number;
    position?: 'left' | 'right';
    collapsible?: boolean;
    initialCollapsed?: boolean;
    collapsed?: boolean;  // ⭐ Controlled collapse state
    onCollapsedChange?: (collapsed: boolean) => void;  // ⭐ Callback when collapse changes
    onResize?: (width: number) => void;
    className?: string;
    style?: React.CSSProperties;
}

/**
 * ResizablePanel Component
 * A thin, collapsible, resizable panel component for creating flexible layouts
 * 
 * Features:
 * - Drag to resize with a thin border handle
 * - Click to collapse/expand
 * - Configurable min/max widths
 * - Smooth animations
 * - Works on left or right side
 */
export const ResizablePanel = ({ 
    children, 
    minWidth = 200, 
    maxWidth = 800, 
    defaultWidth = 300,
    position = 'left',
    collapsible = true,
    initialCollapsed = false,
    collapsed,
    onCollapsedChange,
    onResize,
    className = '',
    style = {}
}: ResizablePanelProps) => {
    const [width, setWidth] = useState(defaultWidth);
    const [internalCollapsed, setInternalCollapsed] = useState(initialCollapsed);
    const [isDragging, setIsDragging] = useState(false);
    const panelRef = useRef<HTMLDivElement>(null);
    const dragStartX = useRef<number>(0);
    const dragStartWidth = useRef<number>(0);

    // Use controlled state if provided, otherwise use internal state
    const isCollapsed = collapsed !== undefined ? collapsed : internalCollapsed;
    
    const toggleCollapse = () => {
        const newCollapsed = !isCollapsed;
        if (collapsed === undefined) {
            // Uncontrolled mode
            setInternalCollapsed(newCollapsed);
        }
        // Always call the callback if provided
        onCollapsedChange?.(newCollapsed);
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
        setIsDragging(true);
        dragStartX.current = e.clientX;
        dragStartWidth.current = width;
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isDragging) return;
            
            const delta = position === 'left' 
                ? e.clientX - dragStartX.current
                : dragStartX.current - e.clientX;
            
            const newWidth = Math.max(
                minWidth,
                Math.min(maxWidth, dragStartWidth.current + delta)
            );
            
            setWidth(newWidth);
            onResize?.(newWidth);
        };

        const handleMouseUp = () => {
            setIsDragging(false);
        };

        if (isDragging) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        };
    }, [isDragging, minWidth, maxWidth, position, onResize]);

    const collapsedWidth = 40;
    const currentWidth = isCollapsed ? collapsedWidth : width;

    return (
        <div 
            ref={panelRef}
            className={`resizable-panel ${isCollapsed ? 'collapsed' : ''} ${className}`}
            style={{
                width: `${currentWidth}px`,
                minWidth: `${isCollapsed ? collapsedWidth : minWidth}px`,
                maxWidth: `${isCollapsed ? collapsedWidth : maxWidth}px`,
                height: '100%',
                position: 'relative',
                overflow: 'hidden',
                transition: isCollapsed ? 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)' : 'none',
                display: 'flex',
                flexDirection: 'column',
                flexShrink: 0,
                ...style
            }}
        >
            {/* Content Container */}
            <div 
                style={{
                    flex: 1,
                    overflow: 'auto',
                    opacity: isCollapsed ? 0 : 1,
                    transition: 'opacity 0.2s',
                    pointerEvents: isCollapsed ? 'none' : 'auto'
                }}
            >
                {children}
            </div>
            
            {/* Resize Handle */}
            <div
                className="resize-handle"
                style={{
                    position: 'absolute',
                    [position === 'left' ? 'right' : 'left']: 0,
                    top: 0,
                    bottom: 0,
                    width: '6px',
                    cursor: 'col-resize',
                    backgroundColor: isDragging ? 'var(--primary-color)' : 'transparent',
                    zIndex: 100,
                    transition: 'background-color 0.2s',
                    transform: isDragging ? 'scaleX(1.5)' : 'scaleX(1)'
                }}
                onMouseDown={handleMouseDown}
                onMouseEnter={(e) => {
                    if (!isDragging && !isCollapsed) {
                        e.currentTarget.style.backgroundColor = 'var(--surface-border)';
                    }
                }}
                onMouseLeave={(e) => {
                    if (!isDragging) {
                        e.currentTarget.style.backgroundColor = 'transparent';
                    }
                }}
            >
                {/* Visual indicator for resize */}
                <div 
                    style={{
                        position: 'absolute',
                        [position === 'left' ? 'right' : 'left']: '1px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        width: '3px',
                        height: '40px',
                        borderRadius: '2px',
                        backgroundColor: isDragging ? 'var(--primary-color)' : 'var(--surface-400)',
                        opacity: isDragging ? 1 : 0,
                        transition: 'opacity 0.2s'
                    }}
                />
            </div>
            
            {/* Collapse/Expand Button */}
            {collapsible && (
                <Button
                    icon={isCollapsed 
                        ? (position === 'left' ? 'pi pi-chevron-right' : 'pi pi-chevron-left')
                        : (position === 'left' ? 'pi pi-chevron-left' : 'pi pi-chevron-right')
                    }
                    onClick={toggleCollapse}
                    className="p-button-text p-button-sm p-button-rounded"
                    tooltip={isCollapsed ? 'Expand panel' : 'Collapse panel'}
                    tooltipOptions={{ 
                        position: position === 'left' ? 'right' : 'left',
                        showDelay: 500
                    }}
                    style={{
                        position: 'absolute',
                        // ⭐ Position on the border edge
                        [position === 'left' ? 'right' : 'left']: isCollapsed ? '-14px' : '-14px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        zIndex: 101,
                        width: '28px',
                        height: '28px',
                        padding: '0',
                        minWidth: '28px',
                        backgroundColor: 'var(--surface-card)',
                        border: '1px solid var(--surface-border)',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                        transition: 'all 0.2s'
                    }}
                />
            )}

            {/* Collapsed State Label */}
            {isCollapsed && (
                <div
                    style={{
                        position: 'absolute',
                        top: '60px',
                        left: '50%',
                        transform: 'translateX(-50%) rotate(-90deg)',
                        transformOrigin: 'center',
                        fontSize: '0.75rem',
                        color: 'var(--text-color-secondary)',
                        whiteSpace: 'nowrap',
                        fontWeight: 500,
                        letterSpacing: '0.5px',
                        userSelect: 'none',
                        pointerEvents: 'none'
                    }}
                >
                    {position === 'left' ? 'LCML ELEMENTS' : 'PROPERTIES'}
                </div>
            )}
        </div>
    );
};
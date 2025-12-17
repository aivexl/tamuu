'use client';

/**
 * Enterprise-Grade Konva Canvas Component
 * 
 * This component uses Konva.js directly (not react-konva) to avoid SSR compatibility issues
 * with Next.js 15. It provides smooth, 60fps drag operations with zero errors.
 * 
 * Architecture:
 * - Uses Konva.js directly via refs and useEffect
 * - Fully client-side only rendering
 * - Proper cleanup and memory management
 * - Error boundaries and fallbacks
 * - Optimized image loading and caching with CORS fallback
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { TemplateElement, SectionType } from '@/lib/types';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '@/lib/constants';
import { getProxiedImageUrl } from '@/lib/image-utils';

// Re-export for backward compatibility
export { CANVAS_WIDTH, CANVAS_HEIGHT };

interface KonvaCanvasProps {
    sectionType: SectionType;
    elements: TemplateElement[];
    selectedElementId: string | null;
    backgroundColor?: string;
    backgroundUrl?: string;
    overlayOpacity?: number;
    onElementSelect: (elementId: string | null) => void;
    onElementDrag: (elementId: string, x: number, y: number) => void;
    onElementDragEnd: (elementId: string, x: number, y: number) => void;
    getElementTransform: (el: TemplateElement) => string | undefined;
    scale?: number;
    renderComplexElements?: (element: TemplateElement, isSelected: boolean) => React.ReactNode;
}

interface KonvaNode {
    node: any;
    elementId: string;
    element: TemplateElement;
}

export function KonvaCanvas({
    sectionType,
    elements,
    selectedElementId,
    backgroundColor = '#ffffff',
    backgroundUrl,
    overlayOpacity,
    onElementSelect,
    onElementDrag,
    onElementDragEnd,
    getElementTransform,
    scale = 1,
}: KonvaCanvasProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const stageRef = useRef<any>(null);
    const layerRef = useRef<any>(null);
    const nodesRef = useRef<Map<string, KonvaNode>>(new Map());
    const [images, setImages] = useState<Map<string, HTMLImageElement>>(new Map());
    const [isMounted, setIsMounted] = useState(false);
    const [konvaLoaded, setKonvaLoaded] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const dragTargetRef = useRef<string | null>(null);
    const loadingUrlsRef = useRef<Set<string>>(new Set());

    // Dynamic import Konva only on client side
    useEffect(() => {
        if (typeof window === 'undefined') return;

        let isCancelled = false;

        const loadKonva = async () => {
            try {
                const KonvaModule = await import('konva');
                const Konva = KonvaModule.default || KonvaModule;

                if (!Konva || !Konva.Stage) {
                    throw new Error('Konva.Stage is not available');
                }

                if (isCancelled) return;

                setKonvaLoaded(true);
                setIsMounted(true);
            } catch (err) {
                console.error('Failed to load Konva:', err);
                if (!isCancelled) {
                    setError(`Failed to initialize canvas: ${err instanceof Error ? err.message : 'Unknown error'}`);
                }
            }
        };

        loadKonva();

        return () => {
            isCancelled = true;
        };
    }, []);

    // Robust image loader with CORS fallback for R2 Cloudflare compatibility
    const loadImageWithFallback = useCallback((url: string) => {
        // Skip if already loaded or currently loading
        if (images.has(url) || loadingUrlsRef.current.has(url)) {
            return;
        }

        loadingUrlsRef.current.add(url);
        console.log('🖼️ Loading image:', url);

        const img = new window.Image();

        const handleSuccess = (loadedImg: HTMLImageElement) => {
            console.log('✅ Image loaded successfully:', url);
            loadingUrlsRef.current.delete(url);
            setImages(prev => {
                const next = new Map(prev);
                next.set(url, loadedImg);
                return next;
            });
        };

        const handleCorsError = () => {
            console.warn('⚠️ CORS failed for image, retrying without credentials:', url);

            // Retry without crossOrigin attribute
            const retryImg = new window.Image();
            retryImg.onload = () => handleSuccess(retryImg);
            retryImg.onerror = () => {
                console.error('❌ Image failed to load even without CORS:', url);
                loadingUrlsRef.current.delete(url);
                // Don't set to images map - will show placeholder
            };
            retryImg.src = url;
        };

        // Try with CORS first (enables canvas export)
        img.crossOrigin = 'anonymous';
        img.onload = () => handleSuccess(img);
        img.onerror = handleCorsError;
        img.src = url;
    }, [images]);

    // Load images incrementally with proxy support
    useEffect(() => {
        if (!isMounted) return;

        // Collect all image URLs and convert to proxied URLs
        const imageUrls: string[] = [];

        elements.forEach(el => {
            if (el.type === 'image' && el.imageUrl) {
                // Use proxy for R2 URLs to bypass SSL issues
                const proxiedUrl = getProxiedImageUrl(el.imageUrl);
                imageUrls.push(proxiedUrl);
            }
        });

        if (backgroundUrl) {
            const proxiedBgUrl = getProxiedImageUrl(backgroundUrl);
            imageUrls.push(proxiedBgUrl);
        }

        // Load each image
        imageUrls.forEach(url => {
            loadImageWithFallback(url);
        });
    }, [elements, backgroundUrl, isMounted, loadImageWithFallback]);

    // Initialize Konva stage and layer
    useEffect(() => {
        if (!konvaLoaded || !containerRef.current || !isMounted) return;

        let stage: any;
        let layer: any;

        const initKonva = async () => {
            try {
                const konvaModule = await import('konva');
                const Konva = (konvaModule as any).default || konvaModule;

                if (!Konva) {
                    throw new Error('Failed to import Konva module');
                }

                const StageConstructor = Konva.Stage;
                if (!StageConstructor || typeof StageConstructor !== 'function') {
                    throw new Error('Konva.Stage is not a constructor');
                }

                if (!containerRef.current) return;

                stage = new StageConstructor({
                    container: containerRef.current,
                    width: CANVAS_WIDTH * scale,
                    height: CANVAS_HEIGHT * scale,
                    scaleX: scale,
                    scaleY: scale,
                });

                console.log('🎭 Konva Stage created:', {
                    container: containerRef.current,
                    width: CANVAS_WIDTH * scale,
                    height: CANVAS_HEIGHT * scale,
                });

                const LayerConstructor = Konva.Layer;
                if (!LayerConstructor || typeof LayerConstructor !== 'function') {
                    throw new Error('Konva.Layer is not a constructor');
                }
                layer = new LayerConstructor();
                stage.add(layer);

                stageRef.current = stage;
                layerRef.current = layer;

                stage.on('click tap', (e: any) => {
                    console.log('🖱️ Konva stage click/tap:', e.target, e.target === stage);
                    if (e.target === stage) {
                        onElementSelect(null);
                    }
                });

                stage.on('mousedown touchstart', (e: any) => {
                    console.log('🖱️ Konva stage mousedown/touchstart:', e.target);
                });

            } catch (err) {
                console.error('Failed to initialize Konva stage:', err);
                setError('Failed to initialize canvas');
            }
        };

        initKonva();

        return () => {
            if (stage) {
                stage.destroy();
            }
        };
    }, [konvaLoaded, scale, isMounted, onElementSelect]);

    // Render elements
    useEffect(() => {
        if (!konvaLoaded || !layerRef.current || !stageRef.current) return;

        const renderElements = async () => {
            try {
                const konvaModule = await import('konva');
                const Konva = (konvaModule as any).default || konvaModule;

                if (!Konva) {
                    throw new Error('Failed to import Konva for rendering');
                }

                if (!Konva.Rect || typeof Konva.Rect !== 'function') {
                    throw new Error('Konva.Rect is not available');
                }
                if (!Konva.Group || typeof Konva.Group !== 'function') {
                    throw new Error('Konva.Group is not available');
                }

                const layer = layerRef.current;
                if (!layer) return;

                // Clear existing nodes
                nodesRef.current.forEach(({ node }) => {
                    node.destroy();
                });
                nodesRef.current.clear();
                layer.destroyChildren();

                // Draw background - listening: false allows clicks to pass through
                const RectConstructor = Konva.Rect;
                const bgRect = new RectConstructor({
                    x: 0,
                    y: 0,
                    width: CANVAS_WIDTH,
                    height: CANVAS_HEIGHT,
                    fill: backgroundColor,
                    listening: false,
                });
                layer.add(bgRect);

                // Draw background image
                if (backgroundUrl && images.has(backgroundUrl)) {
                    const ImageConstructor = Konva.Image;
                    const bgImage = new ImageConstructor({
                        x: 0,
                        y: 0,
                        width: CANVAS_WIDTH,
                        height: CANVAS_HEIGHT,
                        image: images.get(backgroundUrl)!,
                        listening: false,
                    });
                    layer.add(bgImage);
                }

                // Draw overlay
                if (overlayOpacity && overlayOpacity > 0) {
                    const overlayRect = new RectConstructor({
                        x: 0,
                        y: 0,
                        width: CANVAS_WIDTH,
                        height: CANVAS_HEIGHT,
                        fill: `rgba(0,0,0,${overlayOpacity})`,
                        listening: false,
                    });
                    layer.add(overlayRect);
                }

                // Sort elements by zIndex
                const sortedElements = [...elements].sort((a, b) => a.zIndex - b.zIndex);

                // Get constructors
                const GroupConstructor = Konva.Group;
                const ImageConstructor = Konva.Image;
                const TextConstructor = Konva.Text;

                // Create element groups
                sortedElements.forEach((el) => {
                    const isSelected = selectedElementId === el.id;
                    const group = new GroupConstructor({
                        x: el.position.x,
                        y: el.position.y,
                        width: el.size.width,
                        height: el.size.height,
                        rotation: el.rotation || 0,
                        scaleX: el.flipHorizontal ? -1 : 1,
                        scaleY: el.flipVertical ? -1 : 1,
                        offsetX: el.flipHorizontal ? el.size.width : 0,
                        offsetY: el.flipVertical ? el.size.height : 0,
                        draggable: true,
                        id: el.id,
                    });

                    // Selection border
                    if (isSelected) {
                        const border = new RectConstructor({
                            x: -2,
                            y: -2,
                            width: el.size.width + 4,
                            height: el.size.height + 4,
                            stroke: '#3b82f6',
                            strokeWidth: 2,
                            fill: 'transparent',
                            listening: false,
                        });
                        group.add(border);
                    }

                    // Element content rendering
                    if (el.type === 'image') {
                        if (el.imageUrl && images.has(el.imageUrl)) {
                            // Image loaded - render it
                            const konvaImage = new ImageConstructor({
                                x: 0,
                                y: 0,
                                width: el.size.width,
                                height: el.size.height,
                                image: images.get(el.imageUrl)!,
                                listening: false,
                            });
                            group.add(konvaImage);
                        } else {
                            // Image loading or no URL - render placeholder
                            const isLoading = el.imageUrl && loadingUrlsRef.current.has(el.imageUrl);
                            const placeholder = new RectConstructor({
                                x: 0,
                                y: 0,
                                width: el.size.width,
                                height: el.size.height,
                                fill: isLoading ? '#e2e8f0' : '#cbd5e1',
                                stroke: '#94a3b8',
                                strokeWidth: 1,
                                dash: [4, 4],
                                listening: false,
                            });
                            group.add(placeholder);

                            const placeholderText = new TextConstructor({
                                x: 0,
                                y: 0,
                                width: el.size.width,
                                height: el.size.height,
                                text: isLoading ? 'Loading...' : (el.imageUrl ? 'Failed' : 'No Image'),
                                fontSize: 12,
                                fontFamily: 'Inter',
                                fill: '#64748b',
                                align: 'center',
                                verticalAlign: 'middle',
                                listening: false,
                            });
                            group.add(placeholderText);
                        }
                    } else if (el.type === 'text' && el.textStyle) {
                        const text = new TextConstructor({
                            x: 0,
                            y: 0,
                            width: el.size.width,
                            height: el.size.height,
                            text: el.content || '',
                            fontSize: el.textStyle.fontSize,
                            fontFamily: el.textStyle.fontFamily,
                            fontStyle: el.textStyle.fontStyle,
                            fill: el.textStyle.color,
                            align: el.textStyle.textAlign,
                            verticalAlign: 'middle',
                            listening: false,
                            wrap: 'word',
                        });
                        group.add(text);
                    }

                    // Drag handlers
                    group.on('dragmove', (e: any) => {
                        const node = e.target;
                        let newX = node.x();
                        let newY = node.y();

                        // Constrain to canvas bounds
                        newX = Math.max(0, Math.min(newX, CANVAS_WIDTH - el.size.width));
                        newY = Math.max(0, Math.min(newY, CANVAS_HEIGHT - el.size.height));

                        node.position({ x: newX, y: newY });
                        dragTargetRef.current = el.id;
                        onElementDrag(el.id, newX, newY);
                    });

                    group.on('dragend', (e: any) => {
                        const node = e.target;
                        const x = Math.round(node.x());
                        const y = Math.round(node.y());
                        dragTargetRef.current = null;
                        onElementDragEnd(el.id, x, y);
                    });

                    group.on('click', () => {
                        onElementSelect(el.id);
                    });

                    layer.add(group);
                    nodesRef.current.set(el.id, { node: group, elementId: el.id, element: el });
                });

                layer.draw();
            } catch (err) {
                console.error('Failed to render elements:', err);
                setError('Failed to render canvas elements');
            }
        };

        renderElements();
    }, [
        konvaLoaded,
        elements,
        selectedElementId,
        backgroundColor,
        backgroundUrl,
        overlayOpacity,
        images,
        onElementSelect,
        onElementDrag,
        onElementDragEnd,
    ]);

    // Loading state
    if (!isMounted || !konvaLoaded) {
        return (
            <div
                ref={containerRef}
                className="relative bg-white"
                style={{ width: CANVAS_WIDTH * scale, height: CANVAS_HEIGHT * scale }}
            >
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-slate-500 text-sm">Loading canvas...</div>
                </div>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div
                className="relative bg-white border border-red-200"
                style={{ width: CANVAS_WIDTH * scale, height: CANVAS_HEIGHT * scale }}
            >
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-red-500 text-sm text-center p-4">
                        {error}
                        <br />
                        <button
                            onClick={() => window.location.reload()}
                            className="mt-2 text-blue-500 underline"
                        >
                            Reload
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div
            ref={containerRef}
            className="relative"
            style={{
                width: CANVAS_WIDTH * scale,
                height: CANVAS_HEIGHT * scale,
                zIndex: 1,
            }}
        />
    );
}

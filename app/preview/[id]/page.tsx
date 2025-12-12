'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTemplateStore } from '@/lib/template-store';
import { SectionType, TemplateElement } from '@/lib/types';
import { CountdownTimer } from '@/components/CountdownTimer';
import { RSVPForm } from '@/components/RSVPForm';
import { GuestWishes } from '@/components/GuestWishes';
import { DynamicIcon } from '@/components/icons/IconList';
import { AnimatedElement } from '@/components/AnimatedElement';
import { Maximize, X, Volume2, VolumeX, ChevronDown } from 'lucide-react';
import { ClientOnly } from '@/components/ClientOnly';
import NextImage from 'next/image';

const CANVAS_WIDTH = 375;
const CANVAS_HEIGHT = 667;

export default function PublicPreviewPage() {
    const params = useParams();
    const router = useRouter();
    const templateId = params.id as string;
    const containerRef = useRef<HTMLDivElement>(null);

    const templates = useTemplateStore((state) => state.templates);
    const fetchTemplates = useTemplateStore((state) => state.fetchTemplates);
    const [isLoading, setIsLoading] = useState(true);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isMuted, setIsMuted] = useState(true);

    useEffect(() => {
        fetchTemplates().then(() => setIsLoading(false));
    }, [fetchTemplates]);

    // Listen for fullscreen change events
    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    const template = templates.find((t) => t.id === templateId);
    const orderedSections = template?.sectionOrder || [];

    const toggleFullscreen = async () => {
        if (!containerRef.current) return;
        try {
            if (!document.fullscreenElement) {
                await containerRef.current.requestFullscreen();
            } else {
                await document.exitFullscreen();
            }
        } catch (err) {
            console.error('Fullscreen error:', err);
        }
    };

    const getElementTransform = (el: TemplateElement): string => {
        const transforms: string[] = [];
        if (el.flipHorizontal) transforms.push('scaleX(-1)');
        if (el.flipVertical) transforms.push('scaleY(-1)');
        if (el.rotation) transforms.push(`rotate(${el.rotation}deg)`);
        return transforms.length > 0 ? transforms.join(' ') : 'none';
    };

    if (isLoading) {
        return (
            <ClientOnly>
                <div className="min-h-screen bg-black flex items-center justify-center">
                    <div className="text-white text-lg">Loading...</div>
                </div>
            </ClientOnly>
        );
    }

    if (!template) {
        return (
            <ClientOnly>
                <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4">
                    <p className="text-white text-lg">Template not found or not published.</p>
                    <button onClick={() => router.push('/templates')} className="text-blue-400 hover:underline">
                        Browse Templates
                    </button>
                </div>
            </ClientOnly>
        );
    }

    if (template.status !== 'published') {
        return (
            <ClientOnly>
                <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4">
                    <p className="text-white text-lg">This template is not published yet.</p>
                    <button onClick={() => router.push('/templates')} className="text-blue-400 hover:underline">
                        Browse Templates
                    </button>
                </div>
            </ClientOnly>
        );
    }

    return (
        <ClientOnly>
            <div
                ref={containerRef}
                className="min-h-screen bg-black flex flex-col items-center justify-start"
            >
                {/* Floating Controls */}
                <div className={`fixed top-4 right-4 z-50 flex gap-2 transition-opacity duration-300 ${isFullscreen ? 'opacity-0 hover:opacity-100' : 'opacity-100'}`}>
                    <button
                        onClick={() => setIsMuted(!isMuted)}
                        className="p-3 bg-white/20 backdrop-blur-sm text-white rounded-full hover:bg-white/30 transition-colors"
                        title={isMuted ? 'Unmute' : 'Mute'}
                    >
                        {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                    </button>
                    <button
                        onClick={toggleFullscreen}
                        className="p-3 bg-white/20 backdrop-blur-sm text-white rounded-full hover:bg-white/30 transition-colors"
                        title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
                    >
                        {isFullscreen ? <X size={20} /> : <Maximize size={20} />}
                    </button>
                </div>

                {/* Scroll Indicator */}
                {!isFullscreen && (
                    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 text-white/50 animate-bounce">
                        <ChevronDown size={32} />
                    </div>
                )}

                {/* Template Content */}
                <div className="w-full max-w-[375px] flex flex-col">
                    {orderedSections.map((sectionType) => {
                        const sectionDesign = template.sections[sectionType] || { animation: 'none', elements: [] };
                        const sectionElements = sectionDesign.elements || [];
                        const sortedElements = [...sectionElements].sort((a, b) => a.zIndex - b.zIndex);
                        const isVisible = sectionDesign.isVisible !== false;

                        if (!isVisible) return null;

                        return (
                            <div
                                key={sectionType}
                                className="relative shrink-0"
                                style={{
                                    width: CANVAS_WIDTH,
                                    minHeight: CANVAS_HEIGHT,
                                }}
                            >
                                {/* Background */}
                                <div
                                    className="absolute inset-0 overflow-hidden"
                                    style={{
                                        backgroundColor: sectionDesign.backgroundColor || '#ffffff',
                                        backgroundImage: sectionDesign.backgroundUrl ? `url(${sectionDesign.backgroundUrl})` : undefined,
                                        backgroundSize: 'cover',
                                        backgroundPosition: 'center',
                                    }}
                                >
                                    {sectionDesign.overlayOpacity && sectionDesign.overlayOpacity > 0 && (
                                        <div className="absolute inset-0" style={{ backgroundColor: `rgba(0,0,0,${sectionDesign.overlayOpacity})` }} />
                                    )}

                                    {/* Animated Elements */}
                                    {sortedElements.map((el) => (
                                        <AnimatedElement
                                            key={el.id}
                                            animation={el.animation}
                                            loopAnimation={el.loopAnimation}
                                            delay={el.animationDelay || 0}
                                            duration={el.animationDuration || 800}
                                            className="absolute"
                                            style={{
                                                left: el.position.x,
                                                top: el.position.y,
                                                width: el.size.width,
                                                height: el.size.height,
                                                zIndex: el.zIndex,
                                            }}
                                        >
                                            <div className="w-full h-full" style={{ transform: getElementTransform(el) }}>
                                                {el.type === 'image' && el.imageUrl && (
                                                    <NextImage
                                                        src={el.imageUrl}
                                                        alt={el.name}
                                                        fill
                                                        className="object-cover"
                                                        style={{ objectFit: el.objectFit || 'cover' }}
                                                        unoptimized
                                                    />
                                                )}
                                                {el.type === 'text' && el.textStyle && (
                                                    <div
                                                        className="w-full h-full flex items-center whitespace-pre-wrap break-words"
                                                        style={{
                                                            fontFamily: el.textStyle.fontFamily,
                                                            fontSize: el.textStyle.fontSize,
                                                            fontWeight: el.textStyle.fontWeight,
                                                            fontStyle: el.textStyle.fontStyle,
                                                            textDecoration: el.textStyle.textDecoration,
                                                            textAlign: el.textStyle.textAlign,
                                                            color: el.textStyle.color,
                                                            justifyContent: el.textStyle.textAlign === 'left' ? 'flex-start' : el.textStyle.textAlign === 'right' ? 'flex-end' : 'center',
                                                        }}
                                                    >
                                                        {el.content}
                                                    </div>
                                                )}
                                                {el.type === 'icon' && el.iconStyle && (
                                                    <div className="w-full h-full flex items-center justify-center">
                                                        <DynamicIcon
                                                            name={el.iconStyle.iconName}
                                                            size={el.iconStyle.iconSize}
                                                            color={el.iconStyle.iconColor}
                                                        />
                                                    </div>
                                                )}
                                                {el.type === 'countdown' && el.countdownConfig && (
                                                    <CountdownTimer config={el.countdownConfig} />
                                                )}
                                                {el.type === 'rsvp_form' && el.rsvpFormConfig && (
                                                    <RSVPForm config={el.rsvpFormConfig} templateId={templateId} />
                                                )}
                                                {el.type === 'guest_wishes' && el.guestWishesConfig && (
                                                    <GuestWishes config={el.guestWishesConfig} wishes={[]} />
                                                )}
                                            </div>
                                        </AnimatedElement>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </ClientOnly>
    );
}

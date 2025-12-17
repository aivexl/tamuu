'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTemplateStore } from '@/lib/template-store';
import { TemplateElement, OpenInvitationConfig } from '@/lib/types';
import { CountdownTimer } from '@/components/CountdownTimer';
import { RSVPForm } from '@/components/RSVPForm';
import { GuestWishes } from '@/components/GuestWishes';
import { DynamicIcon } from '@/components/icons/IconList';
import { AnimatedElement } from '@/components/AnimatedElement';
import { OpenInvitationButton, getDefaultOpenInvitationConfig } from '@/components/OpenInvitationButton';
import { Maximize, X, Volume2, VolumeX } from 'lucide-react';
import { ClientOnly } from '@/components/ClientOnly';
import NextImage from 'next/image';

// Base design dimensions (for calculating proportions)
const BASE_WIDTH = 375;
const BASE_HEIGHT = 667;

// Breakpoint for switching between mobile (fullscreen) and desktop (phone-frame)
const DESKTOP_BREAKPOINT = 768;

export default function PublicPreviewPage() {
    const params = useParams();
    const router = useRouter();
    const templateId = params.id as string;
    const containerRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);

    const templates = useTemplateStore((state) => state.templates);
    const fetchTemplates = useTemplateStore((state) => state.fetchTemplates);
    const [isLoading, setIsLoading] = useState(true);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isMuted, setIsMuted] = useState(true);

    // Open Invitation states
    const [isInvitationOpen, setIsInvitationOpen] = useState(false);

    // Responsive states
    const [isDesktop, setIsDesktop] = useState(false);
    const [viewportWidth, setViewportWidth] = useState(BASE_WIDTH);
    const [scale, setScale] = useState(1);

    useEffect(() => {
        fetchTemplates().then(() => setIsLoading(false));
    }, [fetchTemplates]);

    // Responsive layout calculation
    useEffect(() => {
        const updateLayout = () => {
            const vw = window.innerWidth;
            const vh = window.innerHeight;

            // Check if desktop/large screen (iPad, PC, TV)
            const desktop = vw >= DESKTOP_BREAKPOINT;
            setIsDesktop(desktop);

            if (desktop) {
                // Desktop: Use fixed phone-frame width, centered
                // Max 420px width for the invitation, vertically centered
                const frameWidth = Math.min(420, vw * 0.9);
                setViewportWidth(frameWidth);
                setScale(frameWidth / BASE_WIDTH);
            } else {
                // Mobile: True fullscreen, use full viewport width
                setViewportWidth(vw);
                setScale(vw / BASE_WIDTH);
            }
        };

        updateLayout();
        window.addEventListener('resize', updateLayout);
        return () => window.removeEventListener('resize', updateLayout);
    }, []);

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

    const handleOpenInvitation = () => {
        setIsInvitationOpen(true);
        // Scroll to next section smoothly
        setTimeout(() => {
            const nextSection = contentRef.current?.querySelector('[data-section-index="1"]');
            if (nextSection) {
                nextSection.scrollIntoView({ behavior: 'smooth' });
            }
        }, 100);
    };

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

    // Scale a value from base dimensions to current viewport
    const scaleValue = (value: number) => value * scale;

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

    // Calculate scaled section height
    const scaledSectionHeight = isDesktop ? scaleValue(BASE_HEIGHT) : '100dvh';

    return (
        <ClientOnly>
            {/* Outer Container - Different background for desktop vs mobile */}
            <div
                ref={containerRef}
                className={`min-h-screen ${isDesktop ? 'bg-stone-200' : 'bg-black'} flex items-start justify-center`}
                style={{
                    overflowY: isInvitationOpen ? 'auto' : 'hidden',
                    overflowX: 'hidden',
                }}
            >
                {/* Floating Controls */}
                <div className={`fixed top-4 right-4 z-[9999] flex gap-2 transition-opacity duration-300 ${isFullscreen ? 'opacity-0 hover:opacity-100' : 'opacity-100'}`}>
                    <button
                        onClick={() => setIsMuted(!isMuted)}
                        className="p-3 bg-black/30 backdrop-blur-sm text-white rounded-full hover:bg-black/50 transition-colors"
                        title={isMuted ? 'Unmute' : 'Mute'}
                    >
                        {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                    </button>
                    <button
                        onClick={toggleFullscreen}
                        className="p-3 bg-black/30 backdrop-blur-sm text-white rounded-full hover:bg-black/50 transition-colors"
                        title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
                    >
                        {isFullscreen ? <X size={20} /> : <Maximize size={20} />}
                    </button>
                </div>

                {/* Content Frame Container */}
                <div
                    ref={contentRef}
                    className={`relative ${isDesktop ? 'my-8 rounded-3xl overflow-hidden shadow-2xl' : ''}`}
                    style={{
                        width: viewportWidth,
                        maxWidth: isDesktop ? 420 : '100%',
                        // Add subtle shadow for phone-frame effect on desktop
                        boxShadow: isDesktop ? '0 25px 80px -12px rgba(0, 0, 0, 0.4), 0 10px 30px -10px rgba(0, 0, 0, 0.3)' : 'none',
                    }}
                >
                    {orderedSections.map((sectionType, index) => {
                        const sectionDesign = template.sections[sectionType] || { animation: 'none', elements: [] };
                        const sectionElements = sectionDesign.elements || [];
                        const sortedElements = [...sectionElements].sort((a, b) => a.zIndex - b.zIndex);
                        const isVisible = sectionDesign.isVisible !== false;

                        if (!isVisible) return null;

                        const isCover = index === 0;
                        const shouldHide = !isInvitationOpen && !isCover;

                        return (
                            <div
                                key={sectionType}
                                data-section-index={index}
                                className="relative w-full"
                                style={{
                                    minHeight: scaledSectionHeight,
                                    display: shouldHide ? 'none' : 'block',
                                }}
                            >
                                {/* Background */}
                                <div
                                    className="absolute inset-0"
                                    style={{
                                        backgroundColor: sectionDesign.backgroundColor || '#ffffff',
                                        backgroundImage: sectionDesign.backgroundUrl ? `url(${sectionDesign.backgroundUrl})` : undefined,
                                        backgroundSize: 'cover',
                                        backgroundPosition: 'center',
                                    }}
                                >
                                    {/* Overlay */}
                                    {sectionDesign.overlayOpacity && sectionDesign.overlayOpacity > 0 && (
                                        <div className="absolute inset-0" style={{ backgroundColor: `rgba(0,0,0,${sectionDesign.overlayOpacity})` }} />
                                    )}
                                </div>

                                {/* Elements - Scaled */}
                                {sortedElements.map((el) => (
                                    <AnimatedElement
                                        key={el.id}
                                        animation={el.animation}
                                        loopAnimation={el.loopAnimation}
                                        delay={el.animationDelay || 0}
                                        duration={el.animationDuration || 800}
                                        className="absolute"
                                        style={{
                                            left: scaleValue(el.position.x),
                                            top: scaleValue(el.position.y),
                                            width: scaleValue(el.size.width),
                                            height: scaleValue(el.size.height),
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
                                                        fontSize: scaleValue(el.textStyle.fontSize),
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
                                                        size={scaleValue(el.iconStyle.iconSize)}
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
                                            {el.type === 'open_invitation_button' && el.openInvitationConfig && !isInvitationOpen && (
                                                <OpenInvitationButton
                                                    config={el.openInvitationConfig}
                                                    onClick={handleOpenInvitation}
                                                    scale={scale}
                                                />
                                            )}
                                        </div>
                                    </AnimatedElement>
                                ))}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Custom animation styles */}
            <style jsx global>{`
                @keyframes float {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-10px); }
                }
                .animate-float {
                    animation: float 3s ease-in-out infinite;
                }
                @keyframes shimmer {
                    0% { background-position: -200% center; }
                    100% { background-position: 200% center; }
                }
                .animate-shimmer {
                    animation: shimmer 2s linear infinite;
                    background-size: 200% auto;
                }
            `}</style>
        </ClientOnly>
    );
}

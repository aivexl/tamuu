'use client';

import React from 'react';
import { OpenInvitationConfig } from '@/lib/types';
import { MailOpen, Heart, Sparkles, Mail, Send, ChevronDown, Star, Coffee, Cloud, Gift, Anchor, Feather, Smile, Zap } from 'lucide-react';

interface OpenInvitationButtonProps {
    config: OpenInvitationConfig;
    onClick: () => void;
    scale?: number; // For responsive scaling
    className?: string;
}

// Icon mapping
const iconMap: Record<string, React.ComponentType<any>> = {
    'mail-open': MailOpen,
    'heart': Heart,
    'sparkles': Sparkles,
    'mail': Mail,
    'send': Send,
    'chevron-down': ChevronDown,
    'star': Star,
    'coffee': Coffee,
    'cloud': Cloud,
    'gift': Gift,
    'anchor': Anchor,
    'feather': Feather,
    'smile': Smile,
    'zap': Zap,
};

// Animation keyframes CSS
const getAnimationClass = (animation: string) => {
    switch (animation) {
        case 'pulse': return 'animate-pulse';
        case 'bounce': return 'animate-bounce';
        case 'float': return 'animate-float'; // Requires custom tailwind config for 'float'
        case 'glow': return 'animate-pulse'; // Fallback
        default: return '';
    }
};

// Helper: resolve shape borderRadius
const getBorderRadius = (shape: string, scale: number) => {
    switch (shape) {
        case 'pill': return '9999px';
        case 'rounded': return `${12 * scale}px`;
        case 'rectangle': return '0px';
        case 'stadium': return `${20 * scale}px`; // Slightly different from pill, strictly semi-circles ends
        default: return `${8 * scale}px`;
    }
};

// --- STYLE VARIATIONS ---

// 1. Elegant (Classic Serif)
const ElegantButton: React.FC<OpenInvitationButtonProps> = ({ config, onClick, scale = 1 }) => {
    const IconComponent = config.iconName ? iconMap[config.iconName] : MailOpen;
    return (
        <button
            onClick={onClick}
            className={`flex flex-col items-center gap-2 transition-all duration-500 hover:scale-105 active:scale-95 ${getAnimationClass(config.animation || 'none')}`}
            style={{
                padding: `${16 * scale}px ${40 * scale}px`,
                backgroundColor: config.buttonColor,
                color: config.textColor,
                fontFamily: config.fontFamily,
                fontSize: config.fontSize * scale,
                fontWeight: config.fontWeight === 'bold' ? 700 : 500,
                letterSpacing: '0.1em',
                textTransform: config.textTransform || 'uppercase',
                borderRadius: getBorderRadius(config.buttonShape, scale),
                boxShadow: `0 10px 30px -10px ${config.buttonColor}80`,
                border: `1px solid ${config.borderColor || 'transparent'}`,
            }}
        >
            {config.showIcon && IconComponent && <IconComponent size={24 * scale} color={config.textColor} />}
            <span>{config.buttonText}</span>
            {config.subText && <span style={{ fontSize: (config.fontSize - 4) * scale, opacity: 0.8 }}>{config.subText}</span>}
        </button>
    );
};

// 2. Minimal (Clean Sans)
const MinimalButton: React.FC<OpenInvitationButtonProps> = ({ config, onClick, scale = 1 }) => {
    const IconComponent = config.iconName ? iconMap[config.iconName] : null;
    return (
        <button
            onClick={onClick}
            className={`flex items-center gap-3 group transition-all duration-300 ${getAnimationClass(config.animation || 'none')}`}
            style={{
                padding: `${12 * scale}px ${24 * scale}px`,
                backgroundColor: 'transparent',
                color: config.textColor,
                fontFamily: config.fontFamily,
                fontSize: config.fontSize * scale,
                fontWeight: 600,
                textTransform: config.textTransform || 'uppercase',
                letterSpacing: '0.15em',
                border: 'none',
            }}
        >
            <span className="relative">
                {config.buttonText}
                <span className="absolute -bottom-2 left-0 w-0 h-[1px] bg-current transition-all duration-300 group-hover:w-full" style={{ backgroundColor: config.textColor }}></span>
            </span>
            {config.showIcon && IconComponent && <IconComponent size={18 * scale} color={config.textColor} />}
        </button>
    );
};

// 3. Glass (Blur)
const GlassButton: React.FC<OpenInvitationButtonProps> = ({ config, onClick, scale = 1 }) => {
    const IconComponent = config.iconName ? iconMap[config.iconName] : MailOpen;
    return (
        <button
            onClick={onClick}
            className={`flex items-center gap-3 transition-all duration-300 hover:bg-white/10 hover:scale-105 active:scale-95 ${getAnimationClass(config.animation || 'none')}`}
            style={{
                padding: `${16 * scale}px ${36 * scale}px`,
                backgroundColor: `${config.buttonColor}40`, // Low opacity background
                backdropFilter: `blur(${config.backdropBlur || 12}px)`,
                WebkitBackdropFilter: `blur(${config.backdropBlur || 12}px)`,
                color: config.textColor,
                fontFamily: config.fontFamily,
                fontSize: config.fontSize * scale,
                fontWeight: 500,
                letterSpacing: '0.05em',
                borderRadius: getBorderRadius(config.buttonShape, scale),
                border: `1px solid ${config.borderColor || 'rgba(255,255,255,0.3)'}`,
                boxShadow: `0 8px 32px 0 rgba(31, 38, 135, 0.15)`,
            }}
        >
            {config.showIcon && IconComponent && <IconComponent size={20 * scale} color={config.textColor} />}
            <span className="drop-shadow-sm">{config.buttonText}</span>
        </button>
    );
};

// 4. Outline (Border only)
const OutlineButton: React.FC<OpenInvitationButtonProps> = ({ config, onClick, scale = 1 }) => {
    const IconComponent = config.iconName ? iconMap[config.iconName] : MailOpen;
    return (
        <button
            onClick={onClick}
            className={`flex items-center gap-3 transition-all duration-300 hover:bg-white/5 active:scale-95 ${getAnimationClass(config.animation || 'none')}`}
            style={{
                padding: `${14 * scale}px ${32 * scale}px`,
                backgroundColor: 'transparent',
                color: config.textColor,
                fontFamily: config.fontFamily,
                fontSize: config.fontSize * scale,
                fontWeight: 600,
                letterSpacing: '0.1em',
                textTransform: config.textTransform || 'uppercase',
                borderRadius: getBorderRadius(config.buttonShape, scale),
                border: `${config.borderWidth || 2}px solid ${config.borderColor || config.textColor}`,
            }}
        >
            {config.buttonText}
            {config.showIcon && IconComponent && <IconComponent size={20 * scale} color={config.textColor} />}
        </button>
    );
};

// 5. Neon (Glow)
const NeonButton: React.FC<OpenInvitationButtonProps> = ({ config, onClick, scale = 1 }) => {
    const IconComponent = config.iconName ? iconMap[config.iconName] : Zap;
    const glowColor = config.buttonColor;
    return (
        <button
            onClick={onClick}
            className={`flex items-center gap-2 transition-all duration-300 hover:scale-105 active:scale-95 ${getAnimationClass(config.animation || 'none')}`}
            style={{
                padding: `${14 * scale}px ${30 * scale}px`,
                backgroundColor: 'transparent', // Usually dark bg behind
                color: glowColor,
                fontFamily: config.fontFamily,
                fontSize: config.fontSize * scale,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.15em',
                borderRadius: getBorderRadius(config.buttonShape, scale),
                border: `2px solid ${glowColor}`,
                boxShadow: `0 0 10px ${glowColor}, inset 0 0 10px ${glowColor}`,
                textShadow: `0 0 5px ${glowColor}, 0 0 10px ${glowColor}`,
            }}
        >
            {config.showIcon && IconComponent && <IconComponent size={20 * scale} color={glowColor} />}
            {config.buttonText}
        </button>
    );
};

// 6. Gradient (Soft Gradient)
const GradientButton: React.FC<OpenInvitationButtonProps> = ({ config, onClick, scale = 1 }) => {
    const IconComponent = config.iconName ? iconMap[config.iconName] : Sparkles;
    return (
        <button
            onClick={onClick}
            className={`flex items-center gap-3 transition-all duration-500 hover:brightness-110 active:scale-95 ${getAnimationClass(config.animation || 'none')}`}
            style={{
                padding: `${16 * scale}px ${40 * scale}px`,
                background: `linear-gradient(135deg, ${config.buttonColor} 0%, ${config.gradientEndColor || config.buttonColor} 100%)`,
                color: config.textColor,
                fontFamily: config.fontFamily,
                fontSize: config.fontSize * scale,
                fontWeight: 600,
                borderRadius: getBorderRadius(config.buttonShape, scale),
                border: 'none',
                boxShadow: `0 10px 20px -5px ${config.buttonColor}80`,
            }}
        >
            {config.buttonText}
            {config.showIcon && IconComponent && <IconComponent size={20 * scale} color={config.textColor} />}
        </button>
    );
};

// 7. Luxury (Gold/Dark)
const LuxuryButton: React.FC<OpenInvitationButtonProps> = ({ config, onClick, scale = 1 }) => {
    const IconComponent = config.iconName ? iconMap[config.iconName] : Star;
    // Force some luxury logic if not overridden, but respect config
    const bg = config.buttonColor;
    const border = config.borderColor || '#D4AF37'; // Gold default
    return (
        <button
            onClick={onClick}
            className={`flex flex-col items-center gap-1 transition-all duration-500 hover:scale-105 ${getAnimationClass(config.animation || 'none')}`}
            style={{
                padding: `${18 * scale}px ${48 * scale}px`,
                backgroundColor: bg,
                color: config.textColor,
                fontFamily: config.fontFamily, // Should be a serif
                fontSize: config.fontSize * scale,
                textTransform: 'uppercase',
                letterSpacing: '0.2em',
                border: `1px solid ${border}`,
                outline: `4px double ${border}`, // Double border effect
                outlineOffset: '-6px',
                borderRadius: '0', // Luxury often sharp
            }}
        >
            {config.showIcon && IconComponent && <IconComponent size={16 * scale} color={config.textColor} className="mb-1" />}
            <span style={{ fontWeight: 400 }}>{config.buttonText}</span>
        </button>
    );
};

// 8. Romantic (Soft Pink/Red)
const RomanticButton: React.FC<OpenInvitationButtonProps> = ({ config, onClick, scale = 1 }) => {
    const IconComponent = config.iconName ? iconMap[config.iconName] : Heart;
    return (
        <button
            onClick={onClick}
            className={`flex items-center gap-2 transition-all duration-300 hover:scale-105 active:scale-95 ${getAnimationClass(config.animation || 'none')}`}
            style={{
                padding: `${14 * scale}px ${36 * scale}px`,
                backgroundColor: '#fff', // Typically white or soft
                color: config.buttonColor, // Text is the romantic color
                fontFamily: config.fontFamily, // Script or serif
                fontSize: (config.fontSize + 2) * scale,
                fontStyle: 'italic',
                fontWeight: 500,
                borderRadius: '50px',
                border: `1px solid ${config.buttonColor}40`,
                boxShadow: `0 5px 15px ${config.buttonColor}20`,
            }}
        >
            <span>{config.buttonText}</span>
            {config.showIcon && IconComponent && <IconComponent size={18 * scale} fill={config.buttonColor} color={config.buttonColor} />}
        </button>
    );
};

// 9. Boho (Earthy/Natural)
const BohoButton: React.FC<OpenInvitationButtonProps> = ({ config, onClick, scale = 1 }) => {
    const IconComponent = config.iconName ? iconMap[config.iconName] : Feather;
    return (
        <button
            onClick={onClick}
            className={`flex items-center gap-3 transition-transform duration-300 hover:scale-105 ${getAnimationClass(config.animation || 'none')}`}
            style={{
                padding: `${16 * scale}px ${40 * scale}px`,
                backgroundColor: config.buttonColor, // Earth tones
                color: config.textColor, // Cream/Offwhite
                fontFamily: config.fontFamily,
                fontSize: config.fontSize * scale,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                borderRadius: '255px 15px 225px 15px / 15px 225px 15px 255px', // Organic shape
                border: `1px dashed ${config.borderColor || config.textColor}60`,
                boxShadow: '2px 2px 5px rgba(0,0,0,0.1)'
            }}
        >
            {config.buttonText}
            {config.showIcon && IconComponent && <IconComponent size={20 * scale} color={config.textColor} />}
        </button>
    );
};

// 10. Modern (Bold/Sharp)
const ModernButton: React.FC<OpenInvitationButtonProps> = ({ config, onClick, scale = 1 }) => {
    const IconComponent = config.iconName ? iconMap[config.iconName] : Send;
    return (
        <button
            onClick={onClick}
            className={`flex items-center justify-between transition-all duration-300 hover:bg-opacity-90 active:translate-y-1 ${getAnimationClass(config.animation || 'none')}`}
            style={{
                padding: `${16 * scale}px ${32 * scale}px`,
                backgroundColor: config.buttonColor,
                color: config.textColor,
                fontFamily: config.fontFamily,
                fontSize: config.fontSize * scale,
                fontWeight: 700,
                textTransform: 'none',
                borderRadius: '6px', // Sharp but safe
                boxShadow: `4px 4px 0px ${config.shadowColor || '#000'}`, // Hard shadow
                border: `2px solid ${config.shadowColor || '#000'}`,
                minWidth: `${160 * scale}px`
            }}
        >
            {config.buttonText}
            {config.showIcon && IconComponent && <IconComponent size={20 * scale} color={config.textColor} className="ml-4" />}
        </button>
    );
};

// 11. Vintage (Retro/Bordered)
const VintageButton: React.FC<OpenInvitationButtonProps> = ({ config, onClick, scale = 1 }) => {
    const IconComponent = config.iconName ? iconMap[config.iconName] : Anchor;
    return (
        <button
            onClick={onClick}
            className={`relative flex items-center justify-center transition-all duration-300 hover:scale-105 ${getAnimationClass(config.animation || 'none')}`}
            style={{
                padding: `${14 * scale}px ${36 * scale}px`,
                backgroundColor: 'transparent',
                color: config.buttonColor,
                fontFamily: config.fontFamily,
                fontSize: config.fontSize * scale,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.15em',
                borderTop: `1px solid ${config.buttonColor}`,
                borderBottom: `1px solid ${config.buttonColor}`,
            }}
        >
            {/* Decorative lines */}
            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-2 h-[1px]" style={{ backgroundColor: config.buttonColor }}></span>
            <span className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-[1px]" style={{ backgroundColor: config.buttonColor }}></span>

            <span className="px-4">{config.buttonText}</span>
        </button>
    );
};

// 12. Playful (Bouncy/Bright)
const PlayfulButton: React.FC<OpenInvitationButtonProps> = ({ config, onClick, scale = 1 }) => {
    const IconComponent = config.iconName ? iconMap[config.iconName] : Smile;
    return (
        <button
            onClick={onClick}
            className={`flex items-center gap-2 transition-transform duration-300 hover:rotate-3 hover:scale-110 active:scale-95 ${getAnimationClass(config.animation || 'none')}`}
            style={{
                padding: `${16 * scale}px ${32 * scale}px`,
                backgroundColor: config.buttonColor,
                color: config.textColor,
                fontFamily: config.fontFamily, // Rounded font works best
                fontSize: config.fontSize * scale,
                fontWeight: 800,
                borderRadius: '24px',
                border: `4px solid white`,
                boxShadow: `0 8px 0 ${config.shadowColor || '#e2e8f0'}`, // 3D effect
            }}
        >
            {config.showIcon && IconComponent && <IconComponent size={24 * scale} color={config.textColor} />}
            {config.buttonText}
        </button>
    );
};

// 13. Rustic (Warm/Textured look simulation)
const RusticButton: React.FC<OpenInvitationButtonProps> = ({ config, onClick, scale = 1 }) => {
    const IconComponent = config.iconName ? iconMap[config.iconName] : Coffee;
    return (
        <button
            onClick={onClick}
            className={`flex flex-col items-center justify-center transition-all duration-300 opacity-90 hover:opacity-100 ${getAnimationClass(config.animation || 'none')}`}
            style={{
                padding: `${12 * scale}px ${30 * scale}px`,
                backgroundColor: config.buttonColor, // Wood colors
                color: config.textColor,
                fontFamily: config.fontFamily,
                fontSize: config.fontSize * scale,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                border: `1px solid ${config.borderColor || config.textColor}`,
                borderRadius: '2px',
                backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(0,0,0,0.05) 10px, rgba(0,0,0,0.05) 20px)' // Texture effect
            }}
        >
            {config.buttonText}
            {config.subText && <span style={{ fontSize: '0.7em', marginTop: '4px', fontStyle: 'italic' }}>— {config.subText} —</span>}
        </button>
    );
};

// 14. Cloud (Soft rounded/Float)
const CloudButton: React.FC<OpenInvitationButtonProps> = ({ config, onClick, scale = 1 }) => {
    const IconComponent = config.iconName ? iconMap[config.iconName] : Cloud;
    return (
        <button
            onClick={onClick}
            className={`flex items-center gap-3 transition-all duration-500 hover:translate-y-[-4px] active:translate-y-[1px] ${getAnimationClass(config.animation || 'none')}`}
            style={{
                padding: `${20 * scale}px ${48 * scale}px`,
                backgroundColor: 'white',
                color: config.buttonColor, // Text is colored
                fontFamily: config.fontFamily,
                fontSize: config.fontSize * scale,
                fontWeight: 600,
                borderRadius: '50px',
                boxShadow: `0 10px 25px -5px ${config.buttonColor}40`, // Colored soft shadow
            }}
        >
            {config.showIcon && IconComponent && <IconComponent size={22 * scale} color={config.buttonColor} />}
            {config.buttonText}
        </button>
    );
};

// 15. Sticker (White border/Shadow)
const StickerButton: React.FC<OpenInvitationButtonProps> = ({ config, onClick, scale = 1 }) => {
    const IconComponent = config.iconName ? iconMap[config.iconName] : Gift;
    return (
        <button
            onClick={onClick}
            className={`flex items-center gap-2 transition-transform duration-200 hover:rotate-2 hover:scale-105 active:scale-95 ${getAnimationClass(config.animation || 'none')}`}
            style={{
                padding: `${12 * scale}px ${28 * scale}px`,
                backgroundColor: config.buttonColor,
                color: config.textColor,
                fontFamily: config.fontFamily,
                fontSize: config.fontSize * scale,
                fontWeight: 700,
                transform: 'rotate(-2deg)', // Slight tilt for sticker look
                borderRadius: '8px',
                border: '3px solid white',
                boxShadow: '0 4px 6px rgba(0,0,0,0.15)',
            }}
        >
            {config.showIcon && IconComponent && <IconComponent size={20 * scale} color={config.textColor} />}
            {config.buttonText}
        </button>
    );
};

// Main Component
export const OpenInvitationButton: React.FC<OpenInvitationButtonProps> = (props) => {
    const { config } = props;

    // Dispatcher
    switch (config.buttonStyle) {
        case 'elegant': return <ElegantButton {...props} />;
        case 'minimal': return <MinimalButton {...props} />;
        case 'glass': return <GlassButton {...props} />;
        case 'outline': return <OutlineButton {...props} />;
        case 'neon': return <NeonButton {...props} />;
        case 'gradient': return <GradientButton {...props} />;
        case 'luxury': return <LuxuryButton {...props} />;
        case 'romantic': return <RomanticButton {...props} />;
        case 'boho': return <BohoButton {...props} />;
        case 'modern': return <ModernButton {...props} />;
        case 'vintage': return <VintageButton {...props} />;
        case 'playful': return <PlayfulButton {...props} />;
        case 'rustic': return <RusticButton {...props} />;
        case 'cloud': return <CloudButton {...props} />;
        case 'sticker': return <StickerButton {...props} />;
        default: return <ElegantButton {...props} />;
    }
};

// Default configuration with new fields default
export const getDefaultOpenInvitationConfig = (): OpenInvitationConfig => ({
    enabled: true,
    buttonText: 'Buka Undangan',
    subText: 'Ketuk untuk membuka',
    buttonColor: '#722f37',
    textColor: '#f5f0e6',
    borderColor: '#8b4049',
    shadowColor: '#4a1a20',
    gradientEndColor: '#9b4a54',
    fontFamily: 'Cormorant Garamond, serif',
    fontSize: 16,
    fontWeight: 'semibold',
    letterSpacing: 0.15,
    textTransform: 'uppercase',
    buttonStyle: 'elegant',
    buttonShape: 'pill',
    position: 'bottom-center',
    animation: 'none',
    showIcon: true,
    iconName: 'mail-open',
    overlayOpacity: 0,
    backdropBlur: 10,
    borderWidth: 2,
    shadowIntensity: 'medium',
});

export default OpenInvitationButton;

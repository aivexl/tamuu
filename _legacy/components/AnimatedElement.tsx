'use client';

import React from 'react';
import { useInView } from '@/lib/hooks/useInView';
import { AnimationType } from '@/lib/types';

interface AnimatedElementProps {
    children: React.ReactNode;
    animation: AnimationType;           // Entrance animation
    loopAnimation?: AnimationType;      // Continuous looping animation
    delay?: number;
    duration?: number;
    className?: string;
    style?: React.CSSProperties;
}

// List of looping animations
const LOOPING_ANIMATIONS: AnimationType[] = ['sway', 'float', 'pulse', 'sparkle', 'spin', 'shake', 'swing', 'heartbeat', 'glow'];

// List of entrance animations
const ENTRANCE_ANIMATIONS: AnimationType[] = ['fade-in', 'slide-up', 'slide-down', 'slide-left', 'slide-right', 'zoom-in', 'zoom-out', 'flip-x', 'flip-y', 'bounce'];

/**
 * AnimatedElement Component
 * 
 * Wraps children and supports:
 * - Entrance animation: triggers once when element scrolls into view
 * - Loop animation: runs continuously forever when visible
 * 
 * Both can be combined! e.g., fade-in + sway
 */
export function AnimatedElement({
    children,
    animation,
    loopAnimation,
    delay = 0,
    duration = 800,
    className = '',
    style = {},
}: AnimatedElementProps) {
    const { ref, inView } = useInView<HTMLDivElement>({ threshold: 0.15, triggerOnce: true });

    // Determine the actual entrance animation (ignore if it's a looping type in the wrong field)
    const entranceAnim = ENTRANCE_ANIMATIONS.includes(animation) ? animation : 'none';

    // Determine the actual loop animation
    const loopAnim = loopAnimation && LOOPING_ANIMATIONS.includes(loopAnimation)
        ? loopAnimation
        : (LOOPING_ANIMATIONS.includes(animation) ? animation : undefined);

    // Get looping animation CSS
    const getLoopingAnimationStyle = (anim: AnimationType): React.CSSProperties => {
        const baseStyle: React.CSSProperties = {
            animationDelay: `${delay}ms`,
            animationIterationCount: 'infinite',
            animationTimingFunction: 'ease-in-out',
        };

        switch (anim) {
            case 'sway':
                return {
                    ...baseStyle,
                    animationName: 'sway',
                    animationDuration: `${duration * 2}ms`,
                    transformOrigin: 'bottom center',
                };
            case 'float':
                return {
                    ...baseStyle,
                    animationName: 'float',
                    animationDuration: `${duration * 3}ms`,
                };
            case 'pulse':
                return {
                    ...baseStyle,
                    animationName: 'pulse',
                    animationDuration: `${duration * 2}ms`,
                };
            case 'sparkle':
                return {
                    ...baseStyle,
                    animationName: 'sparkle',
                    animationDuration: `${duration * 1.5}ms`,
                };
            case 'spin':
                return {
                    ...baseStyle,
                    animationName: 'spin',
                    animationDuration: `${duration * 4}ms`,
                    animationTimingFunction: 'linear',
                };
            case 'shake':
                return {
                    ...baseStyle,
                    animationName: 'shake',
                    animationDuration: `${duration}ms`,
                };
            case 'swing':
                return {
                    ...baseStyle,
                    animationName: 'swing',
                    animationDuration: `${duration * 2}ms`,
                    transformOrigin: 'top center',
                };
            case 'heartbeat':
                return {
                    ...baseStyle,
                    animationName: 'heartbeat',
                    animationDuration: `${duration * 1.5}ms`,
                };
            case 'glow':
                return {
                    ...baseStyle,
                    animationName: 'glow',
                    animationDuration: `${duration * 2}ms`,
                };
            default:
                return {};
        }
    };

    // Get entrance animation initial style (before animation)
    const getEntranceInitialStyle = (): React.CSSProperties => {
        switch (entranceAnim) {
            case 'fade-in':
                return { opacity: 0 };
            case 'slide-up':
                return { opacity: 0, transform: 'translateY(40px)' };
            case 'slide-down':
                return { opacity: 0, transform: 'translateY(-40px)' };
            case 'slide-left':
                return { opacity: 0, transform: 'translateX(40px)' };
            case 'slide-right':
                return { opacity: 0, transform: 'translateX(-40px)' };
            case 'zoom-in':
                return { opacity: 0, transform: 'scale(0.8)' };
            case 'zoom-out':
                return { opacity: 0, transform: 'scale(1.2)' };
            case 'flip-x':
                return { opacity: 0, transform: 'rotateX(90deg)' };
            case 'flip-y':
                return { opacity: 0, transform: 'rotateY(90deg)' };
            case 'bounce':
                return { opacity: 0, transform: 'translateY(40px)' };
            default:
                return {};
        }
    };

    // Get entrance animation animated style (after animation)
    const getEntranceAnimatedStyle = (): React.CSSProperties => {
        if (entranceAnim === 'none' || !inView) return {};

        return {
            opacity: 1,
            transform: 'none',
            transitionProperty: 'opacity, transform',
            transitionDuration: `${duration}ms`,
            transitionDelay: `${delay}ms`,
            transitionTimingFunction: entranceAnim === 'bounce' ? 'cubic-bezier(0.68, -0.55, 0.265, 1.55)' : 'ease-out',
        };
    };

    // Compute final style
    const computedStyle = (): React.CSSProperties => {
        let finalStyle: React.CSSProperties = { ...style };

        // Apply entrance animation
        if (entranceAnim !== 'none') {
            if (inView) {
                finalStyle = { ...finalStyle, ...getEntranceAnimatedStyle() };
            } else {
                finalStyle = { ...finalStyle, ...getEntranceInitialStyle() };
            }
        }

        // Apply loop animation (only when in view and entrance is complete)
        if (loopAnim && inView) {
            finalStyle = { ...finalStyle, ...getLoopingAnimationStyle(loopAnim) };
        }

        return finalStyle;
    };

    return (
        <>
            <style jsx global>{`
                @keyframes sway {
                    0%, 100% { transform: rotate(-5deg); }
                    50% { transform: rotate(5deg); }
                }
                @keyframes float {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-10px); }
                }
                @keyframes pulse {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.05); }
                }
                @keyframes sparkle {
                    0%, 100% { opacity: 1; filter: brightness(1); }
                    50% { opacity: 0.7; filter: brightness(1.3); }
                }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    10%, 30%, 50%, 70%, 90% { transform: translateX(-2px); }
                    20%, 40%, 60%, 80% { transform: translateX(2px); }
                }
                @keyframes swing {
                    0%, 100% { transform: rotate(-10deg); }
                    50% { transform: rotate(10deg); }
                }
                @keyframes heartbeat {
                    0%, 100% { transform: scale(1); }
                    14% { transform: scale(1.1); }
                    28% { transform: scale(1); }
                    42% { transform: scale(1.1); }
                    70% { transform: scale(1); }
                }
                @keyframes glow {
                    0%, 100% { 
                        filter: drop-shadow(0 0 5px rgba(255, 255, 255, 0.5));
                    }
                    50% { 
                        filter: drop-shadow(0 0 20px rgba(255, 255, 255, 0.8)) drop-shadow(0 0 30px rgba(255, 200, 100, 0.6));
                    }
                }
            `}</style>
            <div
                ref={ref as React.RefObject<HTMLDivElement>}
                className={className}
                style={computedStyle()}
            >
                {children}
            </div>
        </>
    );
}

export default AnimatedElement;

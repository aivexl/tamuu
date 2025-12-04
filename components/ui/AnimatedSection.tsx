'use client';

import React from 'react';
import { motion, Variants } from 'framer-motion';
import { AnimationType } from '@/lib/types';

interface AnimatedSectionProps {
    animation: AnimationType;
    children: React.ReactNode;
    className?: string;
    delay?: number;
    style?: React.CSSProperties;
}

const animationVariants: Record<AnimationType, Variants> = {
    none: {
        hidden: {},
        visible: {},
    },
    'fade-in': {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { duration: 0.8, ease: 'easeOut' } },
    },
    'slide-up': {
        hidden: { opacity: 0, y: 60 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: 'easeOut' } },
    },
    'slide-down': {
        hidden: { opacity: 0, y: -60 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: 'easeOut' } },
    },
    'slide-left': {
        hidden: { opacity: 0, x: 60 },
        visible: { opacity: 1, x: 0, transition: { duration: 0.7, ease: 'easeOut' } },
    },
    'slide-right': {
        hidden: { opacity: 0, x: -60 },
        visible: { opacity: 1, x: 0, transition: { duration: 0.7, ease: 'easeOut' } },
    },
    'zoom-in': {
        hidden: { opacity: 0, scale: 0.8 },
        visible: { opacity: 1, scale: 1, transition: { duration: 0.6, ease: 'easeOut' } },
    },
    'zoom-out': {
        hidden: { opacity: 0, scale: 1.2 },
        visible: { opacity: 1, scale: 1, transition: { duration: 0.6, ease: 'easeOut' } },
    },
    'flip-x': {
        hidden: { opacity: 0, rotateX: 90 },
        visible: { opacity: 1, rotateX: 0, transition: { duration: 0.8, ease: 'easeOut' } },
    },
    'flip-y': {
        hidden: { opacity: 0, rotateY: 90 },
        visible: { opacity: 1, rotateY: 0, transition: { duration: 0.8, ease: 'easeOut' } },
    },
    bounce: {
        hidden: { opacity: 0, y: 60 },
        visible: {
            opacity: 1,
            y: 0,
            transition: {
                type: 'spring',
                stiffness: 300,
                damping: 15,
            },
        },
    },
};

export function AnimatedSection({
    animation,
    children,
    className = '',
    delay = 0,
    style,
}: AnimatedSectionProps) {
    const variants = animationVariants[animation] || animationVariants.none;

    return (
        <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={variants}
            transition={{ delay }}
            className={className}
            style={style}
        >
            {children}
        </motion.div>
    );
}

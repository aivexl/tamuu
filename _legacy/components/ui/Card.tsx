import React from 'react';
import { cn } from '@/lib/utils/cn';

interface CardProps {
    children: React.ReactNode;
    className?: string;
    variant?: 'default' | 'glass' | 'elevated';
    hover?: boolean;
}

export const Card: React.FC<CardProps> = ({
    children,
    className,
    variant = 'default',
    hover = false
}) => {
    const variants = {
        default: 'bg-white border border-gray-200',
        glass: 'bg-white/80 backdrop-blur-md border border-white/20',
        elevated: 'bg-white shadow-xl',
    };

    return (
        <div
            className={cn(
                'rounded-xl p-6 transition-all duration-200',
                variants[variant],
                hover && 'hover:shadow-2xl hover:scale-[1.02]',
                className
            )}
        >
            {children}
        </div>
    );
};

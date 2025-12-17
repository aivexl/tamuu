'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils/cn';

interface ToggleProps {
    checked: boolean;
    onChange: (checked: boolean) => void;
    disabled?: boolean;
    className?: string;
}

export const Toggle: React.FC<ToggleProps> = ({ checked, onChange, disabled, className }) => {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            disabled={disabled}
            onClick={() => onChange(!checked)}
            className={cn(
                'relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2',
                checked ? 'bg-teal-500' : 'bg-gray-300',
                disabled && 'opacity-50 cursor-not-allowed',
                className
            )}
        >
            <motion.span
                className="inline-block h-5 w-5 rounded-full bg-white shadow-lg"
                initial={false}
                animate={{ x: checked ? 20 : 2 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            />
        </button>
    );
};

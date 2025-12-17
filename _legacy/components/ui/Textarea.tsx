import React from 'react';
import { cn } from '@/lib/utils/cn';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    label?: string;
    error?: string;
    helperText?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
    ({ className, label, error, helperText, ...props }, ref) => {
        return (
            <div className="w-full">
                {label && (
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        {label}
                        {props.required && <span className="text-red-500 ml-1">*</span>}
                    </label>
                )}
                <textarea
                    ref={ref}
                    className={cn(
                        'w-full px-4 py-2.5 rounded-lg border transition-all duration-200 resize-none',
                        'focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent',
                        'placeholder:text-gray-400',
                        error
                            ? 'border-red-500 focus:ring-red-500'
                            : 'border-gray-300 hover:border-gray-400',
                        props.disabled && 'bg-gray-100 cursor-not-allowed opacity-60',
                        className
                    )}
                    rows={4}
                    {...props}
                />
                {error && (
                    <p className="mt-1 text-sm text-red-600">{error}</p>
                )}
                {helperText && !error && (
                    <p className="mt-1 text-sm text-gray-500">{helperText}</p>
                )}
            </div>
        );
    }
);

Textarea.displayName = 'Textarea';

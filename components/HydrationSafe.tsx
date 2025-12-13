import React from 'react';

interface HydrationSafeProps {
    children: React.ReactNode;
    className?: string;
    as?: keyof JSX.IntrinsicElements;
}

/**
 * HydrationSafe Component
 *
 * A wrapper component that suppresses hydration warnings for elements
 * that may be modified by browser extensions or external scripts.
 * This prevents console noise from cosmetic attribute additions.
 */
export function HydrationSafe({
    children,
    className = '',
    as: Component = 'div'
}: HydrationSafeProps) {
    return React.createElement(
        Component,
        {
            className,
            suppressHydrationWarning: true,
        },
        children
    );
}

/**
 * HydrationSafeSection Component
 *
 * Specialized wrapper for main content sections that are commonly
 * affected by browser extensions.
 */
export function HydrationSafeSection({
    children,
    className = '',
    ...props
}: Omit<HydrationSafeProps, 'as'>) {
    return (
        <HydrationSafe
            as="section"
            className={className}
            {...props}
        >
            {children}
        </HydrationSafe>
    );
}

/**
 * HydrationSafeContainer Component
 *
 * Wrapper for main containers and layouts.
 */
export function HydrationSafeContainer({
    children,
    className = '',
    ...props
}: Omit<HydrationSafeProps, 'as'>) {
    return (
        <HydrationSafe
            as="div"
            className={className}
            {...props}
        >
            {children}
        </HydrationSafe>
    );
}


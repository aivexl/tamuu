'use client';

import { useState, useEffect, useRef, RefObject } from 'react';

interface UseInViewOptions {
    threshold?: number;
    rootMargin?: string;
    triggerOnce?: boolean;
}

/**
 * useInView Hook
 * 
 * Uses the Intersection Observer API to detect when an element is visible in the viewport.
 * 
 * @param options - Configuration options
 * @param options.threshold - Percentage of element visibility to trigger (0-1, default 0.1)
 * @param options.rootMargin - Margin around the root (default "0px")
 * @param options.triggerOnce - If true, only triggers once (default true)
 * 
 * @returns { ref, inView } - Attach `ref` to the element, use `inView` to conditionally apply animations
 */
export function useInView<T extends HTMLElement = HTMLDivElement>(
    options: UseInViewOptions = {}
): { ref: RefObject<T | null>; inView: boolean } {
    const { threshold = 0.1, rootMargin = '0px', triggerOnce = true } = options;
    const [inView, setInView] = useState(false);
    const ref = useRef<T | null>(null);
    const hasTriggered = useRef(false);

    useEffect(() => {
        const element = ref.current;
        if (!element) return;

        // If triggerOnce is enabled and already triggered, skip observer
        if (triggerOnce && hasTriggered.current) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setInView(true);
                    hasTriggered.current = true;
                    if (triggerOnce) {
                        observer.disconnect();
                    }
                } else if (!triggerOnce) {
                    setInView(false);
                }
            },
            { threshold, rootMargin }
        );

        observer.observe(element);

        return () => {
            observer.disconnect();
        };
    }, [threshold, rootMargin, triggerOnce]);

    return { ref, inView };
}

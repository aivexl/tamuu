'use client';

import React, { useState, useEffect } from 'react';

interface ClientOnlyProps {
    children: React.ReactNode;
}

/**
 * ClientOnly Component
 * 
 * This component ensures that its children are only rendered on the client-side.
 * It is useful for wrapping components that rely on browser-specific APIs (like window, localStorage)
 * or to prevent hydration mismatches caused by browser extensions.
 * 
 * Usage:
 * <ClientOnly>
 *   <YourClientSideComponent />
 * </ClientOnly>
 */
export function ClientOnly({ children }: ClientOnlyProps) {
    const [hasMounted, setHasMounted] = useState(false);

    useEffect(() => {
        setHasMounted(true);
    }, []);

    if (!hasMounted) {
        return null;
    }

    return <>{children}</>;
}

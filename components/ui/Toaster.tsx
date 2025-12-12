'use client';

import { useToast, Toast } from '@/components/ui/use-toast';

export function Toaster() {
    const { toasts, dismiss } = useToast();

    return (
        <div className="fixed bottom-0 right-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px] gap-2 pointer-events-none">
            {toasts.map(function ({ id, title, description, action, variant, onDismiss, ...props }) {
                return (
                    <Toast
                        key={id}
                        id={id}
                        title={title as string}
                        description={description as string}
                        variant={variant}
                        onDismiss={dismiss}
                        {...props}
                    />
                );
            })}
        </div>
    );
}

'use client';

import React from 'react';
import { GuestWishesConfig, RSVPResponse } from '@/lib/types';

interface GuestWishesProps {
    config: GuestWishesConfig;
    wishes: RSVPResponse[];
    className?: string;
}

// Format relative time
const formatRelativeTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Baru saja';
    if (diffMins < 60) return `${diffMins} menit lalu`;
    if (diffHours < 24) return `${diffHours} jam lalu`;
    if (diffDays < 7) return `${diffDays} hari lalu`;
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
};

// List layout
const ListLayout: React.FC<{ wishes: RSVPResponse[]; config: GuestWishesConfig }> = ({ wishes, config }) => (
    <div className="space-y-4">
        {wishes.map((wish) => (
            <div
                key={wish.id}
                className="p-4 rounded-xl transition-all hover:shadow-md"
                style={{
                    backgroundColor: config.cardBackgroundColor,
                    border: `1px solid ${config.cardBorderColor}`
                }}
            >
                <div className="flex items-start gap-3">
                    <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold shrink-0"
                        style={{
                            backgroundColor: config.cardBorderColor,
                            color: config.textColor
                        }}
                    >
                        {wish.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold" style={{ color: config.textColor }}>
                                {wish.name}
                            </span>
                            {config.showTimestamp && (
                                <span className="text-xs opacity-60" style={{ color: config.textColor }}>
                                    • {formatRelativeTime(wish.createdAt)}
                                </span>
                            )}
                        </div>
                        <p className="text-sm" style={{ color: config.textColor }}>
                            {wish.message}
                        </p>
                    </div>
                </div>
            </div>
        ))}
    </div>
);

// Grid layout
const GridLayout: React.FC<{ wishes: RSVPResponse[]; config: GuestWishesConfig }> = ({ wishes, config }) => (
    <div className="grid grid-cols-2 gap-3">
        {wishes.map((wish) => (
            <div
                key={wish.id}
                className="p-4 rounded-xl transition-all hover:shadow-md"
                style={{
                    backgroundColor: config.cardBackgroundColor,
                    border: `1px solid ${config.cardBorderColor}`
                }}
            >
                <div className="flex items-center gap-2 mb-2">
                    <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                        style={{
                            backgroundColor: config.cardBorderColor,
                            color: config.textColor
                        }}
                    >
                        {wish.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-semibold text-sm truncate" style={{ color: config.textColor }}>
                        {wish.name}
                    </span>
                </div>
                <p className="text-sm line-clamp-3" style={{ color: config.textColor }}>
                    {wish.message}
                </p>
                {config.showTimestamp && (
                    <div className="text-xs opacity-60 mt-2" style={{ color: config.textColor }}>
                        {formatRelativeTime(wish.createdAt)}
                    </div>
                )}
            </div>
        ))}
    </div>
);

// Masonry layout
const MasonryLayout: React.FC<{ wishes: RSVPResponse[]; config: GuestWishesConfig }> = ({ wishes, config }) => (
    <div className="columns-2 gap-3 space-y-3">
        {wishes.map((wish) => (
            <div
                key={wish.id}
                className="p-4 rounded-xl transition-all hover:shadow-md break-inside-avoid"
                style={{
                    backgroundColor: config.cardBackgroundColor,
                    border: `1px solid ${config.cardBorderColor}`
                }}
            >
                <div className="flex items-center gap-2 mb-2">
                    <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                        style={{
                            backgroundColor: config.cardBorderColor,
                            color: config.textColor
                        }}
                    >
                        {wish.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-semibold text-sm" style={{ color: config.textColor }}>
                        {wish.name}
                    </span>
                </div>
                <p className="text-sm" style={{ color: config.textColor }}>
                    {wish.message}
                </p>
                {config.showTimestamp && (
                    <div className="text-xs opacity-60 mt-2" style={{ color: config.textColor }}>
                        {formatRelativeTime(wish.createdAt)}
                    </div>
                )}
            </div>
        ))}
    </div>
);

export const GuestWishes: React.FC<GuestWishesProps> = ({ config, wishes, className = '' }) => {
    // Filter to only public wishes and limit count
    const displayWishes = wishes
        .filter(w => w.isPublic)
        .slice(0, config.maxDisplayCount);

    if (displayWishes.length === 0) {
        return (
            <div
                className={`p-6 rounded-xl text-center ${className}`}
                style={{ backgroundColor: config.backgroundColor, color: config.textColor }}
            >
                <div className="text-4xl mb-3">💝</div>
                <p className="opacity-75">Jadilah yang pertama mengirim ucapan!</p>
            </div>
        );
    }

    return (
        <div
            className={`p-4 rounded-xl overflow-y-auto max-h-[400px] ${className}`}
            style={{ backgroundColor: config.backgroundColor }}
        >
            {config.layout === 'list' && <ListLayout wishes={displayWishes} config={config} />}
            {config.layout === 'grid' && <GridLayout wishes={displayWishes} config={config} />}
            {config.layout === 'masonry' && <MasonryLayout wishes={displayWishes} config={config} />}
        </div>
    );
};

// Default guest wishes config
export const getDefaultGuestWishesConfig = (): GuestWishesConfig => ({
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    textColor: '#333333',
    cardBackgroundColor: '#ffffff',
    cardBorderColor: '#e5e5e5',
    showTimestamp: true,
    maxDisplayCount: 20,
    layout: 'list',
});

export default GuestWishes;

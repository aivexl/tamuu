'use client';

import React from 'react';
import {
    Settings,
    Palette,
    Music,
    Image,
    MessageSquare,
    Eye,
    Send,
    BookOpen,
    Mail
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { useInvitationStore } from '@/lib/store';

interface MenuItem {
    id: string;
    label: string;
    icon: React.ElementType;
    color: string;
    bgColor: string;
}

const menuItems: MenuItem[] = [
    { id: 'theme', label: 'Tema', icon: Palette, color: 'text-purple-600', bgColor: 'bg-purple-100' },
    { id: 'music', label: 'Music', icon: Music, color: 'text-orange-600', bgColor: 'bg-orange-100' },
    { id: 'background', label: 'Background', icon: Image, color: 'text-pink-600', bgColor: 'bg-pink-100' },
    { id: 'rsvp', label: 'RSVP', icon: MessageSquare, color: 'text-blue-600', bgColor: 'bg-blue-100' },
    { id: 'greeting', label: 'Layar Sapa', icon: Mail, color: 'text-green-600', bgColor: 'bg-green-100' },
    { id: 'preview', label: 'Preview', icon: Eye, color: 'text-indigo-600', bgColor: 'bg-indigo-100' },
    { id: 'send', label: 'Kirim', icon: Send, color: 'text-teal-600', bgColor: 'bg-teal-100' },
    { id: 'settings', label: 'Pengaturan', icon: Settings, color: 'text-gray-600', bgColor: 'bg-gray-100' },
    { id: 'guestbook', label: 'Buku Tamu', icon: BookOpen, color: 'text-amber-600', bgColor: 'bg-amber-100' },
];

export const IconGridMenu: React.FC = () => {
    const setActivePanel = useInvitationStore((state) => state.setActivePanel);

    const handleMenuClick = (id: string) => {
        setActivePanel(id);
    };

    return (
        <div className="grid grid-cols-3 gap-4">
            {menuItems.map((item) => {
                const Icon = item.icon;
                return (
                    <button
                        key={item.id}
                        onClick={() => handleMenuClick(item.id)}
                        className={cn(
                            'flex flex-col items-center gap-2 p-4 rounded-xl transition-all duration-200',
                            'hover:shadow-lg hover:scale-105 bg-white border border-gray-100'
                        )}
                    >
                        <div className={cn('p-3 rounded-lg', item.bgColor)}>
                            <Icon className={cn('w-6 h-6', item.color)} />
                        </div>
                        <span className="text-sm font-medium text-gray-700">{item.label}</span>
                    </button>
                );
            })}
        </div>
    );
};

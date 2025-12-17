'use client';

import React, { useState } from 'react';
import { ArrowLeft, Palette, Settings } from 'lucide-react';
import { useInvitationStore } from '@/lib/store';
import { useTemplateStore } from '@/lib/template-store';
import { Button } from '@/components/ui/Button';
import { TemplateSelector } from './TemplateSelector';

export const DashboardHeader: React.FC = () => {
    const invitation = useInvitationStore((state) => state.invitation);
    const templates = useTemplateStore((state) => state.templates);
    const [showTemplateSelector, setShowTemplateSelector] = useState(false);

    const currentTemplate = templates.find((t) => t.id === invitation.templateId);

    return (
        <>
            <div className="bg-white border-b border-gray-200 px-6 py-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                            <ArrowLeft className="w-5 h-5 text-gray-700" />
                        </button>
                        <div>
                            <h1 className="text-xl font-semibold text-gray-900">{invitation.title}</h1>
                            <p className="text-sm text-gray-500">
                                {currentTemplate ? `Template: ${currentTemplate.name}` : 'No template selected'}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowTemplateSelector(true)}
                            className="flex items-center gap-2"
                        >
                            <Palette size={16} />
                            Change Template
                        </Button>
                        <Button variant="ghost" size="sm">
                            <Settings size={16} />
                        </Button>
                    </div>
                </div>
            </div>
            <TemplateSelector
                isOpen={showTemplateSelector}
                onClose={() => setShowTemplateSelector(false)}
            />
        </>
    );
};

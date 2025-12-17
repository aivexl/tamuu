'use client';

import React from 'react';
import { Button } from '@/components/ui/Button';
import { X, ChevronRight, Layers } from 'lucide-react';
import { SectionType } from '@/lib/types';

interface SectionOption {
    id: string;
    label: string;
    isPreview?: boolean;
}

interface SectionSelectModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (sectionId: string) => void;
    title: string;
    sections: SectionOption[];
    description?: string;
}

export const SectionSelectModal: React.FC<SectionSelectModalProps> = ({
    isOpen,
    onClose,
    onSelect,
    title,
    sections,
    description
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between p-4 border-b border-gray-100">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
                        {description && <p className="text-sm text-gray-500 mt-0.5">{description}</p>}
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 rounded-full hover:bg-gray-100 text-gray-500 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="p-2 max-h-[60vh] overflow-y-auto">
                    <div className="grid gap-2">
                        {sections.map((section) => (
                            <button
                                key={section.id}
                                onClick={() => onSelect(section.id)}
                                className="flex items-center justify-between w-full p-3 rounded-lg text-left hover:bg-blue-50 group border border-transparent hover:border-blue-100 transition-all"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-gray-50 rounded-lg group-hover:bg-blue-100/50 text-gray-400 group-hover:text-blue-600 transition-colors">
                                        <Layers size={18} />
                                    </div>
                                    <span className="font-medium text-gray-700 group-hover:text-blue-700">
                                        {section.label}
                                    </span>
                                </div>
                                <ChevronRight size={16} className="text-gray-300 group-hover:text-blue-400" />
                            </button>
                        ))}
                    </div>
                </div>

                <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end">
                    <Button variant="outline" onClick={onClose}>
                        Cancel
                    </Button>
                </div>
            </div>
        </div>
    );
};

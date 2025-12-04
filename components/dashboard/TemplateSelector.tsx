'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTemplateStore } from '@/lib/template-store';
import { useInvitationStore } from '@/lib/store';
import { Button } from '@/components/ui/Button';
import { X, Check, Sparkles } from 'lucide-react';

interface TemplateSelectorProps {
    isOpen: boolean;
    onClose: () => void;
}

export function TemplateSelector({ isOpen, onClose }: TemplateSelectorProps) {
    const templates = useTemplateStore((state) => state.templates);
    const invitation = useInvitationStore((state) => state.invitation);
    const updateTemplateId = useInvitationStore((state) => state.updateTemplateId);

    const [selectedId, setSelectedId] = useState<string | null>(invitation.templateId || null);

    const handleApply = () => {
        if (selectedId) {
            updateTemplateId(selectedId);
        }
        onClose();
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: 20 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="bg-white rounded-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                                    <Sparkles className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900">Choose Template</h2>
                                    <p className="text-sm text-gray-500">Select a design for your invitation</p>
                                </div>
                            </div>
                            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                                <X size={24} />
                            </button>
                        </div>

                        {/* Grid */}
                        <div className="p-6 overflow-y-auto max-h-[calc(85vh-160px)]">
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                {templates.map((template) => (
                                    <motion.div
                                        key={template.id}
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => setSelectedId(template.id)}
                                        className={`relative cursor-pointer rounded-xl overflow-hidden border-2 transition-all duration-200 ${selectedId === template.id
                                                ? 'border-purple-500 ring-4 ring-purple-500/20'
                                                : 'border-gray-200 hover:border-gray-300'
                                            }`}
                                    >
                                        <img
                                            src={template.thumbnail}
                                            alt={template.name}
                                            className="w-full aspect-[3/4] object-cover"
                                        />
                                        {/* Overlay */}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                                        {/* Check icon */}
                                        {selectedId === template.id && (
                                            <motion.div
                                                initial={{ scale: 0 }}
                                                animate={{ scale: 1 }}
                                                className="absolute top-3 right-3 w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center"
                                            >
                                                <Check className="w-5 h-5 text-white" />
                                            </motion.div>
                                        )}
                                        {/* Name */}
                                        <div className="absolute bottom-0 left-0 right-0 p-4">
                                            <h3 className="font-semibold text-white">{template.name}</h3>
                                            <p className="text-xs text-white/70">
                                                {Object.keys(template.sections).length} animations
                                            </p>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>

                            {templates.length === 0 && (
                                <div className="text-center py-16">
                                    <p className="text-gray-500">No templates available.</p>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-4 border-t border-gray-100 flex justify-end gap-3">
                            <Button variant="outline" onClick={onClose}>
                                Cancel
                            </Button>
                            <Button onClick={handleApply} disabled={!selectedId}>
                                Apply Template
                            </Button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

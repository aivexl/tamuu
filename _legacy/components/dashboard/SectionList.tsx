'use client';

import React, { useState, useEffect } from 'react';
import { GripVertical, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Toggle } from '@/components/ui/Toggle';
import { useInvitationStore } from '@/lib/store';
import { cn } from '@/lib/utils/cn';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { SectionEditor } from './SectionEditor';

export const SectionList: React.FC = () => {
    const invitation = useInvitationStore((state) => state.invitation);
    const toggleSectionVisibility = useInvitationStore((state) => state.toggleSectionVisibility);
    const reorderSections = useInvitationStore((state) => state.reorderSections);

    // Local state for expanded sections (accordion)
    const [expandedSectionId, setExpandedSectionId] = useState<string | null>(null);

    // Hydration check for DnD
    const [isMounted, setIsMounted] = useState(false);
    useEffect(() => {
        setIsMounted(true);
    }, []);

    const handleDragEnd = (result: DropResult) => {
        if (!result.destination) return;

        const items = Array.from(invitation.sections);
        const [reorderedItem] = items.splice(result.source.index, 1);
        items.splice(result.destination.index, 0, reorderedItem);

        // Update order property
        const updatedItems = items.map((item, index) => ({
            ...item,
            order: index + 1
        }));

        reorderSections(updatedItems);
    };

    const toggleExpand = (sectionId: string) => {
        setExpandedSectionId(expandedSectionId === sectionId ? null : sectionId);
    };

    if (!isMounted) {
        return null; // Prevent hydration mismatch
    }

    return (
        <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="sections">
                {(provided) => (
                    <div
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                        className="space-y-3"
                    >
                        {invitation.sections.map((section, index) => (
                            <Draggable key={section.id} draggableId={section.id} index={index}>
                                {(provided, snapshot) => (
                                    <div
                                        ref={provided.innerRef}
                                        {...provided.draggableProps}
                                        className={cn(
                                            'bg-white rounded-lg border transition-all duration-200',
                                            snapshot.isDragging ? 'shadow-lg ring-2 ring-blue-500/20 z-50' : 'hover:shadow-md'
                                        )}
                                    >
                                        {/* Header Row */}
                                        <div className="flex items-center gap-3 p-3">
                                            <div
                                                {...provided.dragHandleProps}
                                                className="text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing p-1"
                                            >
                                                <GripVertical className="w-5 h-5" />
                                            </div>

                                            <div className="flex-1 text-sm font-medium text-gray-700 capitalize flex items-center gap-2">
                                                {section.type === 'maps' && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Maps</span>}
                                                {section.title}
                                            </div>

                                            <Toggle
                                                checked={section.isVisible}
                                                onChange={() => toggleSectionVisibility(section.id)}
                                            />

                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => toggleExpand(section.id)}
                                                className={cn(
                                                    "bg-gray-100 text-gray-700 hover:bg-gray-200 min-w-[70px]",
                                                    expandedSectionId === section.id && "bg-blue-50 text-blue-600"
                                                )}
                                            >
                                                {expandedSectionId === section.id ? 'Close' : 'Edit'}
                                            </Button>
                                        </div>

                                        {/* Expanded Editor Area */}
                                        {expandedSectionId === section.id && (
                                            <div className="border-t p-4 bg-gray-50/50 rounded-b-lg animate-in slide-in-from-top-2 duration-200">
                                                <SectionEditor section={section} />
                                            </div>
                                        )}
                                    </div>
                                )}
                            </Draggable>
                        ))}
                        {provided.placeholder}
                    </div>
                )}
            </Droppable>
        </DragDropContext>
    );
};

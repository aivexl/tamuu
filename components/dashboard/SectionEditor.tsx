import React from 'react';
import { InvitationSection } from '@/lib/types';
import { useInvitationStore } from '@/lib/store';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { Image as ImageIcon, Upload } from 'lucide-react';

interface SectionEditorProps {
    section: InvitationSection;
}

export function SectionEditor({ section }: SectionEditorProps) {
    const updateSection = useInvitationStore((state) => state.updateSection);

    const handleTextChange = (key: string, value: string) => {
        updateSection(section.id, {
            data: {
                ...section.data,
                [key]: value,
            },
        });
    };

    // Helper to render text inputs for generic data fields
    const renderTextFields = () => {
        // Filter out non-text fields or complex objects for this simple editor
        // In a real app, you'd have specific forms for each section type
        // For this task, "user hanya bisa mengedit kalimatnya" (user can only edit sentences)
        // So we'll try to find string properties in the data object.

        return Object.entries(section.data).map(([key, value]) => {
            if (typeof value === 'string' && key !== 'id' && key !== 'type' && key !== 'image') {
                // Use Textarea for longer text, Input for shorter
                const isLongText = value.length > 50 || key === 'message' || key === 'quote';

                return (
                    <div key={key} className="space-y-2 mb-4">
                        <Label htmlFor={key} className="capitalize">
                            {key.replace(/([A-Z])/g, ' $1').trim()}
                        </Label>
                        {isLongText ? (
                            <Textarea
                                id={key}
                                value={value}
                                onChange={(e) => handleTextChange(key, e.target.value)}
                                className="min-h-[100px]"
                            />
                        ) : (
                            <Input
                                id={key}
                                value={value}
                                onChange={(e) => handleTextChange(key, e.target.value)}
                            />
                        )}
                    </div>
                );
            }
            return null;
        });
    };

    const renderMapsEditor = () => {
        // Maps specific editor: Image Upload + Text
        const mapsData = section.data as any; // Cast to any for easier access to specific fields

        return (
            <div className="space-y-6">
                {/* Image Upload Area */}
                <div className="space-y-2">
                    <Label>Location Image</Label>
                    <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 flex flex-col items-center justify-center bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer">
                        {mapsData.image ? (
                            <div className="relative w-full aspect-video mb-4">
                                <img
                                    src={mapsData.image}
                                    alt="Location"
                                    className="w-full h-full object-cover rounded-md"
                                />
                                <Button
                                    variant="destructive"
                                    size="sm"
                                    className="absolute top-2 right-2"
                                    onClick={() => handleTextChange('image', '')}
                                >
                                    Remove
                                </Button>
                            </div>
                        ) : (
                            <div className="text-center">
                                <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-3">
                                    <Upload size={24} />
                                </div>
                                <p className="text-sm font-medium text-gray-900">Click to upload image</p>
                                <p className="text-xs text-gray-500 mt-1">SVG, PNG, JPG or GIF (max. 2MB)</p>
                                {/* Mock Input for URL since we don't have backend */}
                                <div className="mt-4 flex gap-2">
                                    <Input
                                        placeholder="Or paste image URL..."
                                        onChange={(e) => handleTextChange('image', e.target.value)}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Standard Text Fields for Maps */}
                {renderTextFields()}
            </div>
        );
    };

    return (
        <div className="p-4 bg-white border rounded-lg shadow-sm mt-2">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                Edit {section.title}
            </h3>

            {section.type === 'maps' ? renderMapsEditor() : renderTextFields()}

            <div className="flex justify-end mt-4">
                <Button variant="outline" size="sm">
                    Reset to Default
                </Button>
            </div>
        </div>
    );
}

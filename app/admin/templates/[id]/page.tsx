'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTemplateStore } from '@/lib/template-store';
import { SectionType, AnimationType, TemplateElement, TextStyle } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Card } from '@/components/ui/Card';
import {
    ArrowLeft, Save, Play, Image as ImageIcon, Type, Trash2, Upload,
    Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight,
    Layers, ChevronUp, ChevronDown, ChevronsUp, ChevronsDown,
    AlignVerticalJustifyStart, AlignVerticalJustifyCenter, AlignVerticalJustifyEnd,
    AlignHorizontalJustifyStart, AlignHorizontalJustifyCenter, AlignHorizontalJustifyEnd,
    Move, GripVertical
} from 'lucide-react';

const SECTION_TYPES: SectionType[] = ['opening', 'quotes', 'couple', 'event', 'maps', 'rsvp', 'thanks'];
const ANIMATION_TYPES: AnimationType[] = [
    'none', 'fade-in', 'slide-up', 'slide-down', 'slide-left', 'slide-right',
    'zoom-in', 'zoom-out', 'flip-x', 'flip-y', 'bounce'
];
const FONT_FAMILIES = [
    'Inter', 'Roboto', 'Playfair Display', 'Cormorant Garamond',
    'Montserrat', 'Poppins', 'Lora', 'Dancing Script', 'Great Vibes', 'Satisfy'
];
const FONT_SIZES = [12, 14, 16, 18, 20, 24, 28, 32, 36, 42, 48, 56, 64, 72];

const CANVAS_WIDTH = 375;
const CANVAS_HEIGHT = 667;

type ResizeHandle = 'nw' | 'n' | 'ne' | 'w' | 'e' | 'sw' | 's' | 'se' | null;

export default function TemplateEditorPage() {
    const params = useParams();
    const router = useRouter();
    const templateId = params.id as string;
    const canvasRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const templates = useTemplateStore((state) => state.templates);
    const updateTemplate = useTemplateStore((state) => state.updateTemplate);
    const updateSectionDesign = useTemplateStore((state) => state.updateSectionDesign);
    const addElement = useTemplateStore((state) => state.addElement);
    const updateElement = useTemplateStore((state) => state.updateElement);
    const deleteElement = useTemplateStore((state) => state.deleteElement);
    const reorderElements = useTemplateStore((state) => state.reorderElements);
    const selectedElementId = useTemplateStore((state) => state.selectedElementId);
    const setSelectedElement = useTemplateStore((state) => state.setSelectedElement);

    const template = templates.find((t) => t.id === templateId);

    const [activeSection, setActiveSection] = useState<SectionType>('opening');
    const [templateName, setTemplateName] = useState('');
    const [previewKey, setPreviewKey] = useState(0);
    const [activeTab, setActiveTab] = useState<'elements' | 'layers'>('elements');
    const [draggingElementId, setDraggingElementId] = useState<string | null>(null);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [resizing, setResizing] = useState<{ elementId: string; handle: ResizeHandle; startX: number; startY: number; startPos: { x: number; y: number }; startSize: { width: number; height: number } } | null>(null);
    const lastClickRef = useRef<{ id: string; time: number } | null>(null);

    useEffect(() => {
        if (template) {
            setTemplateName(template.name);
        }
    }, [template]);

    if (!template) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-900">
                <p className="text-slate-500">Template not found.</p>
            </div>
        );
    }

    const currentDesign = template.sections[activeSection] || { animation: 'fade-in', elements: [] };
    const elements = currentDesign.elements || [];
    const selectedElement = elements.find((el) => el.id === selectedElementId);
    const sortedElements = [...elements].sort((a, b) => a.zIndex - b.zIndex);

    const handleDesignChange = (key: string, value: any) => {
        updateSectionDesign(templateId, activeSection, { [key]: value });
    };

    const handleAddElement = (type: 'image' | 'text') => {
        const maxZ = elements.length > 0 ? Math.max(...elements.map((el) => el.zIndex)) : 0;
        const newElement: TemplateElement = {
            id: `el-${Date.now()}`,
            type,
            name: type === 'image' ? 'New Image' : 'New Text',
            position: { x: (CANVAS_WIDTH - (type === 'image' ? 200 : 280)) / 2, y: 100 },
            size: { width: type === 'image' ? 200 : 280, height: type === 'image' ? 150 : 50 },
            animation: 'fade-in',
            zIndex: maxZ + 1,
            ...(type === 'image' ? { imageUrl: '' } : {
                content: 'Enter your text here',
                textStyle: {
                    fontFamily: 'Inter',
                    fontSize: 18,
                    fontWeight: 'normal',
                    fontStyle: 'normal',
                    textDecoration: 'none',
                    textAlign: 'center',
                    color: '#000000',
                },
            }),
        };
        addElement(templateId, activeSection, newElement);
        setSelectedElement(newElement.id);
    };

    const handleElementChange = (key: string, value: any) => {
        if (!selectedElementId) return;
        updateElement(templateId, activeSection, selectedElementId, { [key]: value });
    };

    const handleTextStyleChange = (key: keyof TextStyle, value: any) => {
        if (!selectedElement || selectedElement.type !== 'text') return;
        updateElement(templateId, activeSection, selectedElementId!, {
            textStyle: { ...selectedElement.textStyle!, [key]: value },
        });
    };

    const handlePositionChange = (axis: 'x' | 'y', value: number) => {
        if (!selectedElement) return;
        updateElement(templateId, activeSection, selectedElementId!, {
            position: { ...selectedElement.position, [axis]: value },
        });
    };

    const handleSizeChange = (dim: 'width' | 'height', value: number) => {
        if (!selectedElement) return;
        updateElement(templateId, activeSection, selectedElementId!, {
            size: { ...selectedElement.size, [dim]: value },
        });
    };

    // Image upload handler
    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !selectedElementId) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const dataUrl = event.target?.result as string;
            updateElement(templateId, activeSection, selectedElementId, { imageUrl: dataUrl });
        };
        reader.readAsDataURL(file);
        e.target.value = ''; // Reset input
    };

    // Alignment functions
    const alignElement = (alignment: 'left' | 'center-h' | 'right' | 'top' | 'center-v' | 'bottom') => {
        if (!selectedElement) return;
        let newPos = { ...selectedElement.position };
        switch (alignment) {
            case 'left': newPos.x = 0; break;
            case 'center-h': newPos.x = (CANVAS_WIDTH - selectedElement.size.width) / 2; break;
            case 'right': newPos.x = CANVAS_WIDTH - selectedElement.size.width; break;
            case 'top': newPos.y = 0; break;
            case 'center-v': newPos.y = (CANVAS_HEIGHT - selectedElement.size.height) / 2; break;
            case 'bottom': newPos.y = CANVAS_HEIGHT - selectedElement.size.height; break;
        }
        updateElement(templateId, activeSection, selectedElementId!, { position: newPos });
    };

    // Layer ordering functions
    const moveLayerUp = (elementId: string) => {
        const idx = sortedElements.findIndex((el) => el.id === elementId);
        if (idx < sortedElements.length - 1) {
            const current = sortedElements[idx];
            const above = sortedElements[idx + 1];
            // Swap zIndex values
            const newElements = elements.map((el) => {
                if (el.id === current.id) return { ...el, zIndex: above.zIndex };
                if (el.id === above.id) return { ...el, zIndex: current.zIndex };
                return el;
            });
            reorderElements(templateId, activeSection, newElements);
        }
    };

    const moveLayerDown = (elementId: string) => {
        const idx = sortedElements.findIndex((el) => el.id === elementId);
        if (idx > 0) {
            const current = sortedElements[idx];
            const below = sortedElements[idx - 1];
            // Swap zIndex values
            const newElements = elements.map((el) => {
                if (el.id === current.id) return { ...el, zIndex: below.zIndex };
                if (el.id === below.id) return { ...el, zIndex: current.zIndex };
                return el;
            });
            reorderElements(templateId, activeSection, newElements);
        }
    };

    const moveToTop = (elementId: string) => {
        const maxZ = Math.max(...elements.map((el) => el.zIndex));
        updateElement(templateId, activeSection, elementId, { zIndex: maxZ + 1 });
    };

    const moveToBottom = (elementId: string) => {
        const minZ = Math.min(...elements.map((el) => el.zIndex));
        updateElement(templateId, activeSection, elementId, { zIndex: minZ - 1 });
    };

    // Drag handlers with double-click detection
    const handleMouseDown = (e: React.MouseEvent, elementId: string) => {
        e.stopPropagation();
        const el = elements.find((el) => el.id === elementId);
        if (!el || !canvasRef.current) return;

        const now = Date.now();
        const lastClick = lastClickRef.current;

        // Check for double-click (same element, within 300ms)
        if (lastClick && lastClick.id === elementId && now - lastClick.time < 300) {
            // Double-click detected - deselect
            setSelectedElement(null);
            lastClickRef.current = null;
            return;
        }

        // Single click - select and prepare for drag
        lastClickRef.current = { id: elementId, time: now };

        const rect = canvasRef.current.getBoundingClientRect();
        setDraggingElementId(elementId);
        setDragOffset({
            x: e.clientX - rect.left - el.position.x,
            y: e.clientY - rect.top - el.position.y,
        });
        setSelectedElement(elementId);
    };

    // Resize handlers
    const handleResizeStart = (e: React.MouseEvent, elementId: string, handle: ResizeHandle) => {
        e.stopPropagation();
        const el = elements.find((el) => el.id === elementId);
        if (!el) return;

        setResizing({
            elementId,
            handle,
            startX: e.clientX,
            startY: e.clientY,
            startPos: { ...el.position },
            startSize: { ...el.size },
        });
        setSelectedElement(elementId);
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (resizing && canvasRef.current) {
            const dx = e.clientX - resizing.startX;
            const dy = e.clientY - resizing.startY;
            const el = elements.find((el) => el.id === resizing.elementId);
            if (!el) return;

            let newPos = { ...resizing.startPos };
            let newSize = { ...resizing.startSize };

            switch (resizing.handle) {
                case 'se':
                    newSize.width = Math.max(30, resizing.startSize.width + dx);
                    newSize.height = Math.max(30, resizing.startSize.height + dy);
                    break;
                case 'sw':
                    newPos.x = resizing.startPos.x + dx;
                    newSize.width = Math.max(30, resizing.startSize.width - dx);
                    newSize.height = Math.max(30, resizing.startSize.height + dy);
                    break;
                case 'ne':
                    newPos.y = resizing.startPos.y + dy;
                    newSize.width = Math.max(30, resizing.startSize.width + dx);
                    newSize.height = Math.max(30, resizing.startSize.height - dy);
                    break;
                case 'nw':
                    newPos.x = resizing.startPos.x + dx;
                    newPos.y = resizing.startPos.y + dy;
                    newSize.width = Math.max(30, resizing.startSize.width - dx);
                    newSize.height = Math.max(30, resizing.startSize.height - dy);
                    break;
                case 'n':
                    newPos.y = resizing.startPos.y + dy;
                    newSize.height = Math.max(30, resizing.startSize.height - dy);
                    break;
                case 's':
                    newSize.height = Math.max(30, resizing.startSize.height + dy);
                    break;
                case 'w':
                    newPos.x = resizing.startPos.x + dx;
                    newSize.width = Math.max(30, resizing.startSize.width - dx);
                    break;
                case 'e':
                    newSize.width = Math.max(30, resizing.startSize.width + dx);
                    break;
            }

            updateElement(templateId, activeSection, resizing.elementId, {
                position: { x: Math.round(newPos.x), y: Math.round(newPos.y) },
                size: { width: Math.round(newSize.width), height: Math.round(newSize.height) },
            });
            return;
        }

        if (!draggingElementId || !canvasRef.current) return;

        const rect = canvasRef.current.getBoundingClientRect();
        let x = e.clientX - rect.left - dragOffset.x;
        let y = e.clientY - rect.top - dragOffset.y;

        updateElement(templateId, activeSection, draggingElementId, {
            position: { x: Math.round(x), y: Math.round(y) },
        });
    };

    const handleMouseUp = () => {
        setDraggingElementId(null);
        setResizing(null);
    };

    const handleSave = () => {
        updateTemplate(templateId, { name: templateName });
        alert('Template saved!');
    };

    // Resize handle component
    const ResizeHandles = ({ elementId }: { elementId: string }) => {
        const handleStyle = "absolute w-3 h-3 bg-blue-500 border border-white rounded-sm";
        return (
            <>
                <div className={`${handleStyle} -top-1.5 -left-1.5 cursor-nwse-resize`} onMouseDown={(e) => handleResizeStart(e, elementId, 'nw')} />
                <div className={`${handleStyle} -top-1.5 left-1/2 -translate-x-1/2 cursor-ns-resize`} onMouseDown={(e) => handleResizeStart(e, elementId, 'n')} />
                <div className={`${handleStyle} -top-1.5 -right-1.5 cursor-nesw-resize`} onMouseDown={(e) => handleResizeStart(e, elementId, 'ne')} />
                <div className={`${handleStyle} top-1/2 -translate-y-1/2 -left-1.5 cursor-ew-resize`} onMouseDown={(e) => handleResizeStart(e, elementId, 'w')} />
                <div className={`${handleStyle} top-1/2 -translate-y-1/2 -right-1.5 cursor-ew-resize`} onMouseDown={(e) => handleResizeStart(e, elementId, 'e')} />
                <div className={`${handleStyle} -bottom-1.5 -left-1.5 cursor-nesw-resize`} onMouseDown={(e) => handleResizeStart(e, elementId, 'sw')} />
                <div className={`${handleStyle} -bottom-1.5 left-1/2 -translate-x-1/2 cursor-ns-resize`} onMouseDown={(e) => handleResizeStart(e, elementId, 's')} />
                <div className={`${handleStyle} -bottom-1.5 -right-1.5 cursor-nwse-resize`} onMouseDown={(e) => handleResizeStart(e, elementId, 'se')} />
            </>
        );
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
            {/* Hidden file input */}
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageUpload}
            />

            {/* Header */}
            <header className="bg-slate-800/50 border-b border-slate-700 sticky top-0 z-20 backdrop-blur-sm">
                <div className="max-w-full mx-auto px-4 py-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button onClick={() => router.push('/admin/templates')} className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors" title="Back to Templates">
                                <ArrowLeft size={20} />
                            </button>
                            <Input
                                value={templateName}
                                onChange={(e) => setTemplateName(e.target.value)}
                                className="bg-slate-700 border-slate-600 text-white w-64"
                                placeholder="Template Name"
                            />
                        </div>
                        <div className="flex items-center gap-3">
                            <Button variant="outline" onClick={() => setPreviewKey((k) => k + 1)} className="flex items-center gap-2 text-slate-300 border-slate-600">
                                <Play size={16} />
                                Preview
                            </Button>
                            <Button onClick={handleSave} className="flex items-center gap-2">
                                <Save size={16} />
                                Save
                            </Button>
                        </div>
                    </div>
                </div>
            </header>

            <div className="flex h-[calc(100vh-57px)]">
                {/* Left Panel - Sections */}
                <aside className="w-48 bg-slate-800 border-r border-slate-700 p-3 overflow-y-auto">
                    <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Sections</h2>
                    <div className="space-y-1">
                        {SECTION_TYPES.map((sectionType) => (
                            <button
                                key={sectionType}
                                onClick={() => { setActiveSection(sectionType); setSelectedElement(null); }}
                                className={`w-full text-left px-3 py-2 rounded-lg capitalize text-sm transition-colors ${activeSection === sectionType
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                                    }`}
                            >
                                {sectionType}
                            </button>
                        ))}
                    </div>
                </aside>

                {/* Center-Left Panel - Elements/Layers */}
                <div className="w-72 bg-slate-800/50 border-r border-slate-700 flex flex-col overflow-hidden">
                    {/* Tabs */}
                    <div className="flex border-b border-slate-700">
                        <button
                            onClick={() => setActiveTab('elements')}
                            className={`flex-1 px-4 py-3 text-sm font-medium ${activeTab === 'elements' ? 'text-white border-b-2 border-blue-500' : 'text-slate-400'}`}
                        >
                            Elements
                        </button>
                        <button
                            onClick={() => setActiveTab('layers')}
                            className={`flex-1 px-4 py-3 text-sm font-medium flex items-center justify-center gap-2 ${activeTab === 'layers' ? 'text-white border-b-2 border-blue-500' : 'text-slate-400'}`}
                        >
                            <Layers size={14} /> Layers
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-3">
                        {activeTab === 'elements' && (
                            <>
                                {/* Add Element */}
                                <div className="mb-4">
                                    <h3 className="text-xs font-semibold text-slate-400 uppercase mb-2">Add Element</h3>
                                    <div className="flex gap-2">
                                        <Button size="sm" variant="outline" onClick={() => handleAddElement('image')} className="flex-1 text-slate-300 border-slate-600 text-xs py-2">
                                            <ImageIcon size={14} className="mr-1" /> Image
                                        </Button>
                                        <Button size="sm" variant="outline" onClick={() => handleAddElement('text')} className="flex-1 text-slate-300 border-slate-600 text-xs py-2">
                                            <Type size={14} className="mr-1" /> Text
                                        </Button>
                                    </div>
                                </div>

                                {/* Elements List */}
                                <div className="mb-4">
                                    <h3 className="text-xs font-semibold text-slate-400 uppercase mb-2">Elements</h3>
                                    <div className="space-y-1 max-h-32 overflow-y-auto">
                                        {elements.length === 0 && <p className="text-xs text-slate-500">No elements yet.</p>}
                                        {elements.map((el) => (
                                            <div
                                                key={el.id}
                                                onClick={() => setSelectedElement(el.id)}
                                                className={`flex items-center justify-between px-3 py-2 rounded cursor-pointer text-sm ${selectedElementId === el.id ? 'bg-blue-600 text-white' : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                                                    }`}
                                            >
                                                <span className="flex items-center gap-2 truncate">
                                                    {el.type === 'image' ? <ImageIcon size={14} /> : <Type size={14} />}
                                                    <span className="truncate">{el.name}</span>
                                                </span>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); deleteElement(templateId, activeSection, el.id); }}
                                                    className="text-red-400 hover:text-red-300 ml-2"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Element Editor */}
                                {selectedElement && (
                                    <div className="border-t border-slate-700 pt-3">
                                        <h3 className="text-sm font-semibold text-white mb-3">Edit: {selectedElement.name}</h3>

                                        {/* Name */}
                                        <div className="mb-3">
                                            <Label className="text-slate-300 text-xs">Name</Label>
                                            <Input value={selectedElement.name} onChange={(e) => handleElementChange('name', e.target.value)} className="mt-1 bg-slate-700 border-slate-600 text-white text-sm h-8" />
                                        </div>

                                        {/* Position */}
                                        <div className="mb-3">
                                            <Label className="text-slate-300 text-xs flex items-center gap-1"><Move size={12} /> Position</Label>
                                            <div className="flex gap-2 mt-1">
                                                <div className="flex-1">
                                                    <span className="text-xs text-slate-500">X</span>
                                                    <Input type="number" value={selectedElement.position.x} onChange={(e) => handlePositionChange('x', parseInt(e.target.value) || 0)} className="bg-slate-700 border-slate-600 text-white text-sm h-8" />
                                                </div>
                                                <div className="flex-1">
                                                    <span className="text-xs text-slate-500">Y</span>
                                                    <Input type="number" value={selectedElement.position.y} onChange={(e) => handlePositionChange('y', parseInt(e.target.value) || 0)} className="bg-slate-700 border-slate-600 text-white text-sm h-8" />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Size */}
                                        <div className="mb-3">
                                            <Label className="text-slate-300 text-xs">Size</Label>
                                            <div className="flex gap-2 mt-1">
                                                <div className="flex-1">
                                                    <span className="text-xs text-slate-500">W</span>
                                                    <Input type="number" value={selectedElement.size.width} onChange={(e) => handleSizeChange('width', parseInt(e.target.value) || 50)} className="bg-slate-700 border-slate-600 text-white text-sm h-8" />
                                                </div>
                                                <div className="flex-1">
                                                    <span className="text-xs text-slate-500">H</span>
                                                    <Input type="number" value={selectedElement.size.height} onChange={(e) => handleSizeChange('height', parseInt(e.target.value) || 50)} className="bg-slate-700 border-slate-600 text-white text-sm h-8" />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Alignment */}
                                        <div className="mb-3">
                                            <Label className="text-slate-300 text-xs">Page Alignment</Label>
                                            <div className="grid grid-cols-3 gap-1 mt-1">
                                                <button onClick={() => alignElement('top')} className="p-2 bg-slate-700 hover:bg-slate-600 rounded text-slate-300 flex items-center justify-center" title="Atas"><AlignVerticalJustifyStart size={14} /></button>
                                                <button onClick={() => alignElement('center-v')} className="p-2 bg-slate-700 hover:bg-slate-600 rounded text-slate-300 flex items-center justify-center" title="Tengah V"><AlignVerticalJustifyCenter size={14} /></button>
                                                <button onClick={() => alignElement('bottom')} className="p-2 bg-slate-700 hover:bg-slate-600 rounded text-slate-300 flex items-center justify-center" title="Bawah"><AlignVerticalJustifyEnd size={14} /></button>
                                                <button onClick={() => alignElement('left')} className="p-2 bg-slate-700 hover:bg-slate-600 rounded text-slate-300 flex items-center justify-center" title="Kiri"><AlignHorizontalJustifyStart size={14} /></button>
                                                <button onClick={() => alignElement('center-h')} className="p-2 bg-slate-700 hover:bg-slate-600 rounded text-slate-300 flex items-center justify-center" title="Tengah H"><AlignHorizontalJustifyCenter size={14} /></button>
                                                <button onClick={() => alignElement('right')} className="p-2 bg-slate-700 hover:bg-slate-600 rounded text-slate-300 flex items-center justify-center" title="Kanan"><AlignHorizontalJustifyEnd size={14} /></button>
                                            </div>
                                        </div>

                                        {/* Layer Order */}
                                        <div className="mb-3">
                                            <Label className="text-slate-300 text-xs">Layer Order</Label>
                                            <div className="flex gap-1 mt-1">
                                                <button onClick={() => moveToTop(selectedElementId!)} className="flex-1 p-2 bg-slate-700 hover:bg-slate-600 rounded text-slate-300 text-xs flex items-center justify-center gap-1" title="Ke Paling Depan"><ChevronsUp size={14} /></button>
                                                <button onClick={() => moveLayerUp(selectedElementId!)} className="flex-1 p-2 bg-slate-700 hover:bg-slate-600 rounded text-slate-300 text-xs flex items-center justify-center gap-1" title="Maju"><ChevronUp size={14} /></button>
                                                <button onClick={() => moveLayerDown(selectedElementId!)} className="flex-1 p-2 bg-slate-700 hover:bg-slate-600 rounded text-slate-300 text-xs flex items-center justify-center gap-1" title="Mundur"><ChevronDown size={14} /></button>
                                                <button onClick={() => moveToBottom(selectedElementId!)} className="flex-1 p-2 bg-slate-700 hover:bg-slate-600 rounded text-slate-300 text-xs flex items-center justify-center gap-1" title="Ke Paling Belakang"><ChevronsDown size={14} /></button>
                                            </div>
                                        </div>

                                        {/* Animation */}
                                        <div className="mb-3">
                                            <Label className="text-slate-300 text-xs">Animation</Label>
                                            <select value={selectedElement.animation} onChange={(e) => handleElementChange('animation', e.target.value)} className="w-full mt-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm h-8">
                                                {ANIMATION_TYPES.map((a) => <option key={a} value={a}>{a}</option>)}
                                            </select>
                                        </div>

                                        {/* Image Upload */}
                                        {selectedElement.type === 'image' && (
                                            <div className="mb-3">
                                                <Label className="text-slate-300 text-xs">Image</Label>
                                                <div className="mt-1 space-y-2">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => fileInputRef.current?.click()}
                                                        className="w-full text-slate-300 border-slate-600 text-xs"
                                                    >
                                                        <Upload size={14} className="mr-1" /> Upload Image
                                                    </Button>
                                                    <Input
                                                        value={selectedElement.imageUrl || ''}
                                                        onChange={(e) => handleElementChange('imageUrl', e.target.value)}
                                                        className="bg-slate-700 border-slate-600 text-white text-sm h-8"
                                                        placeholder="Or paste URL..."
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        {/* Text Content & Styles */}
                                        {selectedElement.type === 'text' && selectedElement.textStyle && (
                                            <>
                                                <div className="mb-3">
                                                    <Label className="text-slate-300 text-xs">Content</Label>
                                                    <textarea value={selectedElement.content || ''} onChange={(e) => handleElementChange('content', e.target.value)} className="w-full mt-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm min-h-[50px]" />
                                                </div>

                                                <div className="mb-3">
                                                    <Label className="text-slate-300 text-xs">Font</Label>
                                                    <select value={selectedElement.textStyle.fontFamily} onChange={(e) => handleTextStyleChange('fontFamily', e.target.value)} className="w-full mt-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm h-8">
                                                        {FONT_FAMILIES.map((f) => <option key={f} value={f}>{f}</option>)}
                                                    </select>
                                                </div>

                                                <div className="mb-3">
                                                    <Label className="text-slate-300 text-xs">Size</Label>
                                                    <select value={selectedElement.textStyle.fontSize} onChange={(e) => handleTextStyleChange('fontSize', parseInt(e.target.value))} className="w-full mt-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm h-8">
                                                        {FONT_SIZES.map((s) => <option key={s} value={s}>{s}px</option>)}
                                                    </select>
                                                </div>

                                                {/* Bold/Italic/Underline/Align */}
                                                <div className="mb-3 flex gap-1 flex-wrap">
                                                    <button onClick={() => handleTextStyleChange('fontWeight', selectedElement.textStyle!.fontWeight === 'bold' ? 'normal' : 'bold')} className={`p-2 rounded ${selectedElement.textStyle.fontWeight === 'bold' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300'}`}><Bold size={14} /></button>
                                                    <button onClick={() => handleTextStyleChange('fontStyle', selectedElement.textStyle!.fontStyle === 'italic' ? 'normal' : 'italic')} className={`p-2 rounded ${selectedElement.textStyle.fontStyle === 'italic' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300'}`}><Italic size={14} /></button>
                                                    <button onClick={() => handleTextStyleChange('textDecoration', selectedElement.textStyle!.textDecoration === 'underline' ? 'none' : 'underline')} className={`p-2 rounded ${selectedElement.textStyle.textDecoration === 'underline' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300'}`}><Underline size={14} /></button>
                                                    <div className="w-px bg-slate-600 mx-1" />
                                                    <button onClick={() => handleTextStyleChange('textAlign', 'left')} className={`p-2 rounded ${selectedElement.textStyle.textAlign === 'left' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300'}`}><AlignLeft size={14} /></button>
                                                    <button onClick={() => handleTextStyleChange('textAlign', 'center')} className={`p-2 rounded ${selectedElement.textStyle.textAlign === 'center' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300'}`}><AlignCenter size={14} /></button>
                                                    <button onClick={() => handleTextStyleChange('textAlign', 'right')} className={`p-2 rounded ${selectedElement.textStyle.textAlign === 'right' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300'}`}><AlignRight size={14} /></button>
                                                </div>

                                                <div className="mb-3">
                                                    <Label className="text-slate-300 text-xs">Color</Label>
                                                    <div className="flex gap-2 mt-1">
                                                        <input type="color" value={selectedElement.textStyle.color} onChange={(e) => handleTextStyleChange('color', e.target.value)} className="w-8 h-8 rounded cursor-pointer border-0" />
                                                        <Input value={selectedElement.textStyle.color} onChange={(e) => handleTextStyleChange('color', e.target.value)} className="flex-1 bg-slate-700 border-slate-600 text-white text-sm h-8" />
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                )}

                                {/* Section Background (when no element selected) */}
                                {!selectedElement && (
                                    <div className="border-t border-slate-700 pt-3">
                                        <h3 className="text-sm font-semibold text-white mb-3">Section Background</h3>
                                        <div className="mb-3">
                                            <Label className="text-slate-300 text-xs">Background Image</Label>
                                            <Input value={currentDesign.backgroundUrl || ''} onChange={(e) => handleDesignChange('backgroundUrl', e.target.value)} className="mt-1 bg-slate-700 border-slate-600 text-white text-sm h-8" placeholder="https://..." />
                                        </div>
                                        <div className="mb-3">
                                            <Label className="text-slate-300 text-xs">Background Color</Label>
                                            <div className="flex gap-2 mt-1">
                                                <input type="color" value={currentDesign.backgroundColor || '#ffffff'} onChange={(e) => handleDesignChange('backgroundColor', e.target.value)} className="w-8 h-8 rounded cursor-pointer border-0" />
                                                <Input value={currentDesign.backgroundColor || ''} onChange={(e) => handleDesignChange('backgroundColor', e.target.value)} className="flex-1 bg-slate-700 border-slate-600 text-white text-sm h-8" />
                                            </div>
                                        </div>
                                        <div className="mb-3">
                                            <Label className="text-slate-300 text-xs">Overlay Opacity: {(currentDesign.overlayOpacity ?? 0.3).toFixed(1)}</Label>
                                            <input type="range" min="0" max="1" step="0.1" value={currentDesign.overlayOpacity ?? 0.3} onChange={(e) => handleDesignChange('overlayOpacity', parseFloat(e.target.value))} className="w-full mt-1" />
                                        </div>
                                        <div className="mb-3">
                                            <Label className="text-slate-300 text-xs">Section Animation</Label>
                                            <select value={currentDesign.animation} onChange={(e) => handleDesignChange('animation', e.target.value)} className="w-full mt-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm h-8">
                                                {ANIMATION_TYPES.map((a) => <option key={a} value={a}>{a}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}

                        {activeTab === 'layers' && (
                            <div>
                                <h3 className="text-xs font-semibold text-slate-400 uppercase mb-2">Layer Order (top to bottom)</h3>
                                <div className="space-y-1">
                                    {[...sortedElements].reverse().map((el, idx) => (
                                        <div
                                            key={el.id}
                                            onClick={() => setSelectedElement(el.id)}
                                            className={`flex items-center gap-2 px-3 py-2 rounded cursor-pointer text-sm ${selectedElementId === el.id ? 'bg-blue-600 text-white' : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                                                }`}
                                        >
                                            <GripVertical size={14} className="text-slate-500" />
                                            {el.type === 'image' ? <ImageIcon size={14} /> : <Type size={14} />}
                                            <span className="truncate flex-1">{el.name}</span>
                                            <div className="flex gap-1">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); moveLayerUp(el.id); }}
                                                    className="p-1 hover:bg-slate-600 rounded"
                                                    title="Move Up"
                                                >
                                                    <ChevronUp size={12} />
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); moveLayerDown(el.id); }}
                                                    className="p-1 hover:bg-slate-600 rounded"
                                                    title="Move Down"
                                                >
                                                    <ChevronDown size={12} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                    {elements.length === 0 && <p className="text-xs text-slate-500">No elements yet.</p>}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Panel - Preview Canvas */}
                <div className="flex-1 bg-slate-900/50 overflow-hidden flex flex-col relative">
                    <div className="absolute inset-0 overflow-auto flex items-center justify-center p-10">
                        <div
                            className="relative shadow-2xl transition-all duration-300 ease-in-out"
                            style={{
                                width: CANVAS_WIDTH,
                                height: CANVAS_HEIGHT,
                                minWidth: CANVAS_WIDTH,
                                minHeight: CANVAS_HEIGHT,
                            }}
                        >
                            {/* Canvas Background & Content */}
                            <div
                                ref={canvasRef}
                                key={previewKey}
                                className="absolute inset-0 bg-white"
                                style={{
                                    backgroundColor: currentDesign.backgroundColor || '#ffffff',
                                    backgroundImage: currentDesign.backgroundUrl ? `url(${currentDesign.backgroundUrl})` : undefined,
                                    backgroundSize: 'cover',
                                    backgroundPosition: 'center',
                                }}
                                onMouseMove={handleMouseMove}
                                onMouseUp={handleMouseUp}
                                onMouseLeave={handleMouseUp}
                                onClick={() => setSelectedElement(null)}
                            >
                                {/* Overlay */}
                                {currentDesign.overlayOpacity && currentDesign.overlayOpacity > 0 && (
                                    <div className="absolute inset-0 pointer-events-none" style={{ backgroundColor: `rgba(0,0,0,${currentDesign.overlayOpacity})` }} />
                                )}

                                {/* Elements */}
                                {sortedElements.map((el) => (
                                    <div
                                        key={el.id}
                                        className={`absolute cursor-move group ${selectedElementId === el.id ? 'z-50' : ''}`}
                                        style={{
                                            left: el.position.x,
                                            top: el.position.y,
                                            width: el.size.width,
                                            height: el.size.height,
                                            zIndex: el.zIndex,
                                        }}
                                        onMouseDown={(e) => handleMouseDown(e, el.id)}
                                        onClick={(e) => e.stopPropagation()} // Prevent background click (deselect)
                                    >
                                        {/* Selection Ring */}
                                        {selectedElementId === el.id && (
                                            <div className="absolute -inset-0.5 border-2 border-blue-500 pointer-events-none z-50" />
                                        )}

                                        {el.type === 'image' && el.imageUrl && (
                                            <img src={el.imageUrl} alt={el.name} className="w-full h-full object-cover pointer-events-none" draggable={false} />
                                        )}
                                        {el.type === 'image' && !el.imageUrl && (
                                            <div className="w-full h-full bg-slate-300 flex items-center justify-center text-slate-500 text-xs pointer-events-none">
                                                <ImageIcon size={24} />
                                            </div>
                                        )}
                                        {el.type === 'text' && el.textStyle && (
                                            <div
                                                className="w-full h-full flex items-center pointer-events-none"
                                                style={{
                                                    fontFamily: el.textStyle.fontFamily,
                                                    fontSize: el.textStyle.fontSize,
                                                    fontWeight: el.textStyle.fontWeight,
                                                    fontStyle: el.textStyle.fontStyle,
                                                    textDecoration: el.textStyle.textDecoration,
                                                    textAlign: el.textStyle.textAlign,
                                                    color: el.textStyle.color,
                                                    justifyContent: el.textStyle.textAlign === 'center' ? 'center' : el.textStyle.textAlign === 'right' ? 'flex-end' : 'flex-start',
                                                    whiteSpace: 'pre-wrap',
                                                    lineHeight: 1.2,
                                                }}
                                            >
                                                {el.content}
                                            </div>
                                        )}
                                        {/* Resize handles when selected */}
                                        {selectedElementId === el.id && <ResizeHandles elementId={el.id} />}
                                    </div>
                                ))}
                                {elements.length === 0 && (
                                    <div className="absolute inset-0 flex items-center justify-center text-slate-500 pointer-events-none">
                                        Add elements to preview
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

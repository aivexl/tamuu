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
    Move, GripVertical, Copy, Eye, EyeOff, MoreHorizontal, ExternalLink,
    FlipHorizontal, FlipVertical, RotateCw, Maximize, Minimize, X
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
    const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});
    const fileInputRef = useRef<HTMLInputElement>(null);

    const templates = useTemplateStore((state) => state.templates);
    const updateTemplate = useTemplateStore((state) => state.updateTemplate);
    const updateSectionDesign = useTemplateStore((state) => state.updateSectionDesign);
    const addElement = useTemplateStore((state) => state.addElement);
    const updateElement = useTemplateStore((state) => state.updateElement);
    const deleteElement = useTemplateStore((state) => state.deleteElement);
    const reorderElements = useTemplateStore((state) => state.reorderElements);
    const copySectionDesign = useTemplateStore((state) => state.copySectionDesign);
    const duplicateElement = useTemplateStore((state) => state.duplicateElement);
    const reorderSections = useTemplateStore((state) => state.reorderSections);
    const selectedElementId = useTemplateStore((state) => state.selectedElementId);
    const setSelectedElement = useTemplateStore((state) => state.setSelectedElement);

    const template = templates.find((t) => t.id === templateId);
    const orderedSections = template?.sectionOrder || SECTION_TYPES;

    const moveSectionUp = (index: number) => {
        if (index <= 0) return;
        const newOrder = [...orderedSections];
        [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
        reorderSections(templateId, newOrder);
    };

    const moveSectionDown = (index: number) => {
        if (index >= orderedSections.length - 1) return;
        const newOrder = [...orderedSections];
        [newOrder[index + 1], newOrder[index]] = [newOrder[index], newOrder[index + 1]];
        reorderSections(templateId, newOrder);
    };

    const [activeSection, setActiveSection] = useState<SectionType>('opening');
    const [templateName, setTemplateName] = useState('');
    const [previewKey, setPreviewKey] = useState(0);
    const [activeTab, setActiveTab] = useState<'elements' | 'layers'>('elements');
    const [draggingElementId, setDraggingElementId] = useState<string | null>(null);
    const [draggingSection, setDraggingSection] = useState<SectionType | null>(null);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [resizing, setResizing] = useState<{ elementId: string; sectionType: SectionType; handle: ResizeHandle; startX: number; startY: number; startPos: { x: number; y: number }; startSize: { width: number; height: number } } | null>(null);
    const [isPreviewMode, setIsPreviewMode] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);


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

    // Helper to get elements for a specific section
    const getSectionElements = (sectionType: SectionType) => {
        return template.sections[sectionType]?.elements || [];
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

    const handleSave = () => {
        updateTemplate(templateId, { name: templateName });
        alert('Template saved!');
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && selectedElementId) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const result = event.target?.result as string;

                // Load image to get dimensions and set proper size
                const img = new Image();
                img.onload = () => {
                    const maxWidth = 300;
                    const aspectRatio = img.naturalWidth / img.naturalHeight;
                    const newWidth = Math.min(img.naturalWidth, maxWidth);
                    const newHeight = newWidth / aspectRatio;

                    updateElement(templateId, activeSection, selectedElementId, {
                        imageUrl: result,
                        size: { width: Math.round(newWidth), height: Math.round(newHeight) }
                    });
                };
                img.src = result;
            };
            reader.readAsDataURL(file);
        }
    };

    // Track if element was dragged to prevent deselect on drag end
    const wasDraggedRef = useRef(false);
    // Track if element was already selected when mousedown started
    const wasSelectedRef = useRef(false);

    // MouseDown: select element, prepare for drag
    const handleMouseDown = (e: React.MouseEvent, elementId: string, sectionType: SectionType) => {
        e.stopPropagation();

        if (activeSection !== sectionType) {
            setActiveSection(sectionType);
        }

        const sectionElements = getSectionElements(sectionType);
        const el = sectionElements.find((el) => el.id === elementId);
        const canvasEl = sectionRefs.current[sectionType];

        if (!el || !canvasEl) return;

        // Remember if it was already selected
        wasSelectedRef.current = selectedElementId === elementId;

        // Always select on mousedown for dragging to work
        if (!wasSelectedRef.current) {
            setSelectedElement(elementId);
        }

        const rect = canvasEl.getBoundingClientRect();
        setDraggingElementId(elementId);
        setDraggingSection(sectionType);
        setDragOffset({
            x: e.clientX - rect.left - el.position.x,
            y: e.clientY - rect.top - el.position.y,
        });
        wasDraggedRef.current = false;
    };

    // Click: toggle selection (deselect if already selected and wasn't dragged)
    const handleElementClick = (e: React.MouseEvent, elementId: string, sectionType: SectionType) => {
        e.stopPropagation();

        if (activeSection !== sectionType) {
            setActiveSection(sectionType);
        }

        // Deselect only if: was already selected AND wasn't dragged
        if (wasSelectedRef.current && !wasDraggedRef.current) {
            setSelectedElement(null);
        }

        wasDraggedRef.current = false;
        wasSelectedRef.current = false;
    };

    // Resize handlers
    const handleResizeStart = (e: React.MouseEvent, elementId: string, sectionType: SectionType, handle: ResizeHandle) => {
        e.stopPropagation();

        if (activeSection !== sectionType) {
            setActiveSection(sectionType);
        }

        const sectionElements = getSectionElements(sectionType);
        const el = sectionElements.find((el) => el.id === elementId);
        if (!el) return;

        setResizing({
            elementId,
            sectionType,
            handle,
            startX: e.clientX,
            startY: e.clientY,
            startPos: { ...el.position },
            startSize: { ...el.size },
        });
        setSelectedElement(elementId);
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (resizing) {
            const canvasEl = sectionRefs.current[resizing.sectionType];
            if (!canvasEl) return;

            const dx = e.clientX - resizing.startX;
            const dy = e.clientY - resizing.startY;

            const sectionElements = getSectionElements(resizing.sectionType);
            const el = sectionElements.find((el) => el.id === resizing.elementId);
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

            // Smart boundary detection: auto-stop at canvas edge unless Shift is held
            if (!e.shiftKey) {
                // Clamp right edge
                if (newPos.x + newSize.width > CANVAS_WIDTH) {
                    newSize.width = CANVAS_WIDTH - newPos.x;
                }
                // Clamp bottom edge
                if (newPos.y + newSize.height > CANVAS_HEIGHT) {
                    newSize.height = CANVAS_HEIGHT - newPos.y;
                }
                // Clamp left edge
                if (newPos.x < 0) {
                    const overflow = -newPos.x;
                    newPos.x = 0;
                    newSize.width = Math.max(30, newSize.width - overflow);
                }
                // Clamp top edge
                if (newPos.y < 0) {
                    const overflow = -newPos.y;
                    newPos.y = 0;
                    newSize.height = Math.max(30, newSize.height - overflow);
                }
            }

            updateElement(templateId, resizing.sectionType, resizing.elementId, {
                position: { x: Math.round(newPos.x), y: Math.round(newPos.y) },
                size: { width: Math.round(newSize.width), height: Math.round(newSize.height) },
            });
            return;
        }

        if (!draggingElementId || !draggingSection) return;

        const canvasEl = sectionRefs.current[draggingSection];
        if (!canvasEl) return;

        // Mark as dragged to prevent deselect
        wasDraggedRef.current = true;

        const rect = canvasEl.getBoundingClientRect();
        let x = e.clientX - rect.left - dragOffset.x;
        let y = e.clientY - rect.top - dragOffset.y;

        // Smart boundary for drag: constrain to canvas unless Shift held
        if (!e.shiftKey) {
            const sectionElements = getSectionElements(draggingSection);
            const el = sectionElements.find((el) => el.id === draggingElementId);
            if (el) {
                x = Math.max(0, Math.min(x, CANVAS_WIDTH - el.size.width));
                y = Math.max(0, Math.min(y, CANVAS_HEIGHT - el.size.height));
            }
        }

        updateElement(templateId, draggingSection, draggingElementId, {
            position: { x: Math.round(x), y: Math.round(y) },
        });
    };

    const handleMouseUp = () => {
        setDraggingElementId(null);
        setDraggingSection(null);
        setResizing(null);
    };

    // Resize handle component
    const ResizeHandles = ({ elementId, sectionType }: { elementId: string, sectionType: SectionType }) => {
        const handleStyle = "absolute w-3 h-3 bg-blue-500 border border-white rounded-sm";
        return (
            <>
                <div className={`${handleStyle} -top-1.5 -left-1.5 cursor-nwse-resize`} onMouseDown={(e) => handleResizeStart(e, elementId, sectionType, 'nw')} />
                <div className={`${handleStyle} -top-1.5 left-1/2 -translate-x-1/2 cursor-ns-resize`} onMouseDown={(e) => handleResizeStart(e, elementId, sectionType, 'n')} />
                <div className={`${handleStyle} -top-1.5 -right-1.5 cursor-nesw-resize`} onMouseDown={(e) => handleResizeStart(e, elementId, sectionType, 'ne')} />
                <div className={`${handleStyle} top-1/2 -translate-y-1/2 -left-1.5 cursor-ew-resize`} onMouseDown={(e) => handleResizeStart(e, elementId, sectionType, 'w')} />
                <div className={`${handleStyle} top-1/2 -translate-y-1/2 -right-1.5 cursor-ew-resize`} onMouseDown={(e) => handleResizeStart(e, elementId, sectionType, 'e')} />
                <div className={`${handleStyle} -bottom-1.5 -left-1.5 cursor-nesw-resize`} onMouseDown={(e) => handleResizeStart(e, elementId, sectionType, 'sw')} />
                <div className={`${handleStyle} -bottom-1.5 left-1/2 -translate-x-1/2 cursor-ns-resize`} onMouseDown={(e) => handleResizeStart(e, elementId, sectionType, 's')} />
                <div className={`${handleStyle} -bottom-1.5 -right-1.5 cursor-nwse-resize`} onMouseDown={(e) => handleResizeStart(e, elementId, sectionType, 'se')} />
            </>
        );
    };

    // Get CSS transform string for element flip/rotation
    const getElementTransform = (el: TemplateElement) => {
        const transforms: string[] = [];
        if (el.flipHorizontal) transforms.push('scaleX(-1)');
        if (el.flipVertical) transforms.push('scaleY(-1)');
        if (el.rotation) transforms.push(`rotate(${el.rotation}deg)`);
        return transforms.length > 0 ? transforms.join(' ') : undefined;
    };

    // Handle preview mode
    const startPreview = () => {
        setIsPreviewMode(true);
        setPreviewKey(k => k + 1);
    };

    const closePreview = () => {
        setIsPreviewMode(false);
        setIsFullscreen(false);
    };

    // Toggle visibility for a section
    const toggleSectionVisibility = (sectionType: SectionType) => {
        const section = template.sections[sectionType];
        const currentVisibility = section?.isVisible !== false;
        updateSectionDesign(templateId, sectionType, { isVisible: !currentVisibility });
    };

    // Clear section elements
    const clearSection = (sectionType: SectionType) => {
        if (confirm(`Clear all elements in ${sectionType}?`)) {
            updateSectionDesign(templateId, sectionType, { elements: [] });
        }
    };

    // Animation CSS keyframes
    const getAnimationStyle = (el: TemplateElement, isPreview: boolean) => {
        if (!isPreview || el.animation === 'none') return {};

        const speed = el.animationSpeed || 500;
        const duration = el.animationDuration || 1000;
        const delay = el.animationDelay || 0;

        const animationMap: Record<AnimationType, string> = {
            'none': '',
            'fade-in': `fadeIn ${duration}ms ease-out ${delay}ms forwards`,
            'slide-up': `slideUp ${duration}ms ease-out ${delay}ms forwards`,
            'slide-down': `slideDown ${duration}ms ease-out ${delay}ms forwards`,
            'slide-left': `slideLeft ${duration}ms ease-out ${delay}ms forwards`,
            'slide-right': `slideRight ${duration}ms ease-out ${delay}ms forwards`,
            'zoom-in': `zoomIn ${duration}ms ease-out ${delay}ms forwards`,
            'zoom-out': `zoomOut ${duration}ms ease-out ${delay}ms forwards`,
            'flip-x': `flipX ${duration}ms ease-out ${delay}ms forwards`,
            'flip-y': `flipY ${duration}ms ease-out ${delay}ms forwards`,
            'bounce': `bounce ${duration}ms ease-out ${delay}ms forwards`,
        };

        return {
            animation: animationMap[el.animation],
            opacity: 0,
        };
    };

    // Preview Modal Component
    const PreviewModal = () => {
        if (!isPreviewMode) return null;

        return (
            <div className={`fixed inset-0 z-50 ${isFullscreen ? 'bg-black' : 'bg-black/90'} flex flex-col`}>
                {/* Preview Header */}
                <div className={`flex justify-between items-center p-4 ${isFullscreen ? 'absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/50 to-transparent' : 'bg-slate-900'}`}>
                    <h2 className="text-white text-lg font-semibold">Preview Mode</h2>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setIsFullscreen(!isFullscreen)}
                            className="p-2 text-white hover:bg-white/20 rounded-lg transition-colors"
                            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
                        >
                            {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
                        </button>
                        <button
                            onClick={closePreview}
                            className="p-2 text-white hover:bg-white/20 rounded-lg transition-colors"
                            title="Close Preview"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Preview Content */}
                <div className={`flex-1 overflow-auto flex ${isFullscreen ? 'flex-col' : 'flex-col items-center py-8 gap-8'}`}>
                    {orderedSections.map((sectionType) => {
                        const sectionDesign = template.sections[sectionType] || { animation: 'none' as const, elements: [] };
                        const sectionElements = sectionDesign.elements || [];
                        const sortedSectionElements = [...sectionElements].sort((a, b) => a.zIndex - b.zIndex);
                        const isVisible = sectionDesign.isVisible !== false;

                        if (!isVisible) return null;

                        const isFirstSection = orderedSections.indexOf(sectionType) === 0;
                        const fullscreenWidth = 500;
                        const fullscreenHeight = isFirstSection ? 950 : 680;

                        return (
                            <div
                                key={sectionType}
                                className={`relative ${isFullscreen ? 'mx-auto' : 'shrink-0 shadow-2xl'}`}
                                style={{
                                    width: isFullscreen ? fullscreenWidth : CANVAS_WIDTH,
                                    height: isFullscreen ? fullscreenHeight : CANVAS_HEIGHT,
                                    minHeight: isFullscreen ? fullscreenHeight : CANVAS_HEIGHT,
                                }}
                            >
                                {/* Canvas Background */}
                                <div
                                    className="absolute inset-0 overflow-hidden"
                                    style={{
                                        backgroundColor: sectionDesign.backgroundColor || '#ffffff',
                                        backgroundImage: sectionDesign.backgroundUrl ? `url(${sectionDesign.backgroundUrl})` : undefined,
                                        backgroundSize: 'cover',
                                        backgroundPosition: 'center',
                                    }}
                                >
                                    {/* Overlay */}
                                    {sectionDesign.overlayOpacity && sectionDesign.overlayOpacity > 0 && (
                                        <div className="absolute inset-0" style={{ backgroundColor: `rgba(0,0,0,${sectionDesign.overlayOpacity})` }} />
                                    )}

                                    {/* Elements with animations */}
                                    {sortedSectionElements.map((el) => (
                                        <div
                                            key={el.id}
                                            className="absolute"
                                            style={{
                                                left: isFullscreen ? (el.position.x / CANVAS_WIDTH) * fullscreenWidth : el.position.x,
                                                top: isFullscreen ? (el.position.y / CANVAS_HEIGHT) * fullscreenHeight : el.position.y,
                                                width: isFullscreen ? (el.size.width / CANVAS_WIDTH) * fullscreenWidth : el.size.width,
                                                height: isFullscreen ? (el.size.height / CANVAS_HEIGHT) * fullscreenHeight : el.size.height,
                                                zIndex: el.zIndex,
                                                ...getAnimationStyle(el, true),
                                            }}
                                        >
                                            {/* Inner wrapper for user transforms (flip/rotation) */}
                                            <div
                                                className="w-full h-full"
                                                style={{ transform: getElementTransform(el) }}
                                            >
                                                {el.type === 'image' && el.imageUrl && (
                                                    <img src={el.imageUrl} alt={el.name} className="w-full h-full object-cover" />
                                                )}
                                                {el.type === 'text' && el.textStyle && (
                                                    <div
                                                        className="w-full h-full flex items-center"
                                                        style={{
                                                            fontFamily: el.textStyle.fontFamily,
                                                            fontSize: isFullscreen ? (el.textStyle.fontSize / CANVAS_WIDTH) * fullscreenWidth : el.textStyle.fontSize,
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
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Animation Keyframes */}
                <style jsx global>{`
                    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                    @keyframes slideUp { from { opacity: 0; transform: translateY(50px); } to { opacity: 1; transform: translateY(0); } }
                    @keyframes slideDown { from { opacity: 0; transform: translateY(-50px); } to { opacity: 1; transform: translateY(0); } }
                    @keyframes slideLeft { from { opacity: 0; transform: translateX(50px); } to { opacity: 1; transform: translateX(0); } }
                    @keyframes slideRight { from { opacity: 0; transform: translateX(-50px); } to { opacity: 1; transform: translateX(0); } }
                    @keyframes zoomIn { from { opacity: 0; transform: scale(0.5); } to { opacity: 1; transform: scale(1); } }
                    @keyframes zoomOut { from { opacity: 0; transform: scale(1.5); } to { opacity: 1; transform: scale(1); } }
                    @keyframes flipX { from { opacity: 0; transform: rotateX(90deg); } to { opacity: 1; transform: rotateX(0); } }
                    @keyframes flipY { from { opacity: 0; transform: rotateY(90deg); } to { opacity: 1; transform: rotateY(0); } }
                    @keyframes bounce { 
                        0% { opacity: 0; transform: translateY(-50px); }
                        50% { opacity: 1; transform: translateY(10px); }
                        70% { transform: translateY(-5px); }
                        100% { opacity: 1; transform: translateY(0); }
                    }
                `}</style>
            </div>
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
                            <Button variant="outline" onClick={startPreview} className="flex items-center gap-2 text-slate-300 border-slate-600">
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
                {/* Left Panel - Multi-Section Page Preview */}
                <aside className="w-80 bg-slate-800 border-r border-slate-700 flex flex-col overflow-hidden">
                    <div className="p-3 border-b border-slate-700">
                        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Pages</h2>
                    </div>
                    <div className="flex-1 overflow-y-auto p-3 space-y-4">
                        {orderedSections.map((sectionType, idx) => {
                            const sectionDesign = template.sections[sectionType];
                            const isVisible = sectionDesign?.isVisible !== false;
                            const pageTitle = sectionDesign?.pageTitle || sectionType;

                            return (
                                <div key={sectionType} className="group">
                                    {/* Page Header */}
                                    <div className={`flex items-center justify-between mb-2 px-1 ${activeSection === sectionType ? 'text-blue-400' : 'text-slate-400'}`}>
                                        <span className="text-xs font-medium">
                                            Halaman {idx + 1} - <span className="capitalize text-slate-500">{pageTitle}</span>
                                        </span>
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => moveSectionUp(idx)}
                                                className={`p-1 hover:bg-slate-700 rounded ${idx === 0 ? 'text-slate-600 cursor-not-allowed' : 'text-slate-500 hover:text-white'}`}
                                                title="Move Up"
                                                disabled={idx === 0}
                                            >
                                                <ChevronUp size={12} />
                                            </button>
                                            <button
                                                onClick={() => moveSectionDown(idx)}
                                                className={`p-1 hover:bg-slate-700 rounded ${idx === orderedSections.length - 1 ? 'text-slate-600 cursor-not-allowed' : 'text-slate-500 hover:text-white'}`}
                                                title="Move Down"
                                                disabled={idx === orderedSections.length - 1}
                                            >
                                                <ChevronDown size={12} />
                                            </button>
                                            <button
                                                onClick={() => updateSectionDesign(templateId, sectionType, { isVisible: !isVisible })}
                                                className={`p-1 hover:bg-slate-700 rounded ${isVisible ? 'text-slate-500 hover:text-white' : 'text-red-400'}`}
                                                title={isVisible ? 'Hide Section' : 'Show Section'}
                                            >
                                                {isVisible ? <Eye size={12} /> : <EyeOff size={12} />}
                                            </button>
                                            <button
                                                onClick={() => {
                                                    const targetSection = SECTION_TYPES.find(s => s !== sectionType && window.confirm(`Copy to ${s}?`));
                                                    if (targetSection) copySectionDesign(templateId, sectionType, targetSection);
                                                }}
                                                className="p-1 hover:bg-slate-700 rounded text-slate-500 hover:text-white"
                                                title="Copy Section"
                                            >
                                                <Copy size={12} />
                                            </button>
                                            <button
                                                onClick={() => updateSectionDesign(templateId, sectionType, { elements: [] })}
                                                className="p-1 hover:bg-slate-700 rounded text-slate-500 hover:text-red-400"
                                                title="Clear Section"
                                            >
                                                <Trash2 size={12} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Page Preview Card - Click to activate */}
                                    <div
                                        onClick={() => { setActiveSection(sectionType); setSelectedElement(null); }}
                                        className={`relative cursor-pointer rounded-lg overflow-hidden transition-all duration-200 ${activeSection === sectionType
                                            ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-slate-800'
                                            : 'hover:ring-2 hover:ring-slate-600'
                                            } ${!isVisible ? 'opacity-50' : ''}`}
                                        style={{ aspectRatio: `${CANVAS_WIDTH}/${CANVAS_HEIGHT}` }}
                                    >
                                        <div
                                            className="absolute inset-0 bg-white"
                                            style={{
                                                backgroundColor: sectionDesign?.backgroundColor || '#ffffff',
                                                backgroundImage: sectionDesign?.backgroundUrl ? `url(${sectionDesign.backgroundUrl})` : undefined,
                                                backgroundSize: 'cover',
                                                backgroundPosition: 'center',
                                            }}
                                        >
                                            {/* Mini preview of elements - scaled down */}
                                            <div className="absolute inset-0 overflow-hidden" style={{ transform: 'scale(0.28)', transformOrigin: 'top left' }}>
                                                {(sectionDesign?.elements || []).map((el) => (
                                                    <div
                                                        key={el.id}
                                                        className="absolute"
                                                        style={{
                                                            left: el.position.x,
                                                            top: el.position.y,
                                                            width: el.size.width,
                                                            height: el.size.height,
                                                            zIndex: el.zIndex,
                                                        }}
                                                    >
                                                        {el.type === 'image' && el.imageUrl && (
                                                            <img src={el.imageUrl} alt="" className="w-full h-full object-cover" />
                                                        )}
                                                        {el.type === 'image' && !el.imageUrl && (
                                                            <div className="w-full h-full bg-slate-300" />
                                                        )}
                                                        {el.type === 'text' && (
                                                            <div
                                                                style={{
                                                                    fontFamily: el.textStyle?.fontFamily,
                                                                    fontSize: el.textStyle?.fontSize,
                                                                    fontWeight: el.textStyle?.fontWeight,
                                                                    color: el.textStyle?.color,
                                                                }}
                                                            >
                                                                {el.content}
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Active indicator */}
                                        {activeSection === sectionType && (
                                            <div className="absolute bottom-2 right-2 bg-blue-500 text-white text-xs px-2 py-0.5 rounded">
                                                Editing
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
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

                                        {/* Transform Controls */}
                                        <div className="mb-3">
                                            <Label className="text-slate-300 text-xs mb-2 block">Transform</Label>
                                            <div className="flex gap-1 mb-2">
                                                <button
                                                    onClick={() => handleElementChange('flipHorizontal', !selectedElement.flipHorizontal)}
                                                    className={`flex-1 p-2 rounded text-xs flex items-center justify-center gap-1 ${selectedElement.flipHorizontal ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300'}`}
                                                    title="Flip Horizontal"
                                                >
                                                    <FlipHorizontal size={14} /> H
                                                </button>
                                                <button
                                                    onClick={() => handleElementChange('flipVertical', !selectedElement.flipVertical)}
                                                    className={`flex-1 p-2 rounded text-xs flex items-center justify-center gap-1 ${selectedElement.flipVertical ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300'}`}
                                                    title="Flip Vertical"
                                                >
                                                    <FlipVertical size={14} /> V
                                                </button>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <RotateCw size={14} className="text-slate-400" />
                                                <input
                                                    type="range"
                                                    min="0"
                                                    max="360"
                                                    value={selectedElement.rotation || 0}
                                                    onChange={(e) => handleElementChange('rotation', parseInt(e.target.value))}
                                                    className="flex-1"
                                                />
                                                <Input
                                                    type="number"
                                                    min="0"
                                                    max="360"
                                                    value={selectedElement.rotation || 0}
                                                    onChange={(e) => handleElementChange('rotation', parseInt(e.target.value) || 0)}
                                                    className="w-16 bg-slate-700 border-slate-600 text-white text-sm h-8 text-center"
                                                />
                                                <span className="text-slate-400 text-xs">°</span>
                                            </div>
                                        </div>

                                        {/* Animation Controls */}
                                        <div className="mb-3">
                                            <Label className="text-slate-300 text-xs mb-2 block">Animation</Label>
                                            <select
                                                value={selectedElement.animation}
                                                onChange={(e) => handleElementChange('animation', e.target.value)}
                                                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm h-8 mb-2"
                                            >
                                                {ANIMATION_TYPES.map((a) => (
                                                    <option key={a} value={a}>{a}</option>
                                                ))}
                                            </select>
                                            <div className="grid grid-cols-2 gap-2">
                                                <div>
                                                    <Label className="text-slate-400 text-xs">Speed (ms)</Label>
                                                    <Input
                                                        type="number"
                                                        min="100"
                                                        step="100"
                                                        value={selectedElement.animationSpeed || 500}
                                                        onChange={(e) => handleElementChange('animationSpeed', parseInt(e.target.value) || 500)}
                                                        className="bg-slate-700 border-slate-600 text-white text-sm h-8"
                                                    />
                                                </div>
                                                <div>
                                                    <Label className="text-slate-400 text-xs">Duration (ms)</Label>
                                                    <Input
                                                        type="number"
                                                        min="100"
                                                        step="100"
                                                        value={selectedElement.animationDuration || 1000}
                                                        onChange={(e) => handleElementChange('animationDuration', parseInt(e.target.value) || 1000)}
                                                        className="bg-slate-700 border-slate-600 text-white text-sm h-8"
                                                    />
                                                </div>
                                            </div>
                                            <div className="mt-2">
                                                <Label className="text-slate-400 text-xs">Delay (ms)</Label>
                                                <Input
                                                    type="number"
                                                    min="0"
                                                    step="100"
                                                    value={selectedElement.animationDelay || 0}
                                                    onChange={(e) => handleElementChange('animationDelay', parseInt(e.target.value) || 0)}
                                                    className="bg-slate-700 border-slate-600 text-white text-sm h-8"
                                                />
                                            </div>
                                        </div>

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
                <div
                    className="flex-1 bg-slate-900/50 overflow-hidden flex flex-col relative"
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                >
                    <div className="absolute inset-0 overflow-auto flex flex-col items-center p-10 gap-8">
                        {orderedSections.map((sectionType) => {
                            const sectionDesign = template.sections[sectionType] || { animation: 'none' as const, elements: [] };
                            const sectionElements = sectionDesign.elements || [];
                            const sortedSectionElements = [...sectionElements].sort((a, b) => a.zIndex - b.zIndex);
                            const isVisible = sectionDesign.isVisible !== false;

                            if (!isVisible) return null;

                            return (
                                <div
                                    key={sectionType}
                                    className="relative shadow-2xl transition-all duration-300 ease-in-out shrink-0"
                                    style={{
                                        width: CANVAS_WIDTH,
                                        height: CANVAS_HEIGHT,
                                    }}
                                >
                                    {/* Section Label with Controls */}
                                    <div className="absolute -top-8 left-0 right-0 flex items-center justify-between">
                                        <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                                            {sectionDesign.pageTitle || sectionType}
                                        </span>
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => moveSectionUp(orderedSections.indexOf(sectionType))}
                                                disabled={orderedSections.indexOf(sectionType) === 0}
                                                className="p-1 hover:bg-slate-700 rounded text-slate-500 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                                title="Move Up"
                                            >
                                                <ChevronUp size={14} />
                                            </button>
                                            <button
                                                onClick={() => moveSectionDown(orderedSections.indexOf(sectionType))}
                                                disabled={orderedSections.indexOf(sectionType) === orderedSections.length - 1}
                                                className="p-1 hover:bg-slate-700 rounded text-slate-500 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                                title="Move Down"
                                            >
                                                <ChevronDown size={14} />
                                            </button>
                                            <button
                                                onClick={() => toggleSectionVisibility(sectionType)}
                                                className="p-1 hover:bg-slate-700 rounded text-slate-500 hover:text-white transition-colors"
                                                title={isVisible ? "Hide Section" : "Show Section"}
                                            >
                                                {isVisible ? <Eye size={14} /> : <EyeOff size={14} />}
                                            </button>
                                            <button
                                                onClick={() => {
                                                    const targetSection = prompt('Copy to which section?', 'quotes');
                                                    if (targetSection && SECTION_TYPES.includes(targetSection as SectionType)) {
                                                        copySectionDesign(templateId, sectionType, targetSection as SectionType);
                                                    }
                                                }}
                                                className="p-1 hover:bg-slate-700 rounded text-slate-500 hover:text-white transition-colors"
                                                title="Copy Section"
                                            >
                                                <Copy size={14} />
                                            </button>
                                            <button
                                                onClick={() => clearSection(sectionType)}
                                                className="p-1 hover:bg-slate-700 rounded text-slate-500 hover:text-red-400 transition-colors"
                                                title="Clear Section"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Canvas Background & Content */}
                                    <div
                                        ref={(el) => { sectionRefs.current[sectionType] = el; }}
                                        className="absolute inset-0 bg-white overflow-hidden"
                                        style={{
                                            backgroundColor: sectionDesign.backgroundColor || '#ffffff',
                                            backgroundImage: sectionDesign.backgroundUrl ? `url(${sectionDesign.backgroundUrl})` : undefined,
                                            backgroundSize: 'cover',
                                            backgroundPosition: 'center',
                                        }}
                                        onClick={() => setSelectedElement(null)}
                                    >
                                        {/* Overlay */}
                                        {sectionDesign.overlayOpacity && sectionDesign.overlayOpacity > 0 && (
                                            <div className="absolute inset-0 pointer-events-none" style={{ backgroundColor: `rgba(0,0,0,${sectionDesign.overlayOpacity})` }} />
                                        )}

                                        {/* Elements */}
                                        {sortedSectionElements.map((el) => (
                                            <div
                                                key={el.id}
                                                className={`absolute cursor-move group ${selectedElementId === el.id ? 'z-50' : ''}`}
                                                style={{
                                                    left: el.position.x,
                                                    top: el.position.y,
                                                    width: el.size.width,
                                                    height: el.size.height,
                                                    zIndex: el.zIndex,
                                                    transform: getElementTransform(el),
                                                }}
                                                onMouseDown={(e) => handleMouseDown(e, el.id, sectionType)}
                                                onClick={(e) => handleElementClick(e, el.id, sectionType)}
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
                                                {selectedElementId === el.id && <ResizeHandles elementId={el.id} sectionType={sectionType} />}
                                            </div>
                                        ))}
                                        {sectionElements.length === 0 && (
                                            <div className="absolute inset-0 flex items-center justify-center text-slate-500 pointer-events-none opacity-50">
                                                Empty Section
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Preview Modal */}
            <PreviewModal />
        </div>
    );
}

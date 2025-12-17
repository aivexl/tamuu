'use client';

import React, { useState, useEffect, useRef } from 'react';
import NextImage from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import { useTemplateStore } from '@/lib/template-store';
import { SectionType, AnimationType, TemplateElement, TextStyle, ElementType, CountdownConfig, RSVPFormConfig, GuestWishesConfig, IconStyle } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Card } from '@/components/ui/Card';
import { DynamicIcon, ICON_CATEGORIES, ALL_ICONS } from '@/components/icons/IconList';
import { CountdownTimer, getDefaultCountdownConfig } from '@/components/CountdownTimer';
import { RSVPForm, getDefaultRSVPFormConfig } from '@/components/RSVPForm';
import { GuestWishes, getDefaultGuestWishesConfig } from '@/components/GuestWishes';
import { OpenInvitationButton, getDefaultOpenInvitationConfig } from '@/components/OpenInvitationButton';
import {
    ArrowLeft, Save, Play, Image as ImageIcon, Type, Trash2, Upload,
    Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight,
    Layers, ChevronUp, ChevronDown, ChevronsUp, ChevronsDown,
    AlignVerticalJustifyStart, AlignVerticalJustifyCenter, AlignVerticalJustifyEnd,
    AlignHorizontalJustifyStart, AlignHorizontalJustifyCenter, AlignHorizontalJustifyEnd,
    Move, GripVertical, Copy, Eye, EyeOff, MoreHorizontal, ExternalLink,
    FlipHorizontal, FlipVertical, RotateCw, Maximize, Minimize, X,
    Heart, Clock, MessageSquare, Users, Plus, Palette, Settings, Edit2, MailOpen
} from 'lucide-react';
import { SectionSelectModal } from '@/components/dashboard/SectionSelectModal';
import { InputModal } from '@/components/dashboard/InputModal';
import { useToast } from '@/components/ui/use-toast';
import { ClientOnly } from '@/components/ClientOnly';
import { uploadToR2 } from '@/lib/uploadToR2';
import { AnimatedElement } from '@/components/AnimatedElement';
import dynamic from 'next/dynamic';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '@/lib/constants';

// Dynamic import KonvaCanvas to ensure client-side only rendering
// Uses Konva.js directly (not react-konva) for maximum compatibility and performance
const KonvaCanvas = dynamic(() => import('@/components/editor/KonvaCanvas').then(mod => ({ default: mod.KonvaCanvas })), {
    ssr: false,
    loading: () => (
        <div className="absolute inset-0 flex items-center justify-center bg-white">
            <div className="text-slate-500 text-sm">Loading canvas...</div>
        </div>
    ),
});

const SECTION_TYPES: SectionType[] = ['opening', 'quotes', 'couple', 'event', 'maps', 'rsvp', 'thanks'];
const ANIMATION_TYPES: AnimationType[] = [
    // Entrance animations
    'none', 'fade-in', 'slide-up', 'slide-down', 'slide-left', 'slide-right',
    'zoom-in', 'zoom-out', 'flip-x', 'flip-y', 'bounce',
    // Looping animations
    'sway', 'float', 'pulse', 'sparkle', 'spin', 'shake', 'swing', 'heartbeat', 'glow'
];
const FONT_FAMILIES = [
    // Sans-serif
    'Inter', 'Roboto', 'Montserrat', 'Poppins', 'Open Sans',
    // Serif
    'Playfair Display', 'Cormorant Garamond', 'Lora', 'Merriweather', 'Libre Baskerville',
    // Cursive - Tegak Bersambung
    'Dancing Script', 'Great Vibes', 'Satisfy', 'Pacifico', 'Caveat',
    'Sacramento', 'Allura', 'Italianno', 'Tangerine', 'Pinyon Script',
    'Rouge Script', 'Mr De Haviland', 'Marck Script', 'Cookie', 'Yellowtail',
    // Handwriting
    'Kalam', 'Indie Flower', 'Shadows Into Light', 'Amatic SC', 'Patrick Hand',
    'Gloria Hallelujah', 'Covered By Your Grace', 'Rock Salt', 'Permanent Marker',
    // Decorative Script
    'Alex Brush', 'Qwigley', 'Clicker Script', 'Meddon', 'Euphoria Script',
    'Petit Formal Script', 'Niconne', 'Croissant One', 'Yesteryear', 'Lavishly Yours'
];
const FONT_SIZES = [12, 14, 16, 18, 20, 24, 28, 32, 36, 42, 48, 56, 64, 72];

// Canvas dimensions moved to lib/constants.ts

type ResizeHandle = 'nw' | 'n' | 'ne' | 'w' | 'e' | 'sw' | 's' | 'se' | null;

export default function TemplateEditorPage() {
    const params = useParams();
    const router = useRouter();
    const templateId = params.id as string;
    const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});
    const fileInputRef = useRef<HTMLInputElement>(null);
    const thumbnailInputRef = useRef<HTMLInputElement>(null);
    const wasDraggedRef = useRef(false);
    const wasSelectedRef = useRef(false);
    const lastDragPos = useRef<{ x: number, y: number } | null>(null);
    const rafIdRef = useRef<number | null>(null);
    const pendingUpdateRef = useRef<{ x: number, y: number } | null>(null);

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
    const copyElement = useTemplateStore((state) => state.copyElement);
    const pasteElement = useTemplateStore((state) => state.pasteElement);
    const fetchTemplate = useTemplateStore((state) => state.fetchTemplate);
    const { toast } = useToast();

    const template = templates.find((t) => t.id === templateId);
    const orderedSections = template?.sectionOrder || SECTION_TYPES;

    // Fetch templates on mount
    useEffect(() => {
        if (templateId) {
            fetchTemplate(templateId);
        }
    }, [fetchTemplate, templateId]);

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
    const [visibleSections, setVisibleSections] = useState<Set<SectionType>>(new Set(SECTION_TYPES));
    const [uploadingThumbnail, setUploadingThumbnail] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);

    const [sectionSelectModal, setSectionSelectModal] = useState<{
        isOpen: boolean;
        mode: 'copy_section' | 'paste_element' | null;
        sourceId?: string | null;
    }>({ isOpen: false, mode: null, sourceId: null });

    const [inputModal, setInputModal] = useState<{
        isOpen: boolean;
        mode: 'add_page' | 'rename_page' | null;
        defaultValue?: string;
        targetId?: string;
    }>({ isOpen: false, mode: null });

    // Helper to get all sections for the modal
    const getAvailableSections = () => {
        if (!template) return [];
        return orderedSections.map(id => {
            const section = template.sections[id];
            // Format label: use pageTitle or capitalize ID, distinguish custom pages
            let label = section?.pageTitle || id.charAt(0).toUpperCase() + id.slice(1);
            if (id.startsWith('custom_')) {
                label = `Page: ${label}`;
            }
            return { id, label };
        });
    };

    const handleSectionSelect = (targetSectionId: string) => {
        if (sectionSelectModal.mode === 'copy_section' && sectionSelectModal.sourceId) {
            copySectionDesign(templateId, sectionSelectModal.sourceId as SectionType, targetSectionId as SectionType);
            toast({
                title: "Section Copied",
                description: `Design copied to ${targetSectionId}`,
                variant: 'success'
            });
        } else if (sectionSelectModal.mode === 'paste_element') {
            pasteElement(templateId, targetSectionId as SectionType);
            toast({
                title: "Element Pasted",
                description: `Element pasted to ${targetSectionId}`,
                variant: 'success'
            });
        }
        setSectionSelectModal({ isOpen: false, mode: null, sourceId: null });
    };

    const handleInputModalSubmit = (value: string) => {
        if (inputModal.mode === 'add_page') {
            // Generate unique section ID
            const sectionId = `custom_${Date.now()}`;
            const newOrder = [...orderedSections, sectionId];
            reorderSections(templateId, newOrder as SectionType[]);
            updateSectionDesign(templateId, sectionId as SectionType, {
                animation: 'fade-in',
                elements: [],
                isVisible: true,
                pageTitle: value
            });
            setActiveSection(sectionId as SectionType);
        } else if (inputModal.mode === 'rename_page' && inputModal.targetId) {
            updateSectionDesign(templateId, inputModal.targetId as SectionType, { pageTitle: value });
            toast({
                title: "Page Renamed",
                description: "Page name updated successfully",
                variant: "success",
            });
        }
        setInputModal({ isOpen: false, mode: null });
    };

    const handleThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadingThumbnail(true);
        try {
            const result = await uploadToR2(file, { folder: 'thumbnails' });

            if (result.success && result.url) {
                updateTemplate(templateId, { thumbnail: result.url });
                toast({
                    title: "Thumbnail Updated",
                    description: "Template thumbnail has been uploaded to R2.",
                    variant: "success",
                });
            } else {
                toast({
                    title: "Upload Failed",
                    description: result.error || "Failed to upload thumbnail",
                    variant: "destructive",
                });
            }
        } catch (error) {
            console.error('Thumbnail upload error:', error);
            toast({
                title: "Upload Error",
                description: "An unexpected error occurred while uploading",
                variant: "destructive",
            });
        } finally {
            setUploadingThumbnail(false);
        }
    };

    // OLD CODE (FileReader - commented for rollback):
    // const handleThumbnailUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    //     const file = e.target.files?.[0];
    //     if (file) {
    //         const reader = new FileReader();
    //         reader.onload = (event) => {
    //             const result = event.target?.result as string;
    //             updateTemplate(templateId, { thumbnail: result });
    //             toast({
    //                 title: "Thumbnail Updated",
    //                 description: "Template thumbnail has been updated.",
    //                 variant: "success",
    //             });
    //         };
    //         reader.readAsDataURL(file);
    //     }
    // };


    useEffect(() => {
        if (template) {
            setTemplateName(template.name);
        }
    }, [template]);

    // Listen for fullscreen change events
    useEffect(() => {
        const handleFullscreenChange = () => {
            if (!document.fullscreenElement) {
                setIsFullscreen(false);
            }
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    // Keyboard shortcuts for copy/paste/delete
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Check if user is typing in an input or textarea
            const target = e.target as HTMLElement;
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
                return;
            }

            // Ctrl+C: Copy selected element
            if ((e.ctrlKey || e.metaKey) && e.key === 'c' && selectedElementId) {
                e.preventDefault();
                copyElement(templateId, activeSection, selectedElementId);
            }

            // Ctrl+V: Paste element
            if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
                e.preventDefault();
                pasteElement(templateId, activeSection);
            }

            // Delete or Backspace: Delete selected element
            if ((e.key === 'Delete' || e.key === 'Backspace') && selectedElementId) {
                e.preventDefault();
                deleteElement(templateId, activeSection, selectedElementId);
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [selectedElementId, templateId, activeSection, copyElement, pasteElement, deleteElement]);

    // Early return removed to fix Hook ordering (Rule of Hooks)
    // if (!template) return <Loading />; 

    const currentDesign = template?.sections?.[activeSection] || { animation: 'fade-in', elements: [] };
    const elements = currentDesign.elements || [];
    const selectedElement = elements.find((el) => el.id === selectedElementId);
    const sortedElements = [...elements].sort((a, b) => a.zIndex - b.zIndex);

    const handleDesignChange = (key: string, value: any) => {
        updateSectionDesign(templateId, activeSection, { [key]: value });
    };

    const handleAddElement = (type: ElementType) => {
        const maxZ = elements.length > 0 ? Math.max(...elements.map((el) => el.zIndex)) : 0;

        // Base element properties
        const baseElement: Partial<TemplateElement> = {
            id: `el-${Date.now()}`,
            type,
            animation: 'fade-in',
            zIndex: maxZ + 1,
        };

        let newElement: TemplateElement;

        switch (type) {
            case 'image':
                newElement = {
                    ...baseElement,
                    name: 'New Image',
                    position: { x: (CANVAS_WIDTH - 200) / 2, y: 100 },
                    size: { width: 200, height: 150 },
                    imageUrl: '',
                } as TemplateElement;
                break;
            case 'text':
                newElement = {
                    ...baseElement,
                    name: 'New Text',
                    position: { x: (CANVAS_WIDTH - 280) / 2, y: 100 },
                    size: { width: 280, height: 50 },
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
                } as TemplateElement;
                break;
            case 'icon':
                newElement = {
                    ...baseElement,
                    name: 'New Icon',
                    position: { x: (CANVAS_WIDTH - 60) / 2, y: 100 },
                    size: { width: 60, height: 60 },
                    iconStyle: {
                        iconName: 'Heart',
                        iconColor: '#b8860b',
                        iconSize: 48,
                    },
                } as TemplateElement;
                break;
            case 'countdown':
                newElement = {
                    ...baseElement,
                    name: 'Countdown Timer',
                    position: { x: (CANVAS_WIDTH - 340) / 2, y: 100 },
                    size: { width: 340, height: 100 },
                    countdownConfig: getDefaultCountdownConfig(),
                } as TemplateElement;
                break;
            case 'rsvp_form':
                newElement = {
                    ...baseElement,
                    name: 'RSVP Form',
                    position: { x: (CANVAS_WIDTH - 320) / 2, y: 50 },
                    size: { width: 320, height: 450 },
                    rsvpFormConfig: getDefaultRSVPFormConfig(),
                } as TemplateElement;
                break;
            case 'guest_wishes':
                newElement = {
                    ...baseElement,
                    name: 'Guest Wishes',
                    position: { x: (CANVAS_WIDTH - 340) / 2, y: 50 },
                    size: { width: 340, height: 400 },
                    guestWishesConfig: getDefaultGuestWishesConfig(),
                } as TemplateElement;
                break;
            case 'open_invitation_button':
                newElement = {
                    ...baseElement,
                    name: 'Open Invitation',
                    position: { x: (CANVAS_WIDTH - 200) / 2, y: CANVAS_HEIGHT - 150 }, // Default near bottom
                    size: { width: 200, height: 60 },
                    openInvitationConfig: getDefaultOpenInvitationConfig(),
                } as TemplateElement;
                break;
            default:
                return;
        }

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
        return template?.sections[sectionType]?.elements || [];
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
        toast({
            title: "Template saved!",
            description: "Your changes have been successfully saved.",
            variant: "success",
        });
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !selectedElementId) return;

        setUploadingImage(true);
        try {
            const result = await uploadToR2(file, { folder: 'elements' });

            if (result.success && result.url) {
                // Load image to get dimensions and set proper size
                const img = new Image();
                img.onload = () => {
                    const maxWidth = 300;
                    const aspectRatio = img.naturalWidth / img.naturalHeight;
                    const newWidth = Math.min(img.naturalWidth, maxWidth);
                    const newHeight = newWidth / aspectRatio;

                    updateElement(templateId, activeSection, selectedElementId, {
                        imageUrl: result.url,
                        size: { width: Math.round(newWidth), height: Math.round(newHeight) }
                    });

                    toast({
                        title: "Image Updated",
                        description: "Element image has been uploaded to R2.",
                        variant: "success",
                    });
                };
                img.onerror = () => {
                    toast({
                        title: "Image Load Error",
                        description: "Failed to process uploaded image",
                        variant: "destructive",
                    });
                };
                img.src = result.url;
            } else {
                toast({
                    title: "Upload Failed",
                    description: result.error || "Failed to upload image",
                    variant: "destructive",
                });
            }
        } catch (error) {
            console.error('Image upload error:', error);
            toast({
                title: "Upload Error",
                description: "An unexpected error occurred while uploading",
                variant: "destructive",
            });
        } finally {
            setUploadingImage(false);
        }
    };

    // OLD CODE (FileReader - commented for rollback):
    // const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    //     const file = e.target.files?.[0];
    //     if (file && selectedElementId) {
    //         const reader = new FileReader();
    //         reader.onload = (event) => {
    //             const result = event.target?.result as string;

    //             // Load image to get dimensions and set proper size
    //             const img = new Image();
    //             img.onload = () => {
    //                 const maxWidth = 300;
    //                 const aspectRatio = img.naturalWidth / img.naturalHeight;
    //                 const newWidth = Math.min(img.naturalWidth, maxWidth);
    //                 const newHeight = newWidth / aspectRatio;

    //                 updateElement(templateId, activeSection, selectedElementId, {
    //                     imageUrl: result,
    //                     size: { width: Math.round(newWidth), height: Math.round(newHeight) }
    //                 });
    //             };
    //             img.src = result;
    //         };
    //         reader.readAsDataURL(file);
    //     }
    // };

    // Track if element was dragged to prevent deselect on drag end
    // Moved to top
    // Track if element was already selected when mousedown started
    // Moved to top

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

    // Global mouse move handler for smooth dragging
    useEffect(() => {
        const handleGlobalMouseMove = (e: MouseEvent) => {
            if (resizing) {
                const canvasEl = sectionRefs.current[resizing.sectionType];
                if (!canvasEl) return;

                const dx = e.clientX - resizing.startX;
                const dy = e.clientY - resizing.startY;

                if (!template) return;
                const sectionElements = template.sections[resizing.sectionType]?.elements || [];
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

                // Cancel any pending RAF
                if (rafIdRef.current !== null) {
                    cancelAnimationFrame(rafIdRef.current);
                }

                // Use requestAnimationFrame for smooth resize
                rafIdRef.current = requestAnimationFrame(() => {
                    updateElement(templateId, resizing.sectionType, resizing.elementId, {
                        position: { x: Math.round(newPos.x), y: Math.round(newPos.y) },
                        size: { width: Math.round(newSize.width), height: Math.round(newSize.height) },
                    });
                    rafIdRef.current = null;
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
            if (!e.shiftKey && template) {
                const sectionElements = template.sections[draggingSection]?.elements || [];
                const el = sectionElements.find((el) => el.id === draggingElementId);
                if (el) {
                    x = Math.max(0, Math.min(x, CANVAS_WIDTH - el.size.width));
                    y = Math.max(0, Math.min(y, CANVAS_HEIGHT - el.size.height));
                }
            }

            // Store smooth position (no rounding during drag)
            pendingUpdateRef.current = { x, y };
            lastDragPos.current = { x: Math.round(x), y: Math.round(y) };

            // Cancel any pending RAF
            if (rafIdRef.current !== null) {
                cancelAnimationFrame(rafIdRef.current);
            }

            // Use requestAnimationFrame for smooth drag updates
            rafIdRef.current = requestAnimationFrame(() => {
                if (pendingUpdateRef.current) {
                    updateElement(templateId, draggingSection, draggingElementId, {
                        position: pendingUpdateRef.current,
                    }, { skipDb: true });
                    pendingUpdateRef.current = null;
                }
                rafIdRef.current = null;
            });
        };

        const handleGlobalMouseUp = () => {
            // Cancel any pending RAF
            if (rafIdRef.current !== null) {
                cancelAnimationFrame(rafIdRef.current);
                rafIdRef.current = null;
            }

            // If we were dragging and have a final position, save it to DB now
            if (draggingElementId && draggingSection && lastDragPos.current) {
                updateElement(templateId, draggingSection, draggingElementId, {
                    position: lastDragPos.current,
                });
                lastDragPos.current = null;
            }

            setDraggingElementId(null);
            setDraggingSection(null);
            setResizing(null);
        };

        // Only attach listeners when dragging or resizing
        if (draggingElementId || resizing) {
            window.addEventListener('mousemove', handleGlobalMouseMove, { passive: true });
            window.addEventListener('mouseup', handleGlobalMouseUp);
            return () => {
                window.removeEventListener('mousemove', handleGlobalMouseMove);
                window.removeEventListener('mouseup', handleGlobalMouseUp);
                if (rafIdRef.current !== null) {
                    cancelAnimationFrame(rafIdRef.current);
                }
            };
        }
    }, [draggingElementId, draggingSection, dragOffset, resizing, templateId, updateElement, template]);

    // handleMouseUp is now handled in useEffect with global listener

    if (!template) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-900" suppressHydrationWarning>
                <div className="flex flex-col items-center gap-4">
                    <p className="text-slate-500">Loading template...</p>
                </div>
            </div>
        );
    }

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
        // Exit native fullscreen if active
        if (document.fullscreenElement) {
            document.exitFullscreen();
        }
        setIsPreviewMode(false);
        setIsFullscreen(false);
    };

    // Toggle native fullscreen
    const toggleNativeFullscreen = async () => {
        if (!isFullscreen) {
            try {
                await document.documentElement.requestFullscreen();
                setIsFullscreen(true);
            } catch (err) {
                console.error('Fullscreen not supported:', err);
            }
        } else {
            if (document.fullscreenElement) {
                await document.exitFullscreen();
            }
            setIsFullscreen(false);
        }
    };

    // Listen for fullscreen change events
    // Moved to top

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
    const getAnimationStyle = (el: TemplateElement, isPreview: boolean, isVisible?: boolean) => {
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
            // Looping animations (handled separately in AnimatedElement)
            'sway': '',
            'float': '',
            'pulse': '',
            'sparkle': '',
            'spin': '',
            'shake': '',
            'swing': '',
            'heartbeat': '',
            'glow': '',
        };

        return {
            animation: animationMap[el.animation],
            opacity: 0,
        };
    };

    // Preview Modal Component
    const PreviewModal = () => {
        const [previewScale, setPreviewScale] = useState(1);
        const [isInvitationOpen, setIsInvitationOpen] = useState(false);
        const [isDesktopView, setIsDesktopView] = useState(false);
        const [frameWidth, setFrameWidth] = useState(CANVAS_WIDTH);
        const previewContentRef = useRef<HTMLDivElement>(null);

        // Calculate scale for responsive preview
        useEffect(() => {
            const updateLayout = () => {
                if (isPreviewMode) {
                    const vw = window.innerWidth;
                    const vh = window.innerHeight;
                    const DESKTOP_BREAKPOINT = 768;

                    const desktop = vw >= DESKTOP_BREAKPOINT;
                    setIsDesktopView(desktop);

                    if (desktop) {
                        // Desktop: Use fixed phone-frame width, centered (max 420px)
                        const width = Math.min(420, vw * 0.9);
                        setFrameWidth(width);
                        setPreviewScale(width / CANVAS_WIDTH);
                    } else {
                        // Mobile: True fullscreen
                        setFrameWidth(vw);
                        setPreviewScale(vw / CANVAS_WIDTH);
                    }
                }
            };
            updateLayout();
            window.addEventListener('resize', updateLayout);
            return () => window.removeEventListener('resize', updateLayout);
        }, [isPreviewMode]);

        const handleOpenInvitation = () => {
            setIsInvitationOpen(true);
            // Scroll to next section
            setTimeout(() => {
                const nextSection = previewContentRef.current?.querySelector('[data-section-index="1"]');
                if (nextSection) {
                    nextSection.scrollIntoView({ behavior: 'smooth' });
                }
            }, 100);
        };

        const scaleValue = (val: number) => val * previewScale;

        if (!isPreviewMode) return null;

        // Get Open Invitation config from first section or use default
        const firstSectionDesign = template?.sections[orderedSections[0]];
        const openConfig = firstSectionDesign?.openInvitationConfig || {
            enabled: true,
            buttonText: 'Buka Undangan',
            subText: 'Ketuk untuk membuka',
            buttonColor: '#722f37',
            textColor: '#f5f0e6',
            fontFamily: 'Cormorant Garamond, serif',
            fontSize: 16,
            fontWeight: 'semibold' as const,
            letterSpacing: 0.15,
            textTransform: 'uppercase' as const,
            buttonStyle: 'elegant' as const,
            buttonShape: 'pill' as const,
            animation: 'none' as const,
            position: 'bottom-third' as const,
            showIcon: true,
            iconName: 'mail-open',
            shadowIntensity: 'medium' as const,
        };

        // Get position style for button
        const getButtonPositionStyle = (position: string): React.CSSProperties => {
            switch (position) {
                case 'center':
                    return { top: '50%', transform: 'translateY(-50%)' };
                case 'bottom-center':
                    return { bottom: scaleValue(40) };
                case 'bottom-third':
                default:
                    return { bottom: scaleValue(80) };
            }
        };

        return (
            <div className={`fixed inset-0 z-50 ${isDesktopView ? 'bg-stone-200' : 'bg-black'} flex items-start justify-center overflow-auto`}>
                {/* Preview Header - Hidden when fullscreen */}
                {!isFullscreen && (
                    <div className="fixed top-0 left-0 right-0 z-[9999] flex justify-between items-center p-4 bg-slate-900/90 backdrop-blur-sm">
                        <h2 className="text-white text-lg font-semibold">Preview Mode</h2>
                        <div className="flex gap-2">
                            <button
                                onClick={toggleNativeFullscreen}
                                className="p-2 text-white hover:bg-white/20 rounded-lg transition-colors"
                                title="Fullscreen"
                            >
                                <Maximize size={20} />
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
                )}

                {/* Fullscreen controls overlay */}
                {isFullscreen && (
                    <div className="fixed top-0 left-0 right-0 z-[9999] p-4 opacity-0 hover:opacity-100 transition-opacity duration-300">
                        <div className="flex justify-end gap-2">
                            <button
                                onClick={toggleNativeFullscreen}
                                className="p-2 text-white bg-black/50 hover:bg-white/20 rounded-lg transition-colors"
                                title="Exit Fullscreen"
                            >
                                <Minimize size={20} />
                            </button>
                            <button
                                onClick={closePreview}
                                className="p-2 text-white bg-black/50 hover:bg-white/20 rounded-lg transition-colors"
                                title="Close Preview"
                            >
                                <X size={20} />
                            </button>
                        </div>
                    </div>
                )}

                {/* Content Frame - Phone frame on desktop, fullscreen on mobile */}
                <div
                    ref={previewContentRef}
                    className={`${isDesktopView ? 'mt-20 mb-8 rounded-3xl overflow-hidden shadow-2xl' : 'mt-16'}`}
                    style={{
                        width: frameWidth,
                        maxWidth: isDesktopView ? 420 : '100%',
                        boxShadow: isDesktopView ? '0 25px 80px -12px rgba(0, 0, 0, 0.4), 0 10px 30px -10px rgba(0, 0, 0, 0.3)' : 'none',
                        overflowY: isInvitationOpen ? 'auto' : 'hidden',
                    }}
                >
                    {orderedSections.map((sectionType, index) => {
                        const sectionDesign = template?.sections[sectionType] || { animation: 'none' as const, elements: [] };
                        const sectionElements = sectionDesign.elements || [];
                        const sortedSectionElements = [...sectionElements].sort((a, b) => a.zIndex - b.zIndex);
                        const isVisible = sectionDesign.isVisible !== false;

                        if (!isVisible) return null;

                        const isCover = index === 0;
                        const shouldHide = !isInvitationOpen && !isCover;

                        return (
                            <div
                                key={sectionType}
                                data-section-index={index}
                                className="relative w-full"
                                style={{
                                    minHeight: scaleValue(CANVAS_HEIGHT),
                                    display: shouldHide ? 'none' : 'block',
                                }}
                            >
                                {/* Canvas Background */}
                                <div
                                    className="absolute inset-0"
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
                                </div>

                                {/* Elements with scroll-triggered animations - Scaled */}
                                {sortedSectionElements.map((el) => (
                                    <AnimatedElement
                                        key={el.id}
                                        animation={el.animation}
                                        loopAnimation={el.loopAnimation}
                                        delay={el.animationDelay || 0}
                                        duration={el.animationDuration || 800}
                                        className="absolute"
                                        style={{
                                            left: scaleValue(el.position.x),
                                            top: scaleValue(el.position.y),
                                            width: scaleValue(el.size.width),
                                            height: scaleValue(el.size.height),
                                            zIndex: el.zIndex,
                                        }}
                                    >
                                        {/* Inner wrapper for user transforms (flip/rotation) */}
                                        <div
                                            className="w-full h-full"
                                            style={{ transform: getElementTransform(el) }}
                                        >
                                            {el.type === 'image' && el.imageUrl && (
                                                <NextImage
                                                    src={el.imageUrl}
                                                    alt={el.name}
                                                    fill
                                                    className="object-cover"
                                                    unoptimized
                                                />
                                            )}
                                            {el.type === 'text' && el.textStyle && (
                                                <div
                                                    className="w-full h-full flex items-center"
                                                    style={{
                                                        fontFamily: el.textStyle.fontFamily,
                                                        fontSize: scaleValue(el.textStyle.fontSize),
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
                                            {el.type === 'icon' && (
                                                <div className="w-full h-full flex items-center justify-center">
                                                    {el.iconStyle ? (
                                                        <DynamicIcon
                                                            name={el.iconStyle.iconName}
                                                            size={scaleValue(el.iconStyle.iconSize)}
                                                            color={el.iconStyle.iconColor}
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center bg-slate-100 border border-dashed border-slate-300 rounded">
                                                            <span className="text-[10px] text-slate-400">Icon</span>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                            {el.type === 'countdown' && (
                                                <div className="w-full h-full flex items-center justify-center">
                                                    <div style={{ width: '100%' }}>
                                                        {el.countdownConfig ? (
                                                            <CountdownTimer config={el.countdownConfig} />
                                                        ) : (
                                                            <div className="w-full h-12 flex items-center justify-center bg-slate-100 border border-dashed border-slate-300 rounded">
                                                                <span className="text-xs text-slate-400">Timer Element</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                            {el.type === 'rsvp_form' && (
                                                <div className="w-full h-full overflow-y-auto">
                                                    {el.rsvpFormConfig ? (
                                                        <RSVPForm config={el.rsvpFormConfig} templateId={templateId} />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center bg-slate-100 border border-dashed border-slate-300">
                                                            <span className="text-xs text-slate-400">RSVP Form</span>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                            {el.type === 'guest_wishes' && (
                                                <div className="w-full h-full overflow-y-auto">
                                                    {el.guestWishesConfig ? (
                                                        <GuestWishes config={el.guestWishesConfig} wishes={[]} />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center bg-slate-100 border border-dashed border-slate-300">
                                                            <span className="text-xs text-slate-400">Guest Wishes</span>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </AnimatedElement>
                                ))}

                                {/* Open Invitation Button - Only on Cover (First Section) */}
                                {isCover && !isInvitationOpen && openConfig.enabled && (
                                    <div
                                        className="absolute left-0 right-0 flex justify-center z-50"
                                        style={getButtonPositionStyle(openConfig.position || 'bottom-third')}
                                    >
                                        <button
                                            onClick={handleOpenInvitation}
                                            className="px-8 py-3 transition-all duration-300 transform hover:scale-105 active:scale-95 flex items-center gap-2 shadow-lg"
                                            style={{
                                                backgroundColor: openConfig.buttonColor,
                                                color: openConfig.textColor,
                                                fontFamily: openConfig.fontFamily,
                                                fontSize: scaleValue(openConfig.fontSize),
                                                fontWeight: openConfig.fontWeight === 'bold' ? 700 : openConfig.fontWeight === 'semibold' ? 600 : 500,
                                                letterSpacing: openConfig.letterSpacing ? `${openConfig.letterSpacing}em` : '0.1em',
                                                textTransform: openConfig.textTransform || 'uppercase',
                                                borderRadius: openConfig.buttonShape === 'pill' ? '9999px' : openConfig.buttonShape === 'rounded' ? '12px' : '4px',
                                            }}
                                        >
                                            <span>{openConfig.buttonText}</span>
                                        </button>
                                    </div>
                                )}
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
                    @keyframes float {
                        0%, 100% { transform: translateY(0); }
                        50% { transform: translateY(-10px); }
                    }
                    .animate-float {
                        animation: float 3s ease-in-out infinite;
                    }
                `}</style>
            </div>
        );
    };

    return (
        <ClientOnly>
            <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800" suppressHydrationWarning>
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
                                <span className={`text-xs px-2 py-1 rounded ${template.status === 'published' ? 'bg-green-500/20 text-green-400' : 'bg-amber-500/20 text-amber-400'}`}>
                                    {template.status === 'published' ? 'Published' : 'Draft'}
                                </span>
                                <Button variant="outline" onClick={startPreview} className="flex items-center gap-2 text-slate-300 border-slate-600">
                                    <Play size={16} />
                                    Preview
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        updateTemplate(templateId, { name: templateName, status: 'draft' });
                                        toast({
                                            title: "Draft Saved",
                                            description: "Template saved as draft.",
                                            variant: "success",
                                        });
                                    }}
                                    className="flex items-center gap-2 text-slate-300 border-slate-600"
                                >
                                    <Save size={16} />
                                    Save Draft
                                </Button>
                                <Button
                                    onClick={() => {
                                        updateTemplate(templateId, { name: templateName, status: 'published' });
                                        toast({
                                            title: "Template Published!",
                                            description: "Your template is now live in the Template Store.",
                                            variant: "success",
                                        });
                                    }}
                                    className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
                                >
                                    <ExternalLink size={16} />
                                    Publish
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
                                                    onClick={() => {
                                                        setInputModal({
                                                            isOpen: true,
                                                            mode: 'rename_page',
                                                            targetId: sectionType,
                                                            defaultValue: pageTitle
                                                        });
                                                    }}
                                                    className="p-1 hover:bg-slate-700 rounded text-slate-500 hover:text-white"
                                                    title="Rename Page"
                                                >
                                                    <Edit2 size={12} />
                                                </button>
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
                                                        setSectionSelectModal({
                                                            isOpen: true,
                                                            mode: 'copy_section',
                                                            sourceId: sectionType
                                                        });
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

                                        {/* Simplified Page Row - No Preview (matching Image 1) */}
                                        <div
                                            onClick={() => { setActiveSection(sectionType); setSelectedElement(null); }}
                                            className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-all ${activeSection === sectionType
                                                ? 'bg-blue-600/20 border border-blue-500'
                                                : 'bg-slate-700/30 hover:bg-slate-700/50 border border-transparent'
                                                } ${!isVisible ? 'opacity-50' : ''}`}
                                        >
                                            <span className="text-sm text-white truncate">{pageTitle}</span>
                                            {activeSection === sectionType && (
                                                <span className="text-[10px] bg-blue-500 text-white px-2 py-0.5 rounded">Editing</span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}

                            {/* Add Custom Page Button */}
                            <div className="mt-4 pt-4 border-t border-slate-700">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full text-slate-300 border-slate-600 border-dashed hover:border-blue-500 hover:text-blue-400"
                                    onClick={() => setInputModal({ isOpen: true, mode: 'add_page' })}
                                >
                                    <Plus size={14} className="mr-1" /> Tambah Halaman Baru
                                </Button>
                            </div>
                        </div>

                        {/* Modals */}
                        <SectionSelectModal
                            isOpen={sectionSelectModal.isOpen}
                            onClose={() => setSectionSelectModal({ ...sectionSelectModal, isOpen: false })}
                            onSelect={handleSectionSelect}
                            title={sectionSelectModal.mode === 'copy_section' ? "Copy to Section" : "Paste Element to"}
                            sections={getAvailableSections()}
                            description={sectionSelectModal.mode === 'copy_section' ? "Select the destination section to copy this layout to." : "Select the section to paste the element."}
                        />

                        <InputModal
                            isOpen={inputModal.isOpen}
                            onClose={() => setInputModal({ ...inputModal, isOpen: false })}
                            onSubmit={handleInputModalSubmit}
                            title={inputModal.mode === 'rename_page' ? "Rename Page" : "Add New Page"}
                            label="Page Name"
                            placeholder="e.g., Galeri, Denah Lokasi..."
                            confirmText={inputModal.mode === 'rename_page' ? "Save Changes" : "Create Page"}
                            defaultValue={inputModal.defaultValue}
                        />


                        {/* Admin Thumbnail Section */}
                        <div className="p-3 border-t border-slate-700">
                            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                                Admin - Thumbnail
                            </h2>
                            <div className="relative rounded-lg overflow-hidden bg-slate-700 aspect-[4/3]">
                                {template.thumbnail ? (
                                    <NextImage
                                        src={template.thumbnail}
                                        alt="Thumbnail"
                                        fill
                                        className="object-cover"
                                        unoptimized
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-slate-500">
                                        <ImageIcon size={24} />
                                    </div>
                                )}
                                <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <Button
                                        size="sm"
                                        variant="secondary"
                                        className="text-xs"
                                        onClick={() => thumbnailInputRef.current?.click()}
                                        disabled={uploadingThumbnail}
                                    >
                                        <Upload size={12} className="mr-1" />
                                        {uploadingThumbnail ? 'Uploading...' : 'Ubah Thumbnail'}
                                    </Button>
                                    <input
                                        type="file"
                                        ref={thumbnailInputRef}
                                        className="hidden"
                                        accept="image/*"
                                        onChange={handleThumbnailUpload}
                                    />
                                </div>
                            </div>
                            <p className="text-[10px] text-slate-500 mt-1 text-center">
                                Thumbnail hanya terlihat oleh admin
                            </p>
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
                                        <div className="grid grid-cols-2 gap-2">
                                            <Button size="sm" variant="outline" onClick={() => handleAddElement('image')} className="text-slate-300 border-slate-600 text-xs py-2">
                                                <ImageIcon size={14} className="mr-1" /> Image
                                            </Button>
                                            <Button size="sm" variant="outline" onClick={() => handleAddElement('text')} className="text-slate-300 border-slate-600 text-xs py-2">
                                                <Type size={14} className="mr-1" /> Text
                                            </Button>
                                            <Button size="sm" variant="outline" onClick={() => handleAddElement('icon')} className="text-slate-300 border-slate-600 text-xs py-2">
                                                <Heart size={14} className="mr-1" /> Icon
                                            </Button>
                                            <Button size="sm" variant="outline" onClick={() => handleAddElement('countdown')} className="text-slate-300 border-slate-600 text-xs py-2">
                                                <Clock size={14} className="mr-1" /> Countdown
                                            </Button>
                                            <Button size="sm" variant="outline" onClick={() => handleAddElement('rsvp_form')} className="text-slate-300 border-slate-600 text-xs py-2">
                                                <MessageSquare size={14} className="mr-1" /> RSVP Form
                                            </Button>
                                            <Button size="sm" variant="outline" onClick={() => handleAddElement('guest_wishes')} className="text-slate-300 border-slate-600 text-xs py-2">
                                                <Users size={14} className="mr-1" /> Wishes
                                            </Button>
                                            <Button size="sm" variant="outline" onClick={() => handleAddElement('open_invitation_button')} className="text-slate-300 border-slate-600 text-xs py-2">
                                                <MailOpen size={14} className="mr-1" /> Open Inv.
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
                                                        {el.type === 'image' && <ImageIcon size={14} />}
                                                        {el.type === 'text' && <Type size={14} />}
                                                        {el.type === 'icon' && <Heart size={14} />}
                                                        {el.type === 'countdown' && <Clock size={14} />}
                                                        {el.type === 'rsvp_form' && <MessageSquare size={14} />}
                                                        {el.type === 'guest_wishes' && <Users size={14} />}
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
                                                            disabled={uploadingImage}
                                                            className="w-full text-slate-300 border-slate-600 text-xs"
                                                        >
                                                            <Upload size={14} className="mr-1" />
                                                            {uploadingImage ? 'Uploading...' : 'Upload Image'}
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

                                            {/* Loop Animation Controls */}
                                            <div className="mb-3 border-t border-slate-700 pt-3">
                                                <Label className="text-slate-300 text-xs mb-2 block">Loop Animation (Continuous)</Label>
                                                <select
                                                    value={selectedElement.loopAnimation || 'none'}
                                                    onChange={(e) => handleElementChange('loopAnimation', e.target.value === 'none' ? undefined : e.target.value)}
                                                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm h-8"
                                                >
                                                    <option value="none">None</option>
                                                    <option value="sway">🌸 Sway (Flower movement)</option>
                                                    <option value="float">☁️ Float (Up-down)</option>
                                                    <option value="pulse">💗 Pulse (Scale)</option>
                                                    <option value="sparkle">✨ Sparkle (Twinkle)</option>
                                                    <option value="spin">🔄 Spin (Rotate)</option>
                                                    <option value="shake">📳 Shake (Vibrate)</option>
                                                    <option value="swing">🔔 Swing (Pendulum)</option>
                                                    <option value="heartbeat">❤️ Heartbeat</option>
                                                    <option value="glow">🌟 Glow (Aura)</option>
                                                </select>
                                                <p className="text-xs text-slate-500 mt-1">Combines with entrance animation above</p>
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
                                                        <select value={selectedElement.textStyle.fontFamily} onChange={(e) => handleTextStyleChange('fontFamily', e.target.value)} className="w-full mt-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm h-10">
                                                            {FONT_FAMILIES.map((f) => <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>)}
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

                                            {/* Icon Settings */}
                                            {selectedElement.type === 'icon' && selectedElement.iconStyle && (
                                                <div className="border-t border-slate-700 pt-3">
                                                    <h4 className="text-xs font-semibold text-slate-400 uppercase mb-2">Icon Settings</h4>

                                                    <div className="mb-3">
                                                        <Label className="text-slate-300 text-xs">Icon</Label>
                                                        <div className="mt-1 space-y-4 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                                                            {Object.entries(ICON_CATEGORIES).map(([category, icons]) => (
                                                                <div key={category}>
                                                                    <h5 className="text-[10px] font-semibold text-slate-500 uppercase mb-2 sticky top-0 bg-slate-800 py-1">{category}</h5>
                                                                    <div className="grid grid-cols-5 gap-2">
                                                                        {icons.map((icon) => (
                                                                            <button
                                                                                key={icon}
                                                                                onClick={() => handleElementChange('iconStyle', { ...selectedElement.iconStyle!, iconName: icon })}
                                                                                className={`aspect-square rounded flex items-center justify-center transition-all ${selectedElement.iconStyle?.iconName === icon
                                                                                    ? 'bg-blue-600 text-white ring-2 ring-blue-400 ring-offset-1 ring-offset-slate-800'
                                                                                    : 'bg-slate-700 text-slate-400 hover:bg-slate-600 hover:text-white'
                                                                                    }`}
                                                                                title={icon}
                                                                            >
                                                                                <DynamicIcon name={icon} size={20} />
                                                                            </button>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    <div className="mb-3">
                                                        <Label className="text-slate-300 text-xs">Size</Label>
                                                        <Input
                                                            type="number"
                                                            min="12"
                                                            max="200"
                                                            value={selectedElement.iconStyle.iconSize}
                                                            onChange={(e) => handleElementChange('iconStyle', { ...selectedElement.iconStyle, iconSize: parseInt(e.target.value) || 48 })}
                                                            className="mt-1 bg-slate-700 border-slate-600 text-white text-sm h-8"
                                                        />
                                                    </div>

                                                    <div className="mb-3">
                                                        <Label className="text-slate-300 text-xs">Color</Label>
                                                        <div className="flex gap-2 mt-1">
                                                            <input
                                                                type="color"
                                                                value={selectedElement.iconStyle.iconColor}
                                                                onChange={(e) => handleElementChange('iconStyle', { ...selectedElement.iconStyle, iconColor: e.target.value })}
                                                                className="w-8 h-8 rounded cursor-pointer border-0"
                                                            />
                                                            <Input
                                                                value={selectedElement.iconStyle.iconColor}
                                                                onChange={(e) => handleElementChange('iconStyle', { ...selectedElement.iconStyle, iconColor: e.target.value })}
                                                                className="flex-1 bg-slate-700 border-slate-600 text-white text-sm h-8"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Countdown Settings */}
                                            {selectedElement.type === 'countdown' && selectedElement.countdownConfig && (
                                                <div className="border-t border-slate-700 pt-3">
                                                    <h4 className="text-xs font-semibold text-slate-400 uppercase mb-2">Countdown Settings</h4>

                                                    <div className="mb-3">
                                                        <Label className="text-slate-300 text-xs">Target Date</Label>
                                                        <Input
                                                            type="datetime-local"
                                                            value={selectedElement.countdownConfig.targetDate.slice(0, 16)}
                                                            onChange={(e) => handleElementChange('countdownConfig', { ...selectedElement.countdownConfig, targetDate: new Date(e.target.value).toISOString() })}
                                                            className="mt-1 bg-slate-700 border-slate-600 text-white text-sm h-8"
                                                        />
                                                    </div>

                                                    <div className="mb-3">
                                                        <Label className="text-slate-300 text-xs">Style</Label>
                                                        <select
                                                            value={selectedElement.countdownConfig.style}
                                                            onChange={(e) => handleElementChange('countdownConfig', { ...selectedElement.countdownConfig, style: e.target.value })}
                                                            className="w-full mt-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm h-8"
                                                        >
                                                            <option value="elegant">Elegant</option>
                                                            <option value="minimal">Minimal</option>
                                                            <option value="flip">Flip</option>
                                                            <option value="circle">Circle</option>
                                                            <option value="card">Card</option>
                                                            <option value="neon">Neon</option>
                                                        </select>
                                                    </div>

                                                    <div className="mb-3 grid grid-cols-2 gap-2">
                                                        <label className="flex items-center gap-2 text-xs text-slate-300">
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedElement.countdownConfig.showDays}
                                                                onChange={(e) => handleElementChange('countdownConfig', { ...selectedElement.countdownConfig, showDays: e.target.checked })}
                                                            />
                                                            Days
                                                        </label>
                                                        <label className="flex items-center gap-2 text-xs text-slate-300">
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedElement.countdownConfig.showHours}
                                                                onChange={(e) => handleElementChange('countdownConfig', { ...selectedElement.countdownConfig, showHours: e.target.checked })}
                                                            />
                                                            Hours
                                                        </label>
                                                        <label className="flex items-center gap-2 text-xs text-slate-300">
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedElement.countdownConfig.showMinutes}
                                                                onChange={(e) => handleElementChange('countdownConfig', { ...selectedElement.countdownConfig, showMinutes: e.target.checked })}
                                                            />
                                                            Minutes
                                                        </label>
                                                        <label className="flex items-center gap-2 text-xs text-slate-300">
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedElement.countdownConfig.showSeconds}
                                                                onChange={(e) => handleElementChange('countdownConfig', { ...selectedElement.countdownConfig, showSeconds: e.target.checked })}
                                                            />
                                                            Seconds
                                                        </label>
                                                    </div>

                                                    <div className="mb-3">
                                                        <Label className="text-slate-300 text-xs">Label Color</Label>
                                                        <div className="flex gap-2 mt-1">
                                                            <input
                                                                type="color"
                                                                value={selectedElement.countdownConfig.labelColor || '#000000'}
                                                                onChange={(e) => handleElementChange('countdownConfig', {
                                                                    ...selectedElement.countdownConfig,
                                                                    labelColor: e.target.value,
                                                                    dayLabelColor: '',
                                                                    hourLabelColor: '',
                                                                    minuteLabelColor: '',
                                                                    secondLabelColor: ''
                                                                })}
                                                                className="w-8 h-8 rounded cursor-pointer border-0"
                                                            />
                                                            <Input
                                                                value={selectedElement.countdownConfig.labelColor || '#000000'}
                                                                onChange={(e) => handleElementChange('countdownConfig', {
                                                                    ...selectedElement.countdownConfig,
                                                                    labelColor: e.target.value,
                                                                    dayLabelColor: '',
                                                                    hourLabelColor: '',
                                                                    minuteLabelColor: '',
                                                                    secondLabelColor: ''
                                                                })}
                                                                className="flex-1 bg-slate-700 border-slate-600 text-white text-sm h-8"
                                                            />
                                                        </div>
                                                    </div>

                                                    <div className="mb-3">
                                                        <Label className="text-slate-300 text-xs">Accent Color</Label>
                                                        <div className="flex gap-2 mt-1">
                                                            <input
                                                                type="color"
                                                                value={selectedElement.countdownConfig.accentColor}
                                                                onChange={(e) => handleElementChange('countdownConfig', { ...selectedElement.countdownConfig, accentColor: e.target.value })}
                                                                className="w-8 h-8 rounded cursor-pointer border-0"
                                                            />
                                                            <Input
                                                                value={selectedElement.countdownConfig.accentColor}
                                                                onChange={(e) => handleElementChange('countdownConfig', { ...selectedElement.countdownConfig, accentColor: e.target.value })}
                                                                className="flex-1 bg-slate-700 border-slate-600 text-white text-sm h-8"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* RSVP Form Settings */}
                                            {selectedElement.type === 'rsvp_form' && selectedElement.rsvpFormConfig && (
                                                <div className="border-t border-slate-700 pt-3">
                                                    <h4 className="text-xs font-semibold text-slate-400 uppercase mb-2">RSVP Form Settings</h4>

                                                    <div className="mb-3 space-y-2">
                                                        <label className="flex items-center gap-2 text-xs text-slate-300">
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedElement.rsvpFormConfig.showNameField}
                                                                onChange={(e) => handleElementChange('rsvpFormConfig', { ...selectedElement.rsvpFormConfig, showNameField: e.target.checked })}
                                                            />
                                                            Show Name Field
                                                        </label>
                                                        <label className="flex items-center gap-2 text-xs text-slate-300">
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedElement.rsvpFormConfig.showEmailField}
                                                                onChange={(e) => handleElementChange('rsvpFormConfig', { ...selectedElement.rsvpFormConfig, showEmailField: e.target.checked })}
                                                            />
                                                            Show Email Field
                                                        </label>
                                                        <label className="flex items-center gap-2 text-xs text-slate-300">
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedElement.rsvpFormConfig.showPhoneField}
                                                                onChange={(e) => handleElementChange('rsvpFormConfig', { ...selectedElement.rsvpFormConfig, showPhoneField: e.target.checked })}
                                                            />
                                                            Show Phone Field
                                                        </label>
                                                        <label className="flex items-center gap-2 text-xs text-slate-300">
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedElement.rsvpFormConfig.showMessageField}
                                                                onChange={(e) => handleElementChange('rsvpFormConfig', { ...selectedElement.rsvpFormConfig, showMessageField: e.target.checked })}
                                                            />
                                                            Show Message Field
                                                        </label>
                                                        <label className="flex items-center gap-2 text-xs text-slate-300">
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedElement.rsvpFormConfig.showAttendanceField}
                                                                onChange={(e) => handleElementChange('rsvpFormConfig', { ...selectedElement.rsvpFormConfig, showAttendanceField: e.target.checked })}
                                                            />
                                                            Show Attendance Field
                                                        </label>
                                                    </div>

                                                    <div className="mb-3">
                                                        <Label className="text-slate-300 text-xs">Button Color</Label>
                                                        <div className="flex gap-2 mt-1">
                                                            <input
                                                                type="color"
                                                                value={selectedElement.rsvpFormConfig.buttonColor}
                                                                onChange={(e) => handleElementChange('rsvpFormConfig', { ...selectedElement.rsvpFormConfig, buttonColor: e.target.value })}
                                                                className="w-8 h-8 rounded cursor-pointer border-0"
                                                            />
                                                            <Input
                                                                value={selectedElement.rsvpFormConfig.buttonColor}
                                                                onChange={(e) => handleElementChange('rsvpFormConfig', { ...selectedElement.rsvpFormConfig, buttonColor: e.target.value })}
                                                                className="flex-1 bg-slate-700 border-slate-600 text-white text-sm h-8"
                                                            />
                                                        </div>
                                                    </div>

                                                    <div className="mb-3">
                                                        <Label className="text-slate-300 text-xs">Submit Button Text</Label>
                                                        <Input
                                                            value={selectedElement.rsvpFormConfig.submitButtonText}
                                                            onChange={(e) => handleElementChange('rsvpFormConfig', { ...selectedElement.rsvpFormConfig, submitButtonText: e.target.value })}
                                                            className="mt-1 bg-slate-700 border-slate-600 text-white text-sm h-8"
                                                        />
                                                    </div>
                                                </div>
                                            )}

                                            {/* Guest Wishes Settings */}
                                            {selectedElement.type === 'guest_wishes' && selectedElement.guestWishesConfig && (
                                                <div className="border-t border-slate-700 pt-3">
                                                    <h4 className="text-xs font-semibold text-slate-400 uppercase mb-2">Guest Wishes Settings</h4>

                                                    <div className="mb-3">
                                                        <Label className="text-slate-300 text-xs">Layout</Label>
                                                        <select
                                                            value={selectedElement.guestWishesConfig.layout}
                                                            onChange={(e) => handleElementChange('guestWishesConfig', { ...selectedElement.guestWishesConfig, layout: e.target.value })}
                                                            className="w-full mt-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm h-8"
                                                        >
                                                            <option value="list">List</option>
                                                            <option value="grid">Grid</option>
                                                            <option value="masonry">Masonry</option>
                                                        </select>
                                                    </div>

                                                    <div className="mb-3">
                                                        <Label className="text-slate-300 text-xs">Max Display</Label>
                                                        <Input
                                                            type="number"
                                                            min="1"
                                                            max="100"
                                                            value={selectedElement.guestWishesConfig.maxDisplayCount}
                                                            onChange={(e) => handleElementChange('guestWishesConfig', { ...selectedElement.guestWishesConfig, maxDisplayCount: parseInt(e.target.value) || 20 })}
                                                            className="mt-1 bg-slate-700 border-slate-600 text-white text-sm h-8"
                                                        />
                                                    </div>

                                                    <label className="flex items-center gap-2 text-xs text-slate-300 mb-3">
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedElement.guestWishesConfig.showTimestamp}
                                                            onChange={(e) => handleElementChange('guestWishesConfig', { ...selectedElement.guestWishesConfig, showTimestamp: e.target.checked })}
                                                        />
                                                        Show Timestamp
                                                    </label>

                                                    <div className="mb-3">
                                                        <Label className="text-slate-300 text-xs">Card Background</Label>
                                                        <div className="flex gap-2 mt-1">
                                                            <input
                                                                type="color"
                                                                value={selectedElement.guestWishesConfig.cardBackgroundColor}
                                                                onChange={(e) => handleElementChange('guestWishesConfig', { ...selectedElement.guestWishesConfig, cardBackgroundColor: e.target.value })}
                                                                className="w-8 h-8 rounded cursor-pointer border-0"
                                                            />
                                                            <Input
                                                                value={selectedElement.guestWishesConfig.cardBackgroundColor}
                                                                onChange={(e) => handleElementChange('guestWishesConfig', { ...selectedElement.guestWishesConfig, cardBackgroundColor: e.target.value })}
                                                                className="flex-1 bg-slate-700 border-slate-600 text-white text-sm h-8"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Open Invitation Settings */}
                                            {selectedElement.type === 'open_invitation_button' && selectedElement.openInvitationConfig && (
                                                <div className="border-t border-slate-700 pt-3">
                                                    <h4 className="text-xs font-semibold text-slate-400 uppercase mb-2">Open Invitation Settings</h4>

                                                    <div className="mb-3">
                                                        <Label className="text-slate-300 text-xs">Button Text</Label>
                                                        <Input
                                                            value={selectedElement.openInvitationConfig.buttonText}
                                                            onChange={(e) => handleElementChange('openInvitationConfig', { ...selectedElement.openInvitationConfig, buttonText: e.target.value })}
                                                            className="mt-1 bg-slate-700 border-slate-600 text-white text-sm h-8"
                                                        />
                                                    </div>

                                                    <div className="mb-3">
                                                        <Label className="text-slate-300 text-xs">Sub Text</Label>
                                                        <Input
                                                            value={selectedElement.openInvitationConfig.subText || ''}
                                                            onChange={(e) => handleElementChange('openInvitationConfig', { ...selectedElement.openInvitationConfig, subText: e.target.value })}
                                                            className="mt-1 bg-slate-700 border-slate-600 text-white text-sm h-8"
                                                            placeholder="Optional subtitle"
                                                        />
                                                    </div>

                                                    <div className="mb-3">
                                                        <Label className="text-slate-300 text-xs">Style</Label>
                                                        <select
                                                            value={selectedElement.openInvitationConfig.buttonStyle}
                                                            onChange={(e) => handleElementChange('openInvitationConfig', { ...selectedElement.openInvitationConfig, buttonStyle: e.target.value })}
                                                            className="w-full mt-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm h-8"
                                                        >
                                                            <option value="elegant">Elegant</option>
                                                            <option value="minimal">Minimal</option>
                                                            <option value="glass">Glass</option>
                                                            <option value="outline">Outline</option>
                                                            <option value="neon">Neon</option>
                                                            <option value="gradient">Gradient</option>
                                                            <option value="luxury">Luxury</option>
                                                            <option value="romantic">Romantic</option>
                                                            <option value="boho">Boho</option>
                                                            <option value="modern">Modern</option>
                                                            <option value="vintage">Vintage</option>
                                                            <option value="playful">Playful</option>
                                                            <option value="rustic">Rustic</option>
                                                            <option value="cloud">Cloud</option>
                                                            <option value="sticker">Sticker</option>
                                                        </select>
                                                    </div>

                                                    <div className="mb-3">
                                                        <Label className="text-slate-300 text-xs">Shape</Label>
                                                        <select
                                                            value={selectedElement.openInvitationConfig.buttonShape}
                                                            onChange={(e) => handleElementChange('openInvitationConfig', { ...selectedElement.openInvitationConfig, buttonShape: e.target.value })}
                                                            className="w-full mt-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm h-8"
                                                        >
                                                            <option value="pill">Pill</option>
                                                            <option value="rounded">Rounded</option>
                                                            <option value="rectangle">Rectangle</option>
                                                            <option value="stadium">Stadium</option>
                                                        </select>
                                                    </div>

                                                    <div className="mb-3">
                                                        <Label className="text-slate-300 text-xs">Font Family</Label>
                                                        <select
                                                            value={selectedElement.openInvitationConfig.fontFamily}
                                                            onChange={(e) => handleElementChange('openInvitationConfig', { ...selectedElement.openInvitationConfig, fontFamily: e.target.value })}
                                                            className="w-full mt-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm h-8"
                                                        >
                                                            {FONT_FAMILIES.map((f) => <option key={f} value={f}>{f}</option>)}
                                                        </select>
                                                    </div>

                                                    <div className="mb-3">
                                                        <Label className="text-slate-300 text-xs">Font Size</Label>
                                                        <select
                                                            value={selectedElement.openInvitationConfig.fontSize}
                                                            onChange={(e) => handleElementChange('openInvitationConfig', { ...selectedElement.openInvitationConfig, fontSize: parseInt(e.target.value) })}
                                                            className="w-full mt-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm h-8"
                                                        >
                                                            {FONT_SIZES.map((s) => <option key={s} value={s}>{s}px</option>)}
                                                        </select>
                                                    </div>

                                                    <div className="mb-3">
                                                        <Label className="text-slate-300 text-xs">Button Color</Label>
                                                        <div className="flex gap-2 mt-1">
                                                            <input
                                                                type="color"
                                                                value={selectedElement.openInvitationConfig.buttonColor}
                                                                onChange={(e) => handleElementChange('openInvitationConfig', { ...selectedElement.openInvitationConfig, buttonColor: e.target.value })}
                                                                className="w-8 h-8 rounded cursor-pointer border-0"
                                                            />
                                                            <Input
                                                                value={selectedElement.openInvitationConfig.buttonColor}
                                                                onChange={(e) => handleElementChange('openInvitationConfig', { ...selectedElement.openInvitationConfig, buttonColor: e.target.value })}
                                                                className="flex-1 bg-slate-700 border-slate-600 text-white text-sm h-8"
                                                            />
                                                        </div>
                                                    </div>

                                                    <div className="mb-3">
                                                        <Label className="text-slate-300 text-xs">Text Color</Label>
                                                        <div className="flex gap-2 mt-1">
                                                            <input
                                                                type="color"
                                                                value={selectedElement.openInvitationConfig.textColor}
                                                                onChange={(e) => handleElementChange('openInvitationConfig', { ...selectedElement.openInvitationConfig, textColor: e.target.value })}
                                                                className="w-8 h-8 rounded cursor-pointer border-0"
                                                            />
                                                            <Input
                                                                value={selectedElement.openInvitationConfig.textColor}
                                                                onChange={(e) => handleElementChange('openInvitationConfig', { ...selectedElement.openInvitationConfig, textColor: e.target.value })}
                                                                className="flex-1 bg-slate-700 border-slate-600 text-white text-sm h-8"
                                                            />
                                                        </div>
                                                    </div>

                                                    <div className="mb-3 flex items-center justify-between">
                                                        <Label className="text-slate-300 text-xs">Show Icon</Label>
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedElement.openInvitationConfig.showIcon}
                                                            onChange={(e) => handleElementChange('openInvitationConfig', { ...selectedElement.openInvitationConfig, showIcon: e.target.checked })}
                                                            className="w-4 h-4 rounded"
                                                        />
                                                    </div>

                                                    {selectedElement.openInvitationConfig.showIcon && (
                                                        <div className="mb-3">
                                                            <Label className="text-slate-300 text-xs">Icon Name</Label>
                                                            <select
                                                                value={selectedElement.openInvitationConfig.iconName || 'mail-open'}
                                                                onChange={(e) => handleElementChange('openInvitationConfig', { ...selectedElement.openInvitationConfig, iconName: e.target.value })}
                                                                className="w-full mt-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm h-8"
                                                            >
                                                                <option value="mail-open">Mail Open</option>
                                                                <option value="heart">Heart</option>
                                                                <option value="sparkles">Sparkles</option>
                                                                <option value="mail">Mail</option>
                                                                <option value="send">Send</option>
                                                                <option value="star">Star</option>
                                                                <option value="coffee">Coffee</option>
                                                                <option value="cloud">Cloud</option>
                                                                <option value="gift">Gift</option>
                                                                <option value="anchor">Anchor</option>
                                                                <option value="feather">Feather</option>
                                                                <option value="smile">Smile</option>
                                                                <option value="zap">Zap</option>
                                                            </select>
                                                        </div>
                                                    )}
                                                </div>
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
                                                        setSectionSelectModal({
                                                            isOpen: true,
                                                            mode: 'copy_section',
                                                            sourceId: sectionType
                                                        });
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

                                        {/* Canvas Background & Content - Using Konva for smooth drag */}
                                        <div
                                            ref={(el) => { sectionRefs.current[sectionType] = el; }}
                                            className="absolute inset-0 overflow-hidden"
                                        >
                                            <KonvaCanvas
                                                sectionType={sectionType}
                                                elements={sortedSectionElements.filter(el => el.type === 'image' || el.type === 'text')}
                                                selectedElementId={selectedElementId}
                                                backgroundColor={sectionDesign.backgroundColor || '#ffffff'}
                                                backgroundUrl={sectionDesign.backgroundUrl}
                                                overlayOpacity={sectionDesign.overlayOpacity}
                                                onElementSelect={(id) => setSelectedElement(id)}
                                                onElementDrag={(elementId, x, y) => {
                                                    updateElement(templateId, sectionType, elementId, {
                                                        position: { x, y },
                                                    }, { skipDb: true });
                                                }}
                                                onElementDragEnd={(elementId, x, y) => {
                                                    updateElement(templateId, sectionType, elementId, {
                                                        position: { x, y },
                                                    });
                                                }}
                                                getElementTransform={getElementTransform}
                                                scale={1}
                                            />

                                            {/* Resize handles overlay for Konva elements */}
                                            {sortedSectionElements
                                                .filter(el => (el.type === 'image' || el.type === 'text') && selectedElementId === el.id)
                                                .map((el) => (
                                                    <div
                                                        key={`resize-${el.id}`}
                                                        className="absolute"
                                                        style={{
                                                            left: el.position.x,
                                                            top: el.position.y,
                                                            width: el.size.width,
                                                            height: el.size.height,
                                                            zIndex: 1000,
                                                            pointerEvents: 'none',
                                                        }}
                                                    >
                                                        <div style={{ pointerEvents: 'auto' }}>
                                                            <ResizeHandles elementId={el.id} sectionType={sectionType} />
                                                        </div>
                                                    </div>
                                                ))}

                                            {/* HTML Overlay for complex elements (icon, countdown, rsvp_form, etc.) */}
                                            {sortedSectionElements
                                                .filter(el => el.type !== 'image' && el.type !== 'text')
                                                .map((el) => {
                                                    const isDragging = draggingElementId === el.id && draggingSection === sectionType;
                                                    return (
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
                                                                willChange: isDragging ? 'transform' : 'auto',
                                                                transition: isDragging ? 'none' : undefined,
                                                            }}
                                                            onMouseDown={(e) => handleMouseDown(e, el.id, sectionType)}
                                                            onClick={(e) => handleElementClick(e, el.id, sectionType)}
                                                        >
                                                            {/* Selection Ring */}
                                                            {selectedElementId === el.id && (
                                                                <div className="absolute -inset-0.5 border-2 border-blue-500 pointer-events-none z-50" />
                                                            )}

                                                            {el.type === 'icon' && (
                                                                <div className="w-full h-full flex items-center justify-center pointer-events-none">
                                                                    {el.iconStyle ? (
                                                                        <DynamicIcon
                                                                            name={el.iconStyle.iconName}
                                                                            size={el.iconStyle.iconSize}
                                                                            color={el.iconStyle.iconColor}
                                                                        />
                                                                    ) : (
                                                                        <div className="w-full h-full flex items-center justify-center bg-slate-100 border border-dashed border-slate-300 rounded opacity-50">
                                                                            <span className="text-[10px] text-slate-400">Icon</span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                                                            {el.type === 'countdown' && (
                                                                <div className="w-full h-full flex items-center justify-center pointer-events-none">
                                                                    <div style={{ width: '100%' }}>
                                                                        {el.countdownConfig ? (
                                                                            <CountdownTimer config={el.countdownConfig} />
                                                                        ) : (
                                                                            <div className="w-full h-12 flex items-center justify-center bg-slate-100 border border-dashed border-slate-300 rounded opacity-50">
                                                                                <span className="text-xs text-slate-400">Timer Element</span>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            )}
                                                            {el.type === 'rsvp_form' && (
                                                                <div className="w-full h-full overflow-y-auto pointer-events-none">
                                                                    {el.rsvpFormConfig ? (
                                                                        <RSVPForm config={el.rsvpFormConfig} templateId={templateId} />
                                                                    ) : (
                                                                        <div className="w-full h-full flex items-center justify-center bg-slate-100 border border-dashed border-slate-300 opacity-50">
                                                                            <span className="text-xs text-slate-400">RSVP Form</span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                                                            {el.type === 'guest_wishes' && (
                                                                <div className="w-full h-full overflow-y-auto pointer-events-none">
                                                                    {el.guestWishesConfig ? (
                                                                        <GuestWishes config={el.guestWishesConfig} wishes={[]} />
                                                                    ) : (
                                                                        <div className="w-full h-full flex items-center justify-center bg-slate-100 border border-dashed border-slate-300 opacity-50">
                                                                            <span className="text-xs text-slate-400">Guest Wishes</span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                                                            {el.type === 'open_invitation_button' && (
                                                                <div className="w-full h-full flex items-center justify-center pointer-events-none">
                                                                    {el.openInvitationConfig ? (
                                                                        <OpenInvitationButton
                                                                            config={el.openInvitationConfig}
                                                                            onClick={() => { }}
                                                                            scale={1}
                                                                        />
                                                                    ) : (
                                                                        <div className="w-full h-full flex items-center justify-center bg-slate-100 border border-dashed border-slate-300 opacity-50">
                                                                            <span className="text-xs text-slate-400">Open Button</span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                                                            {/* Resize handles when selected */}
                                                            {selectedElementId === el.id && <ResizeHandles elementId={el.id} sectionType={sectionType} />}
                                                        </div>
                                                    );
                                                })}

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
        </ClientOnly>
    );
}

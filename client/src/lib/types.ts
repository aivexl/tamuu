export type PredefinedSectionType = 'opening' | 'quotes' | 'couple' | 'event' | 'maps' | 'rsvp' | 'thanks';
export const PREDEFINED_SECTION_TYPES: PredefinedSectionType[] = ['opening', 'quotes', 'couple', 'event', 'maps', 'rsvp', 'thanks'];
export type SectionType = PredefinedSectionType | string;

export interface InvitationSection {
    id: string;
    type: SectionType;
    title: string;
    isVisible: boolean;
    order: number;
    data: SectionData;
}

export type SectionData =
    | OpeningData
    | QuotesData
    | CoupleData
    | EventData
    | MapsData
    | RSVPData
    | ThanksData;

export interface OpeningData {
    groomName: string;
    brideName: string;
    tagline: string;
    eventDate: string;
    showDate: boolean;
}

export interface QuotesData {
    quote: string;
    author: string;
    verse?: string;
}

export interface Person {
    fullName: string;
    nickname: string;
    fatherName: string;
    motherName: string;
    photo?: string;
    instagram?: string;
    facebook?: string;
}

export interface CoupleData {
    groom: Person;
    bride: Person;
}

export interface EventItem {
    id: string;
    name: string;
    date: string;
    startTime: string;
    endTime: string;
    location: string;
    address: string;
}

export interface EventData {
    events: EventItem[];
}

export interface MapsData {
    embedUrl: string;
    latitude?: number;
    longitude?: number;
    locationName: string;
    image?: string;
}

export interface RSVPFormField {
    id: string;
    name: string;
    label: string;
    type: 'text' | 'select' | 'number';
    required: boolean;
    options?: string[];
}

export interface RSVPData {
    formFields: RSVPFormField[];
    requireAttendance: boolean;
    requireGuestCount: boolean;
    customFields: RSVPFormField[];
}

export interface ThanksData {
    message: string;
    signature: string;
}

export interface ThemeConfig {
    id: string;
    name: string;
    category: 'classic' | 'modern' | 'elegant' | 'rustic' | 'beach' | 'garden';
    colors: {
        primary: string;
        secondary: string;
        accent: string;
        background: string;
        text: string;
    };
    fontFamily: string;
}

export interface BackgroundConfig {
    type: 'image' | 'video' | 'color';
    url?: string;
    color?: string;
}

export interface MusicConfig {
    title: string;
    artist?: string;
    url: string;
    autoplay: boolean;
}

export interface GreetingConfig {
    enabled: boolean;
    title: string;
    message: string;
    buttonText: string;
}

export interface Invitation {
    id: string;
    title: string;
    slug: string;
    thumbnailUrl?: string;
    templateId?: string;
    isActive: boolean;
    invitationType: 'scroll' | 'standard';
    activeUntil: string;
    sections: InvitationSection[];
    theme: ThemeConfig;
    background: BackgroundConfig;
    music: MusicConfig;
    greeting: GreetingConfig;
    createdAt: string;
    updatedAt: string;
    elementOverrides?: Record<string, Partial<TemplateElement>>;
}

export interface GuestRSVP {
    id: string;
    invitationId: string;
    guestName: string;
    attendance: 'attending' | 'not-attending' | 'pending';
    guestCount?: number;
    message?: string;
    customResponses: Record<string, string>;
    submittedAt: string;
}

export interface Guest {
    id: string;
    name: string;
    phone?: string;
    email?: string;
    invitationUrl: string;
    qrCode: string;
    checkedIn: boolean;
    rsvp?: GuestRSVP;
}

export interface Analytics {
    totalGuests: number;
    totalViews: number;
    totalRSVP: number;
    attending: number;
    notAttending: number;
    pending: number;
    checkedIn: number;
}

export type AnimationType =
    // Entrance animations (trigger once on scroll)
    | 'none'
    | 'fade-in'
    | 'slide-up'
    | 'slide-down'
    | 'slide-left'
    | 'slide-right'
    | 'slide-out-left'
    | 'slide-out-right'
    | 'zoom-in'
    | 'zoom-out'
    | 'flip-x'
    | 'flip-y'
    | 'bounce'
    // Advanced entrance animations
    | 'rotate-in-down-left'
    | 'rotate-in-down-right'
    | 'zoom-in-down'
    | 'zoom-in-up'
    // Continuous/looping animations (run forever)
    | 'sway'          // Flower-like left-right movement
    | 'float'         // Gentle up-down floating
    | 'pulse'         // Heartbeat/scale effect
    | 'sparkle'       // Twinkling/glowing effect
    | 'spin'          // Continuous rotation
    | 'shake'         // Subtle vibration
    | 'slide-in-left'
    | 'slide-in-right'
    | 'blur-in'
    | 'draw-border'
    | 'pop-in'
    | 'swing'         // Pendulum swing
    | 'heartbeat'     // Love heartbeat effect
    | 'glow'          // Soft glowing aura
    | 'bird-flap'     // Bird wing flapping
    | 'butterfly-flap' // Butterfly wing flapping
    // Combined flight animations (path + flap)
    | 'flap-bob'      // Flap in place + bob up/down
    | 'float-flap'    // Float + flap
    | 'fly-left'      // Fly left + flap
    | 'fly-right'     // Fly right + flap
    | 'fly-up'        // Fly up + flap
    | 'fly-down'      // Fly down + flap
    | 'fly-random';   // Random zigzag + flap

// ElementType moved to bottom to avoid circular dependency issues if any


export type ShapeType =
    // Basic Shapes
    | 'rectangle' | 'square' | 'rounded-rectangle' | 'circle' | 'ellipse' | 'triangle' | 'diamond' | 'pentagon' | 'hexagon' | 'octagon'
    // Stars & Polygons
    | 'star-4' | 'star-5' | 'star-6' | 'star-8' | 'star-burst' | 'cross' | 'plus' | 'asterisk'
    // Lines & Arrows
    | 'line' | 'arrow' | 'double-arrow' | 'curved-line' | 'zigzag' | 'wave'
    // Hearts & Love
    | 'heart' | 'heart-outline' | 'double-heart' | 'heart-arrow'
    // Nature
    | 'leaf' | 'flower' | 'cloud' | 'sun' | 'moon' | 'raindrop'
    // Decorative
    | 'ribbon' | 'banner' | 'frame' | 'badge' | 'seal' | 'sparkle' | 'burst' | 'swirl'
    // Communication
    | 'speech-bubble' | 'thought-bubble' | 'callout';

export interface ShapeConfig {
    shapeType: ShapeType;
    fill: string | null;      // null = no fill (transparent)
    stroke: string | null;    // null = no stroke
    strokeWidth: number;
    cornerRadius?: number;    // for rectangles
    points?: number;          // for star/polygons
    innerRadius?: number;     // for stars
    pathData?: string;        // for custom SVG paths (v-path)
}

export interface TextStyle {
    fontFamily: string;
    fontSize: number;
    fontWeight: 'normal' | 'bold';
    fontStyle: 'normal' | 'italic';
    textDecoration: 'none' | 'underline';
    textAlign: 'left' | 'center' | 'right';
    color: string;
    lineHeight?: number;
    letterSpacing?: number;
}

export interface IconStyle {
    iconName: string; // Lucide icon name
    iconColor: string;
    iconSize: number;
}

export type CountdownStyle = 'classic' | 'minimal' | 'box' | 'circle' | 'modern' | 'elegant' | 'neon' | 'sticker' | 'tape' | 'glitch' | 'flip' | 'card';

export interface CountdownConfig {
    targetDate: string; // ISO date string
    style: CountdownStyle;
    showDays: boolean;
    showHours: boolean;
    showMinutes: boolean;
    showSeconds: boolean;
    backgroundColor: string;
    textColor: string;
    accentColor: string;
    labelColor: string;
    dayLabelColor?: string;
    hourLabelColor?: string;
    minuteLabelColor?: string;
    secondLabelColor?: string;
    digitColor?: string;
    fontFamily?: string;
    fontSize?: number;
    showLabels: boolean;
    labels: {
        days: string;
        hours: string;
        minutes: string;
        seconds: string;
    };
}

// Single zoom target point
export interface ZoomPoint {
    id: string;                        // Unique identifier
    label?: string;                    // Optional label (e.g., "Bride", "Groom")
    targetRegion: {
        x: number;                     // Center X (%)
        y: number;                     // Center Y (%)
        width: number;                 // Width (%)
        height: number;                // Height (%)
    };
    scale?: number;                    // Optional per-point scale override
    duration?: number;                 // Optional per-point duration override
}

export interface ZoomAnimationConfig {
    enabled: boolean;
    direction: 'in' | 'out';           // Zoom in or out
    scale: number;                     // Default scale (e.g., 1.5 = 150%)
    duration: number;                  // Default animation duration per point in ms
    behavior: 'stay' | 'reset';        // 'stay' = smooth pan to next, 'reset' = back to normal first
    resetDelay?: number;               // Delay before reset (if behavior = 'reset')
    trigger: 'scroll' | 'click' | 'open_btn';

    // Multi-point support
    points?: ZoomPoint[];              // Array of zoom targets
    transitionDuration?: number;       // Time between points in ms (default: 1000)
    loop?: boolean;                    // Loop back to first point after last
    selectedPointIndex?: number;       // Currently selected point in editor (UI state)

    // DEPRECATED - kept for backward compatibility (migrated to points array)
    targetRegion?: {                   // Virtual box (relative coordinates 0-100%)
        x: number;                     // Center X %
        y: number;                     // Center Y %
        width: number;                 // Width %
        height: number;                // Height %
    };
}

export type ElementStyle = 'classic' | 'minimal' | 'modern' | 'elegant' | 'rustic' | 'romantic' | 'bold' | 'vintage' | 'boho' | 'luxury' | 'dark' | 'glass' | 'outline' | 'geometric' | 'floral' | 'pastel' | 'monochrome' | 'neon' | 'brutalist' | 'cloud' | 'gradient' | 'playful' | 'sticker';

export interface RSVPFormConfig {
    style: ElementStyle;
    title?: string;
    backgroundColor: string;
    textColor: string;
    buttonColor: string;
    buttonTextColor: string;
    borderColor: string;
    showNameField: boolean;
    showEmailField: boolean;
    showPhoneField: boolean;
    showMessageField: boolean;
    showAttendanceField: boolean;
    nameLabel: string;
    emailLabel: string;
    phoneLabel: string;
    messageLabel: string;
    attendanceLabel: string;
    submitButtonText: string;
    successMessage: string;
}

export interface GuestWishesConfig {
    style: ElementStyle;
    backgroundColor: string;
    textColor: string;
    cardBackgroundColor: string;
    cardBorderColor: string;
    showTimestamp: boolean;
    maxDisplayCount: number;
    layout: 'list' | 'grid' | 'masonry';
}

export interface FlyingBirdConfig {
    birdColor: string;           // Default: '#1a1a1a' (black)
    direction: 'left' | 'right'; // Default: 'left'
    flapSpeed: number;           // Default: 0.3 (seconds)
    flyEnabled: boolean;         // Enable horizontal movement
    flySpeed: number;            // Horizontal movement speed (seconds)
    animationType: 'lottie' | 'svg'; // Lottie or SVG animation
    lottieUrl?: string;          // URL to Lottie JSON
    creatureType: 'bird' | 'butterfly'; // Type of creature
}

export interface LottieConfig {
    url: string;              // Lottie animation URL (.json or .lottie)
    loop?: boolean;           // Default: true
    autoplay?: boolean;       // Default: true
    speed?: number;           // Playback speed (0.5 - 2), default: 1
    direction?: 'left' | 'right'; // For flipping animation horizontally
}

export interface TemplateElement {
    id: string;
    type: ElementType;
    isGif?: boolean; // True if element is an animated GIF (requires HTML rendering)
    name: string;
    position: { x: number; y: number };
    size: { width: number; height: number };
    animation: AnimationType;
    loopAnimation?: AnimationType;
    animationDelay?: number;
    animationSpeed?: number; // ms
    animationDuration?: number; // ms
    animationLoop?: boolean; // Whether to loop the entrance animation continuously
    zIndex: number;
    locked?: boolean;
    flipHorizontal?: boolean;
    flipVertical?: boolean;
    rotation?: number;
    imageUrl?: string;
    opacity?: number;
    objectFit?: 'cover' | 'contain' | 'fill';
    cropRect?: { x: number; y: number; width: number; height: number };
    content?: string;
    textStyle?: TextStyle;
    iconStyle?: IconStyle;
    countdownConfig?: CountdownConfig;
    rsvpFormConfig?: RSVPFormConfig;
    guestWishesConfig?: GuestWishesConfig;
    shapeConfig?: ShapeConfig;
    flyingBirdConfig?: FlyingBirdConfig;

    openInvitationConfig?: OpenInvitationConfig;
    animationTrigger?: 'scroll' | 'click' | 'open_btn';
    motionPathConfig?: MotionPathConfig;

    // User Permission Controls (set by Admin)
    canEditPosition?: boolean;       // User can drag/move element
    canEditContent?: boolean;        // User can edit text/image/video/links
    isContentProtected?: boolean;    // Disable text selection (anti-copy)
    showCopyButton?: boolean;        // Show copy button (for contact info etc)

    // For Maps Point element
    mapsConfig?: MapsPointConfig;

    // Lottie Animation (generic)
    lottieConfig?: LottieConfig;

    // 3D Motion & Effects
    parallaxFactor?: number;         // -1 to 1, where 0 is static, positive = moves with mouse, negative = opposite

    // Legacy fields - keeping for backward compat if needed, but prioritizing above
    isUserEditable?: boolean;
    editableLabel?: string;
    editableType?: 'text' | 'image' | 'maps';
}

export interface MapsPointConfig {
    googleMapsUrl: string;
    displayName?: string;
    pinColor?: string;
    showLabel?: boolean;
    showEmbed?: boolean;
    showLinkButton?: boolean;
    buttonText?: string;
}

export type ElementType = 'image' | 'gif' | 'text' | 'icon' | 'countdown' | 'rsvp_form' | 'rsvp-form' | 'guest_wishes' | 'open_invitation_button' | 'button' | 'shape' | 'maps_point' | 'lottie' | 'flying_bird' | 'lottie_bird' | 'lottie_butterfly' | 'svg_bird' | 'svg_butterfly';

export interface MotionPathConfig {
    points: Array<{ x: number, y: number }>;
    duration?: number;
    loop?: boolean;
    enabled?: boolean;
    closed?: boolean;
}

export type ParticleType = 'none' | 'butterflies' | 'petals' | 'leaves' | 'sparkles';

export type PageTransitionEffect = 'none' | 'fade' | 'slide-up' | 'slide-down' | 'zoom-reveal' | 'stack-reveal' | 'parallax-reveal' | 'door-reveal' | 'pinch-close' | 'carry-up';

export interface PageTransitionConfig {
    enabled: boolean;
    effect: PageTransitionEffect;
    trigger: 'scroll' | 'click' | 'open_btn';
    duration: number; // ms
    overlayEnabled?: boolean; // For "standby" background effect
    overlayOpacity?: number;
}

export interface SectionDesign {
    id?: string;
    backgroundUrl?: string;
    backgroundColor?: string;
    animation: AnimationType;
    textColor?: string;
    overlayOpacity?: number;
    elements: TemplateElement[];
    pageTitle?: string;
    title?: string; // Standardized title
    order?: number; // For manual ordering
    isVisible?: boolean;
    openInvitationConfig?: OpenInvitationConfig;
    animationTrigger?: 'scroll' | 'click' | 'open_btn';

    // Page Transitions
    pageTransition?: PageTransitionConfig;

    // Legacy Transition Fields (can be removed later)
    transitionEffect?: string;
    transitionDuration?: number;
    transitionTrigger?: 'scroll' | 'click' | 'open_btn';

    // Visual Effects
    kenBurnsEnabled?: boolean;        // Slow zoom on background
    particleType?: ParticleType;      // Flying particles overlay
    zoomConfig?: ZoomAnimationConfig; // Background zoom in/out effect
}

export interface OpenInvitationConfig {
    enabled: boolean;
    buttonText: string;
    subText?: string;
    buttonColor: string;
    textColor: string;
    borderColor?: string;
    shadowColor?: string;
    gradientEndColor?: string;
    fontFamily: string;
    fontSize: number;
    fontWeight?: 'normal' | 'medium' | 'semibold' | 'bold';
    letterSpacing?: number;
    textTransform?: 'none' | 'uppercase' | 'capitalize';
    buttonStyle: ElementStyle;
    buttonShape: 'pill' | 'rounded' | 'rectangle' | 'stadium';
    animation?: 'pulse' | 'bounce' | 'glow' | 'shimmer' | 'float' | 'none';
    position: 'bottom-center' | 'center' | 'bottom-third';
    showIcon: boolean;
    iconName?: string;
    overlayOpacity?: number;
    backdropBlur?: number;
    borderWidth?: number;
    shadowIntensity?: 'none' | 'soft' | 'medium' | 'strong';
}

export interface CustomSection {
    id: string;
    name: string;
    order: number;
}

// Invitation Categories (matching backend)
export type InvitationCategory =
    | 'wedding'
    | 'kids'
    | 'birthday'
    | 'aqiqah'
    | 'tasmiyah'
    | 'khitan'
    | 'umum'
    | 'seminar'
    | 'christmas'
    | 'newyear'
    | 'syukuran'
    | 'islami'
    | 'party'
    | 'dinner'
    | 'school'
    | 'graduation'
    | 'other';

export interface Template {
    id: string;
    userId?: string | null;
    name: string;
    slug?: string | null;
    category?: InvitationCategory;
    sourceTemplateId?: string | null;
    thumbnail: string;
    status: 'draft' | 'published';
    sections: Record<string, SectionDesign>;
    sectionOrder?: string[];
    customSections?: CustomSection[];
    globalTheme: ThemeConfig;
    eventDate?: string;
    createdAt: string;
    updatedAt: string;
}

export interface RSVPResponse {
    id: string;
    templateId: string;
    name: string;
    email?: string;
    phone?: string;
    message: string;
    attendance?: 'hadir' | 'tidak_hadir' | 'ragu';
    isPublic: boolean;
    createdAt: string;
}

// ============================================
// USER / AUTH TYPES
// ============================================

export interface UserResponse {
    id: string;
    email: string;
    name: string | null;
    phone: string | null;
    avatarUrl: string | null;
    plan: 'free' | 'basic' | 'premium' | 'priority';
    role: 'admin' | 'user';
    tamuuId: string | null;
    planExpiresAt: string | null;
    isVerified: boolean;
    createdAt: string;
    updatedAt: string;
}


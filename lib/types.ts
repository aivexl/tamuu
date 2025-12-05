// Section types - both predefined and custom
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
    | 'none'
    | 'fade-in'
    | 'slide-up'
    | 'slide-down'
    | 'slide-left'
    | 'slide-right'
    | 'zoom-in'
    | 'zoom-out'
    | 'flip-x'
    | 'flip-y'
    | 'bounce';

// Element types - now includes icon, countdown, rsvp_form
export type ElementType = 'image' | 'text' | 'icon' | 'countdown' | 'rsvp_form' | 'guest_wishes';

export interface TextStyle {
    fontFamily: string;
    fontSize: number;
    fontWeight: 'normal' | 'bold';
    fontStyle: 'normal' | 'italic';
    textDecoration: 'none' | 'underline';
    textAlign: 'left' | 'center' | 'right';
    color: string;
    lineHeight?: number;
}

// Icon element properties
export interface IconStyle {
    iconName: string; // Lucide icon name
    iconColor: string;
    iconSize: number;
}
// Countdown element properties
export type CountdownStyle = 'elegant' | 'minimal' | 'flip' | 'circle' | 'card' | 'neon';

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
    showLabels: boolean;
    labels: {
        days: string;
        hours: string;
        minutes: string;
        seconds: string;
    };
}

// RSVP Form element properties
export interface RSVPFormConfig {
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

// Guest wishes display element
export interface GuestWishesConfig {
    backgroundColor: string;
    textColor: string;
    cardBackgroundColor: string;
    cardBorderColor: string;
    showTimestamp: boolean;
    maxDisplayCount: number;
    layout: 'list' | 'grid' | 'masonry';
}

export interface TemplateElement {
    id: string;
    type: ElementType;
    name: string;
    position: { x: number; y: number };
    size: { width: number; height: number };
    animation: AnimationType;
    animationDelay?: number;
    animationSpeed?: number; // ms, default 500
    animationDuration?: number; // ms, default 1000
    zIndex: number;
    locked?: boolean;
    // Transform properties
    flipHorizontal?: boolean;
    flipVertical?: boolean;
    rotation?: number; // degrees, 0-360
    // For image elements
    imageUrl?: string;
    objectFit?: 'cover' | 'contain' | 'fill';
    cropRect?: { x: number; y: number; width: number; height: number }; // Crop area within image
    // For text elements
    content?: string;
    textStyle?: TextStyle;
    // For icon elements
    iconStyle?: IconStyle;
    // For countdown elements
    countdownConfig?: CountdownConfig;
    // For RSVP form elements
    rsvpFormConfig?: RSVPFormConfig;
    // For guest wishes elements
    guestWishesConfig?: GuestWishesConfig;
}

export interface SectionDesign {
    backgroundUrl?: string;
    backgroundColor?: string;
    animation: AnimationType;
    textColor?: string;
    overlayOpacity?: number;
    elements: TemplateElement[];
    pageTitle?: string; // Custom title for multi-page view
    isVisible?: boolean; // Section visibility toggle
}

// Custom section for flexible page creation
export interface CustomSection {
    id: string;
    name: string; // User-defined name
    order: number;
}

export interface Template {
    id: string;
    name: string;
    thumbnail: string;
    sections: Record<string, SectionDesign>; // Changed to Record<string, ...> for custom sections
    sectionOrder?: string[]; // Order of sections (can be any string ID)
    customSections?: CustomSection[]; // List of custom sections
    globalTheme: ThemeConfig;
    eventDate?: string; // For countdown feature
    createdAt: string;
    updatedAt: string;
}

// RSVP Response for database
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

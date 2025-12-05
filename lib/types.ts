export type SectionType = 'opening' | 'quotes' | 'couple' | 'event' | 'maps' | 'rsvp' | 'thanks';

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

export type ElementType = 'image' | 'text';

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

export interface Template {
    id: string;
    name: string;
    thumbnail: string;
    sections: Partial<Record<SectionType, SectionDesign>>;
    sectionOrder?: SectionType[]; // Order of sections for multi-page view
    globalTheme: ThemeConfig;
    createdAt: string;
    updatedAt: string;
}

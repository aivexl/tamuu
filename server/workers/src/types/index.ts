/**
 * Cloudflare Workers Environment Bindings
 * Type definitions for D1, KV, and R2 bindings
 */

export interface Env {
    // D1 Database binding
    DB: D1Database;

    // KV Namespace binding
    KV: KVNamespace;

    // R2 Bucket binding
    R2: R2Bucket;

    // Environment variables
    ENVIRONMENT: string;
    R2_PUBLIC_URL: string;

    // Supabase (for webhook plan updates)
    SUPABASE_URL?: string;
    SUPABASE_SERVICE_KEY?: string;
}

// ============================================
// DATABASE TYPES (matching schema.sql)
// ============================================

export interface DBUser {
    id: string;
    email: string;
    password_hash: string;
    name: string | null;
    phone: string | null;
    avatar_url: string | null;
    plan: 'free' | 'basic' | 'premium' | 'priority';
    role: 'admin' | 'user';
    tamuu_id: string | null;
    gender: 'male' | 'female' | null;
    birth_date: string | null;
    plan_expires_at: string | null;
    is_verified: number; // SQLite boolean
    verification_token: string | null;
    reset_token: string | null;
    reset_token_expires: string | null;
    created_at: string;
    updated_at: string;
}

export interface DBTemplate {
    id: string;
    user_id: string | null;
    name: string;
    slug: string | null;
    category: string;
    source_template_id: string | null;
    thumbnail: string | null;
    status: 'draft' | 'published';
    section_order: string; // JSON string
    custom_sections: string; // JSON string
    global_theme: string; // JSON string
    event_date: string | null;
    invitation_message: string | null;
    created_at: string;
    updated_at: string;
}

export interface DBGuest {
    id: string;
    invitation_id: string;
    name: string;
    phone: string | null;
    address: string | null;
    tier: 'reguler' | 'vip' | 'vvip';
    guest_count: number;
    check_in_code: string | null;
    checked_in_at: string | null;
    checked_out_at: string | null;
    shared_at: string | null;
    created_at: string;
    updated_at: string;
}


export interface DBTemplateSection {
    id: string;
    template_id: string;
    type: string;
    is_visible: number; // SQLite boolean
    background_color: string | null;
    background_url: string | null;
    overlay_opacity: number;
    animation: string;
    page_title: string | null;
    open_invitation_config: string | null; // JSON string
    animation_trigger: string | null;
    transition_effect: string | null;
    transition_duration: number | null;
    transition_trigger: string | null;
    particle_type: string | null;
    ken_burns_enabled: number; // SQLite boolean
    zoom_config: string | null; // JSON string (ZoomAnimationConfig)
    page_transition: string | null; // JSON string (PageTransitionConfig)
    created_at: string;
    updated_at: string;
}

export interface DBTemplateElement {
    id: string;
    section_id: string;
    type: string;
    name: string;
    position_x: number;
    position_y: number;
    width: number;
    height: number;
    z_index: number;
    animation: string;
    loop_animation: string | null;
    animation_delay: number;
    animation_speed: number;
    animation_duration: number;
    animation_trigger: string | null;
    animation_loop: number; // SQLite boolean - whether to loop the entrance animation
    content: string | null;
    image_url: string | null;
    text_style: string | null; // JSON string
    icon_style: string | null; // JSON string
    countdown_config: string | null; // JSON string
    rsvp_form_config: string | null; // JSON string
    guest_wishes_config: string | null; // JSON string
    open_invitation_config: string | null; // JSON string
    rotation: number;
    flip_horizontal: number; // SQLite boolean
    flip_vertical: number; // SQLite boolean
    zoom_config: string | null;         // JSON string (ZoomAnimationConfig)
    motion_path_config: string | null; // JSON string
    parallax_factor: number | null;
    can_edit_position: number;
    can_edit_content: number;
    is_content_protected: number;
    show_copy_button: number;
    lottie_config: string | null; // JSON string (LottieConfig)
    created_at: string;
    updated_at: string;
}

export interface DBRSVPResponse {
    id: string;
    template_id: string;
    name: string;
    email: string | null;
    phone: string | null;
    message: string | null;
    attendance: 'hadir' | 'tidak_hadir' | 'ragu' | null;
    is_public: number; // SQLite boolean
    created_at: string;
}

// ============================================
// API RESPONSE TYPES (matching frontend types)
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
    gender: 'male' | 'female' | null;
    birthDate: string | null;
    planExpiresAt: string | null;
    isVerified: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface AuthTokenPayload {
    userId: string;
    email: string;
    role: 'admin' | 'user';
    exp: number;
}

// Invitation categories
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

export interface TemplateResponse {
    id: string;
    userId?: string | null;
    name: string;
    slug?: string | null;
    category?: InvitationCategory;
    sourceTemplateId?: string | null;
    thumbnail: string | null;
    status: 'draft' | 'published';
    sections: Record<string, SectionDesign>;
    sectionOrder: string[];
    customSections: CustomSection[];
    globalTheme: ThemeConfig;
    eventDate?: string;
    invitationMessage?: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface GuestResponse {
    id: string;
    invitationId: string;
    name: string;
    phone: string | null;
    address: string;
    tier: 'reguler' | 'vip' | 'vvip';
    guestCount: number;
    checkInCode: string | null;
    checkedInAt: string | null;
    checkedOutAt: string | null;
    sharedAt: string | null;
    createdAt: string;
    updatedAt: string;
}


export interface SectionDesign {
    id?: string;
    isVisible?: boolean;
    backgroundColor?: string;
    backgroundUrl?: string;
    overlayOpacity?: number;
    animation: string;
    pageTitle?: string;
    title?: string;
    order?: number;
    openInvitationConfig?: OpenInvitationConfig;
    animationTrigger?: 'scroll' | 'click' | 'open_btn';
    transitionEffect?: string;
    transitionDuration?: number;
    transitionTrigger?: 'scroll' | 'click' | 'open_btn';
    particleType?: 'none' | 'butterflies' | 'petals' | 'leaves' | 'sparkles';
    kenBurnsEnabled?: boolean;
    zoomConfig?: ZoomAnimationConfig;
    pageTransition?: PageTransitionConfig;
    elements: TemplateElement[];
}

export interface TemplateElement {
    id: string;
    type: string;
    name: string;
    position: { x: number; y: number };
    size: { width: number; height: number };
    zIndex: number;
    animation: string;
    loopAnimation?: string;
    animationDelay?: number;
    animationSpeed?: number;
    animationDuration?: number;
    animationTrigger?: 'scroll' | 'click' | 'open_btn';
    animationLoop?: boolean;
    content?: string;
    imageUrl?: string;
    textStyle?: TextStyle;
    iconStyle?: IconStyle;
    countdownConfig?: CountdownConfig;
    rsvpFormConfig?: RSVPFormConfig;
    guestWishesConfig?: GuestWishesConfig;
    openInvitationConfig?: OpenInvitationConfig;
    rotation?: number;
    flipHorizontal?: boolean;
    flipVertical?: boolean;
    motionPathConfig?: MotionPathConfig;
    parallaxFactor?: number;
    canEditPosition?: boolean;
    canEditContent?: boolean;
    isContentProtected?: boolean;
    showCopyButton?: boolean;
    lottieConfig?: LottieConfig;
}

export interface CustomSection {
    id: string;
    name: string;
    order: number;
}

export interface ThemeConfig {
    id: string;
    name: string;
    category: string;
    colors: {
        primary: string;
        secondary: string;
        accent: string;
        background: string;
        text: string;
    };
    fontFamily: string;
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
    iconName: string;
    iconColor: string;
    iconSize: number;
}

export interface CountdownConfig {
    targetDate: string;
    style: string;
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

export interface RSVPFormConfig {
    style: string;
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
    style: string;
    backgroundColor: string;
    textColor: string;
    cardBackgroundColor: string;
    cardBorderColor: string;
    showTimestamp: boolean;
    maxDisplayCount: number;
    layout: 'list' | 'grid' | 'masonry';
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
    buttonStyle: string;
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

export interface MotionPathConfig {
    points: Array<{ x: number, y: number }>;
    duration?: number;
    loop?: boolean;
    enabled?: boolean;
    closed?: boolean; // Whether the path is a closed loop
}
// Single zoom target point
export interface ZoomPoint {
    id: string;
    label?: string;
    targetRegion: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
    scale?: number;
    duration?: number;
}

export interface ZoomAnimationConfig {
    enabled: boolean;
    direction: 'in' | 'out';
    scale: number;
    duration: number;
    behavior: 'stay' | 'reset';
    resetDelay?: number;
    trigger: 'scroll' | 'click' | 'open_btn';

    // Multi-point support
    points?: ZoomPoint[];
    transitionDuration?: number;
    loop?: boolean;
    selectedPointIndex?: number;

    // DEPRECATED - backward compat
    targetRegion?: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
}

export interface LottieConfig {
    url: string;              // Lottie animation URL (.json or .lottie)
    loop?: boolean;           // Default: true
    autoplay?: boolean;       // Default: true
    speed?: number;           // Playback speed (0.5 - 2), default: 1
    direction?: 'left' | 'right'; // For flipping animation horizontally
}

export type PageTransitionEffect = 'none' | 'fade' | 'slide-up' | 'slide-down' | 'zoom-reveal' | 'stack-reveal' | 'parallax-reveal' | 'door-reveal';

export interface PageTransitionConfig {
    enabled: boolean;
    effect: PageTransitionEffect;
    trigger: 'scroll' | 'click' | 'open_btn';
    duration: number; // ms
    overlayEnabled?: boolean; // For "standby" background effect
    overlayOpacity?: number;
}

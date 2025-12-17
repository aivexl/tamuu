'use client';

import * as LucideIcons from 'lucide-react';
import { LucideIcon } from 'lucide-react';

// Comprehensive list of 200+ icons categorized for easy selection
export const ICON_CATEGORIES = {
    'Social Media': [
        'Instagram', 'Facebook', 'Twitter', 'Youtube', 'Linkedin', 'Github', 'Twitch',
        'MessageCircle', 'Send', 'Share2', 'AtSign', 'Hash', 'Link', 'ExternalLink'
    ],
    'Contact': [
        'Phone', 'PhoneCall', 'PhoneIncoming', 'PhoneOutgoing', 'Mail', 'MailOpen',
        'MessageSquare', 'MessagesSquare', 'Voicemail', 'Contact', 'UserPlus'
    ],
    'Location': [
        'MapPin', 'Map', 'Navigation', 'Compass', 'Globe', 'Globe2', 'Locate',
        'LocateFixed', 'LocateOff', 'Home', 'Building', 'Building2', 'Church',
        'Landmark', 'Hotel', 'Store', 'Warehouse', 'Flag', 'Signpost'
    ],
    'Date & Time': [
        'Calendar', 'CalendarDays', 'CalendarHeart', 'CalendarCheck', 'CalendarClock',
        'Clock', 'Clock1', 'Clock2', 'Clock3', 'Clock4', 'Clock5', 'Clock6',
        'Clock7', 'Clock8', 'Clock9', 'Clock10', 'Clock11', 'Clock12',
        'Timer', 'TimerOff', 'Hourglass', 'AlarmClock', 'Watch', 'Sunrise', 'Sunset'
    ],
    'Love & Wedding': [
        'Heart', 'HeartHandshake', 'HeartPulse', 'Hearts', 'Gem', 'Crown', 'Sparkles',
        'Sparkle', 'Stars', 'Star', 'Gift', 'GiftIcon', 'Cake', 'PartyPopper',
        'Flower', 'Flower2', 'Palmtree', 'TreeDeciduous', 'Leaf', 'Clover'
    ],
    'People': [
        'User', 'Users', 'UserCircle', 'UserCircle2', 'UserCheck', 'UserCog',
        'UserMinus', 'UserPlus', 'UserX', 'Users2', 'UsersRound', 'Baby',
        'PersonStanding', 'Accessibility', 'Hand', 'HandHeart', 'Handshake'
    ],
    'Music & Media': [
        'Music', 'Music2', 'Music3', 'Music4', 'Mic', 'Mic2', 'MicOff',
        'Volume', 'Volume1', 'Volume2', 'VolumeX', 'Headphones', 'Radio',
        'PlayCircle', 'PauseCircle', 'StopCircle', 'SkipForward', 'SkipBack',
        'Disc', 'Disc2', 'Disc3', 'Camera', 'Video', 'Film', 'Clapperboard'
    ],
    'Food & Drinks': [
        'Coffee', 'Wine', 'GlassWater', 'Beer', 'Martini', 'CupSoda',
        'Utensils', 'UtensilsCrossed', 'ChefHat', 'CookingPot', 'Soup',
        'Pizza', 'Sandwich', 'Apple', 'Banana', 'Cherry', 'Grape', 'Citrus',
        'Croissant', 'Salad', 'Beef', 'Fish', 'Egg', 'Milk', 'IceCream', 'Cookie'
    ],
    'Travel': [
        'Plane', 'PlaneTakeoff', 'PlaneLanding', 'Car', 'Bus', 'Train',
        'Ship', 'Bike', 'Anchor', 'Luggage', 'Ticket', 'Passport',
        'Mountain', 'MountainSnow', 'Waves', 'Umbrella', 'Sun', 'Moon', 'Cloud'
    ],
    'Arrows': [
        'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowUpRight',
        'ArrowUpLeft', 'ArrowDownRight', 'ArrowDownLeft', 'ChevronsUp',
        'ChevronsDown', 'ChevronsLeft', 'ChevronsRight', 'ChevronUp',
        'ChevronDown', 'ChevronLeft', 'ChevronRight', 'MoveUp', 'MoveDown',
        'MoveLeft', 'MoveRight', 'CornerDownLeft', 'CornerDownRight',
        'CornerUpLeft', 'CornerUpRight', 'Undo', 'Redo', 'RefreshCw', 'RefreshCcw'
    ],
    'Shapes': [
        'Circle', 'Square', 'Triangle', 'Pentagon', 'Hexagon', 'Octagon',
        'Diamond', 'RectangleHorizontal', 'RectangleVertical', 'Asterisk',
        'Plus', 'Minus', 'X', 'Check', 'CheckCircle', 'CheckSquare', 'XCircle', 'XSquare'
    ],
    'UI Elements': [
        'Menu', 'MoreHorizontal', 'MoreVertical', 'Grid', 'List', 'LayoutGrid',
        'Columns', 'Rows', 'Table', 'Maximize', 'Minimize', 'Maximize2', 'Minimize2',
        'ZoomIn', 'ZoomOut', 'Search', 'Filter', 'SlidersHorizontal', 'Settings',
        'Settings2', 'Cog', 'Wrench', 'Tool', 'Hammer', 'Paintbrush', 'Palette'
    ],
    'Nature': [
        'Sun', 'Moon', 'Cloud', 'CloudRain', 'CloudSnow', 'CloudSun',
        'CloudMoon', 'Wind', 'Droplet', 'Droplets', 'Rainbow', 'Snowflake',
        'Thermometer', 'ThermometerSun', 'ThermometerSnowflake', 'Flame',
        'Zap', 'Tornado', 'Orbit', 'Eclipse'
    ],
    'Objects': [
        'Key', 'Lock', 'Unlock', 'Shield', 'ShieldCheck', 'ShieldX',
        'Umbrella', 'Glasses', 'Briefcase', 'Wallet', 'CreditCard', 'Banknote',
        'Coins', 'Receipt', 'ShoppingBag', 'ShoppingCart', 'Package',
        'Box', 'Archive', 'Book', 'BookOpen', 'Bookmark', 'FileText', 'Clipboard',
        'Newspaper', 'ScrollText', 'FileImage', 'Image', 'ImagePlus', 'Frame',
        'Lightbulb', 'Lamp', 'LampDesk', 'Bed', 'Sofa', 'Armchair', 'Door',
        'BoxSelect', 'Keyboard', 'Mouse', 'Monitor', 'Smartphone', 'Tablet',
        'Laptop', 'Tv', 'Speaker', 'Printer', 'Projector', 'Pen', 'Pencil',
        'Brush', 'Eraser', 'Scissors', 'Ruler', 'Paperclip', 'Pin', 'Pushpin'
    ],
    'Decorative': [
        'Sparkles', 'Sparkle', 'Stars', 'Star', 'Wand', 'Wand2', 'Crown',
        'Award', 'Medal', 'Trophy', 'Target', 'Crosshair', 'Focus',
        'Infinity', 'CircleDot', 'CircleDashed', 'CircleDotDashed', 'Fingerprint',
        'QrCode', 'Scan', 'ScanLine', 'Barcode'
    ],
    'Status': [
        'AlertCircle', 'AlertTriangle', 'AlertOctagon', 'Info', 'HelpCircle',
        'Bell', 'BellRing', 'BellOff', 'BellPlus', 'BellMinus', 'Megaphone',
        'ThumbsUp', 'ThumbsDown', 'Ban', 'CircleSlash', 'Construction',
        'Loader', 'Loader2', 'RotateCw', 'RotateCcw', 'Battery', 'BatteryFull',
        'BatteryLow', 'BatteryMedium', 'BatteryCharging', 'BatteryWarning',
        'Wifi', 'WifiOff', 'Signal', 'SignalLow', 'SignalMedium', 'SignalHigh'
    ]
};

// Flatten all icons into a single array
export const ALL_ICONS = Object.values(ICON_CATEGORIES).flat();

// Get icon component by name
export const getIconComponent = (iconName: string): LucideIcon | null => {
    const icons = LucideIcons as unknown as Record<string, LucideIcon>;
    return icons[iconName] || null;
};

// Icon component that renders by name
interface DynamicIconProps {
    name: string;
    size?: number;
    color?: string;
    className?: string;
    strokeWidth?: number;
}

export const DynamicIcon: React.FC<DynamicIconProps> = ({
    name,
    size = 24,
    color = 'currentColor',
    className = '',
    strokeWidth = 2
}) => {
    const IconComponent = getIconComponent(name);

    if (!IconComponent) {
        return <div style={{ width: size, height: size }} className={className} />;
    }

    return (
        <IconComponent
            size={size}
            color={color}
            className={className}
            strokeWidth={strokeWidth}
        />
    );
};

export default DynamicIcon;

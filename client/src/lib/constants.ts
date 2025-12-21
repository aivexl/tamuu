export const CANVAS_WIDTH = 375;
export const CANVAS_HEIGHT = 667;

// Default zoom point configuration
export const DEFAULT_ZOOM_POINT = {
    id: '',
    label: '',
    targetRegion: { x: 50, y: 50, width: 50, height: 50 },
    duration: 3000,
};

// Default zoom animation configuration
export const DEFAULT_ZOOM_CONFIG = {
    enabled: false,
    direction: 'in' as const,
    scale: 1.3,
    duration: 3000,
    behavior: 'stay' as const,
    trigger: 'scroll' as const,

    // Multi-point support
    points: [] as Array<typeof DEFAULT_ZOOM_POINT>,
    transitionDuration: 1000,
    loop: false,
    selectedPointIndex: 0,

    // Legacy (backward compat)
    targetRegion: { x: 50, y: 50, width: 50, height: 50 },
};

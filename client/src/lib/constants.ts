export const CANVAS_WIDTH = 375;
export const CANVAS_HEIGHT = 667;

export const DEFAULT_ZOOM_CONFIG = {
    enabled: false,
    direction: 'in' as const,
    scale: 1.3,
    duration: 5000,
    targetRegion: { x: 50, y: 50, width: 50, height: 50 },
    behavior: 'stay' as const,
    trigger: 'scroll' as const,
};

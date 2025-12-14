/**
 * APP CONFIGURATION
 * Centralized tuning for Physics, Visuals, and Layout.
 */

export const APP_CONFIG = {
    // -------------------------------------------------------------------------
    // ASSETS
    // -------------------------------------------------------------------------
    IMAGE_URL: 'images/saitama-no-cape.png',

    // -------------------------------------------------------------------------
    // VISUAL TUNING
    // -------------------------------------------------------------------------
    CHROMA_TOLERANCE: 40,

    AUDIO: {
        ECHO_DELAY: 0.3,
        ECHO_FEEDBACK: 0.05,
        ECHO_WET: 0.15
    },
    CONFETTI: {
        BATCH_SIZE: 250,
        SPREAD: 6.0,
        VELOCITY_Y_BASE: 12.0, // Launch fast
        VELOCITY_Y_VAR: 4.0,
        GRAVITY: 0.15,
        DRAG: 0.96,           // Transitional drag
        TERMINAL_VEL: 3.0,    // Max fall speed (Paper)
        FLUTTER_SPEED: 0.15,
        FLUTTER_AMP: 2.0,     // Horizontal drift amp
        WOBBLE_SPEED: 0.1,    // 3D Tumble speed
        REPULSE_RADIUS_SQ: 2500,
        REPULSE_STRENGTH: 2.0,
        LIFE_DECAY: 0.005,    // Slower decay for long fall
        DEATH_Y: -100,
        SCALE_FACTOR: 5.0
    },

    // -------------------------------------------------------------------------
    // LAYOUT & FRAMING
    // -------------------------------------------------------------------------
    VIEWPORT: {
        ZOOM: 3.5,
        TOP_OFFSET: 0.0,
        OFFSET_X: 0.03, // Centering correction
    },

    // -------------------------------------------------------------------------
    // PHYSICS (Weeping Shadow)
    // -------------------------------------------------------------------------
    PHYSICS: {
        GRAVITY: { Face: 0.05, Air: 0.5 },
        WOBBLE: { Speed: 0.03, Amp: 3 },
        BOUNDARY_Y: 0.35,
    },

    EYES: {
        LEFT: { x: 0.46, y: 0.24 },
        RIGHT: { x: 0.53, y: 0.24 },
        WIDTH: 0.045,
        HEIGHT: 0.025,
    },

    // -------------------------------------------------------------------------
    // COMPONENT: MAGNETIC BUTTON
    // -------------------------------------------------------------------------
    MAGNETIC: {
        AREA_SELECTOR: '.magnetic-area',
        BUTTON_SELECTOR: '.magnetic-content'
    }
};

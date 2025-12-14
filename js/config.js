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
        SPREAD: 6.0,          // Conical spread
        VELOCITY_Y_BASE: 12.0, // High launch
        VELOCITY_Y_VAR: 3.0,   // Variance
        GRAVITY: 0.05,        // Low gravity (Snowflake)
        DRAG: 0.94,           // High drag (Air resistance)
        SWAY_SPEED: 0.005,
        SWAY_AMP: 0.1,
        REPULSE_RADIUS_SQ: 2500,
        REPULSE_STRENGTH: 2.0
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

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
    BUTTON: {
        softness: 18.0,   // TUNED: Lorentzian (Round Tip) decay
        stiffness: 0.1,   // TUNED: Stretchy
        damping: 0.85,    // TUNED: Viscous/Sticky
        snapLimit: 150.0, // TUNED: Allow more stretch
        beatRate: 3000
    },
    CONFETTI: {
        BATCH_SIZE: 650,      // TUNED: Reduced density for clarity
        SPAWN_RADIUS: 100.0,  // TUNED: Wider Start
        EXPLOSION_POWER: 30.0, // TUNED: Wide Burst
        VELOCITY_Y_BASE: 0.0,  // TUNED: No artificial boost
        VELOCITY_Y_VAR: 6.0,
        GRAVITY: 0.06,        // TUNED: Floaty Fall
        DRAG: 0.95,
        TERMINAL_VEL: 1.5,    // TUNED: Floaty Fall
        FLUTTER_SPEED: 0.15,
        FLUTTER_AMP: 5.0,
        WOBBLE_SPEED: 0.1,
        REPULSE_RADIUS_SQ: 2000,  // TUNED: Inner Hole
        REPULSE_STRENGTH: 0.5,    // TUNED: Strong Push
        ATTRACT_RADIUS_SQ: 20000, // TUNED: Outer Wake
        ATTRACT_STRENGTH: 0.05,   // TUNED: Gentle Pull
        LIFE_DECAY: 0.002,
        DEATH_Y: -2000,
        SCALE_FACTOR: 5.0,
        SCALE_MIN: 0.4,       // TUNED: Smaller Uniform
        SCALE_MAX: 1.0        // TUNED: Smaller Uniform
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

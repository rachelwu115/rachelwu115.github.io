/**
 * MIRROR SHADOW MODULE
 * 
 * A clean, modular implementation of the "Weeping Shadow" effect.
 * 
 * ARCHITECTURE:
 * 1. CONFIG: Centralized tuning parameters for easy adjustment.
 * 2. LOADER: Async asset loading and unique "Chroma Key" processing to create silhouettes.
 * 3. VIEWPORT: Responsive layout engine that guarantees specific framing (Head & Shoulders).
 * 4. PHYSICS: Particle system for tear animation with surface viscosity simulation.
 * 5. RENDERER: High-performance Canvas 2d rendering loop.
 */

const CONFIG = {
    ASSETS: {
        // The source image for the shadow.
        // Requires a backdrop that can be keyed out (e.g. solid white/gray/green).
        URL: 'images/saitama-upper.png',

        // Color difference threshold (0-255) for background removal.
        // Higher = Remove more colors similar to top-left pixel.
        CHROMA_TOLERANCE: 30,
    },

    VIEWPORT: {
        // Zoom Level: 
        // 1.0 = Fit Width. 
        // >1.0 = Zoom In (Crop).
        // 2.8 = Strong crop to focus on Head/Shoulders of a full-body image.
        ZOOM_LEVEL: 2.8,

        // Vertical Alignment:
        // 0.0 = Top aligned.
        // 0.1 = Start rendering 10% down from viewport top (Head room).
        TOP_OFFSET: 0.1,
    },

    EYES: {
        // Eye positions relative to the *Original Image* dimensions (0.0 to 1.0).
        // Mapped to the Saitama Full Body reference.
        LEFT: { x: 0.45, y: 0.23 },
        RIGHT: { x: 0.55, y: 0.23 },

        // Visual styling for the "Bored" eyes
        WIDTH_PERCENT: 0.07,  // Relative to rendered width
        HEIGHT_PERCENT: 0.04, // Relative to rendered height
        COLOR: '#FFFFFF',
        PUPIL_COLOR: '#000000',
        GLOW_BLUR: 8,
        GLOW_COLOR: 'rgba(255, 255, 255, 0.6)',
    },

    PHYSICS: {
        GRAVITY_FACE: 0.05,        // Slow drip
        GRAVITY_AIR: 0.5,          // Fast fall
        TERMINAL_VEL_FACE: 2.0,    // Max speed on face
        FRICTION_BOUNDARY: 0.35,   // Y-position (0.0-1.0 of image) where face ends

        // Cheek Contour Simulation
        WOBBLE_SPEED: 0.03,
        WOBBLE_AMP: 3,
    },

    PARTICLES: {
        FONT: '24px "Courier New"',
        COLOR: '#FFFFFF',
        FADE_RATE: 0.003,
    }
};

export class MirrorShadow {
    constructor() {
        // DOM Elements
        this.canvas = document.getElementById('shadowCanvas');
        this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
        this.input = document.getElementById('tearInput');

        // State
        this.image = null;       // The processed silhouette
        this.particles = [];     // Active tear particles

        // Layout Metrics (Calculated on Resize)
        this.layout = {
            x: 0, y: 0,          // Top-Left render position
            width: 0, height: 0, // Rendered dimensions
            scale: 1             // Current scale factor
        };

        this.init();
    }

    // =========================================================================
    // INITIALIZATION & ASSETS
    // =========================================================================

    async init() {
        try {
            console.log('Mirror: Initializing...');
            const rawImage = await this.loadImage(CONFIG.ASSETS.URL);
            console.log('Mirror: Image loaded. Processing silhouette...');

            this.image = await this.processSilhouette(rawImage);
            console.log('Mirror: Silhouette ready.');

            this.bindEvents();
            this.resize();
            this.loop();
        } catch (error) {
            console.error('Mirror: Fatal initialization error.', error);
        }
    }

    loadImage(url) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = "Anonymous";
            img.onload = () => resolve(img);
            img.onerror = (e) => reject(e);
            img.src = url;
        });
    }

    /**
     * Performs "Chroma Keying" on the image.
     * 1. Detects background color from pixel (0,0).
     * 2. Iterates all pixels.
     * 3. Matches -> Transparent. Non-Matches -> Black (#111).
     */
    processSilhouette(sourceImg) {
        return new Promise((resolve) => {
            const buffer = document.createElement('canvas');
            buffer.width = sourceImg.width;
            buffer.height = sourceImg.height;
            const ctx = buffer.getContext('2d', { willReadFrequently: true });

            ctx.drawImage(sourceImg, 0, 0);

            const imageData = ctx.getImageData(0, 0, buffer.width, buffer.height);
            const data = imageData.data;

            // Sample Background Color (Top-Left)
            const bg = { r: data[0], g: data[1], b: data[2] };
            const limit = CONFIG.ASSETS.CHROMA_TOLERANCE;

            for (let i = 0; i < data.length; i += 4) {
                const r = data[i], g = data[i + 1], b = data[i + 2];
                const diff = Math.abs(r - bg.r) + Math.abs(g - bg.g) + Math.abs(b - bg.b);

                if (diff < limit) {
                    // Background -> Transparent
                    data[i + 3] = 0;
                } else {
                    // Foreground -> Silhouette Color (Dark Gray #111111)
                    data[i] = 17;
                    data[i + 1] = 17;
                    data[i + 2] = 17;
                    data[i + 3] = 255;
                }
            }

            ctx.putImageData(imageData, 0, 0);

            const finalImg = new Image();
            finalImg.onload = () => resolve(finalImg);
            finalImg.src = buffer.toDataURL();
        });
    }

    bindEvents() {
        window.addEventListener('resize', () => this.resize());

        // Tear Input Handler
        this.input.addEventListener('input', (e) => {
            const char = e.data || this.input.value.slice(-1);
            if (char && char.trim() !== '') {
                this.spawnTear(char);
            }
        });
    }

    // =========================================================================
    // VIEWPORT & LAYOUT
    // =========================================================================

    resize() {
        // match resolution to display size
        this.canvas.width = this.canvas.clientWidth;
        this.canvas.height = this.canvas.clientHeight;

        if (!this.image) return;

        // "Objective: Cover Upper Body"
        // Calculate Base Scale: How much to scale image width to equals canvas width?
        const fitWidthScale = this.canvas.width / this.image.width;

        // Apply Zoom Multiplier
        const finalScale = fitWidthScale * CONFIG.VIEWPORT.ZOOM_LEVEL;

        this.layout = {
            scale: finalScale,
            width: this.image.width * finalScale,
            height: this.image.height * finalScale,
            // Center Horizontally
            x: (this.canvas.width - (this.image.width * finalScale)) / 2,
            // Align Top with Offset
            y: this.canvas.height * CONFIG.VIEWPORT.TOP_OFFSET
        };
    }

    // =========================================================================
    // SIMULATION
    // =========================================================================

    spawnTear(char) {
        // Pick an eye
        const isLeft = Math.random() > 0.5;
        const eyeDef = isLeft ? CONFIG.EYES.LEFT : CONFIG.EYES.RIGHT;

        // Calculate spawn position in Canvas Space
        const startX = this.layout.x + (eyeDef.x * this.layout.width);
        const startY = this.layout.y + (eyeDef.y * this.layout.height);

        this.particles.push({
            char: char,
            x: startX,
            y: startY + 10,  // Drop slightly below eyelid
            originX: startX, // Pivot point for oscillation
            vx: 0,
            vy: 0,
            life: 1.0,       // Opacity
            angle: (Math.random() - 0.5) * 0.2, // Slight random rotation
            onFace: true,    // Physics state
        });
    }

    update() {
        const chinY = this.layout.y + (CONFIG.PHYSICS.FRICTION_BOUNDARY * this.layout.height);

        // Loop backwards to allow removal
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];

            // 1. Gravity & Velocity
            if (p.onFace) {
                // If it passes the chin, it falls freely
                if (p.y > chinY) {
                    p.onFace = false;
                } else {
                    // Viscous Slide (Face)
                    if (p.vy < CONFIG.PHYSICS.TERMINAL_VEL_FACE) p.vy += CONFIG.PHYSICS.GRAVITY_FACE;
                }
            } else {
                // Free Fall (Air)
                p.vy += CONFIG.PHYSICS.GRAVITY_AIR;
            }

            // 2. Position Integration
            p.y += p.vy;

            // 3. Horizontal Micro-Physics
            if (p.onFace) {
                // Wobble to simulate cheek volume
                const wobble = Math.sin((p.y - this.layout.y) * CONFIG.PHYSICS.WOBBLE_SPEED) * CONFIG.PHYSICS.WOBBLE_AMP;
                const direction = p.originX < (this.layout.x + this.layout.width / 2) ? -1 : 1; // Push outwards
                p.x = p.originX + (wobble * direction);
            } else {
                // Air Drift
                p.x += Math.sin(p.y * 0.02) * 0.5;
            }

            // 4. Lifecycle
            p.life -= CONFIG.PARTICLES.FADE_RATE;
            p.angle += 0.01;

            // Cull dead particles
            if (p.y > this.canvas.height || p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }

    // =========================================================================
    // RENDERING
    // =========================================================================

    draw() {
        // Clear Frame
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        if (this.image) {
            this.ctx.save();
            // Draw Silhouette
            this.ctx.drawImage(
                this.image,
                this.layout.x, this.layout.y,
                this.layout.width, this.layout.height
            );

            // TRIM THE CAPE (Sculpt shoulders)
            // We use 'destination-out' to erase parts of the image (the cape)
            // to reveal a human shoulder shape underneath.
            this.ctx.globalCompositeOperation = 'destination-out';
            this.trimCape();

            this.ctx.restore();

            // Draw Eyes (Overlays)
            this.drawEye(CONFIG.EYES.LEFT);
            this.drawEye(CONFIG.EYES.RIGHT);
        }

        // Draw Tears
        this.ctx.font = CONFIG.PARTICLES.FONT;
        this.ctx.fillStyle = CONFIG.PARTICLES.COLOR;

        this.particles.forEach(p => {
            this.ctx.save();
            this.ctx.globalAlpha = p.life;
            this.ctx.translate(p.x, p.y);
            this.ctx.rotate(p.angle);
            this.ctx.fillText(p.char, 0, 0);
            this.ctx.restore();
        });
    }

    /**
     * Draws negative space to "cut" the cape away and leave shoulders.
     */
    trimCape() {
        const lx = this.layout.x;
        const ly = this.layout.y;
        const w = this.layout.width;
        const h = this.layout.height;

        this.ctx.beginPath();

        // SAITAMA PROPORTIONS (Full Body Image)
        // Head is roughly top 20%. Shoulders are around 20-25%.
        // Previous 0.45 was way too low (waist level).
        const neckY = ly + (h * 0.22);

        // We want narrow, human shoulders, not the wide cape width.
        const shoulderW = w * 0.16; // Distance from center to "bone" shoulder tip

        const cx = lx + w / 2; // Center X

        // -- LEFT SIDE CUT (Masking the Cape) --
        // Start top-left
        this.ctx.moveTo(lx, ly);
        // Go down to Neck level
        this.ctx.lineTo(lx, neckY);
        // Curve inward to cut the cape off
        this.ctx.bezierCurveTo(
            lx + w * 0.1, neckY + h * 0.05, // Control 1: Push in
            cx - shoulderW, neckY + h * 0.05, // Control 2: Shoulder Tip
            cx - shoulderW * 0.9, h * 0.8 // Bottom: Taper to body
        );
        // Close Left Loop
        this.ctx.lineTo(lx, h); // Bottom Left
        this.ctx.lineTo(lx, ly); // Back to Top

        // -- RIGHT SIDE CUT --
        // Start top-right
        this.ctx.moveTo(lx + w, ly);
        this.ctx.lineTo(lx + w, neckY);
        // Curve inward
        this.ctx.bezierCurveTo(
            lx + w * 0.9, neckY + h * 0.05,
            cx + shoulderW, neckY + h * 0.05,
            cx + shoulderW * 0.9, h * 0.8
        );
        // Close Right Loop
        this.ctx.lineTo(lx + w, h);
        this.ctx.lineTo(lx + w, ly);

        this.ctx.fill();
    }

    drawEye(eyeDef) {
        const x = this.layout.x + (eyeDef.x * this.layout.width);
        const y = this.layout.y + (eyeDef.y * this.layout.height);
        const w = this.layout.width * CONFIG.EYES.WIDTH_PERCENT;
        const h = this.layout.height * CONFIG.EYES.HEIGHT_PERCENT;

        this.ctx.save();

        // Sclera (White)
        this.ctx.fillStyle = CONFIG.EYES.COLOR;
        this.ctx.shadowColor = CONFIG.EYES.GLOW_COLOR;
        this.ctx.shadowBlur = CONFIG.EYES.GLOW_BLUR;
        this.ctx.beginPath();
        this.ctx.ellipse(x, y, w / 2, h / 2, 0, 0, Math.PI * 2);
        this.ctx.fill();

        // Pupil (Black)
        this.ctx.fillStyle = CONFIG.EYES.PUPIL_COLOR;
        this.ctx.shadowBlur = 0; // No glow on pupil
        this.ctx.beginPath();
        this.ctx.arc(x, y, 2, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.restore();
    }

    loop() {
        this.update();
        this.draw();
        requestAnimationFrame(() => this.loop());
    }
}

// Entry Point
export function initMirrorShadow() {
    new MirrorShadow();
}

/**
 * MIRROR SHADOW MODULE
 * 
 * Implements an interactive "weeping shadow" effect using HTML5 Canvas.
 * - Renders a user-provided image asset as the shadow.
 * - Simulates stylized "tear" physics (viscous face-hug -> free fall).
 * - Maps interactions to specific eye coordinates on the image.
 */

const CONFIG = {
    DOM: {
        CANVAS_ID: 'shadowCanvas',
        INPUT_ID: 'tearInput',
    },
    ASSETS: {
        SHADOW_URL: 'images/saitama-ref.png', // One Punch Man Reference
    },
    // Approximate eye positions on the source image (0.0 - 1.0)
    // Adjusted for the provided Saitama reference image
    EYES: {
        LEFT: { x: 0.43, y: 0.45 },
        RIGHT: { x: 0.59, y: 0.45 },
    },
    PHYSICS: {
        GRAVITY_AIR: 0.5,
        GRAVITY_FACE: 0.05,
        TERMINAL_VELOCITY_FACE: 2.0,
        FACE_FRICTION_BOUNDARY: 0.65, // % of image height where face ends (chin)
        WOBBLE_SPEED: 0.03,
        WOBBLE_AMP: 3,
    },
    PARTICLES: {
        FONT: '24px "Courier New"',
        COLOR: '#FFFFFF',
        FADE_RATE: 0.003,
        SHADOW_BLUR: 4,
        SHADOW_COLOR: "rgba(255, 255, 255, 0.5)",
    }
};

export class MirrorShadow {
    constructor() {
        this.canvas = document.getElementById(CONFIG.DOM.CANVAS_ID);
        this.ctx = this.canvas.getContext('2d');
        this.input = document.getElementById(CONFIG.DOM.INPUT_ID);

        this.particles = [];
        this.image = null;

        // Calculated layout metrics
        this.metrics = {
            tX: 0, tY: 0, // Translation (centering)
            scale: 1,     // Scale factor
            w: 0, h: 0    // Rendered size
        };

        this.init();
    }

    /**
     * Initialize the module: Load assets -> Bind Events -> Start Loop
     */
    async init() {
        try {
            await this.loadImage(CONFIG.ASSETS.SHADOW_URL);
            this.bindEvents();
            this.resize(); // Initial layout calculation
            this.loop();
        } catch (err) {
            console.error('Failed to load shadow asset:', err);
        }
    }

    /**
     * Promisified image loader
     */
    loadImage(src) {
        return new Promise((resolve, reject) => {
            this.image = new Image();
            this.image.src = src;
            this.image.onload = () => resolve(this.image);
            this.image.onerror = reject;
        });
    }

    bindEvents() {
        window.addEventListener('resize', () => this.resize());

        // Detect typing to spawn tears
        this.input.addEventListener('input', (e) => {
            const char = e.data || this.input.value.slice(-1);
            if (char) this.spawnTear(char);
        });
    }

    /**
     * Responsive Layout Calculation
     * Centers and correlates the image to the canvas size
     */
    resize() {
        this.canvas.width = this.canvas.clientWidth;
        this.canvas.height = this.canvas.clientHeight;

        if (!this.image) return;

        // Contain image within 80% of canvas
        const scale = Math.min(
            (this.canvas.width * 0.8) / this.image.width,
            (this.canvas.height * 0.8) / this.image.height
        );

        this.metrics = {
            scale: scale,
            w: this.image.width * scale,
            h: this.image.height * scale,
            tX: (this.canvas.width - this.image.width * scale) / 2,
            tY: (this.canvas.height - this.image.height * scale) / 2
        };
    }

    spawnTear(char) {
        if (!this.image) return;

        const isLeft = Math.random() > 0.5;
        const eyeConfig = isLeft ? CONFIG.EYES.LEFT : CONFIG.EYES.RIGHT;

        // Calculate absolute spawn position based on metrics
        const startX = this.metrics.tX + (eyeConfig.x * this.metrics.w);
        const startY = this.metrics.tY + (eyeConfig.y * this.metrics.h);

        this.particles.push({
            char: char,
            x: startX,
            y: startY,
            initialX: startX, // Origin for sine wave calculations
            vx: 0,
            vy: 0.5,
            opacity: 1,
            size: 24,
            rotation: (Math.random() - 0.5) * 0.2,
            onFace: true, // State flag for physics
        });
    }

    /**
     * Physics Step
     * Updates positions, applies gravity, handles friction zones
     */
    update() {
        // Chin boundary in absolute pixels
        const chinY = this.metrics.tY + (CONFIG.PHYSICS.FACE_FRICTION_BOUNDARY * this.metrics.h);

        for (let i = this.particles.length - 1; i >= 0; i--) {
            let p = this.particles[i];

            // 1. Vertical Motion (Gravity/Viscosity)
            if (p.onFace) {
                // Check if still on face
                if (p.y >= chinY) {
                    p.onFace = false; // Transition to air
                } else {
                    // Viscous Friction
                    if (p.vy < CONFIG.PHYSICS.TERMINAL_VELOCITY_FACE) {
                        p.vy += CONFIG.PHYSICS.GRAVITY_FACE;
                    }
                }
            } else {
                // Free Fall (Air)
                p.vy += CONFIG.PHYSICS.GRAVITY_AIR;
            }
            p.y += p.vy;

            // 2. Horizontal Motion (Surface interactions)
            if (p.onFace) {
                // Wobble to simulate contour following
                const originOffset = Math.sin((p.y - this.metrics.tY) * CONFIG.PHYSICS.WOBBLE_SPEED) * CONFIG.PHYSICS.WOBBLE_AMP;
                // Direction biased away from center slightly
                const sideBias = p.initialX < (this.metrics.tX + this.metrics.w / 2) ? -1 : 1;

                p.x = p.initialX + (originOffset * sideBias);
            } else {
                // Air Drift
                p.x += Math.sin(p.y * 0.02) * 0.5;
            }

            // 3. Lifecycle
            p.opacity -= CONFIG.PARTICLES.FADE_RATE;
            p.rotation += 0.01;

            if (p.y > this.canvas.height || p.opacity <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }

    /**
     * Render Step
     * Clears canvas -> Draws Shadow -> Draws Particles
     */
    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        if (this.image) {
            this.ctx.save();
            // Optional: Subtle breathe effect (Can be toggled or removed)
            // const breathe = Math.sin(Date.now() * 0.002) * 2;

            this.ctx.drawImage(
                this.image,
                this.metrics.tX,
                this.metrics.tY,
                this.metrics.w,
                this.metrics.h
            );
            this.ctx.restore();
        }

        // Draw Particles
        this.ctx.font = CONFIG.PARTICLES.FONT;
        this.ctx.fillStyle = CONFIG.PARTICLES.COLOR;

        this.particles.forEach(p => {
            this.ctx.save();
            this.ctx.globalAlpha = p.opacity;
            this.ctx.translate(p.x, p.y);
            this.ctx.rotate(p.rotation);

            this.ctx.shadowColor = CONFIG.PARTICLES.SHADOW_COLOR;
            this.ctx.shadowBlur = CONFIG.PARTICLES.SHADOW_BLUR;

            this.ctx.fillText(p.char, 0, 0);
            this.ctx.restore();
        });
    }

    loop() {
        this.update();
        this.draw();
        requestAnimationFrame(() => this.loop());
    }
}

export function initMirrorShadow() {
    // Singleton instance
    new MirrorShadow();
}

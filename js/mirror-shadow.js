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
        SHADOW_URL: 'images/saitama-upper.png',
    },
    // Adjusted for the new full-body image
    // Target: Head is near top.
    EYES: {
        LEFT: { x: 0.45, y: 0.23 },
        RIGHT: { x: 0.55, y: 0.23 },
    },
    PHYSICS: {
        GRAVITY_AIR: 0.5,
        GRAVITY_FACE: 0.05,
        TERMINAL_VELOCITY_FACE: 2.0,
        FACE_FRICTION_BOUNDARY: 0.35,
        WOBBLE_SPEED: 0.03,
        WOBBLE_AMP: 3,
    },
    PARTICLES: {
        FONT: '24px "Courier New"',
        COLOR: '#FFFFFF',
        FADE_RATE: 0.003,
        SHADOW_BLUR: 4,
        SHADOW_COLOR: "rgba(255, 255, 255, 0.5)",
    },
    VIEWPORT: {
        MAX_WIDTH_PERCENT: 0.85, // Image should take up 85% of screen width
        OFFSET_Y_PERCENT: 0.05,  // Top margin
    }
};

export class MirrorShadow {
    constructor() {
        this.canvas = document.getElementById(CONFIG.DOM.CANVAS_ID);
        this.ctx = this.canvas.getContext('2d');
        this.input = document.getElementById(CONFIG.DOM.INPUT_ID);

        this.particles = [];
        this.image = null;

        this.metrics = {
            tX: 0, tY: 0,
            scale: 1,
            w: 0, h: 0
        };

        this.init();
    }

    async init() {
        try {
            await this.loadImage(CONFIG.ASSETS.SHADOW_URL);
            this.bindEvents();
            this.resize();
            this.loop();
        } catch (err) {
            console.error('Failed to load shadow asset:', err);
        }
    }

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
        this.input.addEventListener('input', (e) => {
            const char = e.data || this.input.value.slice(-1);
            if (char) this.spawnTear(char);
        });
    }

    resize() {
        this.canvas.width = this.canvas.clientWidth;
        this.canvas.height = this.canvas.clientHeight;

        if (!this.image) return;

        // SCALE LOGIC:
        // We want the image width to be 85% of canvas width.
        // This ensures margins on the side, so we see the silhouette shape.
        const targetWidth = this.canvas.width * CONFIG.VIEWPORT.MAX_WIDTH_PERCENT;
        const scale = targetWidth / this.image.width;

        this.metrics = {
            scale: scale,
            w: this.image.width * scale,
            h: this.image.height * scale,
            // Center Horizontally
            tX: (this.canvas.width - (this.image.width * scale)) / 2,
            // Align Top with small margin
            tY: this.canvas.height * CONFIG.VIEWPORT.OFFSET_Y_PERCENT
        };
    }

    spawnTear(char) {
        if (!this.image) return;

        const isLeft = Math.random() > 0.5;
        const eyeConfig = isLeft ? CONFIG.EYES.LEFT : CONFIG.EYES.RIGHT;

        const startX = this.metrics.tX + (eyeConfig.x * this.metrics.w);
        const startY = this.metrics.tY + (eyeConfig.y * this.metrics.h);

        this.particles.push({
            char: char,
            x: startX,
            y: startY + 10,
            initialX: startX,
            vx: 0,
            vy: 0.5,
            opacity: 1,
            size: 24,
            rotation: (Math.random() - 0.5) * 0.2,
            onFace: true,
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

            // 1. Draw The Silhouette (The Image as Black)
            // We use the image's alpha channel but fill it with black
            this.ctx.translate(this.metrics.tX, this.metrics.tY);
            this.ctx.scale(this.metrics.scale, this.metrics.scale);

            // Draw original image
            this.ctx.drawImage(this.image, 0, 0);

            // Composite operation to turn non-transparent pixels black
            this.ctx.globalCompositeOperation = 'source-in';
            this.ctx.fillStyle = '#111';
            this.ctx.fillRect(0, 0, this.image.width, this.image.height);

            this.ctx.restore();

            // 2. Draw The Eyes (Overlaid on top - Manual Calculation for Visibility)
            // We can't rely on the image's original eyes because they were turned black
            this.ctx.save();
            this.ctx.fillStyle = '#FFFFFF';
            this.ctx.shadowBlur = 8;
            this.ctx.shadowColor = 'rgba(255,255,255,0.6)';

            const eyeW = this.metrics.w * 0.07;
            const eyeH = this.metrics.h * 0.04;

            const lx = this.metrics.tX + (CONFIG.EYES.LEFT.x * this.metrics.w);
            const ly = this.metrics.tY + (CONFIG.EYES.LEFT.y * this.metrics.h);
            const rx = this.metrics.tX + (CONFIG.EYES.RIGHT.x * this.metrics.w);
            const ry = this.metrics.tY + (CONFIG.EYES.RIGHT.y * this.metrics.h);

            // Left Eye
            this.ctx.beginPath();
            this.ctx.ellipse(lx, ly, eyeW / 2, eyeH / 2, 0, 0, Math.PI * 2);
            this.ctx.fill();
            // Left Pupil
            this.ctx.fillStyle = '#000';
            this.ctx.shadowBlur = 0;
            this.ctx.beginPath();
            this.ctx.arc(lx, ly, 2, 0, Math.PI * 2);
            this.ctx.fill();

            // Right Eye
            this.ctx.fillStyle = '#FFFFFF';
            this.ctx.shadowBlur = 8;
            this.ctx.beginPath();
            this.ctx.ellipse(rx, ry, eyeW / 2, eyeH / 2, 0, 0, Math.PI * 2);
            this.ctx.fill();
            // Right Pupil
            this.ctx.fillStyle = '#000';
            this.ctx.shadowBlur = 0;
            this.ctx.beginPath();
            this.ctx.arc(rx, ry, 2, 0, Math.PI * 2);
            this.ctx.fill();

            this.ctx.restore();
        }

        // 3. Draw Particles (Tears)
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

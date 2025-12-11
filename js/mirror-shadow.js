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
            const rawImage = await this.loadImage(CONFIG.ASSETS.SHADOW_URL);
            // Process the image to remove background and create silhouette
            this.image = await this.processSilhouette(rawImage);

            this.bindEvents();
            this.resize();
            this.loop();
        } catch (err) {
            console.error('Failed to load shadow asset:', err);
        }
    }

    /**
     * Creates a processed version of the image:
     * 1. Detects background color (from top-left pixel)
     * 2. Key out background -> Transparent
     * 3. Turn foreground -> Black
     */
    processSilhouette(img) {
        return new Promise((resolve) => {
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = img.width;
            tempCanvas.height = img.height;
            const tCtx = tempCanvas.getContext('2d');

            tCtx.drawImage(img, 0, 0);

            const imageData = tCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
            const data = imageData.data;

            // Sample background color from top-left
            const bgR = data[0];
            const bgG = data[1];
            const bgB = data[2];

            // Threshold for background matching
            const threshold = 30;

            for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];
                // const a = data[i + 3];

                // Distance from background color
                const dist = Math.abs(r - bgR) + Math.abs(g - bgG) + Math.abs(b - bgB);

                if (dist < threshold) {
                    // Start of 'Background' -> Make Transparent
                    data[i + 3] = 0;
                } else {
                    // 'Foreground' -> Make Silhouette (Black)
                    data[i] = 17;     // R (Dark Gray/Black)
                    data[i + 1] = 17;   // G
                    data[i + 2] = 17;   // B
                    data[i + 3] = 255;  // Alpha Full
                }
            }

            tCtx.putImageData(imageData, 0, 0);

            // Create a new Image from this processed canvas
            const processedImg = new Image();
            processedImg.src = tempCanvas.toDataURL();
            processedImg.onload = () => resolve(processedImg);
        });
    }

    loadImage(src) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = "Anonymous"; // Allow pixel manipulation
            img.src = src;
            img.onload = () => resolve(img);
            img.onerror = reject;
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

            // Draw result (which is already processed to be a black silhouette with transparency)
            this.ctx.drawImage(this.image, 0, 0);

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

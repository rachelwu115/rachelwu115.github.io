/**
 * MIRROR SYSTEM APPLICATION
 * 
 * Architecture:
 * - Single-file module for guaranteed loading reliability on GitHub Pages.
 * - Separation of Concerns: Config / Components / Main Loop.
 * - "Chroma Key" Silhouette Generation: Programmatically creates shadow art from raw assets.
 * 
 * @author Antigravity (Principal Engineer Mode)
 * @version 3.0 (Ultra-Close & Reconstructed)
 */

const APP_CONFIG = {
    // -------------------------------------------------------------------------
    // ASSETS
    // -------------------------------------------------------------------------
    IMAGE_URL: 'images/saitama-upper.png',

    // -------------------------------------------------------------------------
    // VISUAL TUNING
    // -------------------------------------------------------------------------
    // Threshold (0-255) for background removal. High = aggressive removal.
    CHROMA_TOLERANCE: 30,

    // Set FALSE for production (erases cape). 
    // Set TRUE to see the "Cut Lines" in red for debugging geometry.
    DEBUG_MODE: false,

    // -------------------------------------------------------------------------
    // LAYOUT & FRAMING
    // -------------------------------------------------------------------------
    VIEWPORT: {
        // Zoom Level: 
        // 3.2 = ULTRA CLOSE-UP. Face dominates the frame.
        ZOOM: 3.2,

        // Vertical Offset:
        // 0.0 = Start rendering at the very top. Pulls chin up.
        TOP_OFFSET: 0.0,
    },

    // -------------------------------------------------------------------------
    // SILHOUETTE SCULPTING (CAPE REMOVAL)
    // -------------------------------------------------------------------------
    BODY: {
        // Neck width: Narrower = younger/slenderer look.
        NECK_WIDTH_PCT: 0.12,

        // Vertical start of the shoulder slope (relative to height).
        NECK_Start_Y: 0.22,

        // How wide the shoulders eventually get (relative to width of image).
        SHOULDER_MAX_WIDTH: 0.28,
    },

    // -------------------------------------------------------------------------
    // TEAR PHYSICS & EYES
    // -------------------------------------------------------------------------
    PHYSICS: {
        GRAVITY: { Face: 0.05, Air: 0.5 },
        WOBBLE: { Speed: 0.03, Amp: 3 }, // Cheek contour simulation
        BOUNDARY_Y: 0.35, // Normalized Y-pos where face ends
    },

    EYES: {
        // Positions mapped to the original image layout logic
        // Y is adjusted slightly to account for the new Offset 0.0
        LEFT: { x: 0.45, y: 0.24 },
        RIGHT: { x: 0.55, y: 0.24 },
    }
};

/**
 * COMPONENT: Magnetic Interaction
 * Adds a premium "weighted" feel to UI elements by tracking mouse movement.
 */
class MagneticButton {
    constructor(wrapperParams) {
        this.area = document.querySelector(wrapperParams.area);
        this.btn = document.querySelector(wrapperParams.button);
        if (!this.area || !this.btn) return;
        this.init();
    }

    init() {
        this.area.addEventListener('mousemove', (e) => this.move(e));
        this.area.addEventListener('mouseleave', () => this.reset());
    }

    move(e) {
        const rect = this.area.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;

        this.btn.style.transform = `translate(${x * 0.5}px, ${y * 0.5}px)`;
        this.area.style.transform = `translate(${x * 0.2}px, ${y * 0.2}px)`;
    }

    reset() {
        this.btn.style.transform = 'translate(0px, 0px)';
        this.area.style.transform = 'translate(0px, 0px)';
    }
}

/**
 * COMPONENT: The Mirror
 * Core Logic for the "Weeping Shadow" interactive art piece.
 */
class Mirror {
    constructor() {
        this.canvas = document.getElementById('shadowCanvas');
        this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
        this.input = document.getElementById('tearInput');

        this.img = null;
        this.particles = [];
        this.layout = { x: 0, y: 0, w: 0, h: 0, s: 1 };

        this.init();
    }

    async init() {
        try {
            const raw = await this.loadImage(APP_CONFIG.IMAGE_URL);
            this.img = await this.processImage(raw);

            this.bind();
            this.resize();
            this.startLoop();

            if (this.input) this.input.value = "";
            this.input.placeholder = "type here...";

        } catch (err) {
            console.error("Mirror Init Failed:", err);
            if (this.input) this.input.value = "ERR: Asset Load Failed";
        }
    }

    loadImage(src) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = "Anonymous";
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = src;
        });
    }

    /**
     * CHROMA KEY PROCESSOR
     */
    processImage(source) {
        return new Promise(resolve => {
            const buffer = document.createElement('canvas');
            [buffer.width, buffer.height] = [source.width, source.height];
            const ctx = buffer.getContext('2d');

            ctx.drawImage(source, 0, 0);
            const idata = ctx.getImageData(0, 0, buffer.width, buffer.height);
            const data = idata.data;
            const bg = { r: data[0], g: data[1], b: data[2] };

            for (let i = 0; i < data.length; i += 4) {
                const diff = Math.abs(data[i] - bg.r) + Math.abs(data[i + 1] - bg.g) + Math.abs(data[i + 2] - bg.b);
                if (diff < APP_CONFIG.CHROMA_TOLERANCE) {
                    data[i + 3] = 0; // Transparent
                } else {
                    // Dark Gray Silhouette (#141414)
                    data[i] = 20; data[i + 1] = 20; data[i + 2] = 20; data[i + 3] = 255;
                }
            }

            ctx.putImageData(idata, 0, 0);
            const final = new Image();
            final.onload = () => resolve(final);
            final.src = buffer.toDataURL();
        });
    }

    bind() {
        window.addEventListener('resize', () => this.resize());
        this.input.addEventListener('input', (e) => {
            const char = e.data || this.input.value.slice(-1);
            if (char && char.trim()) this.spawnTear(char);
        });
    }

    /**
     * RESIZE HUD & FRAMING
     */
    resize() {
        this.canvas.width = this.canvas.clientWidth;
        this.canvas.height = this.canvas.clientHeight;

        if (!this.img) return;

        const rawScale = this.canvas.width / this.img.width;
        const scale = rawScale * APP_CONFIG.VIEWPORT.ZOOM;

        this.layout = {
            s: scale,
            w: this.img.width * scale,
            h: this.img.height * scale,
            x: (this.canvas.width - (this.img.width * scale)) / 2,
            y: this.canvas.height * APP_CONFIG.VIEWPORT.TOP_OFFSET
        };
    }

    spawnTear(char) {
        const { LEFT, RIGHT } = APP_CONFIG.EYES;
        const isLeft = Math.random() > 0.5;
        const target = isLeft ? LEFT : RIGHT;

        const x = this.layout.x + (target.x * this.layout.w);
        const y = this.layout.y + (target.y * this.layout.h) + 10;

        this.particles.push({
            char, x, y,
            originX: x,
            vx: 0, vy: 0,
            life: 1.0,
            angle: (Math.random() - 0.5) * 0.2,
            onFace: true
        });
    }

    update() {
        const chinY = this.layout.y + (APP_CONFIG.PHYSICS.BOUNDARY_Y * this.layout.h);

        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];

            if (p.onFace) {
                if (p.y > chinY) {
                    p.onFace = false; // Fell off chin
                } else {
                    if (p.vy < 2.0) p.vy += APP_CONFIG.PHYSICS.GRAVITY.Face;

                    const distY = p.y - this.layout.y;
                    const wobble = Math.sin(distY * APP_CONFIG.PHYSICS.WOBBLE.Speed) * APP_CONFIG.PHYSICS.WOBBLE.Amp;
                    const dir = p.originX < (this.layout.x + this.layout.w / 2) ? -1 : 1;
                    p.x = p.originX + (wobble * dir);
                }
            } else {
                // Free Fall (Air)
                p.vy += APP_CONFIG.PHYSICS.GRAVITY.Air;
                p.x += Math.sin(p.y * 0.02) * 0.5;
            }

            p.y += p.vy;
            p.life -= 0.003;
            p.angle += 0.01;

            if (p.life <= 0 || p.y > this.canvas.height) {
                this.particles.splice(i, 1);
            }
        }
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        if (this.img) {
            this.ctx.save();

            // 1. Draw Base Silhouette
            this.ctx.drawImage(this.img, this.layout.x, this.layout.y, this.layout.w, this.layout.h);

            // 2. Erase Cape (Reconstruct Anatomy)
            const op = APP_CONFIG.DEBUG_MODE ? 'source-over' : 'destination-out';
            this.ctx.globalCompositeOperation = op;
            if (APP_CONFIG.DEBUG_MODE) {
                this.ctx.strokeStyle = 'red';
                this.ctx.lineWidth = 4;
            }
            this.sculptShoulders(APP_CONFIG.DEBUG_MODE);

            this.ctx.restore();

            // 3. Draw Eyes (Overlay)
            const { LEFT, RIGHT } = APP_CONFIG.EYES;
            this.drawEye(LEFT.x, LEFT.y);
            this.drawEye(RIGHT.x, RIGHT.y);
        }

        // 4. Draw Tears
        this.ctx.font = '24px "Courier New"';
        this.ctx.fillStyle = '#FFFFFF';
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
     * RECONSTRUCTIVE SCULPTING
     * Uses Bezier curves to "delete" the cape mass.
     * Starts high on the neck and curves concave-ly to form human slope.
     */
    sculptShoulders(stroke = false) {
        const { x, y, w, h } = this.layout;
        const cx = x + w / 2;

        const neckY = y + (h * APP_CONFIG.BODY.NECK_Start_Y);
        // Half-width of the neck itself
        const neckRx = w * APP_CONFIG.BODY.NECK_WIDTH_PCT;
        // Max width of the shoulders (cut everything outside this)
        const shoulderMaxRx = w * APP_CONFIG.BODY.SHOULDER_MAX_WIDTH;

        this.ctx.beginPath();

        // --- LEFT SIDE REMOVAL ---
        // Start from top-left corner
        this.ctx.moveTo(x, y);
        // Go down to start of neck
        this.ctx.lineTo(x, neckY);

        // CURVE: This is the "Cut Line".
        // It starts at the left edge. We want to cut *in* to the neck, then *out* to the shoulder.
        // But since we are "clearing" pixels, we need to define the shape of the negative space (the Air).
        // The negative space needs to touch the NECK line.

        // Point 1: Neck start position (User wants no hump).
        // We draw a line from the edge(x) INWARDS to the neck boundary(cx - neckRx).
        this.ctx.lineTo(cx - neckRx, neckY); // Top of 'Traps'

        // Point 2: Curve down-and-out to the shoulder tip.
        // This curve defines the visible shoulder slope.
        // Control Point 1: Down along the neck (vertical drop) -> creates a 90deg neck angle (human).
        // Control Point 2: Out towards the arm.
        // End Point: The shoulder width limit at the bottom of the screen.

        // Actually, 'destination-out' erases INSIDE the shape. 
        // So we are drawing the AIR.
        // The AIR shape is: Corner -> Neck Top -> [Curve describing shoulder slope] -> Shoulder Tip -> Bottom Corner.
        // Wait, to ERASE the cape, we need to draw ON TOP of the cape.
        // The cape is OUTSIDE the human body line.

        // CORRECTION: We define the "Human Body" shape, then INVERT it? No, canvas is easier if we draw the "Eraser Shape".
        // Eraser Shape Left: 
        // 1. Top-Left(x,y) 
        // 2. Top-Center-Left(cx - neckRx, y)
        // 3. Down to Neck Start (cx - neckRx, neckY) -> This clears the area above the traps.

        // Let's stick to the previous reliable method: Draw a big shape on the sides that "bites" into the image.

        // New BITE Logic:
        // Start at Edge.
        // Line to Neck Height.
        // Bezier Curve that goes DEEP IN into the body (to remove cape thickness).
        // CP1: (x + w*0.3, neckY + h*0.02) -> Pulls the cut inward quickly.
        // CP2: (cx - shoulderMaxRx, neckY + h*0.1) -> Rounded slope.
        // End: (cx - shoulderMaxRx * 0.9, h) -> Bottom of arm.

        this.ctx.bezierCurveTo(
            x + w * 0.35, neckY + h * 0.05, // Aggressive inward push (removes hump)
            cx - shoulderMaxRx, neckY + h * 0.08, // Rounding the deltoid
            cx - shoulderMaxRx * 0.9, h           // Tapering the arm
        );

        this.ctx.lineTo(x, h);
        this.ctx.lineTo(x, y);

        // --- RIGHT SIDE REMOVAL ---
        this.ctx.moveTo(x + w, y);
        this.ctx.lineTo(x + w, neckY);

        // Mirror the curve geometry
        this.ctx.bezierCurveTo(
            x + w * 0.65, neckY + h * 0.05, // 1.0 - 0.35 = 0.65
            cx + shoulderMaxRx, neckY + h * 0.08,
            cx + shoulderMaxRx * 0.9, h
        );

        this.ctx.lineTo(x + w, h);
        this.ctx.lineTo(x + w, y);

        stroke ? this.ctx.stroke() : this.ctx.fill();
    }

    drawEye(rx, ry) {
        const x = this.layout.x + (rx * this.layout.w);
        const y = this.layout.y + (ry * this.layout.h);
        const w = this.layout.w * 0.07;
        const h = this.layout.h * 0.04;

        this.ctx.save();
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.shadowBlur = 8; this.ctx.shadowColor = 'rgba(255,255,255,0.6)';
        this.ctx.beginPath(); this.ctx.ellipse(x, y, w / 2, h / 2, 0, 0, Math.PI * 2); this.ctx.fill();
        this.ctx.fillStyle = '#000000'; this.ctx.shadowBlur = 0;
        this.ctx.beginPath(); this.ctx.arc(x, y, 2, 0, Math.PI * 2); this.ctx.fill();
        this.ctx.restore();
    }

    startLoop() {
        const loop = () => {
            this.update();
            this.draw();
            requestAnimationFrame(loop);
        };
        loop();
    }
}

// MAIN ENTRY POINT
document.addEventListener('DOMContentLoaded', () => {
    new MagneticButton({ area: '.magnetic-area', button: '.magnetic-content' });
    new Mirror();
});

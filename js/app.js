/**
 * MIRROR SYSTEM APPLICATION
 * 
 * Architecture:
 * - Single-file module for guaranteed loading reliability on GitHub Pages.
 * - Separation of Concerns: Config / Components / Main Loop.
 * - "Chroma Key" Silhouette Generation: Programmatically creates shadow art from raw assets.
 * 
 * @author Antigravity (Principal Engineer Mode)
 * @version 6.0 (Anatomical Prosthetic)
 */

const APP_CONFIG = {
    // -------------------------------------------------------------------------
    // ASSETS
    // -------------------------------------------------------------------------
    IMAGE_URL: 'images/saitama-upper.png',

    // -------------------------------------------------------------------------
    // VISUAL TUNING
    // -------------------------------------------------------------------------
    CHROMA_TOLERANCE: 30,
    DEBUG_MODE: false,

    // -------------------------------------------------------------------------
    // LAYOUT & FRAMING
    // -------------------------------------------------------------------------
    VIEWPORT: {
        // Zoom Level: 
        // 2.9 = Slightly zoomed out from 3.1 per user request.
        ZOOM: 2.9,

        // Vertical Offset:
        // 0.05 = Push down slightly to frame the new shoulders nicely.
        TOP_OFFSET: 0.05,
    },

    // -------------------------------------------------------------------------
    // BODY REPLACEMENT (PROSTHETIC)
    // -------------------------------------------------------------------------
    BODY: {
        // Cut line (Chin Level).
        AMPUTATION_Y: 0.23,

        // Anatomy Constants (Relative to Image Width)
        NECK_WIDTH: 0.095,      // Slender human neck
        TRAPS_WIDTH: 0.16,      // Width where traps meet shoulders
        SHOULDER_WIDTH: 0.24,   // Deltoid width

        // Vertical Drop-offs (Relative to Image Height)
        TRAPS_DROP: 0.06,       // Gentle slope of the neck muscles
        SHOULDER_DROP: 0.14,    // Where the shoulder rounds off
    },

    // -------------------------------------------------------------------------
    // PHYSICS
    // -------------------------------------------------------------------------
    PHYSICS: {
        GRAVITY: { Face: 0.05, Air: 0.5 },
        WOBBLE: { Speed: 0.03, Amp: 3 },
        BOUNDARY_Y: 0.35,
    },

    EYES: {
        LEFT: { x: 0.45, y: 0.23 },
        RIGHT: { x: 0.55, y: 0.23 },
    }
};

/**
 * COMPONENT: Magnetic Interaction
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
                    data[i + 3] = 0;
                } else {
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

            // 2. AMPUTATION
            const ampY = this.layout.y + (this.layout.h * APP_CONFIG.BODY.AMPUTATION_Y);
            const ampHeight = this.canvas.height - ampY;
            this.ctx.globalCompositeOperation = 'destination-out';
            this.ctx.fillRect(0, ampY, this.canvas.width, ampHeight);

            // 3. ANATOMICAL PROSTHETIC
            this.ctx.globalCompositeOperation = 'source-over';
            this.ctx.fillStyle = '#141414';
            this.drawProstheticBody(ampY);

            this.ctx.restore();

            // 4. Draw Eyes
            const { LEFT, RIGHT } = APP_CONFIG.EYES;
            this.drawEye(LEFT.x, LEFT.y);
            this.drawEye(RIGHT.x, RIGHT.y);
        }

        // 5. Draw Tears
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
     * PROCEDURAL BODY GENERATOR v2
     * Creates a natural, anatomical shoulder line.
     */
    drawProstheticBody(startY) {
        const { x, w } = this.layout;
        const cx = x + w / 2;

        // Unpack Anatomy
        const { NECK_WIDTH, TRAPS_WIDTH, SHOULDER_WIDTH, TRAPS_DROP, SHOULDER_DROP } = APP_CONFIG.BODY;

        // 1. Calculate Key Points
        const overlap = 4; // Overlap with image to prevent gaps
        const yTop = startY - overlap;

        const neckX = w * NECK_WIDTH;
        const trapsX = w * TRAPS_WIDTH;
        const shoulderX = w * SHOULDER_WIDTH;

        const yTraps = yTop + (this.layout.h * TRAPS_DROP);
        const yShoulder = yTop + (this.layout.h * SHOULDER_DROP);

        this.ctx.beginPath();

        // --- LEFT SIDE ---
        // 1. Start at Neck (Top Left)
        this.ctx.moveTo(cx - neckX, yTop);

        // 2. Trapezius Slope (Neck muscle to Shoulder joint)
        // Concave curve creates the "Traps" feel
        this.ctx.quadraticCurveTo(
            cx - neckX * 1.2, yTraps * 0.9, // Control Point
            cx - trapsX, yTraps             // End Point (Start of Shoulder)
        );

        // 3. Deltoid Rounding (Shoulder Cap)
        // Convex curve for the shoulder bone
        this.ctx.quadraticCurveTo(
            cx - shoulderX * 0.9, yTraps,  // Control Point (Outward)
            cx - shoulderX, yShoulder      // End Point (Shoulder Tip)
        );

        // 4. Arm Down
        this.ctx.lineTo(cx - shoulderX, this.canvas.height);

        // --- BOTTOM ---
        this.ctx.lineTo(cx + shoulderX, this.canvas.height);

        // --- RIGHT SIDE (Mirror) ---
        // 5. Arm Up
        this.ctx.lineTo(cx + shoulderX, yShoulder);

        // 6. Right Deltoid
        this.ctx.quadraticCurveTo(
            cx + shoulderX * 0.9, yTraps,
            cx + trapsX, yTraps
        );

        // 7. Right Trapezius
        this.ctx.quadraticCurveTo(
            cx + neckX * 1.2, yTraps * 0.9,
            cx + neckX, yTop
        );

        this.ctx.fill();
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

/**
 * MIRROR SYSTEM
 * 
 * Principal Engineer Implementation:
 * - Unifies Mirror and Magnetic logic for reliable single-file loading.
 * - Configurable, maintainable, and performance-optimized.
 */

const APP_CONFIG = {
    // ASSETS
    IMAGE_URL: 'images/saitama-upper.png',

    // VISUAL TUNING
    CHROMA_TOLERANCE: 30, // 0-255: Higher removes more background
    DEBUG_MODE: false,    // set FALSE to erase cape, TRUE to show cut lines

    // LAYOUT
    VIEWPORT: {
        ZOOM: 1.8,        // 1.8x Zoom for Head & Shoulders framing
        TOP_OFFSET: 0.05, // 5% padding from top
    },

    // ANIMATION
    PHYSICS: {
        GRAVITY: { Face: 0.05, Air: 0.5 },
        WOBBLE: { Speed: 0.03, Amp: 3 },
        BOUNDARY_Y: 0.35, // Where face ends (relative to height)
    }
};

/**
 * COMPONENT: Magnetic Interaction
 * Adds a subtle "pull" effect to UI elements.
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

        // Parallax effect: Content moves more than container
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
 * Renders the Saitama shadow with interactive tear physics.
 */
class Mirror {
    constructor() {
        this.canvas = document.getElementById('shadowCanvas');
        this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
        this.input = document.getElementById('tearInput');

        // State
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

            if (this.input) this.input.value = ""; // Clear debug text
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

    // Pre-process image to remove background (Chroma Key)
    processImage(source) {
        return new Promise(resolve => {
            const buffer = document.createElement('canvas');
            [buffer.width, buffer.height] = [source.width, source.height];
            const ctx = buffer.getContext('2d');

            ctx.drawImage(source, 0, 0);
            const idata = ctx.getImageData(0, 0, buffer.width, buffer.height);
            const data = idata.data;
            const bg = { r: data[0], g: data[1], b: data[2] }; // Sample top-left pixel

            for (let i = 0; i < data.length; i += 4) {
                const diff = Math.abs(data[i] - bg.r) + Math.abs(data[i + 1] - bg.g) + Math.abs(data[i + 2] - bg.b);
                if (diff < APP_CONFIG.CHROMA_TOLERANCE) {
                    data[i + 3] = 0; // Transparent
                } else {
                    // Dark Silhouette Color
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

        // Calculate Scale to fit width, then zoom
        const rawScale = this.canvas.width / this.img.width;
        const scale = rawScale * APP_CONFIG.VIEWPORT.ZOOM;

        this.layout = {
            s: scale,
            w: this.img.width * scale,
            h: this.img.height * scale,
            x: (this.canvas.width - (this.img.width * scale)) / 2, // Center X
            y: this.canvas.height * APP_CONFIG.VIEWPORT.TOP_OFFSET // Top Y
        };
    }

    spawnTear(char) {
        // Eyes position relative to original image (0.0-1.0)
        const leftEye = { x: 0.45, y: 0.23 };
        const rightEye = { x: 0.55, y: 0.23 };

        const isLeft = Math.random() > 0.5;
        const target = isLeft ? leftEye : rightEye;

        const x = this.layout.x + (target.x * this.layout.w);
        const y = this.layout.y + (target.y * this.layout.h) + 10; // offset slightly down

        this.particles.push({
            char, x, y,
            originX: x, // for wobbling
            vx: 0, vy: 0,
            life: 1.0,
            angle: (Math.random() - 0.5) * 0.2,
            onFace: true
        });
    }

    update() {
        const chinY = this.layout.y + (APP_CONFIG.PHYSICS.BOUNDARY_Y * this.layout.h);

        // Iterate backwards to allow removal
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];

            // PHYSICS
            if (p.onFace) {
                // Surface Tension / Viscosity Mode
                if (p.y > chinY) {
                    p.onFace = false; // Fell off chin
                } else {
                    if (p.vy < 2.0) p.vy += APP_CONFIG.PHYSICS.GRAVITY.Face;

                    // Cheek Contour Wobble
                    const distY = p.y - this.layout.y;
                    const wobble = Math.sin(distY * APP_CONFIG.PHYSICS.WOBBLE.Speed) * APP_CONFIG.PHYSICS.WOBBLE.Amp;
                    const dir = p.originX < (this.layout.x + this.layout.w / 2) ? -1 : 1;
                    p.x = p.originX + (wobble * dir);
                }
            } else {
                // Free Fall Mode
                p.vy += APP_CONFIG.PHYSICS.GRAVITY.Air;
                p.x += Math.sin(p.y * 0.02) * 0.5; // Air resistance drift
            }

            p.y += p.vy;
            p.life -= 0.003; // Fade out
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

            // 1. Draw Silhouette
            this.ctx.drawImage(this.img, this.layout.x, this.layout.y, this.layout.w, this.layout.h);

            // 2. Trim Cape (Composite or Debug)
            if (APP_CONFIG.DEBUG_MODE) {
                this.ctx.globalCompositeOperation = 'source-over';
                this.ctx.strokeStyle = 'red';
                this.ctx.lineWidth = 4;
                this.pathCapeCut(true);
            } else {
                this.ctx.globalCompositeOperation = 'destination-out';
                this.pathCapeCut(false);
            }

            this.ctx.restore();

            // 3. Draw Eyes
            this.drawEye(0.45, 0.23); // Left
            this.drawEye(0.55, 0.23); // Right
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

    // Defines the Bezier path to remove the cape
    pathCapeCut(stroke = false) {
        const { x, y, w, h } = this.layout;
        const cx = x + w / 2;
        const neckY = y + (h * 0.22);
        const shoulderW = w * 0.16;

        this.ctx.beginPath();

        // Left Side
        this.ctx.moveTo(x, y);
        this.ctx.lineTo(x, neckY);
        this.ctx.bezierCurveTo(x + w * 0.1, neckY + h * 0.05, cx - shoulderW, neckY + h * 0.05, cx - shoulderW * 0.9, h); // Curve to bottom
        this.ctx.lineTo(x, h);
        this.ctx.lineTo(x, y);

        // Right Side
        this.ctx.moveTo(x + w, y);
        this.ctx.lineTo(x + w, neckY);
        this.ctx.bezierCurveTo(x + w * 0.9, neckY + h * 0.05, cx + shoulderW, neckY + h * 0.05, cx + shoulderW * 0.9, h);
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

        // Sclera
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.shadowBlur = 8; this.ctx.shadowColor = 'rgba(255,255,255,0.6)';
        this.ctx.beginPath(); this.ctx.ellipse(x, y, w / 2, h / 2, 0, 0, Math.PI * 2); this.ctx.fill();

        // Pupil
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

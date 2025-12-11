export class MirrorShadow {
    constructor() {
        this.canvas = document.getElementById('shadowCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.input = document.getElementById('tearInput');
        this.particles = [];

        // Coordinates
        this.eyeLeft = { x: 0, y: 0 };
        this.eyeRight = { x: 0, y: 0 };
        this.chinY = 0;

        this.init();
    }

    init() {
        this.resize();
        window.addEventListener('resize', () => this.resize());

        // Input listener
        this.input.addEventListener('input', (e) => {
            const char = e.data || this.input.value.slice(-1);
            if (char) this.spawnTear(char);
        });

        this.animate();
    }

    resize() {
        this.canvas.width = this.canvas.clientWidth;
        this.canvas.height = this.canvas.clientHeight;

        const w = this.canvas.width;
        const h = this.canvas.height;

        // Big Head Mode (Focus on face)
        this.headCenter = { x: w * 0.5, y: h * 0.35 };
        this.headRadius = w * 0.25; // Much larger head
        this.chinY = this.headCenter.y + this.headRadius * 0.9; // Chin boundary

        // Eyes higher up in the big head
        this.eyeLeft = { x: w * 0.42, y: this.headCenter.y };
        this.eyeRight = { x: w * 0.58, y: this.headCenter.y };
    }

    spawnTear(char) {
        const isLeft = Math.random() > 0.5;
        const eye = isLeft ? this.eyeLeft : this.eyeRight;

        this.particles.push({
            char: char,
            x: eye.x,
            y: eye.y + 15, // Start inside the eye
            initialX: eye.x,
            vx: 0,
            vy: 0.5, // Start slow (viscous)
            opacity: 1,
            size: 24,
            rotation: (Math.random() - 0.5) * 0.2,
            onFace: true // Track state
        });
    }

    drawShadow() {
        const w = this.canvas.width;
        const h = this.canvas.height;
        const ctx = this.ctx;

        // Shadow Silhouette
        ctx.fillStyle = '#111';
        ctx.beginPath();

        // Big Head
        ctx.arc(this.headCenter.x, this.headCenter.y, this.headRadius, 0, Math.PI * 2);

        // Minimal Neck/Shoulders
        const neckWidth = this.headRadius * 0.4;
        ctx.rect(this.headCenter.x - neckWidth / 2, this.headCenter.y + this.headRadius * 0.8, neckWidth, this.headRadius);

        // Shoulders sloping out
        ctx.moveTo(this.headCenter.x - neckWidth / 2, this.headCenter.y + this.headRadius);
        ctx.quadraticCurveTo(w * 0.2, h * 0.8, w * 0.1, h); // Left shoulder
        ctx.lineTo(w * 0.9, h); // Bottom
        ctx.lineTo(w * 0.8, h * 0.8); // Right shoulder start
        ctx.quadraticCurveTo(w * 0.8, h * 0.8, this.headCenter.x + neckWidth / 2, this.headCenter.y + this.headRadius);

        ctx.fill();

        // White Eyes (Larger, more expression)
        ctx.fillStyle = '#f0f0f0';
        const eyeSize = this.headRadius * 0.15;

        ctx.beginPath();
        ctx.arc(this.eyeLeft.x, this.eyeLeft.y, eyeSize, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.arc(this.eyeRight.x, this.eyeRight.y, eyeSize, 0, Math.PI * 2);
        ctx.fill();
    }

    animate() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.drawShadow();

        this.ctx.font = '24px "Courier New"';
        this.ctx.fillStyle = '#FFFFFF';

        for (let i = this.particles.length - 1; i >= 0; i--) {
            let p = this.particles[i];

            // PHYSICS ENGINE
            if (p.y < this.chinY) {
                // == ON FACE (Viscous Fluid) ==
                // Friction keeps it slow
                if (p.vy < 2) p.vy += 0.05;

                // Follow Contour (Wobble)
                // Sine wave based on Y depth to "hug" the cheek
                const cheekContour = Math.sin((p.y - this.eyeLeft.y) * 0.05) * 5;
                p.x = p.initialX + cheekContour;

            } else {
                // == AIR (Free Fall) ==
                // Gravity kicks in hard
                p.vy += 0.5;

                // Drift slightly in air
                p.x += Math.sin(p.y * 0.02) * 0.5;
            }

            p.y += p.vy;
            p.opacity -= 0.003;
            p.rotation += 0.01;

            // Render
            this.ctx.save();
            this.ctx.globalAlpha = p.opacity;
            this.ctx.translate(p.x, p.y);
            this.ctx.rotate(p.rotation);
            this.ctx.shadowColor = "rgba(255, 255, 255, 0.6)";
            this.ctx.shadowBlur = 8;
            this.ctx.fillText(p.char, 0, 0);
            this.ctx.restore();

            if (p.y > this.canvas.height || p.opacity <= 0) {
                this.particles.splice(i, 1);
            }
        }
        requestAnimationFrame(() => this.animate());
    }
}

export function initMirrorShadow() {
    new MirrorShadow();
}

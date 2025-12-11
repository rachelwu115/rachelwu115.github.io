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

        ctx.save();

        // Fuzzy Edge Effect
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#000';
        ctx.fillStyle = '#0a0a0a';

        // Realistic Head Silhouette
        ctx.beginPath();

        // Cranium (Top)
        ctx.arc(this.headCenter.x, this.headCenter.y - 20, this.headRadius, Math.PI, 0);

        // Right Cheek/Jaw
        ctx.bezierCurveTo(
            this.headCenter.x + this.headRadius, this.headCenter.y + 60, // Control point 1 (Cheekbone)
            this.headCenter.x + this.headRadius * 0.8, this.headCenter.y + 120, // Control point 2 (Jaw)
            this.headCenter.x, this.headCenter.y + 160 // Chin
        );

        // Left Cheek/Jaw
        ctx.bezierCurveTo(
            this.headCenter.x - this.headRadius * 0.8, this.headCenter.y + 120, // Jaw
            this.headCenter.x - this.headRadius, this.headCenter.y + 60, // Cheekbone
            this.headCenter.x - this.headRadius, this.headCenter.y - 20 // Back to start
        );

        // Neck
        const neckW = this.headRadius * 0.6;
        const neckY = this.headCenter.y + 140;
        ctx.moveTo(this.headCenter.x - neckW / 2, neckY);
        ctx.quadraticCurveTo(this.headCenter.x - neckW, h, 0, h); // Left shoulder slope
        ctx.lineTo(w, h);
        ctx.quadraticCurveTo(this.headCenter.x + neckW, h, this.headCenter.x + neckW / 2, neckY); // Right shoulder slope

        ctx.fill();
        ctx.restore(); // Reset shadow blur for effectiveness

        // Eyes (Soft Glow)
        ctx.save();
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#fff';
        ctx.fillStyle = '#f0f0f0';

        const eyeSize = 12; // Smaller, more realistic size

        // Left Eye
        ctx.beginPath();
        ctx.ellipse(this.eyeLeft.x, this.eyeLeft.y, eyeSize * 1.2, eyeSize, 0, 0, Math.PI * 2);
        ctx.fill();

        // Right Eye
        ctx.beginPath();
        ctx.ellipse(this.eyeRight.x, this.eyeRight.y, eyeSize * 1.2, eyeSize, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    animate() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.drawShadow();

        this.ctx.font = '20px "Courier New"'; // Smaller text for scale
        this.ctx.fillStyle = '#FFFFFF';

        for (let i = this.particles.length - 1; i >= 0; i--) {
            let p = this.particles[i];

            // PHYSICS ENGINE
            if (p.y < this.chinY && p.onFace) {
                // == ON FACE (Cheek Volume) ==

                // 1. Friction (Viscous flow)
                if (p.vy < 1.5) p.vy += 0.05;

                // 2. Cheek Curve (Volume)
                // If on left side, drift left. If right, drift right. 
                // Simulates flowing over the roundness of a cheek.
                const sideDir = p.initialX < this.headCenter.x ? -1 : 1;
                const cheekBulge = Math.sin((p.y - this.eyeLeft.y) * 0.015) * 0.5;
                p.x += cheekBulge * sideDir;

            } else {
                // == OFF CHIN (Free Fall) ==
                p.onFace = false;
                p.vy += 0.4; // Gravity accelerates
                // Minimal air resistance/drift
                p.x += Math.sin(p.y * 0.05) * 0.2;
            }

            p.y += p.vy;
            p.opacity -= 0.002;
            p.rotation += 0.01;

            // Render
            this.ctx.save();
            this.ctx.globalAlpha = p.opacity;
            this.ctx.translate(p.x, p.y);
            this.ctx.rotate(p.rotation);
            this.ctx.shadowColor = "rgba(255, 255, 255, 0.4)";
            this.ctx.shadowBlur = 4;
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

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

        // SAITAMA PROPORTIONS
        // Perfect Oval Head
        this.headCenter = { x: w * 0.5, y: h * 0.35 };
        this.headRadius = w * 0.22; // Width radius
        this.headH = this.headRadius * 1.3; // Height radius (Egg shape)
        this.chinY = this.headCenter.y + this.headH * 0.9;

        // Bored Eyes (Center of face)
        this.eyeLeft = { x: w * 0.43, y: this.headCenter.y + 10 };
        this.eyeRight = { x: w * 0.57, y: this.headCenter.y + 10 };
    }

    spawnTear(char) {
        const isLeft = Math.random() > 0.5;
        const eye = isLeft ? this.eyeLeft : this.eyeRight;

        this.particles.push({
            char: char,
            x: eye.x,
            y: eye.y + 5,
            initialX: eye.x,
            vx: 0,
            vy: 0.5,
            opacity: 1,
            size: 24,
            rotation: (Math.random() - 0.5) * 0.2,
            onFace: true
        });
    }

    drawShadow() {
        const w = this.canvas.width;
        const h = this.canvas.height;
        const ctx = this.ctx;

        // == SAITAMA SILHOUETTE ==
        ctx.fillStyle = '#111';
        ctx.save();

        // No blur - Clean edges
        ctx.shadowBlur = 0;

        // 1. The Head (Perfect Egg)
        ctx.beginPath();
        ctx.ellipse(this.headCenter.x, this.headCenter.y, this.headRadius, this.headH, 0, 0, Math.PI * 2);
        ctx.fill();

        // 2. Ears (Simple bumps)
        const earY = this.headCenter.y + 20;
        const earSize = 15;
        // Left Ear
        ctx.beginPath();
        ctx.arc(this.headCenter.x - this.headRadius, earY, earSize, 0, Math.PI * 2);
        ctx.fill();
        // Right Ear
        ctx.beginPath();
        ctx.arc(this.headCenter.x + this.headRadius, earY, earSize, 0, Math.PI * 2);
        ctx.fill();

        // 3. Body (Cape/Suit)
        ctx.beginPath();
        const neckW = this.headRadius * 0.7;
        const shoulderY = this.headCenter.y + this.headH * 0.8;
        // Neck
        ctx.moveTo(this.headCenter.x - neckW / 2, shoulderY);
        ctx.lineTo(this.headCenter.x - neckW / 2, shoulderY + 50);
        // Shoulders
        ctx.quadraticCurveTo(w * 0.2, h, 0, h);
        ctx.lineTo(w, h);
        ctx.quadraticCurveTo(w * 0.8, h, this.headCenter.x + neckW / 2, shoulderY + 50);
        ctx.lineTo(this.headCenter.x + neckW / 2, shoulderY);
        ctx.fill();

        // 4. The "Bored" Eyes
        ctx.fillStyle = '#fff';
        const eyeW = 18;
        const eyeH = 12;

        // Left Eye (Oval)
        ctx.beginPath();
        ctx.ellipse(this.eyeLeft.x, this.eyeLeft.y, eyeW, eyeH, 0, 0, Math.PI * 2);
        ctx.fill();
        // Pupil (Dot)
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(this.eyeLeft.x, this.eyeLeft.y, 2, 0, Math.PI * 2);
        ctx.fill();

        // Right Eye (Oval)
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.ellipse(this.eyeRight.x, this.eyeRight.y, eyeW, eyeH, 0, 0, Math.PI * 2);
        ctx.fill();
        // Pupil (Dot)
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(this.eyeRight.x, this.eyeRight.y, 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    animate() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.drawShadow();

        this.ctx.font = '24px "Courier New"';
        this.ctx.fillStyle = '#FFFFFF';

        for (let i = this.particles.length - 1; i >= 0; i--) {
            let p = this.particles[i];

            // PHYSICS
            if (p.y < this.chinY && p.onFace) {
                // Cheek Physics
                if (p.vy < 2) p.vy += 0.05;
                const sideDir = p.initialX < this.headCenter.x ? -1 : 1;
                const cheekContour = Math.sin((p.y - this.eyeLeft.y) * 0.03) * 3;
                p.x += cheekContour * sideDir;
            } else {
                // Free Fall
                p.onFace = false;
                p.vy += 0.5;
            }

            p.y += p.vy;
            p.opacity -= 0.003;
            p.rotation += 0.01;

            this.ctx.save();
            this.ctx.globalAlpha = p.opacity;
            this.ctx.translate(p.x, p.y);
            this.ctx.rotate(p.rotation);
            // Saitama tears are simple
            this.ctx.shadowBlur = 0;
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

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

        const cx = this.headCenter.x;
        const cy = this.headCenter.y;
        const r = this.headRadius;

        // == SAITAMA SILHOUETTE (Organic) ==
        ctx.fillStyle = '#111';
        ctx.save();
        ctx.shadowBlur = 0;

        ctx.beginPath();

        // 1. The Jawline (Sharp & Defined)
        // Start at left temple
        ctx.moveTo(cx - r, cy);
        // Curve down to left jaw corner
        ctx.bezierCurveTo(cx - r, cy + r * 0.8, cx - r * 0.8, cy + r * 1.2, cx - r * 0.5, cy + r * 1.4);
        // Line to Chin (Sharp point)
        ctx.lineTo(cx, cy + r * 1.6);
        // Line up to right jaw corner
        ctx.lineTo(cx + r * 0.5, cy + r * 1.4);
        // Curve up to right temple
        ctx.bezierCurveTo(cx + r * 0.8, cy + r * 1.2, cx + r, cy + r * 0.8, cx + r, cy);

        // 2. The Cranium (Smooth but not circle)
        // Top of head - slightly flatter than a circle
        ctx.bezierCurveTo(cx + r, cy - r * 1.2, cx - r, cy - r * 1.2, cx - r, cy);

        ctx.fill();

        // 3. Ears (Detailed Silhouette)
        const earY = cy + 10;
        const earW = 20;
        const earH = 30;

        // Left Ear
        ctx.beginPath();
        ctx.moveTo(cx - r, earY - 10);
        ctx.bezierCurveTo(cx - r - earW, earY - 20, cx - r - earW, earY + earH, cx - r * 0.9, earY + earH);
        ctx.fill();

        // Right Ear
        ctx.beginPath();
        ctx.moveTo(cx + r, earY - 10);
        ctx.bezierCurveTo(cx + r + earW, earY - 20, cx + r + earW, earY + earH, cx + r * 0.9, earY + earH);
        ctx.fill();

        // 4. Hoodie / Cape Collar (Organic cloth folds)
        ctx.beginPath();
        const neckW = r * 0.8;
        const neckStart = cy + r * 1.5;

        // Neck base
        ctx.moveTo(cx - neckW / 2, neckStart);

        // Left Collar/Shoulder
        ctx.bezierCurveTo(cx - r * 1.5, neckStart + 20, cx - r * 2, h * 0.8, cx - r * 3, h);
        ctx.lineTo(w, h); // Bottom

        // Right Collar/Shoulder
        ctx.lineTo(cx + r * 3, h);
        ctx.bezierCurveTo(cx + r * 2, h * 0.8, cx + r * 1.5, neckStart + 20, cx + neckW / 2, neckStart);

        ctx.fill();

        // 5. The "Bored" Eyes (Adjusted for new head)
        ctx.fillStyle = '#fff';
        const eyeW = 18;
        const eyeH = 12;

        // Left Eye
        ctx.beginPath();
        ctx.ellipse(this.eyeLeft.x, this.eyeLeft.y, eyeW, eyeH, 0, 0, Math.PI * 2);
        ctx.fill();
        // Pupil
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(this.eyeLeft.x, this.eyeLeft.y, 2, 0, Math.PI * 2);
        ctx.fill();

        // Right Eye
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.ellipse(this.eyeRight.x, this.eyeRight.y, eyeW, eyeH, 0, 0, Math.PI * 2);
        ctx.fill();
        // Pupil
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

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

    // Helper: Draws a circle with spiky, noisy edges
    drawSpikyHead(ctx, x, y, radius) {
        ctx.beginPath();
        const segments = 60; // How many spikes
        for (let i = 0; i <= segments; i++) {
            const theta = (i / segments) * Math.PI * 2;
            // Random variation for "spike" effect
            const noise = (Math.random() - 0.5) * 10;
            const r = radius + noise;
            const px = x + Math.cos(theta) * r;
            const py = y + Math.sin(theta) * r;

            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
    }

    // Helper: Draws melting drips at the bottom
    drawDrips(ctx, x, y, width) {
        const dripCount = 10;
        const spacing = width / dripCount;

        ctx.beginPath();
        ctx.moveTo(x - width / 2, y);

        for (let i = 0; i <= dripCount; i++) {
            const px = (x - width / 2) + i * spacing;
            // Should this drip be long or short?
            const dripLen = Math.random() * 80 + 20;

            // Curve down to drip tip
            ctx.bezierCurveTo(px, y + dripLen / 2, px + spacing / 2, y + dripLen, px + spacing / 2, y + dripLen);
            // Curve up to next start
            ctx.bezierCurveTo(px + spacing / 2, y + dripLen / 2, px + spacing, y + 20, px + spacing, y);
        }
        ctx.lineTo(x + width / 2, y);
        ctx.fill();

        // Add some detached drops
        for (let j = 0; j < 5; j++) {
            const dropX = (x - width / 2) + Math.random() * width;
            const dropY = y + Math.random() * 120 + 20;
            const size = Math.random() * 4 + 2;
            ctx.beginPath();
            ctx.arc(dropX, dropY, size, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    drawShadow() {
        const w = this.canvas.width;
        const h = this.canvas.height;
        const ctx = this.ctx;

        ctx.save();

        // 1. Spiky Silhouette
        ctx.fillStyle = '#1a1a1a';
        // Add a slight "shake" to the whole body position
        const shakeX = (Math.random() - 0.5) * 2;

        // Draw Head (Spiky)
        this.drawSpikyHead(ctx, this.headCenter.x + shakeX, this.headCenter.y, this.headRadius);

        // Draw Body (Rough Block)
        ctx.beginPath();
        const bodyW = this.headRadius * 1.8;
        const bodyTop = this.headCenter.y + this.headRadius * 0.5;
        const bodyBot = h * 0.85; // Where drips start

        // Shoulders (Spiky/Rough)
        const leftS = this.headCenter.x - bodyW / 2 + shakeX;
        const rightS = this.headCenter.x + bodyW / 2 + shakeX;

        ctx.moveTo(leftS, bodyBot);
        ctx.lineTo(leftS, bodyTop + 20); // Left side
        // Neck/Shoulder connection
        ctx.quadraticCurveTo(this.headCenter.x, bodyTop - 20, rightS, bodyTop + 20);
        ctx.lineTo(rightS, bodyBot); // Right side
        ctx.fill();

        // 2. Melting Drips
        this.drawDrips(ctx, this.headCenter.x + shakeX, bodyBot, bodyW);

        ctx.restore();

        // 3. Glowing Eyes (Intense)
        ctx.save();
        ctx.shadowBlur = 25; // High glow
        ctx.shadowColor = '#fff';
        ctx.fillStyle = '#fff';

        const eyeSize = 14;

        // Left Eye
        ctx.beginPath();
        // Slightly jagged eyes (jitter)
        const ey1 = this.eyeLeft.y + (Math.random() - 0.5) * 2;
        ctx.arc(this.eyeLeft.x, ey1, eyeSize, 0, Math.PI * 2);
        ctx.fill();

        // Right Eye
        const ey2 = this.eyeRight.y + (Math.random() - 0.5) * 2;
        ctx.beginPath();
        ctx.arc(this.eyeRight.x, ey2, eyeSize, 0, Math.PI * 2);
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

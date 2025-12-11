export class MirrorShadow {
    constructor() {
        this.canvas = document.getElementById('shadowCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.input = document.getElementById('tearInput');
        this.particles = [];

        // Eye coordinates (relative to canvas size)
        this.eyeLeft = { x: 0, y: 0 };
        this.eyeRight = { x: 0, y: 0 };

        this.init();
    }

    init() {
        // Resize canvas to match display size
        this.resize();
        window.addEventListener('resize', () => this.resize());

        // Input listener
        this.input.addEventListener('input', (e) => {
            if (e.data) {
                // Spawn tear for last typed character
                this.spawnTear(e.data);
            }
        });

        // Start animation loop
        this.animate();
    }

    resize() {
        this.canvas.width = this.canvas.clientWidth;
        this.canvas.height = this.canvas.clientHeight;

        // Recalculate eye positions based on canvas size
        const w = this.canvas.width;
        const h = this.canvas.height;
        this.eyeLeft = { x: w * 0.45, y: h * 0.4 };
        this.eyeRight = { x: w * 0.55, y: h * 0.4 };
    }

    spawnTear(char) {
        // Randomly choose left or right eye
        const isLeft = Math.random() > 0.5;
        const eye = isLeft ? this.eyeLeft : this.eyeRight;

        this.particles.push({
            char: char,
            x: eye.x,
            y: eye.y + 10, // Start slightly below eye
            vx: (Math.random() - 0.5) * 2, // Slight horizontal drift
            vy: 2 + Math.random() * 2, // Downward speed
            opacity: 1,
            size: 24,
            rotation: (Math.random() - 0.5) * 0.5
        });
    }

    drawShadow() {
        const w = this.canvas.width;
        const h = this.canvas.height;
        const ctx = this.ctx;

        // Shadow Silhouette
        ctx.fillStyle = '#0a0a0a'; // Almost black
        ctx.beginPath();

        // Head
        ctx.arc(w / 2, h * 0.4, w * 0.15, 0, Math.PI * 2);

        // Shoulders/Body (rough shape)
        ctx.moveTo(w * 0.3, h * 1.0);
        ctx.bezierCurveTo(w * 0.3, h * 0.6, w * 0.35, h * 0.5, w / 2, h * 0.5);
        ctx.bezierCurveTo(w * 0.65, h * 0.5, w * 0.7, h * 0.6, w * 0.7, h * 1.0);

        ctx.fill();

        // White Eyes (Hollow, eerie)
        ctx.fillStyle = '#f0f0f0';
        // Left Eye
        ctx.beginPath();
        ctx.arc(this.eyeLeft.x, this.eyeLeft.y, 8, 0, Math.PI * 2);
        ctx.fill();

        // Right Eye
        ctx.beginPath();
        ctx.arc(this.eyeRight.x, this.eyeRight.y, 8, 0, Math.PI * 2);
        ctx.fill();
    }

    animate() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw the static shadow figure
        this.drawShadow();

        // Update and draw particles (tears)
        this.ctx.font = '24px "Courier New"';
        this.ctx.fillStyle = '#000'; // Black letters

        for (let i = this.particles.length - 1; i >= 0; i--) {
            let p = this.particles[i];

            // Physics
            p.y += p.vy;
            p.x += p.vx;
            p.vy += 0.2; // Gravity
            p.opacity -= 0.005; // Slow fade
            p.rotation += 0.02;

            // Draw
            this.ctx.save();
            this.ctx.globalAlpha = p.opacity;
            this.ctx.translate(p.x, p.y);
            this.ctx.rotate(p.rotation);
            this.ctx.fillText(p.char, 0, 0);
            this.ctx.restore();

            // Remove dead particles
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

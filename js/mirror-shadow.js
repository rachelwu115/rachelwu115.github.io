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
        // Input listener - Changed to keydown/input combo or just smarter input handling
        this.input.addEventListener('input', (e) => {
            // Get the last character of the value if e.data is missing (e.g. mobile/autocomplete)
            const char = e.data || this.input.value.slice(-1);
            if (char) {
                this.spawnTear(char);
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
            y: eye.y + 10,
            initialX: eye.x, // Store origin for sine wave calculation
            vy: 0.5, // Start very slow
            time: 0, // Track time for wave
            opacity: 1,
            size: 24,
            rotation: (Math.random() - 0.5) * 0.2
        });
    }

    // ... drawShadow() remains the same ...

    animate() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw the static shadow figure
        this.drawShadow();

        // Update and draw particles (tears)
        this.ctx.font = '24px "Courier New"';
        this.ctx.fillStyle = '#FFFFFF'; // Bright White Tears

        for (let i = this.particles.length - 1; i >= 0; i--) {
            let p = this.particles[i];

            // Physics - Liquid Motion
            p.time += 0.05;
            p.vy += 0.05; // Very low gravity
            p.y += p.vy;

            // Wavy path (sine wave based on time)
            // Oscillate slightly left/right as it falls
            p.x = p.initialX + Math.sin(p.time * 2) * 5;

            p.opacity -= 0.002; // Very slow fade
            p.rotation += 0.005;

            // Draw
            this.ctx.save();
            this.ctx.globalAlpha = p.opacity;
            this.ctx.translate(p.x, p.y);
            this.ctx.rotate(p.rotation);
            this.ctx.shadowColor = "rgba(255, 255, 255, 0.5)";
            this.ctx.shadowBlur = 5; // Add glow for visibility
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

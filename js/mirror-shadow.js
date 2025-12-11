export class MirrorShadow {
    constructor() {
        this.canvas = document.getElementById('shadowCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.input = document.getElementById('tearInput');
        this.particles = [];

        this.eyeLeft = { x: 0, y: 0 };
        this.eyeRight = { x: 0, y: 0 };
        this.chinY = 0;

        // Image Asset
        this.shadowImg = new Image();
        this.shadowImg.src = 'images/shadow-ref.jpg';
        this.shadowImg.onload = () => {
            this.init();
        };
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

        // Image sizing to fit canvas
        // Aspect ratio of image (Square-ish based on typically user uploads, but we'll contain it)
        const scale = Math.min(
            (this.canvas.width * 0.8) / this.shadowImg.width,
            (this.canvas.height * 0.8) / this.shadowImg.height
        );

        this.imgW = this.shadowImg.width * scale;
        this.imgH = this.shadowImg.height * scale;
        this.imgX = (this.canvas.width - this.imgW) / 2;
        this.imgY = (this.canvas.height - this.imgH) / 2;

        // Map Eyes relative to Image
        // Based on reference: Eyes are roughly at 44% and 56% width, 28% height of the image
        this.eyeLeft = {
            x: this.imgX + this.imgW * 0.44,
            y: this.imgY + this.imgH * 0.28
        };
        this.eyeRight = {
            x: this.imgX + this.imgW * 0.56,
            y: this.imgY + this.imgH * 0.28
        };
        this.chinY = this.imgY + this.imgH * 0.45; // Chin approx location
    }

    spawnTear(char) {
        const isLeft = Math.random() > 0.5;
        const eye = isLeft ? this.eyeLeft : this.eyeRight;

        this.particles.push({
            char: char,
            x: eye.x,
            y: eye.y,
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
        if (!this.shadowImg.complete) return;

        this.ctx.save();
        // Optional: Add a slight pulsate/breathe effect to the image
        const breathe = Math.sin(Date.now() * 0.002) * 2;
        this.ctx.drawImage(
            this.shadowImg,
            this.imgX - breathe,
            this.imgY - breathe,
            this.imgW + breathe * 2,
            this.imgH + breathe * 2
        );
        this.ctx.restore();
    }

    animate() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.drawShadow();

        this.ctx.font = '24px "Courier New"'; // Keeping text readable
        this.ctx.fillStyle = '#FFFFFF';

        for (let i = this.particles.length - 1; i >= 0; i--) {
            let p = this.particles[i];

            // PHYSICS ENGINE
            if (p.y < this.chinY && p.onFace) {
                // Cheek Physics (Wobble)
                if (p.vy < 2) p.vy += 0.05;
                const sideDir = p.initialX < (this.imgX + this.imgW / 2) ? -1 : 1;
                const cheekContour = Math.sin((p.y - this.eyeLeft.y) * 0.03) * 3;
                p.x += cheekContour * sideDir;
            } else {
                // Free Fall
                p.onFace = false;
                p.vy += 0.5;
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
            this.ctx.shadowColor = "rgba(255, 255, 255, 0.5)";
            this.ctx.shadowBlur = 5;
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

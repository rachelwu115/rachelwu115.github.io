import { APP_CONFIG } from '../config.js';
import { audioManager } from '../utils/AudioManager.js';

export class Mirror {
    constructor() {
        this.canvas = document.getElementById('shadowCanvas');
        this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
        this.input = document.getElementById('tearInput');
        this.ghostContainer = document.getElementById('ghostContainer');
        this.placeholder = document.getElementById('ghostPlaceholder');

        this.img = null;
        this.cursor = null; // Custom Cursor EL
        this.particles = [];
        this.layout = { x: 0, y: 0, w: 0, h: 0, s: 1 };

        // Glitch/Shake State
        this.shake = { x: 0, y: 0, intensity: 1.5 };

        this.init();
    }

    async init() {
        // Init Custom Cursor (UI First)
        if (this.ghostContainer) {
            this.cursor = document.createElement('span');
            this.cursor.className = 'ghost-cursor';
            this.ghostContainer.appendChild(this.cursor);
        }
        this.bind();

        // Resize initial layout
        this.resize();

        try {
            // Load the pre-processed silhouette
            this.img = await this.loadImage(APP_CONFIG.IMAGE_URL);

            // Render immediately
            this.resize();
            this.startLoop();

            if (this.input) this.input.value = "";

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

    bind() {
        window.addEventListener('resize', () => this.resize());

        // --- TEXT INPUT HANDLING ---
        if (this.input) {
            // 1. Auto-Focus on Init (Immediate Typing)
            setTimeout(() => {
                if (this.input.offsetParent !== null) this.input.focus();
            }, 100);

            // 2. Keep Focus (Immersion)
            // If user clicks background, re-focus input so they don't lose typing state
            document.addEventListener('click', (e) => {
                // Don't steal focus from navigation or links
                const isInteractive = e.target.closest('a, button, .nav-arrow');
                if (!isInteractive && this.input.offsetParent !== null) {
                    this.input.focus();
                }
            });

            this.input.addEventListener('input', (e) => {
                const char = e.data || this.input.value.slice(-1);

                if (char) {
                    this.spawnTear(char);
                    this.spawnGhost(char);

                    // Hide placeholder immediately
                    if (this.placeholder) {
                        this.placeholder.classList.add('placeholder-hidden');
                    }
                }

                // Clear input
                setTimeout(() => {
                    this.input.value = "";
                }, 0);
            });

            // Force focus on click of the dialog box itself (UX)
            const dialog = document.querySelector('.dialog-box');
            if (dialog) {
                dialog.addEventListener('click', () => this.input.focus());
            }
        }
    }

    spawnGhost(char) {
        if (!this.ghostContainer) return;

        const span = document.createElement('span');
        span.textContent = char;
        span.className = 'ghost-char';

        // Insert BEFORE the cursor (so cursor is always last)
        if (this.cursor && this.cursor.parentNode === this.ghostContainer) {
            this.ghostContainer.insertBefore(span, this.cursor);
        } else {
            this.ghostContainer.appendChild(span);
        }

        // Remove after animation
        setTimeout(() => {
            if (span.parentNode) span.parentNode.removeChild(span);

            // Check if (children.length === 1) -> Only Cursor remains
            if (this.ghostContainer.children.length <= 1 && this.placeholder) {
                this.placeholder.classList.remove('placeholder-hidden');
            }
        }, 850);
    }

    resize() {
        if (!this.canvas) return;
        this.canvas.width = this.canvas.clientWidth;
        this.canvas.height = this.canvas.clientHeight;

        if (!this.img) return;

        const rawScale = this.canvas.width / this.img.width;
        const scale = rawScale * APP_CONFIG.VIEWPORT.ZOOM;

        this.layout = {
            s: scale,
            w: this.img.width * scale,
            h: this.img.height * scale,
            x: ((this.canvas.width - (this.img.width * scale)) / 2) + (this.canvas.width * APP_CONFIG.VIEWPORT.OFFSET_X),
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

        audioManager.playNextNote();
    }

    update() {
        // Update Tears
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
        if (!this.ctx) return;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw Shadowman (Clean, no effects)
        if (this.img) {
            this.ctx.drawImage(this.img, this.layout.x, this.layout.y, this.layout.w, this.layout.h);

            // Draw Eyes (Overlay)
            const { LEFT, RIGHT } = APP_CONFIG.EYES;
            this.drawEye(LEFT.x, LEFT.y);
            this.drawEye(RIGHT.x, RIGHT.y);
        }

        // Draw Tears
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

    drawEye(rx, ry) {
        const x = this.layout.x + (rx * this.layout.w);
        const y = this.layout.y + (ry * this.layout.h);
        const w = this.layout.w * APP_CONFIG.EYES.WIDTH;
        const h = this.layout.h * APP_CONFIG.EYES.HEIGHT;

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

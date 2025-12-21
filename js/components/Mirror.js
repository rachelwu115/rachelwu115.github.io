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

        // Ensure Audio starts fresh (Index 0)
        audioManager.resetMelody();

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

            // REVEAL: Layout is now fully stable (Image loaded + Resized)
            const frame = document.querySelector('.art-frame');
            if (frame) frame.classList.add('layout-stabilized');

        } catch (err) {
            console.error("Mirror Init Failed:", err);
            if (this.input) this.input.value = "ERR: Asset Load Failed";

            // Force reveal even on error so user sees the message
            const frame = document.querySelector('.art-frame');
            if (frame) frame.classList.add('layout-stabilized');
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
        // Initial Resize
        this.resize();

        // RESIZE OBSERVER: Actively watch frame size changes (Robust Scaling)
        const frame = document.querySelector('.art-frame');
        if (frame) {
            this.resizeObserver = new ResizeObserver(() => {
                this.resize();
                // Force immediate draw to prevent "lag" visual
                if (this.img) this.draw();
            });
            this.resizeObserver.observe(frame);
        }

        // Standard Resize Listener (Backup)
        window.addEventListener('resize', () => this.resize());

        // --- TEXT INPUT HANDLING ---
        if (this.input) {
            // 0. Robust Mobile Scroll Logic (VisualViewport API)
            // Monitors when the keyboard actually shrinks the screen
            if (window.visualViewport) {
                window.visualViewport.addEventListener('resize', () => {
                    // If we are focused and height is small (keyboard likely open), scroll to center
                    if (document.activeElement === this.input) {
                        // Small delay to let CSS layout (max-height) stabilize
                        setTimeout(() => {
                            this.input.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }, 100);
                    }
                });
            }

            // Fallback for older browsers or initial focus
            this.input.addEventListener('focus', () => {
                setTimeout(() => {
                    this.input.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 500); // Increased delay for first-time safety
            });

            // 0b. Reset Layout on Keyboard Dismiss (Blur)
            this.input.addEventListener('blur', () => {
                // If keyboard is gone (viewport large), reset scroll to top
                setTimeout(() => {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }, 200);
            });

            // Force focus on click of the dialog box itself (UX)
            const dialog = document.querySelector('.dialog-box');
            if (dialog) {
                dialog.addEventListener('click', () => this.input.focus());
            }

            // --- NAVIGATION AUTO-FOCUS & RESIZE FORCE ---
            // Ensure layout and inputs are ready immediately upon transition
            window.addEventListener('exhibit-changed', (e) => {
                if (e.detail.id === 1) {
                    // Force resize immediately to catch dimension changes while hidden
                    // Use timeout to ensure DOM 'display: block' has applied and layout is measurable
                    setTimeout(() => {
                        this.resize();
                        if (this.input) this.input.focus();
                    }, 0);
                }
            });

            // --- INPUT HANDLING ---
            // Use bound method for clarity and potential removability
            this.input.addEventListener('input', (e) => this.handleInput(e));
        }
    }

    /**
     * Handles text input events with filtering for IME and rapid-fire glitches.
     * Ensures strict 1-to-1 mapping between user strokes and melody notes.
     */
    handleInput(e) {
        // 1. FILTER: Ignore IME Composition events (e.g. Mobile/CJK unfinished inputs)
        // This is the #1 cause of "double notes" (CompositionUpdate + Input)
        if (e.isComposing) return;

        // 2. FILTER: Ignore Deletions (Backspace shouldn't advance melody)
        if (e.inputType && e.inputType.includes('delete')) return;

        // 3. THROTTLE: Safety net for hardware bounce / rapid-fire anomalies
        const now = Date.now();
        if (this.lastInputTime && (now - this.lastInputTime < 50)) {
            return;
        }
        this.lastInputTime = now;

        // 4. PROCESS CONTENT
        // Use e.data for inserted text, fallback to value slice for robustness
        const char = e.data || this.input.value.slice(-1);

        if (char) {
            this.spawnTear(char);
            this.spawnGhost(char);

            // Play Logic: One Note per Valid Character
            audioManager.playNextNote();

            // Hide placeholder
            if (this.placeholder) {
                this.placeholder.classList.add('placeholder-hidden');
            }
        }

        // 5. CLEANUP: Clear input to keep "Ghost Typing" illusion
        // We delay slightly to strictly respect the browser's event loop
        setTimeout(() => {
            if (this.input) this.input.value = "";
        }, 0);
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

        // DPI Scaling for Crisp Rendering on Mobile
        const dpr = window.devicePixelRatio || 1;
        const rect = this.canvas.getBoundingClientRect();

        // Store for Polling Check
        this.lastClientWidth = this.canvas.clientWidth;
        this.lastClientHeight = this.canvas.clientHeight;

        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;

        // Is this needed? Canvas auto-scales context if size is set.
        // Wait, context is '2d'. 
        // We usually need ctx.scale(dpr, dpr) OR just draw bigger.
        // Our 'update' logic uses pixels.
        // If we increase canvas size, we must scale our drawing logic OR the context.
        this.ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset
        this.ctx.scale(dpr, dpr);

        if (!this.img) return;

        const rawScale = rect.width / this.img.width; // Use CSS width (rect) for logic
        const scale = rawScale * APP_CONFIG.VIEWPORT.ZOOM;

        // Logic Layout uses CSS coordinates (virtual pixels)
        this.layout = {
            s: scale,
            w: this.img.width * scale,
            h: this.img.height * scale,
            x: ((rect.width - (this.img.width * scale)) / 2) + (rect.width * APP_CONFIG.VIEWPORT.OFFSET_X),
            y: rect.height * APP_CONFIG.VIEWPORT.TOP_OFFSET
        };

        // --- UNIFIED SCALING BROADCAST ---
        // Set CSS Variable to match actual rendered width (Logical Pixels)
        // This allows CSS 'calc()' to sync Label/Dialog sizes exactly with the frame
        // GUARD: Only update if width > 0 to prevent collapse when hidden (display: none)
        if (rect.width > 0) {
            document.documentElement.style.setProperty('--current-frame-width', `${rect.width}px`);
        } else {
            // Hidden (Display None): Remove inline style so CSS fallback takes over (Responsive)
            document.documentElement.style.removeProperty('--current-frame-width');
        }
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

        // Audio already played in handleInput
    }

    update() {
        // ROBUST RESIZE POLLING:
        // Check if CSS has changed the canvas size significantly
        // This guarantees layout sync even if events/observers miss
        if (this.canvas && this.canvas.clientWidth) {
            if (this.canvas.clientWidth !== this.lastClientWidth || this.canvas.clientHeight !== this.lastClientHeight) {
                this.resize();
            }
        }

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

        // CLIPPING: Hide Shadowman body below the Dialog Box
        // Use strict percentage based on CSS Layout (Box bottom is at ~90%)
        // We clip at 85% to be safe and hide the cut behind the box

        // FIX: Must use LOGICAL pixels because ctx is already scaled by DPR
        const dpr = window.devicePixelRatio || 1;
        const logicalHeight = this.canvas.height / dpr;
        const logicalWidth = this.canvas.width / dpr;

        const clipHeight = logicalHeight * 0.85;

        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.rect(0, 0, logicalWidth, clipHeight);
        this.ctx.clip();

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
            this.ctx.restore(); // Close Eye Context (if any left open, but drawEye handles itself)
        });

        // Restore Main Clipping Context
        this.ctx.restore();
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

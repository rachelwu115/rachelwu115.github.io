/**
 * MIRROR SYSTEM APPLICATION
 * 
 * Architecture:
 * - Single-file module for guaranteed loading reliability.
 * - Separation of Concerns: Config / Components / Main Loop.
 * - "Flood Fill" Keying: Advanced background removal.
 * - "Ghost Text": Vanishing UI for input.
 * 
 * @author Antigravity (Principal Engineer Mode)
 * @version 12.0 (Custom Cursor)
 */

const APP_CONFIG = {
    // -------------------------------------------------------------------------
    // ASSETS
    // -------------------------------------------------------------------------
    IMAGE_URL: 'images/saitama-no-cape.png',

    // -------------------------------------------------------------------------
    // VISUAL TUNING
    // -------------------------------------------------------------------------
    CHROMA_TOLERANCE: 40,

    // -------------------------------------------------------------------------
    // LAYOUT & FRAMING
    // -------------------------------------------------------------------------
    VIEWPORT: {
        ZOOM: 3.5,
        TOP_OFFSET: 0.0,
        OFFSET_X: 0.03, // Centering correction
    },

    // -------------------------------------------------------------------------
    // PHYSICS
    // -------------------------------------------------------------------------
    PHYSICS: {
        GRAVITY: { Face: 0.05, Air: 0.5 },
        WOBBLE: { Speed: 0.03, Amp: 3 },
        BOUNDARY_Y: 0.35,
    },

    EYES: {
        LEFT: { x: 0.46, y: 0.24 },
        RIGHT: { x: 0.53, y: 0.24 },
        WIDTH: 0.045,
        HEIGHT: 0.025,
    }
};

/**
 * COMPONENT: Magnetic Interaction
 */
class MagneticButton {
    constructor(wrapperParams) {
        this.area = document.querySelector(wrapperParams.area);
        this.btn = document.querySelector(wrapperParams.button);
        if (!this.area || !this.btn) return;
        this.init();
    }

    init() {
        this.area.addEventListener('mousemove', (e) => this.move(e));
        this.area.addEventListener('mouseleave', () => this.reset());
    }

    move(e) {
        const rect = this.area.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        this.btn.style.transform = `translate(${x * 0.5}px, ${y * 0.5}px)`;
        this.area.style.transform = `translate(${x * 0.2}px, ${y * 0.2}px)`;
    }

    reset() {
        this.btn.style.transform = 'translate(0px, 0px)';
        this.area.style.transform = 'translate(0px, 0px)';
    }
}

/**
 * COMPONENT: The Mirror
 */
class Mirror {
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

        this.init();
    }

    async init() {
        try {
            const raw = await this.loadImage(APP_CONFIG.IMAGE_URL);
            this.img = await this.processImage(raw);

            // Init Custom Cursor
            if (this.ghostContainer) {
                this.cursor = document.createElement('span');
                this.cursor.className = 'ghost-cursor';
                this.ghostContainer.appendChild(this.cursor);
            }

            this.bind();
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

    processImage(source) {
        return new Promise(resolve => {
            const buffer = document.createElement('canvas');
            const w = source.width;
            const h = source.height;
            buffer.width = w;
            buffer.height = h;

            const ctx = buffer.getContext('2d');
            ctx.drawImage(source, 0, 0);

            const idata = ctx.getImageData(0, 0, w, h);
            const data = idata.data;
            const bg = { r: data[0], g: data[1], b: data[2] };
            const visited = new Uint8Array(w * h);
            const stack = [0];
            visited[0] = 1;

            const match = (idx) => {
                const r = data[idx], g = data[idx + 1], b = data[idx + 2];
                const diff = Math.abs(r - bg.r) + Math.abs(g - bg.g) + Math.abs(b - bg.b);
                return diff < APP_CONFIG.CHROMA_TOLERANCE;
            };

            while (stack.length > 0) {
                const idx4 = stack.pop();
                const idx = idx4 / 4;
                const x = idx % w;
                const y = Math.floor(idx / w);

                const neighbors = [
                    { nx: x, ny: y - 1 }, { nx: x, ny: y + 1 },
                    { nx: x - 1, ny: y }, { nx: x + 1, ny: y }
                ];

                for (const { nx, ny } of neighbors) {
                    if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
                        const nIdx = ny * w + nx;
                        if (visited[nIdx] === 0) {
                            const nIdx4 = nIdx * 4;
                            if (match(nIdx4)) {
                                visited[nIdx] = 1;
                                stack.push(nIdx4);
                            }
                        }
                    }
                }
            }

            for (let i = 0; i < w * h; i++) {
                const idx = i * 4;
                if (visited[i] === 1) {
                    data[idx + 3] = 0;
                } else {
                    data[idx] = 0; data[idx + 1] = 0; data[idx + 2] = 0; data[idx + 3] = 255;
                }
            }

            ctx.putImageData(idata, 0, 0);
            const final = new Image();
            final.onload = () => resolve(final);
            final.src = buffer.toDataURL();
        });
    }

    bind() {
        window.addEventListener('resize', () => this.resize());

        // --- TEXT INPUT HANDLING ---
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

        // Restore placeholder if blurred and empty?
        // Actually, since ghost content fades, we rely on ghost count.
    }

    /**
     * SPAWN GHOST
     */
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

        // Remove after animation (0.8s)
        setTimeout(() => {
            if (span.parentNode) span.parentNode.removeChild(span);

            // Check if (children.length === 1) -> Only Cursor remains
            if (this.ghostContainer.children.length <= 1 && this.placeholder) {
                this.placeholder.classList.remove('placeholder-hidden');
            }
        }, 850);
    }

    resize() {
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
    }

    update() {
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
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        if (this.img) {
            this.ctx.save();
            this.ctx.drawImage(this.img, this.layout.x, this.layout.y, this.layout.w, this.layout.h);
            this.ctx.restore();

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

/**
 * COMPONENT: Gallery Navigation
 */
class GalleryNav {
    constructor() {
        this.nextBtn = document.getElementById('navNext');
        this.prevBtn = document.getElementById('navPrev');
        this.exhibits = {
            1: document.getElementById('exhibit-1'),
            2: document.getElementById('exhibit-2')
        };
        this.currentExhibit = 1;
        this.init();
    }

    init() {
        if (this.nextBtn) this.nextBtn.addEventListener('click', () => this.switchExhibit(2));
        if (this.prevBtn) this.prevBtn.addEventListener('click', () => this.switchExhibit(1));
    }

    switchExhibit(id) {
        // Hide all
        Object.values(this.exhibits).forEach(el => el.classList.remove('active'));

        // Show Target
        const target = this.exhibits[id];
        if (target) {
            target.classList.add('active');
            this.currentExhibit = id;

            // Nav State
            if (id === 1) {
                if (this.nextBtn) this.nextBtn.style.display = 'block';
                if (this.prevBtn) this.prevBtn.style.display = 'none';
            } else if (id === 2) {
                if (this.nextBtn) this.nextBtn.style.display = 'none'; // Only go back
                if (this.prevBtn) this.prevBtn.style.display = 'block';

                // Start Physics
                if (!window.rubberButton) {
                    window.rubberButton = new RubberButton();
                } else {
                    window.rubberButton.start();
                }
            }
        }
    }
}

/**
 * COMPONENT: Glass Case
 */
class GlassCase {
    constructor() {
        this.el = document.getElementById('glassCase');
        this.isOpen = false;
        this.init();
    }

    init() {
        if (!this.el) return;
        this.el.addEventListener('click', () => {
            if (!this.isOpen) {
                this.el.classList.add('open');
                this.isOpen = true;
            }
        });
    }
}

/**
 * COMPONENT: Sticky Rubber Button (True 3D Software Renderer)
 */
class RubberButton {
    constructor() {
        this.canvas = document.getElementById('buttonCanvas');
        if (!this.canvas) return;
        this.ctx = this.canvas.getContext('2d');

        // 3D Config
        this.focalLength = 400;
        this.center = { x: this.canvas.width / 2, y: this.canvas.height / 2 };
        this.rotation = { x: 0.4, y: 0, z: 0 }; // Tilt to show depth

        // Physics Config
        this.stiffness = 0.05;
        this.friction = 0.90;
        this.maxStretch = 400;

        this.points = [];
        this.mesh = []; // Quads: [p1, p2, p3, p4] (indices)

        this.mouse = { x: 0, y: 0 };
        this.dragPoint = null;

        this.initMesh();
        this.bindEvents();
        this.start();
    }

    initMesh() {
        this.canvas.width = 240;
        this.canvas.height = 180;
        this.center = { x: this.canvas.width / 2, y: 100 }; // Lower center

        // Generate a 3D Box/Button shape
        // Let's make a grid on the X/Z plane (flat) that bumps up in Y?
        // Or X/Y plane that bumps in Z?
        // Let's do X/Y plane but with depth (Z thickness).

        const rows = 5;
        const cols = 7;
        const gap = 20;
        const startX = -((cols - 1) * gap) / 2;
        const startY = -((rows - 1) * gap) / 2;

        // 1. Create Surface Points (Top Layer)
        for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
                // bulging center?
                const dx = x - (cols - 1) / 2;
                const dy = y - (rows - 1) / 2;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const bulge = Math.max(0, 15 - dist * 5); // Center is higher

                this.points.push({
                    x: startX + x * gap,
                    y: startY + y * gap,
                    z: -bulge, // Negative Z is closer? Standard is +Z closer. Let's say -Z is "up" in 3D space if we look from top?
                    // Let's use standard: Y down, X right, Z into screen.
                    // So "Up" towards camera is negative Z.
                    ox: startX + x * gap,
                    oy: startY + y * gap,
                    oz: -bulge,
                    vx: 0, vy: 0, vz: 0,
                    pinned: (y === rows - 1 || y === 0 || x === 0 || x === cols - 1) // Pin Edges
                });
            }
        }

        // 2. Define Mesh Faces (Quads)
        for (let y = 0; y < rows - 1; y++) {
            for (let x = 0; x < cols - 1; x++) {
                const i = y * cols + x;
                this.mesh.push([i, i + 1, i + cols + 1, i + cols]);
            }
        }
    }

    // Project 3D point to 2D screen
    project(p) {
        // Simple Rotation Matrix (Around X axis only for now to tilt)
        // y' = y*cos(theta) - z*sin(theta)
        // z' = y*sin(theta) + z*cos(theta)

        const theta = this.rotation.x;
        const sin = Math.sin(theta);
        const cos = Math.cos(theta);

        const ry = p.y * cos - p.z * sin;
        const rz = p.y * sin + p.z * cos;
        const rx = p.x; // No Y-rotation

        // Perspective Projection
        // Offset Z so it's in front of camera
        const depth = 400 + rz;
        const scale = this.focalLength / depth;

        return {
            x: this.center.x + rx * scale,
            y: this.center.y + ry * scale,
            scale: scale,
            depth: depth // For Z-sorting
        };
    }

    bindEvents() {
        const getMouse = (e) => {
            const rect = this.canvas.getBoundingClientRect();
            return { x: e.clientX - rect.left, y: e.clientY - rect.top };
        };

        this.canvas.addEventListener('mousedown', (e) => {
            const m = getMouse(e);

            // Raycast / Hit Test
            // Find closest projected point to mouse
            let closest = null;
            let minDst = 30;

            this.points.forEach(p => {
                const proj = this.project(p);
                const dx = m.x - proj.x;
                const dy = m.y - proj.y;
                const d = Math.sqrt(dx * dx + dy * dy);
                if (d < minDst) {
                    minDst = d;
                    closest = p;
                }
            });

            if (closest) {
                this.dragPoint = closest;
                this.canvas.style.cursor = 'grabbing';
            }
        });

        window.addEventListener('mousemove', (e) => {
            if (this.dragPoint) {
                const m = getMouse(e);

                // Inverse Projection (Approximate)
                // We want to move the point in 3D such that it projects to Mouse X/Y
                // Assuming Z stays roughly same? Or drag in Screen Plane.

                // Simple approach: Unproject assuming current depth
                const proj = this.project(this.dragPoint);
                const scale = proj.scale;

                // Delta movement
                const dx = (m.x - this.center.x) / scale;
                const dy = (m.y - this.center.y) / scale;

                // Apply rotation checking inverse? Too complex.
                // Simplified: Just set raw X/Y. 3D rotation will warp it visually. 
                // We'll set X/Y directly and let the physics engine solve the rest.

                this.dragPoint.x = dx;
                this.dragPoint.y = dy;
                // Add some Z-pull too?
                this.dragPoint.z = this.dragPoint.oz - 50; // Pull it UP (Negative Z)

                // Snap Check
                const d = Math.sqrt(
                    (this.dragPoint.x - this.dragPoint.ox) ** 2 +
                    (this.dragPoint.y - this.dragPoint.oy) ** 2
                );
                if (d > this.maxStretch) {
                    this.dragPoint = null;
                    this.canvas.style.cursor = 'grab';
                }
            }
        });

        window.addEventListener('mouseup', () => {
            this.dragPoint = null;
            this.canvas.style.cursor = 'grab';
        });
    }

    update() {
        this.points.forEach(p => {
            if (p.pinned) return;
            if (p === this.dragPoint) return;

            const dx = p.ox - p.x;
            const dy = p.oy - p.y;
            const dz = p.oz - p.z; // Z Spring

            p.vx += dx * this.stiffness;
            p.vy += dy * this.stiffness;
            p.vz += dz * this.stiffness;

            p.vx *= this.friction;
            p.vy *= this.friction;
            p.vz *= this.friction;

            p.x += p.vx;
            p.y += p.vy;
            p.z += p.vz;
        });
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Pre-calculate projections
        const projected = this.points.map(p => this.project(p));

        // Sort Faces by Depth (Painter's Algorithm)
        // Calculate average depth of each face
        const faces = this.mesh.map(indices => {
            const z = (
                projected[indices[0]].depth +
                projected[indices[1]].depth +
                projected[indices[2]].depth +
                projected[indices[3]].depth
            ) / 4;
            return { indices, z };
        });

        faces.sort((a, b) => b.z - a.z); // Draw furthest first

        // Draw Faces
        this.ctx.lineWidth = 1;
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';

        faces.forEach(face => {
            const [i1, i2, i3, i4] = face.indices;
            const p1 = projected[i1];
            const p2 = projected[i2];
            const p3 = projected[i3];
            const p4 = projected[i4];

            this.ctx.beginPath();
            this.ctx.moveTo(p1.x, p1.y);
            this.ctx.lineTo(p2.x, p2.y);
            this.ctx.lineTo(p3.x, p3.y);
            this.ctx.lineTo(p4.x, p4.y);
            this.ctx.closePath();

            // Dynamic Lighting
            // Calculate Normal (Cross product of edges) - tricky in 2D proj. 
            // Fake it based on Z? 
            // Let's use Color based on Slope/Height?

            // Simple coloring
            this.ctx.fillStyle = '#d32f2f';
            this.ctx.fill();
            this.ctx.stroke();
        });
    }

    start() {
        const loop = () => {
            this.update();
            this.draw();
            requestAnimationFrame(loop);
        };
        loop();
    }
}



// MAIN ENTRY POINT
document.addEventListener('DOMContentLoaded', () => {
    // Determine which exhibit to load based on URL?
    // For now, default is Weeping Shadow.

    new MagneticButton({ area: '.magnetic-area', button: '.magnetic-content' });
    new Mirror();
    new GalleryNav();
    new GlassCase();
});

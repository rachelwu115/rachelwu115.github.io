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
        // 1. UPDATE NAVIGATION & NAV STATE (Do this first so UI is responsive)
        this.currentExhibit = id;

        // Update Arrows
        if (id === 1) {
            if (this.nextBtn) this.nextBtn.style.display = 'block';
            if (this.prevBtn) this.prevBtn.style.display = 'none';
        } else if (id === 2) {
            if (this.nextBtn) this.nextBtn.style.display = 'none';
            if (this.prevBtn) this.prevBtn.style.display = 'block';
        }

        // Hide all exhibits
        Object.values(this.exhibits).forEach(el => {
            if (el) el.classList.remove('active');
        });

        // Show Target CSS Section
        const target = this.exhibits[id];
        if (target) {
            target.classList.add('active');
        }

        // 2. EXHIBIT SPECIFIC LOGIC (3D ENGINE)
        const btnCanvas = document.getElementById('buttonCanvas');

        if (id === 2) {
            if (btnCanvas) btnCanvas.style.display = 'block';

            // Safe Init
            try {
                if (!window.rubberButton) {
                    window.rubberButton = new RubberButton();
                } else {
                    window.rubberButton.start();
                    window.rubberButton.onResize();
                }
            } catch (err) {
                console.error("Three.js Init Failed:", err);
                // Fallback?
            }
        } else {
            if (btnCanvas) btnCanvas.style.display = 'none';
        }
    }
}

import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';

/**
 * COMPONENT: Sticky Rubber Button (Three.js WebGL)
 */
class RubberButton {
    constructor() {
        this.canvas = document.getElementById('buttonCanvas');
        if (!this.canvas) return;

        // Scene
        this.scene = new THREE.Scene();

        // Camera
        const width = window.innerWidth;
        const height = window.innerHeight;
        this.camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
        this.camera.position.set(0, 100, 160);
        this.camera.lookAt(0, 0, 0);

        // Renderer
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            alpha: true,
            antialias: true
        });
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        // Resize Listener
        window.addEventListener('resize', () => this.onResize());

        // LIGHTING SETUP (Studio)

        // 1. Hemisphere Light (Base illumination - prevents black shadows)
        const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6);
        this.scene.add(hemiLight);

        // 2. Key Light (Main Highlight)
        const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
        dirLight.position.set(50, 100, 50);
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.width = 2048;
        dirLight.shadow.mapSize.height = 2048;
        this.scene.add(dirLight);

        // 3. Rim Light (Back highlight for 3D shape)
        const rimLight = new THREE.DirectionalLight(0x4455ff, 1.0);
        rimLight.position.set(-50, 20, -100);
        this.scene.add(rimLight);

        // MATERIALS

        // Red Cap (Glossy Plastic)
        this.rubberMat = new THREE.MeshPhysicalMaterial({
            color: 0xff0000,
            emissive: 0x330000,
            roughness: 0.15,
            metalness: 0.0,
            clearcoat: 1.0,
            clearcoatRoughness: 0.1,
            specularIntensity: 1.0,
        });

        // Black Base (Dark Grey Satin - Lighter to show 3D form)
        const baseMat = new THREE.MeshStandardMaterial({
            color: 0x252525, // Lighter than 0x050505
            roughness: 0.4,
            metalness: 0.5
        });

        // Group
        this.pivot = new THREE.Group();
        this.scene.add(this.pivot);

        // GEOMETRY

        // 1. Base (Casing)
        this.baseGroup = new THREE.Group();
        this.pivot.add(this.baseGroup);

        // Puck Body
        const puckGeo = new THREE.CylinderGeometry(70, 75, 20, 64);
        const puckMesh = new THREE.Mesh(puckGeo, baseMat);
        puckMesh.position.y = -10;
        puckMesh.receiveShadow = true;
        this.baseGroup.add(puckMesh);

        // Bezel (Rounded Edge) - Torus
        const bezelGeo = new THREE.TorusGeometry(68, 6, 16, 100);
        const bezelMesh = new THREE.Mesh(bezelGeo, baseMat);
        bezelMesh.rotation.x = -Math.PI / 2;
        bezelMesh.position.y = 0;
        bezelMesh.receiveShadow = true;
        this.baseGroup.add(bezelMesh);

        // 2. Button Cap (Dome)
        this.buttonGroup = new THREE.Group();
        this.pivot.add(this.buttonGroup);

        // Dome: Hemisphere scaled vertically
        const domeGeo = new THREE.SphereGeometry(66, 64, 32, 0, Math.PI * 2, 0, Math.PI / 2);
        this.mesh = new THREE.Mesh(domeGeo, this.rubberMat);
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = true;

        // Transform: TALLER (0.7 scale instead of 0.4)
        this.mesh.scale.set(1, 0.7, 1);
        this.mesh.position.y = 0;

        this.buttonGroup.add(this.mesh);

        // Shadow Plane
        const planeGeo = new THREE.PlaneGeometry(500, 500);
        const planeMat = new THREE.ShadowMaterial({ opacity: 0.3, color: 0x000000 });
        const plane = new THREE.Mesh(planeGeo, planeMat);
        plane.rotation.x = -Math.PI / 2;
        plane.position.y = -20;
        this.pivot.add(plane);

        // State
        this.isPressed = false;
        this.currentY = 0;
        this.targetY = 0;

        // Interaction
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        // Audio
        this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        this.playTone = (freq, type, duration, vol = 0.5) => {
            if (this.audioCtx.state === 'suspended') this.audioCtx.resume();
            const osc = this.audioCtx.createOscillator();
            const gain = this.audioCtx.createGain();
            osc.type = type;
            osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);

            gain.gain.setValueAtTime(vol, this.audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + duration);

            osc.connect(gain);
            gain.connect(this.audioCtx.destination);
            osc.start();
            osc.stop(this.audioCtx.currentTime + duration);
        };

        this.bindEvents();
        this.start();
    }

    onResize() {
        if (!this.camera || !this.renderer) return;
        const width = window.innerWidth;
        const height = window.innerHeight;
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }

    bindEvents() {
        const onDown = (e) => {
            // Raycast check
            const rect = this.canvas.getBoundingClientRect();
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;

            const x = ((clientX - rect.left) / rect.width) * 2 - 1;
            const y = -((clientY - rect.top) / rect.height) * 2 + 1;

            this.raycaster.setFromCamera({ x, y }, this.camera);
            const intersects = this.raycaster.intersectObject(this.mesh);

            if (intersects.length > 0) {
                this.isPressed = true;
                this.targetY = -8; // Press down amount
                // Click Sound
                this.playTone(600, 'square', 0.1, 0.3);
                this.canvas.style.cursor = 'grabbing';
            }
        };

        const onUp = () => {
            if (this.isPressed) {
                this.isPressed = false;
                this.targetY = 0; // Return to origin
                // Release Sound (Clack)
                this.playTone(400, 'sawtooth', 0.15, 0.3);
                this.canvas.style.cursor = 'pointer';
            }
        };

        this.canvas.addEventListener('mousedown', onDown);
        window.addEventListener('mouseup', onUp);

        this.canvas.addEventListener('touchstart', onDown, { passive: false });
        window.addEventListener('touchend', onUp);
    }

    start() {
        const animate = () => {
            requestAnimationFrame(animate);

            // Simple Spring Physics for Button vertical movement
            // Lerp currentY to targetY
            const speed = 0.4;
            this.currentY += (this.targetY - this.currentY) * speed;

            this.buttonGroup.position.y = this.currentY;

            this.renderer.render(this.scene, this.camera);
        };
        animate();
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

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
        // 1. UPDATE NAVIGATION & NAV STATE
        this.currentExhibit = id;

        // BACKGROUND COLOR: Managed by CSS (Sage Green per User Request)
        document.body.style.background = '';

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
        // Canvas visibility is now handled by the #exhibit-2 section wrap

        if (id === 2) {
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
            }
        }
    }
}

import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';

/**
 * COMPONENT: Sticky Rubber Button (Three.js WebGL)
 * 
 * A soft-body physics simulation using vertex displacement.
 * Features:
 * - Gooey/Sticky Interaction (Mouse Drag).
 * - Soft-body deformation (Gaussian Weights).
 * - "Alive" States: Heartbeat, Shiver, Drip.
 * - Confetti Explosion Finale.
 */
class RubberButton {
    constructor() {
        this.canvas = document.getElementById('buttonCanvas');
        if (!this.canvas) return;

        // Configuration
        this.config = {
            snapLimit: 90.0, // Increased Drag Limit (User Request)
            softness: 80.0,  // Gaussian Blob Width
            gravity: 0.15,   // Floatier Confetti
            beatRate: 1200,  // Heartbeat ms
        };

        // State
        this.state = {
            isDragging: false,
            isReturning: false,
            isExploded: false,
            isDripping: false, // Drips functionality removed, but keeping for consistency if re-added
            beatPhase: 0,
        };

        // Physics Vectors
        this.physics = {
            dragOffset: new THREE.Vector3(),
            grabPoint: new THREE.Vector3(),
            localGrabPoint: new THREE.Vector3(),
            returnVelocity: new THREE.Vector3(),
            pressY: 0,
            targetPressY: 0,
            drips: [] // Drips functionality removed, but keeping for consistency if re-added
        };

        // Systems
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.mesh = null;
        this.particles = []; // For confetti

        this.init();
    }

    /**
     * Initializes all components of the RubberButton.
     */
    init() {
        this.initScene();
        this.initLighting();
        this.initGeometry();
        this.initConfetti();
        this.initAudio();
        this.bindEvents();
        this.startLoop();
    }

    /**
     * Sets up the Three.js scene, camera, and renderer.
     */
    initScene() {
        this.scene = new THREE.Scene();
        // Background: Transparent (Alpha) to show CSS Body Color
        this.scene.background = null;

        const w = window.innerWidth;
        const h = window.innerHeight;
        // FOV 18: Telephoto
        this.camera = new THREE.PerspectiveCamera(18, w / h, 0.1, 4000);

        // VIEW ANGLE: High Angle (Isometric-like) to show Top & Front
        this.camera.position.set(0, 400, 1600);
        this.camera.lookAt(0, -50, 0);

        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            alpha: true,
            antialias: true
        });
        this.renderer.setSize(w, h);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        window.addEventListener('resize', () => this.onResize());
    }

    /**
     * Configures the lighting for the scene.
     */
    initLighting() {
        // Ambient (Whiter overall look)
        const ambient = new THREE.AmbientLight(0xffffff, 0.4);
        this.scene.add(ambient);

        // ILLUSTRATION SPOTLIGHT (Top Down)
        const spotLight = new THREE.SpotLight(0xffffff, 3.5);
        spotLight.position.set(0, 800, 0); // High overhead
        spotLight.angle = 0.25;
        spotLight.penumbra = 0.5; // Very soft edge
        spotLight.castShadow = true;
        spotLight.shadow.mapSize.set(2048, 2048);
        spotLight.shadow.bias = -0.00005;
        this.scene.add(spotLight);

        // VISIBLE LIGHT BEAM
        // Tapered Cone matching spotlight, extended to bottom
        const beamGeo = new THREE.CylinderGeometry(20, 400, 3000, 64, 1, true);
        beamGeo.translate(0, -1500, 0); // Pivot at top (extends -3000 down)
        const beamMat = new THREE.MeshBasicMaterial({
            color: 0xfffdf5, // Warm White
            transparent: true,
            opacity: 0.12, // Visible but not overwhelming
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        const beam = new THREE.Mesh(beamGeo, beamMat);
        beam.position.set(0, 800, 0);
        this.scene.add(beam);

        // FILL LIGHT (Front Face Visibility)
        // Stronger fill to ensure Front is Grey, not Black
        const fill = new THREE.DirectionalLight(0xffffff, 0.5);
        fill.position.set(0, 100, 500);
        this.scene.add(fill);
    }

    initGeometry() {
        // Shared Materials
        this.materials = {
            rubber: new THREE.MeshPhysicalMaterial({
                color: 0xd92b2b, // Slightly desaturated Red (Illustration Style)
                emissive: 0x440000,
                roughness: 0.2, metalness: 0.0,
                clearcoat: 0.8,
            }),
            base: new THREE.MeshLambertMaterial({
                color: 0x1a1a1a // Near Black Base
            }),
            pillar: new THREE.MeshLambertMaterial({
                color: 0xffffff // Pure White Pillar
            })
        };

        this.pivot = new THREE.Group();
        this.scene.add(this.pivot);

        // Base Group
        const baseGroup = new THREE.Group();
        const puck = new THREE.Mesh(new THREE.CylinderGeometry(70, 75, 20, 64), this.materials.base);
        puck.position.y = -10; puck.receiveShadow = true;
        baseGroup.add(puck);

        const bezel = new THREE.Mesh(new THREE.TorusGeometry(68, 6, 16, 100), this.materials.base);
        bezel.rotation.x = -Math.PI / 2; bezel.receiveShadow = true;
        baseGroup.add(bezel);

        // MUSEUM PILLAR (Wider & Taller to fill frame/cut off bottom)
        const pillarGeo = new THREE.BoxGeometry(220, 600, 220);
        const pillar = new THREE.Mesh(pillarGeo, this.materials.pillar);
        pillar.position.y = -320; // Top at -20 (Base of button)
        pillar.receiveShadow = false; // Disable shadows ON the pillar (Clean Look)
        pillar.castShadow = true;
        baseGroup.add(pillar);

        // TOON OUTLINE: PILLAR (Inverted Hull for THICKNESS)
        const pillarOutline = new THREE.Mesh(
            new THREE.BoxGeometry(226, 606, 226), // +6 thickness
            new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.BackSide })
        );
        pillarOutline.position.copy(pillar.position);
        baseGroup.add(pillarOutline);

        this.pivot.add(baseGroup);

        // Button Mesh
        const domeGeo = new THREE.SphereGeometry(66, 64, 32, 0, Math.PI * 2, 0, Math.PI / 2);
        this.mesh = new THREE.Mesh(domeGeo, this.materials.rubber);
        this.mesh.castShadow = true; this.mesh.receiveShadow = true;
        this.mesh.scale.set(1, 0.7, 1);
        this.pivot.add(this.mesh);

        // TOON OUTLINE: BUTTON (Inverted Hull)
        const outlineMat = new THREE.MeshBasicMaterial({
            color: 0x000000,
            side: THREE.BackSide
        });
        const outlineMesh = new THREE.Mesh(domeGeo, outlineMat);
        outlineMesh.scale.setScalar(1.05);
        this.mesh.add(outlineMesh);

        // Physics Data Init
        this.originalPositions = Float32Array.from(domeGeo.attributes.position.array);
        this.weights = new Float32Array(this.originalPositions.length / 3);

        // SHADOW FLOOR (Transparent for Sage Green BG)
        const floor = new THREE.Mesh(
            new THREE.PlaneGeometry(3000, 3000),
            new THREE.ShadowMaterial({ opacity: 0.2, color: 0x000000 })
        );
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = -320; // Match new pillar base
        floor.receiveShadow = true;
        this.pivot.add(floor);
    }

    initConfetti() {
        const count = 500; // Extravaganza!
        this.confettiGroup = new THREE.Group();
        this.scene.add(this.confettiGroup);

        const geo = new THREE.PlaneGeometry(6, 6);
        const mat = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            side: THREE.DoubleSide
        });

        for (let i = 0; i < count; i++) {
            const mesh = new THREE.Mesh(geo, mat.clone());
            mesh.visible = false;
            this.confettiGroup.add(mesh);

            this.particles.push({
                mesh: mesh,
                vel: new THREE.Vector3(),
                rotVel: new THREE.Vector3(),
                swaySpeed: 0.005 + Math.random() * 0.01,
                swayOffset: Math.random() * Math.PI * 2,
                life: 0
            });
        }
    }

    /**
     * Sets up the AudioContext and a helper for playing tones.
     */
    initAudio() {
        this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        this.playTone = (freq, type, duration, vol = 0.5) => {
            if (this.audioCtx.state === 'suspended') this.audioCtx.resume();
            const osc = this.audioCtx.createOscillator();
            const gain = this.audioCtx.createGain();
            osc.type = type;
            osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);
            gain.gain.setValueAtTime(vol, this.audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + duration);
            osc.connect(gain);
            gain.connect(this.audioCtx.destination);
            osc.start();
            osc.stop(this.audioCtx.currentTime + duration);
        };
    }

    // -------------------------------------------------------------------------
    // PHYSICS ACTIONS
    // -------------------------------------------------------------------------

    /**
     * Triggers the confetti explosion effect.
     */
    explode() {
        if (this.state.isExploded) return;
        this.state.isExploded = true;
        this.state.isDragging = false;
        this.mesh.visible = false;

        // Flash Canvas for feedback
        this.canvas.style.backgroundColor = 'rgba(255,255,255,0.2)';
        setTimeout(() => this.canvas.style.backgroundColor = '', 150);

        // Sound: "Pop"
        this.playTone(150, 'sawtooth', 0.1, 0.5);
        setTimeout(() => this.playTone(300, 'square', 0.1, 0.3), 80);

        // Spawn Logic
        let center = this.physics.grabPoint.clone();
        if (center.lengthSq() < 1) center = this.mesh.position.clone();
        center.y += 5; // Lift slightly

        this.particles.forEach((p) => {
            p.mesh.visible = true;

            // Start at burst point
            p.mesh.position.copy(center).addScalar((Math.random() - 0.5) * 5);
            p.mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);

            // LOGIC FIX: Extravaganza Spread
            p.vel.set(
                (Math.random() - 0.5) * 15.0,   // Wide Spread X
                5.0 + Math.random() * 8.0,     // Shoot UP High
                (Math.random() - 0.5) * 15.0    // Wide Spread Z
            );

            // Gentle tumbling
            p.rotVel.set(
                (Math.random() - 0.5) * 0.1,
                (Math.random() - 0.5) * 0.1,
                (Math.random() - 0.5) * 0.1
            );

            // Aesthetic Colors (Rusty Lake Theme)
            // Muted, surreal, vintage, uncanny
            const r = Math.random();
            if (r < 0.4) p.mesh.material.color.setHex(0x8a0303); // Deep Blood Red
            else if (r < 0.6) p.mesh.material.color.setHex(0x111111); // Void Black
            else if (r < 0.8) p.mesh.material.color.setHex(0xe3dac9); // Bone/Paper White
            else p.mesh.material.color.setHex(0x2f4f4f); // Muted Dark Teal

            // Long Life (for slow fall)
            p.life = 2.0 + Math.random() * 1.5;
            p.mesh.scale.set(0.1, 0.1, 0.1); // Start small, pop in
        });

        // REGENERATE FAST (200ms)
        setTimeout(() => {
            // Check if we are still in exploded state (safety)
            if (!this.state.isExploded) return;

            this.state.isExploded = false;
            this.mesh.visible = true;

            // Trigger Organic Regrowth
            this.state.isRegenerating = true;
            this.state.regrowthProgress = 0.0;

            // Randomize Spawn Location (Organic Mutation)
            this.state.regrowthOrigin = {
                x: (Math.random() - 0.5) * 30, // Off-center
                y: -15,
                z: (Math.random() - 0.5) * 30
            };

            // Hard Reset Physics (Factory State)
            this.resetPhysics();

            // Force Mesh to start at origin (prevent 1-frame jump)
            this.mesh.position.set(
                this.state.regrowthOrigin.x,
                this.state.regrowthOrigin.y,
                this.state.regrowthOrigin.z
            );

            // Squishy reform sound
            this.playTone(100, 'sine', 0.3, 0.2);
        }, 200);
    }

    /**
     * Hides all confetti particles.
     */
    hideConfetti() {
        this.particles.forEach(p => {
            p.life = 0;
            p.mesh.visible = false;
        });
    }

    // -------------------------------------------------------------------------
    // INTERACTION LOOP
    // -------------------------------------------------------------------------

    /**
     * Binds event listeners for mouse and touch interactions.
     */
    bindEvents() {
        this.raycaster = new THREE.Raycaster();

        /**
         * Converts client coordinates to Normalized Device Coordinates (NDC).
         * @param {Event} e - The mouse or touch event.
         * @returns {Object} An object with x and y NDC coordinates.
         */
        const getNDC = (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            return {
                x: ((clientX - rect.left) / rect.width) * 2 - 1,
                y: -((clientY - rect.top) / rect.height) * 2 + 1
            };
        };

        const onDown = (e) => {
            if (this.state.isExploded) return;
            const { x, y } = getNDC(e);
            this.raycaster.setFromCamera({ x, y }, this.camera);
            const hits = this.raycaster.intersectObject(this.mesh);

            if (hits.length > 0) {
                this.state.isDragging = true;
                this.state.isReturning = false;
                this.physics.returnVelocity.set(0, 0, 0);
                this.physics.targetPressY = -10.0;

                const hit = hits[0];
                this.physics.grabPoint.copy(hit.point);
                this.physics.localGrabPoint.copy(this.mesh.worldToLocal(hit.point.clone()));
                this.physics.dragOffset.set(0, 0, 0);

                this.calculateWeights();
                this.playTone(150, 'square', 0.1, 0.3);
                this.canvas.style.cursor = 'grabbing';
            }
        };

        const onMove = (e) => {
            if (!this.state.isDragging || this.state.isExploded) return;
            const { x, y } = getNDC(e);

            // FAIL-SAFE: If dragging near edge of screen, FORCE EXPLODE
            // This prevents the "stick to edge" bug if coordinate math is weird.
            if (Math.abs(x) > 0.95 || Math.abs(y) > 0.95) {
                this.explode();
                this.canvas.style.cursor = 'grab';
                return;
            }

            // Raycast on Virtual Plane
            const ray = new THREE.Ray();
            ray.origin.setFromMatrixPosition(this.camera.matrixWorld);
            ray.direction.set(x, y, 0.5).unproject(this.camera).sub(ray.origin).normalize();

            // Project point onto Sphere of radius = distance(camera, grabPoint)
            const targetDist = this.physics.grabPoint.distanceTo(this.camera.position);
            const targetPos = ray.origin.clone().add(ray.direction.multiplyScalar(targetDist));

            this.physics.dragOffset.copy(targetPos).sub(this.physics.grabPoint);

            // Logic: Release Press on Pull Up
            if (this.physics.dragOffset.y > 5) this.physics.targetPressY = 0;

            // Logic: Check Burst Limit
            if (this.physics.dragOffset.length() > this.config.snapLimit) {
                this.explode();
                this.canvas.style.cursor = 'grab';
            }
        };

        const onUp = () => {
            if (this.state.isDragging) this.canvas.style.cursor = 'grabbing';
        };

        const c = this.canvas;
        c.addEventListener('mousedown', onDown);
        c.addEventListener('touchstart', onDown, { passive: false });
        window.addEventListener('mousemove', onMove);
        window.addEventListener('touchmove', onMove, { passive: false });
        window.addEventListener('mouseup', onUp);
        window.addEventListener('touchend', onUp);
    }

    /**
     * Calculates the weight for each vertex based on its distance from the grab point.
     */
    calculateWeights() {
        const pos = this.originalPositions;
        const localGrab = this.physics.localGrabPoint;
        const grabY = Math.max(0.1, localGrab.y);

        for (let i = 0; i < pos.length; i += 3) {
            const dx = pos[i] - localGrab.x;
            const dy = pos[i + 1] - localGrab.y;
            const dz = pos[i + 2] - localGrab.z;
            const distSq = dx * dx + dy * dy + dz * dz;

            // Gaussian Falloff
            let w = Math.exp(-distSq / (2 * this.config.softness * this.config.softness));

            // Taffy Pinning (Rooted at bottom)
            if (pos[i + 1] < grabY) {
                let pin = Math.max(0, pos[i + 1] / grabY);
                w *= Math.pow(pin, 0.8);
            }
            this.weights[i / 3] = w;
        }
    }

    // -------------------------------------------------------------------------
    // RENDER LOOP
    // -------------------------------------------------------------------------

    /**
     * Starts the animation loop for the button.
     */
    startLoop() {
        const animate = () => {
            requestAnimationFrame(animate);

            // 1. CONFETTI (Always update if active)
            this.updateConfetti();

            // 2. BUTTON RENDERING
            // Only update button visuals/physics if it's visible
            if (this.mesh.visible) {
                // ALIVE STATE (Heartbeat)
                this.updateHeartbeat();

                // PRESS PHYSICS
                // Smooth lerp for mechanical press
                this.physics.pressY += (this.physics.targetPressY - this.physics.pressY) * 0.6;
                // Note: mesh.position.y is handled by updateHeartbeat or overridden here
                if (!this.state.isRegenerating) {
                    this.mesh.position.y = this.physics.pressY;
                }

                // DEFORMATION PHYSICS
                this.updateDeformation();
            }

            this.renderer.render(this.scene, this.camera);
        };
        animate();
    }

    /**
     * Updates the heartbeat and shiver effects for the button.
     */
    updateHeartbeat() {
        const now = Date.now();
        const phase = now % this.config.beatRate;

        // --- ORGANIC REGROWTH LOGIC ---
        if (this.state.isRegenerating) {
            this.state.regrowthProgress += 0.008; // Crisp Speed

            if (this.state.regrowthProgress >= 1.0) {
                this.state.regrowthProgress = 1.0;
                this.state.isRegenerating = false;
                // Final clean snap
                this.mesh.position.set(0, this.physics.pressY, 0);
                this.mesh.rotation.set(0, 0, 0);
                this.mesh.scale.set(1, 0.7, 1);
            } else {
                const t = this.state.regrowthProgress;
                const origin = this.state.regrowthOrigin || { x: 0, y: -20, z: 0 };

                // 1. POSITION: Quartic Ease Out (Crisp arrival)
                // Starts fast, breaks hard, stops cleanly.
                const ease = 1 - Math.pow(1 - t, 4);

                this.mesh.position.x = origin.x * (1 - ease);
                this.mesh.position.z = origin.z * (1 - ease);
                this.mesh.position.y = origin.y * (1 - ease) + this.physics.pressY;

                // 2. SCALE: Breathing Growth (No violent bounce)
                // Grows to 1.0 with a small "inhale" overshoot (max ~1.05)
                const scaleBase = 1 - Math.pow(1 - t, 3); // Cubic growth
                const gentleHump = Math.sin(t * Math.PI) * 0.1 * (1.0 - t); // Decaying sine
                const s = scaleBase + gentleHump;

                // 3. MICRO-NOISE (Subtle biological shivering)
                const noise = 0.03 * (1 - ease);
                const nx = Math.sin(now * 0.05) * noise;
                const ny = Math.cos(now * 0.05) * noise;

                // Apply
                this.mesh.scale.set(
                    s + nx,
                    s * 0.7 + ny, // Maintains button flatness
                    s - nx
                );

                // 4. TUMBLE (Minimal)
                this.mesh.rotation.z = Math.sin(t * Math.PI) * 0.05;
                this.mesh.rotation.x = Math.cos(t * Math.PI) * 0.05;

                return; // SKIP normal heartbeat
            }
        }

        // --- NORMAL HEARTBEAT ---

        let pulse = 1.0;
        if (phase < 300) {
            pulse = 1.0 + Math.sin((phase / 300) * Math.PI) * 0.008;
        }

        // Apply Pulse
        this.mesh.scale.set(pulse, 0.7 * pulse, pulse);

        // Apply Shiver (Idle Jitter)
        this.mesh.position.x = (Math.random() - 0.5) * 0.2;
        this.mesh.position.z = (Math.random() - 0.5) * 0.2;
        this.mesh.position.y = this.physics.pressY;

        // Audio Trigger
        if (phase < 50 && this.state.beatPhase === 0) {
            const vol = this.state.isRegenerating ? 0.1 : 0.2;
            this.playTone(55, 'sine', 0.2, vol);
            this.state.beatPhase = 1;
        }
        if (phase > 500) this.state.beatPhase = 0;
    }

    /**
     * Updates the position and rotation of confetti particles.
     */
    updateConfetti() {
        const now = Date.now();
        // Optimization: check if any particles are alive?
        // We'll just loop, overhead of 150 items is tiny.

        this.particles.forEach((p) => {
            if (p.life > 0) {
                // Physics: Velocity
                p.mesh.position.add(p.vel);

                // SLOW MOTION PHYSICS
                p.vel.y -= 0.05; // Very low gravity (Floaty)
                p.vel.multiplyScalar(0.99); // Low drag (Sustain velocity)

                // Flower Petal Flutter (Sine wave sway)
                // We added swaySpeed/swayOffset in init, but if they don't exist, default them
                const sSpeed = p.swaySpeed || 0.005;
                const sOffset = p.swayOffset || 0;

                const sway = Math.sin(now * sSpeed + sOffset) * 0.1;
                p.mesh.position.x += sway;
                p.mesh.position.z += sway;

                // Slow Tumble
                p.mesh.rotation.x += p.rotVel.x * 0.5;
                p.mesh.rotation.y += p.rotVel.y * 0.5;
                p.mesh.rotation.z += p.rotVel.z * 0.5;

                // Long Decay
                p.life -= 0.005; // ~3 seconds life

                if (p.life <= 0 || p.mesh.position.y < -100) {
                    p.mesh.visible = false;
                    p.life = 0;
                } else {
                    // activeCount++; // No longer needed
                }

                // Smooth Pop-in
                const s = Math.min(1.0, p.life * 5.0); // Fast initial scale up
                p.mesh.scale.set(s, s, s);
            }
        });

        // If no particles left and clean-up time passed, ensure state is reset?
        // (Handled by explode timeout)
    }

    /**
     * Applies deformation physics to the button mesh.
     */
    updateDeformation() {
        const P = this.physics;
        const positions = this.mesh.geometry.attributes.position.array;

        // Spring Return Logic
        if (!this.state.isDragging) {
            const force = P.dragOffset.clone().multiplyScalar(-0.15); // Stiffness
            P.returnVelocity.add(force).multiplyScalar(0.85); // Damping
            P.dragOffset.add(P.returnVelocity);

            if (P.dragOffset.lengthSq() < 0.01 && P.returnVelocity.lengthSq() < 0.01) {
                P.dragOffset.set(0, 0, 0);
                P.returnVelocity.set(0, 0, 0);
            }
        }

        // Vertex Displacement
        if (P.dragOffset.lengthSq() > 0.001 || this.state.isDragging) {
            const localDrag = P.dragOffset.clone();
            localDrag.x /= this.mesh.scale.x;
            localDrag.y /= this.mesh.scale.y;
            localDrag.z /= this.mesh.scale.z;

            // Directional Logic (Squash vs Stretch)
            let effDragY = localDrag.y;
            let radialSquash = 0;

            if (localDrag.y < 0) {
                effDragY *= 0.1;
                radialSquash = -localDrag.y * 0.4;
            }

            for (let i = 0; i < this.weights.length; i++) {
                const w = this.weights[i];
                if (w < 0.001) {
                    // Reset to original (optimization)
                    positions[i * 3] = this.originalPositions[i * 3];
                    positions[i * 3 + 1] = this.originalPositions[i * 3 + 1];
                    positions[i * 3 + 2] = this.originalPositions[i * 3 + 2];
                    continue;
                }

                // Apply X/Z drag + Radial Squash
                const ox = this.originalPositions[i * 3];
                const oz = this.originalPositions[i * 3 + 2];

                // Squash Expansion
                const sx = ox * radialSquash * 0.01 * w;
                const sz = oz * radialSquash * 0.01 * w;

                positions[i * 3] = ox + (localDrag.x * w) + sx;
                positions[i * 3 + 2] = oz + (localDrag.z * w) + sz;

                // Apply Y Drag + Floor Constraint
                let newY = this.originalPositions[i * 3 + 1] + (effDragY * w);

                // Constraint: Y must be above floor relative to Press depth
                // LocalY * ScaleY + PressY >= FloorY (2.0)
                const limitY = (2.0 - P.pressY) / this.mesh.scale.y;
                newY = Math.max(limitY, newY);

                positions[i * 3 + 1] = newY;
            }
            this.mesh.geometry.attributes.position.needsUpdate = true;
            this.mesh.geometry.computeVertexNormals();
        }
    }

    /**
     * Resets the button physics to its original state.
     */
    resetPhysics() {
        this.physics.dragOffset.set(0, 0, 0);
        this.physics.returnVelocity.set(0, 0, 0);
        this.physics.grabPoint.set(0, 0, 0);
        this.physics.localGrabPoint.set(0, 0, 0);
        this.physics.pressY = 0;
        this.physics.targetPressY = 0;

        // CRITICAL: Clear weights to prevent lingering deformation
        this.weights.fill(0);

        // Reset Geometry
        this.mesh.geometry.attributes.position.array.set(this.originalPositions);
        this.mesh.geometry.attributes.position.needsUpdate = true;
        this.mesh.position.y = 0;

        // FIX: Recompute normals to ensure lighting/shading is consistent
        this.mesh.geometry.computeVertexNormals();
    }

    /**
     * Handles window resize events to update camera aspect ratio and renderer size.
     */
    onResize() {
        if (!this.camera || !this.renderer) return;
        const w = window.innerWidth;
        const h = window.innerHeight;
        this.camera.aspect = w / h;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(w, h);
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

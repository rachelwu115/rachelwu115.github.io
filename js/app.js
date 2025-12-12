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

import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { FilesetResolver, HandLandmarker } from 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0';

/**
 * COMPONENT: Hand Controller (Vibe Coding)
 */
class HandController {
    constructor(callback) {
        this.video = document.getElementById('webcam');
        this.landmarker = null;
        this.callback = callback; // Function to call with hand data { x, y, isPinching }
        this.lastVideoTime = -1;
        this.init();
    }

    async init() {
        if (!this.video) return;

        // 1. Initialize Mediapipe
        const vision = await FilesetResolver.forVisionTasks(
            "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
        );
        this.landmarker = await HandLandmarker.createFromOptions(vision, {
            baseOptions: {
                modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
                delegate: "GPU"
            },
            runningMode: "VIDEO",
            numHands: 1
        });

        // 2. Start Webcam
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            this.video.srcObject = stream;
            this.video.addEventListener('loadeddata', () => this.predict());
        } catch (err) {
            console.error("Webcam denied:", err);
            // Fallback to mouse only
        }
    }

    async predict() {
        if (this.video.currentTime !== this.lastVideoTime) {
            this.lastVideoTime = this.video.currentTime;
            const results = this.landmarker.detectForVideo(this.video, performance.now());

            if (results.landmarks && results.landmarks.length > 0) {
                const hand = results.landmarks[0]; // First hand

                // Detect Pinch (Index Tip [8] vs Thumb Tip [4])
                const thumb = hand[4];
                const index = hand[8];
                const dist = Math.sqrt(
                    (thumb.x - index.x) ** 2 +
                    (thumb.y - index.y) ** 2 +
                    (thumb.z - index.z) ** 2
                );

                const isPinching = dist < 0.05; // Threshold

                // Average position of pinch
                const x = (thumb.x + index.x) / 2;
                const y = (thumb.y + index.y) / 2;

                // Send to App
                // Note: Mediapipe X is inverted (mirror), Y is top-down 0-1
                this.callback({
                    x: 1 - x, // Flip X for mirror effect
                    y: y,
                    isPinching: isPinching
                });
            } else {
                this.callback(null);
            }
        }
        requestAnimationFrame(() => this.predict());
    }
}

/**
 * COMPONENT: Sticky Rubber Button (Three.js WebGL)
 */
class RubberButton {
    constructor() {
        this.canvas = document.getElementById('buttonCanvas');
        if (!this.canvas) return;

        // Init Hand Tracking
        this.handController = new HandController((data) => this.onHandUpdate(data));

        // Scene
        this.scene = new THREE.Scene();
        // this.scene.background = new THREE.Color(0x000000); // Transparent currently

        // Camera
        // FOV, Aspect, Near, Far
        const width = this.canvas.clientWidth;
        const height = this.canvas.clientHeight;
        this.camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
        this.camera.position.set(0, 150, 150); // High angle
        this.camera.lookAt(0, 0, 0);

        // Renderer
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            alpha: true,
            antialias: true
        });
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

        // Lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
        this.scene.add(ambientLight);

        const spotLight = new THREE.SpotLight(0xffffff, 2);
        spotLight.position.set(50, 100, 50);
        spotLight.angle = Math.PI / 4;
        spotLight.penumbra = 0.5;
        this.scene.add(spotLight);

        const pointLight = new THREE.PointLight(0xff0000, 1, 100);
        pointLight.position.set(0, 20, 0);
        this.scene.add(pointLight);

        // Materials
        this.rubberMat = new THREE.MeshPhysicalMaterial({
            color: 0xd32f2f,
            roughness: 0.2, // Shiny but rubbery
            metalness: 0.1,
            clearcoat: 0.5,
            clearcoatRoughness: 0.1,
            flatShading: false,
            side: THREE.DoubleSide
        });

        // Geometry (Cylinder-ish button)
        // High segmentation for vertex distortion
        this.geometry = new THREE.CylinderGeometry(40, 45, 20, 32, 10, false);
        // Rotate geometry so it sits flat? Cylinder is Y-up default.
        // It's fine.

        // Mesh
        this.mesh = new THREE.Mesh(this.geometry, this.rubberMat);
        this.scene.add(this.mesh);

        // Save Original Positions for Physics
        this.originalPositions = Float32Array.from(this.geometry.attributes.position.array);
        this.velocities = new Float32Array(this.originalPositions.length);

        // 3D Cursor (For Hand Tracking Debug)
        this.cursor3D = new THREE.Mesh(
            new THREE.SphereGeometry(2, 16, 16),
            new THREE.MeshBasicMaterial({ color: 0x00ff00 }) // Green dot
        );
        this.scene.add(this.cursor3D);
        this.cursor3D.visible = false;

        // Interaction State
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.isDragging = false;
        this.dragIndex = -1; // Vertex index
        this.dragOffset = new THREE.Vector3();

        // Physics Params
        this.stiffness = 0.05;
        this.friction = 0.90;
        this.maxStretch = 100;

        this.bindEvents();
        this.start();
    }

    onHandUpdate(data) {
        if (!data) {
            this.cursor3D.visible = false;
            // Map release
            if (this.isDragging && this.dragIndex !== -1) {
                this.isDragging = false;
                this.dragIndex = -1;
            }
            return;
        }

        // Visualize Hand Position in 3D Space
        this.cursor3D.visible = true;

        // Project normalized (0-1) hand to 3D Plane
        // We project to a plane at Y=20 (Top of button)
        const x = (data.x * 2) - 1; // NDC
        const y = -(data.y * 2) + 1; // NDC

        this.raycaster.setFromCamera(new THREE.Vector2(x, y), this.camera);
        const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -20);
        const target = new THREE.Vector3();
        this.raycaster.ray.intersectPlane(plane, target);

        if (target) {
            this.cursor3D.position.copy(target);

            // Interaction
            if (data.isPinching) {
                this.cursor3D.material.color.set(0xff0000); // Red when pinching

                if (!this.isDragging) {
                    // Try to grab
                    // Check distance to mesh vertices
                    const positions = this.geometry.attributes.position.array;
                    let closest = -1;
                    let minDst = 50 * 50; // Tolerance squared

                    for (let i = 0; i < positions.length; i += 3) {
                        const dx = positions[i] - target.x;
                        const dy = positions[i + 1] - target.y; // Height diff check?
                        const dz = positions[i + 2] - target.z;

                        const d2 = dx * dx + dy * dy + dz * dz;
                        if (d2 < minDst) {
                            minDst = d2;
                            closest = i;
                        }
                    }

                    if (closest !== -1) {
                        this.isDragging = true;
                        this.dragIndex = closest;
                    }
                } else if (this.isDragging && this.dragIndex !== -1) {
                    // Move Vertex
                    const positions = this.geometry.attributes.position.array;
                    positions[this.dragIndex] = target.x;
                    positions[this.dragIndex + 1] = Math.max(10, target.y); // Floor
                    positions[this.dragIndex + 2] = target.z;

                    this.geometry.attributes.position.needsUpdate = true;
                }
            } else {
                this.cursor3D.material.color.set(0x00ff00); // Green when hovering
                this.isDragging = false;
                this.dragIndex = -1;
            }
        }
    }

    bindEvents() {
        // ... (keep Mouse for fallback)
        // We need to map Mouse Event to normalized device coordinates (-1 to +1)
        const getNDC = (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
            const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
            return { x, y };
        };

        window.addEventListener('mousedown', (e) => {
            const ndc = getNDC(e);
            this.mouse.set(ndc.x, ndc.y);
            this.raycaster.setFromCamera(this.mouse, this.camera);

            const intersects = this.raycaster.intersectObject(this.mesh);
            if (intersects.length > 0) {
                // Find closest vertex to impact point
                const hit = intersects[0];
                const point = hit.point; // World space

                // Convert world point to local space to find vertex index
                // Mesh is at 0,0,0 usually
                // Brute force search for closest vertex
                const positions = this.geometry.attributes.position.array;
                let minDst = Infinity;
                let closestIdx = -1;

                // Mesh world matrix is identity generally unless transformed
                // Assume object is at 0,0,0

                for (let i = 0; i < positions.length; i += 3) {
                    const vx = positions[i];
                    const vy = positions[i + 1];
                    const vz = positions[i + 2];

                    // Simple distance check (ignoring world transform if simple)
                    const dx = vx - point.x;
                    const dy = vy - point.y;
                    const dz = vz - point.z;
                    const dist = dx * dx + dy * dy + dz * dz;

                    if (dist < minDst) {
                        minDst = dist;
                        closestIdx = i; // Store index of X
                    }
                }

                if (closestIdx !== -1 && minDst < 100) { // Tolerance
                    this.isDragging = true;
                    this.dragIndex = closestIdx;
                    this.canvas.style.cursor = 'grabbing';
                }
            }
        });

        window.addEventListener('mousemove', (e) => {
            const ndc = getNDC(e);
            this.mouse.set(ndc.x, ndc.y); // Always update mouse for raycaster

            if (this.isDragging && this.dragIndex !== -1) {
                // Raycast to an invisible plane to get 3D drag position?
                // Or allows arbitrary movement?
                // Let's create a plane at the button height
                const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0); // Flat XZ plane
                // Raycast
                this.raycaster.setFromCamera(this.mouse, this.camera);
                const target = new THREE.Vector3();
                this.raycaster.ray.intersectPlane(plane, target);

                if (target) {
                    // Update the vertex position
                    const positions = this.geometry.attributes.position.array;
                    // Apply offset
                    // We pull it UP a bit too (Y axis) based on stretch
                    positions[this.dragIndex] = target.x;
                    positions[this.dragIndex + 1] = Math.max(10, target.y + 20); // Pull Up
                    positions[this.dragIndex + 2] = target.z;

                    this.geometry.attributes.position.needsUpdate = true;

                    // Break Threshold
                    const ox = this.originalPositions[this.dragIndex];
                    const oy = this.originalPositions[this.dragIndex + 1];
                    const oz = this.originalPositions[this.dragIndex + 2];

                    const dist = Math.sqrt(
                        (target.x - ox) ** 2 +
                        (target.y - oy) ** 2 +
                        (target.z - oz) ** 2
                    );

                    if (dist > this.maxStretch) {
                        this.isDragging = false;
                        this.dragIndex = -1;
                        this.canvas.style.cursor = 'grab';
                    }
                }
            }
        });

        window.addEventListener('mouseup', () => {
            this.isDragging = false;
            this.dragIndex = -1;
            this.canvas.style.cursor = 'grab';
        });
    }

    start() {
        const animate = () => {
            requestAnimationFrame(animate);

            // Physics Update (Spring back to original)
            const positions = this.geometry.attributes.position.array;

            for (let i = 0; i < positions.length; i++) {
                // Skip dragged vertex (locked to mouse)
                if (this.isDragging && (i >= this.dragIndex && i <= this.dragIndex + 2)) continue;

                // Spring
                const home = this.originalPositions[i];
                const current = positions[i];
                const diff = home - current;

                this.velocities[i] += diff * this.stiffness;
                this.velocities[i] *= this.friction;
                positions[i] += this.velocities[i];
            }

            // Area of Effect (Pull neighbors)
            if (this.isDragging) {
                // Cheap Soft-body: Iterate and pull nearby vertices towards dragged one
                // This is O(N^2) potentially, be careful. 
                // Just do trivial distance check? 
                // Optimization: Just rely on spring web if we had one.
                // Since we don't have constraints, vertices are independent springs.
                // To make it look "Gooey", we should pull neighbors.

                const dx = positions[this.dragIndex];
                const dy = positions[this.dragIndex + 1];
                const dz = positions[this.dragIndex + 2];

                for (let i = 0; i < positions.length; i += 3) {
                    if (i === this.dragIndex) continue;

                    const vx = positions[i];
                    const vy = positions[i + 1];
                    const vz = positions[i + 2];

                    const d2 = (dx - vx) ** 2 + (dy - vy) ** 2 + (dz - vz) ** 2;
                    if (d2 < 400) { // Influence Radius
                        // Pull factor
                        const factor = 0.05 * (400 - d2) / 400;
                        positions[i] += (dx - vx) * factor;
                        positions[i + 1] += (dy - vy) * factor;
                        positions[i + 2] += (dz - vz) * factor;
                    }
                }
            }

            this.geometry.attributes.position.needsUpdate = true;
            this.geometry.computeVertexNormals(); // Recalc for lighting

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

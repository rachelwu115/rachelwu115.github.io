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

/**
 * COMPONENT: Sticky Rubber Button (Three.js WebGL)
 */
class RubberButton {
    constructor() {
        this.canvas = document.getElementById('buttonCanvas');
        if (!this.canvas) return;

        // Scene
        this.scene = new THREE.Scene();

        // Camera (Macro Lens)
        const width = this.canvas.clientWidth;
        const height = this.canvas.clientHeight;
        this.camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
        this.camera.position.set(0, 100, 160); // Close up
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

        // Lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
        this.scene.add(ambientLight);

        // Main Studio Light
        const spotLight = new THREE.SpotLight(0xffdddd, 2);
        spotLight.position.set(100, 200, 100);
        spotLight.angle = Math.PI / 4;
        spotLight.penumbra = 0.5;
        spotLight.castShadow = true;
        spotLight.shadow.mapSize.width = 2048;
        spotLight.shadow.mapSize.height = 2048;
        this.scene.add(spotLight);

        // Rim Light (Edge definition)
        const rimLight = new THREE.SpotLight(0x4455ff, 5); // Blue Rim
        rimLight.position.set(-100, 20, -100);
        rimLight.lookAt(0, 0, 0);
        this.scene.add(rimLight);

        // INTERACTIVE LIGHT (Follows Mouse)
        // This makes reflections move, proving 3D
        this.cursorLight = new THREE.PointLight(0xffffff, 1, 300);
        this.cursorLight.position.set(0, 50, 100);
        this.scene.add(this.cursorLight);

        // Materials
        this.rubberMat = new THREE.MeshPhysicalMaterial({
            color: 0xcc0000,
            emissive: 0x110000,
            roughness: 0.15,
            metalness: 0.1,
            clearcoat: 1.0,
            clearcoatRoughness: 0.1,
            flatShading: false, // Smooth
            side: THREE.DoubleSide
        });

        const baseMat = new THREE.MeshStandardMaterial({
            color: 0x050505, // Almost black
            roughness: 0.3,
            metalness: 0.9 // Chrome stand
        });

        // Group
        this.pivot = new THREE.Group();
        this.scene.add(this.pivot);

        // GEOMETRY: The "Massive" Button
        // We construct a "Beveled" shape using multiple cylinders to get distinct faces that catch light
        this.buttonGroup = new THREE.Group();
        this.pivot.add(this.buttonGroup);

        // 1. Top Face (Cap)
        const topGeo = new THREE.CylinderGeometry(85, 90, 5, 64);
        const topMesh = new THREE.Mesh(topGeo, this.rubberMat);
        topMesh.position.y = 12.5;
        topMesh.castShadow = true;
        topMesh.receiveShadow = true;
        this.buttonGroup.add(topMesh);

        // 2. Main Body (Side)
        const bodyGeo = new THREE.CylinderGeometry(90, 90, 20, 64);
        const bodyMesh = new THREE.Mesh(bodyGeo, this.rubberMat);
        bodyMesh.position.y = 0;
        bodyMesh.castShadow = true;
        bodyMesh.receiveShadow = true;
        this.buttonGroup.add(bodyMesh);

        // 3. Bottom Bevel
        const botGeo = new THREE.CylinderGeometry(90, 80, 5, 64);
        const botMesh = new THREE.Mesh(botGeo, this.rubberMat);
        botMesh.position.y = -12.5;
        botMesh.castShadow = true;
        botMesh.receiveShadow = true;
        this.buttonGroup.add(botMesh);

        // Store Vertices for Physics (We'll animate the Group scale/pos or main body vertices?)
        // Complex to animate 3 meshes. 
        // Let's MERGE them or just use one highly segmented cylinder with manual vertex manipulation for shape.
        // Actually, let's use a single LatheGeometry or just a high-res Cylinder and accept smooth edges.
        // The user wants "Faces reflect differently". A beveled cylinder (Cylinder with 3 height segments) works best.

        // RE-DO GEOMETRY AS SINGLE MESH for Physics Compatibility
        this.buttonGroup.clear();

        // Cylinder with radiusTop, radiusBottom, height, radialSegments, heightSegments
        // heightSegments = 5 allows us to bulge/bevel it manually or just have resolution for physics
        this.geometry = new THREE.CylinderGeometry(90, 90, 30, 64, 10, false);
        this.mesh = new THREE.Mesh(this.geometry, this.rubberMat);
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = true;
        this.mesh.position.y = 15;
        this.pivot.add(this.mesh);

        // GEOMETRY: The "Tiny" Stand
        const baseGeo = new THREE.CylinderGeometry(20, 30, 40, 32); // Narrow stem
        this.base = new THREE.Mesh(baseGeo, baseMat);
        this.base.position.y = -20; // Underneath
        this.base.receiveShadow = true;
        this.pivot.add(this.base);

        // Save Original Positions
        this.originalPositions = Float32Array.from(this.geometry.attributes.position.array);
        this.velocities = new Float32Array(this.originalPositions.length);

        // Interaction
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.interactionMode = null;
        this.dragIndex = -1;

        this.targetRotation = { x: 0, y: 0 };
        this.currentRotation = { x: 0, y: 0 };
        this.lastMouse = { x: 0, y: 0 };

        this.stiffness = 0.05;
        this.friction = 0.90;
        this.maxStretch = 150;

        this.bindEvents();
        this.start();
    }

    bindEvents() {
        const getNDC = (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
            const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
            return { x, y };
        };

        this.canvas.addEventListener('mousemove', (e) => {
            const ndc = getNDC(e);

            // MOVE LIGHT WITH MOUSE
            // Map NDC (-1 to 1) to Light Pos (-100 to 100)
            this.cursorLight.position.x = ndc.x * 100;
            this.cursorLight.position.y = 50 + (ndc.y * 50);

            // Dragging Logic
            if (this.interactionMode === 'drag' && this.dragIndex !== -1) {
                this.mouse.set(ndc.x, ndc.y);
                this.raycaster.setFromCamera(this.mouse, this.camera);

                const target = new THREE.Vector3();
                const p = new THREE.Plane(new THREE.Vector3(0, 1, 0), -20);
                this.raycaster.ray.intersectPlane(p, target);

                if (target) {
                    const localTarget = this.mesh.worldToLocal(target.clone());
                    const positions = this.geometry.attributes.position.array;

                    // Vertex Manipulation
                    positions[this.dragIndex] = localTarget.x;
                    positions[this.dragIndex + 1] = Math.max(0, localTarget.y);
                    positions[this.dragIndex + 2] = localTarget.z;

                    this.geometry.attributes.position.needsUpdate = true;
                }
            } else if (this.interactionMode === 'rotate') {
                const deltaX = e.clientX - this.lastMouse.x;
                const deltaY = e.clientY - this.lastMouse.y;
                this.targetRotation.y += deltaX * 0.01;
                this.targetRotation.x += deltaY * 0.01;
                this.lastMouse = { x: e.clientX, y: e.clientY };
            }
        });

        this.canvas.addEventListener('mousedown', (e) => {
            const ndc = getNDC(e);
            this.mouse.set(ndc.x, ndc.y);
            this.raycaster.setFromCamera(this.mouse, this.camera);

            const intersects = this.raycaster.intersectObject(this.mesh);

            if (intersects.length > 0) {
                this.interactionMode = 'drag';
                const hit = intersects[0];
                const localPoint = this.mesh.worldToLocal(hit.point.clone());

                const positions = this.geometry.attributes.position.array;
                let minDst = Infinity;
                let closestIdx = -1;

                for (let i = 0; i < positions.length; i += 3) {
                    const dx = positions[i] - localPoint.x;
                    const dy = positions[i + 1] - localPoint.y;
                    const dz = positions[i + 2] - localPoint.z;
                    const d = dx * dx + dy * dy + dz * dz;
                    if (d < minDst) {
                        minDst = d;
                        closestIdx = i;
                    }
                }

                if (closestIdx !== -1) {
                    this.dragIndex = closestIdx;
                    this.canvas.style.cursor = 'grabbing';
                }
            } else {
                this.interactionMode = 'rotate';
                this.lastMouse = { x: e.clientX, y: e.clientY };
                this.canvas.style.cursor = 'move';
            }
        });

        window.addEventListener('mouseup', () => {
            this.interactionMode = null;
            this.dragIndex = -1;
            this.canvas.style.cursor = 'grab';
        });
    }

    start() {
        const animate = () => {
            requestAnimationFrame(animate);

            // Rotation
            this.pivot.rotation.y += (this.targetRotation.y - this.pivot.rotation.y) * 0.1;
            this.pivot.rotation.x += (this.targetRotation.x - this.pivot.rotation.x) * 0.1;

            // Physics
            const positions = this.geometry.attributes.position.array;

            for (let i = 0; i < positions.length; i++) {
                if (this.interactionMode === 'drag' && (i >= this.dragIndex && i <= this.dragIndex + 2)) continue;

                const home = this.originalPositions[i];
                const current = positions[i];
                const diff = home - current;

                this.velocities[i] += diff * this.stiffness;
                this.velocities[i] *= this.friction;
                positions[i] += this.velocities[i];
            }

            this.geometry.attributes.position.needsUpdate = true;
            this.geometry.computeVertexNormals();

            this.renderer.render(this.scene, this.camera);

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

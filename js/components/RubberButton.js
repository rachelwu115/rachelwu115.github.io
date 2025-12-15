import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { audioManager } from '../utils/AudioManager.js';
import { APP_CONFIG } from '../config.js';

/**
 * COMPONENT: Sticky Rubber Button (Three.js WebGL)
 * 
 * Features:
 * - Gooey/Sticky Interaction.
 * - Soft-body deformation.
 * - "Alive" States: Heartbeat, Shiver.
 * - Confetti Explosion.
 */
export class RubberButton {
    constructor() {
        // Build Trigger: 2025-12-14
        // Build Trigger: 2025-12-14
        // Build Trigger: 2025-12-14
        // Build Trigger: 2025-12-14
        this.canvas = document.getElementById('buttonCanvas');
        this.confettiCanvas = document.getElementById('confettiCanvas');
        if (!this.canvas) return;

        // Configuration
        this.config = Object.assign({
            snapLimit: 500.0,
            softness: 15.0,
            gravity: 0.15,
            beatRate: 3000,
        }, APP_CONFIG.BUTTON);

        // State
        this.isActive = false; // Start inactive (Exhibit 1 is default)
        this.state = {
            isDragging: false,
            isReturning: false,
            isExploded: false,
            isDripping: false,
            beatPhase: 0,
        };
        this.localTime = 0; // For synced animation

        // Physics Vectors
        this.physics = {
            dragOffset: new THREE.Vector3(),
            grabPoint: new THREE.Vector3(),
            localGrabPoint: new THREE.Vector3(),
            returnVelocity: new THREE.Vector3(),
            pressY: 0,
            targetPressY: 0
        };

        // Systems
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.rendererConfetti = null;
        this.sceneConfetti = null;
        this.mesh = null;
        this.particles = []; // For confetti

        this.init();
    }

    init() {
        this.initScene();
        this.initLighting();
        this.initGeometry();
        this.initConfetti();
        this.initAudio();
        this.bindEvents();
        this.startLoop();
        this.setActive(false); // Hide initially
    }

    initScene() {
        this.scene = new THREE.Scene();
        this.scene.background = null; // Transparent

        const w = window.innerWidth;
        const h = window.innerHeight;
        // FOV 18: Telephoto
        this.camera = new THREE.PerspectiveCamera(18, w / h, 0.1, 4000);
        this.camera.position.set(0, 300, 1300);
        this.camera.lookAt(0, -20, 0);

        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            alpha: true,
            antialias: true
        });
        this.renderer.setSize(w, h);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        // RENDERER 2: CONFETTI (Top Layer)
        if (this.confettiCanvas) {
            this.rendererConfetti = new THREE.WebGLRenderer({
                canvas: this.confettiCanvas,
                alpha: true, // IMPORTANT: Must be transparent
                antialias: true
            });
            this.rendererConfetti.setSize(w, h);
            this.rendererConfetti.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            this.rendererConfetti.setClearColor(0x000000, 0); // EXPLICIT: Transparent
        }

        window.addEventListener('resize', () => this.onResize());
    }

    initLighting() {
        const ambient = new THREE.AmbientLight(0xffffff, 0.4);
        this.scene.add(ambient);

        const spotLight = new THREE.SpotLight(0xffffff, 3.5);
        spotLight.position.set(0, 800, 0);
        spotLight.angle = 0.25;
        spotLight.penumbra = 0.5;
        spotLight.castShadow = true;
        spotLight.shadow.mapSize.set(2048, 2048);
        spotLight.shadow.bias = -0.00005;
        this.scene.add(spotLight);

        // Light Beam
        const beamGeo = new THREE.CylinderGeometry(40, 600, 3000, 64, 1, true);
        beamGeo.translate(0, -1500, 0);
        const beamMat = new THREE.MeshBasicMaterial({
            color: 0xfffdf5,
            transparent: true,
            opacity: 0.08,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        const beam = new THREE.Mesh(beamGeo, beamMat);
        beam.position.set(0, 800, 0);
        this.scene.add(beam);

        const fill = new THREE.DirectionalLight(0xffffff, 0.5);
        fill.position.set(0, 100, 500);
        this.scene.add(fill);
    }

    initGeometry() {
        this.pivot = new THREE.Group();
        this.scene.add(this.pivot);

        const matRubber = new THREE.MeshPhysicalMaterial({
            color: 0xd92b2b, emissive: 0x440000,
            roughness: 0.2, metalness: 0.0, clearcoat: 0.8
        });
        const matBase = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });

        // Pillar
        const pillarW = 220, pillarH = 600, pillarD = 220;
        const pillarGeo = new THREE.BoxGeometry(pillarW, pillarH, pillarD);
        const matWhite = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const matGrey = new THREE.MeshBasicMaterial({ color: 0xcccccc });
        const pillar = new THREE.Mesh(pillarGeo, [
            matGrey, matGrey, matWhite, matGrey, matGrey, matGrey
        ]);
        pillar.position.y = -320.1;
        pillar.receiveShadow = false;
        pillar.castShadow = true;
        this.pivot.add(pillar);

        // Pillar Outline
        const outlineGeo = new THREE.BoxGeometry(pillarW + 4, pillarH + 4, pillarD + 4);
        const outlineMat = new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.BackSide });
        const outline = new THREE.Mesh(outlineGeo, outlineMat);
        outline.position.copy(pillar.position);
        this.pivot.add(outline);

        // Puck
        const puck = new THREE.Mesh(new THREE.CylinderGeometry(70, 75, 20, 64), matBase);
        puck.position.y = -10; puck.receiveShadow = true;
        this.pivot.add(puck);

        const bezel = new THREE.Mesh(new THREE.TorusGeometry(68, 6, 16, 100), matBase);
        bezel.rotation.x = -Math.PI / 2; bezel.receiveShadow = true;
        this.pivot.add(bezel);

        // Button Dome
        // Increased resolution to 128, 64 to prevent visible polygon edges during extreme stretch
        const domeGeo = new THREE.SphereGeometry(66, 128, 64, 0, Math.PI * 2, 0, Math.PI / 2);
        this.mesh = new THREE.Mesh(domeGeo, matRubber);
        this.mesh.castShadow = true; this.mesh.receiveShadow = true;
        this.mesh.scale.set(1, 0.7, 1);
        this.pivot.add(this.mesh);

        // Button Outline
        const btnOutlineMat = new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.BackSide });
        this.btnOutline = new THREE.Mesh(domeGeo, btnOutlineMat);
        this.btnOutline.scale.setScalar(1.02);
        this.mesh.add(this.btnOutline);

        this.originalPositions = Float32Array.from(domeGeo.attributes.position.array);
        this.weights = new Float32Array(this.originalPositions.length / 3);


    }

    initConfetti() {
        const count = 3000; // Reduced pool for giant sheets
        this.confettiIndex = 0;

        // Independent Scene for Confetti
        this.sceneConfetti = new THREE.Scene();
        this.sceneConfetti.background = null;

        this.confettiGroup = new THREE.Group();
        this.sceneConfetti.add(this.confettiGroup); // Add to NEW scene

        // Rectangular "Strip" Geometry for tumbling effect
        const geo = new THREE.PlaneGeometry(8, 4);
        const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });

        for (let i = 0; i < count; i++) {
            const mesh = new THREE.Mesh(geo, mat.clone());
            mesh.visible = false;
            this.confettiGroup.add(mesh);

            this.particles.push({
                mesh: mesh,
                vel: new THREE.Vector3(),
                rotVel: new THREE.Vector3(),
                // Paper Physics State
                tiltAngle: 0,
                tiltAngleIncrement: 0,
                wobble: 0,
                wobbleIncrement: 0,
                life: 0
            });
        }
    }

    initAudio() {
        // Delegated to AudioManager
    }

    explode() {
        if (this.state.isExploded) return;
        this.state.isExploded = true;
        this.state.isDragging = false;
        this.mesh.visible = false;

        this.canvas.style.backgroundColor = 'rgba(255,255,255,0.2)';
        setTimeout(() => this.canvas.style.backgroundColor = '', 150);

        audioManager.playPop();
        audioManager.playSadSigh();
        // audioManager.playTone(400, 'sine', 0.1); // REMOVED
        // audioManager.playTone(600, 'triangle', 0.15); // REMOVED

        // origin: Shoot from underneath (Deep inside pillar)
        let center = new THREE.Vector3(0, -60, 0);

        // Confetti Burst
        const C = APP_CONFIG.CONFETTI;
        const batchSize = C.BATCH_SIZE;
        const total = this.particles.length;

        for (let i = 0; i < batchSize; i++) {
            const p = this.particles[this.confettiIndex % total];
            this.confettiIndex++;

            p.mesh.visible = true;
            p.life = 1.0;

            // SPAWN: Volumetric Sphere (Globe) - UPPER HEMISPHERE ONLY
            const spawnRadius = C.SPAWN_RADIUS || 80.0; // Fallback for safety
            const theta = Math.random() * Math.PI * 2;

            // Upper Hemisphere: phi from 0 (top) to PI/2 (equator)
            // Math.random() gives 0..1 => acos gives PI/2..0
            const phi = Math.acos(Math.random());

            const r = Math.cbrt(Math.random()) * spawnRadius; // Uniform volume

            const x = r * Math.sin(phi) * Math.cos(theta);
            const y = r * Math.sin(phi) * Math.sin(theta);
            const z = r * Math.cos(phi);

            p.mesh.position.set(center.x + x, center.y + y, center.z + z);
            p.mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);

            // VELOCITY: Radial Explosion + Upward Bias
            const power = C.EXPLOSION_POWER || 20.0;
            const velBase = C.VELOCITY_Y_BASE || 8.0;
            const velVar = C.VELOCITY_Y_VAR || 10.0;

            const dir = new THREE.Vector3(x, y, z).normalize();
            if (dir.lengthSq() === 0) dir.set(0, 1, 0);

            // Randomize speed to break "shell" layering
            // range: 0.2x to 1.0x of max power
            const speed = power * (0.2 + Math.random() * 0.8);

            p.vel.copy(dir).multiplyScalar(speed);
            p.vel.y += velBase + Math.random() * velVar;

            // Init Flutter State
            p.tiltAngle = Math.random() * Math.PI;
            p.tiltAngleIncrement = (Math.random() * 0.1) + 0.05;
            p.wobble = Math.random() * Math.PI * 2;
            p.wobbleIncrement = (Math.random() * 0.1) + 0.05;

            // Random Colors
            const rndColor = Math.random();
            if (rndColor < 0.4) p.mesh.material.color.setHex(0x8a0303);
            else if (rndColor < 0.6) p.mesh.material.color.setHex(0x111111);
            else if (rndColor < 0.8) p.mesh.material.color.setHex(0xe3dac9);
            else p.mesh.material.color.setHex(0x2f4f4f);

            p.life = 2.0 + Math.random() * 1.5;

            // DEPTH SCALING: Map Z-position to Scale
            // Front (Z+) -> Big, Back (Z-) -> Small
            // Normalize Z (~ -Radius to +Radius) to 0..1
            // Adding a slight offset to ensure even back particles aren't invisible
            const rMax = C.SPAWN_RADIUS || 80.0;
            const sMin = C.SCALE_MIN || 0.3;
            const sMax = C.SCALE_MAX || 2.5;

            const depthNorm = (z + rMax) / (2 * rMax);
            const clampedDepth = Math.max(0, Math.min(1, depthNorm));

            const baseScale = sMin + clampedDepth * (sMax - sMin);
            p.baseScale = baseScale;
            p.mesh.scale.set(baseScale, baseScale, baseScale);
        }

        // REGENERATE FAST
        setTimeout(() => {
            if (!this.state.isExploded) return;
            this.state.isExploded = false;
            this.mesh.visible = true;
            this.state.isRegenerating = true;
            this.state.regrowthProgress = 0.0;

            this.state.regrowthOrigin = {
                x: (Math.random() - 0.5) * 30,
                y: -15,
                z: (Math.random() - 0.5) * 30
            };

            this.resetPhysics();
            this.mesh.position.set(this.state.regrowthOrigin.x, this.state.regrowthOrigin.y, this.state.regrowthOrigin.z);
            audioManager.playTone(100, 'sine', 0.3, 0.2);
        }, 50); // Tuned Delay
    }





    updateConfetti() {
        // this.updateDrips(); // REMOVED

        const now = Date.now();
        const C = APP_CONFIG.CONFETTI;

        // INTERACTIVITY: Cursor Repulsion
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const ray = this.raycaster.ray;

        this.particles.forEach((p) => {
            if (p.life > 0) {
                // PHASE 1: BALLISTIC (Launch) - Use Velocity
                // PHASE 2: FLUTTER (Fall) - Use Position Update

                // Dual-Zone Interaction Logic
                const distSq = ray.distanceSqToPoint(p.mesh.position);

                if (distSq < C.REPULSE_RADIUS_SQ) {
                    // ZONE 1: REPULSION (The Hole)
                    const target = new THREE.Vector3();
                    ray.closestPointToPoint(p.mesh.position, target);
                    const dir = new THREE.Vector3().subVectors(p.mesh.position, target).normalize();
                    p.vel.add(dir.multiplyScalar(C.REPULSE_STRENGTH));
                } else if (distSq < C.ATTRACT_RADIUS_SQ) {
                    // ZONE 2: ATTRACTION (The Wake)
                    const target = new THREE.Vector3();
                    ray.closestPointToPoint(p.mesh.position, target);
                    const dir = new THREE.Vector3().subVectors(target, p.mesh.position).normalize();
                    p.vel.add(dir.multiplyScalar(C.ATTRACT_STRENGTH));
                }

                // Integration
                p.mesh.position.add(p.vel);

                // Aerodynamics
                p.vel.y -= C.GRAVITY;
                p.vel.multiplyScalar(C.DRAG);

                // Terminal Velocity Cap
                if (p.vel.y < -C.TERMINAL_VEL) p.vel.y = -C.TERMINAL_VEL;

                // Flutter Physics
                // As upward velocity decays, flutter takes over
                p.tiltAngle += p.tiltAngleIncrement;
                p.wobble += p.wobbleIncrement;

                // Drift X based on Tilt (Simulate planing)
                const flutterX = Math.sin(p.tiltAngle) * C.FLUTTER_AMP * 0.1;
                const flutterZ = Math.cos(p.tiltAngle) * C.FLUTTER_AMP * 0.1;

                p.mesh.position.x += flutterX;
                p.mesh.position.z += flutterZ;

                // Rotation: Couple rotation with flutter phase
                p.mesh.rotation.z = p.tiltAngle;
                p.mesh.rotation.x = p.wobble;
                p.mesh.rotation.z = p.tiltAngle;
                p.mesh.rotation.x = p.wobble;
                p.mesh.rotation.z = p.tiltAngle;
                p.mesh.rotation.x = p.wobble;
                p.mesh.rotation.y += 0.02;

                // Simple Decay (No grounded logic)
                p.life -= C.LIFE_DECAY;

                if (p.life <= 0 || p.mesh.position.y < C.DEATH_Y) {
                    p.mesh.visible = false;
                    p.life = 0;
                }
                const lifeScale = Math.min(1.0, p.life * C.SCALE_FACTOR);
                const s = (p.baseScale || 0.1) * lifeScale;
                p.mesh.scale.set(s, s, s);
            }
        });
    }

    bindEvents() {
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2(); // Initialize this.mouse
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

                // GUARD: Ensure face exists to prevent crash
                if (!hit.face) return;

                // VERTEX ANCHORING: Find closest vertex on the face to lock the grab
                // This prevents "drift" as the mesh deforms
                const face = hit.face;
                const indices = [face.a, face.b, face.c];
                let minDistSq = Infinity;
                let closestIndex = -1;

                const posAttr = this.mesh.geometry.attributes.position;
                const vPos = new THREE.Vector3();

                // We must use CURRENT world positions to match the raycast hit
                // But we store the INDEX to reference ORIGINAL positions later
                indices.forEach(idx => {
                    vPos.fromBufferAttribute(posAttr, idx);
                    vPos.applyMatrix4(this.mesh.matrixWorld);
                    const dSq = vPos.distanceToSquared(hit.point);
                    if (dSq < minDistSq) {
                        minDistSq = dSq;
                        closestIndex = idx;
                    }
                });

                this.physics.grabIndex = closestIndex;
                this.physics.grabPoint.copy(hit.point);
                this.physics.localGrabPoint.copy(this.mesh.worldToLocal(hit.point.clone()));
                this.physics.dragOffset.set(0, 0, 0);

                this.calculateWeights();
                audioManager.playTone(150, 'square', 0.1, 0.3);
                this.canvas.style.cursor = 'grabbing';
                if (this.btnOutline) this.btnOutline.visible = false; // Hide on stretch
                // this.spawnDrip(); // Blood Effect DISABLED per user request
            }
        };

        const onMove = (e) => {
            const { x, y } = getNDC(e);
            this.mouse.set(x, y);
            // DEBUG: Trace mouse movement

            if (!this.state.isDragging || this.state.isExploded) return;

            if (Math.abs(x) > 0.95 || Math.abs(y) > 0.95) {
                this.explode();
                this.canvas.style.cursor = 'grab';
                return;
            }
            const ray = new THREE.Ray();
            ray.origin.setFromMatrixPosition(this.camera.matrixWorld);
            ray.direction.set(x, y, 0.5).unproject(this.camera).sub(ray.origin).normalize();
            const targetDist = this.physics.grabPoint.distanceTo(this.camera.position);
            const targetPos = ray.origin.clone().add(ray.direction.multiplyScalar(targetDist));
            this.physics.dragOffset.copy(targetPos).sub(this.physics.grabPoint);
            if (this.physics.dragOffset.y > 5) this.physics.targetPressY = 0;
            if (this.physics.dragOffset.length() > this.config.snapLimit) {
                this.explode();
                this.canvas.style.cursor = 'grab';
            }
        };

        const onUp = () => {
            // "STICKY HAND" BEHAVIOR:
            // Do NOT release on mouse up. The button stays stuck to the cursor
            // until it bursts (explode) or resets.
            this.canvas.style.cursor = 'grabbing'; // Keep distinct cursor
        };

        const c = this.canvas;
        c.addEventListener('mousedown', onDown);
        c.addEventListener('touchstart', onDown, { passive: false });
        window.addEventListener('mousemove', onMove);
        window.addEventListener('touchmove', onMove, { passive: false });
        window.addEventListener('mouseup', onUp);
        window.addEventListener('touchend', onUp);
    }

    calculateWeights() {
        const pos = this.originalPositions;

        // Use the ORIGINAL position of the anchored vertex as field center
        // This ensures the weight field moves WITH the material point, not space
        const idx = this.physics.grabIndex;
        if (idx === -1 || idx === undefined) return;

        const cx = pos[idx * 3];
        const cy = pos[idx * 3 + 1];
        const cz = pos[idx * 3 + 2];
        const grabY = Math.max(0.1, cy); // Use original Y reference

        for (let i = 0; i < pos.length; i += 3) {
            const dx = pos[i] - cx;
            const dy = pos[i + 1] - cy;
            const dz = pos[i + 2] - cz;
            const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

            // Lorentzian (Cauchy) Distribution: 1 / (1 + (distance/softness)^2)
            // Round peak (derivative is 0 at distance 0) eliminates sharp point
            // Smooth tail eliminates sharp corners on sides
            let x = dist / this.config.softness;
            let w = 1.0 / (1.0 + x * x);

            if (pos[i + 1] < grabY) {
                let pin = Math.max(0, pos[i + 1] / grabY);
                // Relaxed pinning from 0.8 to 0.3 to remove "shoulder" artifacts
                // Allows deformation to gently fade out down the shaft
                w *= Math.pow(pin, 0.3);
            }
            this.weights[i / 3] = w;
        }
    }

    startLoop() {
        const clock = new THREE.Clock();
        const animate = () => {
            requestAnimationFrame(animate);
            const dt = Math.min(clock.getDelta(), 0.1);
            if (this.isActive) this.localTime += dt * 1000;

            this.updateConfetti();

            if (this.isActive && this.mesh.visible) {
                this.updateHeartbeat();
                this.physics.pressY += (this.physics.targetPressY - this.physics.pressY) * 0.6;
                if (!this.state.isRegenerating) {
                    this.mesh.position.y = this.physics.pressY;
                }
                this.updateDeformation();
            }
            this.updatePhysics(dt);
            if (this.isActive) {
                // Render Main Scene (Bottom)
                this.renderer.render(this.scene, this.camera);

                // Render Confetti Scene (Top)
                if (this.rendererConfetti && this.state.isExploded) {
                    this.confettiGroup.visible = true;
                    this.rendererConfetti.render(this.sceneConfetti, this.camera);
                } else if (this.rendererConfetti) {
                    this.rendererConfetti.clear();
                }
            }
        };
        animate();
    }

    updateHeartbeat() {
        const now = this.localTime;
        const phase = now % this.config.beatRate;

        if (this.state.isRegenerating) {
            this.state.regrowthProgress += 0.04; // TUNED: Slower than instant

            if (this.state.regrowthProgress >= 1.0) {
                this.state.regrowthProgress = 1.0;
                this.state.isRegenerating = false;
                this.mesh.position.set(0, this.physics.pressY, 0);
                this.mesh.rotation.set(0, 0, 0);
                this.mesh.scale.set(1, 0.7, 1);
            } else {
                const t = this.state.regrowthProgress;
                const origin = this.state.regrowthOrigin || { x: 0, y: -20, z: 0 };
                const ease = 1 - Math.pow(1 - t, 4);
                this.mesh.position.x = origin.x * (1 - ease);
                this.mesh.position.z = origin.z * (1 - ease);
                this.mesh.position.y = origin.y * (1 - ease) + this.physics.pressY;
                const s = (1 - Math.pow(1 - t, 3)) + (Math.sin(t * Math.PI) * 0.1 * (1.0 - t));
                const n = 0.03 * (1 - ease);
                this.mesh.scale.set(s + n, s * 0.7 + n, s - n);
                this.mesh.rotation.z = Math.sin(t * Math.PI) * 0.05;
                this.mesh.rotation.x = Math.cos(t * Math.PI) * 0.05;
                return;
            }
        }

        // Heartbeat Pulse Visualization
        let pulse = 1.0;
        // Pulse duration: 300ms
        const pulseDur = 300;

        if (phase < pulseDur) {
            // Sine wave for smooth expansion/contraction
            // Increased amplitude 0.008 -> 0.05 for clear visibility
            pulse = 1.0 + Math.sin((phase / pulseDur) * Math.PI) * 0.05;
        }
        this.mesh.scale.set(pulse, 0.7 * pulse, pulse);

        // Jitter Effect during beat
        // Only jitter during the pulse window
        if (phase < pulseDur) {
            this.mesh.position.x = (Math.random() - 0.5) * 0.5; // Increased jitter
            this.mesh.position.z = (Math.random() - 0.5) * 0.5;
        } else {
            this.mesh.position.x = 0;
            this.mesh.position.z = 0;
        }
        this.mesh.position.y = this.physics.pressY;

        // Audio Trigger - Robust Check
        // Reset beatPhase only when we are far past the beat window to prevent multi-trigger
        if (phase > pulseDur && this.state.beatPhase === 1) {
            this.state.beatPhase = 0;
        }

        // Trigger beat at the start of the phase
        if (phase < 50 && this.state.beatPhase === 0) {
            const vol = this.state.isRegenerating ? 0.5 : 1.0; // TUNED: Max Volume (1.0)
            // Use 'triangle' wave at 80Hz. 
            // 55Hz sine is sub-bass and often inaudible on laptops/phones.
            // Triangle adds harmonics, making the "thump" richer and easier to hear.
            audioManager.playTone(80, 'triangle', 0.15, vol);
            this.state.beatPhase = 1; // Mark as played
        }
    }

    updatePhysics(dt) {
        if (this.state.isExploded) return;
    }

    updateDeformation() {
        const P = this.physics;
        const positions = this.mesh.geometry.attributes.position.array;

        if (!this.state.isDragging) {
            // Spring Force: F = -k * x
            const force = P.dragOffset.clone().multiplyScalar(-this.config.stiffness);
            P.returnVelocity.add(force).multiplyScalar(this.config.damping);
            P.dragOffset.add(P.returnVelocity);
            if (P.dragOffset.lengthSq() < 0.01 && P.returnVelocity.lengthSq() < 0.01) {
                P.dragOffset.set(0, 0, 0); P.returnVelocity.set(0, 0, 0);
            }
        }

        if (P.dragOffset.lengthSq() > 0.001 || this.state.isDragging) {
            const localDrag = P.dragOffset.clone();
            localDrag.x /= this.mesh.scale.x; localDrag.y /= this.mesh.scale.y; localDrag.z /= this.mesh.scale.z;
            let effDragY = localDrag.y;
            let radialSquash = 0;

            let globalCompression = 0;
            if (localDrag.y < 0) {
                // SQUASH (Push Down)
                effDragY *= 0.1;
                radialSquash = -localDrag.y * 0.4;
                globalCompression = Math.min(80.0, -localDrag.y); // Clamped to prevent math explosion
            } else {
                // NECKING (Push Up) - "Slime Strand" effect
                // Contract the width as we stretch up (Poisson ratio)
                // This prevents the "lipstick cylinder" look
                radialSquash = -localDrag.y * 0.3;
            }

            for (let i = 0; i < this.weights.length; i++) {
                const w = this.weights[i];
                if (w < 0.001) {
                    positions[i * 3] = this.originalPositions[i * 3];
                    positions[i * 3 + 1] = this.originalPositions[i * 3 + 1];
                    positions[i * 3 + 2] = this.originalPositions[i * 3 + 2];
                    continue;
                }
                const ox = this.originalPositions[i * 3];
                const oz = this.originalPositions[i * 3 + 2];
                const oy = this.originalPositions[i * 3 + 1]; // Need Y for profile

                // Local Squash (Pinch)
                const sxLocal = ox * radialSquash * 0.01 * w;
                const szLocal = oz * radialSquash * 0.01 * w;

                // Global Bulge (Volumetric Spread)
                // Expands the "belly" when compressed to cover the bezel
                // Profile peaks at mid-height (approx 33, button height 66)
                // Sine wave ensures base and top don't bulge excessively
                const profile = Math.sin((Math.max(0, oy) / 66.0) * Math.PI);
                const gSquashFactor = globalCompression * this.config.bulgeStrength * 0.01 * Math.max(0, profile);

                // SAFETY: Prevent Mesh Inversion or NaN
                // Combine local and global squash factors
                // If sum < -0.9, we are inverting the mesh (turning it inside out) -> Clamp it
                let totalSquash = (radialSquash * 0.01 * w) + gSquashFactor;
                if (totalSquash < -0.9) totalSquash = -0.9;

                // Fallback instead of skipping to prevent "frozen" vertices
                if (isNaN(totalSquash)) totalSquash = 0;
                if (isNaN(w)) w = 0;

                // Apply safe squash
                const sxTotal = ox * totalSquash;
                const szTotal = oz * totalSquash;

                let px = ox + (localDrag.x * w) + sxTotal;
                let pz = oz + (localDrag.z * w) + szTotal;
                let py = this.originalPositions[i * 3 + 1] + (effDragY * w);

                // Final NaN Guard - Reset to original if calculation fails
                if (isNaN(px) || isNaN(py) || isNaN(pz)) {
                    px = ox; py = oy; pz = oz;
                }

                positions[i * 3] = px;
                positions[i * 3 + 2] = pz;

                // Restored limitY clamping to fix bottom clipping
                // Ensure vertices don't go below the base (y=0 or specific limit)
                if (py < -15) py = -15;
                positions[i * 3 + 1] = py;
            }
            this.mesh.geometry.attributes.position.needsUpdate = true;
            this.mesh.geometry.computeVertexNormals();
        }
    }

    resetPhysics() {
        this.physics.dragOffset.set(0, 0, 0);
        this.physics.returnVelocity.set(0, 0, 0);
        this.physics.grabPoint.set(0, 0, 0);
        this.physics.localGrabPoint.set(0, 0, 0);
        this.physics.pressY = 0;
        this.physics.targetPressY = 0;
        this.weights.fill(0);
        this.mesh.geometry.attributes.position.array.set(this.originalPositions);
        this.mesh.geometry.attributes.position.needsUpdate = true;
        this.mesh.position.y = 0;
        this.mesh.geometry.computeVertexNormals();
        if (this.btnOutline) this.btnOutline.visible = true; // Show when reset
    }

    onResize() {
        if (!this.camera || !this.renderer) return;
        const w = window.innerWidth;
        const h = window.innerHeight;
        this.camera.aspect = w / h;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(w, h);
        if (this.rendererConfetti) this.rendererConfetti.setSize(w, h);
    }

    setActive(active) {
        this.isActive = active;
        if (active) {
            this.localTime = 0;
            this.state.beatPhase = 0;
            this.onResize();
            if (this.canvas) this.canvas.style.display = 'block';
            if (this.confettiCanvas) this.confettiCanvas.style.display = 'block';
        } else {
            if (this.canvas) this.canvas.style.display = 'none';
            if (this.confettiCanvas) this.confettiCanvas.style.display = 'none';
        }
    }
}

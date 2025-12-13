import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { audioManager } from '../utils/AudioManager.js';

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
        this.canvas = document.getElementById('buttonCanvas');
        if (!this.canvas) return;

        // Configuration
        this.config = {
            snapLimit: 120.0, // Sticky/Stretchy Balance
            softness: 200.0, // Liquid/Gooey Feel
            gravity: 0.15,
            beatRate: 1200,
        };

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
            targetPressY: 0,
            drips: []
        };

        // Systems
        this.scene = null;
        this.camera = null;
        this.renderer = null;
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
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

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
        const domeGeo = new THREE.SphereGeometry(66, 64, 32, 0, Math.PI * 2, 0, Math.PI / 2);
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

        // Drip Assets (Reusable)
        this.dripGeo = new THREE.SphereGeometry(3, 8, 8);
        this.dripMat = new THREE.MeshPhysicalMaterial({
            color: 0x8a0303, roughness: 0.1, metalness: 0.1,
            transmission: 0.2, thickness: 2.0 // Viscous look
        });
        this.dripGroup = new THREE.Group();
        this.pivot.add(this.dripGroup);
    }

    initConfetti() {
        const count = 600;
        this.confettiIndex = 0;
        this.confettiGroup = new THREE.Group();
        this.scene.add(this.confettiGroup);

        const geo = new THREE.PlaneGeometry(6, 6);
        const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });

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

        audioManager.playTone(400, 'sine', 0.1);
        audioManager.playTone(600, 'triangle', 0.15);

        // origin: Shoot from underneath (Deep inside pillar)
        let center = new THREE.Vector3(0, -60, 0);

        // Confetti Burst
        const batchSize = 150;
        const total = this.particles.length;

        for (let i = 0; i < batchSize; i++) {
            const p = this.particles[this.confettiIndex % total];
            this.confettiIndex++;

            p.mesh.visible = true;
            p.life = 1.0;
            p.mesh.position.copy(center).addScalar((Math.random() - 0.5) * 5);
            p.mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);

            p.vel.set(
                (Math.random() - 0.5) * 12.0,
                6.0 + Math.random() * 4.0, // TUNED: Very Low burst (User Request)
                (Math.random() - 0.5) * 12.0
            );

            p.rotVel.set(Math.random() * 0.2, Math.random() * 0.2, Math.random() * 0.2);

            // Random Colors
            const r = Math.random();
            if (r < 0.4) p.mesh.material.color.setHex(0x8a0303);
            else if (r < 0.6) p.mesh.material.color.setHex(0x111111);
            else if (r < 0.8) p.mesh.material.color.setHex(0xe3dac9);
            else p.mesh.material.color.setHex(0x2f4f4f);

            p.life = 2.0 + Math.random() * 1.5;
            p.mesh.scale.set(0.1, 0.1, 0.1);
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

    spawnDrip() {
        const count = 1 + Math.floor(Math.random() * 2); // 1-3 drips
        for (let i = 0; i < count; i++) {
            const mesh = new THREE.Mesh(this.dripGeo, this.dripMat);

            // POOLING: Spawn on top surface (Pillar top is ~ -20)
            // Spawn around the button base (radius ~70)
            const angle = Math.random() * Math.PI * 2;
            const r = 60 + Math.random() * 15;
            const x = Math.cos(angle) * r;
            const z = Math.sin(angle) * r;

            mesh.position.set(x, -20.2, z); // Just above surface

            // Random Scale
            const s = 0.8 + Math.random() * 1.2; // Slightly bigger puddles
            mesh.scale.set(s, s * 0.1, s); // Flattened initially

            this.dripGroup.add(mesh);

            // Velocity: Outward spread
            const speed = 0.5 + Math.random() * 2.0;

            this.physics.drips.push({
                mesh: mesh,
                vx: Math.cos(angle) * speed,
                vz: Math.sin(angle) * speed,
                vy: 0,
                state: 'pooling', // 'pooling' or 'falling'
                active: true,
                friction: 0.92 + Math.random() * 0.04,
                stopY: -100 - Math.random() * 400
            });
        }
    }

    updateDrips() {
        // Pillar edges are +/- 110
        const EDGE = 110;

        for (let i = this.physics.drips.length - 1; i >= 0; i--) {
            const d = this.physics.drips[i];
            if (!d.active) continue;

            if (d.state === 'pooling') {
                // Spread
                d.mesh.position.x += d.vx;
                d.mesh.position.z += d.vz;

                // Friction
                d.vx *= d.friction;
                d.vz *= d.friction;

                // Check Edges
                const x = d.mesh.position.x;
                const z = d.mesh.position.z;

                if (Math.abs(x) > EDGE || Math.abs(z) > EDGE) {
                    // OVERFLOW!
                    d.state = 'falling';

                    // Snap to edge
                    if (Math.abs(x) > EDGE) d.mesh.position.x = Math.sign(x) * EDGE;
                    if (Math.abs(z) > EDGE) d.mesh.position.z = Math.sign(z) * EDGE;

                    // Kill horizontal velocity, start gravity
                    d.vx = 0; d.vz = 0;

                    // Plump up shape (was flat puddle, now drop)
                    const s = d.mesh.scale.x;
                    d.mesh.scale.set(s, s, s);
                }

                // Stop pooling if too slow? 
                // No, keep them "wet" until they fall or exist forever. 
                // Maybe extremely slow stop?
                if (Math.abs(d.vx) < 0.01 && Math.abs(d.vz) < 0.01) {
                    // Stays as a static puddle
                }

            } else if (d.state === 'falling') {
                d.vy -= 0.15; // Gravity
                d.mesh.position.y += d.vy;
                d.vy *= d.friction; // Viscosity on side

                // Stop logic
                if (d.mesh.position.y < d.stopY || Math.abs(d.vy) < 0.01) {
                    d.active = false; // Freeze
                }
            }

            // Limit count logic
            if (this.physics.drips.length > 200) {
                const old = this.physics.drips.shift();
                if (old && old.mesh.parent) old.mesh.parent.remove(old.mesh);
            }
        }
    }

    updateConfetti() {
        this.updateDrips();
        const now = Date.now();
        this.particles.forEach((p) => {
            if (p.life > 0) {
                p.mesh.position.add(p.vel);
                p.vel.y -= 0.15; // TUNED: High Gravity (Fast Fall)
                p.vel.multiplyScalar(0.99);

                const sSpeed = p.swaySpeed || 0.005;
                const sOffset = p.swayOffset || 0;
                const sway = Math.sin(now * sSpeed + sOffset) * 0.1;
                p.mesh.position.x += sway; p.mesh.position.z += sway;

                p.mesh.rotation.x += p.rotVel.x * 0.5;
                p.mesh.rotation.y += p.rotVel.y * 0.5;
                p.mesh.rotation.z += p.rotVel.z * 0.5;

                p.life -= 0.005;

                if (p.life <= 0 || p.mesh.position.y < -100) {
                    p.mesh.visible = false;
                    p.life = 0;
                }
                const s = Math.min(1.0, p.life * 5.0);
                p.mesh.scale.set(s, s, s);
            }
        });
    }

    bindEvents() {
        this.raycaster = new THREE.Raycaster();
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
                audioManager.playTone(150, 'square', 0.1, 0.3);
                this.canvas.style.cursor = 'grabbing';
                if (this.btnOutline) this.btnOutline.visible = false; // Hide on stretch
                // this.spawnDrip(); // Blood Effect DISABLED per user request
            }
        };

        const onMove = (e) => {
            if (!this.state.isDragging || this.state.isExploded) return;
            const { x, y } = getNDC(e);
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
            if (this.state.isDragging) {
                this.canvas.style.cursor = 'grabbing';
                // Note: outline comes back only when completely reset, or we can bring it back here if not exploded
                // Re-enable in resetPhysics is cleaner for the "snap back" feel
            }
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
        const localGrab = this.physics.localGrabPoint;
        const grabY = Math.max(0.1, localGrab.y);

        for (let i = 0; i < pos.length; i += 3) {
            const dx = pos[i] - localGrab.x;
            const dy = pos[i + 1] - localGrab.y;
            const dz = pos[i + 2] - localGrab.z;
            const distSq = dx * dx + dy * dy + dz * dz;
            let w = Math.exp(-distSq / (2 * this.config.softness * this.config.softness));
            if (pos[i + 1] < grabY) {
                let pin = Math.max(0, pos[i + 1] / grabY);
                w *= Math.pow(pin, 0.8);
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
                if (this.state.isExploded) this.confettiGroup.visible = true;
                this.renderer.render(this.scene, this.camera);
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

        let pulse = 1.0;
        if (phase < 300) {
            pulse = 1.0 + Math.sin((phase / 300) * Math.PI) * 0.008;
        }
        this.mesh.scale.set(pulse, 0.7 * pulse, pulse);
        this.mesh.position.x = (Math.random() - 0.5) * 0.2;
        this.mesh.position.z = (Math.random() - 0.5) * 0.2;
        this.mesh.position.y = this.physics.pressY;

        if (phase < 50 && this.state.beatPhase === 0) {
            const vol = this.state.isRegenerating ? 0.1 : 0.2;
            audioManager.playTone(55, 'sine', 0.2, vol);
            this.state.beatPhase = 1;
        }
        if (phase > 500) this.state.beatPhase = 0;
    }

    updatePhysics(dt) {
        if (this.state.isExploded) return;
    }

    updateDeformation() {
        const P = this.physics;
        const positions = this.mesh.geometry.attributes.position.array;

        if (!this.state.isDragging) {
            const force = P.dragOffset.clone().multiplyScalar(-0.1);
            P.returnVelocity.add(force).multiplyScalar(0.85);
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

            if (localDrag.y < 0) {
                effDragY *= 0.1; radialSquash = -localDrag.y * 0.4;
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
                const sx = ox * radialSquash * 0.01 * w;
                const sz = oz * radialSquash * 0.01 * w;
                positions[i * 3] = ox + (localDrag.x * w) + sx;
                positions[i * 3 + 2] = oz + (localDrag.z * w) + sz;
                let newY = this.originalPositions[i * 3 + 1] + (effDragY * w);
                const limitY = (2.0 - P.pressY) / this.mesh.scale.y;
                newY = Math.max(limitY, newY);
                positions[i * 3 + 1] = newY;
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
    }

    setActive(active) {
        this.isActive = active;
        if (active) {
            this.localTime = 0;
            this.state.beatPhase = 0;
            this.onResize();
            if (this.canvas) this.canvas.style.display = 'block';
        } else {
            if (this.canvas) this.canvas.style.display = 'none';
        }
    }
}

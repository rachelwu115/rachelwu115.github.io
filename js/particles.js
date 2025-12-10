export function initParticles() {
    // Particle System for Cursor Following

    // Wait for DOM to be ready if not already (though init functions are usually called on DOMContentLoaded)
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', startParticles);
    } else {
        startParticles();
    }

    function startParticles() {
        const canvas = document.getElementById('particleCanvas');
        if (!canvas) {
            console.error('Canvas element not found');
            return;
        }

        const ctx = canvas.getContext('2d');
        if (!ctx) {
            console.error('Could not get 2D context');
            return;
        }

        // Set canvas size
        function resizeCanvas() {
            const width = window.innerWidth;
            const height = window.innerHeight;
            canvas.width = width;
            canvas.height = height;
        }
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);

        // Particle class
        class Particle {
            constructor(x, y) {
                this.x = x;
                this.y = y;
                this.size = Math.random() * 4 + 2;
                this.speedX = (Math.random() - 0.5) * 0.5;
                this.speedY = (Math.random() - 0.5) * 0.5;
                this.opacity = Math.random() * 0.4 + 0.6;
                this.color = `rgba(217, 117, 87, ${this.opacity})`; // Using primary color
            }

            update(mouseX, mouseY) {
                // Calculate distance from particle to mouse
                const dx = mouseX - this.x;
                const dy = mouseY - this.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                // Attract particles to cursor with smooth easing
                if (distance < 150) {
                    const force = (150 - distance) / 150;
                    this.speedX += (dx / distance) * force * 0.05;
                    this.speedY += (dy / distance) * force * 0.05;
                }

                // Apply friction
                this.speedX *= 0.95;
                this.speedY *= 0.95;

                // Update position
                this.x += this.speedX;
                this.y += this.speedY;

                // Keep particles within bounds with slight bounce
                if (this.x < 0 || this.x > canvas.width) {
                    this.speedX *= -0.8;
                    this.x = Math.max(0, Math.min(canvas.width, this.x));
                }
                if (this.y < 0 || this.y > canvas.height) {
                    this.speedY *= -0.8;
                    this.y = Math.max(0, Math.min(canvas.height, this.y));
                }
            }

            draw() {
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fillStyle = this.color;
                ctx.fill();
            }
        }

        // Create particles
        const particles = [];
        const particleCount = 80;
        let mouseX = window.innerWidth / 2;
        let mouseY = window.innerHeight / 2;

        // Initialize particles randomly across the canvas
        // Ensure canvas is sized before creating particles
        const initWidth = canvas.width || window.innerWidth;
        const initHeight = canvas.height || window.innerHeight;

        for (let i = 0; i < particleCount; i++) {
            particles.push(new Particle(
                Math.random() * initWidth,
                Math.random() * initHeight
            ));
        }

        // Track mouse position
        document.addEventListener('mousemove', (e) => {
            mouseX = e.clientX;
            mouseY = e.clientY;
        });

        // Draw connections between nearby particles
        function drawConnections() {
            for (let i = 0; i < particles.length; i++) {
                for (let j = i + 1; j < particles.length; j++) {
                    const dx = particles[i].x - particles[j].x;
                    const dy = particles[i].y - particles[j].y;
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    if (distance < 120) {
                        ctx.beginPath();
                        ctx.strokeStyle = `rgba(217, 117, 87, ${0.2 * (1 - distance / 120)})`;
                        ctx.lineWidth = 1;
                        ctx.moveTo(particles[i].x, particles[i].y);
                        ctx.lineTo(particles[j].x, particles[j].y);
                        ctx.stroke();
                    }
                }
            }
        }

        // Animation loop
        function animate() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Update and draw particles
            particles.forEach(particle => {
                particle.update(mouseX, mouseY);
                particle.draw();
            });

            // Draw connections
            drawConnections();

            requestAnimationFrame(animate);
        }

        // Start animation
        animate();
    }
}

export class GalleryNav {
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

        // KEYBOARD NAVIGATION
        window.addEventListener('keydown', (e) => {
            // Only navigate if we aren't typing in a tangible input (though our input is invisible)
            // But allow Left/Right to switch even if typing?
            // User Request: "switch between the two pieces for me"
            if (e.key === 'ArrowRight') this.switchExhibit(2);
            if (e.key === 'ArrowLeft') this.switchExhibit(1);
        });
    }

    switchExhibit(id) {
        if (id === this.currentExhibit) return;
        if (this.isTransitioning) return; // Prevent spamming

        this.isTransitioning = true;
        const currentId = this.currentExhibit;
        const direction = id > currentId ? 'next' : 'prev';

        // 1. SELECT ELEMENTS
        const currentEl = this.exhibits[currentId];
        const nextEl = this.exhibits[id];

        // 2. DETERMINE CLASSES
        // Next: Current goes Left, Next comes from Right
        // Prev: Current goes Right, Next comes from Left
        const outClass = direction === 'next' ? 'slide-out-left' : 'slide-out-right';
        const inClass = direction === 'next' ? 'slide-in-right' : 'slide-in-left';

        // 3. APPLY ANIMATION STATES
        // Ensure next element is visible for animation
        if (nextEl) {
            nextEl.classList.add(inClass);
            // nextEl.classList.add('active'); // Wait, let's keep it 'active' managed by logic
        }
        if (currentEl) {
            currentEl.classList.add(outClass);
        }

        // 4. CLEANUP ON END
        const onEnd = () => {
            this.isTransitioning = false;

            // Clean classes
            if (currentEl) {
                currentEl.classList.remove('active', 'slide-out-left', 'slide-out-right');
            }
            if (nextEl) {
                nextEl.classList.remove('slide-in-right', 'slide-in-left');
                nextEl.classList.add('active'); // Now officially active
            }

            // Remove listeners (safeguard)
            if (currentEl) currentEl.removeEventListener('animationend', onEnd);
            if (nextEl) nextEl.removeEventListener('animationend', onEnd);
        };

        // Attach listener to the Incoming element (it determines the 'arrival')
        if (nextEl) {
            nextEl.addEventListener('animationend', onEnd, { once: true });
        } else {
            // Fallback if no next element (shouldn't happen)
            onEnd();
        }

        // 5. UPDATE STATE
        this.currentExhibit = id;

        // Notify other systems
        window.dispatchEvent(new CustomEvent('exhibit-changed', { detail: { id } }));

        // Update Arrows
        if (id === 1) {
            if (this.nextBtn) this.nextBtn.style.display = 'block';
            if (this.prevBtn) this.prevBtn.style.display = 'none';
        } else if (id === 2) {
            if (this.nextBtn) this.nextBtn.style.display = 'none';
            if (this.prevBtn) this.prevBtn.style.display = 'block';
        }

        // Manage Button State
        if (window.rubberButton) {
            window.rubberButton.setActive(id === 2);
        }
    }
}

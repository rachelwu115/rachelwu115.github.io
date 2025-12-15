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
        // 1. UPDATE NAVIGATION & NAV STATE
        this.currentExhibit = id;

        // Notify other systems (Decoupled Architecture)
        window.dispatchEvent(new CustomEvent('exhibit-changed', { detail: { id } }));

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

        // 2. EXHIBIT SPECIFIC LOGIC
        // 3. MANAGE BUTTON STATE (Audio/Physics)
        if (window.rubberButton) {
            window.rubberButton.setActive(id === 2);
        }

        if (id === 2) {
            // Safe Init (Though usually init happens at main)
            try {
                // If we want lazy loading, we could do it here, but keeping it simple for now.
            } catch (err) {
                console.error("Exhibit Switch Failed:", err);
            }
        }
    }
}

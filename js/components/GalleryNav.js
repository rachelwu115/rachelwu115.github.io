export class GalleryNav {
    constructor() {
        this.nextBtn = document.getElementById('navNext');
        this.prevBtn = document.getElementById('navPrev');
        this.exhibits = {
            1: document.getElementById('exhibit-1'),
            2: document.getElementById('exhibit-2')
        };
        this.buttonCanvas = document.getElementById('buttonCanvas');
        this.currentExhibit = 1;
        this.isTransitioning = false;
        this.init();
    }

    init() {
        if (this.nextBtn) this.nextBtn.addEventListener('click', () => this.switchExhibit(2));
        if (this.prevBtn) this.prevBtn.addEventListener('click', () => this.switchExhibit(1));

        // KEYBOARD NAVIGATION
        window.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowRight') this.switchExhibit(2);
            if (e.key === 'ArrowLeft') this.switchExhibit(1);
        });

        // TOUCH / SWIPE NAVIGATION
        // Minimal swipe detection for mobile users
        let touchStartX = 0;
        let touchStartY = 0;

        window.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
            touchStartY = e.changedTouches[0].screenY;
        }, { passive: true });

        window.addEventListener('touchend', (e) => {
            const touchEndX = e.changedTouches[0].screenX;
            const touchEndY = e.changedTouches[0].screenY;

            this.handleSwipe(touchStartX, touchStartY, touchEndX, touchEndY);
        }, { passive: true });

        // REVEAL BUTTON LABEL (Fixed layout, just needs to fade in)
        setTimeout(() => {
            const btnLabel = document.querySelector('.button-label');
            if (btnLabel) btnLabel.classList.add('layout-stabilized');
        }, 100);
    }

    handleSwipe(startX, startY, endX, endY) {
        const diffX = startX - endX;
        const diffY = startY - endY;

        // Thresholds
        const minSwipeDistance = 50;
        const maxVerticalVariance = 100; // Ignore if user scrolled weirdly up/down

        // Check horizontal dominance (ensure it's a swipe, not a scroll)
        if (Math.abs(diffX) > minSwipeDistance && Math.abs(diffY) < maxVerticalVariance) {
            if (diffX > 0) {
                // Swiped Left -> Next
                this.switchExhibit(2);
            } else {
                // Swiped Right -> Prev
                this.switchExhibit(1);
            }
        }
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
        const canvas = this.buttonCanvas;

        // 2. DETERMINE CLASSES
        const outClass = direction === 'next' ? 'slide-out-left' : 'slide-out-right';
        const inClass = direction === 'next' ? 'slide-in-right' : 'slide-in-left';

        // 3. PREPARE CANVAS STATE (Render before Slide In)
        if (id === 2 && window.rubberButton) {
            window.rubberButton.setActive(true); // Start rendering off-screen
            if (canvas) canvas.classList.add(inClass);
        }
        if (currentId === 2 && canvas) {
            canvas.classList.add(outClass);
        }

        // 4. APPLY ANIMATION STATES
        if (nextEl) nextEl.classList.add(inClass);
        if (currentEl) currentEl.classList.add(outClass);

        // 5. CLEANUP ON END
        const onEnd = () => {
            this.isTransitioning = false;

            // Clean classes (HTML)
            if (currentEl) currentEl.classList.remove('active', 'slide-out-left', 'slide-out-right');
            if (nextEl) {
                nextEl.classList.remove('slide-in-right', 'slide-in-left');
                nextEl.classList.add('active');
            }

            // Clean classes (Canvas)
            if (canvas) canvas.classList.remove('slide-in-right', 'slide-in-left', 'slide-out-left', 'slide-out-right');

            // Stop Rendering if we left the Button exhibit
            if (currentId === 2 && window.rubberButton) {
                window.rubberButton.setActive(false);
            }

            // Cleanup listeners
            if (currentEl) currentEl.removeEventListener('animationend', onEnd);
            if (nextEl) nextEl.removeEventListener('animationend', onEnd);
        };

        // Attach listener
        if (nextEl) {
            nextEl.addEventListener('animationend', onEnd, { once: true });
        } else {
            onEnd();
        }

        // 6. UPDATE STATE
        this.currentExhibit = id;
        window.dispatchEvent(new CustomEvent('exhibit-changed', { detail: { id } }));

        // Update Arrows
        if (id === 1) {
            if (this.nextBtn) this.nextBtn.style.display = 'block';
            if (this.prevBtn) this.prevBtn.style.display = 'none';
            if (this.nextBtn) this.nextBtn.style.display = 'none';
            if (this.prevBtn) this.prevBtn.style.display = 'block';
        }

        this.updateWallpaper(id);
    }

    updateWallpaper(index) {
        const wallpaper = document.getElementById('wallpaper');
        if (!wallpaper) return;

        // Simple parallax shift: Move background LEFT as user moves RIGHT (Next)
        // Index 1 (Start) -> 0vw
        // Index 2 (Next)  -> -10vw
        const shiftAmount = (index - 1) * -10;
        wallpaper.style.transform = `translateX(${shiftAmount}vw)`;
    }
}

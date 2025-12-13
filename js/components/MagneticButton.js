import { APP_CONFIG } from '../config.js';

export class MagneticButton {
    constructor() {
        this.area = document.querySelector(APP_CONFIG.MAGNETIC.AREA_SELECTOR);
        this.btn = document.querySelector(APP_CONFIG.MAGNETIC.BUTTON_SELECTOR);
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

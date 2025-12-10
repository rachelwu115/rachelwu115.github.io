export class MagneticButton {
    constructor(element, strength = 20) {
        this.element = element;
        this.strength = strength;
        this.boundHandleMouseMove = this.handleMouseMove.bind(this);
        this.boundHandleMouseLeave = this.handleMouseLeave.bind(this);
        
        this.init();
    }

    init() {
        this.element.addEventListener('mousemove', this.boundHandleMouseMove);
        this.element.addEventListener('mouseleave', this.boundHandleMouseLeave);
        
        // Ensure the element can be transformed
        this.element.style.display = 'inline-block';
        this.element.style.transition = 'transform 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
    }

    handleMouseMove(e) {
        const rect = this.element.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        // Calculate distance from center
        const distanceX = e.clientX - centerX;
        const distanceY = e.clientY - centerY;
        
        // Apply magnetic pull (reduced by strength factor)
        // Stronger pull = move closer to mouse
        const x = distanceX / (100 / this.strength);
        const y = distanceY / (100 / this.strength);
        
        this.element.style.transform = `translate(${x}px, ${y}px)`;
        // Remove transition during movement for instant responsiveness
        this.element.style.transition = 'none';
    }

    handleMouseLeave() {
        // Snap back to center
        this.element.style.transform = 'translate(0px, 0px)';
        // Add elastic snap-back
        this.element.style.transition = 'transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
    }
}

export function initMagnetic(selector = '.nav-link', strength = 30) {
    const elements = document.querySelectorAll(selector);
    elements.forEach(el => new MagneticButton(el, strength));
}

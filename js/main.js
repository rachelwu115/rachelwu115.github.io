import { initNavigation } from './navigation.js';
import { initAnimations } from './animations.js';
import { initParallax } from './parallax.js';
import { initInteractions } from './interactions.js';
import { initParticles } from './particles.js';

document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initAnimations();
    initParallax();
    initInteractions();
    initParticles();
});

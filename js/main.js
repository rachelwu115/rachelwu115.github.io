import { initNavigation } from './navigation.js';
import { initAnimations } from './animations.js';
import { initParallax } from './parallax.js';
import { initInteractions } from './interactions.js';
import { initParticles } from './particles.js';
import { initMagnetic } from './magnetic.js';

document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initAnimations();
    initParallax();
    initInteractions();
    initParticles();
    initMagnetic('.nav-link', 40); // Strength 40 for distinct effect
});

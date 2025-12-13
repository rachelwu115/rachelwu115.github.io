/**
 * MAIN ENTRY POINT
 * Orchestrates the initialization of the Mirror System components.
 */
import { MagneticButton } from './components/MagneticButton.js';
import { Mirror } from './components/Mirror.js';
import { GalleryNav } from './components/GalleryNav.js';
import { RubberButton } from './components/RubberButton.js';

document.addEventListener('DOMContentLoaded', () => {
    // 1. Init Interaction Wrappers
    new MagneticButton();

    // 2. Init Core Systems
    new Mirror();
    new GalleryNav();

    // 3. Init Heavy Systems (Three.js)
    try {
        console.log("Initializing RubberButton...");
        window.rubberButton = new RubberButton();
        console.log("RubberButton Initialized.");
    } catch (e) {
        console.error("CRITICAL: RubberButton Crash", e);
    }
});

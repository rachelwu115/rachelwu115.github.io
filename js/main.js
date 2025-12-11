/**
 * Main Entry Point
 */
import { initMagneticButtons } from './magnetic.js';
import { initMirrorShadow } from './mirror-shadow.js';

console.log("VERSION: DEBUG RED LINES ACTIVE"); // Version Tag

document.addEventListener('DOMContentLoaded', () => {
    // 1. Initialize Magnetic Buttons
    initMagneticButtons();

    // 2. Initialize Mirror Shadow
    initMirrorShadow();
});

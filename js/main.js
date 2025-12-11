/**
 * Main Entry Point
 */
import { initMagneticButtons } from './magnetic.js';
import { initMirrorShadow } from './mirror-shadow.js';

console.log("VERSION: DEBUG V6 - ON SCREEN ERRORS");

// GLOBAL ERROR HANDLER
// Prints errors to the 'tearInput' box so user can see them without console
window.onerror = function (msg, url, line) {
    const input = document.getElementById('tearInput');
    if (input) {
        input.value = `ERR: ${msg} (L${line})`;
        input.style.color = 'red';
    }
};

document.addEventListener('DOMContentLoaded', () => {
    try {
        // 1. Initialize Magnetic Buttons
        initMagneticButtons();

        // 2. Initialize Mirror Shadow
        initMirrorShadow();
    } catch (e) {
        // Catch initialization errors
        const input = document.getElementById('tearInput');
        if (input) input.value = `INIT ERR: ${e.message}`;
    }
});

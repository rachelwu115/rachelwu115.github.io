/**
 * AUDIO MANAGER
 * Handles web audio context, oscillator generation, and musical scales.
 */
export class AudioManager {
    constructor() {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = 0.3; // safe master volume
        this.masterGain.connect(this.ctx.destination);

        // C Major Pentatonic Scale (C4 - C6)
        this.scale = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33, 659.25, 783.99, 880.00];
    }

    resume() {
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    /**
     * Plays a simple tone.
     * @param {number} freq Frequency in Hz
     * @param {string} type Oscillator type ('sine', 'square', etc.)
     * @param {number} duration Duration in seconds
     * @param {number} vol Volume (0.0 - 1.0)
     */
    playTone(freq, type, duration, vol = 0.5) {
        this.resume();
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

        gain.gain.setValueAtTime(vol, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    }

    /**
     * Plays a random note from the defined scale.
     * Used for typing feedback.
     */
    playRandomNote() {
        const freq = this.scale[Math.floor(Math.random() * this.scale.length)];
        // Add slight random detune for organic feel
        const detune = (Math.random() - 0.5) * 2;

        this.playTone(freq + detune, 'sine', 0.6, 0.2);
    }
}

// Singleton Instance
export const audioManager = new AudioManager();

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

        // Scale: E Minor Pentatonic (Sad/Melancholy) - Lower Octave (Deep)
        this.scale = [
            82.41, 98.00, 110.00, 123.47, // Octave 2
            146.83, 164.81, 196.00, 220.00, // Octave 3
            246.94, 293.66                  // Octave 4
        ];

        // Echo / Delay System
        this.delayNode = this.ctx.createDelay();
        this.delayNode.delayTime.value = 0.4; // 400ms echo

        this.feedbackGain = this.ctx.createGain();
        this.feedbackGain.gain.value = 0.15; // TUNED: Quieter Echo

        // Internal Routing (Feedback Loop)
        this.delayNode.connect(this.feedbackGain);
        this.feedbackGain.connect(this.delayNode);

        // Output Routing
        this.delayNode.connect(this.masterGain);
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

        // Dry Signal
        gain.connect(this.masterGain);

        // Wet Signal (Echo)
        gain.connect(this.delayNode);

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

        this.playTone(freq + detune, 'sine', 0.8, 0.1); // TUNED: Longer duration (0.8), Quieter (0.1)
    }
}

// Singleton Instance
export const audioManager = new AudioManager();

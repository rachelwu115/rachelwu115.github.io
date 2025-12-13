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

        // Melody: Fur Elise (Recurring Theme)
        this.melody = [
            659.25, 622.25, 659.25, 622.25, 659.25, 493.88, 587.33, 523.25, 440.00, // E D# E D# E B D C A
            261.63, 329.63, 440.00, 493.88, // C E A B
            329.63, 415.30, 493.88, 523.25, // E G# B C
            329.63, 659.25, 622.25, 659.25, 622.25, 659.25, 493.88, 587.33, 523.25, 440.00 // E E D# E D# E B D C A
        ];
        this.melodyIndex = 0;

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
     * Plays the next note in the Fur Elise melody.
     * Used for typing feedback.
     */
    playNextNote() {
        const freq = this.melody[this.melodyIndex % this.melody.length];
        this.melodyIndex++;

        // Slight organic variation, but keeping tune recognizable
        // const detune = (Math.random() - 0.5) * 1; 

        this.playTone(freq, 'sine', 0.8, 0.1);
    }
}

// Singleton Instance
export const audioManager = new AudioManager();

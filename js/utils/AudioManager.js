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

        // Melody: Fur Elise (Recurring Theme + Section B)
        this.melody = [
            // Section A
            659.25, 622.25, 659.25, 622.25, 659.25, 493.88, 587.33, 523.25, 440.00, // E D# E D# E B D C A
            261.63, 329.63, 440.00, 493.88, // C E A B
            329.63, 415.30, 493.88, 523.25, // E G# B C
            329.63, 415.30, 493.88, 523.25, // E G# B C
            // REMOVED Reprise to avoid "reset" feeling
            // Section B (Transition)
            493.88, 523.25, 587.33, 659.25, // B C D E
            392.00, 698.46, 659.25, 587.33, // G F E D
            349.23, 659.25, 587.33, 523.25, // F E D C
            293.66, 587.33, 523.25, 493.88  // D D C B
        ];
        this.melodyIndex = 0;

        // Echo / Delay System
        this.delayNode = this.ctx.createDelay();
        this.delayNode.delayTime.value = 0.4; // 400ms echo

        this.feedbackGain = this.ctx.createGain();
        this.feedbackGain.gain.value = 0.0; // TUNED: No Echo (User Check)

        // Wet Gain (Controls volume of ALL echoes)
        this.wetGain = this.ctx.createGain();
        this.wetGain.gain.value = 0.0; // TUNED: No Echo

        // Internal Routing (Feedback Loop)
        // ENABLED: Standard Delay/Echo loop
        this.delayNode.connect(this.feedbackGain);
        this.feedbackGain.connect(this.delayNode);

        // Output Routing
        this.delayNode.connect(this.wetGain);
        this.wetGain.connect(this.masterGain);

        // TUNED: Enable the Echo Bus
        this.feedbackGain.gain.value = 0.5; // Medium decay
        this.wetGain.gain.value = 0.4; // Audible echo
    }

    resume() {
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    /**
     * Plays a "Sad Sigh" - Falling pitch with echo.
     * Mimics a human "Haaaaaah" drop.
     */
    playSadSigh() {
        this.resume();
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        // Filter to soften the "robot" edge of the triangle wave
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 800; // Muffle it slightly

        osc.type = 'triangle'; // Closest primitive to a vocal hum

        // Pitch Drop: Start Mid-High, slide to Low
        const now = this.ctx.currentTime;
        osc.frequency.setValueAtTime(400, now); // "Ah"
        osc.frequency.exponentialRampToValueAtTime(150, now + 1.5); // "...oh"

        // Volume Envelope: Slow attack (breath in), Long release (breath out)
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.6, now + 0.2); // Attack
        gain.gain.exponentialRampToValueAtTime(0.001, now + 2.0); // Release

        osc.connect(filter);
        filter.connect(gain);

        // Dry Signal (Direct)
        gain.connect(this.masterGain);

        // Wet Signal (Heavy Echo)
        const echoSend = this.ctx.createGain();
        echoSend.gain.value = 0.8; // Strong send to echo
        gain.connect(echoSend);
        echoSend.connect(this.delayNode);

        osc.start();
        osc.stop(now + 2.5);
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

        this.playTone(freq, 'sine', 0.8, 0.25); // TUNED: Balanced Volume (0.25)
    }
}

// Singleton Instance
export const audioManager = new AudioManager();

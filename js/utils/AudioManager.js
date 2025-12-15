/**
 * AUDIO MANAGER
 * Handles web audio context, oscillator generation, and musical scales.
 */
export class AudioManager {
    constructor() {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = 0.8; // TUNED: Max Volume (User requested "Even Louder")
        this.masterGain.connect(this.ctx.destination);

        // Noise Buffer for "Breath" sounds
        this.noiseBuffer = this.createNoiseBuffer();

        // Melody: Fur Elise (Recurring Theme + Section B)
        this.melody = [
            // Section A
            659.25, 622.25, 659.25, 622.25, 659.25, 493.88, 587.33, 523.25, 440.00, // E D# E D# E B D C A
            261.63, 329.63, 440.00, 493.88, // C E A B
            329.63, 415.30, 493.88, 523.25, // E G# B C
            329.63, 415.30, 493.88, 523.25, // E G# B C
            // Section B (Transition)
            493.88, 523.25, 587.33, 659.25, // B C D E
            392.00, 698.46, 659.25, 587.33, // G F E D
            349.23, 659.25, 587.33, 523.25, // F E D C
            293.66, 587.33, 523.25, 493.88  // D D C B
        ];
        this.melodyIndex = 0;

        // Echo / Delay System
        this.delayNode = this.ctx.createDelay();
        this.delayNode.delayTime.value = 0.4;

        this.feedbackGain = this.ctx.createGain();
        this.wetGain = this.ctx.createGain();

        // Echo Routing
        this.delayNode.connect(this.feedbackGain);
        this.feedbackGain.connect(this.delayNode);
        this.delayNode.connect(this.wetGain);
        this.wetGain.connect(this.masterGain);

        this.feedbackGain.gain.value = 0.5;
        this.wetGain.gain.value = 0.4;

        // Map to track active oscillators for Sustain (Desktop)
        this.activeNotes = new Map();
        this.noteCounter = 0;
    }

    createNoiseBuffer() {
        const bufferSize = this.ctx.sampleRate * 2.0; // 2 seconds
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * 0.5; // Soft White Noise
        }
        return buffer;
    }

    resume() {
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    // ... (playPop, playTone kept as is for backwards compat/mobile) ...

    /**
     * Plays a sharp "pop" sound.
     * Sine sweep + Short Noise burst.
     */
    playPop() {
        this.resume();
        const t = this.ctx.currentTime;

        // 1. Pop Tone (Sine Drop)
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.frequency.setValueAtTime(500, t);
        osc.frequency.exponentialRampToValueAtTime(50, t + 0.1);
        gain.gain.setValueAtTime(0.7, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);

        osc.connect(gain);
        gain.connect(this.masterGain);

        // 2. Snap (Noise)
        const noise = this.ctx.createBufferSource();
        noise.buffer = this.noiseBuffer;
        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(0.8, t);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, t + 0.05);

        noise.connect(noiseGain);
        noiseGain.connect(this.masterGain);

        osc.start();
        osc.stop(t + 0.1);
        noise.start();
        noise.stop(t + 0.1);
    }

    /**
     * Plays a "Humanized Sad Sigh" (Ayyyy).
     * Mixes Breath (Noise) + Vocal Cord (Tone) + Formant Filter (Mouth Shape).
     */
    playSadSigh() {
        this.resume();
        const t = this.ctx.currentTime;
        const dur = 2.0;

        // 1. ETHEREAL CHORUS SYNTHESIS
        // Instead of noise (wind), we use a cluster of detuned Sine waves.
        // This creates a smooth, "ghostly" harmonic voice without the hiss.

        const fundamental = 450; // Start Pitch (Mid-High)
        const endPitch = 150;    // End Pitch (Low)

        // Oscillator 1: Center
        const osc1 = this.ctx.createOscillator();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(fundamental, t);
        osc1.frequency.exponentialRampToValueAtTime(endPitch, t + dur);

        // Oscillator 2: Detuned Up (+4Hz) -> Creates Chorus/Beating
        const osc2 = this.ctx.createOscillator();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(fundamental + 4, t);
        osc2.frequency.exponentialRampToValueAtTime(endPitch + 2, t + dur);

        // Oscillator 3: Detuned Down (-4Hz)
        const osc3 = this.ctx.createOscillator();
        osc3.type = 'sine';
        osc3.frequency.setValueAtTime(fundamental - 4, t);
        osc3.frequency.exponentialRampToValueAtTime(endPitch - 2, t + dur);

        // Gains (Mix them equally)
        const gainNode = this.ctx.createGain();
        gainNode.gain.setValueAtTime(0, t);
        gainNode.gain.linearRampToValueAtTime(0.4, t + 0.3); // Soft Swell
        gainNode.gain.exponentialRampToValueAtTime(0.001, t + dur);

        // Connect Loop
        osc1.connect(gainNode);
        osc2.connect(gainNode);
        osc3.connect(gainNode);

        // Output (Master)
        gainNode.connect(this.masterGain);

        // Echo Send (Heavy reverb for ghostliness)
        const echoSend = this.ctx.createGain();
        echoSend.gain.value = 0.7;
        gainNode.connect(echoSend);
        echoSend.connect(this.delayNode);

        osc1.start();
        osc2.start();
        osc3.start();

        osc1.stop(t + dur + 0.5);
        osc2.stop(t + dur + 0.5);
        osc3.stop(t + dur + 0.5);
    }

    /**
     * SUSTAIN SYSTEM (Desktop)
     * Starts a note that plays indefinitely until stopTone is called.
     */
    startTone(freq, type = 'sine', vol = 0.25) {
        this.resume();
        const id = this.noteCounter++;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

        // Attack Envelope
        gain.gain.setValueAtTime(0, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(vol, this.ctx.currentTime + 0.05); // 50ms Attack

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start();

        this.activeNotes.set(id, { osc, gain });
        return id;
    }

    stopTone(id) {
        const note = this.activeNotes.get(id);
        if (!note) return;

        const { osc, gain } = note;
        const releaseTime = 0.3; // 300ms Fade Out

        // Release Envelope using cancelScheduledValues to override any ongoing attack
        gain.gain.cancelScheduledValues(this.ctx.currentTime);
        gain.gain.setValueAtTime(gain.gain.value, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + releaseTime);

        osc.stop(this.ctx.currentTime + releaseTime);

        // Cleanup Map immediately (audio stops later)
        this.activeNotes.delete(id);
    }

    /**
     * Starts the next melody note (Sustain Mode).
     * Returns the note ID for stopping later.
     */
    startMelodyNote() {
        const freq = this.melody[this.melodyIndex % this.melody.length];
        this.melodyIndex++;
        return this.startTone(freq, 'sine', 0.25);
    }

    // Legacy / Mobile One-Shot
    playNextNote() {
        const freq = this.melody[this.melodyIndex % this.melody.length];
        this.melodyIndex++;
        this.playTone(freq, 'sine', 0.8, 0.25); // TUNED: Balanced Volume (0.25)
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
}

// Singleton Instance
export const audioManager = new AudioManager();

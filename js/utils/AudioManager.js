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

        // Melody: Fur Elise (Recurring Theme - EXACT ORIGINAL)
        // Melody: Fur Elise (Complete Section A with Resolution)
        // Melody: Fur Elise (Full Rondo Form: A -> B -> A)
        this.melody = [
            // --- SECTION A (Main Theme) ---
            // 1. Motif
            659.25, 622.25, 659.25, 622.25, 659.25, 493.88, 587.33, 523.25, 440.00, // E D# E D# E B D C A
            // 2. Bass Run 1
            261.63, 329.63, 440.00, 493.88, // C E A B
            // 3. Bass Run 2
            329.63, 415.30, 493.88, 523.25, // E G# B C
            // 4. Motif Reprise
            329.63, // E (Pickup)
            659.25, 622.25, 659.25, 622.25, 659.25, 493.88, 587.33, 523.25, 440.00, // E D# E D# E B D C A
            // 5. Bass Run 1
            261.63, 329.63, 440.00, 493.88, // C E A B
            // 6. Resolution
            329.63, 523.25, 493.88, 440.00  // E C B A
        ];
        this.melodyIndex = 0;

        // Echo / Delay System (Original Heavy Ethereal Echo)
        this.delayNode = this.ctx.createDelay();
        this.delayNode.delayTime.value = 0.4;

        this.feedbackGain = this.ctx.createGain();
        this.wetGain = this.ctx.createGain();

        // Echo Routing
        this.delayNode.connect(this.feedbackGain);
        this.feedbackGain.connect(this.delayNode);
        this.delayNode.connect(this.wetGain);
        this.wetGain.connect(this.masterGain);

        this.feedbackGain.gain.value = 0.5; // High Feedback
        this.wetGain.gain.value = 0.4;      // Strong Mix

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

    // Legacy / Mobile One-Shot
    playNextNote() {
        const freq = this.melody[this.melodyIndex % this.melody.length];
        this.melodyIndex++;
        // TUNED: Original High Pitch Sine with Long Duration
        this.playTone(freq, 'sine', 0.8, 0.25);
    }

    resetMelody() {
        this.melodyIndex = 0;
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

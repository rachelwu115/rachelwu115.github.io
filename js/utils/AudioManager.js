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

        // 1. VOCAL CORDS (Tone)
        const osc = this.ctx.createOscillator();
        const oscGain = this.ctx.createGain();
        osc.type = 'sawtooth'; // TUNED: Sawtooth has rich harmonics needed for F2 (2200Hz)

        // Pitch Drop: Human sigh drops significantly at the end
        osc.frequency.setValueAtTime(350, t);
        osc.frequency.exponentialRampToValueAtTime(120, t + dur);

        // Vocal Volume: Fade in/out
        oscGain.gain.setValueAtTime(0, t);
        oscGain.gain.linearRampToValueAtTime(0.25, t + 0.3); // Lower gain for Sawtooth (it's loud)
        oscGain.gain.exponentialRampToValueAtTime(0.001, t + dur);

        // 2. BREATH (Noise)
        const noise = this.ctx.createBufferSource();
        noise.buffer = this.noiseBuffer;
        const noiseGain = this.ctx.createGain();

        // Noise Volume: Breath is softer than voice but needs to be audible
        noiseGain.gain.setValueAtTime(0, t);
        noiseGain.gain.linearRampToValueAtTime(0.3, t + 0.2); // Boosted Noise
        noiseGain.gain.exponentialRampToValueAtTime(0.001, t + dur);

        // 3. MOUTH SHAPE (Dual Formant Synthesis for /aɪ/)
        // "Eye" is a diphthong: /a/ (Ah) -> /ɪ/ (Ih/Ee)

        // F1 (Jaw Openness): Starts Open (750Hz) -> Closes (300Hz)
        const f1 = this.ctx.createBiquadFilter();
        f1.type = 'bandpass';
        f1.Q.value = 2.0; // TUNED: Wider resonance to catch harmonics
        f1.frequency.setValueAtTime(750, t);
        f1.frequency.exponentialRampToValueAtTime(300, t + dur);

        // F2 (Tongue Frontness): Starts Back (1100Hz) -> Front (2200Hz)
        const f2 = this.ctx.createBiquadFilter();
        f2.type = 'bandpass';
        f2.Q.value = 2.0; // TUNED: Wider resonance
        f2.frequency.setValueAtTime(1100, t);
        f2.frequency.exponentialRampToValueAtTime(2200, t + dur);

        // Parallel Routing
        // Mix both osc and noise into both formants with specific weights
        // "Ah" is mostly F1 dominant, "Ee" needs strong F2

        const f1Gain = this.ctx.createGain();
        f1Gain.gain.value = 1.0;

        const f2Gain = this.ctx.createGain();
        f2Gain.gain.value = 1.0; // Boosted F2 Gain

        // Connect Sources to Filters
        oscGain.connect(f1);
        oscGain.connect(f2);
        noiseGain.connect(f1);
        noiseGain.connect(f2);

        // Connect Filters to Output Gains
        f1.connect(f1Gain);
        f2.connect(f2Gain);

        // Sum and Send to Master
        f1Gain.connect(this.masterGain);
        f2Gain.connect(this.masterGain);

        // Echo Send (Ghostly feel)
        const echoSend = this.ctx.createGain();
        echoSend.gain.value = 0.6;
        f1Gain.connect(echoSend);
        f2Gain.connect(echoSend);
        echoSend.connect(this.delayNode);

        osc.start();
        osc.stop(t + dur + 0.5);
        noise.start();
        noise.stop(t + dur + 0.5);
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

        // Wet Signal (Echo) -- REMOVED per user request
        // gain.connect(this.delayNode);

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

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

        // 1. GHOST WHISPER SYNTHESIS
        // Source: White Noise -> Lowpass (to make it Pink/Airy)
        const noise = this.ctx.createBufferSource();
        noise.buffer = this.noiseBuffer;

        // Pre-Filter: Soften the harsh white noise into "Air"
        const airFilter = this.ctx.createBiquadFilter();
        airFilter.type = 'lowpass';
        airFilter.frequency.value = 1500; // Muffled air

        noise.connect(airFilter);

        // 2. DUAL FORMANT ARTICULATION (The "Mouth")
        // We filter the AIR (not a tone) to shape it into vowels.
        // This creates a "Whisper".

        // F1 (Jaw): 700Hz (Ah) -> 300Hz (Ee)
        const f1 = this.ctx.createBiquadFilter();
        f1.type = 'bandpass';
        f1.Q.value = 3.0;
        f1.frequency.setValueAtTime(700, t);
        f1.frequency.exponentialRampToValueAtTime(300, t + dur);

        // F2 (Tongue): 1200Hz (Ah) -> 2400Hz (Ee)
        const f2 = this.ctx.createBiquadFilter();
        f2.type = 'bandpass';
        f2.Q.value = 4.0;
        f2.frequency.setValueAtTime(1200, t);
        f2.frequency.exponentialRampToValueAtTime(2400, t + dur);

        // Gains (Massive boost for Subtractive Synthesis)
        const f1Gain = this.ctx.createGain();
        f1Gain.gain.value = 8.0;

        const f2Gain = this.ctx.createGain();
        f2Gain.gain.value = 12.0; // Highs need more energy to be heard

        // Envelope (Slow, sad breath)
        const envGain = this.ctx.createGain();
        envGain.gain.setValueAtTime(0, t);
        envGain.gain.linearRampToValueAtTime(0.8, t + 0.5); // Slow inhale
        envGain.gain.exponentialRampToValueAtTime(0.001, t + dur);

        // Routing: Noise -> AirFilter -> Envelope -> Formants
        airFilter.connect(envGain);
        envGain.connect(f1);
        envGain.connect(f2);

        f1.connect(f1Gain);
        f2.connect(f2Gain);

        // Output
        f1Gain.connect(this.masterGain);
        f2Gain.connect(this.masterGain);

        // Echo (Long, sad reverb)
        const echoSend = this.ctx.createGain();
        echoSend.gain.value = 0.8;
        f1Gain.connect(echoSend);
        f2Gain.connect(echoSend);
        echoSend.connect(this.delayNode);

        // 3. UNDERTONE (Subtle Sad Sine)
        // Just a tiny tonal element to give it pitch/sadness without sounding like a robot
        const sub = this.ctx.createOscillator();
        const subGain = this.ctx.createGain();
        sub.type = 'sine';
        sub.frequency.setValueAtTime(150, t); // Low sad note
        sub.frequency.linearRampToValueAtTime(100, t + dur); // Falling
        subGain.gain.setValueAtTime(0, t);
        subGain.gain.linearRampToValueAtTime(0.1, t + 0.5); // Very quiet
        subGain.gain.exponentialRampToValueAtTime(0.001, t + dur);

        sub.connect(subGain);
        subGain.connect(this.masterGain);

        noise.start();
        noise.stop(t + dur + 0.5);
        sub.start();
        sub.stop(t + dur + 0.5);
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

// Dynamic Web Audio API Sound Synthesizer
// Zero assets required. Plays standard retro game SFX.

class SoundManager {
	constructor() {
		this.ctx = null;
		this.muted = false;
	}

	init() {
		if (this.ctx) return;
		const AudioContextClass = window.AudioContext || window.webkitAudioContext;
		if (AudioContextClass) {
			this.ctx = new AudioContextClass();
		}
	}

	resume() {
		this.init();
		if (this.ctx && this.ctx.state === 'suspended') {
			this.ctx.resume();
		}
	}

	toggleMute() {
		this.muted = !this.muted;
		return this.muted;
	}

	createGain(duration, startVal = 0.15) {
		if (!this.ctx || this.muted) return null;
		this.resume();

		const gainNode = this.ctx.createGain();
		gainNode.gain.setValueAtTime(startVal, this.ctx.currentTime);
		gainNode.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
		gainNode.connect(this.ctx.destination);
		return gainNode;
	}

	playShoot() {
		const duration = 0.12;
		const gainNode = this.createGain(duration, 0.08);
		if (!gainNode) return;

		const osc = this.ctx.createOscillator();
		osc.type = 'triangle';
		osc.frequency.setValueAtTime(600, this.ctx.currentTime);
		osc.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + duration);

		osc.connect(gainNode);
		osc.start();
		osc.stop(this.ctx.currentTime + duration);
	}

	playEnemyHit() {
		const duration = 0.05;
		const gainNode = this.createGain(duration, 0.05);
		if (!gainNode) return;

		const osc = this.ctx.createOscillator();
		osc.type = 'sine';
		osc.frequency.setValueAtTime(900, this.ctx.currentTime);
		osc.frequency.setValueAtTime(1200, this.ctx.currentTime + 0.02);

		osc.connect(gainNode);
		osc.start();
		osc.stop(this.ctx.currentTime + duration);
	}

	playPlayerHit() {
		if (!this.ctx || this.muted) return;
		this.resume();

		// Noise-based explosion
		const duration = 0.45;
		const bufferSize = this.ctx.sampleRate * duration;
		const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
		const data = buffer.getChannelData(0);
		for (let i = 0; i < bufferSize; i++) {
			data[i] = Math.random() * 2 - 1;
		}

		const noise = this.ctx.createBufferSource();
		noise.buffer = buffer;

		const filter = this.ctx.createBiquadFilter();
		filter.type = 'lowpass';
		filter.frequency.setValueAtTime(500, this.ctx.currentTime);
		filter.frequency.exponentialRampToValueAtTime(30, this.ctx.currentTime + duration);

		const gainNode = this.ctx.createGain();
		gainNode.gain.setValueAtTime(0.25, this.ctx.currentTime);
		gainNode.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + duration);

		noise.connect(filter);
		filter.connect(gainNode);
		gainNode.connect(this.ctx.destination);

		noise.start();
		noise.stop(this.ctx.currentTime + duration);
	}

	playSpellSuccess() {
		if (!this.ctx || this.muted) return;
		this.resume();

		const now = this.ctx.currentTime;
		const playNote = (freq, time, len) => {
			const gainNode = this.ctx.createGain();
			gainNode.gain.setValueAtTime(0.1, time);
			gainNode.gain.exponentialRampToValueAtTime(0.001, time + len);
			gainNode.connect(this.ctx.destination);

			const osc = this.ctx.createOscillator();
			osc.type = 'sine';
			osc.frequency.setValueAtTime(freq, time);
			osc.connect(gainNode);
			osc.start(time);
			osc.stop(time + len);
		};

		// Play rapid ascending arpeggio
		playNote(523.25, now, 0.15); // C5
		playNote(659.25, now + 0.06, 0.15); // E5
		playNote(783.99, now + 0.12, 0.15); // G5
		playNote(1046.50, now + 0.18, 0.25); // C6
	}

	playSpellFail() {
		const duration = 0.25;
		const gainNode = this.createGain(duration, 0.12);
		if (!gainNode) return;

		const osc = this.ctx.createOscillator();
		osc.type = 'sawtooth';
		osc.frequency.setValueAtTime(130, this.ctx.currentTime);
		osc.frequency.linearRampToValueAtTime(70, this.ctx.currentTime + duration);

		osc.connect(gainNode);
		osc.start();
		osc.stop(this.ctx.currentTime + duration);
	}

	playShield() {
		const duration = 0.35;
		const gainNode = this.createGain(duration, 0.1);
		if (!gainNode) return;

		const osc1 = this.ctx.createOscillator();
		osc1.type = 'sine';
		osc1.frequency.setValueAtTime(523.25, this.ctx.currentTime); // C5
		osc1.frequency.linearRampToValueAtTime(880, this.ctx.currentTime + duration);

		const osc2 = this.ctx.createOscillator();
		osc2.type = 'sine';
		osc2.frequency.setValueAtTime(659.25, this.ctx.currentTime); // E5
		osc2.frequency.linearRampToValueAtTime(1100, this.ctx.currentTime + duration);

		osc1.connect(gainNode);
		osc2.connect(gainNode);

		osc1.start();
		osc2.start();

		osc1.stop(this.ctx.currentTime + duration);
		osc2.stop(this.ctx.currentTime + duration);
	}

	playShopClick() {
		const duration = 0.08;
		const gainNode = this.createGain(duration, 0.05);
		if (!gainNode) return;

		const osc = this.ctx.createOscillator();
		osc.type = 'sine';
		osc.frequency.setValueAtTime(700, this.ctx.currentTime);
		osc.frequency.exponentialRampToValueAtTime(1400, this.ctx.currentTime + duration);

		osc.connect(gainNode);
		osc.start();
		osc.stop(this.ctx.currentTime + duration);
	}

	playDrawTick() {
		// Extremely short tick for drawing feedback
		const duration = 0.01;
		const gainNode = this.createGain(duration, 0.02);
		if (!gainNode) return;

		const osc = this.ctx.createOscillator();
		osc.type = 'sine';
		osc.frequency.setValueAtTime(1500, this.ctx.currentTime);

		osc.connect(gainNode);
		osc.start();
		osc.stop(this.ctx.currentTime + duration);
	}

	playClear() {
		if (!this.ctx || this.muted) return;
		this.resume();

		const now = this.ctx.currentTime;
		const playNote = (freq, time, len) => {
			const gainNode = this.ctx.createGain();
			gainNode.gain.setValueAtTime(0.12, time);
			gainNode.gain.exponentialRampToValueAtTime(0.001, time + len);
			gainNode.connect(this.ctx.destination);

			const osc = this.ctx.createOscillator();
			osc.type = 'triangle';
			osc.frequency.setValueAtTime(freq, time);
			osc.connect(gainNode);
			osc.start(time);
			osc.stop(time + len);
		};

		// A happy little victory tune
		playNote(523.25, now, 0.15); // C5
		playNote(587.33, now + 0.12, 0.15); // D5
		playNote(659.25, now + 0.24, 0.15); // E5
		playNote(783.99, now + 0.36, 0.15); // G5
		playNote(880.00, now + 0.48, 0.15); // A5
		playNote(1046.50, now + 0.60, 0.50); // C6
	}
}

export const sound = new SoundManager();

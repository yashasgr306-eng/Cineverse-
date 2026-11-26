class CinemaAudioEngine {
  private ctx: AudioContext | null = null;
  private isPlaying = false;
  private nodes: AudioNode[] = [];
  private stopTimer: number | null = null;

  public toggleTrailerAmbience(shouldPlay: boolean): boolean {
    if (!shouldPlay) {
      this.stop();
      return false;
    }

    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return false;
      if (!this.ctx) {
        this.ctx = new AudioCtx();
      }
      if (this.ctx.state === 'suspended') {
        void this.ctx.resume();
      }
      this.stop();

      const now = this.ctx.currentTime;
      const master = this.ctx.createGain();
      master.gain.setValueAtTime(0.001, now);
      master.gain.exponentialRampToValueAtTime(0.14, now + 0.8);
      master.connect(this.ctx.destination);

      // Warm sub-bass theatrical drone (D1 + A1 + F#3 shimmer)
      const freqs = [73.42, 110.0, 220.0, 293.66];
      const created: AudioNode[] = [master];

      freqs.forEach((f, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();
        const gain = this.ctx.createGain();

        osc.type = idx === 0 ? 'sawtooth' : 'triangle';
        osc.frequency.setValueAtTime(f, now);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(idx === 0 ? 180 : 620, now);
        filter.frequency.exponentialRampToValueAtTime(idx === 0 ? 280 : 1200, now + 4.5);

        gain.gain.setValueAtTime(idx === 0 ? 0.45 : 0.16, now);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(master);
        osc.start(now);

        created.push(osc, filter, gain);
      });

      this.nodes = created;
      this.isPlaying = true;
      return true;
    } catch {
      return false;
    }
  }

  public playSeatClick(selected: boolean) {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      if (!this.ctx) this.ctx = new AudioCtx();
      if (this.ctx.state === 'suspended') void this.ctx.resume();

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(selected ? 580 : 360, now);
      osc.frequency.exponentialRampToValueAtTime(selected ? 880 : 240, now + 0.08);

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.1);
    } catch {
      // Ignore audio errors if blocked by browser autoplay policy
    }
  }

  public stop() {
    if (this.stopTimer) {
      window.clearTimeout(this.stopTimer);
      this.stopTimer = null;
    }
    this.nodes.forEach((node) => {
      try {
        if ('stop' in node && typeof (node as OscillatorNode).stop === 'function') {
          (node as OscillatorNode).stop();
        }
        node.disconnect();
      } catch {
        // Ignore cleanup errors
      }
    });
    this.nodes = [];
    this.isPlaying = false;
  }

  public getPlaying(): boolean {
    return this.isPlaying;
  }
}

export const cinemaAudio = new CinemaAudioEngine();

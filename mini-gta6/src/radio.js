/**
 * Lightweight Vice City Radio Station manager with optional Web Audio API synth beat.
 * Safely no-ops audio synthesis when running in headless/Node test environments.
 */
export const RADIO_STATIONS = [
  { id: "off", name: "Off", bpm: 0, baseFreq: 0 },
  { id: "vice-fm", name: "Vice FM", bpm: 118, baseFreq: 110 },
  { id: "neon-synth", name: "Neon Synth", bpm: 128, baseFreq: 130.81 },
  { id: "sunset-80s", name: "Sunset 80s", bpm: 104, baseFreq: 98 },
];

export class RadioManager {
  constructor() {
    this.stationIndex = 0;
    this.audioCtx = null;
    this.stepTimer = null;
    this.step = 0;
    this.isPaused = false;
  }

  /**
   * Returns the currently selected station metadata.
   * @returns {{ id: string, name: string, bpm: number, baseFreq: number }}
   */
  getCurrentStation() {
    return RADIO_STATIONS[this.stationIndex];
  }

  /**
   * Cycles to the next radio station (Off -> Vice FM -> Neon Synth -> Sunset 80s -> Off).
   * @returns {{ id: string, name: string, bpm: number, baseFreq: number }}
   */
  cycleStation() {
    this.stationIndex = (this.stationIndex + 1) % RADIO_STATIONS.length;
    const station = this.getCurrentStation();
    this._syncAudio(station);
    return station;
  }

  /**
   * Resets radio to Off and stops any active synth beat.
   */
  reset() {
    this.stationIndex = 0;
    this._stopAudio();
  }

  /**
   * Suspends or resumes audio output (e.g. when the game is paused or the tab
   * is hidden) without changing the selected station.
   * @param {boolean} paused
   */
  setPaused(paused) {
    this.isPaused = paused;
    if (!this.audioCtx) return;
    if (paused && this.audioCtx.state === "running") {
      this.audioCtx.suspend().catch(() => {});
    } else if (!paused && this.audioCtx.state === "suspended" && this.getCurrentStation().id !== "off") {
      this.audioCtx.resume().catch(() => {});
    }
  }

  _syncAudio(station) {
    this._stopAudio();
    if (station.id === "off") return;
    if (typeof window === "undefined") return;

    const AudioContextClass =
      window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    if (!this.audioCtx) {
      this.audioCtx = new AudioContextClass();
    }
    if (this.audioCtx.state === "suspended" && !this.isPaused) {
      this.audioCtx.resume().catch(() => {});
    }

    const intervalMs = Math.round((60 / station.bpm / 2) * 1000);
    const pattern = [1, 1.5, 1.25, 1.5, 1.125, 1.5, 1.333, 1.25];
    this.step = 0;

    this.stepTimer = setInterval(() => {
      if (!this.audioCtx || this.audioCtx.state !== "running") return;
      const now = this.audioCtx.currentTime;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = station.id === "neon-synth" ? "sawtooth" : "triangle";
      osc.frequency.setValueAtTime(
        station.baseFreq * pattern[this.step % pattern.length],
        now
      );

      gain.gain.setValueAtTime(0.035, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.17);
      this.step++;
    }, intervalMs);
  }

  _stopAudio() {
    if (this.stepTimer !== null) {
      clearInterval(this.stepTimer);
      this.stepTimer = null;
    }
  }
}

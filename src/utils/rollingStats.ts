/**
 * Utility for tracking rolling statistics over a window of frames
 */
export class RollingStats {
  private samples: number[] = [];
  private maxSamples: number;

  constructor(maxSamples: number = 60) {
    this.maxSamples = maxSamples;
  }

  addSample(value: number): void {
    this.samples.push(value);
    if (this.samples.length > this.maxSamples) {
      this.samples.shift();
    }
  }

  getAverage(): number {
    if (this.samples.length === 0) return 0;
    return this.samples.reduce((sum, val) => sum + val, 0) / this.samples.length;
  }

  getMin(): number {
    if (this.samples.length === 0) return 0;
    return Math.min(...this.samples);
  }

  getMax(): number {
    if (this.samples.length === 0) return 0;
    return Math.max(...this.samples);
  }

  getCurrent(): number {
    if (this.samples.length === 0) return 0;
    return this.samples[this.samples.length - 1];
  }

  getSampleCount(): number {
    return this.samples.length;
  }

  reset(): void {
    this.samples = [];
  }
}

/**
 * Tracker for CCD performance metrics with rolling averages
 */
export interface CCDPerformanceMetrics {
  bossFirstSweepUs: number;
  ccdCoreUs: number;
  postProcessingUs: number;
  totalUs: number;
  substeps: number;
  collisions: number;
  toiIterations: number;
}

export class CCDPerformanceTracker {
  private bossFirstStats = new RollingStats(60);
  private ccdCoreStats = new RollingStats(60);
  private postProcStats = new RollingStats(60);
  private totalStats = new RollingStats(60);
  private substepsStats = new RollingStats(60);
  private collisionsStats = new RollingStats(60);
  private toiStats = new RollingStats(60);

  addFrame(metrics: CCDPerformanceMetrics): void {
    this.bossFirstStats.addSample(metrics.bossFirstSweepUs);
    this.ccdCoreStats.addSample(metrics.ccdCoreUs);
    this.postProcStats.addSample(metrics.postProcessingUs);
    this.totalStats.addSample(metrics.totalUs);
    this.substepsStats.addSample(metrics.substeps);
    this.collisionsStats.addSample(metrics.collisions);
    this.toiStats.addSample(metrics.toiIterations);
  }

  getStats() {
    return {
      bossFirst: {
        current: this.bossFirstStats.getCurrent(),
        avg: this.bossFirstStats.getAverage(),
        min: this.bossFirstStats.getMin(),
        max: this.bossFirstStats.getMax(),
      },
      ccdCore: {
        current: this.ccdCoreStats.getCurrent(),
        avg: this.ccdCoreStats.getAverage(),
        min: this.ccdCoreStats.getMin(),
        max: this.ccdCoreStats.getMax(),
      },
      postProcessing: {
        current: this.postProcStats.getCurrent(),
        avg: this.postProcStats.getAverage(),
        min: this.postProcStats.getMin(),
        max: this.postProcStats.getMax(),
      },
      total: {
        current: this.totalStats.getCurrent(),
        avg: this.totalStats.getAverage(),
        min: this.totalStats.getMin(),
        max: this.totalStats.getMax(),
      },
      substeps: {
        current: this.substepsStats.getCurrent(),
        avg: this.substepsStats.getAverage(),
        max: this.substepsStats.getMax(),
      },
      collisions: {
        current: this.collisionsStats.getCurrent(),
        avg: this.collisionsStats.getAverage(),
        max: this.collisionsStats.getMax(),
      },
      toiIterations: {
        current: this.toiStats.getCurrent(),
        avg: this.toiStats.getAverage(),
        max: this.toiStats.getMax(),
      },
      sampleCount: this.totalStats.getSampleCount(),
    };
  }

  reset(): void {
    this.bossFirstStats.reset();
    this.ccdCoreStats.reset();
    this.postProcStats.reset();
    this.totalStats.reset();
    this.substepsStats.reset();
    this.collisionsStats.reset();
    this.toiStats.reset();
  }
}

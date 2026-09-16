import assert from 'assert';
import path from 'path';
import { clearImageDimensionsCache, resolveImageDimensions } from '../../../src/lib/image-dimensions.ts';

describe('image dimensions benchmark', () => {
  const imagePath = path.resolve(process.cwd(), 'resources/logo.png');

  it('runs benchmark comparing uncached vs cached image dimensions resolution', () => {
    const iterations = 10000;

    // Uncached benchmark
    const startUncached = Date.now();
    for (let i = 0; i < iterations; i++) {
      clearImageDimensionsCache();
      resolveImageDimensions(imagePath);
    }
    const durationUncached = Date.now() - startUncached;

    // Cached benchmark
    clearImageDimensionsCache();
    const startCached = Date.now();
    for (let i = 0; i < iterations; i++) {
      resolveImageDimensions(imagePath);
    }
    const durationCached = Date.now() - startCached;

    console.log('\n--- BENCHMARK RESULTS ---');
    console.log(`Iterations: ${iterations}`);
    console.log(`Uncached: ${durationUncached.toFixed(2)} ms`);
    console.log(`Cached:   ${durationCached.toFixed(2)} ms`);
    if (durationCached > 0) {
      console.log(`Speedup:  ${(durationUncached / durationCached).toFixed(2)}x (${(((durationUncached - durationCached) / durationUncached) * 100).toFixed(1)}% faster)`);
    }
    console.log('-------------------------\n');

    assert.ok(durationCached < durationUncached, 'Cached calls should be faster than uncached calls');
  });
});

import assert from 'assert';
import { validateResume, validateResumeAsync } from '../../../src/lib/validator.ts';

describe('validator lib', () => {
  const validResume = {
    basics: {
      name: 'John Doe',
      email: 'john@example.com',
    },
    work: [
      {
        name: 'Company',
        position: 'Developer',
      },
    ],
  };

  const invalidResume = {
    basics: {
      email: 'not-an-email',
    },
  };

  it('validateResume validates valid resume correctly', () => {
    const result = validateResume(validResume);
    assert.strictEqual(result.valid, true);
    assert.strictEqual(result.errors, undefined);
  });

  it('validateResume validates invalid resume correctly', () => {
    const result = validateResume(invalidResume);
    assert.strictEqual(result.valid, false);
    assert.ok(result.errors && result.errors.length > 0);
  });

  it('validateResumeAsync validates valid resume correctly', async () => {
    const result = await validateResumeAsync(validResume);
    assert.strictEqual(result.valid, true);
    assert.strictEqual(result.errors, undefined);
  });

  it('validateResumeAsync validates invalid resume correctly', async () => {
    const result = await validateResumeAsync(invalidResume);
    assert.strictEqual(result.valid, false);
    assert.ok(result.errors && result.errors.length > 0);
  });
});

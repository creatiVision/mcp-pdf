import assert from 'assert';
import { validateResume, validateResumeAsync } from '../../../src/lib/validator.ts';

describe('validateResume', () => {
  describe('Valid Resumes', () => {
    it('returns valid: true for a minimal valid resume object', () => {
      const resume = {
        basics: {
          name: 'John Doe',
        },
      };

      const result = validateResume(resume);
      assert.strictEqual(result.valid, true);
      assert.strictEqual(result.errors, undefined);
    });

    it('returns valid: true for a empty object resume', () => {
      const resume = {};

      const result = validateResume(resume);
      assert.strictEqual(result.valid, true);
      assert.strictEqual(result.errors, undefined);
    });

    it('returns valid: true for a comprehensive valid resume', () => {
      const resume = {
        basics: {
          name: 'Jane Smith',
          label: 'Software Engineer',
          email: 'jane@example.com',
          phone: '(555) 000-0000',
          url: 'https://janesmith.dev',
          summary: 'A short biography',
          location: {
            address: '123 Main St',
            postalCode: '98101',
            city: 'Seattle',
            countryCode: 'US',
            region: 'WA',
          },
          profiles: [
            {
              network: 'GitHub',
              username: 'janesmith',
              url: 'https://github.com/janesmith',
            },
          ],
        },
        work: [
          {
            name: 'Acme Corp',
            position: 'Senior Engineer',
            url: 'https://acme.com',
            startDate: '2020-01-15',
            endDate: '2023-05',
            summary: 'Worked on platform infrastructure',
            highlights: ['Improved latency by 20%'],
          },
        ],
        volunteer: [
          {
            organization: 'Community Coding',
            position: 'Mentor',
            startDate: '2019',
          },
        ],
        education: [
          {
            institution: 'State University',
            url: 'https://university.edu',
            area: 'Computer Science',
            studyType: 'Bachelor',
            startDate: '2015-09',
            endDate: '2019-06',
            score: '3.9',
            courses: ['CS101'],
          },
        ],
        skills: [
          {
            name: 'Web Development',
            level: 'Master',
            keywords: ['HTML', 'CSS', 'TypeScript'],
          },
        ],
        languages: [
          {
            language: 'English',
            fluency: 'Native speaker',
          },
        ],
        interests: [
          {
            name: 'Open Source',
            keywords: ['Node.js'],
          },
        ],
        projects: [
          {
            name: 'Open Project',
            description: 'A great open source tool',
            highlights: ['1k stars on GitHub'],
            keywords: ['TypeScript'],
            startDate: '2021-01',
            url: 'https://project.org',
          },
        ],
      };

      const result = validateResume(resume);
      assert.strictEqual(result.valid, true);
      assert.strictEqual(result.errors, undefined);
    });
  });

  describe('Invalid Resumes', () => {
    it('returns valid: false when email format is invalid', () => {
      const resume = {
        basics: {
          name: 'John Doe',
          email: 'not-an-email',
        },
      };

      const result = validateResume(resume);
      assert.strictEqual(result.valid, false);
      assert.ok(Array.isArray(result.errors));
      assert.ok(result.errors.length > 0);
      assert.ok(result.errors.some((err) => err.includes('email')));
    });

    it('returns valid: false when url format is invalid', () => {
      const resume = {
        basics: {
          url: 'invalid-url',
        },
      };

      const result = validateResume(resume);
      assert.strictEqual(result.valid, false);
      assert.ok(Array.isArray(result.errors));
      assert.ok(result.errors.length > 0);
      assert.ok(result.errors.some((err) => err.includes('url')));
    });

    it('returns valid: false when ISO 8601 date format is invalid', () => {
      const resume = {
        work: [
          {
            name: 'Tech Co',
            startDate: '01/15/2020', // Invalid ISO 8601 format
          },
        ],
      };

      const result = validateResume(resume);
      assert.strictEqual(result.valid, false);
      assert.ok(Array.isArray(result.errors));
      assert.ok(result.errors.length > 0);
      assert.ok(result.errors.some((err) => err.includes('startDate')));
    });

    it('returns valid: false when field types are wrong', () => {
      const resume = {
        basics: {
          name: 12345, // Should be string
        },
        work: 'Not an array', // Should be array
      };

      const result = validateResume(resume);
      assert.strictEqual(result.valid, false);
      assert.ok(Array.isArray(result.errors));
      assert.ok(result.errors.length >= 2);
    });
  });

  describe('Edge Cases and Invalid Inputs', () => {
    it('returns valid: false for null input', () => {
      const result = validateResume(null);
      assert.strictEqual(result.valid, false);
      assert.ok(Array.isArray(result.errors));
    });

    it('returns valid: false for undefined input', () => {
      const result = validateResume(undefined);
      assert.strictEqual(result.valid, false);
      assert.ok(Array.isArray(result.errors));
    });

    it('returns valid: false for primitive non-object types', () => {
      assert.strictEqual(validateResume('string resume').valid, false);
      assert.strictEqual(validateResume(12345).valid, false);
      assert.strictEqual(validateResume(true).valid, false);
    });

    it('returns valid: false for array input', () => {
      const result = validateResume(['not', 'a', 'resume', 'object']);
      assert.strictEqual(result.valid, false);
      assert.ok(Array.isArray(result.errors));
    });
  });

  describe('validateResumeAsync', () => {
    it('validateResumeAsync validates valid resume correctly', async () => {
      const resume = {
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
      const result = await validateResumeAsync(resume);
      assert.strictEqual(result.valid, true);
      assert.strictEqual(result.errors, undefined);
    });

    it('validateResumeAsync validates invalid resume correctly', async () => {
      const resume = {
        basics: {
          email: 'not-an-email',
        },
      };
      const result = await validateResumeAsync(resume);
      assert.strictEqual(result.valid, false);
      assert.ok(result.errors && result.errors.length > 0);
    });
  });
});

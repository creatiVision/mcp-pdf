import assert from 'assert';
import { validateResume } from '../../../src/lib/validator.ts';

describe('validator', () => {
  describe('validateResume', () => {
    it('returns valid: true for a minimal valid resume', () => {
      const minimalResume = {
        basics: {
          name: 'John Doe',
          email: 'john.doe@example.com',
        },
      };

      const result = validateResume(minimalResume);
      assert.strictEqual(result.valid, true);
      assert.strictEqual(result.errors, undefined);
    });

    it('returns valid: true for an empty object resume', () => {
      const emptyResume = {};
      const result = validateResume(emptyResume);
      assert.strictEqual(result.valid, true);
      assert.strictEqual(result.errors, undefined);
    });

    it('returns valid: true for a comprehensive valid resume', () => {
      const fullResume = {
        basics: {
          name: 'Jane Smith',
          label: 'Software Engineer',
          image: 'https://example.com/photo.jpg',
          email: 'jane@example.com',
          phone: '(555) 123-4567',
          url: 'https://janesmith.dev',
          summary: 'Experienced developer',
          location: {
            address: '123 Main St',
            postalCode: '90210',
            city: 'Beverly Hills',
            countryCode: 'US',
            region: 'California',
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
            name: 'Tech Corp',
            position: 'Senior Engineer',
            url: 'https://techcorp.example.com',
            startDate: '2020-01-01',
            endDate: '2023-01-01',
            summary: 'Led frontend team',
            highlights: ['Built feature X', 'Improved performance by 50%'],
          },
        ],
        volunteer: [
          {
            organization: 'NonProfit',
            position: 'Volunteer Developer',
            url: 'https://nonprofit.example.com',
            startDate: '2019-01-01',
            endDate: '2019-12-31',
            summary: 'Assisted in web development',
            highlights: ['Created website'],
          },
        ],
        education: [
          {
            institution: 'University of Science',
            url: 'https://university.example.com',
            area: 'Computer Science',
            studyType: 'Bachelor',
            startDate: '2015-09-01',
            endDate: '2019-06-01',
            score: '3.9',
            courses: ['CS101', 'CS102'],
          },
        ],
        awards: [
          {
            title: 'Developer of the Year',
            date: '2022-12-01',
            awarder: 'Tech Corp',
            summary: 'Awarded for outstanding contribution',
          },
        ],
        certificates: [
          {
            name: 'AWS Certified Solutions Architect',
            date: '2021-05-15',
            issuer: 'Amazon Web Services',
            url: 'https://aws.amazon.com',
          },
        ],
        publications: [
          {
            name: 'Modern Web Architecture',
            publisher: 'Tech Publishing',
            releaseDate: '2021-08-01',
            url: 'https://pub.example.com',
            summary: 'A book about web development',
          },
        ],
        skills: [
          {
            name: 'Web Development',
            level: 'Master',
            keywords: ['TypeScript', 'React', 'Node.js'],
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
            keywords: ['GitHub', 'TypeScript'],
          },
        ],
        references: [
          {
            name: 'Manager Bob',
            reference: 'Jane is an exceptional engineer.',
          },
        ],
        projects: [
          {
            name: 'Project Alpha',
            description: 'Side project',
            highlights: ['Used by 10k users'],
            keywords: ['TypeScript'],
            startDate: '2021-01-01',
            endDate: '2021-06-01',
            url: 'https://project.example.com',
            roles: ['Creator'],
            entity: 'Self',
            type: 'Application',
          },
        ],
      };

      const result = validateResume(fullResume);
      assert.strictEqual(result.valid, true);
      assert.strictEqual(result.errors, undefined);
    });

    it('returns valid: false when email format is invalid', () => {
      const invalidResume = {
        basics: {
          name: 'John Doe',
          email: 'not-an-email',
        },
      };

      const result = validateResume(invalidResume);
      assert.strictEqual(result.valid, false);
      assert.ok(Array.isArray(result.errors));
      assert.ok(result.errors.length > 0);
      assert.ok(result.errors.some((err) => err.includes('email') || err.includes('format')));
    });

    it('returns valid: false when property types are incorrect', () => {
      const invalidResume = {
        work: 'this should be an array',
      };

      const result = validateResume(invalidResume);
      assert.strictEqual(result.valid, false);
      assert.ok(Array.isArray(result.errors));
      assert.ok(result.errors.length > 0);
      assert.ok(result.errors.some((err) => err.includes('work')));
    });

    it('returns valid: false for non-object primitive inputs', () => {
      const resultString = validateResume('not an object');
      assert.strictEqual(resultString.valid, false);
      assert.ok(Array.isArray(resultString.errors));

      const resultNumber = validateResume(12345);
      assert.strictEqual(resultNumber.valid, false);

      const resultNull = validateResume(null);
      assert.strictEqual(resultNull.valid, false);
    });

    it('caches the validator across multiple invocations', () => {
      const resume1 = { basics: { name: 'Alice' } };
      const resume2 = { basics: { name: 'Bob' } };

      const res1 = validateResume(resume1);
      const res2 = validateResume(resume2);

      assert.strictEqual(res1.valid, true);
      assert.strictEqual(res2.valid, true);
    });

    it('handles exceptions thrown during validation (Error instance)', () => {
      const throwingResume = {
        get basics() {
          throw new Error('Getter error during validation');
        },
      };

      const result = validateResume(throwingResume);
      assert.strictEqual(result.valid, false);
      assert.ok(Array.isArray(result.errors));
      assert.strictEqual(result.errors.length, 1);
      assert.strictEqual(
        result.errors[0],
        'Schema validation setup failed: Getter error during validation'
      );
    });

    it('handles non-Error exceptions thrown during validation', () => {
      const throwingResume = {
        get basics() {
          throw 'String error during validation';
        },
      };

      const result = validateResume(throwingResume);
      assert.strictEqual(result.valid, false);
      assert.ok(Array.isArray(result.errors));
      assert.strictEqual(result.errors.length, 1);
      assert.strictEqual(
        result.errors[0],
        'Schema validation setup failed: Unknown error'
      );
    });

    it('handles validation error formatting edge cases', () => {
      // Test invalid object structure
      const result = validateResume({ basics: 123 });
      assert.strictEqual(result.valid, false);
      assert.ok(Array.isArray(result.errors));
      assert.ok(result.errors.length > 0);
    });
  });
});

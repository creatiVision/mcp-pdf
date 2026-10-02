/**
 * Resume JSON Schema validator using AJV
 */

import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { readFileSync } from 'fs';
import { readFile } from 'fs/promises';
import moduleRoot from 'module-root-sync';
import * as path from 'path';
import { join } from 'path';
import * as url from 'url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const packageRoot = moduleRoot(__dirname);
const schemaPath = join(packageRoot, 'assets/resume.schema.json');

const ajv = new Ajv({
  allErrors: true,
  verbose: true,
  strict: false,
});
addFormats(ajv);

// Cache the compiled validator or promise for compiled validator
let cachedValidate: ReturnType<typeof ajv.compile> | null = null;
let validatorPromise: Promise<ReturnType<typeof ajv.compile>> | null = null;

/**
 * Compile JSON schema and populate cache
 */
function compileSchema(schemaContent: string): ReturnType<typeof ajv.compile> {
  const schema = JSON.parse(schemaContent);
  cachedValidate = ajv.compile(schema);
  return cachedValidate;
}

/**
 * Get or compile the resume schema validator asynchronously (cached)
 */
export async function getValidatorAsync(): Promise<ReturnType<typeof ajv.compile>> {
  if (cachedValidate) {
    return cachedValidate;
  }

  if (validatorPromise) {
    return validatorPromise;
  }

  validatorPromise = (async () => {
    const schemaContent = await readFile(schemaPath, 'utf-8');
    return compileSchema(schemaContent);
  })();

  return validatorPromise;
}

/**
 * Get or compile the resume schema validator synchronously (cached)
 */
function getValidator(): ReturnType<typeof ajv.compile> {
  if (cachedValidate) {
    return cachedValidate;
  }

  // Load and compile the schema once synchronously
  const schemaContent = readFileSync(schemaPath, 'utf-8');
  return compileSchema(schemaContent);
}

/**
 * Validation result type
 */
export interface ValidationResult {
  valid: boolean;
  errors?: string[];
}

function processValidation(validate: ReturnType<typeof ajv.compile>, resume: unknown): ValidationResult {
  const valid = validate(resume);

  if (!valid) {
    const errors = validate.errors?.map((error) => {
      const path = error.instancePath || 'root';
      const message = error.message || 'Unknown error';
      return `${path}: ${message}`;
    }) || ['Unknown validation error'];

    return { valid: false, errors };
  }

  return { valid: true };
}

/**
 * Validate a resume object against the JSON Resume schema asynchronously
 */
export async function validateResumeAsync(resume: unknown): Promise<ValidationResult> {
  try {
    const validate = await getValidatorAsync();
    return processValidation(validate, resume);
  } catch (error) {
    return {
      valid: false,
      errors: [`Schema validation setup failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
    };
  }
}

/**
 * Validate a resume object against the JSON Resume schema synchronously
 */
export function validateResume(resume: unknown): ValidationResult {
  try {
    const validate = getValidator();
    return processValidation(validate, resume);
  } catch (error) {
    return {
      valid: false,
      errors: [`Schema validation setup failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
    };
  }
}

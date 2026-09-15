import assert from 'assert';
import { compile, registerFilter, registerHelper, render } from '../../../src/lib/template.ts';

describe('Template engine', () => {
  describe('render', () => {
    it('renders a valid template with context', () => {
      const result = render('Hello {{ name }}!', { name: 'World' });
      assert.strictEqual(result, 'Hello World!');
    });

    it('falls back to original template on render error', () => {
      // Unclosed Liquid tag triggers a syntax/parse error in Liquid engine
      const invalidTemplate = 'Hello {% if true %}World';
      const result = render(invalidTemplate, {});
      assert.strictEqual(result, invalidTemplate);
    });
  });

  describe('compile', () => {
    it('compiles a template for repeated rendering', () => {
      const compiled = compile('Item: {{ item }}');
      assert.strictEqual(compiled({ item: 'A' }), 'Item: A');
      assert.strictEqual(compiled({ item: 'B' }), 'Item: B');
    });

    it('falls back to original template if execution fails during compiled render', () => {
      // Register a filter that throws an error when invoked
      registerFilter('throwingFilter', () => {
        throw new Error('Filter error');
      });
      const compiled = compile('Test {{ val | throwingFilter }}');
      const result = compiled({ val: 'test' });
      assert.strictEqual(result, 'Test {{ val | throwingFilter }}');
    });
  });

  describe('built-in and custom filters', () => {
    it('supports built-in uppercase filter', () => {
      assert.strictEqual(render('{{ name | uppercase }}', { name: 'alice' }), 'ALICE');
    });

    it('supports built-in lowercase filter', () => {
      assert.strictEqual(render('{{ name | lowercase }}', { name: 'BOB' }), 'bob');
    });

    it('supports built-in capitalize filter', () => {
      assert.strictEqual(render('{{ name | capitalize }}', { name: 'charlie' }), 'Charlie');
    });

    it('supports built-in trim filter', () => {
      assert.strictEqual(render('{{ name | trim }}', { name: '  dave  ' }), 'dave');
    });

    it('supports built-in join filter with arrays and default/custom separators', () => {
      assert.strictEqual(render('{{ items | join }}', { items: ['a', 'b', 'c'] }), 'a, b, c');
      assert.strictEqual(render('{{ items | join: "-" }}', { items: ['a', 'b', 'c'] }), 'a-b-c');
      assert.strictEqual(render('{{ items | join }}', { items: 'not-an-array' }), 'not-an-array');
    });

    it('allows registering custom filters', () => {
      registerFilter('repeat', (v) => `${String(v)}${String(v)}`);
      assert.strictEqual(render('{{ name | repeat }}', { name: 'hi' }), 'hihi');
    });

    it('allows registering custom helpers', () => {
      registerHelper('greet', (_ctx, value, prefix) => `${prefix || 'Hello'} ${value}!`);
      assert.strictEqual(render('{{ name | greet: "Hi" }}', { name: 'Alice' }), 'Hi Alice!');
    });
  });
});

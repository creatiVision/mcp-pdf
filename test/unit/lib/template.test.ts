import assert from 'assert';
import { compile, registerFilter, registerHelper, render } from '../../../src/lib/template.ts';

describe('template engine', (): void => {
  describe('render', (): void => {
    it('renders simple variable interpolation', (): void => {
      const result = render('Hello, {{ name }}!', { name: 'World' });
      assert.strictEqual(result, 'Hello, World!');
    });

    it('renders tags like if and for', (): void => {
      const template = '{% if show %}Yes{% else %}No{% endif %} - {% for item in items %}{{ item }}{% endfor %}';
      const result = render(template, { show: true, items: ['a', 'b', 'c'] });
      assert.strictEqual(result, 'Yes - abc');
    });

    it('handles missing or undefined variables gracefully', (): void => {
      const result = render('Hello, {{ missing }}!', {});
      assert.strictEqual(result, 'Hello, !');
    });

    it('returns template as-is when Liquid syntax error occurs', (): void => {
      const invalidTemplate = 'Hello, {{ name ';
      const result = render(invalidTemplate, { name: 'World' });
      assert.strictEqual(result, invalidTemplate);
    });
  });

  describe('compile', (): void => {
    it('returns a render function that can be re-used with different contexts', (): void => {
      const templateFn = compile('User: {{ user.name }} ({{ user.role }})');

      const res1 = templateFn({ user: { name: 'Alice', role: 'Admin' } });
      assert.strictEqual(res1, 'User: Alice (Admin)');

      const res2 = templateFn({ user: { name: 'Bob', role: 'Guest' } });
      assert.strictEqual(res2, 'User: Bob (Guest)');
    });

    it('returns original template on render error in compiled function', (): void => {
      // Register a filter that throws an error
      registerFilter('throwError', () => {
        throw new Error('Filter error');
      });

      const template = '{{ name | throwError }}';
      const templateFn = compile(template);
      const result = templateFn({ name: 'Test' });
      assert.strictEqual(result, template);
    });
  });

  describe('built-in filters', (): void => {
    it('uppercase filter converts string to uppercase', (): void => {
      assert.strictEqual(render('{{ "hello" | uppercase }}', {}), 'HELLO');
      assert.strictEqual(render('{{ val | uppercase }}', { val: null }), '');
    });

    it('lowercase filter converts string to lowercase', (): void => {
      assert.strictEqual(render('{{ "HELLO" | lowercase }}', {}), 'hello');
      assert.strictEqual(render('{{ val | lowercase }}', { val: undefined }), '');
    });

    it('capitalize filter capitalizes first letter', (): void => {
      assert.strictEqual(render('{{ "hello world" | capitalize }}', {}), 'Hello world');
      assert.strictEqual(render('{{ "" | capitalize }}', {}), '');
      assert.strictEqual(render('{{ val | capitalize }}', { val: null }), '');
    });

    it('trim filter trims whitespace', (): void => {
      assert.strictEqual(render('{{ "  hello  " | trim }}', {}), 'hello');
      assert.strictEqual(render('{{ val | trim }}', { val: null }), '');
    });

    it('join filter joins array with default and custom separators', (): void => {
      assert.strictEqual(render('{{ items | join }}', { items: ['apple', 'banana'] }), 'apple, banana');
      assert.strictEqual(render('{{ items | join: " - " }}', { items: ['apple', 'banana'] }), 'apple - banana');
      assert.strictEqual(render('{{ nonArray | join }}', { nonArray: 'single' }), 'single');
      assert.strictEqual(render('{{ val | join }}', { val: null }), '');
    });
  });

  describe('custom filters and helpers', (): void => {
    it('registerFilter adds a custom filter', (): void => {
      registerFilter('repeat', (v, times) => String(v ?? '').repeat(Number(times ?? 1)));
      const result = render('{{ "Hi" | repeat: 3 }}', {});
      assert.strictEqual(result, 'HiHiHi');
    });

    it('registerHelper adds a custom helper filter with argument conversion', (): void => {
      let capturedArgs: unknown[] = [];
      registerHelper('myHelper', (ctx, val, arg1, arg2) => {
        capturedArgs = [ctx, val, arg1, arg2];
        return `${val}:${arg1}:${arg2}`;
      });

      const result = render('{{ "item" | myHelper: "foo", "bar" }}', {});
      assert.strictEqual(result, 'item:foo:bar');
      assert.deepStrictEqual(capturedArgs, [{}, 'item', 'foo', 'bar']);
    });

    it('registerHelper handles null/undefined values and arguments', (): void => {
      registerHelper('nullHelper', (_ctx, val, arg1) => `val=${val},arg1=${arg1 ?? ''}`);
      const result = render('{{ missing | nullHelper }}', {});
      assert.strictEqual(result, 'val=,arg1=');
    });
  });
});

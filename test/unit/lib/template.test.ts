import assert from 'assert';
import { registerFilter, registerHelper, render } from '../../../src/lib/template.ts';

describe('template rendering', () => {
  describe('render', () => {
    it('renders basic variable interpolation', () => {
      const result = render('Hello {{ name }}!', { name: 'World' });
      assert.strictEqual(result, 'Hello World!');
    });

    it('renders multiple variables and context types', () => {
      const result = render('{{ greeting }}, {{ name }}! Count: {{ count }}', {
        greeting: 'Welcome',
        name: 'Alice',
        count: 42,
      });
      assert.strictEqual(result, 'Welcome, Alice! Count: 42');
    });

    it('handles LiquidJS control structures like if and for', () => {
      const template = '{% if show %}{% for item in items %}{{ item }}{% unless forloop.last %}, {% endunless %}{% endfor %}{% endif %}';
      const result = render(template, {
        show: true,
        items: ['apple', 'banana', 'cherry'],
      });
      assert.strictEqual(result, 'apple, banana, cherry');
    });

    it('handles undefined or missing context variables gracefully', () => {
      const result = render('Hello {{ missing }}!', {});
      assert.strictEqual(result, 'Hello !');
    });

    it('returns original template on syntax error / render failure', () => {
      // Invalid tag syntax in LiquidJS
      const invalidTemplate = 'Hello {% invalid_tag_that_throws %}!';
      const result = render(invalidTemplate, {});
      assert.strictEqual(result, invalidTemplate);
    });
  });

  describe('built-in filters', () => {
    it('uppercase filter transforms string to uppercase', () => {
      const result = render('{{ text | uppercase }}', { text: 'hello world' });
      assert.strictEqual(result, 'HELLO WORLD');
    });

    it('lowercase filter transforms string to lowercase', () => {
      const result = render('{{ text | lowercase }}', { text: 'HELLO WORLD' });
      assert.strictEqual(result, 'hello world');
    });

    it('capitalize filter capitalizes first letter', () => {
      const result = render('{{ text | capitalize }}', { text: 'hello world' });
      assert.strictEqual(result, 'Hello world');
    });

    it('trim filter strips whitespace from both ends', () => {
      const result = render('{{ text | trim }}', { text: '  hello  ' });
      assert.strictEqual(result, 'hello');
    });

    it('join filter joins arrays with custom or default separator', () => {
      const resultWithDefault = render('{{ list | join }}', { list: ['a', 'b', 'c'] });
      assert.strictEqual(resultWithDefault, 'a, b, c');

      const resultWithCustom = render('{{ list | join: " - " }}', { list: ['a', 'b', 'c'] });
      assert.strictEqual(resultWithCustom, 'a - b - c');
    });

    it('built-in filters handle null or undefined input gracefully', () => {
      assert.strictEqual(render('{{ missing | uppercase }}', {}), '');
      assert.strictEqual(render('{{ missing | lowercase }}', {}), '');
      assert.strictEqual(render('{{ missing | capitalize }}', {}), '');
      assert.strictEqual(render('{{ missing | trim }}', {}), '');
      assert.strictEqual(render('{{ missing | join }}', {}), '');
    });
  });

  describe('custom filters and helpers', () => {
    it('registerFilter allows registering custom Liquid filters', () => {
      registerFilter('double', (v) => Number(v ?? 0) * 2);
      const result = render('{{ num | double }}', { num: 21 });
      assert.strictEqual(result, '42');
    });

    it('registerHelper registers custom helper function as a Liquid filter', () => {
      registerHelper('greet', (_ctx, value, salutation) => `${salutation || 'Hello'}, ${value}!`);
      const result = render('{{ name | greet: "Hi" }}', { name: 'Bob' });
      assert.strictEqual(result, 'Hi, Bob!');
    });
  });
});

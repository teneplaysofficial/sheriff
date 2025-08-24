const test = require('node:test');
const assert = require('node:assert/strict');
const { validate, config, parseList } = require('../src/index');

test.describe('validate()', () => {
  test('rejects empty title', () => {
    const r = validate('');
    assert.equal(r.valid, false);
    assert.match(r.reason, /Title is empty or not a string/i);
  });

  test('rejects non-string input', () => {
    const r = validate(123);
    assert.equal(r.valid, false);
    assert.match(r.reason, /not a string/i);
  });

  test('rejects wrong format', () => {
    const r = validate('just a random title');
    assert.equal(r.valid, false);
    assert.match(r.reason, /format/);
  });

  test('accepts valid type and message', () => {
    const title = `${config.types[0]}: add feature`;
    const result = validate(title);
    assert.equal(result.valid, true);
  });

  test('rejects invalid type', () => {
    const title = 'foo: something';
    const result = validate(title);
    assert.equal(result.valid, false);
    assert.match(result.reason, /not allowed/);
  });

  test('rejects invalid scope when enforce_scopes = true', () => {
    config.enforce_scopes = true;
    const title = `${config.types[0]}(badscope): msg`;
    const result = validate(title);
    assert.equal(result.valid, false);
    assert.match(result.reason, /Scope "badscope"/);
    config.enforce_scopes = false;
  });

  test('accepts invalid scope when enforce_scopes = false', () => {
    config.enforce_scopes = false;
    const title = `${config.types[0]}(randomscope): msg`;
    const result = validate(title);
    assert.equal(result.valid, true);
  });

  test('accepts multiple scopes separated by | when enforce_scopes = true', () => {
    config.enforce_scopes = true;
    const validScope = config.scopes[0];
    const title = `${config.types[0]}(${validScope}|${validScope}): msg`;
    const result = validate(title);
    assert.equal(result.valid, true);
    config.enforce_scopes = false;
  });

  test('rejects when one of multiple scopes is invalid', () => {
    config.enforce_scopes = true;
    const validScope = config.scopes[0];
    const title = `${config.types[0]}(${validScope}|badscope): msg`;
    const result = validate(title);
    assert.equal(result.valid, false);
    assert.match(result.reason, /Scope "badscope"/);
    config.enforce_scopes = false;
  });

  test('handles breaking changes when allowed', () => {
    const title = `${config.types[0]}!: breaking stuff`;
    const result = validate(title);
    assert.equal(result.valid, true);
  });

  test('rejects breaking changes if disabled', () => {
    config.allow_breaking = false;
    const title = `${config.types[0]}!: breaking stuff`;
    const result = validate(title);
    assert.equal(result.valid, false);
    assert.match(result.reason, /not allowed/);
    config.allow_breaking = true;
  });

  test('rejects BREAKING CHANGE type with exclamation', () => {
    const title = 'BREAKING CHANGE!: overhaul';
    const result = validate(title);
    assert.equal(result.valid, false);
    assert.match(result.reason, /must not include "!"/);
  });

  test('accepts BREAKING CHANGE type without exclamation', () => {
    const title = 'BREAKING CHANGE: overhaul';
    const result = validate(title);
    assert.equal(result.valid, true);
  });

  test('rejects empty message after colon', () => {
    const title = `${config.types[0]}:   `;
    const result = validate(title);
    assert.equal(result.valid, false);
    assert.match(result.reason, /empty/);
  });

  test('rejects capitalized type', () => {
    const title = 'Feat: add feature';
    const result = validate(title);
    assert.equal(result.valid, false);
    assert.match(result.reason, /must be lowercase/);
  });

  test('rejects title with extra spaces trimmed', () => {
    const validScope = config.scopes[0];
    const title = ` ${config.types[0]} ( ${validScope} ) : spaced msg `;
    const result = validate(title);
    assert.equal(result.valid, false);
    assert.match(result.reason, /not allowed/);
  });
});

test.describe('parseList()', () => {
  const cases = [
    { input: 'a,b,c', expected: ['a', 'b', 'c'], desc: 'comma-separated' },
    {
      input: '"a","b","c"',
      expected: ['a', 'b', 'c'],
      desc: 'quoted comma-separated',
    },
    { input: 'a\nb\nc', expected: ['a', 'b', 'c'], desc: 'newline-separated' },
    {
      input: '[a, b, c]',
      expected: ['a', 'b', 'c'],
      desc: 'YAML-style inline array',
    },
    {
      input: '  "x" ,  y ,  z  ',
      expected: ['x', 'y', 'z'],
      desc: 'trims whitespace and quotes',
    },
    { input: '', expected: [], desc: 'empty string to empty array' },
    {
      input: 'a,,b,\n,',
      expected: ['a', 'b'],
      desc: 'filters out empty items',
    },
    {
      input: ['a', 'b'],
      expected: ['a', 'b'],
      desc: 'already an array to unchanged',
    },
    {
      input: ' single ',
      expected: ['single'],
      desc: 'single value with spaces',
    },
    {
      input: 'a|b|c',
      expected: ['a', 'b', 'c'],
      desc: 'pipe-separated list',
    },
  ];

  for (const { input, expected, desc } of cases) {
    test(`parses ${desc}`, () => {
      assert.deepEqual(parseList(input), expected);
    });
  }
});

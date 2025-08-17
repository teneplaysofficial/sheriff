const test = require('node:test');
const assert = require('node:assert/strict');
const { validate, config } = require('../src/index');

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

  test('rejects invalid scope', () => {
    const title = `${config.types[0]}(badscope): msg`;
    const result = validate(title);
    assert.equal(result.valid, false);
    assert.match(result.reason, /Scope "badscope"/);
  });

  test('accepts multiple scopes separated by |', () => {
    const validScope = config.scopes[0];
    const title = `${config.types[0]}(${validScope}|${validScope}): msg`;
    const result = validate(title);
    assert.equal(result.valid, true);
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

  test('rejects empty message after colon', () => {
    const title = `${config.types[0]}:   `;
    const result = validate(title);
    assert.equal(result.valid, false);
    assert.match(result.reason, /empty/);
  });
});

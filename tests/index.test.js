import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import * as core from '@actions/core'
import * as github from '@actions/github'
import { config, main, validate } from '../src/main.js'

function setTitle(title) {
  config.title = title
}

function resetConfig() {
  config.title = ''
  config.allow_breaking = true
  config.enforce_scopes = false
}

test.describe('validate()', () => {
  test('rejects empty title', () => {
    resetConfig()
    setTitle('')
    const r = validate()
    assert.equal(r.valid, false)
    assert.match(r.reason, /PR title is missing/i)
  })

  test('rejects non-string title', () => {
    resetConfig()
    config.title = 123
    const r = validate()
    assert.equal(r.valid, false)
    assert.match(r.reason, /not a string/i)
  })

  test('rejects completely invalid format', () => {
    resetConfig()
    setTitle('just a random title')
    const r = validate()
    assert.equal(r.valid, false)
    assert.match(r.reason, /format/i)
  })

  test('rejects uppercase type', () => {
    resetConfig()
    setTitle('Feat: add feature')
    const r = validate()
    assert.equal(r.valid, false)
    assert.match(r.reason, /must be lowercase/)
  })

  test('rejects extra spaces around syntax', () => {
    resetConfig()
    setTitle('feat (core) : msg')
    const r = validate()
    assert.equal(r.valid, false)
    assert.match(r.reason, /Extra spaces/)
  })

  test('rejects pipe-separated scopes', () => {
    resetConfig()
    setTitle('feat(core|api): msg')
    const r = validate()
    assert.equal(r.valid, false)
    assert.match(r.reason, /comma-separated/)
  })

  test('rejects scopes with spaces', () => {
    resetConfig()
    setTitle('feat(core, api): msg')
    const r = validate()
    assert.equal(r.valid, false)
    assert.match(r.reason, /must not contain spaces/)
  })

  test('rejects empty scope', () => {
    resetConfig()
    setTitle('feat(): msg')
    const r = validate()
    assert.equal(r.valid, false)
    assert.match(r.reason, /Scope cannot be empty/)
  })

  // MESSAGE
  test('rejects empty message after colon', () => {
    resetConfig()
    setTitle('feat:   ')
    const r = validate()
    assert.equal(r.valid, false)
    assert.match(r.reason, /cannot be empty/)
  })

  // TYPE
  test('accepts valid type and message', () => {
    resetConfig()
    setTitle(`${config.types[0]}: add feature`)
    const r = validate()
    assert.equal(r.valid, true)
  })

  test('rejects invalid type', () => {
    resetConfig()
    setTitle('foo: something')
    const r = validate()
    assert.equal(r.valid, false)
    assert.match(r.reason, /Type "foo" is not allowed/)
  })

  // SCOPE
  test('accepts valid single scope when enforced', () => {
    resetConfig()
    config.enforce_scopes = true
    const s = config.scopes[0]
    setTitle(`feat(${s}): msg`)
    const r = validate()
    assert.equal(r.valid, true)
  })

  test('accepts multiple valid scopes when enforced', () => {
    resetConfig()
    config.enforce_scopes = true
    const s = config.scopes[0]
    setTitle(`feat(${s},${s}): msg`)
    const r = validate()
    assert.equal(r.valid, true)
  })

  test('rejects single invalid scope when enforced', () => {
    resetConfig()
    config.enforce_scopes = true
    setTitle('feat(badscope): msg')
    const r = validate()
    assert.equal(r.valid, false)
    assert.match(r.reason, /Invalid scope/)
  })

  test('rejects multiple invalid scopes when enforced', () => {
    resetConfig()
    config.enforce_scopes = true
    setTitle('feat(bad1,bad2): msg')
    const r = validate()
    assert.equal(r.valid, false)
    assert.match(r.reason, /Invalid scopes: bad1, bad2/)
  })

  test('accepts invalid scope when enforcement is off', () => {
    resetConfig()
    setTitle('feat(randomscope): msg')
    const r = validate()
    assert.equal(r.valid, true)
  })

  // BREAKING CHANGE
  test('allows breaking changes when enabled', () => {
    resetConfig()
    setTitle('feat!: breaking stuff')
    const r = validate()
    assert.equal(r.valid, true)
  })

  test('rejects breaking changes when disabled', () => {
    resetConfig()
    config.allow_breaking = false
    setTitle('feat!: breaking stuff')
    const r = validate()
    assert.equal(r.valid, false)
    assert.match(r.reason, /Breaking changes are not allowed/)
  })

  test('rejects BREAKING CHANGE with exclamation', () => {
    resetConfig()
    setTitle('BREAKING CHANGE!: overhaul')
    const r = validate()
    assert.equal(r.valid, false)
    assert.match(r.reason, /must not include "!"/)
  })

  test('accepts BREAKING CHANGE without exclamation', () => {
    resetConfig()
    setTitle('BREAKING CHANGE: overhaul')
    const r = validate()
    assert.equal(r.valid, true)
  })

  // SKIP-CI
  test('accepts title ending with [skip-ci]', () => {
    resetConfig()
    setTitle('feat: add feature [skip-ci]')
    const r = validate()
    assert.equal(r.valid, true)
  })

  test('accepts title with spaced [ skip-ci ]', () => {
    resetConfig()
    setTitle('fix(core): fast fix [ skip-ci ]')
    const r = validate()
    assert.equal(r.valid, true)
  })

  test('accepts uppercase [SKIP-CI]', () => {
    resetConfig()
    setTitle('docs: update readme [SKIP-CI]')
    const r = validate()
    assert.equal(r.valid, true)
  })

  test('does not skip when [skip-ci] is not at the end', () => {
    resetConfig()
    setTitle('[skip-ci] feat: xyz')
    const r = validate()
    assert.equal(r.valid, false)
  })

  test('does not skip when skip-ci is not bracketed', () => {
    resetConfig()
    setTitle('feat: skip-ci update')
    const r = validate()
    assert.equal(r.valid, true)
  })
})

function setInput(name, value) {
  process.env[`INPUT_${name.replace(/ /g, '_').toUpperCase()}`] = value
}

function clearInputs() {
  for (const key of Object.keys(process.env)) {
    if (key.startsWith('INPUT_')) delete process.env[key]
  }
}

if (core.summary) {
  core.summary.addHeading = () => core.summary
  core.summary.addTable = () => core.summary
  core.summary.addCodeBlock = () => core.summary
  core.summary.write = async () => {}
}

test.describe('main()', () => {
  test.beforeEach(() => {
    clearInputs()
  })

  test('skips ignored author', async () => {
    fs.mkdirSync('.temp', { recursive: true })
    fs.writeFileSync(
      '.temp/ignored.txt',
      'tene <tene@users.noreply.github.com>',
    )

    setInput('ignore-authors', '.temp/ignored.txt')

    github.context.payload = {
      pull_request: {
        title: 'feat: ignored',
        user: { login: 'tene', email: null },
      },
    }

    await main()

    fs.unlinkSync('.temp/ignored.txt')
  })

  test('handles missing ignore file', async () => {
    setInput('ignore-authors', 'missing.txt')

    github.context.payload = {
      pull_request: {
        title: 'feat: ok',
        user: { login: 'user', email: null },
      },
    }

    await main()
  })

  test('loads ignore-authors from URL', async () => {
    global.fetch = async () => ({
      ok: true,
      text: async () => 'tene <tene@users.noreply.github.com>',
    })

    setInput('ignore-authors', 'https://example.com/ignore.txt')

    github.context.payload = {
      pull_request: {
        title: 'feat: remote',
        user: { login: 'tene', email: null },
      },
    }

    await main()
  })

  test('fails when not PR event', async () => {
    github.context.payload = {}

    await main()

    assert.equal(process.exitCode, 1)

    // IMPORTANT: reset it so the test runner does not fail
    process.exitCode = 0
  })
})

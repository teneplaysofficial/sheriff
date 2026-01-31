import fs from 'node:fs'
import path from 'node:path'
import * as core from '@actions/core'
import * as github from '@actions/github'
import {
  COMMIT_SCOPE_VALUES,
  COMMIT_TYPE_VALUES,
} from '@js-utils-kit/constants'

// Runtime configuration for PR title validation, Values can be overridden via action inputs.
export const config = {
  types: COMMIT_TYPE_VALUES,
  scopes: COMMIT_SCOPE_VALUES,
  allow_breaking: true,
  enforce_scopes: false,
  title: '',
  default: { ignoredAuthors: 'src/data/ignored-authors.txt' },
}

/**
 * Conventional Commit–style PR title format:
 *   <type>(<scope1,scope2>)!: <message>
 */
const TITLE_REGEX =
  /^(BREAKING CHANGE|[a-z]+)(?:\(([a-z0-9-]+(?:,[a-z0-9-]+)*)\))?(!?):\s(.+)$/

const isBoolean = (value) => /^(true|false|1|0)$/i.test(value)

// Resolves paths relative to the GitHub workspace when needed
function resolveWorkspacePath(inputPath) {
  if (path.isAbsolute(inputPath)) return inputPath
  return path.join(process.env.GITHUB_WORKSPACE ?? process.cwd(), inputPath)
}

// Parses an ignore-authors file.
function parseIgnoreAuthors(content) {
  return content
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !line.startsWith('#'))
    .map((line) => line.split('#')[0].trim())
    .filter(Boolean)
}

// Reads ignore-authors from a local file path
function readLocalFile(filePath) {
  const resolvedPath = resolveWorkspacePath(filePath)

  if (!fs.existsSync(resolvedPath)) {
    core.warning(`Ignore-authors file not found: ${resolvedPath}`)
    return []
  }

  return parseIgnoreAuthors(fs.readFileSync(resolvedPath, 'utf8'))
}

// Fetches ignore-authors from a remote URL
async function fetchRemoteFile(url) {
  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(
      `Failed to fetch ignore-authors file (${response.status} ${response.statusText})`,
    )
  }

  return parseIgnoreAuthors(await response.text())
}

// Loads ignore-authors from either a URL or local file
async function loadIgnoreAuthors(source) {
  if (/^https?:\/\//i.test(source)) {
    core.info('Loading ignore-authors from URL')
    return fetchRemoteFile(source)
  }

  core.info('Loading ignore-authors from local file')
  return readLocalFile(source)
}

// Checks whether the PR author matches any ignore rule
function isAuthorIgnored(rules, name, email) {
  return rules.some((rule) => {
    if ((name && rule === name) || (email && rule === email)) return true

    const m = rule.match(/^(.+?)\s*<(.+)>$/)
    if (!m) return false

    const [, rName, rEmail] = m
    if (name && rName !== name) return false

    return !email || rEmail === email
  })
}

async function writeSummary({ title, author, valid, skipped, reason }) {
  const resultEmoji = skipped ? '⏭️' : valid ? '✅' : '❌'
  const resultText = skipped
    ? 'Validation skipped'
    : valid
      ? 'Validation passed'
      : 'Validation failed'

  const summary = core.summary
    .addHeading('🕵️ Sheriff - PR Title Check', 2)
    .addTable([
      ['PR Title', title],
      ['Author', author],
      ['Result', `${resultEmoji} ${resultText}`],
      ['Breaking changes allowed', String(config.allow_breaking)],
      ['Scopes enforced', String(config.enforce_scopes)],
    ])

  if (!valid && reason) {
    summary.addHeading('❌ Failure Reason', 3).addCodeBlock(reason)
  }

  await summary.write()
}

/**
 * Validates the PR title against configured rules.
 *
 * @returns {{valid: boolean, reason?: string}}
 */
export function validate() {
  if (!config.title || typeof config.title !== 'string') {
    return {
      valid: false,
      reason: 'PR title is missing or not a string',
    }
  }

  // Allow explicit opt-out via [skip-ci]
  const skipCiMatch = config.title.match(/\[\s*skip-ci\s*\]$/i)
  if (skipCiMatch) {
    core.info('Skipping title validation due to [skip-ci] flag')
    return { valid: true }
  }

  const match = config.title.match(TITLE_REGEX)

  // Detailed error reporting when the main regex fails
  if (!match) {
    const rawType = config.title.split(':')[0].split('(')[0]

    // uppercase type
    if (/^[A-Z]/.test(rawType)) {
      return { valid: false, reason: `Type "${rawType}" must be lowercase` }
    }

    // white spaces around type, scope, or colon
    if (
      /\s+\(/.test(config.title) ||
      /\)\s+:/.test(config.title) ||
      /\s+:\s+/.test(config.title)
    ) {
      return {
        valid: false,
        reason: 'Extra spaces around type, scope, or colon are not allowed',
      }
    }

    // Pipe-separated scopes
    if (/\(.*\|.*\)/.test(config.title)) {
      return {
        valid: false,
        reason:
          'Scopes must be comma-separated (","), not pipe-separated ("|")',
      }
    }

    // Spaces inside scope list
    if (/\([a-z0-9-,]*\s+[a-z0-9-,]*\)/i.test(config.title)) {
      return { valid: false, reason: 'Scopes must not contain spaces' }
    }

    // Empty scope
    if (/\(\s*\)/.test(config.title)) {
      return { valid: false, reason: 'Scope cannot be empty' }
    }

    return {
      valid: false,
      reason: 'Title must follow "<type>(<scope>)?: <message>" format',
    }
  }

  const [, type, scope, breaking, message] = match

  // Message after colon is required
  if (!message.trim()) {
    return {
      valid: false,
      reason: 'Commit message after colon cannot be empty',
    }
  }

  // Enforce allowed commit types
  if (!config.types.includes(type)) {
    return { valid: false, reason: `Type "${type}" is not allowed` }
  }

  // Prevent invalid BREAKING CHANGE syntax
  if (type === 'BREAKING CHANGE' && breaking) {
    return {
      valid: false,
      reason: 'BREAKING CHANGE must not include "!"',
    }
  }

  // Validate scopes only when enforcement is enabled
  if (scope && config.enforce_scopes) {
    const scopes = scope.split(',').map((s) => s.trim())
    const invalidScopes = scopes.filter((s) => !config.scopes.includes(s))

    if (invalidScopes.length) {
      return {
        valid: false,
        reason: `Invalid scope${invalidScopes.length > 1 ? 's' : ''}: ${invalidScopes.join(
          ', ',
        )}`,
      }
    }
  }

  // Disallow breaking changes if disabled
  if (breaking && !config.allow_breaking) {
    return { valid: false, reason: 'Breaking changes are not allowed' }
  }

  return { valid: true }
}

export async function main() {
  try {
    const { pull_request: pr } = github.context.payload

    // Action only supports PR events
    if (!pr) {
      return core.setFailed('This action only supports pull_request events')
    }

    const authorName = pr.user.login
    const authorEmail = pr.user.email

    config.title = pr.title.trim()

    core.startGroup('PR Context')

    core.info(`Title  : "${config.title}"`)
    core.info(`Author : ${authorName}`)

    core.endGroup()

    core.startGroup('Author Ignore Check')

    // ignore-authors
    const rawIgnoreAuthors = core.getInput('ignore-authors').trim()
    let ignoreRules = []

    if (isBoolean(rawIgnoreAuthors)) {
      if (core.getBooleanInput('ignore-authors')) {
        ignoreRules = await loadIgnoreAuthors(config.default.ignoredAuthors)
      } else {
        core.info('Ignore-authors feature is disabled')
      }
    } else if (rawIgnoreAuthors) {
      ignoreRules = await loadIgnoreAuthors(rawIgnoreAuthors)
    }

    // Skip validation completely if author is ignored
    if (
      ignoreRules.length &&
      isAuthorIgnored(ignoreRules, authorName, authorEmail)
    ) {
      core.notice(`PR author "${authorName}" is ignored — skipping validation`)
      core.setOutput('valid', true)

      await writeSummary({
        title: config.title,
        author: authorName,
        valid: true,
        skipped: true,
      })

      core.endGroup()

      return
    }
    core.info('Author is not ignored')
    core.endGroup()

    core.startGroup('Configuration')

    // types
    const typesInput = core.getMultilineInput('types')
    if (typesInput.length) config.types = typesInput

    // scopes
    const scopesInput = core.getMultilineInput('scopes')
    if (scopesInput.length) config.scopes = scopesInput

    // allow_breaking
    config.allow_breaking = core.getBooleanInput('allow_breaking')

    // enforce_scopes
    config.enforce_scopes = core.getBooleanInput('enforce_scopes')

    // Log effective configuration
    core.info(`Allowed commit types: ${config.types.join(', ')}`)
    core.info(
      config.enforce_scopes
        ? `Allowed commit scopes: ${config.scopes.join(', ')}`
        : 'Scopes are not enforced',
    )
    core.info(`Breaking changes allowed: ${config.allow_breaking}`)

    core.endGroup()

    core.startGroup('PR Title Validation')

    const { valid, reason } = validate()

    core.setOutput('valid', valid)

    await writeSummary({
      title: config.title,
      author: authorName,
      valid,
      skipped: false,
      reason,
    })

    if (valid) core.info('PR title passed validation')
    else core.setFailed(`PR title validation failed: ${reason}`)

    core.endGroup()
  } catch (error) {
    core.setOutput('valid', false)
    core.setFailed(error instanceof Error ? error.message : String(error))
  }
}

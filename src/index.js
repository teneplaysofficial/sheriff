const core = require('@actions/core');
const github = require('@actions/github');
const types = require('./data/types.json');
const scopes = require('./data/scopes.json');

const config = {
  types,
  scopes,
  allow_breaking: true,
  enforce_scopes: false,
};

// console.log(config)

function parseList(input) {
  if (!input) return [];

  if (Array.isArray(input)) {
    return input
      .map((s) =>
        String(s)
          .trim()
          .replace(/^["']|["']$/g, ''),
      )
      .filter(Boolean);
  }

  let str = String(input).trim();
  if (str.startsWith('[') && str.endsWith(']')) {
    try {
      return JSON.parse(str).map((s) => String(s).trim());
    } catch {
      str = str.slice(1, -1);
    }
  }

  if (str.includes('|')) {
    return str
      .split('|')
      .map((s) => s.trim())
      .filter(Boolean);
  }

  return str
    .split(/[\n,]+/)
    .map((s) => s.trim().replace(/^["']|["']$/g, ''))
    .filter(Boolean);
}

function validate(title = '') {
  if (!title || typeof title !== 'string') {
    return { valid: false, reason: 'Title is empty or not a string' };
  }

  title = title.trim();

  const skipCiMatch = title.match(/\[\s*skip-ci\s*\]$/i);

  if (skipCiMatch) {
    core.info(
      `Skipping PR title checks because [skip-ci] was found at index ${skipCiMatch.index}`,
    );
    return { valid: true };
  }

  const match = title.match(
    /^(BREAKING CHANGE|[a-z]+)(?:\(([^)]+)\))?(!?):\s(.+)$/,
  );

  if (!match) {
    const parts = title.split(':');

    if (parts.length > 1 && !parts[1].trim()) {
      return { valid: false, reason: 'Message after colon cannot be empty' };
    }

    const upperType = title.split(':')[0].split('(')[0];

    if (/^[A-Z]/.test(upperType)) {
      return {
        valid: false,
        reason: `Type "${upperType}" must be lowercase`,
      };
    }

    if (/\s+\(/.test(title) || /\)\s+:/.test(title) || /\s+:\s+/.test(title)) {
      return {
        valid: false,
        reason: 'Extra spaces around type, scope, or colon are not allowed',
      };
    }

    return {
      valid: false,
      reason: 'Title does not match "<type>(<scope>)?: <message>" format',
    };
  }

  const [, type, scope, breaking] = match;

  if (!config.types.includes(type)) {
    return { valid: false, reason: `Type "${type}" is not allowed` };
  }

  if (type === 'BREAKING CHANGE' && breaking) {
    return {
      valid: false,
      reason: 'Type "BREAKING CHANGE" must not include "!" in title',
    };
  }

  if (scope && config.enforce_scopes) {
    const scopesList = scope
      .split('|')
      .map((s) => s.trim())
      .filter(Boolean);

    for (const s of scopesList) {
      if (!config.scopes.includes(s)) {
        return { valid: false, reason: `Scope "${s}" is not allowed` };
      }
    }
  }

  if (breaking && !config.allow_breaking) {
    return { valid: false, reason: 'Breaking changes are not allowed' };
  }

  return { valid: true };
}

function main() {
  try {
    const payload = github.context.payload;

    const inputTypes = core.getInput('types');
    const inputScopes = core.getInput('scopes');
    const inputBreaking = core.getBooleanInput('allow_breaking');
    const inputEnforceScopes = core.getBooleanInput('enforce_scopes');

    if (inputTypes) config.types = parseList(inputTypes);

    if (inputScopes) config.scopes = parseList(inputScopes);

    config.allow_breaking = inputBreaking;

    config.enforce_scopes = inputEnforceScopes;

    const pr = payload.pull_request;

    if (!pr)
      return core.setFailed('This action only runs on pull_request events');

    const pr_title = pr.title;

    core.info(`PR title: ${pr_title}`);
    core.warning(`Allowed types: ${config.types.join(', ')}`);
    if (config.enforce_scopes) {
      core.warning(`Allowed scopes: ${config.scopes.join(', ')}`);
    } else {
      core.warning(`Scopes are not enforced (any scope allowed)`);
    }
    core.warning(`Breaking allowed: ${config.allow_breaking}`);
    core.info('Validating PR title');

    const { valid, reason } = validate(pr_title);

    core.setOutput('valid', valid);

    if (valid) {
      core.info(`PR title passed validation`);
    } else {
      core.setFailed(
        `PR title failed validation: ${reason || 'Unknown validation error'}`,
      );
    }
  } catch (err) {
    core.setOutput('valid', false);
    core.setFailed(err instanceof Error ? err.message : String(err));
  }
}

if (require.main === module) main();

module.exports = {
  config,
  validate,
  main,
  parseList,
};

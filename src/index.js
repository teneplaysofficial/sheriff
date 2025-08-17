const core = require('@actions/core');
const github = require('@actions/github');
const types = require('./data/types.json');
const scopes = require('./data/scopes.json');
const colors = require('ansilory').default;

const config = {
  types,
  scopes,
  allow_breaking: true,
};

function validate(title = '') {
  if (!title || typeof title !== 'string') {
    return { valid: false, reason: 'Title is empty or not a string' };
  }

  const match = title.match(/^([a-z]+)(?:\(([^)]+)\))?(!?):\s(.+)$/);

  if (!match) {
    return {
      valid: false,
      reason: 'Title does not match "<type>(<scope>)?: <message>" format',
    };
  }

  const [, type, scope, breaking, message] = match;

  if (!config.types.includes(type)) {
    return { valid: false, reason: `Type "${type}" is not allowed` };
  }

  if (type === 'BREAKING CHANGE' && breaking) {
    return {
      valid: false,
      reason: 'Type "BREAKING CHANGE" must not include "!" in title',
    };
  }

  if (scope) {
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

  if (!message.trim()) {
    return { valid: false, reason: 'Commit message after ":" is empty' };
  }

  return { valid: true };
}

function main() {
  try {
    const payload = github.context.payload;

    const inputTypes = core.getInput('types');
    const inputScopes = core.getInput('scopes');
    const inputBreaking = core.getInput('breaking');

    if (inputTypes) config.types = inputTypes.split(',').map((t) => t.trim());

    if (inputScopes)
      config.scopes = inputScopes.split(',').map((s) => s.trim());

    if (inputBreaking)
      config.allow_breaking = inputBreaking.toLowerCase() === 'true';

    const pr = payload.pull_request;

    if (!pr)
      return core.setFailed('This action only runs on pull_request events');

    const pr_title = pr.title;
    core.info(`${colors.blue.apply('PR title:')} ${pr_title}`);
    core.warning(`Allowed types: ${config.types.join(', ')}`);
    core.warning(`Allowed scopes: ${config.scopes.join(', ')}`);
    core.warning(`Breaking allowed: ${config.allow_breaking}`);
    core.info(colors.blue.apply('Validating PR title'));

    const { valid, reason } = validate(pr_title);

    core.setOutput('valid', valid);

    if (valid) {
      core.info(colors.green.apply('PR title passed validation'));
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
};

<div align="center">

# 🕵️‍♂️ Sheriff

_Enforce Conventional Commits on pull request titles like a true sheriff, keep your repo law-abiding!_

</div>

[![tests](https://github.com/teneplaysofficial/sheriff/actions/workflows/tests.yml/badge.svg)](https://github.com/TenEplaysOfficial/sheriff)

## 📜 Overview

**Sheriff** is a GitHub Action that patrols your pull requests and ensures titles follow a strict format. Perfect for enforcing [**Conventional Commits**](https://www.conventionalcommits.org) or your own custom rules.

> No more wild, lawless PR titles - the Sheriff keeps things tidy.

## ✨ Features

- Enforces the **`type(scope): message`** format
- Supports **multiple scopes** - `type(scope1|scope2): message`
- Detects **breaking changes** (`!`) and checks if they’re allowed
- Fully configurable types & scopes
- Flexible input formats for `types` and `scopes` (comma, newline, arrays, pipes)
- Instantly fails CI if rules are broken
- Works in any PR workflow

## 🤠 How to Deputize the Sheriff

> _Follow these steps and your repo will be safer than a vault in Fort Knox._

1. **Star the repo** - show the Sheriff some love before he starts working 😁.
2. **Create a workflow file** `.github/workflows/check-pr-title.yml`.
3. **Copy this template** into your file:

   ```yml
   name: PR Title Check

   on:
     pull_request:
       types: [opened, edited, reopened]

   jobs:
     sheriff:
       runs-on: ubuntu-latest
       steps:
         - name: Validate PR title
           uses: teneplaysofficial/sheriff@v3
           with:
             types: [feat, fix, docs, ci, test, chore]
             scopes: |
               core
               api
               ui
               docs
             allow_breaking: true
             enforce_scopes: true
   ```

4. **Commit & push** - the Sheriff is now on duty.
   Any outlaw PR title will be gunned down.

## 🔧 Inputs

| Name             | Required | Default                                                                                                  | Description                                                                      |
| ---------------- | -------- | -------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `types`          | No       | Loaded from [`types.json`](https://github.com/teneplaysofficial/sheriff/blob/main/src/data/types.json)   | List of allowed commit types                                                     |
| `scopes`         | No       | Loaded from [`scopes.json`](https://github.com/teneplaysofficial/sheriff/blob/main/src/data/scopes.json) | Same as `types` but for commit scopes                                            |
| `allow_breaking` | No       | `true`                                                                                                   | Whether breaking changes (`!`) are allowed                                       |
| `enforce_scopes` | No       | `false`                                                                                                  | If `true`, only scopes from config or input are allowed; else any pass any value |

### Example Input Formats

All of these work for `types` or `scopes`:

```yml
# Comma-separated
types: feat,fix,docs

# Pipe-separated
types: feat|fix|docs

# Multiline block
scopes: |
  core
  api
  ui

# YAML array
scopes: [core, api, ui]

# JSON array (quoted)
types: '["feat","fix","docs"]'
```

## 📤 Outputs

| Name    | Description                                     |
| ------- | ----------------------------------------------- |
| `valid` | `true` if title passes validation, else `false` |

## ✅ Good PR Titles

Sheriff-approved examples:

- `feat(api): add authentication support`
- `fix(core|ui): resolve dark mode toggle bug`
- `docs: update contributing guide`

## 🚫 Bad PR Titles

Titles that’ll land you in PR jail:

- `feature: add new login page` - type not allowed
- `fix(auth):` - message empty
- `performance(core): rename variables` - type not in allowed list

## 🔨 How It Works

1. Sheriff loads **default types** and **scopes** from JSON files.
2. If you give workflow inputs, they **override** the defaults.
3. Inputs are normalized with `parseList`, supporting commas, pipes, YAML arrays, JSON arrays, or multiline blocks.
4. The PR title is checked against the Sheriff’s **regex badge**.
5. PR is marked **invalid** if:
   - Type is not allowed
   - Scope is not allowed (only when `enforce_scopes` is `true`)
   - Breaking change (`!`) is present but disallowed
   - Message is empty

## 📜 License

Released under the [Apache-2.0](LICENSE) License.

_The Sheriff works free of charge, but tips are appreciated in the form of stars._

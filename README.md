<div align="center">

<img src="./assets/logo.png" alt="Sheriff logo" width="200"/>

# 🕵️ Sheriff

_Enforce Conventional Commits on pull request titles like a true sheriff, keep your repo law-abiding!_

</div>

[![tests](https://github.com/teneplaysofficial/sheriff/actions/workflows/tests.yml/badge.svg)](https://github.com/TenEplaysOfficial/sheriff)

## 📜 Overview

**Sheriff** is a GitHub Action that patrols your pull requests and ensures titles follow a strict format. Perfect for enforcing [**Conventional Commits**](https://www.conventionalcommits.org) or your own custom rules.

> No more wild, lawless PR titles - the Sheriff keeps things tidy.

## ✨ Features

- Enforces the **`type(scope): message`** format
- Supports **multiple scopes (comma-separated)** - `type(scope1,scope2): message`
- Detects **breaking changes** (`!`) and checks if they’re allowed
- Optional **strict scope enforcement**
- Fully configurable commit **types** & **scopes**
- Enforces **lowercase types**
- Prevents empty messages and malformed titles
- Clear, **human-friendly error messages**
- Instantly fails CI if rules are broken
- Works in any PR workflow
- Optionally ignores PRs from specific authors (bots, automation)

## 🤠 How to Deputize the Sheriff

> _Follow these steps and your repo will be safer than a vault in Fort Knox._

1. **Star the repo** - show the Sheriff some love before he starts working 😁
2. **Create a workflow file**: `.github/workflows/check-pr-title.yml`
3. **Copy this template**:

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
           uses: teneplaysofficial/sheriff@v5
           with:
             types: feat, fix, docs, ci, test, chore
             scopes: |
               core
               api
               ui
               docs
             allow_breaking: true
             enforce_scopes: true
             ignore-authors: https://raw.githubusercontent.com/teneplaysofficial/sheriff/main/src/data/ignored-authors.txt
   ```

4. **Commit & push** - the Sheriff is now on duty.
   Any outlaw PR title will be gunned down.

## 🔧 Inputs

| Name             | Required | Default                                | Description                                   |
| ---------------- | -------- | -------------------------------------- | --------------------------------------------- |
| `types`          | No       | Sourced from `@js-utils-kit/constants` | List of allowed commit types                  |
| `scopes`         | No       | Sourced from `@js-utils-kit/constants` | List of allowed scopes                        |
| `allow_breaking` | No       | `true`                                 | Whether breaking changes (`!`) are allowed    |
| `enforce_scopes` | No       | `false`                                | If `true`, only configured scopes are allowed |
| `ignore-authors` | No       | `false`                                | Ignore PRs created by specific authors        |

> [!NOTE]
> Multiple scopes in PR titles must be **comma-separated** (`feat(core,api): message`)

## 🚫 Ignoring PR Authors

Sheriff can **skip validation entirely** for pull requests created by specific authors (e.g. dependency bots, CI users, or internal automation).

This is controlled using **one input**: `ignore-authors`.

### 🔧 `ignore-authors` values

| Value     | Behavior                                |
| --------- | --------------------------------------- |
| `true`    | Use the default ignore file             |
| `false`   | Disable ignore-authors feature          |
| File path | Load ignored authors from that file     |
| HTTPS URL | Load ignored authors from a remote file |

### 📄 Default Ignore File

When `ignore-authors: true`, Sheriff loads:

```
[src/data/ignored-authors.txt](./src/data/ignored-authors.txt)
```

> relative to the repository root

### 📄 Ignore File Format

```txt
# One author per line
# Format:
#   name <email>

renovate[bot] <29139614+renovate[bot]@users.noreply.github.com>
dependabot[bot] <49699333+dependabot[bot]@users.noreply.github.com>
```

Rules:

- Empty lines are allowed
- Lines starting with `#` are comments
- Inline comments are allowed
- Entries **must** be in `name <email>` format

### 🌍 Using a Remote Ignore File

```yml
- uses: teneplaysofficial/sheriff@v3
  with:
    ignore-authors: https://raw.githubusercontent.com/org/sheriff-config/main/ignored-authors.txt
```

## 📤 Outputs

| Name    | Description                                                           |
| ------- | --------------------------------------------------------------------- |
| `valid` | `true` if the PR title passes validation **or** the author is ignored |

## ✅ Good PR Titles

Sheriff-approved examples:

- `feat(api): add authentication support`
- `fix(core,ui): resolve dark mode toggle bug`
- `docs: update contributing guide`
- `feat!: drop legacy API support`
- `BREAKING CHANGE: remove deprecated auth flow`

## 🚫 Bad PR Titles

Titles that’ll land you in PR jail:

- `Feature: add login` → type must be lowercase
- `feat(auth):` → message cannot be empty
- `fix(core | ui): bug fix` → scopes must be comma-separated
- `feat(): empty scope` → empty scope not allowed
- `performance(core): rename variables` → type not allowed

## 🔨 How It Works

1. Sheriff loads **default commit types** and **scopes** from constants.
2. Workflow inputs **override defaults** when provided.
3. The PR title is validated step-by-step:
   - Structure check via regex
   - Whitespace and formatting rules
   - Empty message detection
   - Commit type validation
   - Optional scope enforcement
   - Breaking change rules

4. If any rule fails, CI fails with a **clear error reason**.
5. If `[skip-ci]` is present **at the end of the title**, validation is skipped.
6. If the PR author is ignored, validation is **skipped safely**.

## 📜 License

Released under the [Apache-2.0](LICENSE) License.

_The Sheriff works free of charge, but tips are appreciated in the form of stars._ ⭐

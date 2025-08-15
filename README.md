<div align="center">

# 🕵️‍♂️ Sheriff

_Enforce Conventional Commits on pull request titles like a true sheriff, keep your repo law-abiding!_

</div>

## 📜 Overview

**Sheriff** is a GitHub Action that patrols your pull requests and ensures titles follow a strict format. Perfect for enforcing [**Conventional Commits**](https://www.conventionalcommits.org) or your own custom rules.

> No more wild, lawless PR titles - the Sheriff keeps things tidy.

## ✨ Features

- Enforces the **`type(scope): message`** format
- Supports **multiple scopes** - `type(scope1|scope2): message`
- Detects **breaking changes** (`!`) and checks if they’re allowed
- Fully configurable types & scopes
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
       types: [opened, edited, synchronize]

   jobs:
     sheriff:
       runs-on: ubuntu-latest
       steps:
         # Step 1: Checkout repository for context
         - name: Checkout repository
           uses: actions/checkout@v3

         # Step 2: Run Sheriff PR Title Validator
         - name: Validate PR title
           uses: teneplaysofficial/sheriff@v1
           with:
             types: 'feat,fix,docs,ci,test,chore'
             scopes: 'core,api,ui,docs'
             breaking: 'true'
   ```

4. **Commit & push** - the Sheriff is now on duty.
   Any outlaw PR title will be gunned down.

## 🔧 Inputs

| Name       | Required | Default                                                                                                  | Description                                   |
| ---------- | -------- | -------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| `types`    | No       | Loaded from [`types.json`](https://github.com/teneplaysofficial/sheriff/blob/main/src/data/types.json)   | Comma-separated list of allowed commit types  |
| `scopes`   | No       | Loaded from [`scopes.json`](https://github.com/teneplaysofficial/sheriff/blob/main/src/data/scopes.json) | Comma-separated list of allowed commit scopes |
| `breaking` | No       | `true`                                                                                                   | Whether breaking changes (`!`) are allowed    |

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
3. The PR title is checked against the Sheriff’s **regex badge**.
4. PR is marked **invalid** if:
   - Type is not allowed
   - Scope is not allowed
   - Breaking change (`!`) is present but disallowed
   - Message is empty

## 📜 License

Released under the [Apache-2.0](LICENSE) License.

_The Sheriff works free of charge, but tips are appreciated in the form of stars._

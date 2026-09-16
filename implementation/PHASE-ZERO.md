# Phase Zero — Mercurius Quote Tool

## Goal
Prove the repository, approved Mercurius authorities, capabilities, environment, security baseline, and test baseline are ready before Slice 01.

## WSL Bootstrap
```bash
git clone https://github.com/Jcoley-Mercurius/mercurius-quote-tool.git
cd mercurius-quote-tool

git status
git branch --show-current
git log -5 --oneline

cat AGENTS.md
cat BLUEPRINT.md
cat mts/AGENT-SKILL-MANIFEST.yaml

node --version
npm --version
npm ci

npm run lint
npm test
npm run build
npm run test:e2e
```

## Required Checks
- Verify approved MPS files exist.
- Verify approved MDS files and canonical references exist.
- Verify approved MTS files exist.
- Verify every REQUIRED capability in the skill manifest.
- Record installed/configured/missing status; a manifest entry is not proof of installation.
- Standardize Node major across WSL, GitHub Actions, and Vercel after compatibility verification.
- Inventory `.env.example` variable names without exposing values.
- Treat the previously committed Marketplace webhook secret as exposed; rotate before production reliance.
- Inventory Supabase migrations; do not rename historical migrations.
- Establish local/disposable Supabase behavioral RLS testing capability.
- Capture current lint/unit/build/E2E baseline.
- Capture browser baseline for critical routes.
- Confirm canonical logo and design references are accessible to the implementation agent.

## Phase Zero Exit Evidence
Create a short evidence record containing:
- commit SHA
- Node/npm versions
- dependency install result
- lint result
- unit result
- build result
- E2E result
- browser baseline result
- capability matrix result
- MPS/MDS/MTS package presence
- MDS reference presence
- migration inventory
- environment names/config status (never secret values)
- known pre-existing failures
- Slice 01 readiness decision

Do not begin Slice 01 if an authority package or canonical MDS reference required for that slice is missing.

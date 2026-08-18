# Plantdex — Apps Script

Google Apps Script web app backed by the PlantDex Google Sheet.

## Setup

Requires [clasp](https://github.com/google/clasp) logged into the correct Google account.

## Development

```bash
# Push local changes to Apps Script
cd appscript
clasp push

# Open the script editor in browser
clasp open

# Open the deployed web app
clasp open --webapp
```

## Deploy

After pushing, create a new deployment in the Apps Script editor:
Deploy → New deployment → Web app → Execute as: Me, Who has access: Anyone.

## Structure

- `src/Code.js` — main entry point; `doGet(e)` routes requests
- `src/appsscript.json` — Apps Script manifest

## How it works

- No params → renders full plant collection index
- `?plantId=N` → renders single plant profile card (used by NFC tags)

Data is read live from the Google Sheet on every request — no caching layer needed at this scale.

## CI/CD

Deployments run automatically on push to `main` via GitHub Actions (`.github/workflows/deploy.yml`).

### Required GitHub Secrets

| Secret | How to get it |
|--------|---------------|
| `CLASPRC_JSON` | Run `clasp login` locally, then `cat ~/.clasprc.json` — paste the full JSON |
| `CLASP_DEPLOYMENT_ID` | `AKfycbwheFuxTlMMxKgwlTR95Ve7a8pBGexjBhW6GE4e3tA62-3MTrWb6bBt9MbkerRHJyMO5g` |

Set these at: **GitHub repo → Settings → Secrets and variables → Actions → New repository secret**

### Notes
- Tests must pass before deploy runs
- Deploy only triggers on pushes to `main` (not PRs)
- Only files under `appscript/` trigger the workflow
- Uses clasp 2.x (`npm install -g @google/clasp@2`) — compatible with the existing `.clasp.json` format

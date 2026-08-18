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

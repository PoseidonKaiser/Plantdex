# Plantdex 🌿

A plant collection tracker for NFC tags, built with Google Apps Script and Google Sheets.

## How it works

- Plant data lives in a Google Sheet
- A Google Apps Script Web App serves the UI — no hosting required
- NFC tags point to `?plantId=N` URLs that open the plant's profile card
- Editors can add and update plants directly from the web app

## Tech

- **Backend:** Google Apps Script (clasp for local development)
- **Frontend:** Tailwind CSS + Alpine.js (CDN, no build step)
- **Data:** Google Sheets
- **CI/CD:** GitHub Actions → clasp push → versioned deployment

## Development

See [`appscript/README.md`](appscript/README.md) for setup, dev workflow, and CI/CD secrets.

## Web App URL

```
https://script.google.com/macros/s/AKfycbwheFuxTlMMxKgwlTR95Ve7a8pBGexjBhW6GE4e3tA62-3MTrWb6bBt9MbkerRHJyMO5g/exec
```

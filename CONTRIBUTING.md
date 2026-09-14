# Developer Reference

## Local Development

### Serving
```powershell
npx serve .
```

### Rendering README
```powershell
npm install --no-save playwright
npx playwright install --with-deps chromium
node .github/scripts/renderReadme.js
```

## Schemas

### words.txt
A newline-delimited list of tab-delimited fields.
```text
Id	Word	YYYY-MM-DD	[Comma-delimited tags]	[Note]
```

## URL Query Parameters
| Parameter | Arguments                                                           |
| :-------- | :------------------------------------------------------------------ |
| `track`   | The ID of the word object to track.                                 |
| `debug`   | A comma-delimited combination of flags: `stats`, `physics`, `hash`. |
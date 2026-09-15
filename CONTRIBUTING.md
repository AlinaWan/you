# Contributing

## User Submissions

You can submit a new word to the plane by creating an [issue](https://github.com/AlinaWan/you/issues/new?template=add-word.yml) and following the instructions provided.

By submitting content, you must agree to the Submission Licence included in the submission form. Submissions remain the property of their respective authors, but are licensed to the you project under the terms of that agreement.

# Developer Reference

## Local Development

### Serving
```powershell
npx serve .
```

### Rendering README
```powershell
npm install --no-save playwright@1.63.0
npx playwright install --with-deps chromium
node .github/scripts/renderReadme.js
```

The rendered README is composed of files in [`readme/`](./readme/). Each part is defined by a `part-N.html` file, where `N` is a zero-based index. Parts are rendered in ascending numerical order and must be contiguous:

```text
readme\
├── part-0.html
├── part-1.html
├── part-2.html
└── style.css
```

Each part must include a `readme-href=` comment immediately after the `<!DOCTYPE html>` declaration:
```html
<!DOCTYPE html>
<!-- readme-href=https://alinawan.github.io/you/ -->
```

Each part has a corresponding dark and light image, which are generated in the [`images/readme/`](./images/readme/) directory and referenced in the generated README.

```text
images\
└── readme\
    ├── part-0-dark.webp
    ├── part-0-light.webp
    ├── part-1-dark.webp
    ├── part-1-light.webp
    ├── part-2-dark.webp
    └── part-2-light.webp
```

## Schemas
The schemas documented here reflect the current implementation and are subject to change.

### words.txt
A newline-delimited list of tab-delimited fields.
```text
Id	Word	YYYY-MM-DD	[Comma-delimited tags]	[Note]
```

`Id` uses one of the following formats:

* Maintainer-generated: 6 bytes represented as 12 hexadecimal characters.
* User-generated: the GitHub issue number prefixed with `u`, followed by a hyphen and 3 bytes represented as 6 hexadecimal characters.

The corresponding validation patterns are:

* Maintainer-generated: `^[0-9a-fA-F]{12}$`
* User-generated: `^u\d+-[0-9a-fA-F]{6}$`

## URL Query Parameters
| Parameter | Arguments                                                           |
| :-------- | :------------------------------------------------------------------ |
| `track`   | The ID of the word object to track.                                 |
| `debug`   | A comma-delimited combination of flags: `stats`, `physics`, `hash`. |
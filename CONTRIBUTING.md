# Contributing

## User Submissions

You can submit a new word to the plane by creating an [Issue](https://github.com/AlinaWan/you/issues/new?template=add-word.yml) and following the instructions provided.

You can also add name attributions to existing words by making a [donation](https://github.com/AlinaWan/you/issues/new?template=donate.yml) and following the instructions provided.

By submitting content, you must agree to the Submission Licence included in the submission form. Submissions remain the property of their respective authors, but are licensed to the you project under the terms of that agreement.

## Code Contributions

Code contributions are accepted through [Pull Requests](https://github.com/AlinaWan/you/compare).

By submitting a code contribution, you agree to the [Contributor License Agreement](CLA.md). **Every commit in a Pull Request must contain a `Signed-off-by:` trailer accepting the agreement for that contribution.** You can add it automatically when creating a commit with:

```powershell
git commit -s
```

If the Pull Requests tab is missing, PRs are currently not being accepted.

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

Each part must include a `readme-href=` and `readme-alt=` comment immediately after the `<!DOCTYPE html>` declaration:
```html
<!DOCTYPE html>
<!-- readme-href=https://alinawan.github.io/you/ -->
<!-- readme-alt=you project — A collection of words, memories, and little things left unsaid. -->
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

The types and constraints below use SQL-like notation to describe the intended structure, validation rules, and logical relationship. They are not currently enforced automatically.

### words.txt
A newline-delimited list of tab-delimited fields.
```text
id	word	date	[tags]	[note]
```

* `id TEXT PRIMARY KEY CHECK (id ~ '^[0-9a-f]{12}$' OR id ~ '^u\d+-[0-9a-f]{6}$')`
* `word TEXT NOT NULL CHECK (word = LOWER(word))`
* `date DATE NOT NULL`
* `tags TEXT CHECK (tags = LOWER(tags))`
* `note TEXT`

`id` uses one of the following formats:

* Maintainer-generated: 6 bytes represented as 12 hexadecimal characters.
* User-generated: the GitHub issue number prefixed with `u`, followed by a hyphen and 3 bytes represented as 6 hexadecimal characters.

`tags` is a comma-delimited list of tags without whitespace.

### attributions.txt
A newline-delimited list of tab-delimited fields.
```text
word_id	attribution	date	[transaction_signature]	[color]
```

* `word_id TEXT NOT NULL REFERENCES words(id) ON DELETE CASCADE`
* `attribution TEXT NOT NULL`
* `date DATE NOT NULL`
* `transaction_signature TEXT`
* `color CHAR(7) CHECK (color ~ '^#[0-9a-f]{6}$')`

`word_id` references the ID of the word to which the attribution is associated.

## URL Query Parameters
| Parameter | Arguments                                                           |
| :-------- | :------------------------------------------------------------------ |
| `track`   | The ID of the word object to track.                                 |
| `debug`   | A comma-delimited combination of flags: `stats`, `physics`, `hash`. |
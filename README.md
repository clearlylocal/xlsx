# SheetJS for Clearly Local

This repository serves a patched SheetJS ES module with matching type declarations and a Deno header. Consumers import `xlsx.mjs` through a raw GitHub URL pinned to a reviewed commit, so updating this repository does not automatically update Polycheck.

## How it works

The repository keeps the upstream files, local fixes, and generated output separate:

- `upstream/`: unmodified release files from the official SheetJS CDN.
- `upstream/manifest.json`: release version, source URLs, file hashes, and patch order.
- `patches/`: local fixes applied during the build.
- `scripts/`: build and update commands.
- `tests/`: regression tests named to match their patches.
- Root `xlsx.mjs`, `types/index.d.ts`, `LICENSE`, and `CHANGELOG.md`: generated files committed for consumers.

The build copies the upstream files into a temporary directory, applies the patches, and writes the generated output.

| Patch                                                                              | Behavior                                                                                                                                                                                              |
| ---------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [001-preserve-incomplete-cdata.patch](patches/001-preserve-incomplete-cdata.patch) | Keeps incomplete CDATA delimiters as text when no complete wrapper is present.                                                                                                                        |
| [002-decode-string-values-once.patch](patches/002-decode-string-values-once.patch) | Decodes direct string values once and preserves full Unicode characters from numeric XML references, including emoji. Literal CDATA wrappers remain cell text for applications to remove if required. |

## Build and test

Use Node.js 24 and Git. No dependency installation is required.

```sh
npm run build
npm run build:check
npm test
```

The build runs offline and checks the upstream hashes before applying patches in a temporary directory. It stops if an input has changed or a patch cannot be applied. `build:check` verifies that the committed output matches the build without replacing any files. CI runs this check and the regression tests on pushes and pull requests.

## Contributing

Add a regression test for each fix. Use the existing tests as examples.

- Create small workbooks in the test and keep inputs beside their expected values. Edit the archive XML when the workbook writer cannot produce the required input.
- Cover the reported failure, related boundary cases, and an ordinary value that must stay unchanged.
- For text parsing, cover direct, shared, and inline strings where relevant. Keep literal cell text distinct from actual XML CDATA and entity references.
- Assert exact parsed values, including whitespace and Unicode characters. Name tests after the behavior they check.
- Match patch and test names, such as `003-description.patch` and `003-description.test.mjs`. Use the next three-digit prefix. Do not renumber files or reuse removed numbers.
- Generate patches with `git diff` against the upstream file with earlier patches applied. Keep `upstream/` unchanged and list patches in prefix order in the manifest. Rebuild instead of editing generated files.
- Run `npm run build`, `npm run build:check`, and `npm test` before submitting. Keep regression tests when upstream fixes an issue and its patch is removed.

## Update upstream

Check the latest CDN release, or select a specific newer version:

```sh
npm run update
npm run update -- 0.20.3
```

The updater downloads the release, applies our patches, and runs the tests in a temporary directory. Once these steps pass, it copies both the unmodified upstream files and the generated output into the repository. Equal or older versions make no changes.

If a patch conflicts, adjust it against the new release and rerun the checks. If upstream has fixed the issue, remove the patch and its manifest entry, but keep the regression test. Before changing Polycheck's commit pin, review the update and run its fixture and performance checks.

## Automatic updates

The update workflow runs daily at midnight UTC. It can also be started manually with an optional version. After the patch, build checks, and tests pass, it pushes to the default branch with the commit message `chore: bump xlsx to vX.Y.Z`. A failure stops the update before it commits or pushes.

The workflow must be on the default branch, and repository rules must allow the bot to push. It never force-pushes. The update job runs its own checks because a push using `GITHUB_TOKEN` does not trigger the push CI workflow.

## Upstream

See the [SheetJS documentation](https://docs.sheetjs.com/), [official releases](https://cdn.sheetjs.com/), and [source repository](https://git.sheetjs.com/sheetjs/sheetjs). The upstream Apache 2.0 license is included in `LICENSE`.

# SheetJS for Clearly Local

This repository serves a patched SheetJS ES module with matching type declarations and a Deno header. Consumers import `xlsx.mjs` through a raw GitHub URL pinned to a reviewed commit, so updating this repository does not automatically update Polycheck.

## How it works

The repository keeps the upstream files, local fixes, and generated output separate:

- `upstream/`: unmodified release files from the official SheetJS CDN.
- `upstream/manifest.json`: release version, source URLs, file hashes, and patch order.
- `patches/`: local fixes applied during the build.
- `scripts/`: build and update commands.
- `test/`: regression tests.
- Root `xlsx.mjs`, `types/index.d.ts`, `LICENSE`, and `CHANGELOG.md`: generated files committed for consumers.

The build copies the upstream files into a temporary directory, applies the patches, and writes the generated output.

The current patch preserves incomplete CDATA delimiters. To change this behavior, edit the patch and rebuild rather than editing the generated module directly.

## Build and test

Use Node.js 24 and Git. No dependency installation is required.

```sh
npm run build
npm run build:check
npm test
```

The build runs offline and checks the upstream hashes before applying patches in a temporary directory. It stops if an input has changed or a patch cannot be applied. `build:check` verifies that the committed output matches the build without replacing any files. CI runs this check and the regression tests on pushes and pull requests.

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

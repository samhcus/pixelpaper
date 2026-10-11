# Pixelpaper releases

Pixelpaper uses semantic version tags. The version in `package.json` is the
source of truth for the app, the public download page, and the release notes.

## Prepare a release

1. Update the version without creating a local tag:

   ```bash
   npm version <major.minor.patch> --no-git-tag-version
   ```

2. Run the local gates:

   ```bash
   npm ci
   npm run typecheck
   npm test
   npm run build:app
   npm run build:site
   npm run test:e2e
   npm run test:site
   npm run desktop:dist
   ```

3. Inspect `git diff`, confirm the version in `package.json` and
   `package-lock.json` matches, then commit and push the release commit to
   `main`.

4. Create and push the matching tag only after the commit is on GitHub:

   ```bash
   git tag v<major.minor.patch>
   git push origin v<major.minor.patch>
   ```

## GitHub Actions output

The tag workflow builds these packages on their native runners:

- macOS Apple silicon DMG and ZIP;
- macOS Intel DMG and ZIP;
- Windows x64 installer;
- Linux x64 AppImage and DEB.

The publish job attaches only those distributable files and a
`SHA256SUMS.txt` file. Electron unpacked directories, blockmaps, updater
metadata, and builder debug files stay out of the public release downloads.

The download page uses GitHub’s `releases/latest/download` URLs, so a release
must be published before the page’s new links can work. iOS and Android remain
explicit “Coming soon” states until native packages exist.

## Verify the published release

Check the latest release page and confirm the expected package names and
checksums:

```bash
curl -fsSL https://api.github.com/repos/samhcus/pixelpaper/releases/latest
curl -fsSL https://github.com/samhcus/pixelpaper/releases/latest/download/SHA256SUMS.txt
```

Then open [pixelpaper.samhc.us](https://pixelpaper.samhc.us), verify the GitHub
source link, test one desktop download link, and reload once with the browser
offline to confirm the static page remains available after its first visit.

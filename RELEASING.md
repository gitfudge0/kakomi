# Releasing Kakomi

The Package release workflow builds Chrome and Firefox archives, validates their manifests and resources, verifies SHA-256 checksums, and uploads five downloadable assets.

1. Update `src/manifest.json` to the new version and commit all changes to main.
2. Push a matching tag, for example `git tag v1.2.1 && git push origin v1.2.1`. The Action creates the release and uploads downloads.
3. Alternatively, publish a release in GitHub with a new matching tag targeting main. The published-release event builds and attaches the downloads.
4. Wait for the Package release workflow to succeed before sharing the download link.

To retry packaging an existing tag, use Actions → Package release → Run workflow and enter its tag. Existing assets with the same names are replaced; release notes are preserved. The workflow rejects tags that do not match the manifest version. It uses the repository's automatic GITHUB_TOKEN; no personal access token or extra secrets are needed.

Downloads: Chrome ZIP, Firefox ZIP, unsigned Firefox XPI, source ZIP, and kakomi-checksums.txt. The source archive includes generated browser folders. Packages are built from the tagged commit.

Chrome users extract the ZIP and choose Load unpacked in chrome://extensions with Developer mode enabled. Firefox users can temporarily load the extracted manifest.json through about:debugging. The unsigned XPI is not a permanent install for standard Firefox; Mozilla signing and browser store publishing are separate steps.

Release downloads inherit repository visibility. A private repository requires sign-in and repository access.

Workflow references: [GitHub release events](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#release), [GitHub CLI release uploads](https://cli.github.com/manual/gh_release_upload).

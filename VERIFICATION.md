# Kakomi 1.3.1 verification

The browser regression suite passed in real Chrome DOM/rendering at 2x device scale, with privileged extension APIs simulated. It verifies:

- Element highlight and parent/child selection
- YouTube's zero-height body layout and ordinary overflow clipping
- Closed shadow-root picker, iframe selection, and open page shadow DOM
- Drag rectangles, reverse drags, cancellation, and thin-area rejection
- Recovery after lost pointer capture or a missing pointer release
- Overlay removal before screenshots and suppression of page clicks
- PNG pixel dimensions and actual pixel colors after cropping
- Mutually exclusive clipboard and preview destinations
- Legacy destination normalization: both true opens the preview; both false copies to the clipboard
- One-switch settings persistence and shortcut help
- Failed-copy recovery preview, PNG download, and narrow layout
- Firefox native clipboard adapter: PNG bytes, successful copy without a preview, and failure fallback

All JavaScript files pass Node syntax checks. The package builder checks entry points and referenced icon files. Both ZIPs contain manifest.json at their root; the Firefox package has a module background script and the Chrome package has a module service worker.

The previous Element Shot 1.1.2 capture/highlight implementation was confirmed working by the user on Chrome. Kakomi retains that implementation with branding and cross-browser API changes.

## Not yet verified

Firefox is not installed in this environment, so no live Firefox run was performed. Its API adapter was tested using mocks, not a real Firefox clipboard. The automated suite does not validate real extension permission prompts, clipboard OS integration, installation, signing, or store acceptance. The rebranded packages have not been published or signed.

Before public release, load each package in its browser and verify activation, highlight, element capture, drag capture, paste into another app, preview/download, settings, and cancellation. Test ordinary pages and YouTube at 80%, 100%, and 125% zoom. Confirm restricted-page messaging and the Chrome HTTP clipboard fallback. Obtain Mozilla signing before distributing a permanently installable Firefox build.

## Preview editor (1.3.0)

Automated Chromium checks verify transparent rounded corners, exact padding dimensions, solid/gradient/wallpaper backgrounds, styled clipboard bytes, PNG download, local background upload, lossless reset, rapid control changes, and narrow layout. Computer-use testing checks the actual preview controls in Chrome using a local capture fixture. Privileged extension APIs remain simulated in these tests.

### Amended 1.3.0

Editor regressions now cover 24 wallpaper presets, tabs, background blur, radial zoom blur, connected and independent zoom, percent padding, exact PNG download bytes, local image upload, section/global reset, and narrow layouts. Delayed render/clipboard tests verify that Copy waits for the newest frame, prevents overlapping writes, exports the current image again after subsequent edits, releases controls on failure, and sends the same bytes through the Firefox native adapter. Chrome computer-use checks exercise the controls and successful browser clipboard writes on a local fixture. Actual extension activation and live Firefox remain outside the simulated harness.

### Upload-only editor amendment

Removed all zoom controls and built-in wallpaper generation. The editor test verifies that Image starts without a background until an image is uploaded, then tests its rendered background and blur. Clipboard serialization, exact PNG downloads, frame styling, reset, and narrow layout checks remain in the suite.

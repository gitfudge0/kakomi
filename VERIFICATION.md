# Kakomi 1.2.0 verification

The browser regression suite passed in real Chrome DOM/rendering at 2x device scale, with privileged extension APIs simulated. It verifies:

- Element highlight and parent/child selection
- YouTube's zero-height body layout and ordinary overflow clipping
- Closed shadow-root picker, iframe selection, and open page shadow DOM
- Drag rectangles, reverse drags, cancellation, and thin-area rejection
- Recovery after lost pointer capture or a missing pointer release
- Overlay removal before screenshots and suppression of page clicks
- PNG pixel dimensions and actual pixel colors after cropping
- Clipboard-only default, preview-only, and both destinations
- Settings persistence and preventing both destinations from being disabled
- Failed-copy recovery preview, PNG download, and narrow layout
- Firefox native clipboard adapter: PNG bytes, successful copy without a preview, and failure fallback

All JavaScript files pass Node syntax checks. The package builder checks entry points and referenced icon files. Both ZIPs contain manifest.json at their root; the Firefox package has a module background script and the Chrome package has a module service worker.

The previous Element Shot 1.1.2 capture/highlight implementation was confirmed working by the user on Chrome. Kakomi retains that implementation with branding and cross-browser API changes.

## Not yet verified

Firefox is not installed in this environment, so no live Firefox run was performed. Its API adapter was tested using mocks, not a real Firefox clipboard. The automated suite does not validate real extension permission prompts, clipboard OS integration, installation, signing, or store acceptance. The rebranded packages have not been published or signed.

Before public release, load each package in its browser and verify activation, highlight, element capture, drag capture, paste into another app, preview/download, settings, and cancellation. Test ordinary pages and YouTube at 80%, 100%, and 125% zoom. Confirm restricted-page messaging and the Chrome HTTP clipboard fallback. Obtain Mozilla signing before distributing a permanently installable Firefox build.

## Preview editor (1.3.0)

Automated Chromium checks verify transparent rounded corners, exact padding dimensions, solid/gradient/wallpaper backgrounds, styled clipboard bytes, PNG download, local background upload, lossless reset, rapid control changes, and narrow layout. Computer-use testing checks the actual preview controls in Chrome using a local capture fixture. Privileged extension APIs remain simulated in these tests.

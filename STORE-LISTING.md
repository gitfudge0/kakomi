# Store listing draft

**Name:** Kakomi

**Short description:** Click an element or drag an area to capture. Copy screenshots instantly or open a preview.

**Category:** Productivity

## Description

Frame it. Keep it.

Kakomi lets you capture just the part of a webpage you want. Hover to see a precise highlight, then click to screenshot that element. Need a custom shape? Drag a rectangle and release.

- Element detection with a visible capture boundary
- Parent/child selection with the arrow keys
- Drag-to-capture rectangles
- PNG copying to the clipboard by default
- Optional preview page with PNG download and manual copy
- Local processing with no account, tracking, or uploads
- Browser zoom and high-DPI capture support

Press Alt+Shift+S or click the toolbar icon to begin. Escape cancels.

Captures cover the highlighted visible rectangle. Hidden and offscreen content is not stitched in. Protected browser pages and add-on stores are unsupported. Some sites restrict automatic clipboard access; Kakomi reports the error on the page so you can retry, without opening a preview.

## Submission notes

Upload the matching browser ZIP, which has manifest.json at its root. The icon set includes 16, 24, 32, 48, 64, 96, 128, 256, and 512px PNGs. Use `branding/kakomi-icon.png` as the master image. Supply screenshots from the actual extension, publisher details, a support contact, and a hosted copy of PRIVACY.md in each developer portal before submission. Listing copy is a draft; no listing has been submitted or approved.

Firefox's manifest declares no data collection/transmission (`required: ["none"]`). Its package uses a module background script and its native PNG clipboard API. Chrome uses a module service worker and writes from the active content script. Neither requests all-site host permissions.

Kakomi 1.3.1 uses one Open preview page toggle: off copies to the clipboard, while on opens the preview. Legacy setting combinations normalize to one destination. The YouTube zero-height body clipping fix is retained. The Firefox package is unsigned until processed by Mozilla; the Chrome package is unpacked until published through the Chrome Web Store. No name/trademark clearance is implied by this package.

References: [Mozilla signing](https://extensionworkshop.com/documentation/publish/signing-and-distribution-overview/), [Firefox background support](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/background), [Firefox image clipboard](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/clipboard/setImageData).

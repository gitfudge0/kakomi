

https://github.com/user-attachments/assets/db0c8f5c-2b8b-45a4-9133-5ab40e12cf5b

# Kakomi

**Frame it. Keep it.** A local screenshot extension for Chrome and Firefox.

Kakomi (囲み) refers to an enclosure or frame. Its mint frame-and-pointer icon reflects its main interaction: point at an element, see the boundary, and capture it.

## Install

If you cloned this repository, run `python build.py` first to generate the `chrome/` and `firefox/` folders and the ZIP packages. You can then load the generated folder for your browser.

### Chrome 116+

Extract `kakomi-chrome-1.3.0.zip`. Open `chrome://extensions`, turn on Developer mode, choose **Load unpacked**, and select the extracted folder containing `manifest.json`. Pin Kakomi in the extensions menu.

To upgrade the existing Element Shot installation while preserving preferences, replace the files in its current folder with the Chrome package contents, reload the extension, and refresh the page. If loading Kakomi as a separate extension, disable the old extension so both pickers do not run together.

### Firefox Desktop 140+

For local testing, extract `kakomi-firefox-1.3.0.zip`. Open `about:debugging#/runtime/this-firefox`, click **Load Temporary Add-on**, and select its `manifest.json`. Temporary add-ons are removed when Firefox restarts.

The included `kakomi-firefox-1.3.0-unsigned.xpi` is an unsigned build, **not a permanently installable release**. Normal Firefox installation requires Mozilla signing. Submit the Firefox ZIP through the Mozilla Add-ons developer portal for listed or unlisted signing; distribute the signed XPI it returns. No signing keys or developer credentials are included.

## Capture

1. Click the toolbar icon or press **Alt+Shift+S**.
2. Hover an element to see the mint boundary. **↑** selects its parent and **↓** returns to a child.
3. Click or press **Enter** to capture it. Or **drag a rectangle and release** for a custom area.
4. The PNG copies to the clipboard by default; paste it where you need it. **Esc** cancels selection.

Settings: right-click the toolbar icon → **Options** in Chrome; use the extension's **Preferences** in Firefox's add-on manager. Settings are also linked from the preview. Toggle **Copy to clipboard** and **Open preview page** independently. Both can be enabled; at least one must remain on. If copying fails, the preview opens with download and copy controls.

In Chrome, automatic copying on insecure HTTP pages may be blocked and fall back to the preview. Firefox uses its native image clipboard API. Captures are rectangular, limited to the visible viewport, and include overlapping page content. Offscreen elements are labeled “visible portion.” There is no scroll stitching. Iframes and closed shadow roots are captured as whole elements. Browser settings, add-on stores, built-in PDF viewers, and other restricted pages cannot be picked. Reset pinch zoom before capture; normal browser zoom is supported.

## Style a screenshot

Enable **Open preview page** in Settings. The preview has compact Image / Color / Gradient tabs. Image uses only a locally uploaded PNG, JPEG, or WebP; there are no built-in wallpapers or zoom controls. Background blur, rounded corners, percentage-based padding, shadows, and transparent backgrounds are available.

Preview, Copy image, and Download PNG use the same styled image. Padding is a percentage of the screenshot's shorter side; radius and blur use output pixels. The screenshot retains its original resolution. Remove background makes the surrounding canvas transparent; it does not remove objects from the screenshot. Background and Frame reset independently. Reset all changes restores the original PNG. Copy waits for the latest render and locks editing until the clipboard write completes. Edits and uploaded backgrounds last only for that open preview. Automatic copying at capture time still copies the original capture.

## Included

- `src/`: shared readable source; its manifest defaults to Chrome
- `chrome/` and `firefox/`: generated, loadable browser packages
- `branding/`: SVG master and a 512px PNG icon
- `build.py`: reproducible package builder using only Python's standard library
- `tests/browser.cjs`: automated browser regression harness
- `PRIVACY.md`: privacy policy text
- `STORE-LISTING.md`: listing copy, permission explanations, and publishing notes
- `VERIFICATION.md`: test results and limits

Run `python build.py` to regenerate both ZIPs, the unsigned Firefox XPI, the source ZIP, and SHA-256 checksums in the parent folder. No bundler or runtime dependencies are needed by the extension. Keep the Firefox add-on ID stable after first submission. The current ID is `kakomi@extensions.local`; it is an identifier, not an email contact.

To run regression tests, install Playwright in your development environment and run `node tests/browser.cjs` and `node tests/editor.cjs`. `PLAYWRIGHT_MODULE` can point to an existing Playwright package, `CHROME_PATH` to a Chrome executable, and `TEST_ARTIFACTS` to a scratch output directory. Tests simulate privileged browser APIs; see VERIFICATION.md for what is and is not verified.

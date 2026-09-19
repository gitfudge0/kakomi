// Chrome exposes promise APIs on chrome; Firefox exposes them on browser.
globalThis.kakomiAPI = globalThis.browser || globalThis.chrome;

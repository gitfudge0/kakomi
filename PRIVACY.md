# Kakomi privacy policy

Kakomi does not collect or transmit user data to its developer or any server. It has no analytics, advertising, accounts, remote code, or third-party services.

When you start the picker and select an element or area, Kakomi captures the visible tab and crops it locally. The uncropped image is used only while processing that capture. The cropped PNG, page title, selection label, dimensions, timestamp, originating tab ID, and capture destination flags may be held temporarily in extension session memory to prepare the clipboard or preview. Clipboard-only captures are removed from that storage when completed. Remaining previews are evicted when the memory budget fills and are cleared when the browser or extension restarts.

Capture destination preferences are stored locally and are not synced by Kakomi. Clipboard copying replaces your system clipboard with the captured PNG; Kakomi does not read your existing clipboard. Your operating system or other applications may retain or synchronize clipboard content according to their own settings. Downloaded images remain wherever you save them until you remove them.

Permissions: `activeTab` provides temporary page access after you invoke Kakomi; `scripting` runs the picker on that page; `storage` saves preferences and temporary previews; `clipboardWrite` copies the image. Kakomi does not request always-on access to all websites, clipboard-read access, or a downloads permission.

You can disable automatic copying in Settings. Removing the extension removes its extension storage; it does not delete PNGs you downloaded or content retained by other applications.

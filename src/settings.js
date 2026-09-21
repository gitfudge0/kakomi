const preview = document.getElementById('openPreview');
const controls = document.getElementById('controls');
const status = document.getElementById('status');
let saved;
async function load() {
  const settings = await kakomiAPI.storage.local.get({ copyClipboard: true, openPreview: false });
  saved = { copyClipboard: !settings.openPreview, openPreview: Boolean(settings.openPreview) };
  preview.checked = saved.openPreview;
  controls.disabled = false;
}
controls.addEventListener('change', async () => {
  controls.disabled = true;
  try {
    const next = { copyClipboard: !preview.checked, openPreview: preview.checked };
    await kakomiAPI.storage.local.set(next); saved = next;
    status.textContent = 'Settings saved.';
  } catch {
    preview.checked = saved.openPreview;
    status.textContent = 'Could not save. Please try again.';
  } finally { controls.disabled = false; }
});
load().catch(() => { status.textContent = 'Could not load settings. Reload this page to try again.'; });

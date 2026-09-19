const copy = document.getElementById('copyClipboard');
const preview = document.getElementById('openPreview');
const controls = document.getElementById('controls');
const status = document.getElementById('status');
let saved;
async function load() {
  saved = await kakomiAPI.storage.local.get({ copyClipboard: true, openPreview: false });
  if (!saved.copyClipboard && !saved.openPreview) saved.copyClipboard = true;
  copy.checked = saved.copyClipboard; preview.checked = saved.openPreview;
  controls.disabled = false;
}
controls.addEventListener('change', async event => {
  if (!copy.checked && !preview.checked) {
    event.target.checked = true;
    status.textContent = 'Keep at least one destination enabled.';
    return;
  }
  controls.disabled = true;
  try {
    const next = { copyClipboard: copy.checked, openPreview: preview.checked };
    await kakomiAPI.storage.local.set(next); saved = next;
    status.textContent = 'Settings saved.';
  } catch {
    copy.checked = saved.copyClipboard; preview.checked = saved.openPreview;
    status.textContent = 'Could not save. Please try again.';
  } finally { controls.disabled = false; }
});
load().catch(() => { status.textContent = 'Could not load settings. Reload this page to try again.'; });

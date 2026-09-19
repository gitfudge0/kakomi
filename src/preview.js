const $ = id => document.getElementById(id);
const params = new URLSearchParams(location.search);
let objectURL;
async function init() {
  if (params.has('error')) {
    $('empty-title').textContent = 'This page is protected by your browser.';
    $('empty-message').textContent = 'Try a regular website. Browser settings, add-on stores, and built-in PDF viewers do not support the picker.';
    return;
  }
  const id = params.get('id');
  if (!id) return;
  const record = (await kakomiAPI.storage.session.get(id))[id];
  if (!record) {
    $('empty-title').textContent = 'This preview has expired.';
    $('empty-message').textContent = 'Capture the element again. Previews are temporary; download your PNG to keep it.';
    return;
  }
  const blob = await (await fetch(record.data)).blob();
  objectURL = URL.createObjectURL(blob);
  $('capture').src = objectURL;
  $('capture').hidden = false; $('empty').hidden = true;
  $('element').textContent = record.label;
  $('dimensions').textContent = `${record.width} × ${record.height} PX · PNG`;
  $('source').textContent = record.title;
  $('source').title = record.title;
  $('download').href = objectURL;
  $('download').download = `kakomi-${new Date(record.created).toISOString().replace(/[:.]/g, '-')}.png`;
  $('download').hidden = false;
  $('copy').hidden = false;
  if (record.clipped) $('notice').textContent = 'Visible portion captured. The selected element extends beyond its visible boundary.';
  if (params.has('copyFailed')) $('notice').textContent = 'Automatic copying was blocked on this page. Click Copy image or download the PNG.';
  $('copy').addEventListener('click', async () => {
    $('copy').disabled = true;
    try {
      if (kakomiAPI.clipboard?.setImageData) {
        await kakomiAPI.clipboard.setImageData(await blob.arrayBuffer(), 'png');
      } else {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      }
      $('notice').textContent = 'Copied to clipboard.';
    } catch { $('notice').textContent = 'Your browser could not copy the image. Use Download PNG instead.'; }
    finally { $('copy').disabled = false; }
  });
}
init().catch(() => { $('empty-title').textContent = 'The preview could not be loaded.'; $('empty-message').textContent = 'Return to the page and capture the element again.'; });
window.addEventListener('pagehide', () => { if (objectURL) URL.revokeObjectURL(objectURL); });

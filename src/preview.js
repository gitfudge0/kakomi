const $ = id => document.getElementById(id);
const params = new URLSearchParams(location.search);
let objectURL, sourceImage, originalBlob, exportBlob, customImage;
let revision = 0, fileRevision = 0, renderTimer, baseNotice = '';
const defaults = { background: 'none', 'solid-color': '#d5e9df', 'gradient-preset': 'dawn', 'gradient-start': '#ffba93', 'gradient-end': '#8e73d9', angle: '135', wallpaper: 'coast', padding: '0', radius: '0', shadow: '0' };
function options() {
  return { background: $('background').value, color: $('solid-color').value,
    colors: [$('gradient-start').value, $('gradient-end').value], angle: +$('angle').value,
    wallpaper: $('wallpaper').value, padding: +$('padding').value, radius: +$('radius').value, shadow: +$('shadow').value };
}
function updateControls() {
  for (const type of ['solid', 'gradient', 'wallpaper', 'custom']) $(type + '-controls').hidden = $('background').value !== type;
  for (const id of ['padding', 'radius', 'shadow', 'angle']) $(id + '-value').value = $(id).value + ({ shadow: '%', angle: '°' }[id] || ' px');
}
function disableExport(disabled) {
  $('copy').disabled = disabled;
  $('download').setAttribute('aria-disabled', String(disabled));
  if (disabled) $('download').removeAttribute('href'); else $('download').href = objectURL;
  $('stage').setAttribute('aria-busy', String(disabled));
}
function scheduleRender() {
  updateControls(); disableExport(true); revision++;
  clearTimeout(renderTimer); renderTimer = setTimeout(() => render(revision), 80);
}
async function render(token) {
  try {
    const opts = options();
    let blob = originalBlob, width = sourceImage.naturalWidth, height = sourceImage.naturalHeight;
    if (opts.background !== 'none' || opts.padding || opts.radius || opts.shadow) {
      const canvas = KakomiCompose.render(sourceImage, opts, customImage);
      width = canvas.width; height = canvas.height;
      blob = await new Promise((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(Error('Could not export this image. Reduce padding and try again.')), 'image/png'));
    }
    if (token !== revision) return;
    const nextURL = URL.createObjectURL(blob), previousURL = objectURL;
    objectURL = nextURL; exportBlob = blob; $('capture').src = nextURL;
    $('dimensions').textContent = `${width} × ${height} PX · PNG`;
    disableExport(false); $('notice').textContent = baseNotice;
    if (previousURL) URL.revokeObjectURL(previousURL);
  } catch (error) {
    if (token !== revision) return;
    $('notice').textContent = error.message; $('stage').setAttribute('aria-busy', 'false');
  }
}
async function init() {
  if (params.has('error')) {
    $('empty-title').textContent = 'This page is protected by your browser.';
    $('empty-message').textContent = 'Try a regular website. Browser settings, add-on stores, and built-in PDF viewers do not support the picker.';
    return;
  }
  const id = params.get('id'); if (!id) return;
  const record = (await kakomiAPI.storage.session.get(id))[id];
  if (!record) {
    $('empty-title').textContent = 'This preview has expired.';
    $('empty-message').textContent = 'Capture the element again. Previews are temporary; download your PNG to keep it.';
    return;
  }
  originalBlob = await (await fetch(record.data)).blob(); sourceImage = new Image();
  const sourceURL = URL.createObjectURL(originalBlob);
  try { sourceImage.src = sourceURL; await sourceImage.decode(); } finally { URL.revokeObjectURL(sourceURL); }
  $('element').textContent = record.label; $('source').textContent = record.title; $('source').title = record.title;
  $('download').download = `kakomi-${new Date(record.created).toISOString().replace(/[:.]/g, '-')}.png`;
  if (record.clipped) baseNotice = 'Visible portion captured. The selected element extends beyond its visible boundary.';
  if (params.has('copyFailed')) baseNotice = 'Automatic copying was blocked on this page. Click Copy image or download the PNG.';
  await render(revision);
  $('capture').hidden = false; $('empty').hidden = true;
  $('download').hidden = false; $('copy').hidden = false; $('editor').hidden = false;
  $('editor').addEventListener('input', event => {
    if (event.target.id === 'wallpaper-file') return;
    if (event.target.id === 'gradient-preset') {
      const colors = KakomiCompose.palettes[event.target.value]; $('gradient-start').value = colors[0]; $('gradient-end').value = colors[1];
    }
    if (event.target.id === 'background' && event.target.value !== 'none' && !$('padding').valueAsNumber) $('padding').value = '64';
    scheduleRender();
  });
  document.querySelectorAll('[data-color]').forEach(button => button.addEventListener('click', () => { $('solid-color').value = button.dataset.color; scheduleRender(); }));
  $('reset').addEventListener('click', () => {
    fileRevision++;
    for (const [id, value] of Object.entries(defaults)) $(id).value = value;
    $('wallpaper-file').value = ''; customImage?.close(); customImage = null; scheduleRender();
  });
  $('wallpaper-file').addEventListener('change', async event => {
    const file = event.target.files[0]; if (!file) return;
    const token = ++fileRevision; disableExport(true); revision++; clearTimeout(renderTimer);
    try {
      if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 20 * 1024 * 1024) throw Error('Choose a PNG, JPEG or WebP image smaller than 20 MB.');
      const bitmap = await createImageBitmap(file);
      if (token !== fileRevision) { bitmap.close(); return; }
      if (bitmap.width * bitmap.height > 64000000) { bitmap.close(); throw Error('Choose a background image smaller than 64 megapixels.'); }
      customImage?.close(); customImage = bitmap; scheduleRender();
    } catch (error) {
      if (token !== fileRevision) return;
      $('notice').textContent = error.message; $('stage').setAttribute('aria-busy', 'false');
    }
  });
  $('download').addEventListener('click', event => { if ($('download').getAttribute('aria-disabled') === 'true') event.preventDefault(); });
  $('copy').addEventListener('click', async () => {
    const blob = exportBlob; $('copy').disabled = true;
    try {
      if (kakomiAPI.clipboard?.setImageData) await kakomiAPI.clipboard.setImageData(await blob.arrayBuffer(), 'png');
      else await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      $('notice').textContent = 'Copied to clipboard.';
    } catch { $('notice').textContent = 'Your browser could not copy the image. Use Download PNG instead.'; }
    finally { $('copy').disabled = $('download').getAttribute('aria-disabled') === 'true'; }
  });
}
init().catch(() => { $('empty-title').textContent = 'The preview could not be loaded.'; $('empty-message').textContent = 'Return to the page and capture the element again.'; });
window.addEventListener('pagehide', () => { revision++; fileRevision++; clearTimeout(renderTimer); if (objectURL) URL.revokeObjectURL(objectURL); customImage?.close(); });

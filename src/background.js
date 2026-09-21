import './geometry.js';
import './api.js';

let capturing = false;
const clipboardClaims = new Set();
async function clipboardData(message, sender) {
  const id = message?.id, token = message?.token;
  const clipboardURL = kakomiAPI.runtime.getURL('clipboard.html');
  if (!sender.tab?.id || sender.frameId === 0 || sender.url?.split('#')[0] !== clipboardURL) throw new Error('Clipboard request denied.');
  if (typeof id !== 'string' || typeof token !== 'string' || clipboardClaims.has(id)) throw new Error('Clipboard capability is invalid or expired.');
  clipboardClaims.add(id);
  try {
    const record = (await kakomiAPI.storage.session.get(id))[id];
    if (!record || record.sourceTab !== sender.tab.id || record.openPreview || record.copyClipboard !== true || record.clipboardToken !== token) {
      throw new Error('Clipboard capability is invalid or expired.');
    }
    const data = record.data;
    delete record.clipboardToken;
    await kakomiAPI.storage.session.set({ [id]: record });
    return { ok: true, data };
  } finally { clipboardClaims.delete(id); }
}

async function activate(tab) {
  if (!tab?.id) return;
  try {
    await kakomiAPI.scripting.executeScript({ target: { tabId: tab.id }, files: ['api.js', 'geometry.js', 'picker.js'] });
  } catch {
    await kakomiAPI.tabs.create({ url: kakomiAPI.runtime.getURL('preview.html?error=restricted') });
  }
}
kakomiAPI.action.onClicked.addListener(activate);

async function assertActive(tab) {
  const [active] = await kakomiAPI.tabs.query({ active: true, windowId: tab.windowId });
  if (active?.id !== tab.id) throw new Error('The active tab changed. Return to the page and try again.');
}

async function capture(message, sender) {
  if (!sender.tab || sender.frameId !== 0) throw new Error('Capture must start from the page picker.');
  if (capturing) throw new Error('A screenshot is already being prepared. Please try again.');
  capturing = true;
  try {
    const persisted = await kakomiAPI.storage.local.get({ copyClipboard: true, openPreview: false });
    const settings = persisted.openPreview
      ? { copyClipboard: false, openPreview: true }
      : { copyClipboard: true, openPreview: false };
    await assertActive(sender.tab);
    const data = await kakomiAPI.tabs.captureVisibleTab(sender.tab.windowId, { format: 'png' });
    await assertActive(sender.tab);
    const bitmap = await createImageBitmap(await (await fetch(data)).blob());
    let blob, crop;
    try {
      crop = ElementShotGeometry.pixelCrop(message.rect, message.viewport, bitmap);
      const canvas = new OffscreenCanvas(crop.width, crop.height);
      canvas.getContext('2d').drawImage(bitmap, crop.x, crop.y, crop.width, crop.height, 0, 0, crop.width, crop.height);
      blob = await canvas.convertToBlob({ type: 'image/png' });
    } finally { bitmap.close(); }
    // Session storage is memory-only and is not exposed to content scripts.
    if (blob.size > 5_500_000) throw new Error('This capture is too large for the preview. Select a smaller element.');
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let binary = '';
    for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
    const id = crypto.randomUUID();
    const nativeClipboard = kakomiAPI.runtime.getURL('').startsWith('moz-extension:') && Boolean(kakomiAPI.clipboard?.setImageData);
    const clipboardToken = settings.copyClipboard && !nativeClipboard ? crypto.randomUUID() : undefined;
    const record = { data: 'data:image/png;base64,' + btoa(binary), width: crop.width, height: crop.height,
      label: String(message.label || 'element').slice(0, 120), title: sender.tab.title || 'Untitled page',
      created: Date.now(), clipped: Boolean(message.clipped), sourceTab: sender.tab.id,
      copyClipboard: settings.copyClipboard, openPreview: settings.openPreview,
      ...(clipboardToken ? { clipboardToken } : {}) };
    const existing = await kakomiAPI.storage.session.get(null);
    let total = record.data.length;
    const remove = [];
    for (const [key, item] of Object.entries(existing).sort((a, b) => b[1].created - a[1].created)) {
      total += item.data?.length || 0;
      if (total > 8_000_000) remove.push(key);
    }
    if (remove.length) await kakomiAPI.storage.session.remove(remove);
    await kakomiAPI.storage.session.set({ [id]: record });
    // Firefox's native extension clipboard API works from its background page,
    // including captures initiated on non-secure HTTP pages.
    let copied = false;
    if (settings.copyClipboard && nativeClipboard) {
      try { await kakomiAPI.clipboard.setImageData(bytes.buffer, 'png'); copied = true; }
      catch { /* Preserve the capture until finish() reports the copy failure. */ }
    }
    return clipboardToken ? { ok: true, id, copied, copyClipboard: true, clipboardToken } : { ok: true, id, copied };
  } finally { capturing = false; }
}

kakomiAPI.runtime.onMessage.addListener((message, sender, respond) => {
  if (message?.type === 'ELEMENT_SHOT_CLIPBOARD_DATA') {
    clipboardData(message, sender).then(respond, error => respond({ ok: false, error: error.message }));
    return true;
  }
  if (message?.type === 'ELEMENT_SHOT_FINISH') {
    finish(message, sender).then(respond, error => respond({ ok: false, error: error.message }));
    return true;
  }
  if (message?.type !== 'ELEMENT_SHOT_CAPTURE') return;
  capture(message, sender).then(respond, error => respond({ ok: false, error: error.message }));
  return true;
});

async function finish(message, sender) {
  const record = (await kakomiAPI.storage.session.get(message.id))[message.id];
  if (!sender.tab || sender.frameId !== 0 || record?.sourceTab !== sender.tab.id) throw new Error('Capture expired. Please try again.');
  const copyFailed = record.copyClipboard && message.copied !== true;
  if (record.openPreview) {
    await kakomiAPI.tabs.create({ url: kakomiAPI.runtime.getURL('preview.html?id=' + message.id + (copyFailed ? '&copyFailed=1' : '')) });
  } else {
    await kakomiAPI.storage.session.remove(message.id);
    if (copyFailed) throw new Error('Could not copy the screenshot to the clipboard. Please try again.');
  }
  return { ok: true, copied: record.copyClipboard && message.copied === true };
}

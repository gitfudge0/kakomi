const capability = new URLSearchParams(location.hash.slice(1));
const id = capability.get('id'), token = capability.get('token');
let used = false;
addEventListener('message', async event => {
  const message = event.data;
  if (used || !id || !token || event.source !== parent || message?.type !== 'KAKOMI_CLIPBOARD_START' || message.token !== token) return;
  used = true;
  let result;
  try {
    const response = await chrome.runtime.sendMessage({ type: 'ELEMENT_SHOT_CLIPBOARD_DATA', id, token });
    if (!response?.ok || typeof response.data !== 'string' || !response.data.startsWith('data:image/png;base64,')) {
      throw new Error(response?.error || 'Clipboard image data is unavailable.');
    }
    const blob = await (await fetch(response.data)).blob();
    if (blob.type !== 'image/png') throw new Error('Expected a PNG screenshot.');
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
    result = { ok: true };
  } catch (error) {
    result = { ok: false, error: error.message || 'Clipboard write failed.' };
  }
  event.source.postMessage({ type: 'KAKOMI_CLIPBOARD_RESULT', token, ...result }, event.origin === 'null' ? '*' : event.origin);
});

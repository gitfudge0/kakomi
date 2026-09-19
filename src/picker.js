(() => {
  const key = '__elementShotPicker';
  if (globalThis[key]) { globalThis[key].stop(); return; }
  globalThis.__elementShotToast?.remove();
  // Remove any visual layer left behind by an extension reload.
  document.querySelectorAll('[data-element-shot]').forEach(el => el.remove());
  const { intersect } = ElementShotGeometry;
  const abort = new AbortController();
  let selected = null, chain = [], index = 0, busy = false, stopped = false;
  let pointer = { x: innerWidth / 2, y: innerHeight / 2 }, frame;
  let gesture = null, region = null, suppressClick = false;
  const host = document.createElement('div');
  host.setAttribute('data-element-shot', '');
  host.style.cssText = 'all:initial!important;position:fixed!important;inset:0!important;z-index:2147483647!important;pointer-events:none!important;';
  const root = host.attachShadow({ mode: 'closed' });
  root.innerHTML = `<style>
    :host{font-family:system-ui,sans-serif;color:#edf5f2;pointer-events:none}
    *{box-sizing:border-box} .glass{position:fixed;inset:0;pointer-events:auto;cursor:crosshair} .box{position:fixed;border:2px solid #56e5b4;background:#56e5b414;box-shadow:0 0 0 1px #071f1a55;display:none}
    .label{position:fixed;background:#b7f8dc;color:#09281d;padding:6px 10px;border-radius:6px;font:600 12px/1.4 system-ui;max-width:calc(100vw - 16px);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:none}
    .bar{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);width:max-content;max-width:calc(100vw - 32px);padding:15px 20px;background:#12221ff5;border:1px solid #ffffff24;border-radius:14px;box-shadow:0 12px 45px #0005;font:13px/1.6 system-ui;text-align:center}
    strong{color:#a0f5ce;margin-right:14px;font-weight:650} kbd{font:11px system-ui;padding:3px 5px;border:1px solid #ffffff30;border-radius:4px;margin:0 3px;color:#fff} .hint{color:#b5c7c0} .status{color:#ffdda8}
  </style><div class="glass"></div><div class="box"></div><div class="label"></div><div class="bar" role="status" aria-live="polite"><strong>◩ Kakomi</strong><span class="hint">Click an element · Drag an area &nbsp; <kbd>↑</kbd> parent <kbd>↓</kbd> child &nbsp; <kbd>Esc</kbd> exit</span><div class="status"></div></div>`;
  document.documentElement.append(host);
  const box = root.querySelector('.box'), label = root.querySelector('.label'), bar = root.querySelector('.bar'), status = root.querySelector('.status'), glass = root.querySelector('.glass');
  function parent(el) { return el?.parentElement || el?.getRootNode()?.host || null; }
  function bounds(el) {
    const raw = el.getBoundingClientRect();
    let rect = intersect(raw, { x: 0, y: 0, width: innerWidth, height: innerHeight });
    const rootStyle = getComputedStyle(document.documentElement);
    const bodyOverflowAtViewport = rootStyle.overflowX === 'visible' && rootStyle.overflowY === 'visible';
    for (let p = parent(el); p && p !== document.documentElement; p = parent(p)) {
      // HTML propagates body overflow to the viewport when root overflow is visible.
      // The body's own box can have zero height (e.g. YouTube's absolute app shell)
      // even though its descendants are visible. The viewport intersection above
      // already applies that clip; clipping to the body's box would erase it.
      if (p === document.body && bodyOverflowAtViewport) continue;
      const s = getComputedStyle(p), b = p.getBoundingClientRect();
      const clipX = /hidden|clip|scroll|auto/.test(s.overflowX), clipY = /hidden|clip|scroll|auto/.test(s.overflowY);
      if (clipX || clipY) rect = intersect(rect, { x: clipX ? b.x : rect.x, y: clipY ? b.y : rect.y,
        width: clipX ? b.width : rect.width, height: clipY ? b.height : rect.height });
    }
    return { rect, clipped: Math.abs(rect.width - raw.width) > 1 || Math.abs(rect.height - raw.height) > 1 };
  }
  function name(el) { return el.localName + (el.id ? '#' + el.id : '') + (el.getAttribute('role') ? ' · ' + el.getAttribute('role') : ''); }
  function detect() {
    // Exclude the entire shadow host, not only its input glass, from hit testing.
    // Restore it synchronously, before the browser has a chance to paint.
    host.style.setProperty('display', 'none', 'important');
    let el;
    try {
      el = document.elementFromPoint(pointer.x, pointer.y);
      while (el?.shadowRoot) {
        const inner = el.shadowRoot.elementFromPoint(pointer.x, pointer.y);
        if (!inner || inner === el) break;
        el = inner;
      }
    } finally { host.style.removeProperty('display'); }
    chain = [];
    for (; el && el !== document.documentElement; el = parent(el)) {
      const b = bounds(el).rect;
      if (el !== host && b.width >= 4 && b.height >= 4) chain.push(el);
    }
    index = 0; selected = chain[0] || null;
  }
  function paint() {
    if (busy || stopped) return;
    if (!region && !selected?.isConnected) { box.style.display = label.style.display = 'none'; return; }
    const { rect: r, clipped } = region ? { rect: region, clipped: false } : bounds(selected);
    if (r.width < 1 || r.height < 1) { box.style.display = label.style.display = 'none'; return; }
    Object.assign(box.style, { display: 'block', left: r.x + 'px', top: r.y + 'px', width: r.width + 'px', height: r.height + 'px' });
    label.textContent = `${region ? 'Custom area' : name(selected)} · ${Math.round(r.width)} × ${Math.round(r.height)}${clipped ? ' · visible portion' : ''}`;
    Object.assign(label.style, { display: 'block', left: Math.max(8, Math.min(r.x, innerWidth - 280)) + 'px', top: (r.y >= 36 ? r.y - 32 : Math.min(innerHeight - 35, r.y + 6)) + 'px' });
    // Keep the instruction bar away from the pointer.
    bar.style.bottom = pointer.y > innerHeight - 120 ? 'auto' : '24px';
    bar.style.top = pointer.y > innerHeight - 120 ? '24px' : 'auto';
  }
  function tick() { paint(); if (!stopped) frame = requestAnimationFrame(tick); }
  function stop() {
    stopped = true; abort.abort(); cancelAnimationFrame(frame); host.remove(); delete globalThis[key];
  }
  globalThis[key] = { stop };
  function listen(type, fn) {
    window.addEventListener(type, e => {
      if (!host.isConnected) { stop(); return; }
      fn(e);
    }, { capture: true, signal: abort.signal, passive: false });
  }
  function block(e) { e.preventDefault(); e.stopImmediatePropagation(); }
  listen('pointermove', e => {
    if (busy) return;
    // A release outside the window may not deliver pointerup to the picker.
    if (gesture && !(e.buttons & 1)) { gesture = region = null; suppressClick = true; }
    if (gesture) {
      pointer = { x: e.clientX, y: e.clientY };
      if (region || Math.hypot(pointer.x - gesture.x, pointer.y - gesture.y) >= 6) {
        region = intersect({ x: Math.min(gesture.x, pointer.x), y: Math.min(gesture.y, pointer.y),
          width: Math.abs(pointer.x - gesture.x), height: Math.abs(pointer.y - gesture.y) },
          { x: 0, y: 0, width: innerWidth, height: innerHeight });
      }
      paint(); block(e); return;
    }
    if (pointer.x !== e.clientX || pointer.y !== e.clientY) {
      pointer = { x: e.clientX, y: e.clientY }; detect(); paint();
    }
    e.stopImmediatePropagation();
  });
  listen('pointerdown', e => {
    block(e);
    if (busy || e.button !== 0 || !e.isPrimary) return;
    gesture = { x: e.clientX, y: e.clientY }; region = null; suppressClick = false;
    glass.setPointerCapture(e.pointerId);
  });
  listen('pointerup', e => {
    block(e);
    if (busy || e.button !== 0 || !gesture) return;
    gesture = null;
    if (region) {
      const rect = region; region = null; suppressClick = true;
      if (rect.width >= 2 && rect.height >= 2) take(rect);
      else { status.textContent = 'Drag an area at least 2 × 2 pixels.'; paint(); }
    }
  });
  listen('pointercancel', () => { gesture = region = null; suppressClick = true; paint(); });
  listen('lostpointercapture', () => {
    if (gesture) { gesture = region = null; suppressClick = true; detect(); paint(); }
  });
  listen('blur', () => { gesture = region = null; suppressClick = true; paint(); });
  for (const type of ['mousedown', 'mouseup', 'dblclick', 'auxclick', 'contextmenu', 'dragstart']) listen(type, block);
  listen('click', e => { block(e); if (suppressClick) { suppressClick = false; return; } if (e.button === 0) take(); });
  listen('keydown', e => {
    if (e.key === 'Escape') { block(e); if (!busy) stop(); return; }
    if (busy || gesture) { block(e); return; }
    if (['ArrowUp', 'ArrowDown', 'Enter', ' '].includes(e.key)) {
      block(e);
      if (e.key === 'Enter' || e.key === ' ') { take(); return; }
      index = Math.max(0, Math.min(chain.length - 1, index + (e.key === 'ArrowUp' ? 1 : -1)));
      selected = chain[index]; paint();
    }
  });
  listen('wheel', e => { if (busy || gesture) block(e); });
  listen('scroll', () => { if (!busy) { gesture = region = null; detect(); paint(); } });
  listen('resize', () => { if (!busy) { gesture = region = null; detect(); paint(); } });
  listen('pagehide', stop);
  async function take(customRect) {
    if (busy || (!customRect && !selected?.isConnected)) return;
    if (visualViewport && Math.abs(visualViewport.scale - 1) > .01) {
      status.textContent = 'Reset pinch zoom before capturing. Browser zoom is supported.'; return;
    }
    busy = true;
    const target = selected, initial = customRect ? { rect: customRect, clipped: false } : bounds(target);
    const viewport = { width: innerWidth, height: innerHeight };
    const scroll = { x: scrollX, y: scrollY };
    host.style.setProperty('visibility', 'hidden', 'important');
    try {
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      await new Promise(resolve => setTimeout(resolve, 80));
      const latest = customRect ? initial : bounds(target);
      if ((!customRect && !target.isConnected) || scrollX !== scroll.x || scrollY !== scroll.y || innerWidth !== viewport.width || innerHeight !== viewport.height ||
        ['x', 'y', 'width', 'height'].some(k => Math.abs(initial.rect[k] - latest.rect[k]) > 1)) throw new Error('The element moved. Hover and try again.');
      const response = await kakomiAPI.runtime.sendMessage({ type: 'ELEMENT_SHOT_CAPTURE', rect: latest.rect, viewport,
        label: customRect ? 'Custom area' : name(target), clipped: latest.clipped });
      if (!response?.ok) throw new Error(response?.error || 'Capture failed. Please try again.');
      let copied = response.copied === true;
      if (response.copyClipboard) {
        try {
          const bytes = Uint8Array.from(atob(response.data.split(',')[1]), char => char.charCodeAt(0));
          const blob = new Blob([bytes], { type: 'image/png' });
          await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
          copied = true;
        } catch { /* The worker opens a recovery preview if copying is blocked. */ }
      }
      const finished = await kakomiAPI.runtime.sendMessage({ type: 'ELEMENT_SHOT_FINISH', id: response.id, copied });
      if (!finished?.ok) throw new Error(finished?.error || 'Could not complete the capture. Try again.');
      stop();
      if (copied) {
        const toast = document.createElement('div');
        globalThis.__elementShotToast = toast;
        toast.setAttribute('role', 'status'); toast.textContent = '✓ Screenshot copied to clipboard';
        toast.style.cssText = 'all:initial;position:fixed;bottom:24px;left:50%;transform:translateX(-50%);z-index:2147483647;background:#12221f;color:#b5f5d7;padding:15px 22px;border-radius:12px;font:14px system-ui;pointer-events:none;box-shadow:0 6px 30px #0004';
        document.documentElement.append(toast); setTimeout(() => toast.remove(), 2200);
      }
    } catch (error) {
      if (stopped) return;
      busy = false; host.style.setProperty('visibility', 'visible', 'important');
      status.textContent = error.message; paint();
    }
  }
  detect(); tick();
})();

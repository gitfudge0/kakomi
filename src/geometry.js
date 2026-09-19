// Shared by the isolated content script and the service worker.
(function () {
  function intersect(a, b) {
    const x = Math.max(a.x, b.x), y = Math.max(a.y, b.y);
    return { x, y, width: Math.max(0, Math.min(a.x + a.width, b.x + b.width) - x),
      height: Math.max(0, Math.min(a.y + a.height, b.y + b.height) - y) };
  }
  function pixelCrop(rect, viewport, image) {
    if (![rect.x, rect.y, rect.width, rect.height, viewport.width, viewport.height,
      image.width, image.height].every(Number.isFinite) || viewport.width <= 0 ||
      viewport.height <= 0 || image.width <= 0 || image.height <= 0) throw new Error('Invalid capture dimensions.');
    const r = intersect(rect, { x: 0, y: 0, ...viewport });
    const sx = image.width / viewport.width, sy = image.height / viewport.height;
    const x = Math.max(0, Math.floor(r.x * sx)), y = Math.max(0, Math.floor(r.y * sy));
    const right = Math.min(image.width, Math.ceil((r.x + r.width) * sx));
    const bottom = Math.min(image.height, Math.ceil((r.y + r.height) * sy));
    if (r.width <= 0 || r.height <= 0 || right <= x || bottom <= y) throw new Error('The element is outside the visible page.');
    return { x, y, width: right - x, height: bottom - y };
  }
  globalThis.ElementShotGeometry = { intersect, pixelCrop };
})();

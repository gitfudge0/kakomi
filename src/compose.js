// Original procedural wallpapers and a shared PNG renderer for preview and export.
// All distances are output pixels; the source capture is never scaled down.
globalThis.KakomiCompose = (() => {
  const palettes = { dawn: ['#ffba93', '#8e73d9'], ocean: ['#69e4dd', '#3454ac'], orchid: ['#e8a4ec', '#5148a8'], forest: ['#d3e9ba', '#22796d'] };
  function gradient(ctx, w, h, colors, angle = 135) {
    const a = angle * Math.PI / 180, dx = Math.cos(a), dy = Math.sin(a);
    const length = Math.abs(w * dx) + Math.abs(h * dy);
    const g = ctx.createLinearGradient(w / 2 - dx * length / 2, h / 2 - dy * length / 2, w / 2 + dx * length / 2, h / 2 + dy * length / 2);
    colors.forEach((color, i) => g.addColorStop(i / (colors.length - 1), color));
    return g;
  }
  function wallpaper(ctx, w, h, name) {
    const themes = {
      coast: ['#fee2b5', '#e28d8a', '#537da5', '#244969', '#142f50'],
      dunes: ['#efcba3', '#bd7c8e', '#805d8a', '#533f71', '#302b51'],
      aurora: ['#091c39', '#286177', '#41bba4', '#5366ac', '#252b63']
    };
    const p = themes[name] || themes.coast;
    ctx.fillStyle = gradient(ctx, w, h, p.slice(0, 3), 90); ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 3; i++) {
      const y = h * (.28 + i * .19);
      ctx.beginPath(); ctx.moveTo(0, y + h * .22);
      ctx.bezierCurveTo(w * .28, y - h * .4, w * .52, y + h * .35, w, y - h * .12);
      ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath();
      ctx.fillStyle = gradient(ctx, w, h, [p[i + 1], p[i + 2]], 65 + i * 30); ctx.fill();
    }
  }
  function render(source, options, custom) {
    const w = source.naturalWidth || source.width, h = source.naturalHeight || source.height;
    const pad = Math.max(0, Math.min(240, Number(options.padding) || 0));
    const width = w + pad * 2, height = h + pad * 2;
    if (width > 32767 || height > 32767 || width * height > 64000000) throw Error('This image is too large to style. Reduce padding or capture a smaller area.');
    const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw Error('Your browser could not create the image.');
    if (options.background === 'solid') { ctx.fillStyle = options.color; ctx.fillRect(0, 0, width, height); }
    if (options.background === 'gradient') { ctx.fillStyle = gradient(ctx, width, height, options.colors, options.angle); ctx.fillRect(0, 0, width, height); }
    if (options.background === 'wallpaper') wallpaper(ctx, width, height, options.wallpaper);
    if (options.background === 'custom') {
      if (!custom) throw Error('Choose a background image first.');
      const scale = Math.max(width / custom.width, height / custom.height);
      ctx.drawImage(custom, (width - custom.width * scale) / 2, (height - custom.height * scale) / 2, custom.width * scale, custom.height * scale);
    }
    const radius = Math.max(0, Math.min(Number(options.radius) || 0, w / 2, h / 2));
    const outline = () => { ctx.beginPath(); ctx.roundRect(pad, pad, w, h, radius); };
    const shadow = Math.max(0, Math.min(100, Number(options.shadow) || 0)) / 100;
    if (shadow) {
      ctx.save(); ctx.shadowColor = `rgba(0,0,0,${shadow * .6})`; ctx.shadowBlur = 40 * shadow; ctx.shadowOffsetY = 16 * shadow;
      // Draw the shadow outside the screenshot, leaving transparent source pixels intact.
      ctx.beginPath(); ctx.rect(0, 0, width, height); ctx.roundRect(pad, pad, w, h, radius); ctx.clip('evenodd');
      outline(); ctx.fillStyle = '#000'; ctx.fill(); ctx.restore();
    }
    ctx.save(); outline(); ctx.clip(); ctx.drawImage(source, pad, pad, w, h); ctx.restore();
    return canvas;
  }
  return { render, palettes };
})();

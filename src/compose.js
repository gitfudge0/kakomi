// Shared PNG composition for uploaded backgrounds, colors, and gradients.
globalThis.KakomiCompose = (() => {
 const palettes={dawn:['#ffba93','#8e73d9'],ocean:['#69e4dd','#3454ac'],orchid:['#e8a4ec','#5148a8'],forest:['#d3e9ba','#22796d'],sunset:['#ffac48','#ba3261'],ice:['#e0f4ff','#4389af'],night:['#222750','#815fb8'],rose:['#ffd6d6','#b4789e']};
 function gradient(ctx,w,h,colors,angle=135){const a=angle*Math.PI/180,dx=Math.cos(a),dy=Math.sin(a),l=Math.abs(w*dx)+Math.abs(h*dy);const g=ctx.createLinearGradient(w/2-dx*l/2,h/2-dy*l/2,w/2+dx*l/2,h/2+dy*l/2);colors.forEach((c,i)=>g.addColorStop(i/(colors.length-1),c));return g}
 const clamp=(n,low,high)=>Math.max(low,Math.min(high,Number(n)||0));
 function render(source,o,custom){
  const w=source.naturalWidth||source.width,h=source.naturalHeight||source.height;
  const pad=Math.round(Math.min(w,h)*clamp(o.padding,0,100)/100),width=w+2*pad,height=h+2*pad;
  if(width>32767||height>32767||width*height>32000000)throw Error('This image is too large to style. Reduce padding or capture a smaller area.');
  const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const ctx=canvas.getContext('2d');if(!ctx)throw Error('Could not create the image.');
  if(o.background!=='none'){
   const scale=Math.min(1,1600/Math.max(width,height));const bg=document.createElement('canvas');bg.width=Math.max(1,Math.round(width*scale));bg.height=Math.max(1,Math.round(height*scale));const b=bg.getContext('2d'),bw=bg.width,bh=bg.height;
   if(o.background==='solid'){b.fillStyle=o.color;b.fillRect(0,0,bw,bh)}
   if(o.background==='gradient'){b.fillStyle=gradient(b,bw,bh,o.colors,o.angle);b.fillRect(0,0,bw,bh)}
   if(o.background==='custom'){if(!custom)throw Error('Choose a background image first.');const z=Math.max(bw/custom.width,bh/custom.height);b.drawImage(custom,(bw-custom.width*z)/2,(bh-custom.height*z)/2,custom.width*z,custom.height*z)}
   // Overscan keeps blurred background edges filled.
   const blur=clamp(o.blur,0,40),extra=blur*3;
   ctx.save();ctx.filter=`blur(${blur}px)`;ctx.drawImage(bg,-extra,-extra,width+extra*2,height+extra*2);ctx.restore();

  }
  const dw=w,dh=h,x=pad,y=pad;
  const radius=clamp(o.radius,0,Math.min(dw,dh)/2),shadow=clamp(o.shadow,0,100)/100;
  const outline=()=>{ctx.beginPath();ctx.roundRect(x,y,dw,dh,radius)};
  if(shadow){ctx.save();ctx.shadowColor=`rgba(0,0,0,${shadow*.6})`;ctx.shadowBlur=40*shadow;ctx.shadowOffsetY=16*shadow;ctx.beginPath();ctx.rect(0,0,width,height);ctx.roundRect(x,y,dw,dh,radius);ctx.clip('evenodd');outline();ctx.fillStyle='#000';ctx.fill();ctx.restore()}
  ctx.save();outline();ctx.clip();ctx.drawImage(source,x,y,dw,dh);ctx.restore();return canvas;
 }
 return{render,palettes};
})();

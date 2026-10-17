// Crianza: exporta el árbol de la cadena a PNG dibujándolo en un <canvas> (sin librerías).
// Los sprites se cargan con crossOrigin="anonymous" (PokéAPI permite CORS); si fallan, se exporta sin ellos.
(function crianzaPng() {
  const VC = window.VC;
  if (!VC) return;
  const NODE_W = 258;
  const NODE_H = 76;
  const GAP_X = 46;
  const GAP_Y = 14;
  const PAD = 36;
  const HEAD = 118;
  const FOOT = 46;

  const css = (name, fallback) => getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
  const palette = () => ({
    bg: css("--bg", "#0a0d14"), bg2: css("--bg-2", "#0d0b08"), panel: css("--panel", "#13100b"), panel2: css("--panel-2", "#1b1610"), panel3: css("--panel-3", "#241d13"),
    line: css("--line", "#3a2f1d"), line2: css("--line-2", "#5a4627"), gold: css("--gold", "#e8b74a"), gold2: css("--gold-2", "#f7d98b"), gold3: css("--gold-3", "#fff1c7"),
    goldDeep: css("--gold-deep", "#a97a22"), text: css("--text", "#f4ecdb"), text2: css("--text-2", "#d9cdb2"), muted: css("--muted", "#a8987a"),
    ok: css("--ok", "#5fd38a"), bad: css("--bad", "#ff6464"), male: css("--male", "#6aaeff"), female: css("--female", "#ff86c0"),
  });

  function loadImage(url, timeout = 6000) {
    return new Promise((resolve) => {
      const image = new Image();
      const timer = setTimeout(() => resolve(null), timeout);
      image.crossOrigin = "anonymous";
      image.onload = () => { clearTimeout(timer); resolve(image); };
      image.onerror = () => { clearTimeout(timer); resolve(null); };
      image.src = url;
    });
  }

  // Posiciones: las hojas en filas, cada cruce en el centro de sus padres y las columnas por profundidad.
  function layout(root) {
    const kids = (node) => (node.left && !node.owned ? [node.left, node.right] : []);
    const depthOf = (node) => (kids(node).length ? 1 + Math.max(...kids(node).map(depthOf)) : 0);
    const maxDepth = depthOf(root);
    const boxes = [];
    let row = 0;
    const place = (node, depth) => {
      const children = kids(node);
      const box = { node, x: (maxDepth - depth) * (NODE_W + GAP_X), children: [] };
      if (!children.length) { box.y = row * (NODE_H + GAP_Y); row += 1; }
      else {
        box.children = children.map((child) => place(child, depth + 1));
        box.y = (box.children[0].y + box.children[1].y) / 2;
      }
      boxes.push(box);
      return box;
    };
    place(root, 0);
    return { boxes, width: (maxDepth + 1) * NODE_W + maxDepth * GAP_X, height: row * NODE_H + (row - 1) * GAP_Y };
  }

  const roundRect = (ctx, x, y, w, h, r) => {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  };
  const fit = (ctx, text, max) => {
    if (ctx.measureText(text).width <= max) return text;
    let value = text;
    while (value.length > 1 && ctx.measureText(`${value}…`).width > max) value = value.slice(0, -1);
    return `${value}…`;
  };

  function draw(canvas, scale, data, tree, images, colors) {
    const ctx = canvas.getContext("2d");
    const width = Math.max(tree.width + PAD * 2, 720);
    const height = tree.height + PAD * 2 + HEAD + FOOT;
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    const body = "Manrope, system-ui, sans-serif";
    const display = "Cinzel, Georgia, serif";
    const mono = "'JetBrains Mono', Consolas, monospace";

    // Fondo y cabecera.
    ctx.fillStyle = colors.bg;
    ctx.fillRect(0, 0, width, height);
    const glow = ctx.createRadialGradient(width / 2, -40, 10, width / 2, -40, Math.max(width, 600) * 0.7);
    glow.addColorStop(0, "rgba(232, 183, 74, .16)");
    glow.addColorStop(1, "rgba(232, 183, 74, 0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = colors.goldDeep;
    ctx.lineWidth = 2;
    roundRect(ctx, 10, 10, width - 20, height - 20, 18);
    ctx.stroke();
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = colors.gold;
    ctx.font = `700 12px ${mono}`;
    ctx.fillText("DIOSESMONWIKI · PLAN DE CRIANZA", PAD, PAD + 10);
    ctx.fillStyle = colors.gold3;
    ctx.font = `700 30px ${display}`;
    ctx.fillText(fit(ctx, data.title, width - PAD * 2), PAD, PAD + 46);
    ctx.fillStyle = colors.text2;
    ctx.font = `600 15px ${body}`;
    ctx.fillText(fit(ctx, data.subtitle, width - PAD * 2), PAD, PAD + 70);
    ctx.fillStyle = colors.muted;
    ctx.font = `500 13px ${body}`;
    ctx.fillText(fit(ctx, data.summary, width - PAD * 2), PAD, PAD + 90);

    const ox = PAD;
    const oy = PAD + HEAD;
    // Líneas: azul hacia el macho, rosa hacia la hembra.
    tree.boxes.forEach((box) => {
      box.children.forEach((child) => {
        const sex = child.node.sex;
        ctx.strokeStyle = sex === "male" ? colors.male : sex === "female" ? colors.female : colors.goldDeep;
        ctx.lineWidth = 2;
        const x1 = ox + child.x + NODE_W;
        const y1 = oy + child.y + NODE_H / 2;
        const x2 = ox + box.x;
        const y2 = oy + box.y + NODE_H / 2;
        const mid = x1 + GAP_X / 2;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(mid, y1);
        ctx.lineTo(mid, y2);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      });
    });

    // Cajas.
    tree.boxes.forEach(({ node, x: bx, y: by }) => {
      const x = ox + bx;
      const y = oy + by;
      const isRoot = node === data.root;
      ctx.save();
      if (node.done) ctx.globalAlpha = 0.6;
      roundRect(ctx, x, y, NODE_W, NODE_H, 12);
      const fill = ctx.createLinearGradient(x, y, x + NODE_W, y + NODE_H);
      fill.addColorStop(0, node.owned ? "rgba(95, 211, 138, .16)" : node.onPath ? "rgba(232, 183, 74, .18)" : colors.panel3);
      fill.addColorStop(0.6, colors.panel2);
      ctx.fillStyle = fill;
      ctx.fill();
      ctx.lineWidth = isRoot ? 2.5 : 1.5;
      ctx.strokeStyle = node.issues?.length ? colors.bad : node.owned ? colors.ok : isRoot ? colors.gold : node.onPath ? colors.goldDeep : colors.line2;
      ctx.stroke();

      const image = images.get(VC.sprite(node.species.id));
      if (image) {
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(image, x - 4, y + (NODE_H - 68) / 2, 68, 68);
        ctx.imageSmoothingEnabled = true;
      } else {
        ctx.fillStyle = colors.bg2;
        ctx.beginPath();
        ctx.arc(x + 30, y + NODE_H / 2, 22, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = colors.gold;
        ctx.font = `700 16px ${display}`;
        ctx.textAlign = "center";
        ctx.fillText(node.species.name.charAt(0), x + 30, y + NODE_H / 2 + 6);
        ctx.textAlign = "left";
      }

      const textX = x + 66;
      const itemSpace = node.item ? 42 : 10;
      const sexSymbol = node.sex === "male" ? "♂" : node.sex === "female" ? "♀" : "";
      ctx.font = `800 14.5px ${body}`;
      const name = fit(ctx, node.species.name, NODE_W - 66 - itemSpace - (sexSymbol ? 18 : 0));
      ctx.fillStyle = colors.text;
      ctx.fillText(name, textX, y + 26);
      if (sexSymbol) {
        const w = ctx.measureText(name).width;
        ctx.fillStyle = node.sex === "male" ? colors.male : colors.female;
        ctx.font = `800 15px ${body}`;
        ctx.fillText(sexSymbol, textX + w + 5, y + 26);
      }
      const note = node.owned ? (node.autoOwned ? "De tu inventario" : "Ya lo tienes") : node.evolveTo ? `→ ${node.evolveTo.name}` : "";
      if (note) {
        ctx.font = `700 10.5px ${body}`;
        ctx.fillStyle = node.owned ? colors.ok : colors.gold2;
        ctx.fillText(fit(ctx, note, NODE_W - 66 - itemSpace), textX, y + 40);
      }
      // Chips de IV.
      let chipX = textX;
      const chipY = y + NODE_H - 26;
      ctx.font = `700 10px ${mono}`;
      [...node.stats].sort((a, b) => VC.STAT_ORDER.indexOf(a) - VC.STAT_ORDER.indexOf(b)).forEach((key) => {
        const stat = VC.statByKey[key];
        const w = ctx.measureText(stat.short).width + 10;
        if (chipX + w > x + NODE_W - itemSpace + 4) return;
        roundRect(ctx, chipX, chipY, w, 16, 4);
        ctx.fillStyle = css(stat.cssVar, colors.gold);
        ctx.fill();
        ctx.fillStyle = "#140e05";
        ctx.fillText(stat.short, chipX + 5, chipY + 12);
        chipX += w + 3;
      });
      // Objeto recio.
      if (node.item) {
        const ix = x + NODE_W - 38;
        const iy = y + (NODE_H - 32) / 2;
        roundRect(ctx, ix, iy, 32, 32, 7);
        ctx.fillStyle = colors.bg2;
        ctx.fill();
        ctx.strokeStyle = colors.goldDeep;
        ctx.lineWidth = 1;
        ctx.stroke();
        const icon = images.get(VC.itemIcon(node.item));
        if (icon) {
          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(icon, ix + 2, iy + 2, 28, 28);
          ctx.imageSmoothingEnabled = true;
        } else {
          ctx.fillStyle = css(VC.statByKey[node.item].cssVar, colors.gold);
          ctx.font = `700 9px ${mono}`;
          ctx.textAlign = "center";
          ctx.fillText(VC.statByKey[node.item].short, ix + 16, iy + 19);
          ctx.textAlign = "left";
        }
      }
      ctx.restore();
      // Número del cruce (y ✓ si está hecho) o estrella de «ya lo tienes».
      if (node.step && !node.owned) {
        const label = node.done ? `✓${node.step}` : String(node.step);
        ctx.font = `700 11px ${mono}`;
        const w = Math.max(22, ctx.measureText(label).width + 12);
        roundRect(ctx, x - 9, y - 9, w, 22, 11);
        ctx.fillStyle = node.done ? colors.ok : colors.gold;
        ctx.fill();
        ctx.strokeStyle = colors.bg;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = "#140e05";
        ctx.textAlign = "center";
        ctx.fillText(label, x - 9 + w / 2, y + 6);
        ctx.textAlign = "left";
      } else if (node.owned) {
        ctx.beginPath();
        ctx.arc(x + 2, y + 2, 11, 0, Math.PI * 2);
        ctx.fillStyle = colors.ok;
        ctx.fill();
        ctx.strokeStyle = colors.bg;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = "#140e05";
        ctx.font = `700 12px ${body}`;
        ctx.textAlign = "center";
        ctx.fillText("★", x + 2, y + 6.5);
        ctx.textAlign = "left";
      }
    });

    // Pie.
    ctx.fillStyle = colors.muted;
    ctx.font = `600 12px ${body}`;
    ctx.fillText("♂ azul = macho · ♀ rosa = hembra · el icono de cada caja es el objeto recio que lleva · ★ = ya lo tienes", PAD, height - PAD + 4);
    ctx.fillStyle = colors.gold;
    ctx.font = `700 12px ${display}`;
    ctx.textAlign = "right";
    ctx.fillText("diosesmonwiki.stream", width - PAD, height - PAD + 4);
    ctx.textAlign = "left";
  }

  const toBlob = (canvas) => new Promise((resolve, reject) => {
    try { canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("blob"))), "image/png"); } catch (error) { reject(error); }
  });

  VC.exportTreePng = async (data) => {
    const colors = palette();
    const tree = layout(data.root);
    const urls = new Set();
    tree.boxes.forEach(({ node }) => { urls.add(VC.sprite(node.species.id)); if (node.item) urls.add(VC.itemIcon(node.item)); });
    try { await document.fonts?.ready; } catch { /* sin fuentes */ }
    const loaded = await Promise.all([...urls].map(async (url) => [url, await loadImage(url)]));
    let images = new Map(loaded.filter(([, image]) => image));
    const width = Math.max(tree.width + PAD * 2, 720);
    const height = tree.height + PAD * 2 + HEAD + FOOT;
    const scale = Math.min(2, Math.sqrt(16e6 / (width * height)));
    const canvas = document.createElement("canvas");
    draw(canvas, scale, data, tree, images, colors);
    let blob;
    try { blob = await toBlob(canvas); } catch {
      // Lienzo «contaminado» por alguna imagen: se repite sin sprites.
      images = new Map();
      draw(canvas, scale, data, tree, images, colors);
      blob = await toBlob(canvas);
    }
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = data.filename || "wiki-diosesmon-crianza.png";
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    return { withSprites: images.size > 0, width: canvas.width, height: canvas.height };
  };
})();

// Visor de modelos de bloque de Minecraft (formato JSON de Blockbench) con three.js.
// window.MCModel3D.create(contenedor, { interactive }) → { load(url), dispose(), snapshot() }
// Pinta como el juego: texturas sin suavizar, transparencia recortada y el sombreado fijo por cara.
(function mcModel3d() {
  const SHADE = { up: 1, down: 0.5, north: 0.8, south: 0.8, east: 0.6, west: 0.6 };
  const loader = () => (window.THREE ? new THREE.TextureLoader() : null);
  const textureCache = new Map();

  function texture(url) {
    if (!textureCache.has(url)) {
      textureCache.set(url, new Promise((resolve, reject) => {
        loader().load(url, (tex) => {
          tex.magFilter = THREE.NearestFilter;
          tex.minFilter = THREE.NearestFilter;
          tex.generateMipmaps = false;
          // Texturas animadas (tira vertical de fotogramas): solo el primero.
          const { width, height } = tex.image;
          if (height > width && height % width === 0) {
            tex.repeat.set(1, width / height);
            tex.offset.set(0, 1 - width / height);
          }
          resolve(tex);
        }, undefined, reject);
      }));
    }
    return textureCache.get(url);
  }

  // Esquinas de cada cara (arriba-izq., arriba-der., abajo-der., abajo-izq.) vistas desde fuera.
  function corners(side, [x0, y0, z0], [x1, y1, z1]) {
    switch (side) {
      case "north": return [[x1, y1, z0], [x0, y1, z0], [x0, y0, z0], [x1, y0, z0]];
      case "south": return [[x0, y1, z1], [x1, y1, z1], [x1, y0, z1], [x0, y0, z1]];
      case "east": return [[x1, y1, z1], [x1, y1, z0], [x1, y0, z0], [x1, y0, z1]];
      case "west": return [[x0, y1, z0], [x0, y1, z1], [x0, y0, z1], [x0, y0, z0]];
      case "up": return [[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]];
      default: return [[x0, y0, z1], [x1, y0, z1], [x1, y0, z0], [x0, y0, z0]];
    }
  }
  // UV por defecto (si la cara no trae «uv»), como hace Minecraft.
  function defaultUv(side, [x0, y0, z0], [x1, y1, z1]) {
    if (side === "north" || side === "south") return [x0, 16 - y1, x1, 16 - y0];
    if (side === "east" || side === "west") return [z0, 16 - y1, z1, 16 - y0];
    return [x0, z0, x1, z1];
  }
  function rotatePoint(point, rot) {
    if (!rot) return point;
    const angle = (rot.d * Math.PI) / 180;
    const [ox, oy, oz] = rot.o;
    let [x, y, z] = [point[0] - ox, point[1] - oy, point[2] - oz];
    const c = Math.cos(angle), s = Math.sin(angle);
    if (rot.a === "x") [y, z] = [y * c - z * s, y * s + z * c];
    else if (rot.a === "y") [x, z] = [x * c + z * s, -x * s + z * c];
    else [x, y] = [x * c - y * s, x * s + y * c];
    return [x + ox, y + oy, z + oz];
  }

  async function buildMesh(model, base) {
    const group = new THREE.Group();
    const byTexture = new Map();
    for (const element of model.elements) {
      for (const [side, face] of Object.entries(element.faces)) {
        if (!byTexture.has(face.t)) byTexture.set(face.t, { pos: [], uv: [], color: [], index: [] });
        const buffer = byTexture.get(face.t);
        const pts = corners(side, element.f, element.to).map((p) => rotatePoint(p, element.rot));
        const [u1, v1, u2, v2] = (face.uv || defaultUv(side, element.f, element.to)).map((n) => n / 16);
        let uvs = [[u1, 1 - v1], [u2, 1 - v1], [u2, 1 - v2], [u1, 1 - v2]];
        const turns = ((face.r || 0) / 90) % 4;
        for (let i = 0; i < turns; i += 1) uvs = [uvs[3], uvs[0], uvs[1], uvs[2]];
        const start = buffer.pos.length / 3;
        pts.forEach((p, i) => {
          buffer.pos.push(p[0] - 8, p[1], p[2] - 8);
          buffer.uv.push(uvs[i][0], uvs[i][1]);
          const shade = SHADE[side] ?? 1;
          buffer.color.push(shade, shade, shade);
        });
        buffer.index.push(start, start + 3, start + 2, start, start + 2, start + 1);
      }
    }
    for (const [key, buffer] of byTexture) {
      const url = model.textures[key];
      if (!url) continue;
      const map = await texture(base + url);
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", new THREE.Float32BufferAttribute(buffer.pos, 3));
      geometry.setAttribute("uv", new THREE.Float32BufferAttribute(buffer.uv, 2));
      geometry.setAttribute("color", new THREE.Float32BufferAttribute(buffer.color, 3));
      geometry.setIndex(buffer.index);
      const material = new THREE.MeshBasicMaterial({ map, vertexColors: true, transparent: false, alphaTest: 0.1, side: THREE.DoubleSide });
      group.add(new THREE.Mesh(geometry, material));
    }
    return group;
  }

  function create(container, { interactive = true, background = null } = {}) {
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: !background, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    if (background) renderer.setClearColor(background);
    container.append(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 1000);
    const pivot = new THREE.Group();
    scene.add(pivot);
    // Vista inicial como el icono del inventario: 30° desde arriba y girado 225°.
    const view = { yaw: (225 * Math.PI) / 180, pitch: (28 * Math.PI) / 180, distance: 60, target: new THREE.Vector3(0, 8, 0), fit: 60 };
    let frame = 0;

    const place = () => {
      const { yaw, pitch, distance, target } = view;
      camera.position.set(
        target.x + distance * Math.cos(pitch) * Math.sin(yaw),
        target.y + distance * Math.sin(pitch),
        target.z + distance * Math.cos(pitch) * Math.cos(yaw),
      );
      camera.lookAt(target);
    };
    const resize = () => {
      const width = container.clientWidth || 300;
      const height = container.clientHeight || width;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      draw();
    };
    const draw = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => { place(); renderer.render(scene, camera); });
    };
    const observer = new ResizeObserver(resize);
    observer.observe(container);

    if (interactive) {
      const canvas = renderer.domElement;
      canvas.style.touchAction = "none";
      const pointers = new Map();
      let pinch = 0;
      canvas.addEventListener("pointerdown", (event) => { canvas.setPointerCapture(event.pointerId); pointers.set(event.pointerId, [event.clientX, event.clientY]); });
      canvas.addEventListener("pointermove", (event) => {
        if (!pointers.has(event.pointerId)) return;
        const [px, py] = pointers.get(event.pointerId);
        pointers.set(event.pointerId, [event.clientX, event.clientY]);
        if (pointers.size === 2) {
          const [a, b] = [...pointers.values()];
          const gap = Math.hypot(a[0] - b[0], a[1] - b[1]);
          if (pinch) view.distance = Math.min(view.fit * 3, Math.max(view.fit * 0.35, view.distance * (pinch / gap)));
          pinch = gap;
        } else {
          view.yaw -= (event.clientX - px) * 0.01;
          view.pitch = Math.min(1.45, Math.max(-1.45, view.pitch + (event.clientY - py) * 0.01));
        }
        draw();
      });
      const up = (event) => { pointers.delete(event.pointerId); if (pointers.size < 2) pinch = 0; };
      canvas.addEventListener("pointerup", up);
      canvas.addEventListener("pointercancel", up);
      canvas.addEventListener("wheel", (event) => {
        event.preventDefault();
        view.distance = Math.min(view.fit * 3, Math.max(view.fit * 0.35, view.distance * (event.deltaY > 0 ? 1.1 : 0.9)));
        draw();
      }, { passive: false });
    }

    return {
      async load(url, base = "") {
        const model = await (await fetch(url)).json();
        while (pivot.children.length) pivot.remove(pivot.children[0]);
        const mesh = await buildMesh(model, base);
        pivot.add(mesh);
        // Encuadre: centra el modelo y ajusta la distancia a su tamaño.
        const box = new THREE.Box3().setFromObject(mesh);
        const size = box.getSize(new THREE.Vector3());
        box.getCenter(view.target);
        const radius = Math.max(size.x, size.y, size.z) * 0.62 + 1;
        view.fit = radius / Math.sin((camera.fov * Math.PI) / 360);
        view.distance = view.fit;
        resize();
        return model;
      },
      reset() { view.yaw = (225 * Math.PI) / 180; view.pitch = (28 * Math.PI) / 180; view.distance = view.fit; draw(); },
      snapshot() { place(); renderer.render(scene, camera); return renderer.domElement.toDataURL("image/png"); },
      dispose() { observer.disconnect(); cancelAnimationFrame(frame); renderer.dispose(); renderer.domElement.remove(); },
    };
  }

  window.MCModel3D = { create };
})();

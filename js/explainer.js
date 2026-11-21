// Wires the explainer to the Cyanotype style:
// 1) static snapshots for the comparison grids (Mapbox Static Images API)
// 2) one live background map that flies to each scrolly step
// 3) the full interactive map embed at the end
(function () {
  const C = window.CYANO || {};
  const ready = C.user && !C.user.startsWith("YOUR") && C.styleId && !C.styleId.startsWith("YOUR") &&
                C.token && C.token.startsWith("pk.") && !C.token.includes("YOUR");

  if (!ready) {
    document.querySelectorAll(".needs-config").forEach(el => {
      const w = document.createElement("div");
      w.className = "config-warning";
      w.textContent = "Map not connected yet: open js/config.js and add your Mapbox username, style ID and public token.";
      el.prepend(w);
    });
    return;
  }

  // 1. static snapshots: <img data-static="lon,lat,zoom[,bearing]">
  const base = `https://api.mapbox.com/styles/v1/${C.user}/${C.styleId}/static`;
  document.querySelectorAll("img[data-static]").forEach(img => {
    const [lon, lat, z, bearing = 0] = img.dataset.static.split(",").map(Number);
    img.src = `${base}/${lon},${lat},${z},${bearing}/600x400@2x?access_token=${C.token}`;
    img.loading = "lazy";
  });

  // 3. interactive embed (Mapbox share URL)
  const frame = document.getElementById("full-map");
  if (frame) {
    frame.src = `https://api.mapbox.com/styles/v1/${C.user}/${C.styleId}.html?title=false&zoomwheel=true&fresh=true&access_token=${C.token}#${frame.dataset.view}`;
  }

  // 2. scrolly background map
  const el = document.getElementById("bgmap");
  if (!el || !window.mapboxgl) return;
  mapboxgl.accessToken = C.token;
  const steps = [...document.querySelectorAll(".step[data-view]")];
  const view = s => {
    const [lon, lat, zoom, bearing = 0, pitch = 0] = s.dataset.view.split(",").map(Number);
    return { center: [lon, lat], zoom, bearing, pitch };
  };
  const map = new mapboxgl.Map({
    container: el,
    style: `mapbox://styles/${C.user}/${C.styleId}`,
    interactive: false,
    attributionControl: true,
    ...view(steps[0])
  });
  window.cyanoMap = map;

  // a small zoom readout so readers can see which scale band they are in
  const readout = document.createElement("div");
  readout.style.cssText = "position:absolute;left:14px;bottom:30px;font:12px 'IBM Plex Mono',monospace;letter-spacing:.15em;color:#F2F0E6;background:rgba(12,40,78,.8);border:1px solid #F2F0E6;padding:3px 8px;z-index:2";
  el.appendChild(readout);
  const band = z => z < 6 ? "SPECIMEN" : z < 12 ? "SURVEY" : "PLAN";
  const upd = () => { const z = map.getZoom(); readout.textContent = `z${z.toFixed(1)}  ${band(z)}`; };
  map.on("move", upd); map.on("load", upd);

  let current = null;
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting && e.target !== current) {
        current = e.target;
        map.flyTo({ ...view(e.target), speed: 0.9, curve: 1.4, essential: true });
      }
    });
  }, { rootMargin: "-45% 0px -45% 0px" });
  steps.forEach(s => io.observe(s));
})();

const $ = id => document.getElementById(id), cv = $('cv'), g = cv.getContext('2d'), src = $('src');
const sub = (a, b) => a.map((v, i) => v - b[i]), dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const lerp = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t), len = (a, b) => Math.hypot(...sub(a, b));
const L = [-0.4, 0.8, 0.45].map(v => v / Math.hypot(0.4, 0.8, 0.45));
const FONT = '26px "Apple Symbols", "Segoe UI Symbol", "Noto Sans Symbols 2", "Noto Sans Symbols", "DejaVu Sans", serif';
let faces = [], walls = [], glyphs = {}, pal = {}, sym = {}, title = '', yaw = Math.PI + 0.6, pitch = 0.5, zoom = 1, base = 20, ty = 1, wire = false, drag = null;
let spin = !matchMedia('(prefers-reduced-motion: reduce)').matches;
let showTitle = true;

const rgb = c => { g.fillStyle = '#000'; g.fillStyle = c; const h = g.fillStyle; return h[0] === '#' ? [1, 3, 5].map(i => parseInt(h.substr(i, 2), 16)) : [0, 0, 0]; };
const mat = (s = 'grey') => { const [a, b, x] = s.split(/[\/|]/); return {a: a === 'none' ? null : rgb(a), b: b && rgb(b), s: +x || 1, fr: x && isNaN(x) && rgb(x), alt: s.includes('|')}; };
const mix = (c, p, k = 0.4) => c && c.map((v, i) => v + (p[i] - v) * k | 0);

const isPic = s => /\.(svg|png|gif|jpe?g)$/i.test(s);

function glyph(ch, c = [255, 255, 255], fr) {
    const k = ch + c + fr;
    if (!glyphs[k]) {
        const im = glyphs[k] = document.createElement('canvas'), x = im.getContext('2d');
        im.width = im.height = isPic(ch) ? 128 : 32;
        if (isPic(ch)) {
            const pic = new Image();
            pic.onload = () => x.drawImage(pic, 0, 0, 128, 128);
            pic.src = ch;
            return im;
        }
        x.fillStyle = `rgb(${c})`;
        x.font = FONT;
        x.textAlign = 'center';
        x.textBaseline = 'middle';
        x.fillText(ch + '\uFE0E', 16, 17);
        if (fr) { x.strokeStyle = `rgb(${fr})`; x.lineWidth = 5; x.strokeRect(2.5, 2.5, 27, 27); }
    }
    return glyphs[k];
}

function face(p, c, o, fl, img) {
    const n = cross(sub(p[1], p[0]), sub(p[2], p[0])), m = p.reduce((s, q) => s.map((v, i) => v + q[i] / p.length), [0, 0, 0]);
    const k = Math.hypot(...n) * (dot(n, sub(m, o)) < 0 ? -1 : 1), u = n.map(v => v / k);
    const t = Math.round((0.45 + 0.55 * Math.max(0, dot(u, L))) * 4) / 4;
    faces.push({p, n: u, fl, img, s: c && `rgb(${c.map(v => v * t | 0)})`});
}

function quad(a, b, c, d, m, o, fl) {
    const ch = m.b && !m.alt, nu = ch ? Math.max(1, Math.round(len(a, b) / m.s)) : 1, nv = ch ? Math.max(1, Math.round(len(a, d) / m.s)) : 1;
    const P = (u, v) => lerp(lerp(a, b, u / nu), lerp(d, c, u / nu), v / nv);
    for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++)
        face([P(i, j), P(i + 1, j), P(i + 1, j + 1), P(i, j + 1)], (i + j + (m.k || 0)) % 2 && ch ? m.b : m.a, o, fl);
}

function grid(A, B, y, h, cols, rows, m, text, o, cells = '') {
    const ch = isPic(text) ? [text] : [...text], cc = [...cells], P = (u, v) => [A[0] + (B[0] - A[0]) * u / cols, y + h - h * v / rows, A[2] + (B[2] - A[2]) * u / cols];
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
        const n = j * cols + i, s = ch[n], cm = pal[cc[n % cc.length]] || pal[s] || m, t = cm !== m && !m.b && m.a;
        const [a, b, fr] = t ? [mix(cm.a, t), mix(cm.b || [255, 255, 255], t.map(v => 255 - v)), mix(cm.fr, t)] : [cm.a, cm.b, cm.fr];
        face([P(i, j), P(i + 1, j), P(i + 1, j + 1), P(i, j + 1)], a, o, false, s && s !== '.' && glyph(sym[s] || s, b, fr));
    }
}

function box(x, y, z, w, h, d, m) {
    const v = (i, j, k) => [x + (i - 0.5) * w, y + j * h, z + (k - 0.5) * d], o = [x, y + h / 2, z];
    ['000 100 110 010', '001 101 111 011', '000 001 011 010', '100 101 111 110', '010 110 111 011', '000 100 101 001']
        .forEach(f => quad(...f.split(' ').map(s => v(...s)), m, o));
}

function pillar(x, y, z, w, h, m) {
    const P = (i, yy) => [x + w / 2 * Math.cos((i + 0.5) * Math.PI / 4), yy, z + w / 2 * Math.sin((i + 0.5) * Math.PI / 4)];
    const o = [x, y + h / 2, z], r = [...Array(8).keys()];
    r.forEach(i => quad(P(i, y), P(i + 1, y), P(i + 1, y + h), P(i, y + h), m, o));
    [y, y + h].forEach(yy => face(r.map(i => P(i, yy)), m.a, o));
}

function pyramid(x, y, z, w, h, d, m) {
    const c = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([i, k]) => [x + i * w / 2, y, z + k * d / 2]), t = [x, y + h, z], o = [x, y + h / 3, z];
    face(c, m.a, o);
    c.forEach((p, i) => face([p, c[(i + 1) % 4], t], m.a, o));
}

function steps(x, y, z, w, h, d, m, n = 3) {
    const sh = h / n, sd = d / n, X = [x - w / 2, x + w / 2];
    for (let i = 0; i < n; i++) {
        const mi = m.alt ? {a: i % 2 ? m.b : m.a} : {...m, k: i}, y1 = y + (i + 1) * sh, z0 = z + d / 2 - i * sd, z1 = z0 - sd, zm = z0 - sd / 2;
        quad([X[0], y1 - sh, z0], [X[1], y1 - sh, z0], [X[1], y1, z0], [X[0], y1, z0], mi, [x, y1, z1]);
        quad([X[0], y1, z0], [X[1], y1, z0], [X[1], y1, z1], [X[0], y1, z1], mi, [x, y, zm]);
        X.forEach(xx => quad([xx, y, z0], [xx, y, z1], [xx, y1, z1], [xx, y1, z0], mi, [x, y, zm]));
    }
    quad([X[0], y, z - d / 2], [X[1], y, z - d / 2], [X[1], y + h, z - d / 2], [X[0], y + h, z - d / 2], m, [x, y, z]);
}

function room(x, y, z, r, h, m, n = 7) {
    const V = (i, yy) => { const a = (i - 0.5) * 2 * Math.PI / n - Math.PI / 2; return [x + r * Math.cos(a), yy, z + r * Math.sin(a)]; };
    const ix = [...Array(n).keys()];
    walls = ix.map(i => {
        const A = V(i, y), B = V(i + 1, y), o = [(A[0] + B[0]) - x, y, (A[2] + B[2]) - z], s = faces.length;
        quad(A, B, V(i + 1, y + h), V(i, y + h), {a: m.a}, o);
        return {A, B, y, h, o, f: faces.slice(s)};
    });
    face(ix.map(i => V(i, y)), m.b || m.a, [x, y - 1, z], true);
    face(ix.map(i => V(i, y + h)), m.a, [x, y + h + 1, z]);
}

function wall(k, cols, rows, m, text = '', cells) {
    const w = walls[k - 1];
    if (!w) return;
    faces = faces.filter(f => !w.f.includes(f));
    grid(w.A, w.B, w.y, w.h, cols, rows, m, text, w.o, cells);
}

const panel = (x, y, z, w, h, cols, rows, m, text = '', cells) => grid([x - w / 2, y, z], [x + w / 2, y, z], y, h, cols, rows, m, text, [x, y, z - 1], cells);

function decal(x, y, z, w, d, m, text = '', dir = 'up') {
    const s = dir === 'down' ? -1 : 1, P = (i, k) => [x + i * s * w / 2, y, z + k * d / 2];
    face([P(-1, -1), P(1, -1), P(1, 1), P(-1, 1)], m.a, [x, y - s, z], false, glyph(text, m.b));
}

const floor = (w, d, m) => quad([-w / 2, 0, -d / 2], [w / 2, 0, -d / 2], [w / 2, 0, d / 2], [-w / 2, 0, d / 2], m, [0, -1, 0], true);
const shapes = {box, pillar, pyramid, steps, floor, room, wall, panel, decal};

function load(text) {
    faces = []; walls = []; pal = {}; sym = {}; title = '';
    for (const line of text.split('\n')) {
        const t = line.trim().split(/\s+/), fn = shapes[t[0]], rot = t.find(s => s[0] === '@');
        if (t[0] === 'title') title = t.slice(1).join(' ');
        if (t[0] === 'palette') for (let i = 1; i < t.length; i += 2) pal[t[i]] = mat(t[i + 1]);
        if (t[0] === 'sym') for (let i = 1; i < t.length; i += 2) sym[t[i]] = t[i + 1];
        if (!fn) continue;
        const r = t.slice(t[0] === 'floor' ? 1 : 2).filter(s => s[0] !== '@'), ci = r.findIndex(s => isNaN(s)), c = ci < 0 ? r.length : ci;
        const nums = r.slice(0, c).map(Number), start = faces.length;
        fn(...nums, mat(r[c]), ...r.slice(c + 1).map(s => isNaN(s) ? s : +s));
        if (rot && !['floor', 'wall'].includes(t[0])) {
            const a = rot.slice(1) * Math.PI / 180, C = Math.cos(a), S = Math.sin(a), [cx, , cz] = nums;
            const rv = ([x, y, z]) => [x * C - z * S, y, x * S + z * C], rp = p => { const q = rv([p[0] - cx, p[1], p[2] - cz]); return [q[0] + cx, q[1], q[2] + cz]; };
            faces.slice(start).forEach(f => { f.p = f.p.map(rp); f.n = rv(f.n); });
            if (t[0] === 'room') walls.forEach(w => ['A', 'B', 'o'].forEach(k => w[k] = rp(w[k])));
        }
    }
    const all = faces.flatMap(f => f.p);
    base = Math.max(1, ...all.flatMap(p => [Math.abs(p[0]), Math.abs(p[2])])) * 2.6;
    ty = Math.max(0, ...all.map(p => p[1])) / 3;
}

function frame() {
    if (spin && !drag) yaw += 0.004;
    const W = cv.width, H = cv.height, f = H * 1.4, cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
    const R = ([x, y, z]) => { const X = x * cy - z * sy, Z = x * sy + z * cy; return [X, y * cp + Z * sp, Z * cp - y * sp]; };
    const V = p => { const q = R([p[0], p[1] - ty, p[2]]); q[2] += base * zoom; return q; };
    g.fillStyle = '#000040';
    g.fillRect(0, 0, W, H);
    g.lineWidth = 1;
    g.imageSmoothingEnabled = false;
    faces.map(fc => ({fc, p: fc.p.map(V)}))
        .filter(({fc, p}) => p.every(q => q[2] > 0.1) && (wire || dot(R(fc.n), p[0]) < 0))
        .map(o => (o.z = o.fc.fl ? 1e9 : o.p.reduce((s, q) => s + q[2], 0) / o.p.length, o))
        .sort((a, b) => b.z - a.z)
        .forEach(({fc, p}) => {
            const s = p.map(q => [W / 2 - q[0] * f / q[2], H / 2 - q[1] * f / q[2]]);
            g.beginPath();
            s.forEach(q => g.lineTo(...q));
            g.closePath();
            if (wire) { g.strokeStyle = '#0f0'; g.stroke(); return; }
            if (fc.s) { g.fillStyle = g.strokeStyle = fc.s; g.fill(); g.stroke(); }
            if (fc.img) {
                g.save();
                g.clip();
                const S = fc.img.width;
                g.setTransform((s[1][0] - s[0][0]) / S, (s[1][1] - s[0][1]) / S, (s[3][0] - s[0][0]) / S, (s[3][1] - s[0][1]) / S, ...s[0]);
                g.drawImage(fc.img, 0, 0);
                g.restore();
            }
        });
    g.fillStyle = '#ff0';
    g.font = `${H / 24 | 0}px monospace`;
    if (showTitle) g.fillText(title, 6, H / 20 + 4);
    requestAnimationFrame(frame);
}
const toggleTitle = _ => { showTitle = (!showTitle); };
const toggleCode = _ => { $('code').classList.toggle('hidden'); };
const setText = t => { src.value = t; load(t); };
cv.onpointerdown = e => { drag = [e.clientX, e.clientY]; cv.setPointerCapture(e.pointerId); };
cv.onpointermove = e => {
    if (!drag) return;
    yaw += (e.clientX - drag[0]) * 0.01;
    pitch = Math.min(1.5, Math.max(0.05, pitch + (e.clientY - drag[1]) * 0.01));
    drag = [e.clientX, e.clientY];
};
cv.onpointerup = cv.onpointercancel = () => drag = null;
cv.addEventListener('wheel', e => { e.preventDefault(); zoom = Math.min(4, Math.max(0.2, zoom * (e.deltaY > 0 ? 1.1 : 0.9))); }, {passive: false});
src.oninput = () => load(src.value);
$('file').onchange = e => e.target.files[0]?.text().then(setText);
ondragover = e => e.preventDefault();
ondrop = e => { e.preventDefault(); e.dataTransfer.files[0]?.text().then(setText); };
$('bSpin').onclick = e => { spin = !spin; e.target.textContent = spin ? 'Pause' : 'Spin'; };
$('bWire').onclick = e => { wire = !wire; e.target.textContent = wire ? 'Solid' : 'Wireframe'; };
$('bRes').onclick = e => { const hi = cv.width === 320; cv.width = hi ? 640 : 320; cv.height = hi ? 480 : 240; e.target.textContent = hi ? 'Lo-res' : 'Hi-res'; };
$('bTitle').onclick = e => { toggleTitle(); };
$('bCode').onclick = e => { toggleCode(); };

const loadFile = f => fetch(f).then(r => r.text()).then(setText);
$('pick').onchange = e => loadFile(e.target.value);
loadFile($('pick').value);
frame();
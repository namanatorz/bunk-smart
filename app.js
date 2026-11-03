const $ = id => document.getElementById(id);
const KEY = "bunksmart-v2";
const PAGES = ["profile", "calculator", "graph"];
const blank = () => ({ name: "", held: "", att: "" });
let S = { profile: { name: "", roll: "", course: "", sem: "" }, req: "75", subjects: [blank()] };
let errEls = [];

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

/* ---- Storage (optional, never blocks the page) ---- */
function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }
function load() {
  try {
    const d = JSON.parse(localStorage.getItem(KEY));
    if (d && typeof d === "object") {
      if (d.profile) Object.assign(S.profile, d.profile);
      if (d.req) S.req = String(d.req);
      if (Array.isArray(d.subjects) && d.subjects.length) S.subjects = d.subjects;
    }
  } catch (e) {}
}

/* ---- Maths (same as the C program) ---- */
function analyse(held, att, req) {
  const pct = att * 100 / held;
  if (pct >= req) {
    const bunks = Math.max(0, Math.floor(att * 100 / req - held + 1e-9));
    return { pct, bunks, cls: bunks > 0 ? "safe" : "edge", label: bunks > 0 ? "On track" : "On the edge" };
  }
  const possible = req < 100;
  const need = possible ? Math.max(0, Math.ceil((req * held - 100 * att) / (100 - req) - 1e-9)) : 0;
  return { pct, need, possible, cls: "low", label: "Short" };
}

function items() {
  const out = [], errs = [];
  S.subjects.forEach((s, i) => {
    const held = parseInt(s.held, 10), att = parseInt(s.att, 10);
    const name = (s.name || "").trim() || "Subject " + (i + 1);
    errs[i] = "";
    if (s.held === "" && s.att === "") return;
    if (!(held >= 1) || !(att >= 0)) errs[i] = "Enter classes held (1 or more) and classes attended.";
    else if (att > held) errs[i] = "Attended can’t be more than held (" + held + ").";
    else out.push({ name, held, att });
  });
  return { out, errs };
}
const reqVal = () => { const r = parseFloat(S.req); return r >= 1 && r <= 100 ? r : null; };

/* ---- Student page ---- */
function updateChip() {
  const c = $("chip"), p = S.profile;
  c.hidden = !p.name;
  c.textContent = p.name ? "Hi, " + p.name : "";
}
function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  const button = $("theme-toggle");
  button.textContent = theme === "dark" ? "Light theme" : "Dark theme";
  button.setAttribute("aria-label", "Switch to " + (theme === "dark" ? "light" : "dark") + " theme");
}
function initProfile() {
  ["name", "roll", "course", "sem"].forEach(k => {
    const i = $("pf-" + k);
    i.value = S.profile[k] || "";
    i.addEventListener("input", () => { S.profile[k] = i.value.trim(); save(); updateChip(); });
  });
}

/* ---- Calculator page ---- */
function field(labelText, attrs, value) {
  const wrap = el("div");
  const lab = el("label", "", labelText);
  const inp = el("input");
  Object.entries(attrs).forEach(([k, v]) => inp.setAttribute(k, v));
  inp.id = "f" + Math.random().toString(36).slice(2);
  inp.value = value || "";
  lab.htmlFor = inp.id;
  wrap.append(lab, inp);
  return { wrap, inp };
}

function renderRows(focusLast) {
  const box = $("rows");
  box.replaceChildren();
  errEls = [];
  S.subjects.forEach((s, i) => {
    const row = el("div", "row");
    const n = field("Subject name", { type: "text", maxlength: 40, placeholder: "e.g. Maths" }, s.name);
    n.wrap.className = "name";
    const h = field("Classes held", { type: "number", inputmode: "numeric", min: 1, placeholder: "40" }, s.held);
    const a = field("Classes attended", { type: "number", inputmode: "numeric", min: 0, placeholder: "34" }, s.att);
    const err = el("p", "err");
    err.setAttribute("role", "alert");
    errEls[i] = err;
    const del = el("button", "ghost del", "Remove");
    del.type = "button";
    del.addEventListener("click", () => {
      S.subjects.splice(i, 1);
      if (!S.subjects.length) S.subjects.push(blank());
      save(); renderRows(); renderResults();
    });
    row.addEventListener("input", () => {
      S.subjects[i] = { name: n.inp.value.trim(), held: h.inp.value, att: a.inp.value };
      save(); renderResults();
    });
    row.append(n.wrap, h.wrap, a.wrap, err, del);
    box.append(row);
    if (focusLast && i === S.subjects.length - 1) n.inp.focus();
  });
}

function card(name, r, req) {
  const c = el("section", "card " + r.cls);
  const top = el("div", "top");
  top.append(el("h3", "", name), el("span", "pill", r.label));
  c.append(top);
  if (r.pct >= req) {
    c.append(el("p", "big", String(r.bunks)),
      el("p", "cap", r.bunks === 0 ? "spare bunks. Attend the next class."
        : r.bunks === 1 ? "bunk you can afford" : "bunks you can afford"));
  } else if (r.possible) {
    c.append(el("p", "big", String(r.need)),
      el("p", "cap", r.need === 1 ? "class to attend to recover" : "classes to attend in a row to recover"));
  } else {
    c.append(el("p", "big", "0"), el("p", "cap", "A 100% target can’t be recovered after a miss."));
  }
  c.append(bar(r, req));
  return c;
}

function bar(r, req) {
  const b = el("div", "bar");
  const f = el("div", "fill");
  f.style.width = Math.min(100, r.pct) + "%";
  const t = el("div", "tick");
  t.style.left = "calc(" + req + "% - 1px)";
  t.title = "Target";
  b.append(f, t);
  return b;
}

function renderResults() {
  const req = reqVal(), grid = $("grid"), overall = $("overall");
  const { out, errs } = items();
  errs.forEach((m, i) => { if (errEls[i]) errEls[i].textContent = m; });
  grid.replaceChildren();
  overall.hidden = true;
  if (req === null) { grid.append(el("p", "empty", "Enter a required attendance between 1 and 100.")); return; }
  if (!out.length) { grid.append(el("p", "empty", "Add classes held and attended for a subject to see how many bunks you have.")); return; }
  let th = 0, ta = 0;
  out.forEach(o => { grid.append(card(o.name, analyse(o.held, o.att, req), req)); th += o.held; ta += o.att; });
  overall.replaceChildren(
    el("b", "", (ta * 100 / th).toFixed(1) + "% overall"),
    el("span", "", ta + " of " + th + " classes attended across " + out.length + (out.length === 1 ? " subject" : " subjects")),
    el("span", "", "Target: " + req + "%"));
  overall.hidden = false;
}

/* ---- Graph page ---- */
function ring(pct, cls) {
  const ns = "http://www.w3.org/2000/svg", C = 2 * Math.PI * 54;
  const s = document.createElementNS(ns, "svg");
  s.setAttribute("viewBox", "0 0 140 140");
  s.setAttribute("class", "ring " + cls);
  s.setAttribute("role", "img");
  s.setAttribute("aria-label", "Overall attendance " + pct.toFixed(1) + " percent");
  const circle = c => {
    const e = document.createElementNS(ns, "circle");
    e.setAttribute("cx", 70); e.setAttribute("cy", 70); e.setAttribute("r", 54);
    e.setAttribute("fill", "none"); e.setAttribute("stroke-width", 14); e.setAttribute("class", c);
    return e;
  };
  const fg = circle("rfg");
  fg.setAttribute("stroke-dasharray", (Math.min(100, pct) / 100 * C) + " " + C);
  fg.setAttribute("stroke-linecap", "round");
  fg.setAttribute("transform", "rotate(-90 70 70)");
  const t = document.createElementNS(ns, "text");
  t.setAttribute("x", 70); t.setAttribute("y", 80); t.setAttribute("text-anchor", "middle"); t.setAttribute("class", "rt");
  t.textContent = pct.toFixed(0) + "%";
  s.append(circle("rbg"), fg, t);
  return s;
}

function renderGraph() {
  const p = S.profile, req = reqVal(), rep = $("report");
  const who = [p.name, p.roll && "Roll " + p.roll, p.course, p.sem && "Semester " + p.sem].filter(Boolean).join(", ");
  $("who").textContent = who || "Add your details on the Student page to show them here.";
  rep.replaceChildren();

  const { out } = items();
  if (req === null || !out.length) {
    const m = el("p", "empty", "No attendance to show yet. Enter your classes on the ");
    const a = el("a", "", "Calculator page"); a.href = "#calculator";
    m.append(a, ".");
    rep.append(m);
    return;
  }

  const rows = out.map(o => ({ ...o, r: analyse(o.held, o.att, req) }));
  const th = rows.reduce((s, x) => s + x.held, 0), ta = rows.reduce((s, x) => s + x.att, 0);
  const pct = ta * 100 / th, ok = rows.filter(x => x.r.pct >= req).length;
  const short = rows.filter(x => x.r.pct < req);

  const sum = el("div", "panel summary");
  sum.append(ring(pct, pct >= req ? "safe" : "low"));
  const txt = el("div");
  txt.append(
    el("h3", "", "Overall attendance"),
    el("p", "", ta + " of " + th + " classes attended"),
    el("p", "", "Target: " + req + "%"),
    el("p", "", ok + " of " + rows.length + " subjects on track"));
  if (short.length) txt.append(el("p", "", "Needs attention: " + short.map(x => x.name).join(", ")));
  sum.append(txt);

  const list = el("div", "panel");
  list.append(el("h3", "", "Attendance by subject"));
  rows.forEach(x => {
    const b = el("div", "brow " + x.r.cls);
    const bt = el("div", "bt");
    bt.append(el("span", "", x.name), el("b", "", x.r.pct.toFixed(1) + "%"));
    const detail = x.r.pct >= req
      ? (x.r.bunks > 0 ? "Can skip " + x.r.bunks + " more." : "No spare bunks. Attend the next class.")
      : (x.r.possible ? "Attend the next " + x.r.need + " in a row." : "Can’t be recovered.");
    b.append(bt, bar(x.r, req), el("p", "meta", x.att + " of " + x.held + " classes. " + detail));
    list.append(b);
  });
  rep.append(sum, list);
}

/* ---- Router ---- */
function route() {
  let page = location.hash.slice(1);
  if (!PAGES.includes(page)) page = S.profile.name ? "calculator" : "profile";
  PAGES.forEach(p => { $("page-" + p).hidden = p !== page; });
  document.querySelectorAll(".nav a").forEach(a => {
    if (a.dataset.p === page) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
  });
  if (page === "calculator") renderResults();
  if (page === "graph") renderGraph();
  window.scrollTo(0, 0);
}

/* ---- Start ---- */
load();
let storedTheme = null;
try { storedTheme = localStorage.getItem("bunksmart-theme"); } catch (e) {}
applyTheme(storedTheme || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"));
$("theme-toggle").addEventListener("click", () => {
  const theme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  applyTheme(theme);
  try { localStorage.setItem("bunksmart-theme", theme); } catch (e) {}
});
initProfile();
updateChip();
$("req").value = S.req;
$("req").addEventListener("input", () => { S.req = $("req").value; save(); renderResults(); });
$("add").addEventListener("click", () => { S.subjects.push(blank()); save(); renderRows(true); renderResults(); });
$("print").addEventListener("click", () => window.print());
renderRows();
window.addEventListener("hashchange", route);
route();

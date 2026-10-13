// Runs the page's main script against a minimal DOM stub and prints selfTest() results.
const fs = require("fs"), vm = require("vm");
const html = fs.readFileSync(__dirname + "/../index.html", "utf8");
const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)];
const dataJSON = scripts.find((m) => m[0].includes('id="demo-data"'))[1];
const main = scripts[scripts.length - 1][1];

function el(id) {
  const e = {
    id, textContent: "", hidden: false, value: "", children: [], attrs: {}, handlers: {}, dataset: {}, style: {}, min: "",
    _h: "", get innerHTML() { return this._h; }, set innerHTML(v) { this._h = v; this.children = []; },
    appendChild(c) { this.children.push(c); return c; },
    addEventListener(t, f) { (this.handlers[t] = this.handlers[t] || []).push(f); },
    setAttribute(k, v) { this.attrs[k] = String(v); }, getAttribute(k) { return this.attrs[k]; }, removeAttribute() {},
    focus() {}, reset() {}, scrollIntoView() {}, remove() {}, click() {}, contains() { return false; }, closest() { return null; },
    classList: { toggle() {}, add() {}, remove() {} },
  };
  e.elements = new Proxy({}, { get: (o, k) => o[k] || (o[k] = Object.assign(el(k), { nextElementSibling: el("err") })) });
  return e;
}
const els = {};
const document = {
  title: "", body: el("body"),
  getElementById: (id) => {
    if (id === "demo-data") return { textContent: dataJSON };
    if (!html.includes(`id="${id}"`)) return null;
    return els[id] || (els[id] = el(id));
  },
  createElement: (t) => el(t), addEventListener() {},
};
const ctx = { document, window: { addEventListener() {} }, location: { hash: "", search: "" }, URLSearchParams, console, Blob: class {}, URL: { createObjectURL: () => "blob:x", revokeObjectURL() {} }, setTimeout };
vm.createContext(ctx);
vm.runInContext(main, ctx);
const res = ctx.window.selfTest();
res.forEach((r) => console.log(r.pass ? "PASS" : "FAIL", r.test));
console.log("Login label:", els["p-login"].textContent, "| KPIs:", ["k-hoy", "k-sem", "k-rec", "k-tra"].map((k) => els[k].textContent).join(" "));
console.log(res.every((r) => r.pass) ? "ALL PASS" : "SOME FAILED");

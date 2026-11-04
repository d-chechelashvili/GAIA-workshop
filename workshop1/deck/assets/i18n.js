/* Translated decks: ?lang=ka shows the same slides in Georgian, from window.I18N.ka in assets/lang-ka.js.
   The English HTML and widgets stay the single source; the dictionary maps their text to the translation.

   - A block is an element with its own text. Its key is its innerHTML (textContent when it has no child elements),
     whitespace collapsed, every digit run outside a tag written {n}. The translation keeps the same tags and the same
     number of {n}, filled in order, so "12 workers busy" and "3 workers busy" share one entry.
   - Widgets draw after load, so a MutationObserver translates whatever appears on the stage.
   - code, pre, kbd, .term, notes and [translate="no"] stay English: they show what the tools really print.
   - A block with no entry stays English and lands in I18N.missing; a malformed entry lands in I18N.errors.
     ?selftest reports both, so an edit to the English text shows up as a missing translation. */
(function () {
  'use strict';
  const lang = new URLSearchParams(location.search).get('lang');
  if (!lang || lang === 'en') return;
  const dict = (window.I18N || {})[lang];
  if (!dict) throw new Error(`no translations for lang=${lang}: load assets/lang-${lang}.js`);
  document.documentElement.lang = lang;

  const SKIP = 'script, style, code, pre, kbd, .term, aside.notes, [translate="no"]';
  const ATTRS = ['alt', 'title', 'aria-label', 'placeholder'];
  const LETTER = /\p{L}/u;
  const norm = (s) => s.replace(/\s+/g, ' ').trim();
  const tags = (s) => (s.match(/<[^>]*>/g) || []).sort().join('');
  function keyOf(s) {
    const nums = [];
    const key = norm(s).replace(/(<[^>]*>)|\d+/g, (m, tag) => tag || (nums.push(m), '{n}'));
    return { key, nums };
  }
  // A Georgian case ending on a Latin word or a number (PR-ში, {n}-დან) must not wrap at its hyphen.
  const fill = (t, nums) => { let i = 0; return t.replace(/\{n\}/g, () => nums[i++]).replace(/(?<=[\w.)%’”])-(?=\p{Script=Georgian})/gu, '\u2011'); };

  const missing = new Map(); // key → slide number where it was first seen
  const errors = [];
  const ours = new Set(); // keys of translated text, so the observer leaves it alone
  for (const [k, v] of Object.entries(dict)) {
    const kk = keyOf(k).key, vk = keyOf(v).key;
    if (kk !== k) errors.push(`key is not normalized: ${k}`);
    else if ((k.match(/\{n\}/g) || []).length !== (v.match(/\{n\}/g) || []).length) errors.push(`{n} count differs: ${k}`);
    else if (tags(k) !== tags(v)) errors.push(`tags differ: ${k}`);
    ours.add(vk);
  }
  window.I18N.missing = missing;
  window.I18N.errors = errors;

  const slideNo = (el) => { const s = el.closest('.slide'); return s ? [...s.parentNode.children].filter((c) => c.matches('.slide')).indexOf(s) + 1 : 0; };
  function lookup(text, el) {
    const { key, nums } = keyOf(text);
    if (ours.has(key)) return null;
    const t = dict[key];
    if (t == null) { if (!missing.has(key)) missing.set(key, slideNo(el)); return null; }
    const out = fill(t, nums);
    ours.add(keyOf(out).key);
    return out;
  }
  function translate(el) {
    const plain = !el.children.length;
    const out = lookup(plain ? el.textContent : el.innerHTML, el);
    if (out == null) return;
    if (plain) el.textContent = out; else el.innerHTML = out;
    ours.add(keyOf(plain ? el.textContent : el.innerHTML).key); // as the browser serialized it
  }
  function walk(el) {
    if (el.nodeType !== 1 || el.matches(SKIP)) return;
    for (const a of ATTRS) {
      const v = el.getAttribute(a);
      if (v && LETTER.test(v)) { const out = lookup(v, el); if (out != null) el.setAttribute(a, out); }
    }
    const own = [...el.childNodes].some((n) => n.nodeType === 3 && LETTER.test(n.data));
    if (own) translate(el); else for (const c of [...el.children]) walk(c);
  }

  const t = lookup(document.title, document.body);
  if (t != null) document.title = t;
  walk(document.querySelector('.stage'));
  new MutationObserver((list) => {
    for (const m of list) {
      const el = m.type === 'characterData' ? m.target.parentElement : m.target;
      if (el && el.closest('.stage') && !el.closest(SKIP)) walk(el);
    }
  }).observe(document.body, { childList: true, characterData: true, subtree: true });
})();

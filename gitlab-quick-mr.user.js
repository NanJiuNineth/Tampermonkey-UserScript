// ==UserScript==
// @name         GitLab Quick MR
// @namespace    https://gitlab.com/
// @version      3.0.0
// @description  Alt+M 唤起面板，支持单个/一对多/多对一/自定义批量创建 MR，分支实时补全
// @author       NanJiuNineth
// @match        https://gitlab.com/*
// @match        https://*/*
// @grant        GM_setValue
// @grant        GM_getValue
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  const STORAGE_KEY = 'gitlab_quick_mr_v3';
  const COMMON_BRANCHES = ['main', 'master', 'develop', 'release', 'staging', 'production'];

  const STYLES = `
    :root {
      --gqmr-bg: #fff;
      --gqmr-fg: #1f2328;
      --gqmr-fg-muted: #636c76;
      --gqmr-border: #d0d7de;
      --gqmr-border-light: #eaecef;
      --gqmr-surface: #f6f8fa;
      --gqmr-surface-hover: #f0f4ff;
      --gqmr-accent: #1967d2;
      --gqmr-accent-hover: #1558b0;
      --gqmr-tag-bg: #e8f0fe;
      --gqmr-tag-fg: #1558b0;
      --gqmr-shadow: 0 12px 40px rgba(0,0,0,.18);
      --gqmr-shadow-dropdown: 0 4px 16px rgba(0,0,0,.1);
      --gqmr-input-focus-shadow: 0 0 0 2px rgba(25,103,210,.15);
    }
    @media (prefers-color-scheme: dark) {
      :root {
        --gqmr-bg: #1a1a2e;
        --gqmr-fg: #e8e8f0;
        --gqmr-fg-muted: #8888aa;
        --gqmr-border: #383860;
        --gqmr-border-light: #2c2c50;
        --gqmr-surface: #252540;
        --gqmr-surface-hover: #383860;
        --gqmr-accent: #7090e8;
        --gqmr-accent-hover: #8aa0f0;
        --gqmr-tag-bg: #283060;
        --gqmr-tag-fg: #a0b8f0;
        --gqmr-shadow: 0 12px 40px rgba(0,0,0,.5);
        --gqmr-shadow-dropdown: 0 4px 16px rgba(0,0,0,.35);
        --gqmr-input-focus-shadow: 0 0 0 2px rgba(112,144,232,.2);
      }
    }

    #gqmr-overlay {
      position: fixed; inset: 0; z-index: 2147483647;
      background: rgba(0,0,0,.48);
      display: flex; align-items: center; justify-content: center;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      animation: gqmr-fade .15s ease;
    }
    @keyframes gqmr-fade { from { opacity: 0 } }

    #gqmr-panel {
      background: var(--gqmr-bg); color: var(--gqmr-fg);
      border-radius: 14px; padding: 24px 28px 20px;
      width: 620px; max-width: calc(100vw - 32px); max-height: 90vh;
      overflow-y: auto; box-shadow: var(--gqmr-shadow);
      animation: gqmr-rise .18s ease;
    }
    @keyframes gqmr-rise { from { transform: translateY(12px); opacity: 0 } }

    #gqmr-panel h2 {
      margin: 0 0 16px; font-size: 16px; font-weight: 600;
      display: flex; align-items: center; gap: 8px;
    }
    .gqmr-badge {
      font-size: 11px; font-weight: 500; padding: 2px 8px;
      background: var(--gqmr-tag-bg); color: var(--gqmr-tag-fg);
      border-radius: 20px;
    }

    .gqmr-tabs {
      display: flex; margin-bottom: 16px;
      border-bottom: 1px solid var(--gqmr-border);
    }
    .gqmr-tab {
      padding: 7px 14px; font-size: 13px; font-weight: 500;
      cursor: pointer; background: transparent; border: none;
      color: var(--gqmr-fg-muted);
      border-bottom: 2px solid transparent; margin-bottom: -1px;
      transition: color .15s, border-color .15s;
    }
    .gqmr-tab:hover { color: var(--gqmr-accent); }
    .gqmr-tab.active { color: var(--gqmr-accent); border-bottom-color: var(--gqmr-accent); }

    .gqmr-mode-hint {
      font-size: 12px; color: var(--gqmr-fg-muted); margin-bottom: 14px;
      padding: 6px 10px; background: var(--gqmr-surface); border-radius: 6px;
    }

    .gqmr-label {
      display: block; font-size: 12px; font-weight: 500;
      color: var(--gqmr-fg-muted); margin-bottom: 4px;
    }
    .gqmr-row { margin-bottom: 14px; }

    .gqmr-single-cols {
      display: grid; grid-template-columns: 1fr 28px 1fr;
      align-items: end; gap: 8px; margin-bottom: 14px;
    }
    .gqmr-arrow { font-size: 16px; color: var(--gqmr-fg-muted); text-align: center; padding-bottom: 9px; }

    .gqmr-pairs-list { display: flex; flex-direction: column; gap: 8px; margin-bottom: 12px; }
    .gqmr-pair-row {
      display: grid; grid-template-columns: 1fr 24px 1fr 28px;
      align-items: center; gap: 6px;
      background: var(--gqmr-surface); border: 1px solid var(--gqmr-border);
      border-radius: 8px; padding: 8px 10px;
    }
    .gqmr-pair-arrow { font-size: 14px; color: var(--gqmr-fg-muted); text-align: center; }

    .gqmr-remove-btn {
      background: none; border: none; cursor: pointer;
      color: var(--gqmr-border); font-size: 18px; line-height: 1;
      padding: 0 2px; transition: color .12s;
    }
    .gqmr-remove-btn:hover { color: #d93025; }

    .gqmr-add-btn {
      width: 100%; padding: 7px; font-size: 13px; cursor: pointer;
      background: transparent; border: 1px dashed var(--gqmr-border);
      border-radius: 6px; color: var(--gqmr-fg-muted);
      transition: background .12s, border-color .12s;
    }
    .gqmr-add-btn:hover { background: var(--gqmr-surface); border-color: var(--gqmr-fg-muted); }

    /* Branch autocomplete input */
    .gqmr-branch-wrap { position: relative; width: 100%; }
    .gqmr-branch-wrap input {
      width: 100%; box-sizing: border-box; padding: 8px 10px;
      font-size: 14px; border: 1px solid var(--gqmr-border); border-radius: 6px;
      background: var(--gqmr-bg); color: var(--gqmr-fg);
      outline: none; transition: border-color .15s, box-shadow .15s;
    }
    .gqmr-branch-wrap input:focus {
      border-color: var(--gqmr-accent);
      box-shadow: var(--gqmr-input-focus-shadow);
    }

    .gqmr-dropdown {
      position: absolute; top: calc(100% + 3px); left: 0; right: 0;
      background: var(--gqmr-bg); border: 1px solid var(--gqmr-border);
      border-radius: 8px; box-shadow: var(--gqmr-shadow-dropdown);
      max-height: 200px; overflow-y: auto; z-index: 2147483647; display: none;
    }
    .gqmr-dropdown.open { display: block; }
    .gqmr-ac-item {
      padding: 7px 12px; font-size: 13px; cursor: pointer;
      font-family: 'SF Mono', 'Fira Code', monospace;
      display: flex; align-items: center; gap: 6px;
      transition: background .1s; color: var(--gqmr-fg);
    }
    .gqmr-ac-item:hover, .gqmr-ac-item.active {
      background: var(--gqmr-surface-hover); color: var(--gqmr-accent);
    }
    .gqmr-ac-icon { font-size: 11px; color: var(--gqmr-fg-muted); }
    .gqmr-ac-item em { font-style: normal; font-weight: 600; color: var(--gqmr-accent); }
    .gqmr-ac-badge {
      margin-left: auto; font-size: 10px; padding: 1px 6px;
      border-radius: 10px; background: var(--gqmr-surface);
      color: var(--gqmr-fg-muted); font-family: sans-serif;
    }
    .gqmr-ac-empty { padding: 8px 12px; font-size: 13px; color: var(--gqmr-fg-muted); }

    /* Tag input */
    .gqmr-tag-wrap {
      border: 1px solid var(--gqmr-border); border-radius: 6px;
      padding: 6px 8px; display: flex; flex-wrap: wrap; gap: 5px;
      cursor: text; min-height: 40px; position: relative;
      transition: border-color .15s, box-shadow .15s;
    }
    .gqmr-tag-wrap:focus-within {
      border-color: var(--gqmr-accent);
      box-shadow: var(--gqmr-input-focus-shadow);
    }
    .gqmr-tag {
      display: inline-flex; align-items: center; gap: 4px;
      padding: 2px 8px 2px 10px; background: var(--gqmr-tag-bg);
      color: var(--gqmr-tag-fg); border-radius: 20px;
      font-size: 13px; font-family: 'SF Mono', 'Fira Code', monospace;
    }
    .gqmr-tag-x {
      background: none; border: none; cursor: pointer;
      color: var(--gqmr-tag-fg); font-size: 14px; line-height: 1;
      padding: 0; opacity: .6;
    }
    .gqmr-tag-x:hover { opacity: 1; color: #d93025; }
    .gqmr-tag-input {
      border: none; outline: none; font-size: 14px;
      min-width: 100px; flex: 1; background: transparent; color: var(--gqmr-fg);
      padding: 2px 0;
    }

    /* Title input */
    #gqmr-title {
      width: 100%; box-sizing: border-box; padding: 8px 10px;
      font-size: 14px; border: 1px solid var(--gqmr-border); border-radius: 6px;
      background: var(--gqmr-bg); color: var(--gqmr-fg);
      outline: none; transition: border-color .15s, box-shadow .15s;
    }
    #gqmr-title:focus {
      border-color: var(--gqmr-accent);
      box-shadow: var(--gqmr-input-focus-shadow);
    }

    .gqmr-checks { display: flex; gap: 12px 22px; margin-bottom: 18px; flex-wrap: wrap; }
    .gqmr-checkrow {
      display: flex; align-items: center; gap: 8px;
      font-size: 13px; cursor: pointer; user-select: none; color: var(--gqmr-fg);
    }
    .gqmr-checkrow input[type=checkbox] {
      width: 15px; height: 15px; cursor: pointer;
      accent-color: var(--gqmr-accent); flex-shrink: 0;
    }

    .gqmr-divider { border: none; border-top: 1px solid var(--gqmr-border); margin: 16px 0; }

    .gqmr-actions { display: flex; gap: 10px; justify-content: flex-end; align-items: center; }
    #gqmr-hint { font-size: 12px; color: var(--gqmr-fg-muted); margin-right: auto; }

    #gqmr-cancel {
      padding: 8px 16px; font-size: 14px; border-radius: 6px; cursor: pointer;
      background: transparent; border: 1px solid var(--gqmr-border);
      color: var(--gqmr-fg); transition: background .12s;
    }
    #gqmr-cancel:hover { background: var(--gqmr-surface); }

    #gqmr-submit {
      padding: 8px 20px; font-size: 14px; font-weight: 500;
      border-radius: 6px; cursor: pointer;
      background: var(--gqmr-accent); border: none; color: #fff;
      transition: background .12s, transform .1s;
    }
    #gqmr-submit:hover { background: var(--gqmr-accent-hover); }
    #gqmr-submit:active { transform: scale(.98); }

    /* FAB */
    #gqmr-fab {
      position: fixed; bottom: 28px; right: 28px; z-index: 9998;
      width: 48px; height: 48px; border-radius: 50%;
      background: var(--gqmr-accent); color: #fff; border: none;
      font-size: 12px; font-weight: 700; cursor: pointer;
      box-shadow: 0 4px 14px rgba(25,103,210,.45);
      transition: transform .15s, box-shadow .15s;
      font-family: -apple-system, sans-serif;
      display: flex; align-items: center; justify-content: center;
    }
    #gqmr-fab:hover {
      transform: scale(1.1);
      box-shadow: 0 6px 20px rgba(25,103,210,.55);
    }
  `;

  // ── Utilities ──────────────────────────────────────────────

  function esc(s) {
    return String(s)
      .replace(/&/g, '&amp;').replace(/"/g, '&quot;')
      .replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function highlight(text, query) {
    if (!query) return esc(text);
    const idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx < 0) return esc(text);
    return esc(text.slice(0, idx))
      + '<em>' + esc(text.slice(idx, idx + query.length)) + '</em>'
      + esc(text.slice(idx + query.length));
  }

  function autoTitle(branch, draft) {
    const title = branch
      .replace(/^(feature|fix|hotfix|chore|refactor|docs|test)\//, '')
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());
    return draft ? 'Draft: ' + title : title;
  }

  // ── Config persistence ─────────────────────────────────────

  function loadConfig() {
    try { return JSON.parse(GM_getValue(STORAGE_KEY, '{}')); } catch { return {}; }
  }
  function saveConfig(cfg) { GM_setValue(STORAGE_KEY, JSON.stringify(cfg)); }

  // ── Project / branch detection ─────────────────────────────

  function getProjectInfo() {
    const parts = location.pathname.split('/').filter(Boolean);
    if (parts.length < 2) return null;
    const projectPath = '/' + parts.slice(0, 2).join('/');
    return { projectPath, projectUrl: location.origin + projectPath };
  }

  function getCurrentBranch() {
    const selectors = [
      '[data-testid="ref-selector"] button .gl-button-text',
      '.ref-selector button .gl-button-text',
      '[data-testid="branches-dropdown-toggle"]',
    ];
    for (const sel of selectors) {
      const t = document.querySelector(sel)?.textContent?.trim();
      if (t) return t;
    }
    const m = location.pathname.match(/\/-\/(?:tree|blob)\/([^/?#]+)/);
    if (m) return decodeURIComponent(m[1]);

    const meta = document.querySelector('meta[name="current_ref"]')?.getAttribute('content');
    if (meta) return meta;

    try { if (window.gon?.default_branch) return window.gon.default_branch; } catch {}
    return '';
  }

  function collectBranches() {
    const set = new Set(COMMON_BRANCHES);

    document.querySelectorAll(
      '[data-testid="ref-selector"] li, .ref-selector li, .dropdown-content li[data-ref]'
    ).forEach(li => { const t = (li.dataset.ref || li.textContent).trim(); if (t) set.add(t); });

    document.querySelectorAll('[data-ref],[data-branch-name]').forEach(el => {
      const v = el.dataset.ref || el.dataset.branchName;
      if (v && !v.includes('/commit/')) set.add(v.trim());
    });

    document.querySelectorAll(
      '.branch-info .ref-name, [data-testid="branch-name"], .item-title .ref-name'
    ).forEach(el => { const t = el.textContent.trim(); if (t) set.add(t); });

    try {
      if (window.gon?.default_branch) set.add(window.gon.default_branch);
      if (window.gon?.ref) set.add(window.gon.ref);
    } catch {}

    const cur = getCurrentBranch();
    if (cur) set.add(cur);

    const common = COMMON_BRANCHES.filter(b => set.has(b));
    const rest = [...set].filter(b => !COMMON_BRANCHES.includes(b)).sort();
    return [...common, ...rest];
  }

  // ── MR URL builder ─────────────────────────────────────────

  function buildMrUrl({ projectUrl, sourceBranch, targetBranch, title, squash, deleteSource }) {
    const p = new URLSearchParams({
      'merge_request[source_branch]': sourceBranch,
      'merge_request[target_branch]': targetBranch,
    });
    if (title)        p.set('merge_request[title]', title);
    if (squash)       p.set('merge_request[squash]', '1');
    if (deleteSource) p.set('merge_request[force_remove_source_branch]', '1');
    return `${projectUrl}/-/merge_requests/new?${p}`;
  }

  // ── Summary page ───────────────────────────────────────────

  function openSummaryPage(pairs, opts) {
    const rows = pairs.map(({ src, tgt, url }) => `
      <tr>
        <td><span class="tag src">${esc(src)}</span></td>
        <td class="arrow">→</td>
        <td><span class="tag tgt">${esc(tgt)}</span></td>
        <td><a href="${esc(url)}" target="_blank" rel="noopener" class="btn-open">打开 ↗</a></td>
      </tr>`).join('');

    const pills = [
      opts.squash       ? '<span class="pill blue">Squash</span>' : '',
      opts.deleteSource ? '<span class="pill green">删除源分支</span>' : '',
      opts.draft        ? '<span class="pill orange">Draft</span>' : '',
    ].filter(Boolean).join('');

    const html = `<!DOCTYPE html>
<html lang="zh"><head><meta charset="utf-8">
<title>MR 汇总 · ${pairs.length} 个</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f6f8fa;color:#1f2328;padding:40px 24px}
.wrap{max-width:820px;margin:0 auto}
h1{font-size:22px;font-weight:600;margin-bottom:6px}
.sub{font-size:14px;color:#636c76;margin-bottom:20px}
.meta{display:flex;gap:10px;align-items:center;margin-bottom:16px;flex-wrap:wrap}
.pill{font-size:12px;padding:3px 10px;border-radius:20px;font-weight:500}
.blue{background:#dbeafe;color:#1d4ed8}.green{background:#dcfce7;color:#15803d}.orange{background:#fef3c7;color:#b45309}
.btn-all{margin-left:auto;padding:8px 18px;font-size:13px;font-weight:500;background:#1967d2;color:#fff;border:none;border-radius:8px;cursor:pointer}
.btn-all:hover{background:#1558b0}
table{width:100%;border-collapse:collapse;background:#fff;border-radius:10px;overflow:hidden;border:1px solid #d0d7de}
thead tr{background:#f6f8fa}
th{padding:10px 16px;font-size:12px;font-weight:600;color:#636c76;text-align:left;border-bottom:1px solid #d0d7de}
td{padding:12px 16px;border-bottom:1px solid #eaecef;vertical-align:middle}
tr:last-child td{border-bottom:none}
tr:hover td{background:#f6f8fa}
.tag{display:inline-block;padding:2px 10px;border-radius:20px;font-size:13px;font-family:'SF Mono','Fira Code',monospace;font-weight:500}
.src{background:#dbeafe;color:#1e3a5f}.tgt{background:#dcfce7;color:#14532d}
.arrow{color:#9aa0a6;font-size:16px;width:24px;text-align:center;padding:0 4px}
.btn-open{display:inline-block;padding:5px 12px;font-size:13px;background:transparent;border:1px solid #d0d7de;border-radius:6px;color:#1967d2;text-decoration:none}
.btn-open:hover{background:#f0f4ff;border-color:#1967d2}
footer{margin-top:20px;font-size:12px;color:#9aa0a6;text-align:center}
</style></head><body>
<div class="wrap">
  <h1>MR 批量创建汇总</h1>
  <p class="sub">共 <strong>${pairs.length}</strong> 个 MR，点击各行链接逐一创建，或一键全部打开</p>
  <div class="meta">${pills}<button class="btn-all" onclick="openAll()">全部在新标签页打开 ↗</button></div>
  <table>
    <thead><tr><th>源分支</th><th></th><th>目标分支</th><th>操作</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <footer>由 GitLab Quick MR 生成 · ${new Date().toLocaleString('zh-CN')}</footer>
</div>
<script>
const urls=${JSON.stringify(pairs.map(p => p.url))};
function openAll(){urls.forEach((u,i)=>setTimeout(()=>window.open(u,'_blank'),i*200));}
<\/script></body></html>`;

    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const blobUrl = URL.createObjectURL(blob);
    window.open(blobUrl, '_blank');
    setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
  }

  // ── Branch autocomplete input ──────────────────────────────

  function makeBranchInput(allBranches, { initialValue = '', placeholder = '分支名…' } = {}) {
    const wrap = document.createElement('div');
    wrap.className = 'gqmr-branch-wrap';

    const input = Object.assign(document.createElement('input'), {
      type: 'text', value: initialValue, placeholder,
      autocomplete: 'off', spellcheck: false,
    });

    const dropdown = document.createElement('div');
    dropdown.className = 'gqmr-dropdown';
    wrap.append(input, dropdown);

    let activeIdx = -1;
    let items = [];

    function render(query) {
      const q = query.trim().toLowerCase();
      items = allBranches.filter(b => !q || b.toLowerCase().includes(q)).slice(0, 30);
      activeIdx = -1;

      if (!items.length) {
        dropdown.innerHTML = `<div class="gqmr-ac-empty">无匹配分支</div>`;
      } else {
        dropdown.innerHTML = items.map((b, i) => `
          <div class="gqmr-ac-item" data-i="${i}">
            <span class="gqmr-ac-icon">⎇</span>
            <span>${highlight(b, query.trim())}</span>
            <span class="gqmr-ac-badge">${COMMON_BRANCHES.includes(b) ? '常用' : 'DOM'}</span>
          </div>`).join('');
        dropdown.querySelectorAll('.gqmr-ac-item').forEach(el =>
          el.addEventListener('mousedown', e => { e.preventDefault(); select(items[+el.dataset.i]); })
        );
      }
      dropdown.classList.add('open');
    }

    function select(branch) {
      input.value = branch;
      dropdown.classList.remove('open');
      activeIdx = -1;
      input.dispatchEvent(new Event('change'));
    }

    function setActive(idx) {
      const els = dropdown.querySelectorAll('.gqmr-ac-item');
      els.forEach(el => el.classList.remove('active'));
      activeIdx = idx >= 0 && idx < els.length ? idx : -1;
      if (activeIdx >= 0) {
        els[activeIdx].classList.add('active');
        els[activeIdx].scrollIntoView({ block: 'nearest' });
      }
    }

    input.addEventListener('input', () => render(input.value));
    input.addEventListener('focus', () => render(input.value));
    input.addEventListener('blur', () => setTimeout(() => dropdown.classList.remove('open'), 150));
    input.addEventListener('keydown', e => {
      if (!dropdown.classList.contains('open')) return;
      if (e.key === 'ArrowDown') { e.preventDefault(); setActive(Math.min(activeIdx + 1, items.length - 1)); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(Math.max(activeIdx - 1, 0)); }
      else if (e.key === 'Enter' && activeIdx >= 0) { e.preventDefault(); select(items[activeIdx]); }
      else if (e.key === 'Escape') dropdown.classList.remove('open');
    });

    return { element: wrap, getValue: () => input.value.trim(), setValue: v => { input.value = v; }, getInput: () => input };
  }

  // ── Tag + autocomplete input ───────────────────────────────

  function makeTagInput(container, placeholder, allBranches) {
    const tags = [];
    const wrap = container.querySelector('.gqmr-tag-wrap');
    const realInput = container.querySelector('.gqmr-tag-input');
    realInput.placeholder = placeholder;

    const dropdown = document.createElement('div');
    dropdown.className = 'gqmr-dropdown';
    wrap.appendChild(dropdown);

    let activeIdx = -1;
    let items = [];

    function render(query) {
      const q = query.trim().toLowerCase();
      items = allBranches.filter(b => !tags.includes(b) && (!q || b.toLowerCase().includes(q))).slice(0, 20);
      activeIdx = -1;
      if (!items.length) { dropdown.classList.remove('open'); return; }
      dropdown.innerHTML = items.map((b, i) =>
        `<div class="gqmr-ac-item" data-i="${i}">
          <span class="gqmr-ac-icon">⎇</span>
          <span>${highlight(b, query.trim())}</span>
        </div>`
      ).join('');
      dropdown.querySelectorAll('.gqmr-ac-item').forEach(el =>
        el.addEventListener('mousedown', e => { e.preventDefault(); addTag(items[+el.dataset.i]); })
      );
      dropdown.classList.add('open');
    }

    function closeAc() { dropdown.classList.remove('open'); activeIdx = -1; }

    function addTag(val) {
      val = val.trim();
      if (!val || tags.includes(val)) { realInput.value = ''; closeAc(); return; }
      tags.push(val);
      const pill = document.createElement('span');
      pill.className = 'gqmr-tag';
      pill.innerHTML = `${esc(val)}<button class="gqmr-tag-x" aria-label="移除">×</button>`;
      pill.querySelector('.gqmr-tag-x').onclick = () => {
        tags.splice(tags.indexOf(val), 1);
        pill.remove();
      };
      wrap.insertBefore(pill, realInput);
      realInput.value = '';
      closeAc();
    }

    realInput.addEventListener('input', () => render(realInput.value));
    realInput.addEventListener('focus', () => render(realInput.value));
    realInput.addEventListener('blur', () => setTimeout(closeAc, 150));
    realInput.addEventListener('keydown', e => {
      const els = dropdown.querySelectorAll('.gqmr-ac-item');
      const open = dropdown.classList.contains('open');
      if (open && e.key === 'ArrowDown') {
        e.preventDefault();
        activeIdx = Math.min(activeIdx + 1, els.length - 1);
        els.forEach((el, i) => el.classList.toggle('active', i === activeIdx));
      } else if (open && e.key === 'ArrowUp') {
        e.preventDefault();
        activeIdx = Math.max(activeIdx - 1, 0);
        els.forEach((el, i) => el.classList.toggle('active', i === activeIdx));
      } else if (open && e.key === 'Enter' && activeIdx >= 0) {
        e.preventDefault(); addTag(items[activeIdx]);
      } else if (['Enter', ',', ' '].includes(e.key) && activeIdx < 0) {
        e.preventDefault(); addTag(realInput.value);
      } else if (e.key === 'Backspace' && !realInput.value && tags.length) {
        const last = tags[tags.length - 1];
        wrap.querySelector('.gqmr-tag:last-of-type')?.remove();
        tags.splice(tags.indexOf(last), 1);
      } else if (e.key === 'Escape') closeAc();
    });
    wrap.addEventListener('click', () => realInput.focus());

    return { getTags: () => [...tags], addTag };
  }

  // ── Panel ──────────────────────────────────────────────────

  function showPanel() {
    if (document.getElementById('gqmr-overlay')) return;
    const project = getProjectInfo();
    if (!project) { alert('[GitLab Quick MR] 无法识别项目路径，请在 GitLab 项目页面使用。'); return; }

    if (!document.getElementById('gqmr-styles')) {
      const s = Object.assign(document.createElement('style'), { id: 'gqmr-styles', textContent: STYLES });
      document.head.appendChild(s);
    }

    const cfg = loadConfig();
    const curBranch = getCurrentBranch();
    const allBranches = collectBranches();
    const lastTarget = cfg.targetBranch || 'main';

    const modeHints = {
      single:   '单个 MR：一个源分支 → 一个目标分支',
      one2many: '一对多：同一源分支同时合入多个目标分支',
      many2one: '多对一：多个源分支统一合入同一目标分支',
      custom:   '自定义配对：每行独立设置源分支和目标分支',
    };

    const overlay = document.createElement('div');
    overlay.id = 'gqmr-overlay';
    overlay.innerHTML = `
      <div id="gqmr-panel" role="dialog" aria-modal="true" aria-label="快速创建 MR">
        <h2>快速创建 MR <span class="gqmr-badge">Alt+M</span></h2>
        <div class="gqmr-tabs">
          <button class="gqmr-tab active" data-mode="single">单个</button>
          <button class="gqmr-tab" data-mode="one2many">一对多</button>
          <button class="gqmr-tab" data-mode="many2one">多对一</button>
          <button class="gqmr-tab" data-mode="custom">自定义配对</button>
        </div>
        <div class="gqmr-mode-hint" id="gqmr-hint-mode">${modeHints.single}</div>

        <div id="gqmr-mode-single">
          <div class="gqmr-single-cols">
            <div><label class="gqmr-label">源分支</label><div id="slot-single-src"></div></div>
            <span class="gqmr-arrow">→</span>
            <div><label class="gqmr-label">目标分支</label><div id="slot-single-tgt"></div></div>
          </div>
        </div>

        <div id="gqmr-mode-one2many" style="display:none">
          <div class="gqmr-row"><label class="gqmr-label">源分支</label><div id="slot-o2m-src"></div></div>
          <div class="gqmr-row">
            <label class="gqmr-label">目标分支（回车 / 逗号确认，支持补全）</label>
            <div class="gqmr-tag-wrap"><input class="gqmr-tag-input" type="text" /></div>
          </div>
        </div>

        <div id="gqmr-mode-many2one" style="display:none">
          <div class="gqmr-row">
            <label class="gqmr-label">源分支（回车 / 逗号确认，支持补全）</label>
            <div class="gqmr-tag-wrap"><input class="gqmr-tag-input" type="text" /></div>
          </div>
          <div class="gqmr-row"><label class="gqmr-label">目标分支</label><div id="slot-m2o-tgt"></div></div>
        </div>

        <div id="gqmr-mode-custom" style="display:none">
          <div class="gqmr-pairs-list" id="gqmr-pairs"></div>
          <button class="gqmr-add-btn" id="gqmr-add-pair">＋ 添加一行</button>
        </div>

        <hr class="gqmr-divider">

        <div class="gqmr-row">
          <label class="gqmr-label">MR 标题（留空则从源分支名自动生成）</label>
          <input id="gqmr-title" type="text" value="${esc(cfg.title || '')}" placeholder="留空自动生成" />
        </div>

        <div class="gqmr-checks">
          <label class="gqmr-checkrow"><input type="checkbox" id="gqmr-squash" ${cfg.squash ? 'checked' : ''} />Squash commits</label>
          <label class="gqmr-checkrow"><input type="checkbox" id="gqmr-del-src" ${cfg.deleteSource !== false ? 'checked' : ''} />合并后删除源分支</label>
          <label class="gqmr-checkrow"><input type="checkbox" id="gqmr-draft" ${cfg.draft ? 'checked' : ''} />Draft MR</label>
        </div>

        <div class="gqmr-actions">
          <span id="gqmr-hint">读取到 ${allBranches.length} 个分支 · Esc 关闭</span>
          <button id="gqmr-cancel">取消</button>
          <button id="gqmr-submit">创建 MR →</button>
        </div>
      </div>`;
    document.documentElement.appendChild(overlay);

    // Mount branch inputs
    const singleSrc  = makeBranchInput(allBranches, { initialValue: curBranch, placeholder: '源分支…' });
    const singleTgt  = makeBranchInput(allBranches, { initialValue: lastTarget, placeholder: '目标分支…' });
    const o2mSrc     = makeBranchInput(allBranches, { initialValue: curBranch, placeholder: '源分支…' });
    const m2oTgt     = makeBranchInput(allBranches, { initialValue: lastTarget, placeholder: '目标分支…' });

    overlay.querySelector('#slot-single-src').appendChild(singleSrc.element);
    overlay.querySelector('#slot-single-tgt').appendChild(singleTgt.element);
    overlay.querySelector('#slot-o2m-src').appendChild(o2mSrc.element);
    overlay.querySelector('#slot-m2o-tgt').appendChild(m2oTgt.element);

    const tgtManyInput = makeTagInput(overlay.querySelector('#gqmr-mode-one2many'), 'main, release…', allBranches);
    const srcManyInput = makeTagInput(overlay.querySelector('#gqmr-mode-many2one'), 'feature/a, feature/b…', allBranches);
    tgtManyInput.addTag(lastTarget);

    // Custom pair rows
    const pairsList = overlay.querySelector('#gqmr-pairs');
    const pairRefs = [];

    function addPairRow(srcVal = '', tgtVal = '') {
      const row = document.createElement('div');
      row.className = 'gqmr-pair-row';
      const srcInput = makeBranchInput(allBranches, { initialValue: srcVal, placeholder: '源分支' });
      const tgtInput = makeBranchInput(allBranches, { initialValue: tgtVal, placeholder: '目标分支' });
      const ref = { srcInput, tgtInput, row };
      pairRefs.push(ref);

      const arrow = Object.assign(document.createElement('span'), { className: 'gqmr-pair-arrow', textContent: '→' });
      const removeBtn = Object.assign(document.createElement('button'), {
        className: 'gqmr-remove-btn', title: '删除此行', textContent: '×',
      });
      removeBtn.onclick = () => {
        row.remove();
        pairRefs.splice(pairRefs.indexOf(ref), 1);
        if (!pairsList.children.length) addPairRow('', lastTarget);
      };
      row.append(srcInput.element, arrow, tgtInput.element, removeBtn);
      pairsList.appendChild(row);
    }

    addPairRow(curBranch, lastTarget);
    overlay.querySelector('#gqmr-add-pair').addEventListener('click', () => addPairRow('', lastTarget));

    // Mode tabs
    let currentMode = 'single';
    const tabs = overlay.querySelectorAll('.gqmr-tab');
    const modeEls = Object.fromEntries(
      ['single','one2many','many2one','custom'].map(k => [k, overlay.querySelector(`#gqmr-mode-${k}`)])
    );
    tabs.forEach(tab => tab.addEventListener('click', () => {
      currentMode = tab.dataset.mode;
      tabs.forEach(t => t.classList.toggle('active', t === tab));
      Object.entries(modeEls).forEach(([k, el]) => el.style.display = k === currentMode ? '' : 'none');
      overlay.querySelector('#gqmr-hint-mode').textContent = modeHints[currentMode];
      overlay.querySelector('#gqmr-submit').textContent = currentMode === 'single' ? '创建 MR →' : '生成汇总 →';
    }));

    // Close
    function close() {
      overlay.style.transition = 'opacity .12s';
      overlay.style.opacity = '0';
      setTimeout(() => overlay.remove(), 130);
    }
    overlay.querySelector('#gqmr-cancel').addEventListener('click', close);
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
    const onEsc = e => { if (e.key === 'Escape') { close(); document.removeEventListener('keydown', onEsc); } };
    document.addEventListener('keydown', onEsc);

    // Build & submit
    overlay.querySelector('#gqmr-submit').addEventListener('click', () => {
      const title    = overlay.querySelector('#gqmr-title').value.trim();
      const squash   = overlay.querySelector('#gqmr-squash').checked;
      const delSrc   = overlay.querySelector('#gqmr-del-src').checked;
      const draft    = overlay.querySelector('#gqmr-draft').checked;
      const opts     = { squash, deleteSource: delSrc, draft };

      const makeTitle = src => {
        if (title) return draft && !title.startsWith('Draft:') ? 'Draft: ' + title : title;
        return autoTitle(src, draft);
      };

      const mkUrl = (src, tgt) => buildMrUrl({
        projectUrl: project.projectUrl, sourceBranch: src, targetBranch: tgt,
        title: makeTitle(src), squash, deleteSource: delSrc,
      });

      let pairs;
      if (currentMode === 'single') {
        const src = singleSrc.getValue(), tgt = singleTgt.getValue();
        if (!src || !tgt) return;
        pairs = [{ src, tgt, url: mkUrl(src, tgt) }];
      } else if (currentMode === 'one2many') {
        const src = o2mSrc.getValue(), tgts = tgtManyInput.getTags();
        if (!src || !tgts.length) return;
        pairs = tgts.map(tgt => ({ src, tgt, url: mkUrl(src, tgt) }));
      } else if (currentMode === 'many2one') {
        const srcs = srcManyInput.getTags(), tgt = m2oTgt.getValue();
        if (!srcs.length || !tgt) return;
        pairs = srcs.map(src => ({ src, tgt, url: mkUrl(src, tgt) }));
      } else {
        pairs = pairRefs
          .map(r => ({ src: r.srcInput.getValue(), tgt: r.tgtInput.getValue() }))
          .filter(p => p.src && p.tgt)
          .map(({ src, tgt }) => ({ src, tgt, url: mkUrl(src, tgt) }));
        if (!pairs.length) return;
      }

      saveConfig({ targetBranch: pairs[0].tgt, title, squash, deleteSource: delSrc, draft });
      if (pairs.length === 1) window.open(pairs[0].url, '_blank');
      else openSummaryPage(pairs, opts);
      close();
    });

    setTimeout(() => singleSrc.getInput().focus(), 50);
  }

  // ── FAB & keyboard shortcut ────────────────────────────────

  document.addEventListener('keydown', e => {
    if (e.altKey && e.key === 'm') { e.preventDefault(); showPanel(); }
  });

  function addFab() {
    if (document.getElementById('gqmr-fab')) return;
    const btn = Object.assign(document.createElement('button'), {
      id: 'gqmr-fab', title: '快速创建 MR (Alt+M)', textContent: 'MR', onclick: showPanel,
    });
    document.body.appendChild(btn);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', addFab);
  else addFab();

  const _pushState = history.pushState.bind(history);
  history.pushState = (...a) => { _pushState(...a); setTimeout(addFab, 300); };
  window.addEventListener('popstate', () => setTimeout(addFab, 300));
})();

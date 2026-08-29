from pathlib import Path
import shutil

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "_site"
OUT.mkdir(exist_ok=True)

# Copy deployable repository assets first.
for item in ROOT.iterdir():
    if item.name in {".git", "_site"}:
        continue
    target = OUT / item.name
    if item.is_dir():
        shutil.copytree(item, target, dirs_exist_ok=True)
    else:
        shutil.copy2(item, target)

parts = [ROOT / "chunks" / f"part-{i:02d}.txt" for i in range(6)]
html = "".join(p.read_text(encoding="utf-8") for p in parts)
html = html.replace("plantCollectionTracker_profiles_v7", "plantCollectionTracker_profiles_v8")
html = html.replace("<title>My Plant Collection Tracker</title>", "<title>Kaiser's Plant Collection</title>")
html = html.replace("<h1>🌿 My Plant Collection</h1>", "<h1>🌿 Kaiser's Plant Collection</h1>")

cloud_css = r'''
    .cloudbar{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:0 0 14px;padding:12px 14px;background:#eef6ef;border:1px solid var(--line);border-radius:14px;position:relative;z-index:5}
    .cloudbar input{max-width:240px}.cloudstatus{font-size:.85rem;color:var(--muted);font-weight:700}.cloud-forgot{background:transparent;border:0;color:var(--green);padding:7px 8px;font-size:.85rem}
    @media(max-width:800px){body{overflow-x:hidden}.wrap{width:100%;max-width:100%;padding:22px 14px 44px}.cloudbar{display:grid;grid-template-columns:1fr 1fr;gap:8px}.cloudbar input{max-width:none;min-width:0}.cloudbar .cloudstatus{grid-column:1/-1}.table-wrap{max-width:100%;overflow-x:auto;-webkit-overflow-scrolling:touch}.top-actions{width:100%}}
    @media(max-width:520px){.cloudbar{grid-template-columns:1fr}.cloudbar .cloudstatus{grid-column:1}.cloudbar button{width:100%}}
'''
html = html.replace("</style>", cloud_css + "\n  </style>", 1)

auth = r'''<div class="cloudbar" id="cloudBar">
      <input id="cloudEmail" type="email" autocomplete="email" placeholder="Email">
      <input id="cloudPassword" type="password" autocomplete="current-password" placeholder="Password">
      <button class="primary" id="cloudSignIn" type="button">Sign in</button>
      <button class="secondary" id="cloudSignUp" type="button">Create account</button>
      <button class="primary" id="cloudSetPassword" type="button" style="display:none">Set new password</button>
      <button class="cloud-forgot" id="cloudForgot" type="button">Forgot password?</button>
      <button class="secondary" id="cloudLogout" type="button" style="display:none">Sign out</button>
      <span class="cloudstatus" id="cloudStatus">Starting cloud sync…</span>
    </div>'''
html = html.replace('<section class="stats">', auth + '\n\n    <section class="stats">', 1)

cloud_scripts = '''\n<script src="plantdex-runtime-guard.js?v=static-1"></script>\n<script src="plantdex-cloud-v2.js?v=static-1"></script>\n<script src="plantdex-pedigree.js?v=static-1"></script>\n<script src="plantdex-reconcile.js?v=static-1"></script>\n'''
html = html.replace("</body>", cloud_scripts + "</body>", 1)

(OUT / "index.html").write_text(html, encoding="utf-8")
(OUT / "plantdex-static.html").write_text(html, encoding="utf-8")

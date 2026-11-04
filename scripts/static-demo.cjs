/**
 * Собирает статический снимок демо-сайта для GitHub Pages.
 * Обходит работающий сервер под несколькими демо-пользователями и сохраняет HTML.
 * Формы в снимке не отправляются (на Pages нет сервера) — показывается подсказка.
 *
 * Запуск: сервер на http://localhost:3000 с seed-данными, затем
 *   node scripts/static-demo.cjs <outDir> [/basePath]
 */
const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

const ORIGIN = process.env.DEMO_ORIGIN || "http://localhost:3000";
const OUT = path.resolve(process.argv[2] || "static-demo");
const BASE = (process.argv[3] || "/toddle-").replace(/\/$/, "");

const USERS = [
  { slug: "teacher", email: "math@demo.school", title: "Учитель математики", who: "Бекмуханов Ерлан", desc: "Уроки на сегодня, посещаемость, журнал 7A/7B/8A/DP1, оценивание по критериям", max: 260 },
  { slug: "coordinator", email: "myp.coord@demo.school", title: "Координатор MYP", who: "Мусина Айжан", desc: "Все курсы MYP, блокировка периодов, ручное изменение итогов", max: 420 },
  { slug: "admin", email: "admin@demo.school", title: "Администратор", who: "Сапарова Гульнара", desc: "Обзор школы, политика оценивания, люди, журнал изменений", max: 120 },
  { slug: "dp-teacher", email: "physics@demo.school", title: "Учитель физики DP", who: "Соколов Виктор", desc: "DP: процентная схема 25/75, баллы вместо критериев", max: 80 },
  { slug: "student", email: null, pick: "student", title: "Ученик 7A", who: "", desc: "Свои оценки (1–7 и 5-балльная), комментарии, посещаемость", max: 10 },
  { slug: "parent", email: null, pick: "parent", title: "Родитель (двое детей)", who: "", desc: "Оценки и посещаемость детей, переключение между детьми", max: 10 },
];

// URL сайта → путь файла в снимке (query превращается в сегмент пути)
function mapPath(pathname, search) {
  let p = pathname.replace(/\/$/, "") || "";
  if (search && search.length > 1) p += "/_" + search.slice(1).replace(/[^a-zA-Z0-9_-]+/g, "-");
  return p + "/";
}

function allowed(u, slug) {
  const p = u.pathname;
  if (p.startsWith("/api") || p.startsWith("/login") || p.startsWith("/_next")) return false;
  if (p === "/today" && u.search) return false; // бесконечная навигация по датам
  if (/\/grades\//.test(p)) return slug === "teacher" || slug === "coordinator";
  if (p.startsWith("/attendance/")) return slug === "teacher" || slug === "dp-teacher";
  if (slug === "admin" && /^\/courses\/[^/]+/.test(p) && (u.search || /\/(new|grades)/.test(p))) return false; // у админа — журнал курса за текущий период
  if (p.startsWith("/admin/people") && u.searchParams.has("q")) return false;
  return true;
}

async function main() {
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const cssFiles = new Set();
  const cards = [];

  for (const user of USERS.filter((u) => !process.env.ONLY || process.env.ONLY.split(",").includes(u.slug))) {
    const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
    const page = await ctx.newPage();
    await page.goto(ORIGIN + "/login");
    let btn;
    if (user.email) btn = page.locator("button", { hasText: user.who.split(" ")[0] }).first();
    else if (user.pick === "student") btn = page.locator("section").nth(2).locator("button").first();
    else btn = page.locator("section").nth(3).locator("button").first();
    const label = (await btn.innerText()).split("\n");
    await Promise.all([page.waitForURL((u) => !u.pathname.startsWith("/login")), btn.click()]);
    const landing = new URL(page.url());
    const prefix = `${BASE}/u/${user.slug}`;
    cards.push({ ...user, who: user.who || label[0], sub: label[1] || "", href: `${prefix}${mapPath(landing.pathname, landing.search)}` });

    const queue = [landing.pathname + landing.search];
    const seen = new Set(queue);
    let count = 0;
    let gradesCount = 0;
    const pages = [];
    while (queue.length && count < user.max) {
      const rel = queue.shift();
      const url = new URL(rel, ORIGIN);
      const resp = await page.goto(url.href, { waitUntil: "networkidle" });
      if (!resp || resp.status() >= 400 || new URL(page.url()).pathname.startsWith("/login")) continue;
      // собрать ссылки
      const hrefs = await page.$$eval("a[href]", (as) => as.map((a) => a.getAttribute("href")));
      for (const h of hrefs) {
        if (!h || h.startsWith("http") || h.startsWith("#")) continue;
        const u = new URL(h, url);
        const key = u.pathname + u.search;
        if (seen.has(key) || !allowed(u, user.slug)) continue;
        if (/\/grades\//.test(u.pathname)) { if (gradesCount >= 12) continue; gradesCount++; }
        seen.add(key);
        queue.push(key);
      }
      for (const href of await page.$$eval('link[rel="stylesheet"]', (ls) => ls.map((l) => l.getAttribute("href")))) cssFiles.add(href);
      pages.push({ url: url.href, html: await page.content() });
      count++;
    }
    console.log(`${user.slug}: ${count} страниц`);

    // Второй проход: ссылки переписываются, когда известен полный список страниц
    const crawled = pages.map((p) => { const u = new URL(p.url); return u.pathname + u.search; });
    await page.route("**/*", (r) => r.abort());
    for (const pg of pages) {
      const url = new URL(pg.url);
      await page.setContent(pg.html, { waitUntil: "domcontentloaded" });
      await page.evaluate(({ prefix, base, landingPath, crawled, pageUrl }) => {
        const map = (pathname, search) => {
          let p = pathname.replace(/\/$/, "") || "";
          if (search && search.length > 1) p += "/_" + search.slice(1).replace(/[^a-zA-Z0-9_-]+/g, "-");
          return p + "/";
        };
        const set = new Set(crawled);
        document.querySelectorAll("a[href]").forEach((a) => {
          const h = a.getAttribute("href");
          if (!h || h.startsWith("http") || h.startsWith("#")) return;
          const u = new URL(h, pageUrl);
          if (u.pathname.startsWith("/api")) { a.setAttribute("href", "#"); a.dataset.demoBlocked = "1"; return; }
          const key = u.pathname === "/" ? landingPath : u.pathname + u.search;
          if (!set.has(key)) { a.setAttribute("href", "#"); a.dataset.demoMissing = "1"; return; }
          const k = new URL(key, pageUrl);
          a.setAttribute("href", prefix + map(k.pathname, k.search));
        });
        document.querySelectorAll("script, link[rel=preload], link[rel=modulepreload], next-route-announcer").forEach((s) => s.remove());
        document.querySelectorAll('link[rel="stylesheet"]').forEach((l) => l.setAttribute("href", base + l.getAttribute("href")));
        // «Выйти» → на страницу выбора роли
        document.querySelectorAll("form").forEach((f) => {
          const b = f.querySelector("button");
          if (b && /Выйти|Шығу|Sign out/.test(b.textContent || "")) {
            const a = document.createElement("a"); a.className = b.className; a.textContent = b.textContent; a.href = base + "/"; f.replaceWith(a);
          }
        });
        // баннер статической версии
        const banner = document.querySelector(".bg-amber-50");
        if (banner) banner.innerHTML = "Статическая демо-версия на GitHub Pages: можно смотреть все экраны, но сохранение отключено. <a href='" + base + "/' style='text-decoration:underline'>Сменить роль</a>";
        const s = document.createElement("script");
        s.textContent = `document.addEventListener('submit',function(e){e.preventDefault();alert('Это статическая демо-версия на GitHub Pages: сохранение недоступно. Полная версия с базой данных запускается локально (см. README).');},true);document.addEventListener('click',function(e){var a=e.target.closest('a[data-demo-missing],a[data-demo-blocked]');if(a){e.preventDefault();alert('Эта страница не входит в статический снимок демо-версии.');}},true);`;
        document.body.appendChild(s);
      }, { prefix, base: BASE, landingPath: landing.pathname + landing.search, crawled, pageUrl: pg.url });

      const html = "<!DOCTYPE html>" + (await page.evaluate(() => document.documentElement.outerHTML));
      const file = path.join(OUT, "u", user.slug, mapPath(url.pathname, url.search), "index.html");
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, html);
    }
    await ctx.close();
  }

  // CSS
  for (const href of cssFiles) {
    const res = await fetch(ORIGIN + href);
    const file = path.join(OUT, href);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));
  }
  const css = [...cssFiles].map((h) => `<link rel="stylesheet" href="${BASE}${h}">`).join("");

  // Стартовая страница — выбор роли
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const index = `<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Журнал IB — демо</title>${css}</head>
<body><main class="mx-auto max-w-5xl px-4 py-10">
<div class="mb-2 text-sm font-medium text-brand-600">Лицей «Демо» · MYP + DP</div>
<h1 class="text-3xl font-semibold tracking-tight">Журнал IB · демо-версия</h1>
<p class="mt-2 max-w-3xl text-slate-600">Прототип электронного журнала: расписание, посещаемость, задания, оценивание по критериям IB, итоги за периоды в шкале 1–7 и 5-балльной, кабинеты ученика и родителя. Выберите роль, чтобы увидеть систему глазами этого пользователя.</p>
<div class="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">Это статический снимок на GitHub Pages: все экраны открываются, но сохранение (оценки, посещаемость, блокировка периодов) отключено. Все люди и данные вымышленные. Полная версия запускается локально — см. <a class="underline" href="https://github.com/festeast/toddle-#readme">README</a>.</div>
<div class="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
${cards.map((c) => `<a href="${c.href}" class="card block p-5 hover:border-brand-500 hover:bg-brand-50">
<div class="text-xs font-semibold uppercase tracking-wide text-brand-600">${esc(c.title)}</div>
<div class="mt-1 text-lg font-semibold">${esc(c.who)}</div>
${c.sub ? `<div class="text-xs text-slate-500">${esc(c.sub)}</div>` : ""}
<div class="mt-2 text-sm text-slate-600">${esc(c.desc)}</div></a>`).join("\n")}
</div>
<p class="mt-10 text-xs text-slate-400">Снимок собран ${new Date().toISOString().slice(0, 10)} · код: <a class="underline" href="https://github.com/festeast/toddle-">festeast/toddle-</a></p>
</main></body></html>`;
  fs.writeFileSync(path.join(OUT, "index.html"), index);
  fs.writeFileSync(path.join(OUT, "404.html"), index.replace("<h1", '<p class="mb-4 text-red-700">Страница не найдена в снимке.</p><h1'));
  fs.writeFileSync(path.join(OUT, ".nojekyll"), "");
  await browser.close();
}

main().catch((e) => { console.error(e); process.exit(1); });

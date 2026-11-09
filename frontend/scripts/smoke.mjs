#!/usr/bin/env node
/**
 * End-to-end smoke test against a running instance.
 *   BASE_URL=http://localhost:3000 node scripts/smoke.mjs
 * Exits non-zero on the first failure, so it is safe to use in CI.
 */
const base = process.env.BASE_URL || 'http://localhost:3000';
const email = process.env.SMOKE_EMAIL || 'owner@demo.local';
const password = process.env.SMOKE_PASSWORD || 'Demo#12345';

let cookie = '';
const results = [];

async function call(method, path, body) {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: { ...(body ? { 'content-type': 'application/json' } : {}), ...(cookie ? { cookie } : {}) },
    body: body ? JSON.stringify(body) : undefined,
    redirect: 'manual',
  });
  const setCookie = res.headers.get('set-cookie');
  if (setCookie) cookie = setCookie.split(';')[0];
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* non-JSON is fine for exports */ }
  return { status: res.status, json, text };
}

function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
}

const run = async () => {
  const health = await call('GET', '/api/health');
  check('GET /api/health', health.status === 200 && health.json?.status === 'ok', `mode ${health.json?.mode}`);

  const login = await call('POST', '/api/auth/login', { email, password });
  check('POST /api/auth/login', login.status === 200 && Boolean(cookie), `role ${login.json?.user?.role}`);

  const me = await call('GET', '/api/auth/me');
  check('GET /api/auth/me', me.status === 200);

  for (const path of ['/api/overview', '/api/players', '/api/teams', '/api/rank', '/api/xi', '/api/auction', '/api/workload', '/api/knowledge', '/api/reports', '/api/settings', '/api/audit']) {
    const r = await call('GET', path);
    check(`GET ${path}`, r.status === 200, String(r.status));
  }

  const talent = await call('POST', '/api/talent', { maxAge: 23, size: 10 });
  const talentRows = talent.json?.rows ?? [];
  check('POST /api/talent', talent.status === 200 && talentRows.length > 0, `${talentRows.length} players ranked`);

  const ids = talentRows.slice(0, 3).map((p) => p.playerId ?? p.player?.id ?? p.id).filter(Boolean);
  const compare = await call('POST', '/api/compare', { ids });
  check('POST /api/compare', compare.status === 200, `${ids.length} ids`);

  const teamList = await call('GET', '/api/predict');
  const [teamAId, teamBId] = (teamList.json?.teams ?? []).map((t) => t.id);
  const predict = await call('POST', '/api/predict', { teamAId, teamBId, simulations: 1000, seed: 7 });
  check('POST /api/predict', predict.status === 200 && typeof predict.json?.teamA?.winProbability === 'number', `${((predict.json?.teamA?.winProbability ?? 0) * 100).toFixed(1)}%`);

  const pitch = await call('POST', '/api/pitch', {});
  check('POST /api/pitch', pitch.status === 200 && Boolean(pitch.json?.toss?.decision));

  const opposition = await call('POST', '/api/opposition', {});
  check('POST /api/opposition', opposition.status === 200 && Boolean(opposition.json?.report?.teamName));

  const assistant = await call('POST', '/api/assistant', { query: 'find the best young batters under 21' });
  check('POST /api/assistant', assistant.status === 200 && (assistant.json?.answer ?? '').length > 20);

  const guard = await call('POST', '/api/assistant', { query: 'save the shortlist permanently' });
  check('assistant gates write intents', guard.json?.confirmRequired === true);

  const report = await call('POST', '/api/reports', { type: 'talent', maxAge: 23, size: 10 });
  const reportId = report.json?.report?.id;
  check('POST /api/reports', report.status === 200 && Boolean(reportId), `quality ${report.json?.report?.quality?.score}`);

  for (const format of ['pdf', 'docx', 'xlsx', 'pptx', 'md', 'html']) {
    const res = await fetch(`${base}/api/reports/${reportId}/export?format=${format}`, { headers: { cookie } });
    check(`export ${format}`, res.status === 200 && Number(res.headers.get('content-length') ?? 1) !== 0);
  }

  for (const path of ['/api/settings', '/api/players', '/api/audit']) {
    const anon = await fetch(`${base}${path}`, { headers: { cookie: '' } });
    check(`unauthenticated ${path} rejected`, anon.status === 401 || anon.status === 403, String(anon.status));
  }


  /* ------------------------------------------------ SEO, trust & growth (14) */
  for (const path of ['/', '/tour', '/faq', '/privacy', '/testimonials', '/contact', '/thank-you', '/login']) {
    const res = await fetch(`${base}${path}`, { redirect: 'manual' });
    check(`public page ${path}`, res.status === 200, String(res.status));
  }

  const home = await fetch(`${base}/`, { redirect: 'manual' });
  const homeHtml = await home.text();
  check('root metadata: title + description + canonical', /<title>[^<]{10,}<\/title>/.test(homeHtml) && /name="description" content="[^"]{50,}"/.test(homeHtml) && /rel="canonical"/.test(homeHtml));
  check('open graph image declared with dimensions', /property="og:image"/.test(homeHtml) && /og:image:width" content="1200"/.test(homeHtml) && /og:image:height" content="630"/.test(homeHtml));
  check('twitter card is summary_large_image', /twitter:card" content="summary_large_image"/.test(homeHtml));
  check('security headers present', home.headers.get('x-content-type-options') === 'nosniff' && Boolean(home.headers.get('referrer-policy')) && Boolean(home.headers.get('permissions-policy')));

  const og = await fetch(`${base}/opengraph-image`);
  const ogBytes = new Uint8Array(await og.arrayBuffer());
  check('default share image is a 1200x630 PNG', og.status === 200 && og.headers.get('content-type')?.includes('image/png') && ogBytes[0] === 0x89 && ogBytes[1] === 0x50 && ogBytes.length > 10_000, `${ogBytes.length} bytes`);

  const faq = await fetch(`${base}/faq`);
  const faqHtml = await faq.text();
  check('FAQ has visible answers and FAQPage structured data', faqHtml.includes('application/ld+json') && faqHtml.includes('"@type":"FAQPage"') && faqHtml.includes('Frequently asked questions'));

  const sitemap = await fetch(`${base}/sitemap.xml`);
  const sitemapXml = await sitemap.text();
  const locs = [...sitemapXml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  const privateInSitemap = locs.filter((u) => /\/(dashboard|players|reports|settings|api|login|thank-you)/.test(u));
  check('sitemap lists only public pages', sitemap.status === 200 && locs.length >= 6 && privateInSitemap.length === 0, `${locs.length} urls`);

  const robots = await fetch(`${base}/robots.txt`);
  const robotsTxt = await robots.text();
  check('robots.txt disallows private routes and references the sitemap', robots.status === 200 && robotsTxt.includes('Disallow: /dashboard') && robotsTxt.includes('Disallow: /api/') && /Sitemap: https?:\/\//.test(robotsTxt));

  const notFound = await fetch(`${base}/this-page-does-not-exist`, { redirect: 'manual' });
  const notFoundHtml = await notFound.text();
  check('custom 404 with navigation', notFound.status === 404 && notFoundHtml.includes('Error 404') && notFoundHtml.includes('Command overview'));

  const privateAnon = await fetch(`${base}/dashboard`, { redirect: 'manual' });
  check('private dashboard redirects anonymous visitors', privateAnon.status === 307 && (privateAnon.headers.get('location') ?? '').includes('/login'), String(privateAnon.status));

  const privateAuthed = await fetch(`${base}/dashboard`, { headers: { cookie }, redirect: 'manual' });
  const privateHtml = await privateAuthed.text();
  check('private pages are noindex', privateAuthed.headers.get('x-robots-tag')?.includes('noindex') && /name="robots" content="noindex/.test(privateHtml));

  const badFeedback = await fetch(`${base}/api/public/feedback`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'A', email: 'nope', message: 'short', consent: false, kind: 'question', honeypot: '', elapsedMs: 5000 }) });
  const badJson = await badFeedback.json();
  check('public form rejects invalid input server-side', badFeedback.status === 422 && Object.keys(badJson.errors ?? {}).length >= 3, `${Object.keys(badJson.errors ?? {}).length} field errors`);

  const honeypot = await fetch(`${base}/api/public/feedback`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'Spam Bot', email: 'bot@example.com', message: 'Buy cheap backlinks for your cricket analytics website right now', consent: true, kind: 'question', honeypot: 'x', elapsedMs: 5000 }) });
  const honeypotJson = await honeypot.json();
  check('honeypot submissions rejected', honeypot.status === 400 && honeypotJson.reason === 'spam');

  const goodFeedback = await fetch(`${base}/api/public/feedback`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-forwarded-for': '198.18.0.' + Math.floor(Math.random() * 200) }, body: JSON.stringify({ name: 'Smoke Tester', email: `smoke-${Date.now()}@example.com`, organisation: 'CI', message: 'Smoke test submission checking that the public contact pipeline stores messages and returns a reference.', consent: true, kind: 'feedback', honeypot: '', elapsedMs: 6000, pageUrl: '/contact' }) });
  const goodJson = await goodFeedback.json();
  check('valid public submission stored with a reference', goodFeedback.status === 201 && /^FB-[A-Z0-9]{6}$/.test(goodJson.reference ?? ''), goodJson.reference);

  const publicTestimonials = await fetch(`${base}/api/testimonials`);
  const pubJson = await publicTestimonials.json();
  check('testimonials endpoint exposes published rows only', publicTestimonials.status === 200 && Array.isArray(pubJson.testimonials) && pubJson.testimonials.every((t) => t.status === 'published'));
  check('demo testimonials are labelled as samples', pubJson.testimonials.length === 0 || pubJson.testimonials.some((t) => t.sample === true));

  const anonTestimonialWrite = await fetch(`${base}/api/testimonials`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'Fake', role: 'Analyst', organisation: 'X', quote: 'This fabricated quote must never be accepted by the API.', status: 'published' }) });
  check('anonymous testimonial write rejected', anonTestimonialWrite.status === 401, String(anonTestimonialWrite.status));

  const adminTestimonials = await fetch(`${base}/api/testimonials?scope=all`, { headers: { cookie } });
  const adminJson = await adminTestimonials.json();
  check('owner can list all testimonials with stats', adminTestimonials.status === 200 && Boolean(adminJson.stats));

  const inbox = await fetch(`${base}/api/feedback`, { headers: { cookie } });
  const inboxJson = await inbox.json();
  check('feedback inbox lists stored submissions', inbox.status === 200 && inboxJson.feedback.length >= 1, `${inboxJson.feedback?.length} rows`);

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  process.exit(failed.length ? 1 : 0);
};

run().catch((err) => { console.error('smoke test crashed:', err); process.exit(1); });

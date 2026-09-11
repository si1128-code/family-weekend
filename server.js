const http = require('http');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, 'public');
const port = process.env.PORT || 4173;

function weekend(base = new Date()) {
  const d = new Date(base);
  d.setHours(0, 0, 0, 0);
  const daysUntilSaturday = (6 - d.getDay() + 7) % 7;
  const saturday = new Date(d); saturday.setDate(d.getDate() + daysUntilSaturday);
  const sunday = new Date(saturday); sunday.setDate(saturday.getDate() + 1);
  const ymd = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  return { saturday: ymd(saturday), sunday: ymd(sunday) };
}

function send(res, status, body, type = 'application/json; charset=utf-8') {
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  res.end(Buffer.isBuffer(body) || typeof body === 'string' ? body : JSON.stringify(body));
}

const decode = text => text
  .replace(/<!\[CDATA\[|\]\]>/g, '')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s+/g, ' ').trim();
const tag = (xml, name) => (xml.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`, 'i')) || [])[1] || '';

function isOfficial(url) {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host.endsWith('.go.kr') || host.endsWith('.or.kr') ||
      ['goyang.go.kr', 'paju.go.kr', 'artgy.or.kr', 'goyangcm.or.kr', 'nfm.go.kr', 'heyri.net', 'bcj.co.kr', 'aquaplanet.co.kr'].some(domain => host === domain || host.endsWith(`.${domain}`));
  } catch { return false; }
}

async function bingSearch(query) {
  const url = `https://www.bing.com/search?format=rss&q=${encodeURIComponent(query)}`;
  const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 Weekend-family-app/1.0' } });
  if (!response.ok) throw new Error(`search returned ${response.status}`);
  const xml = await response.text();
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)].map(match => {
    const item = match[1];
    return { name: decode(tag(item, 'title')), officialUrl: decode(tag(item, 'link')), summary: decode(tag(item, 'description')) };
  }).filter(x => x.name && /^https?:\/\//.test(x.officialUrl));
}

function searchQueries(period) {
  const [year, month, date] = period.saturday.split('-').map(Number);
  const sunday = Number(period.sunday.slice(-2));
  const when = `${year}년 ${month}월 ${date}일 ${sunday}일`;
  return {
    children: [
      `일산 파주 ${when} 어린이 체험 전시 주말`,
      `고양 파주 ${when} 초등학생 박물관 과학 체험`,
      `site:go.kr 고양 파주 ${month}월 어린이 행사 체험`
    ],
    adults: [
      `일산 파주 ${when} 전시 공연 축제 주말`,
      `파주 헤이리 일산 ${when} 문화 전시 카페`,
      `site:go.kr 고양 파주 ${month}월 문화 행사 전시`
    ],
    everyone: [
      `일산 파주 ${when} 가족 나들이 체험 행사`,
      `고양 파주 ${when} 가족 축제 공원 동물 체험`,
      `site:go.kr 고양 파주 ${month}월 가족 행사 관광`
    ]
  };
}

function toSearchCard(result, audience, period, query) {
  const text = `${result.name} ${result.summary}`;
  const area = /파주/.test(text) ? '파주시' : '고양시 일산권';
  const month = Number(period.saturday.slice(5, 7));
  const sat = Number(period.saturday.slice(-2)), sun = Number(period.sunday.slice(-2));
  const mentionsWeekend = new RegExp(`${month}\\s*[월.]?\\s*${sat}`).test(text) || new RegExp(`${month}\\s*[월.]?\\s*${sun}`).test(text);
  return {
    audience, name: result.name, area,
    dates: mentionsWeekend ? `${period.saturday.slice(5).replace('-', '/')}~${period.sunday.slice(5).replace('-', '/')}` : '정보 확인 필요',
    hours: '정보 확인 필요', fee: '정보 확인 필요', parking: '정보 확인 필요',
    reason: result.summary || `이번 주말 일산·파주 관련 검색으로 찾은 ${query.includes('어린이') ? '체험' : '나들이'} 정보예요.`,
    officialUrl: result.officialUrl,
    sourceName: isOfficial(result.officialUrl) ? '공식 사이트 검색 결과' : '실시간 웹 검색 결과',
    verifiedAt: new Date().toISOString(),
    searchVerified: mentionsWeekend && isOfficial(result.officialUrl)
  };
}

async function publicSearchRecommendations(period) {
  const queries = searchQueries(period);
  const grouped = await Promise.all(Object.entries(queries).map(async ([audience, list]) => {
    const batches = await Promise.allSettled(list.map(bingSearch));
    const seen = new Set();
    const cards = [];
    for (const batch of batches) {
      if (batch.status !== 'fulfilled') continue;
      for (const result of batch.value) {
        const key = result.officialUrl.replace(/\/$/, '').toLowerCase();
        const regionText = `${result.name} ${result.summary}`;
        if (seen.has(key) || !/(일산|고양|파주)/.test(regionText)) continue;
        seen.add(key); cards.push(toSearchCard(result, audience, period, list[0]));
        if (cards.length === 12) break;
      }
      if (cards.length === 12) break;
    }
    return cards;
  }));
  const items = grouped.flat();
  return grouped.every(group => group.length >= 11) ? { mode: 'search', verifiedAt: new Date().toISOString(), items } : null;
}

// For production, connect a trusted collector which verifies each official facility page.
// The upstream must return { items: [{ audience, name, area, dates, hours, fee,
// parking, reason, officialUrl, sourceName, verifiedAt }] }. Unknown fields stay null.
async function liveRecommendations(period) {
  if (!process.env.LIVE_DATA_URL) return null;
  const url = new URL(process.env.LIVE_DATA_URL);
  url.searchParams.set('from', period.saturday);
  url.searchParams.set('to', period.sunday);
  url.searchParams.set('region', '고양시 일산동구,고양시 일산서구,파주시');
  const response = await fetch(url, { headers: process.env.LIVE_DATA_TOKEN ? { Authorization: `Bearer ${process.env.LIVE_DATA_TOKEN}` } : {} });
  if (!response.ok) throw new Error(`upstream returned ${response.status}`);
  const data = await response.json();
  const allowed = new Set(['children', 'adults', 'everyone']);
  const items = Array.isArray(data.items) ? data.items.filter(x =>
    allowed.has(x.audience) && x.name && x.area && x.dates && x.officialUrl && x.verifiedAt
  ).slice(0, 15) : [];
  return { mode: 'live', verifiedAt: new Date().toISOString(), items };
}

http.createServer(async (req, res) => {
  const parsed = new URL(req.url, `http://${req.headers.host}`);
  if (parsed.pathname === '/api/recommendations') {
    const period = weekend();
    try {
      const live = await liveRecommendations(period);
      if (live) return send(res, 200, { period, ...live });
      const search = await publicSearchRecommendations(period);
      if (search) return send(res, 200, { period, ...search });
    } catch (error) {
      console.error('Live recommendation source failed:', error.message);
    }
    return send(res, 200, { period, mode: 'demo', verifiedAt: new Date().toISOString(), items: [] });
  }
  const requested = parsed.pathname === '/' ? '/index.html' : parsed.pathname;
  const filename = path.normalize(path.join(root, requested));
  if (!filename.startsWith(root)) return send(res, 403, 'Forbidden', 'text/plain; charset=utf-8');
  fs.readFile(filename, (err, contents) => {
    if (err) return send(res, 404, 'Not found', 'text/plain; charset=utf-8');
    const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8' };
    send(res, 200, contents, types[path.extname(filename)] || 'application/octet-stream');
  });
}).listen(port, () => console.log(`승제경애 가족 나들이 앱: http://localhost:${port}`));

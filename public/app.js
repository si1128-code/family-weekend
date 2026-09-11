const categories = [
  { id:'children', icon:'👦', title:'초등학생과 함께 가면 좋은 곳', subtitle:'윤빈지훈윤우랑 같이', color:'아이와 함께' },
  { id:'adults', icon:'👩', title:'어른들끼리 함께 가면 좋은 곳', subtitle:'걍 우리끼리', color:'어른 나들이' },
  { id:'everyone', icon:'👨‍👩‍👧‍👦', title:'아이 어른 다 같이 가면 좋을곳', subtitle:'전부 다 같이', color:'온 가족' }
];

// Show a useful answer immediately; the other two large cards switch the recommendation lens.
let period, dataset = [], mode = 'demo', selected = 'children';
const $ = s => document.querySelector(s);

function dateLabel(iso) { const d = new Date(`${iso}T12:00:00`); return `${d.getMonth()+1}월 ${d.getDate()}일(${['일','월','화','수','목','금','토'][d.getDay()]})`; }
function range() { return `${dateLabel(period.saturday)} ~ ${dateLabel(period.sunday)}`; }
function demoData() {
  const dates = `${period.saturday.slice(5).replace('-', '/')}~${period.sunday.slice(5).replace('-', '/')}`;
  const pending = '정보 확인 필요';
  const sets = {
    children: ['고양어린이박물관','국립민속박물관 파주','현대 모터스튜디오 고양','아쿠아플라넷 일산','원마운트 체험 공간','고양호수공원 어린이 산책','파주 출판도시 체험','오두산 통일전망대','파주 장난감도서관 프로그램','고양시 박물관 체험','파주 과학 체험 프로그램','일산 어린이 공연'],
    adults: ['헤이리 예술마을 산책','아람미술관 전시 관람','지혜의숲 책 산책','파주 출판도시 문화 코스','벽초지수목원 산책','일산호수공원 산책','파주 프로방스 마을','헤이리 갤러리 전시','고양아람누리 공연','파주 이이유적 문화 산책','일산 카페 거리','파주 드라이브 코스'],
    everyone: ['아쿠아플라넷 일산','벽초지수목원 가족 산책','헤이리 예술마을 가족 코스','국립민속박물관 파주','고양호수공원 피크닉','파주 출판도시 가족 산책','현대 모터스튜디오 고양','일산 실내 체험 공간','파주 자연 체험장','고양 문화 체험 프로그램','파주 가족 공연','일산 가족 식사 코스']
  };
  const urls = { children:'https://www.goyangcm.or.kr/', adults:'https://www.heyri.net/', everyone:'https://www.aquaplanet.co.kr/ilsan/' };
  return Object.entries(sets).flatMap(([audience, names]) => names.map((name, index) => ({
    audience, name:`${name} (데모)`, area:index % 2 ? '파주시' : '고양시 일산권', dates, hours:pending, fee:pending, parking:pending,
    reason: audience === 'children' ? '초등학생이 보고 움직이며 즐길 수 있는 주말 나들이 후보 예시예요. 공식 일정과 예약 여부를 확인해 주세요.' : audience === 'adults' ? '전시·산책·카페를 함께 즐기기 좋은 어른 나들이 후보 예시예요. 개별 공간 운영 여부를 확인해 주세요.' : '아이와 어른이 함께 걷고 쉬며 즐기기 좋은 가족 나들이 후보 예시예요. 공식 안내를 확인해 주세요.',
    officialUrl:urls[audience], sourceName:'Demo Mode 예시 공식 링크'
  })));
}
function drawChoices() { $('#choices').innerHTML = categories.map(c => `<button class="choice ${selected === c.id ? 'active':''}" data-id="${c.id}"><span class="choice-icon">${c.icon}</span><small>${c.subtitle}</small><strong>${c.title}</strong></button>`).join(''); $('#choices').onclick = e => { const button=e.target.closest('button'); if(button){selected=button.dataset.id; drawChoices(); drawResults();} }; }
function safe(v) { return v || '정보 확인 필요'; }
function drawResults() { const root=$('#results'); if(!selected){root.innerHTML=''; return;} const cat=categories.find(c=>c.id===selected); const items=dataset.filter(x=>x.audience===selected).slice(0,12); root.innerHTML=`<div class="result-head"><h2>${cat.subtitle}</h2><span>최대 12곳</span></div>${items.length ? items.map(x=>`<article class="place"><h3>${x.name}</h3><p class="detail"><b>📍</b>${x.area}</p><p class="detail"><b>📅</b>${safe(x.dates)}</p><p class="detail"><b>⏰</b>${safe(x.hours)}</p><p class="detail"><b>💰</b>${safe(x.fee)}</p><p class="detail"><b>🅿️</b>${safe(x.parking)}</p><div class="reason"><b>추천 이유</b>${x.reason}</div><div class="source"><small>${x.sourceName || '공식 안내'}${x.verifiedAt ? `<br>검색 ${new Date(x.verifiedAt).toLocaleString('ko-KR')}` : ''}</small><a href="${x.officialUrl}" target="_blank" rel="noreferrer">공식 정보 보기</a></div></article>`).join('') : '<p class="notice">이번 주말 운영이 확인된 추천을 아직 찾지 못했어요. 잠시 뒤 다시 열어 주세요.</p>'}`; }
async function boot() { try { const res=await fetch('/api/recommendations'); const data=await res.json(); period=data.period; mode=data.mode; dataset=data.items.length ? data.items : demoData(); $('#weekend').textContent=`이번 주말 · ${range()}`; $('#status').innerHTML=mode==='live'?'<p class="notice live">✓ 공식 안내와 확인 시각이 있는 최신 추천을 보여드려요.</p>':mode==='search'?'<p class="notice live">✓ 방금 이번 주말 날짜로 웹 검색한 결과입니다. 운영·요금·주차는 공식 링크에서 최종 확인해 주세요.</p>':'<p class="notice">Demo Mode · 화면 테스트용 예시입니다. 실제 운영 시간·가격·주차는 공식 정보에서 확인해 주세요.</p>'; drawChoices(); drawResults(); } catch { period = (()=>{ const n=new Date(), s=new Date(n); s.setDate(n.getDate()+(6-n.getDay()+7)%7); const e=new Date(s); e.setDate(s.getDate()+1); const ymd=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; return {saturday:ymd(s),sunday:ymd(e)};})(); dataset=demoData(); $('#weekend').textContent=`이번 주말 · ${range()}`; $('#status').innerHTML='<p class="notice">Demo Mode · 연결을 확인하지 못해 예시 화면을 보여드려요.</p>'; drawChoices(); drawResults(); } }
boot();
// Keep an open screen fresh without asking the family to enter or select anything.
setInterval(boot, 15 * 60 * 1000);

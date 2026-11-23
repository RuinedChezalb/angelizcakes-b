(function(){
  'use strict';

  const peso = n => '₱' + n.toLocaleString('en-PH');

  /* ---------- sales comparison data (Yashano Branch only) ---------- */
  const salesData = {
    weekly: {
      currentLegend: 'This week',
      previousLegend: 'Last week',
      rows: [
        { label:'Mon', cur: 8200, prev: 7100 },
        { label:'Tue', cur:10400, prev: 9600 },
        { label:'Wed', cur: 7600, prev: 8100 },
        { label:'Thu', cur:12900, prev:11200 },
        { label:'Fri', cur: 9800, prev: 8900 },
        { label:'Sat', cur:14200, prev:12400 },
        { label:'Sun', cur: 6350, prev: 5900 }
      ]
    },
    monthly: {
      currentLegend: 'This year',
      previousLegend: 'Last year',
      rows: [
        { label:'January', cur:182000, prev:164000 },
        { label:'February', cur:176000, prev:158000 },
        { label:'March', cur:198000, prev:175000 },
        { label:'April', cur:210000, prev:186000 },
        { label:'May', cur:224000, prev:198000 },
        { label:'June', cur:238000, prev:209000 },
        { label:'July', cur:246000, prev:214000 },
        { label:'August', cur:252000, prev:221000 },
        { label:'September', cur:244000, prev:216000 },
        { label:'October', cur:258000, prev:228000 },
        { label:'November', cur:248800, prev:219000 },
        { label:'December', cur:268000, prev:236000 }
      ]
    },
    yearly: {
      currentLegend: 'Year shown',
      previousLegend: 'Previous year',
      rows: [
        { label:'2022', cur:1820000, prev:1640000 },
        { label:'2023', cur:1940000, prev:1820000 },
        { label:'2024', cur:2180000, prev:1940000 },
        { label:'2025', cur:2424000, prev:2180000 },
        { label:'2026', cur:2744800, prev:2424000 }
      ]
    }
  };

  const compareEl = document.getElementById('salesCompare');
  const currentLegendEl = document.getElementById('salesCurrentLegend');
  const previousLegendEl = document.getElementById('salesPreviousLegend');

  function renderCompare(range){
    const data = salesData[range];
    compareEl.dataset.range = range;
    compareEl.classList.toggle('is-scrollable', range !== 'weekly');

    // one shared scale so both bars are always comparable
    let max = 0;
    data.rows.forEach(r => {
      if (r.cur  > max) max = r.cur;
      if (r.prev > max) max = r.prev;
    });

    compareEl.innerHTML = data.rows.map(r => {
      const wCur  = (r.cur  / max) * 100;
      const wPrev = (r.prev / max) * 100;
      return '' +
        '<div class="cmp-row">' +
          '<span class="cmp-label">' + r.label + '</span>' +
          '<div class="cmp-bars">' +
            '<div class="cmp-track"><div class="cmp-fill cur"  style="width:' + wCur.toFixed(1)  + '%"></div></div>' +
            '<div class="cmp-track"><div class="cmp-fill prev" style="width:' + wPrev.toFixed(1) + '%"></div></div>' +
          '</div>' +
          '<div class="cmp-vals">' +
            '<span class="cmp-cur">'  + peso(r.cur)  + '</span>' +
            '<span class="cmp-prev">' + peso(r.prev) + '</span>' +
          '</div>' +
        '</div>';
    }).join('');

    currentLegendEl.textContent = data.currentLegend;
    previousLegendEl.textContent = data.previousLegend;
  }

  renderCompare('weekly');

  document.querySelectorAll('.seg-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.seg-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderCompare(btn.dataset.range);
    });
  });

  /* ---------- customer feedback (1–5 stars) ---------- */
  const ratings = [
    { stars:5, count:150, color:'linear-gradient(90deg,#5EEAD4,#0F766E)' },
    { stars:4, count: 40, color:'linear-gradient(90deg,#B9D7EA,#3E7C9E)' },
    { stars:3, count: 15, color:'linear-gradient(90deg,#FCD34D,#D97706)' },
    { stars:2, count:  5, color:'linear-gradient(90deg,#FCA5A5,#DC2626)' },
    { stars:1, count:  4, color:'linear-gradient(90deg,#F87171,#B91C1C)' }
  ];
  const totalReviews = ratings.reduce((s, r) => s + r.count, 0);
  const maxCount = Math.max.apply(null, ratings.map(r => r.count));

  /* filled stars for the average score (4.5 -> 4 full, 5th softened) */
  const avg = 4.5;
  document.getElementById('fbStars').innerHTML = [1,2,3,4,5].map(i => {
    const fill = avg >= i ? '#EA9AB2' : '#F5D5DE';
    return '<svg viewBox="0 0 24 24" fill="' + fill + '">' +
           '<path d="M12 2l2.9 6.2 6.6.9-4.8 4.6 1.2 6.6L12 17.1 6.1 20.3l1.2-6.6L2.5 9.1l6.6-.9z"/></svg>';
  }).join('');

  document.getElementById('fbRows').innerHTML = ratings.map(r => {
    const pct = (r.count / maxCount) * 100;
    const share = Math.round((r.count / totalReviews) * 100);
    return '' +
      '<div class="fb-row">' +
        '<span class="fb-star">' + r.stars + ' ★</span>' +
        '<div class="fb-track">' +
          '<div class="fb-fill" style="width:' + pct.toFixed(1) + '%;background:' + r.color + '"></div>' +
        '</div>' +
        '<span class="fb-count">' + r.count + '</span>' +
        '<span class="fb-pct">' + share + '%</span>' +
      '</div>';
  }).join('');

})();

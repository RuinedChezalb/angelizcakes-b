(function(){
  'use strict';

  /* ============================================================
     helpers
     ============================================================ */
  const $  = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));
  const esc = v => String(v==null?'':v).replace(/[&<>"']/g, c => (
    {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]
  ));
  const peso = n => '₱' + Number(n).toLocaleString('en-PH', {maximumFractionDigits:0});

  function toast(msg, type){
    const wrap = $('#toasts');
    const el = document.createElement('div');
    el.className = 'toast' + (type === 'warn' ? ' warn' : '');
    el.innerHTML = '<span class="toast-dot"></span><span>' + esc(msg) + '</span>';
    wrap.appendChild(el);
    setTimeout(() => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(8px)';
      setTimeout(() => el.remove(), 320);
    }, 3600);
  }

  /* ============================================================
     DATA MODEL
     ============================================================ */
  const baseDate = new Date();
  baseDate.setHours(12, 0, 0, 0);
  const iso = d => d.toISOString().slice(0,10);
  const shift = (days) => {
    const d = new Date(baseDate);
    d.setDate(d.getDate() - days);
    return iso(d);
  };

  const SALES = [
    // --- today ---
    { id:'POS-1101', date: iso(baseDate), product:'Chocolate Fudge Cake 8"', category:'Ready-made Cakes', qty:2, revenue:3300, payment:'Cash', type:'POS' },
    { id:'POS-1102', date: iso(baseDate), product:'Butter Croissant (box of 6)', category:'Pastries', qty:3, revenue:720, payment:'GCash', type:'POS' },
    { id:'WEB-2201', date: iso(baseDate), product:'Custom Cake — Unicorn Dream', category:'Custom Cakes', qty:1, revenue:1950, payment:'GCash', type:'Website' },
    { id:'SVC-3301', date: iso(baseDate), product:'Grazing Table Setup — Classic', category:'Grazing Table', qty:1, revenue:4500, payment:'Bank Transfer', type:'Service' },
    { id:'POS-1103', date: iso(baseDate), product:'Red Velvet Cake 6"', category:'Ready-made Cakes', qty:1, revenue:1250, payment:'Cash', type:'POS' },
    { id:'WEB-2202', date: iso(baseDate), product:'Party Package — Kids Fun', category:'Party Packages', qty:1, revenue:6800, payment:'Bank Transfer', type:'Service' },

    // --- yesterday ---
    { id:'POS-1098', date: shift(1), product:'Chocolate Fudge Cake 8"', category:'Ready-made Cakes', qty:1, revenue:1650, payment:'Cash', type:'POS' },
    { id:'POS-1099', date: shift(1), product:'Ube Cake 8"', category:'Ready-made Cakes', qty:2, revenue:2900, payment:'GCash', type:'POS' },
    { id:'WEB-2195', date: shift(1), product:'Custom Cake — Elegant Floral', category:'Custom Cakes', qty:1, revenue:2250, payment:'GCash', type:'Website' },
    { id:'SVC-3290', date: shift(1), product:'Pastry Buffet — Premium', category:'Pastry Buffet', qty:1, revenue:7500, payment:'Bank Transfer', type:'Service' },
    { id:'POS-1100', date: shift(1), product:'Croissant (box of 6)', category:'Pastries', qty:2, revenue:480, payment:'Cash', type:'POS' },

    // --- 2 days ago ---
    { id:'POS-1090', date: shift(2), product:'Butter Croissant (box of 6)', category:'Pastries', qty:4, revenue:960, payment:'Cash', type:'POS' },
    { id:'WEB-2188', date: shift(2), product:'Custom Cake — Little Hero', category:'Custom Cakes', qty:1, revenue:1850, payment:'GCash', type:'Website' },
    { id:'SVC-3285', date: shift(2), product:'Food Bundle — Family Feast', category:'Food Bundles', qty:2, revenue:3600, payment:'Cash', type:'Service' },
    { id:'POS-1091', date: shift(2), product:'Red Velvet Cake 6"', category:'Ready-made Cakes', qty:1, revenue:1250, payment:'GCash', type:'POS' },

    // --- 3 days ago ---
    { id:'POS-1085', date: shift(3), product:'Chocolate Fudge Cake 8"', category:'Ready-made Cakes', qty:2, revenue:3300, payment:'Cash', type:'POS' },
    { id:'WEB-2180', date: shift(3), product:'Custom Cake — Butterfly Garden', category:'Custom Cakes', qty:1, revenue:1750, payment:'Card', type:'Website' },
    { id:'SVC-3280', date: shift(3), product:'Grazing Table Setup — Deluxe', category:'Grazing Table', qty:1, revenue:6200, payment:'Bank Transfer', type:'Service' },
    { id:'POS-1086', date: shift(3), product:'Ube Cake 8"', category:'Ready-made Cakes', qty:1, revenue:1450, payment:'Cash', type:'POS' },

    // --- 4 days ago ---
    { id:'POS-1080', date: shift(4), product:'Croissant (box of 6)', category:'Pastries', qty:5, revenue:1200, payment:'GCash', type:'POS' },
    { id:'WEB-2175', date: shift(4), product:'Party Package — Deluxe Celebration', category:'Party Packages', qty:1, revenue:9500, payment:'Bank Transfer', type:'Service' },
    { id:'SVC-3275', date: shift(4), product:'Pastry Buffet — Classic', category:'Pastry Buffet', qty:1, revenue:5200, payment:'Bank Transfer', type:'Service' },
    { id:'POS-1081', date: shift(4), product:'Chocolate Fudge Cake 8"', category:'Ready-made Cakes', qty:1, revenue:1650, payment:'Cash', type:'POS' },

    // --- 5 days ago ---
    { id:'POS-1075', date: shift(5), product:'Red Velvet Cake 6"', category:'Ready-made Cakes', qty:2, revenue:2500, payment:'Cash', type:'POS' },
    { id:'WEB-2170', date: shift(5), product:'Custom Cake — Classic Birthday', category:'Custom Cakes', qty:1, revenue:1450, payment:'GCash', type:'Website' },
    { id:'SVC-3270', date: shift(5), product:'Food Bundle — Party Platter', category:'Food Bundles', qty:1, revenue:2200, payment:'Cash', type:'Service' },
    { id:'POS-1076', date: shift(5), product:'Ube Cake 8"', category:'Ready-made Cakes', qty:1, revenue:1450, payment:'GCash', type:'POS' },

    // --- 6 days ago ---
    { id:'POS-1070', date: shift(6), product:'Butter Croissant (box of 6)', category:'Pastries', qty:3, revenue:720, payment:'Cash', type:'POS' },
    { id:'WEB-2165', date: shift(6), product:'Custom Cake — Chocolate Fudge Delight', category:'Custom Cakes', qty:1, revenue:1650, payment:'GCash', type:'Website' },
    { id:'SVC-3265', date: shift(6), product:'Grazing Table Setup — Classic', category:'Grazing Table', qty:1, revenue:4500, payment:'Bank Transfer', type:'Service' },

    // --- 7–14 days ---
    { id:'POS-1060', date: shift(8), product:'Chocolate Fudge Cake 8"', category:'Ready-made Cakes', qty:3, revenue:4950, payment:'Cash', type:'POS' },
    { id:'WEB-2150', date: shift(8), product:'Custom Cake — Unicorn Dream', category:'Custom Cakes', qty:1, revenue:1950, payment:'GCash', type:'Website' },
    { id:'SVC-3250', date: shift(9), product:'Party Package — Kids Fun', category:'Party Packages', qty:1, revenue:6800, payment:'Bank Transfer', type:'Service' },
    { id:'POS-1055', date: shift(10), product:'Red Velvet Cake 6"', category:'Ready-made Cakes', qty:2, revenue:2500, payment:'GCash', type:'POS' },
    { id:'SVC-3245', date: shift(11), product:'Pastry Buffet — Premium', category:'Pastry Buffet', qty:1, revenue:7500, payment:'Bank Transfer', type:'Service' },
    { id:'WEB-2145', date: shift(12), product:'Custom Cake — Little Hero', category:'Custom Cakes', qty:1, revenue:1850, payment:'Card', type:'Website' },
    { id:'POS-1050', date: shift(13), product:'Ube Cake 8"', category:'Ready-made Cakes', qty:2, revenue:2900, payment:'Cash', type:'POS' },
    { id:'SVC-3240', date: shift(14), product:'Food Bundle — Family Feast', category:'Food Bundles', qty:2, revenue:3600, payment:'Cash', type:'Service' },
  ];

  /* ============================================================
     PERIOD LOGIC
     ============================================================ */
  const PERIODS = {
    today: { label: "today's verified branch sales", days: 1 },
    week:  { label: "this week’s verified branch sales (last 7 days)", days: 7 },
    month: { label: "this month’s verified branch sales (last 30 days)", days: 30 },
    year:  { label: "this year’s verified branch sales (last 365 days)", days: 365 }
  };
  let currentPeriod = 'week';

  function inPeriod(record, period){
    if(period === 'today') return record.date === iso(baseDate);
    const days = PERIODS[period].days;
    const cutoff = new Date(baseDate);
    cutoff.setDate(cutoff.getDate() - (days - 1));
    return record.date >= iso(cutoff);
  }

  function previousPeriodRecords(period){
    const days = PERIODS[period].days;
    const end = new Date(baseDate);
    end.setDate(end.getDate() - days);
    const start = new Date(end);
    start.setDate(start.getDate() - (days - 1));
    return SALES.filter(r => r.date >= iso(start) && r.date <= iso(end));
  }

  /* ============================================================
     AGGREGATION
     ============================================================ */
  function aggregate(records){
    const byProduct = {};
    let totalRevenue = 0;
    let totalOrders = 0;
    const byPayment = {};

    records.forEach(r => {
      totalRevenue += r.revenue;
      totalOrders += r.qty;

      if(!byProduct[r.product]){
        byProduct[r.product] = { product: r.product, category: r.category, orders: 0, revenue: 0 };
      }
      byProduct[r.product].orders += r.qty;
      byProduct[r.product].revenue += r.revenue;

      if(!byPayment[r.payment]) byPayment[r.payment] = { amount: 0, count: 0 };
      byPayment[r.payment].amount += r.revenue;
      byPayment[r.payment].count += r.qty;
    });

    return { byProduct, totalRevenue, totalOrders, byPayment };
  }

  /* ============================================================
     RENDER — KPIs
     ============================================================ */
  function renderKPIs(records){
    const agg = aggregate(records);
    const currentTotal = agg.totalRevenue;

    const prev = aggregate(previousPeriodRecords(currentPeriod));
    const prevTotal = prev.totalRevenue;

    let trendText = '—';
    let trendClass = 'kpi-trend';
    if(prevTotal > 0){
      const diff = ((currentTotal - prevTotal) / prevTotal) * 100;
      const up = diff >= 0;
      trendClass += up ? '' : ' down';
      trendText = (up ? '▲' : '▼') + ' ' + Math.abs(diff).toFixed(1) + '%';
    }

    $('#kpiSales').textContent = peso(currentTotal);
    $('#kpiSalesTrend').className = trendClass;
    $('#kpiSalesTrend').textContent = trendText;

    let topProduct = '—', topUnits = 0;
    Object.values(agg.byProduct).forEach(p => {
      if(p.orders > topUnits){ topUnits = p.orders; topProduct = p.product; }
    });
    $('#kpiTopProduct').textContent = topProduct;
    $('#kpiTopProductVal').textContent = topUnits > 0 ? topUnits : '—';
  }

  /* ============================================================
     RENDER — MINI STRIP
     ============================================================ */
  function renderStrip(records){
    let pos = 0, web = 0, svc = 0;
    records.forEach(r => {
      if(r.type === 'POS') pos += r.revenue;
      else if(r.type === 'Website') web += r.revenue;
      else if(r.type === 'Service') svc += r.revenue;
    });
    const days = PERIODS[currentPeriod].days;
    const avgDay = records.length ? Math.round(records.reduce((s,r) => s + r.revenue, 0) / days) : 0;

    $('#stripPos').textContent = peso(pos);
    $('#stripWeb').textContent = peso(web);
    $('#stripSvc').textContent = peso(svc);
    $('#stripAvgDay').textContent = peso(avgDay);
  }

  /* ============================================================
     CHART (canvas-based line chart)
     ============================================================ */
  let chartData = { labels: [], pos: [], web: [], other: [] };
  let chartAnim = 0;

  function buildChartData(period){
    if(period === 'today'){
      const labels = ['POS', 'Website', 'Services'];
      let p = 0, w = 0, o = 0;
      SALES.filter(r => r.date === iso(baseDate)).forEach(r => {
        if(r.type === 'POS') p += r.revenue;
        else if(r.type === 'Website') w += r.revenue;
        else o += r.revenue;
      });
      return { labels, pos: [p], web: [w], other: [o] };
    }

    const days = PERIODS[period].days;
    const labels = [];
    const pos = [], web = [], other = [];

    const step = days <= 7 ? 1 : (days <= 30 ? 5 : 30);
    for(let i = days - 1; i >= 0; i -= step){
      const d = new Date(baseDate);
      d.setDate(d.getDate() - i);
      labels.push(d.toLocaleDateString('en-US', { month:'short', day:'numeric' }));

      const dayISO = iso(d);

      let p = 0, w = 0, o = 0;
      SALES.forEach(r => {
        if(r.date === dayISO){
          if(r.type === 'POS') p += r.revenue;
          else if(r.type === 'Website') w += r.revenue;
          else o += r.revenue;
        }
      });
      pos.push(p); web.push(w); other.push(o);
    }
    return { labels, pos, web, other };
  }

  function drawChart(animate){
    const canvas = $('#salesChart');
    if(!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.parentElement.getBoundingClientRect();
    const W = rect.width, H = rect.height;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.scale(dpr, dpr);

    const data = chartData;
    if(!data.labels.length) return;

    const padL = 52, padR = 18, padT = 18, padB = 34;
    const cw = W - padL - padR;
    const ch = H - padT - padB;

    const allVals = [...data.pos, ...data.web, ...data.other];
    const maxVal = Math.max(...allVals, 1);
    const niceMax = Math.ceil(maxVal / 1000) * 1000 || 1000;

    ctx.clearRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(245,213,222,0.65)';
    ctx.lineWidth = 1;
    ctx.font = '10px Inter, sans-serif';
    ctx.fillStyle = '#8A7780';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    const gridLines = 4;
    for(let i = 0; i <= gridLines; i++){
      const y = padT + (ch / gridLines) * i;
      const val = niceMax - (niceMax / gridLines) * i;
      ctx.beginPath();
      ctx.moveTo(padL, y);
      ctx.lineTo(W - padR, y);
      ctx.stroke();
      ctx.fillText(peso(val), padL - 8, y);
    }

    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const n = data.labels.length;
    const stepX = n > 1 ? cw / (n - 1) : cw;

    data.labels.forEach((lbl, i) => {
      const x = padL + stepX * i;
      if(n <= 14 || i % Math.ceil(n / 7) === 0){
        ctx.fillStyle = '#8A7780';
        ctx.fillText(lbl, x, H - padB + 8);
      }
    });

    const progress = animate ? chartAnim : 1;

    function drawSeries(arr, color, fillColor){
      const pts = arr.map((v, i) => {
        const x = padL + stepX * i;
        const y = padT + ch - (v / niceMax) * ch * progress;
        return { x, y };
      });
      if(!pts.length) return;

      ctx.beginPath();
      ctx.moveTo(pts[0].x, padT + ch);
      pts.forEach(p => ctx.lineTo(p.x, p.y));
      ctx.lineTo(pts[pts.length - 1].x, padT + ch);
      ctx.closePath();
      ctx.fillStyle = fillColor;
      ctx.fill();

      ctx.beginPath();
      pts.forEach((p, i) => {
        if(i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.2;
      ctx.lineJoin = 'round';
      ctx.stroke();

      pts.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.fill();
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.8;
        ctx.stroke();
      });
    }

    drawSeries(data.other, '#278879', 'rgba(39,136,121,0.08)');
    drawSeries(data.web, '#3E7C9E', 'rgba(62,124,158,0.08)');
    drawSeries(data.pos, '#C56F91', 'rgba(197,111,145,0.10)');
  }

  function animateChart(){
    chartAnim = 0;
    const start = performance.now();
    const dur = 650;
    function tick(now){
      const t = Math.min((now - start) / dur, 1);
      chartAnim = t;
      drawChart(true);
      if(t < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  /* ============================================================
     RENDER — PRODUCT TABLE (5 SAMPLE ITEMS)
     ============================================================ */
  function renderProductTable(records){
    const agg = aggregate(records);
    let items = Object.values(agg.byProduct);

    // Sort by top sellers (units)
    items.sort((a,b) => b.orders - a.orders);
    items = items.slice(0, 5);

    const total = agg.totalRevenue || 1;
    const tbody = $('#productBody');
    tbody.innerHTML = items.map(p => {
      const barW = Math.min((p.revenue / total) * 100, 100);
      return '<tr>' +
        '<td>' + esc(p.product) + '</td>' +
        '<td><span class="status-badge badge-pink" style="font-size:10px;">' + esc(p.category) + '</span></td>' +
        '<td class="num">' + p.orders + '</td>' +
        '<td class="num">' + peso(p.revenue) + '</td>' +
        '<td><div class="row-bar"><span style="width:' + barW + '%"></span></div></td>' +
      '</tr>';
    }).join('');

    $('#tableCount').textContent = items.length + ' item' + (items.length === 1 ? '' : 's');
    $('#productEmpty').style.display = items.length ? 'none' : 'block';
    $('#productTable').style.display = items.length ? '' : 'none';
  }

  /* ============================================================
     MASTER REFRESH
     ============================================================ */
  function refresh(){
    const records = SALES.filter(r => inPeriod(r, currentPeriod));
    renderKPIs(records);
    renderStrip(records);
    chartData = buildChartData(currentPeriod);
    animateChart();
    renderProductTable(records);
  }

  /* ============================================================
     PERIOD PILLS (inside graph)
     ============================================================ */
  $('#periodPills').addEventListener('click', e => {
    const pill = e.target.closest('.chart-period-pill');
    if(!pill) return;
    $$('.chart-period-pill').forEach(p => p.classList.remove('active'));
    pill.classList.add('active');
    currentPeriod = pill.dataset.period;
    refresh();
  });

  /* ============================================================
     RESIZE
     ============================================================ */
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => drawChart(false), 120);
  });

  /* ============================================================
     EXPORT CSV
     ============================================================ */
  $('#exportBtn').addEventListener('click', () => {
    const records = SALES.filter(r => inPeriod(r, currentPeriod));
    const agg = aggregate(records);
    const rows = [['Product / Service','Category','Units Sold','Total Sales (PHP)']];
    Object.values(agg.byProduct)
      .sort((a,b) => b.orders - a.orders)
      .forEach(p => {
        rows.push([p.product, p.category, p.orders, p.revenue]);
      });

    const csv = rows.map(r => r.map(v => '"' + String(v).replace(/"/g,'""') + '"').join(',')).join('\n');
    const blob = new Blob([csv], { type:'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'angeliz-sales-' + currentPeriod + '-' + iso(baseDate) + '.csv';
    a.click();
    URL.revokeObjectURL(url);
    toast('CSV exported for ' + currentPeriod + ' sales.');
  });

  window.refreshSalesFinancialReports = refresh;

})();

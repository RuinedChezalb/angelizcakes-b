
  // ---------- DATA ----------
  // Specialty offerings shown in the chart
  const channels = [
    { key:'cakes', label:'Custom Cakes', color:'#E8A0B5' },
    { key:'grazing', label:'Grazing Tables', color:'#5EEAD4' },
    { key:'pastry', label:'Pastry Buffets', color:'#A8C8E8' },
    { key:'party', label:'Party Packages', color:'#D47A97' },
    { key:'bundles', label:'Food Bundles', color:'#0F766E' }
  ];

  // Values per period: [custom cakes, grazing tables, pastry buffets, party packages, food bundles]
  const chartData = {
    today: [1550, 1050, 630, 430, 300],
    weekly: [7000, 4900, 3400, 2100, 1500],
    monthly: [24700, 18000, 13200, 6500, 7500],
    yearly: [247000, 180000, 132000, 65000, 75000]
  };

  // KPI data per period
  const kpiData = {
    today:   { overall:'₱8,450', overallDelta:'▲ 12.7% vs yesterday', cakes:'₱1,550', cakesDelta:'▲ 9.1% vs yesterday', packages:'₱2,410', packagesDelta:'▲ 6.8% vs yesterday', posSales:'₱2,180', posSalesDelta:'▲ 8.2% vs yesterday' },
    weekly:  { overall:'₱31,000', overallDelta:'▲ 12.4% vs last week', cakes:'₱7,000', cakesDelta:'▲ 8.7% vs last week', packages:'₱11,900', packagesDelta:'▲ 6.4% vs last week', posSales:'₱10,900', posSalesDelta:'▲ 7.6% vs last week' },
    monthly: { overall:'₱113,700', overallDelta:'▲ 14.2% vs last month', cakes:'₱24,700', cakesDelta:'▲ 13.1% vs last month', packages:'₱45,200', packagesDelta:'▲ 8.9% vs last month', posSales:'₱48,200', posSalesDelta:'▲ 9.4% vs last month' },
    yearly:  { overall:'₱1,137,000', overallDelta:'▲ 22.4% vs last year', cakes:'₱247,000', cakesDelta:'▲ 18.6% vs last year', packages:'₱452,000', packagesDelta:'▲ 15.3% vs last year', posSales:'₱478,200', posSalesDelta:'▲ 16.8% vs last year' }
  };

  // ---------- STATE ----------
  let reportPeriod = 'today';

  const fmtShort = n => {
    if (n >= 1000000) return '₱' + (n/1000000).toFixed(1) + 'M';
    if (n >= 1000)    return '₱' + (n/1000).toFixed(1) + 'k';
    return '₱' + n;
  };
  const fmtFull = n => '₱' + n.toLocaleString('en-PH');

  // ---------- OFFERING BAR CHART ----------
  const svg = document.getElementById('lineChart');
  const W = 800, H = 300;
  const padL = 64, padR = 24, padT = 24, padB = 44;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  function renderChart() {
    const offeringItems = channels.map((channel, index) => ({
      label: channel.label,
      value: chartData[reportPeriod][index],
      color: channel.color
    }));
    const maxVal = Math.max(...offeringItems.map(item => item.value), 1);
    const step = niceStep(maxVal);
    const yMax = Math.ceil(maxVal / step) * step;
    const yFor = v => padT + plotH - (v / yMax) * plotH;
    const groupW = plotW / offeringItems.length;
    const groupStart = i => padL + i * groupW;
    let parts = [];

    const gridCount = 4;
    for (let g = 0; g <= gridCount; g++) {
      const val = (yMax / gridCount) * g;
      const y = yFor(val);
      parts.push(`<line x1="${padL}" y1="${y}" x2="${W-padR}" y2="${y}" stroke="#FCE4EA" stroke-width="1"/>`);
      parts.push(`<text x="${padL-10}" y="${y+4}" text-anchor="end" font-size="11" fill="#8B6B78" font-family="Inter,sans-serif">${fmtShort(val)}</text>`);
    }

    offeringItems.forEach((item, i) => {
      const center = groupStart(i) + groupW / 2;
      const barWidth = Math.min(groupW * 0.42, 90);
      const x = center - barWidth / 2;
      const y = yFor(item.value);
      const height = yFor(0) - y;

      parts.push(`<text x="${center}" y="${H-14}" text-anchor="middle" font-size="11" fill="#8B6B78" font-family="Inter,sans-serif">${item.label}</text>`);
      parts.push(`<rect x="${x}" y="${y}" width="${barWidth}" height="${height}" rx="7" fill="${item.color}"/>`);
      parts.push(`<text x="${center}" y="${y-9}" text-anchor="middle" font-size="10" font-weight="700" fill="#0F766E" font-family="Inter,sans-serif">${fmtFull(item.value)}</text>`);
    });

    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.innerHTML = parts.join('');

  }

  function niceStep(max) {
    const raw = max / 4;
    const mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const norm = raw / mag;
    let nice;
    if (norm <= 1) nice = 1;
    else if (norm <= 2) nice = 2;
    else if (norm <= 5) nice = 5;
    else nice = 10;
    return nice * mag;
  }

  // ---------- PERIOD FILTER ----------
  const periodButtons = document.querySelectorAll('#periodBar .btn');
  function setPeriod(period) {
    reportPeriod = period;
    periodButtons.forEach(b => b.classList.toggle('active', b.dataset.period === period));

    const k = kpiData[period];
    document.getElementById('kpiOverall').textContent = k.overall;
    document.getElementById('kpiOverallDelta').textContent = k.overallDelta;
    document.getElementById('kpiCakes').textContent = k.cakes;
    document.getElementById('kpiCakesDelta').textContent = k.cakesDelta;
    document.getElementById('kpiPackages').textContent = k.packages;
    document.getElementById('kpiPackagesDelta').textContent = k.packagesDelta;
    document.getElementById('kpiPosSales').textContent = k.posSales;
    document.getElementById('kpiPosSalesDelta').textContent = k.posSalesDelta;

    renderChart();
  }
  periodButtons.forEach(btn => btn.addEventListener('click', () => setPeriod(btn.dataset.period)));

  // ---------- INIT ----------
  renderChart();
  setPeriod('today');


/* Sales data — "today" filter removed; only weekly, monthly, yearly. */
const salesData = {
  weekly: {
    labels: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],
    visibleCount: 5,
    main:    { website:[5200,6100,5800,6500,7200,8500,7900], pos:[3900,4400,4100,4700,5100,6200,5500], grabfood:[2500,2700,2600,2900,3100,3800,3400] },
    yashano: { website:[3500,4000,3800,4300,4700,5600,5200], pos:[2400,2800,2600,2900,3200,3800,3400], grabfood:[1500,1600,1500,1700,1800,2200,2000] }
  },
  monthly: {
    labels: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
    visibleCount: 5,
    main: {
      website:[42000,45000,48000,46500,51000,53500,52000,56000,57500,59000,62000,68000],
      pos:[31500,33000,35000,34200,37800,39400,38200,41000,42500,43800,46200,49800],
      grabfood:[21000,22000,23500,22800,24800,25800,25200,27000,27800,28600,30000,32500]
    },
    yashano: {
      website:[28000,29500,32000,31500,34000,35500,34800,37000,38200,39000,41000,45000],
      pos:[19500,21000,22500,21900,23800,24800,24200,25700,26600,27400,28900,31500],
      grabfood:[12500,13000,14000,13700,14800,15500,15100,16100,16600,17100,18000,19500]
    }
  },
  yearly: {
    labels: Array.from({length:10}, (_, index) => String(new Date().getFullYear() - 9 + index)),
    visibleCount: 5,
    main:    { website:[280000,310000,345000,380000,430000,480000,510000,545000,590000,635000], pos:[200000,220000,245000,275000,310000,360000,385000,415000,450000,490000], grabfood:[120000,135000,150000,170000,190000,220000,238000,260000,285000,315000] },
    yashano: { website:[180000,200000,225000,250000,280000,330000,350000,380000,415000,450000], pos:[130000,145000,165000,185000,210000,245000,265000,290000,320000,350000], grabfood:[80000,90000,105000,118000,135000,155000,170000,188000,205000,225000] }
  }
};
const channelColors = {website:'#2DD4BF', pos:'#D47A97', grabfood:'#A8C8E8'};
const channelLabels = {website:'Website', pos:'POS', grabfood:'GrabFood'};

let currentPeriod = 'weekly';
let activeBranch = null; // null = show all branches; 'main' or 'yashano' = filter to that branch

function fmt(n){
  if(n>=1000000) return '₱'+(n/1000000).toFixed(1)+'M';
  if(n>=1000) return '₱'+(n/1000).toFixed(n>=10000?0:1)+'k';
  return '₱'+n;
}
function sum(arr){return arr.reduce((a,b)=>a+b,0);}

function renderSales(key){
  const d = salesData[key];
  const n = d.labels.length;

  /* ----- Summary tiles per branch, each with 3-channel breakdown ----- */
  const totals = {
    main:    {website:sum(d.main.website), pos:sum(d.main.pos), grabfood:sum(d.main.grabfood)},
    yashano: {website:sum(d.yashano.website), pos:sum(d.yashano.pos), grabfood:sum(d.yashano.grabfood)}
  };
  totals.main.total    = totals.main.website    + totals.main.pos    + totals.main.grabfood;
  totals.yashano.total = totals.yashano.website + totals.yashano.pos + totals.yashano.grabfood;
  const grand = totals.main.total + totals.yashano.total;

  /* Branch name + channels on the SAME row — channels positioned at the right side */
  const tile = (cls, name, t) => `
    <div class="summary-tile ${cls} ${activeBranch === cls ? 'active-filter' : ''}" onclick="toggleBranch('${cls}')" role="button" tabindex="0" aria-pressed="${activeBranch === cls}">
      <div class="summary-header">
        <div class="summary-left">
          <div class="summary-branch">${name}</div>
          <div class="summary-value">${fmt(t.total)}</div>
          <div class="summary-share">${((t.total/grand)*100).toFixed(1)}% of total</div>
        </div>
        <div class="summary-channels">
          <span><span class="summary-dot" style="background:${channelColors.website};"></span><span class="summary-channel-name">Website</span><strong>${fmt(t.website)}</strong></span>
          <span><span class="summary-dot" style="background:${channelColors.pos};"></span><span class="summary-channel-name">POS</span><strong>${fmt(t.pos)}</strong></span>
          <span><span class="summary-dot" style="background:${channelColors.grabfood};"></span><span class="summary-channel-name">GrabFood</span><strong>${fmt(t.grabfood)}</strong></span>
        </div>
      </div>
    </div>`;

  document.getElementById('salesSummary').innerHTML =
    tile('main','Main Branch', totals.main) +
    tile('yashano','Yashano Mall Branch', totals.yashano);

  /* ----- Line chart ----- */
  const svg = document.getElementById('salesLineChart');
  if (!svg) return;

  const W = 900, H = 280, padL = 64, padR = 24, padT = 24, padB = 44;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  const source = activeBranch === 'main' ? d.main : activeBranch === 'yashano' ? d.yashano
    : {
      website: d.main.website.map((v,i) => v + d.yashano.website[i]),
      pos: d.main.pos.map((v,i) => v + d.yashano.pos[i]),
      grabfood: d.main.grabfood.map((v,i) => v + d.yashano.grabfood[i])
    };
  const channelKeys = ['website','pos','grabfood'];
  const allValues = channelKeys.flatMap(key => source[key]);
  const rawMax = Math.max(...allValues, 1);
  const rawStep = rawMax / 4;
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const normalized = rawStep / magnitude;
  const niceNormalized = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  const step = niceNormalized * magnitude;
  const yMax = Math.ceil(rawMax / step) * step;
  const xStep = plotW / Math.max(n - 1, 1);
  const xFor = i => padL + i * xStep;
  const yFor = v => padT + plotH - (v / yMax) * plotH;
  const parts = [];

  for (let g = 0; g <= 4; g++) {
    const value = (yMax / 4) * g;
    const y = yFor(value);
    parts.push(`<line x1="${padL}" y1="${y}" x2="${W-padR}" y2="${y}" stroke="#FCE4EA" stroke-width="1"/>`);
    parts.push(`<text x="${padL-10}" y="${y+4}" text-anchor="end" font-size="11" fill="#8B6B78" font-family="Inter,sans-serif">${fmt(value)}</text>`);
  }

  d.labels.forEach((label,i) => {
    parts.push(`<text x="${xFor(i)}" y="${H-14}" text-anchor="middle" font-size="11" fill="#8B6B78" font-family="Inter,sans-serif">${label}</text>`);
  });

  const fillColors = {
    website: ['#2DD4BF', 'rgb(45, 212, 191)'],
    pos: ['#D47A97', 'rgb(212, 122, 151)'],
    grabfood: ['#A8C8E8', 'rgb(168, 200, 232)']
  };

  parts.push('<defs>');
  channelKeys.forEach(key => {
    parts.push(`<linearGradient id="dashboardFill-${key}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${fillColors[key][0]}" stop-opacity="0.24"/>
      <stop offset="100%" stop-color="${fillColors[key][0]}" stop-opacity="0"/>
    </linearGradient>`);
  });
  parts.push('</defs>');

  channelKeys.forEach(key => {
    const values = source[key];
    const points = values.map((v,i) => `${xFor(i)},${yFor(v)}`).join(' ');
    const baselineY = yFor(0);
    const areaPoints = `${padL},${baselineY} ${points} ${xFor(n-1)},${baselineY}`;
    parts.push(`<polygon points="${areaPoints}" fill="url(#dashboardFill-${key})"/>`);
    parts.push(`<polyline points="${points}" fill="none" stroke="${channelColors[key]}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>`);
    values.forEach((v,i) => {
      const x = xFor(i);
      const y = yFor(v);
      const branchLabel = activeBranch === 'main' ? 'Main Branch'
        : activeBranch === 'yashano' ? 'Yashano Mall Branch'
        : 'Both Branches';
      const label = `${channelLabels[key]} — ${branchLabel}`;
      parts.push(`<circle class="chart-point" tabindex="0" role="button" aria-label="${label}: ${fmt(v)}" data-label="${label}" data-value="${fmt(v)}" data-x="${x}" data-y="${y}" cx="${x}" cy="${y}" r="6" fill="#FFFFFF" stroke="${channelColors[key]}" stroke-width="3"/>`);
    });
  });

  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.innerHTML = parts.join('');
  bindSalesChartTooltips(svg, W, H);
}

function bindSalesChartTooltips(svg, viewWidth, viewHeight) {
  const tooltip = document.getElementById('salesChartTooltip');
  const chartBox = tooltip ? tooltip.parentElement : null;
  if (!tooltip || !chartBox) return;

  const showTooltip = point => {
    const box = chartBox.getBoundingClientRect();
    const svgRect = svg.getBoundingClientRect();
    const pointX = Number(point.dataset.x) / viewWidth * svgRect.width;
    const pointY = Number(point.dataset.y) / viewHeight * svgRect.height;
    tooltip.innerHTML = `<strong>${point.dataset.label}</strong>${point.dataset.value}`;
    tooltip.hidden = false;

    const tooltipWidth = tooltip.offsetWidth;
    const left = Math.min(
      box.width - tooltipWidth - 8,
      Math.max(8, pointX - tooltipWidth / 2)
    );
    const top = Math.max(8, pointY - tooltip.offsetHeight - 14);
    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
  };

  const hideTooltip = () => {
    tooltip.hidden = true;
  };

  svg.querySelectorAll('.chart-point').forEach(point => {
    point.addEventListener('mouseenter', () => showTooltip(point));
    point.addEventListener('mouseleave', hideTooltip);
    point.addEventListener('focus', () => showTooltip(point));
    point.addEventListener('blur', hideTooltip);
  });
}

function toggleBranch(branch){
  // Clicking the active branch clears the filter; clicking a different one sets it.
  activeBranch = (activeBranch === branch) ? null : branch;
  renderSales(currentPeriod);
}

function switchSales(key, btn){
  currentPeriod = key;
  document.querySelectorAll('.chart-tab').forEach(t=>t.classList.remove('active'));
  btn.classList.add('active');
  renderSales(key);
}

const feedbackSamples = {
  5: [
    {name:'A. Reyes', comment:'The cake was beautiful, fresh, and exactly what we wanted.'},
    {name:'M. Santos', comment:'Friendly service and the dessert table was a hit.'},
    {name:'J. Cruz', comment:'Everything arrived on time and tasted wonderful.'}
  ],
  4: [
    {name:'L. Garcia', comment:'Great flavor and presentation. Pickup took a little longer than expected.'},
    {name:'R. Mendoza', comment:'Loved the cupcakes and the staff was helpful.'},
    {name:'C. Dela Cruz', comment:'Delicious desserts. I would appreciate more flavor options.'}
  ],
  3: [
    {name:'P. Flores', comment:'The cake was good, but the decoration differed slightly from the reference.'},
    {name:'E. Ramos', comment:'Overall fine; the pickup experience could be smoother.'},
    {name:'T. Villanueva', comment:'Tasted nice, though the portions were smaller than expected.'}
  ],
  2: [
    {name:'N. Bautista', comment:'The order was late and was not ready at the agreed time.'},
    {name:'D. Aquino', comment:'The frosting was sweeter than expected.'},
    {name:'S. Navarro', comment:'The handoff was confusing and took longer than expected.'}
  ],
  1: [
    {name:'B. Torres', comment:'My order was incorrect, and I could not reach anyone for help.'},
    {name:'G. Lim', comment:'The cake arrived damaged and the issue was not resolved.'},
    {name:'F. Mercado', comment:'There was a long wait and items were missing from the order.'}
  ]
};

const feedbackDialog = document.getElementById('feedbackDialog');
const feedbackDialogTitle = document.getElementById('feedbackDialogTitle');
const feedbackDialogSummary = document.getElementById('feedbackDialogSummary');
const feedbackDialogList = document.getElementById('feedbackDialogList');
const feedbackDialogClose = document.getElementById('feedbackDialogClose');

document.querySelectorAll('.fb-bar').forEach(bar => {
  bar.addEventListener('click', () => {
    const rating = Number(bar.dataset.feedbackRating);
    const reviews = feedbackSamples[rating];
    if (!reviews) throw new RangeError(`Unknown feedback rating: ${bar.dataset.feedbackRating}`);

    feedbackDialogTitle.textContent = `${rating}-star feedback`;
    feedbackDialogSummary.textContent =
      `Showing ${reviews.length} sample reviews from ${bar.dataset.reviewCount} overall reviews.`;
    feedbackDialogList.replaceChildren(...reviews.map(review => {
      const item = document.createElement('article');
      item.className = 'feedback-dialog-item';

      const heading = document.createElement('div');
      heading.className = 'feedback-dialog-item-header';

      const name = document.createElement('strong');
      name.className = 'feedback-dialog-name';
      name.textContent = review.name;

      const ratingLabel = document.createElement('span');
      ratingLabel.className = 'feedback-dialog-rating';
      ratingLabel.textContent = `${rating} ★`;

      const feedback = document.createElement('p');
      feedback.className = 'feedback-dialog-comment';
      feedback.textContent = review.comment;

      heading.append(name, ratingLabel);
      item.append(heading, feedback);
      return item;
    }));
    feedbackDialog.showModal();
  });
});

feedbackDialogClose.addEventListener('click', () => feedbackDialog.close());

const addGalleryPhotoButton = document.getElementById('addGalleryPhoto');
const galleryDialog = document.getElementById('galleryDialog');
const galleryDialogClose = document.getElementById('galleryDialogClose');
const galleryDialogCancel = document.getElementById('galleryDialogCancel');
const galleryDialogSave = document.getElementById('galleryDialogSave');
const galleryTitleInput = document.getElementById('galleryTitle');
const galleryFileInput = document.getElementById('galleryFile');
const galleryFormStatus = document.getElementById('galleryFormStatus');

addGalleryPhotoButton.addEventListener('click', () => {
  galleryTitleInput.value = '';
  galleryFileInput.value = '';
  galleryFormStatus.textContent = '';
  galleryDialog.showModal();
});

galleryDialogClose.addEventListener('click', () => galleryDialog.close());
galleryDialogCancel.addEventListener('click', () => galleryDialog.close());
galleryDialogSave.addEventListener('click', () => {
  const title = galleryTitleInput.value.trim();
  const file = galleryFileInput.files[0];
  if (!title) {
    galleryFormStatus.textContent = 'Enter a photo title.';
    galleryTitleInput.focus();
    return;
  }
  if (!file) {
    galleryFormStatus.textContent = 'Choose a photo to upload.';
    galleryFileInput.focus();
    return;
  }
  if (!file.type.startsWith('image/')) {
    galleryFormStatus.textContent = 'Choose a valid image file.';
    galleryFileInput.focus();
    return;
  }

  const reader = new FileReader();
  reader.addEventListener('load', () => {
    if (typeof reader.result !== 'string') {
      galleryFormStatus.textContent = 'The selected image could not be loaded.';
      return;
    }

    const card = document.createElement('article');
    card.className = 'gallery-card';
    const thumbnail = document.createElement('div');
    thumbnail.className = 'gallery-thumb';
    const image = document.createElement('img');
    image.src = reader.result;
    image.alt = title;
    const caption = document.createElement('div');
    caption.className = 'gallery-caption';
    const captionTitle = document.createElement('div');
    captionTitle.className = 'strong';
    captionTitle.textContent = title;
    thumbnail.append(image);
    caption.append(captionTitle);
    card.append(thumbnail, caption);
    document.getElementById('galleryGrid').append(card);
    galleryDialog.close();
  });
  reader.addEventListener('error', () => {
    galleryFormStatus.textContent = 'The selected image could not be read.';
  });
  reader.readAsDataURL(file);
});

renderSales('weekly');

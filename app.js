/* ===================================
   MASHREQ AI — Loan Assessment Engine
   Mock ML model — no API required
=================================== */

// ─── OPTION BUTTONS ──────────────────────────────────────
const TOTAL_FIELDS = 11;
let selectedCount = 0;

document.querySelectorAll('.btn-group').forEach(group => {
  group.querySelectorAll('.option-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const wasSelected = btn.classList.contains('selected');
      const hadSelected = group.querySelector('.option-btn.selected');
      group.querySelectorAll('.option-btn').forEach(b => b.classList.remove('selected'));
      if (!wasSelected) {
        btn.classList.add('selected');
        if (!hadSelected) selectedCount++;
      } else {
        selectedCount--;
      }
      updateProgress();
    });
  });
});

function updateProgress() {
  const fill = document.getElementById('progressFill');
  const text = document.getElementById('progressText');
  if (!fill || !text) return;
  const pct = Math.min((selectedCount / TOTAL_FIELDS) * 100, 100);
  fill.style.width = pct + '%';
  text.textContent = Math.min(selectedCount, TOTAL_FIELDS) + ' / ' + TOTAL_FIELDS + ' completed';
}

function getSelected(groupId) {
  const group = document.getElementById(groupId);
  if (!group) return null;
  const sel = group.querySelector('.option-btn.selected');
  return sel ? sel.dataset.value : null;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ─── SCORING MODEL ───────────────────────────────────────
// Simulates ML scoring with weighted factors (0-100)

function scoreEmployment(val) {
  const map = { government: 95, private_large: 82, private_sme: 65, self_employed: 52, freelance: 40 };
  return map[val] || 60;
}

function scoreSalary(val) {
  // EGP-adjusted salary bands
  const map = { above_40k: 95, '15k_40k': 82, '7k_15k': 65, '3k_7k': 42, under_3k: 22 };
  return map[val] || 50;
}

function scoreTenure(val) {
  const map = { above_7: 95, '3_7': 80, '1_3': 60, under_1: 35 };
  return map[val] || 55;
}

function scoreMarital(val) {
  const map = { married: 78, single: 70, divorced: 62, widowed: 60 };
  return map[val] || 65;
}

function scoreDependents(val) {
  const map = { '0': 85, '1-2': 75, '3-4': 58, '5+': 40 };
  return map[val] || 65;
}

function scoreEducation(val) {
  const map = { postgraduate: 88, bachelor: 80, diploma: 68, high_school: 58 };
  return map[val] || 65;
}

function scoreProperty(val) {
  const map = { yes_owned: 92, yes_mortgage: 70, no_renting: 55, no_family: 60 };
  return map[val] || 60;
}

function scoreVehicle(val) {
  const map = { yes_owned: 80, yes_financed: 60, no: 65 };
  return map[val] || 65;
}

function scoreObligations(val) {
  // EGP-adjusted obligation bands
  const map = { none: 95, under_1500: 78, '1500_4k': 58, '4k_8k': 36, above_8k: 16 };
  return map[val] || 60;
}

function scoreDefault(val) {
  const map = { none: 95, late_minor: 60, late_major: 30, defaulted: 5 };
  return map[val] || 60;
}

function scoreLoanAmount(val, salary) {
  // EGP loan amount vs salary ratio
  const salaryMap = { above_40k: 5, '15k_40k': 4, '7k_15k': 3, '3k_7k': 2, under_3k: 1 };
  const amountMap  = { under_20k: 1, '20k_60k': 2, '60k_200k': 3, '200k_600k': 4, above_600k: 5 };
  const ratio = (amountMap[val] || 3) / (salaryMap[salary] || 3);
  if (ratio <= 0.5) return 92;
  if (ratio <= 1)   return 80;
  if (ratio <= 1.5) return 65;
  if (ratio <= 2)   return 48;
  return 28;
}

function scoreLoanPurpose(val) {
  const map = { home: 80, education: 82, auto: 72, business: 58, medical: 85, personal: 52 };
  return map[val] || 65;
}

// WEIGHTED COMPOSITE SCORE
function computeScore(d) {
  const weights = {
    employment:  0.18,
    salary:      0.20,
    tenure:      0.10,
    obligations: 0.18,
    defaults:    0.16,
    property:    0.06,
    marital:     0.04,
    dependents:  0.03,
    education:   0.02,
    vehicle:     0.01,
    purpose:     0.02,
  };

  const scores = {
    employment:  scoreEmployment(d.employment),
    salary:      scoreSalary(d.salary),
    tenure:      scoreTenure(d.tenure),
    obligations: scoreObligations(d.obligations),
    defaults:    scoreDefault(d.defaults),
    property:    scoreProperty(d.property),
    marital:     scoreMarital(d.marital),
    dependents:  scoreDependents(d.dependents),
    education:   scoreEducation(d.education),
    vehicle:     scoreVehicle(d.vehicle),
    purpose:     scoreLoanPurpose(d.loanPurpose),
  };

  let weighted = 0;
  for (const key in weights) {
    weighted += (scores[key] * weights[key]);
  }

  // Loan amount vs salary ratio modifier
  const loanScore = scoreLoanAmount(d.loanAmount, d.salary);
  weighted = weighted * 0.88 + loanScore * 0.12;

  return { total: Math.round(weighted), breakdown: scores };
}

// ─── SEGMENT CLASSIFICATION ──────────────────────────────
function classifySegment(score) {
  if (score >= 78) return { tier: 'PRIME', label: 'Reliable Payer', color: '#2E7D32' };
  if (score >= 60) return { tier: 'STANDARD', label: 'Moderate Risk', color: '#F57F17' };
  if (score >= 44) return { tier: 'CAUTION', label: 'Borderline Case', color: '#E65100' };
  return { tier: 'HIGH RISK', label: 'Elevated Risk', color: '#C62828' };
}

// ─── VERDICT ─────────────────────────────────────────────
function getVerdict(score, segment) {
  if (score >= 78) {
    return {
      type: 'approve',
      badge: 'RECOMMENDED: APPROVE',
      icon: '✅',
      title: 'RECOMMENDED FOR APPROVAL',
      sub: 'Strong financial profile with low default risk. Proceed with standard or preferential terms.',
    };
  }
  if (score >= 60) {
    return {
      type: 'review',
      badge: 'RECOMMENDED: REVIEW',
      icon: '⚠️',
      title: 'REQUIRES MANUAL REVIEW',
      sub: 'Moderate risk profile identified. Recommend manual credit officer review before proceeding.',
    };
  }
  if (score >= 44) {
    return {
      type: 'review',
      badge: 'RECOMMENDED: REVIEW + CONDITIONS',
      icon: '🔍',
      title: 'PROCEED WITH CONDITIONS',
      sub: 'Elevated risk detected. Consider conditional approval with collateral or co-signer requirement.',
    };
  }
  return {
    type: 'decline',
    badge: 'RECOMMENDED: DECLINE',
    icon: '❌',
    title: 'NOT RECOMMENDED FOR APPROVAL',
    sub: 'High default risk profile. Application does not meet minimum credit criteria at this time.',
  };
}

// ─── POSITIVE / NEGATIVE FACTORS ─────────────────────────
function buildFactors(d, breakdown) {
  const positive = [];
  const negative = [];

  if (breakdown.employment >= 80)  positive.push('✓ Stable, high-trust employment type');
  if (breakdown.salary >= 80)      positive.push('✓ Strong income level relative to loan size');
  if (breakdown.tenure >= 75)      positive.push('✓ Long employment tenure demonstrates stability');
  if (breakdown.obligations >= 80) positive.push('✓ Low existing monthly obligations');
  if (breakdown.defaults >= 90)    positive.push('✓ Clean credit history — no previous defaults');
  if (breakdown.property >= 85)    positive.push('✓ Fully owned property provides strong collateral');
  if (breakdown.education >= 85)   positive.push('✓ High education level correlates with income stability');
  if (breakdown.purpose >= 80)     positive.push('✓ Loan purpose has historically low default rates');

  if (breakdown.employment < 55)   negative.push('⚠ Employment type carries elevated income instability risk');
  if (breakdown.salary < 50)       negative.push('⚠ Income level may be insufficient for requested amount');
  if (breakdown.tenure < 45)       negative.push('⚠ Short employment tenure increases instability risk');
  if (breakdown.obligations < 45)  negative.push('⚠ High existing obligations significantly impact repayment capacity');
  if (breakdown.defaults < 35)     negative.push('⚠ Previous default or late payment history detected');
  if (breakdown.dependents < 50)   negative.push('⚠ High number of dependents increases financial burden');
  if (breakdown.purpose < 60)      negative.push('⚠ Loan purpose category has elevated historical default rate');

  return {
    positive: positive.length ? positive : ['✓ Profile meets baseline eligibility requirements'],
    negative: negative.length ? negative : ['No major risk flags identified in this profile'],
  };
}

// ─── CONDITIONS & NEXT STEPS ─────────────────────────────
function buildConditions(score, d, segment) {
  const conditions = [];

  if (score >= 78) {
    conditions.push('→ معالجة الطلب عبر مسار الموافقة العادي');
    conditions.push('→ عرض سعر فائدة بين 18% – 22% بناءً على التقييم النهائي');
    conditions.push('→ تأمين على القرض موصى به');
    conditions.push('→ جدولة الصرف بعد التحقق من المستندات');
  } else if (score >= 60) {
    conditions.push('→ إحالة إلى مسؤول ائتمان أول للمراجعة اليدوية');
    conditions.push('→ طلب كشف حساب بنكي لآخر 6 أشهر');
    conditions.push('→ نطاق الفائدة: 27% – 32% حسب نتيجة المراجعة');
    conditions.push('→ تأمين على القرض إلزامي');
  } else if (score >= 44) {
    conditions.push('→ موافقة مشروطة — يُشترط ضامن أو ضمانات عينية');
    conditions.push('→ تخفيض المبلغ المطلوب بنسبة 30–50% عند الموافقة');
    conditions.push('→ سعر الفائدة: 38% – 45% مع شرط مراجعة ربع سنوية');
    conditions.push('→ طلب مستندات مالية شاملة لآخر 12 شهراً');
    conditions.push('→ إثبات عدم وجود نزاعات قانونية أو مالية قائمة');
  } else {
    conditions.push('→ رفض الطلب وإصدار خطاب رفض رسمي');
    conditions.push('→ إرشاد العميل بخطوات تحسين السجل الائتماني لإعادة التقديم بعد 12 شهراً');
    conditions.push('→ إحالة إلى قسم الاستشارات المالية في المشرق لخيارات إعادة هيكلة الديون');
    conditions.push('→ توثيق أسباب الرفض في نظام CRM وفق المتطلبات التنظيمية');
  }

  return conditions;
}

// ─── SUGGESTED INTEREST RATE ─────────────────────────────
function suggestedRate(score) {
  // Egyptian market rates (higher base than AED)
  if (score >= 88) return '18% – 22%';
  if (score >= 78) return '22% – 27%';
  if (score >= 68) return '27% – 32%';
  if (score >= 55) return '32% – 38%';
  if (score >= 44) return '38% – 45%';
  return 'N/A — رفض';
}

// ─── SCORE BAR DATA ──────────────────────────────────────
function buildScoreBars(breakdown) {
  return [
    { label: 'Income & Salary',      val: breakdown.salary,      cls: breakdown.salary >= 70 ? 'bar-good' : breakdown.salary >= 50 ? 'bar-medium' : 'bar-bad' },
    { label: 'Employment Stability', val: breakdown.employment,  cls: breakdown.employment >= 70 ? 'bar-good' : breakdown.employment >= 50 ? 'bar-medium' : 'bar-bad' },
    { label: 'Credit History',       val: breakdown.defaults,    cls: breakdown.defaults >= 80 ? 'bar-good' : breakdown.defaults >= 50 ? 'bar-medium' : 'bar-bad' },
    { label: 'Debt-to-Income Ratio', val: breakdown.obligations, cls: breakdown.obligations >= 70 ? 'bar-good' : breakdown.obligations >= 45 ? 'bar-medium' : 'bar-bad' },
    { label: 'Asset Ownership',      val: breakdown.property,    cls: breakdown.property >= 70 ? 'bar-good' : breakdown.property >= 50 ? 'bar-medium' : 'bar-bad' },
    { label: 'Employment Tenure',    val: breakdown.tenure,      cls: breakdown.tenure >= 70 ? 'bar-good' : breakdown.tenure >= 45 ? 'bar-medium' : 'bar-bad' },
  ];
}

// ─── ANIMATE RING ─────────────────────────────────────────
function animateRing(score) {
  const circle = document.getElementById('resultRingCircle');
  if (!circle) return;
  const circumference = 452;
  const offset = circumference - (score / 100) * circumference;

  // Color based on score
  const color = score >= 78 ? '#4CAF50' : score >= 60 ? '#FF8C00' : score >= 44 ? '#FF6B00' : '#F44336';
  circle.setAttribute('stroke', color);

  setTimeout(() => {
    circle.style.transition = 'stroke-dashoffset 1.4s cubic-bezier(0.4,0,0.2,1)';
    circle.setAttribute('stroke-dashoffset', offset);
  }, 100);
}

// ─── ANIMATE SCORE BARS ───────────────────────────────────
function animateBars() {
  const fills = document.querySelectorAll('.score-bar-fill');
  fills.forEach((fill, i) => {
    const target = fill.dataset.target;
    setTimeout(() => {
      fill.style.width = target + '%';
    }, 200 + i * 120);
  });
}

// ─── MAIN: RUN ASSESSMENT ─────────────────────────────────
async function runAssessment() {
  const data = {
    marital:     getSelected('maritalGroup'),
    dependents:  getSelected('dependentsGroup'),
    education:   getSelected('educationGroup'),
    salary:      getSelected('salaryGroup'),
    employment:  getSelected('employmentGroup'),
    tenure:      getSelected('tenureGroup'),
    property:    getSelected('propertyGroup'),
    vehicle:     getSelected('vehicleGroup'),
    obligations: getSelected('obligationsGroup'),
    defaults:    getSelected('defaultGroup'),
    loanAmount:  getSelected('loanAmountGroup'),
    loanPurpose: getSelected('loanPurposeGroup'),
  };

  // Validate — need at least core fields
  const required = ['salary','employment','obligations','defaults','loanAmount'];
  const missing = required.filter(k => !data[k]);
  if (missing.length > 0) {
    alert('Please fill in at least: Salary, Employment Type, Existing Obligations, Credit History, and Loan Amount.');
    return;
  }

  const btn = document.getElementById('assessBtn');
  btn.innerHTML = '<span class="spinner"></span> RUNNING AI MODEL...';
  btn.classList.add('btn-loading');

  await sleep(2200);

  // COMPUTE
  const { total: score, breakdown } = computeScore(data);
  const segment  = classifySegment(score);
  const verdict  = getVerdict(score, segment);
  const factors  = buildFactors(data, breakdown);
  const conditions = buildConditions(score, data, segment);
  const bars     = buildScoreBars(breakdown);
  const rate     = suggestedRate(score);

  // POPULATE VERDICT HEADER
  const header = document.getElementById('verdictHeader');
  header.className = 'verdict-header verdict-' + verdict.type;
  document.getElementById('verdictBadge').textContent  = verdict.badge;
  document.getElementById('verdictIcon').textContent   = verdict.icon;
  document.getElementById('verdictTitle').textContent  = verdict.title;
  document.getElementById('verdictSub').textContent    = verdict.sub;

  // RING + METRICS
  document.getElementById('resultScore').textContent  = score + '%';
  document.getElementById('riskSegment').textContent  = segment.tier;
  document.getElementById('riskScore').textContent    = score + ' / 100';
  document.getElementById('suggestedRate').textContent = rate;

  // SCORE BARS
  const barsEl = document.getElementById('scoreBars');
  barsEl.innerHTML = bars.map(b => `
    <div class="score-bar-item">
      <div class="score-bar-label">${b.label}</div>
      <div class="score-bar-track">
        <div class="score-bar-fill ${b.cls}" data-target="${b.val}" style="width:0%"></div>
      </div>
      <div class="score-bar-value">${b.val}</div>
    </div>
  `).join('');

  // FACTORS
  document.getElementById('positiveFactors').innerHTML =
    factors.positive.map(f => `<li>${f}</li>`).join('');
  document.getElementById('negativeFactors').innerHTML =
    factors.negative.map(f => `<li>${f}</li>`).join('');

  // CONDITIONS
  document.getElementById('conditionsList').innerHTML =
    conditions.map(c => `<div class="condition-item">${c}</div>`).join('');

  // SHOW RESULT
  document.getElementById('assessForm').style.display   = 'none';
  document.getElementById('assessResult').style.display = 'block';
  window.scrollTo({ top: 0, behavior: 'smooth' });

  // ANIMATIONS
  setTimeout(() => {
    animateRing(score);
    animateBars();
  }, 100);

  // RESET BUTTON
  btn.innerHTML = 'RUN AI ASSESSMENT →';
  btn.classList.remove('btn-loading');
}

// ─── RESET ────────────────────────────────────────────────
function resetAssessment() {
  document.getElementById('assessForm').style.display   = 'block';
  document.getElementById('assessResult').style.display = 'none';
  document.querySelectorAll('.option-btn').forEach(b => b.classList.remove('selected'));
  selectedCount = 0;
  updateProgress();

  // Reset ring
  const circle = document.getElementById('resultRingCircle');
  if (circle) {
    circle.style.transition = 'none';
    circle.setAttribute('stroke-dashoffset', '452');
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ─── PRINT / EXPORT ───────────────────────────────────────
function printResult() {
  window.print();
}

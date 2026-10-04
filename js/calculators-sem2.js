/**
 * Интерактивные калькуляторы Семинара 2:
 * 1. Калькулятор Eh и показателя Кларка rH2 с диагностикой микробных зон.
 * 2. Биоэнергетический симулятор «Редокс-башня» (RedOx Tower) с расчетом ΔE°' и ΔG°'.
 * Курс «Пищевая микробиология, санитария и гигиена» • АТИ РУДН
 */

const CalculatorsSem2 = {
  // База стандартных потенциалов электродов сравнения (при 25°C)
  REF_ELECTRODES: {
    'ag_cl_sat': { name: 'Хлорсеребряный (Ag/AgCl, насыщ. KCl)', potential: 207.0 },
    'ag_cl_3m': { name: 'Хлорсеребряный (Ag/AgCl, 3.0 M KCl)', potential: 222.0 },
    'calomel_sat': { name: 'Насыщенный каломельный (Н.К.Э.)', potential: 244.0 },
    'she': { name: 'Нормальный водородный электрод (НВЭ)', potential: 0.0 }
  },

  // База редокс-пар для «Энергетической башни» (E°' при pH 7.0, вольты)
  REDOX_PAIRS: {
    // Доноры
    'glucose': { name: 'Глюкоза / CO₂', potential: -0.430, n: 2, role: 'donor' },
    'h2': { name: 'H₂ / 2H⁺', potential: -0.414, n: 2, role: 'donor' },
    'nadh': { name: 'NADH / NAD⁺', potential: -0.320, n: 2, role: 'donor' },
    'fadh2': { name: 'FADH₂ / FAD', potential: -0.219, n: 2, role: 'donor' },
    'lactate': { name: 'Лактат / Пируват', potential: -0.185, n: 2, role: 'donor' },
    'succinate': { name: 'Сукцинат / Фумарат', potential: 0.031, n: 2, role: 'donor' },
    // Акцепторы
    'o2': { name: 'O₂ / H₂O (Кислородное дыхание)', potential: 0.815, n: 2, role: 'acceptor' },
    'no3': { name: 'NO₃⁻ / NO₂⁻ (Нитратное дыхание)', potential: 0.433, n: 2, role: 'acceptor' },
    'fe3': { name: 'Fe³⁺ / Fe²⁺ (Железоредукция)', potential: 0.200, n: 1, role: 'acceptor' },
    'fumarate': { name: 'Фумарат / Сукцинат (Фумаратное дыхание)', potential: 0.031, n: 2, role: 'acceptor' },
    'so4': { name: 'SO₄²⁻ / H₂S (Сульфатредукция)', potential: -0.217, n: 2, role: 'acceptor' },
    'co2': { name: 'CO₂ / CH₄ (Метаногенез)', potential: -0.244, n: 2, role: 'acceptor' }
  },

  init() {
    this.bindEvents();
    this.calculateRh2();
    this.calculateRedoxTower();
  },

  bindEvents() {
    // Слушатели для калькулятора rH2
    const rh2Inputs = ['calc2-e-meas', 'calc2-ref-select', 'calc2-ph', 'calc2-temp'];
    rh2Inputs.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('input', () => this.calculateRh2());
        el.addEventListener('change', () => this.calculateRh2());
      }
    });

    // Слушатели для RedOx Tower
    const towerInputs = ['calc2-tower-donor', 'calc2-tower-acceptor'];
    towerInputs.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('change', () => this.calculateRedoxTower());
      }
    });
  },

  /**
   * 1. Расчет Eh и rH2 Кларка
   */
  calculateRh2() {
    const eMeasInput = document.getElementById('calc2-e-meas');
    const refSelect = document.getElementById('calc2-ref-select');
    const phInput = document.getElementById('calc2-ph');
    const tempInput = document.getElementById('calc2-temp');

    if (!eMeasInput || !refSelect || !phInput) return;

    const eMeas = parseFloat(eMeasInput.value) || 0;
    const refKey = refSelect.value || 'ag_cl_sat';
    const eRef = this.REF_ELECTRODES[refKey] ? this.REF_ELECTRODES[refKey].potential : 207.0;
    const ph = parseFloat(phInput.value) || 7.0;
    const tempC = tempInput ? (parseFloat(tempInput.value) || 25.0) : 25.0;
    const tempK = tempC + 273.15;

    // Температурный коэффициент Нернста: 2.3026 * R * T / F
    const R = 8.31446;
    const F = 96485.3;
    const nernstFactor = (2.302585 * R * tempK) / F; // ~0.05916 В при 25°C
    const clarkDenom = nernstFactor / 2.0;          // ~0.02958 В при 25°C

    // 1. Потенциал Eh относительно НВЭ
    const ehMv = eMeas + eRef;
    const ehV = ehMv / 1000.0;

    // 2. Критерий Кларка rH2
    const rh2 = (ehV + nernstFactor * ph) / clarkDenom;

    // Определение редокс-зоны и рисков
    let zoneTitle = '';
    let zoneClass = '';
    let zoneDesc = '';

    if (rh2 < 14.5) {
      zoneTitle = 'Глубоко восстановительная (строго анаэробная) зона';
      zoneClass = 'cds--tag--red';
      zoneDesc = 'Критическая среда: благоприятна для облигатных анаэробов (Clostridium botulinum, C. perfringens). Прорастание спор и синтез ботулотоксина возможны при pH > 4.6. Аэробы не развиваются.';
    } else if (rh2 <= 24.5) {
      zoneTitle = 'Амфолитная (переходная / микроаэрофильная) зона';
      zoneClass = 'cds--tag--warm-gray';
      zoneDesc = 'Оптимум для факультативных анаэробов (E. coli, Salmonella, S. aureus, L. monocytogenes), молочнокислых бактерий и микроаэрофилов (Campylobacter). Активное брожение и нитратное дыхание.';
    } else {
      zoneTitle = 'Выраженно окислительная (аэробная) зона';
      zoneClass = 'cds--tag--green';
      zoneDesc = 'Оптимум для строгих аэробов (Pseudomonas fluorescens, Micrococcus) и плесневых грибов (Penicillium, Aspergillus). Активное окислительное ослизнение и гниение.';
    }

    // Вывод в DOM
    const resEhMv = document.getElementById('calc2-res-eh-mv');
    const resEhV = document.getElementById('calc2-res-eh-v');
    const resRh2 = document.getElementById('calc2-res-rh2');
    const resZone = document.getElementById('calc2-res-zone');
    const resDesc = document.getElementById('calc2-res-desc');

    if (resEhMv) resEhMv.textContent = (ehMv >= 0 ? '+' : '') + ehMv.toFixed(1) + ' мВ';
    if (resEhV) resEhV.textContent = (ehV >= 0 ? '+' : '') + ehV.toFixed(3) + ' В';
    if (resRh2) resRh2.textContent = rh2.toFixed(2);
    if (resZone) {
      resZone.innerHTML = `<span class="cds--tag ${zoneClass}">${zoneTitle} (rH₂ = ${rh2.toFixed(1)})</span>`;
    }
    if (resDesc) resDesc.textContent = zoneDesc;
  },

  /**
   * 2. Расчет биоэнергетики «RedOx Tower»
   */
  calculateRedoxTower() {
    const donorSelect = document.getElementById('calc2-tower-donor');
    const acceptorSelect = document.getElementById('calc2-tower-acceptor');

    if (!donorSelect || !acceptorSelect) return;

    const donorKey = donorSelect.value || 'nadh';
    const acceptorKey = acceptorSelect.value || 'o2';

    const donor = this.REDOX_PAIRS[donorKey] || this.REDOX_PAIRS['nadh'];
    const acceptor = this.REDOX_PAIRS[acceptorKey] || this.REDOX_PAIRS['o2'];

    const deltaE = acceptor.potential - donor.potential;
    const n = Math.min(donor.n, acceptor.n) || 2;
    const F = 96.4853; // кДж/(В·моль)

    const deltaG = -n * F * deltaE;
    const deltaGAtp = 30.5; // кДж/моль
    const atpYield = deltaG < 0 ? (Math.abs(deltaG) / deltaGAtp).toFixed(1) : '0';

    const resDeltaE = document.getElementById('calc2-tower-res-delta-e');
    const resDeltaG = document.getElementById('calc2-tower-res-delta-g');
    const resAtp = document.getElementById('calc2-tower-res-atp');
    const resPathway = document.getElementById('calc2-tower-res-pathway');

    if (resDeltaE) {
      resDeltaE.textContent = (deltaE >= 0 ? '+' : '') + deltaE.toFixed(3) + ' В';
      resDeltaE.style.color = deltaE > 0 ? 'var(--cds-support-success)' : 'var(--cds-support-error)';
    }

    if (resDeltaG) {
      resDeltaG.textContent = deltaG.toFixed(1) + ' кДж/моль';
      resDeltaG.style.color = deltaG < 0 ? 'var(--cds-support-success)' : 'var(--cds-support-error)';
    }

    if (resAtp) {
      resAtp.textContent = `${atpYield} моль АТФ / моль субстрата`;
    }

    if (resPathway) {
      if (deltaE <= 0) {
        resPathway.innerHTML = '<span class="cds--tag cds--tag--red">Термодинамически невозможный процесс (ΔG > 0)</span>';
      } else if (acceptorKey === 'o2') {
        resPathway.innerHTML = '<span class="cds--tag cds--tag--green">Аэробное дыхание (Высокий энергетический выход)</span>';
      } else if (['no3', 'fe3', 'fumarate', 'so4'].includes(acceptorKey)) {
        resPathway.innerHTML = '<span class="cds--tag cds--tag--blue">Анаэробное дыхание (Умеренный выход энергии)</span>';
      } else {
        resPathway.innerHTML = '<span class="cds--tag cds--tag--purple">Метаногенез / Брожение (Низкий выход энергии)</span>';
      }
    }
  }
};

// Экспорт для браузера и Node.js
if (typeof window !== 'undefined') {
  window.CalculatorsSem2 = CalculatorsSem2;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { CalculatorsSem2 };
}

/**
 * Интерактивные расчетные калькуляторы Семинара 1
 * Курс «Пищевая микробиология, санитария и гигиена» • АТИ РУДН
 */

const Calculators = {
  init() {
    this.initPhConverter();
    this.initIonicCalculator();
    this.initHaCalculator();
    this.initSolubilityCalculator();
  },

  /* ------------------------------------------------------------------------
     1. Калькулятор: Автопротолиз и pH <-> [H+] <-> [OH-]
     ------------------------------------------------------------------------ */
  initPhConverter() {
    const slider = document.getElementById('calc-ph-slider');
    const input = document.getElementById('calc-ph-input');
    const disp = document.getElementById('calc-ph-disp');
    const hConc = document.getElementById('calc-h-conc');
    const hMicromol = document.getElementById('calc-h-micromol');
    const pohVal = document.getElementById('calc-poh-val');
    const ohVal = document.getElementById('calc-oh-val');
    const desc = document.getElementById('calc-ph-desc');

    if (!slider || !input) return;

    const update = (val) => {
      const ph = parseFloat(val);
      if (isNaN(ph)) return;

      slider.value = ph;
      input.value = ph.toFixed(2);
      if (disp) disp.textContent = ph.toFixed(2);

      const h = Math.pow(10, -ph);
      const exponent = Math.floor(Math.log10(h));
      const mantissa = (h / Math.pow(10, exponent)).toFixed(2);
      if (hConc) hConc.innerHTML = `${mantissa} &times; 10<sup>${exponent}</sup> М`;

      const uM = (h * 1e6).toFixed(1);
      if (hMicromol) hMicromol.innerHTML = `= ${uM} &mu;моль/л (мкМ)`;

      const poh = 14.00 - ph;
      if (pohVal) pohVal.textContent = poh.toFixed(2);
      const oh = Math.pow(10, -poh);
      const expOH = Math.floor(Math.log10(oh));
      const manOH = (oh / Math.pow(10, expOH)).toFixed(2);
      if (ohVal) ohVal.innerHTML = `${manOH} &times; 10<sup>${expOH}</sup> М`;

      if (desc) {
        if (ph < 3.0) {
          desc.className = 'cds--inline-notification cds--inline-notification--error';
          desc.textContent = 'Экстремально кислая среда (pH < 3.0). Рост любых бактерий полностью заблокирован. Выживают только осмофильные дрожжи и микромицеты.';
        } else if (ph < 4.0) {
          desc.className = 'cds--inline-notification cds--inline-notification--warning';
          desc.textContent = 'Высококислая среда (pH 3.0–4.0). Подавляются энтеробактерии (Salmonella, E. coli). Слабые кислоты находятся в активной недиссоциированной форме HA.';
        } else if (ph <= 4.6) {
          desc.className = 'cds--inline-notification cds--inline-notification--success';
          desc.textContent = 'Критический санитарный диапазон (pH 4.0–4.6). Порог pH 4.60 является абсолютной границей прорастания спор Clostridium botulinum.';
        } else if (ph < 6.0) {
          desc.className = 'cds--inline-notification cds--inline-notification--info';
          desc.textContent = 'Слабокислая среда (pH 4.6–6.0). Типично для свежего мяса. Требует термической пастеризации или консервации солями.';
        } else {
          desc.className = 'cds--inline-notification cds--inline-notification--info';
          desc.textContent = 'Близка к нейтральной (pH > 6.0). Оптимальные условия для быстрого размножения патогенной и гнилостной микробиоты.';
        }
      }
    };

    slider.addEventListener('input', (e) => update(e.target.value));
    input.addEventListener('input', (e) => update(e.target.value));

    window.setPhPreset = (presetPh) => update(presetPh);

    update(slider.value || 4.60);
  },

  /* ------------------------------------------------------------------------
     2. Калькулятор: Ионная сила и коэффициент активности (Дебай-Хюккель)
     ------------------------------------------------------------------------ */
  initIonicCalculator() {
    const slider = document.getElementById('calc-ionic-slider');
    const disp = document.getElementById('calc-ionic-disp');
    const chargeSelect = document.getElementById('calc-ionic-charge');
    const concInput = document.getElementById('calc-ionic-conc');
    const gammaVal = document.getElementById('calc-gamma-val');
    const actVal = document.getElementById('calc-act-val');
    const statusBox = document.getElementById('calc-ionic-status');

    if (!slider || !chargeSelect || !concInput) return;

    const update = () => {
      const I = parseFloat(slider.value);
      const z = parseInt(chargeSelect.value, 10);
      const C = parseFloat(concInput.value) || 0;

      if (disp) disp.textContent = I.toFixed(4) + ' М';

      // Debye-Huckel: lg gamma = -0.51 * z^2 * sqrt(I) / (1 + sqrt(I))
      const sqrtI = Math.sqrt(I);
      const lgGamma = -0.51 * Math.pow(z, 2) * (sqrtI / (1 + sqrtI));
      const gamma = Math.pow(10, lgGamma);

      if (gammaVal) gammaVal.textContent = gamma.toFixed(4);

      const activity = gamma * C;
      if (actVal) actVal.textContent = activity.toFixed(3) + ' мМ';

      if (statusBox) {
        const decreasePct = ((1 - gamma) * 100).toFixed(1);
        statusBox.innerHTML = `Ионная атмосфера (экранирование заряда) снижает эффективную термодинамическую активность иона на <strong>${decreasePct}%</strong> относительно идеального раствора.`;
      }
    };

    slider.addEventListener('input', update);
    chargeSelect.addEventListener('change', update);
    concInput.addEventListener('input', update);

    update();
  },

  /* ------------------------------------------------------------------------
     3. Калькулятор: Доля недиссоциированной формы HA (Гендерсон-Хассельбах)
     ------------------------------------------------------------------------ */
  initHaCalculator() {
    const acidSelect = document.getElementById('calc-acid-select');
    const phSlider = document.getElementById('calc-ha-ph-slider');
    const phDisp = document.getElementById('calc-ha-ph-disp');
    const doseInput = document.getElementById('calc-ha-dose');
    const percentVal = document.getElementById('calc-ha-percent');
    const ratioActive = document.getElementById('calc-ratio-active');
    const ratioInactive = document.getElementById('calc-ratio-inactive');
    const activeLbl = document.getElementById('calc-ratio-active-lbl');
    const inactiveLbl = document.getElementById('calc-ratio-inactive-lbl');
    const haMg = document.getElementById('calc-ha-mg');
    const haMm = document.getElementById('calc-ha-mm');

    if (!acidSelect || !phSlider || !doseInput) return;

    const update = () => {
      const pKa = parseFloat(acidSelect.value);
      const ph = parseFloat(phSlider.value);
      const dose = parseFloat(doseInput.value) || 0;
      const selectedOption = acidSelect.options[acidSelect.selectedIndex];
      const molMass = parseFloat(selectedOption.getAttribute('data-m') || '122.12');

      if (phDisp) phDisp.textContent = ph.toFixed(2);

      const delta = ph - pKa;
      const alpha = 1 / (1 + Math.pow(10, delta));
      const pctActive = alpha * 100;
      const pctInactive = 100 - pctActive;

      if (percentVal) percentVal.textContent = pctActive.toFixed(2) + '%';
      if (ratioActive) ratioActive.style.width = pctActive.toFixed(2) + '%';
      if (ratioInactive) ratioInactive.style.width = pctInactive.toFixed(2) + '%';
      if (activeLbl) activeLbl.textContent = pctActive.toFixed(1) + '%';
      if (inactiveLbl) inactiveLbl.textContent = pctInactive.toFixed(1) + '%';

      const effectiveMg = dose * alpha;
      const effectiveMm = effectiveMg / molMass;

      if (haMg) haMg.textContent = `${effectiveMg.toFixed(1)} мг/л`;
      if (haMm) haMm.textContent = `${effectiveMm.toFixed(2)} мМ`;
    };

    acidSelect.addEventListener('change', update);
    phSlider.addEventListener('input', update);
    doseInput.addEventListener('input', update);

    update();
  },

  /* ------------------------------------------------------------------------
     4. Калькулятор: Растворимость кислот и риск осадка
     ------------------------------------------------------------------------ */
  initSolubilityCalculator() {
    const acidSelect = document.getElementById('calc-sol-acid');
    const phSlider = document.getElementById('calc-sol-ph-slider');
    const phDisp = document.getElementById('calc-sol-ph-disp');
    const doseInput = document.getElementById('calc-sol-dose');
    const solLimit = document.getElementById('calc-sol-limit');
    const trafficBox = document.getElementById('calc-sol-traffic');
    const trafficText = document.getElementById('calc-sol-traffic-text');

    if (!acidSelect || !phSlider || !doseInput) return;

    const update = () => {
      const ph = parseFloat(phSlider.value);
      const dose = parseFloat(doseInput.value) || 0;
      const acidType = acidSelect.value;

      if (phDisp) phDisp.textContent = ph.toFixed(2);

      let S0 = 3.40;
      let pKa = 4.19;
      if (acidType === 'sorbic') {
        S0 = 1.60;
        pKa = 4.76;
      }

      const sTotal = S0 * (1 + Math.pow(10, ph - pKa));
      if (solLimit) solLimit.textContent = sTotal.toFixed(2) + ' г/л';

      if (trafficBox && trafficText) {
        if (dose > sTotal) {
          trafficBox.className = 'cds--inline-notification cds--inline-notification--error';
          const excess = (dose - sTotal).toFixed(2);
          trafficText.innerHTML = `<strong>КРИТИЧЕСКИЙ РИСК:</strong> Выпадение кристаллического осадка! Дозировка превышает предельную растворимость на ${excess} г/л (риск технологического брака и потери товарного вида).`;
        } else {
          trafficBox.className = 'cds--inline-notification cds--inline-notification--success';
          const reserve = (sTotal - dose).toFixed(2);
          trafficText.innerHTML = `<strong>БЕЗОПАСНО:</strong> Кислота полностью растворена в водной фазе. Запас растворимости: ${reserve} г/л.`;
        }
      }
    };

    acidSelect.addEventListener('change', update);
    phSlider.addEventListener('input', update);
    doseInput.addEventListener('input', update);

    update();
  }
};

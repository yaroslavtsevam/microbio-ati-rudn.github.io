/**
 * Модуль математических моделей и интерактивных калькуляторов Семинара 3
 * Курс «Пищевая микробиология, санитария и гигиена» • АТИ РУДН
 * 
 * Включает:
 * 1. Анализатор термогравиметрии и конвертер влажности (Wm, u, Wv, сходимость ГОСТ).
 * 2. Расчет давления насыщенного пара P0(T) по уравнению Антуана.
 * 3. Расчет активности воды aw (по давлению пара, ERH или радиусу пор по Кельвину).
 * 4. Расчет полного водного потенциала Psi (МПа).
 * 5. Классификатор микробиологических рисков ComBase (6 зон).
 */

const CalculatorsSem3 = {
  // Физико-химические константы чистой воды
  CONSTANTS: {
    R: 8.314,                       // Универсальная газовая постоянная, Дж/(моль·К)
    V_M: 1.80e-5,                   // Парциальный молярный объем воды, м^3/моль
    SIGMA_20: 0.0728,               // Поверхностное натяжение воды при 20°C, Н/м
    RHO_WATER: 1.00,                // Плотность чистой воды при 20°C, г/см^3
    ANTOINE: {
      A: 8.07131,
      B: 1730.63,
      C: 233.426
    }
  },

  /**
   * 1. Расчет характеристик влажности по результатам термогравиметрии
   * @param {number} mTare - Масса пустого бюкса, г
   * @param {number} mWet - Масса бюкса с навеской до высушивания, г
   * @param {number} mDry - Масса бюкса с навеской после высушивания, г
   * @param {number} density - Плотность продукта, г/см^3 (по умолчанию 1.00)
   * @param {number} rLimit - Нормативный предел сходимости стандарта, % (по умолчанию 0.50)
   * @param {number|null} parallelVal - Значение второй параллельной навески, % (опционально)
   */
  calculateMoisture(mTare, mWet, mDry, density = 1.00, rLimit = 0.50, parallelVal = null) {
    const m0 = mWet - mTare;       // Масса навески до высушивания
    const md = mDry - mTare;       // Масса сухого остатка
    const mw = mWet - mDry;       // Масса испаренной влаги

    if (m0 <= 0 || md <= 0 || mw < 0) {
      throw new Error('Некорректные значения масс: навеска и сухой остаток должны быть строго больше нуля.');
    }

    const Wm = (mw / m0) * 100;    // Массовая доля влаги (Wet Basis), %
    const u = mw / md;             // Влагосодержание на сухое вещество (Dry Basis), г/г
    const Wv = Wm * (density / this.CONSTANTS.RHO_WATER); // Объемная влажность, %

    let isConvergent = null;
    let convergenceDiff = null;
    let verdict = 'Параллельная проба не задана';

    if (parallelVal !== null && !isNaN(parallelVal)) {
      convergenceDiff = Math.abs(Wm - parallelVal);
      isConvergent = convergenceDiff <= rLimit;
      verdict = isConvergent 
        ? `Сходимость подтверждена (разность ${convergenceDiff.toFixed(2)}% ≤ ${rLimit.toFixed(2)}% по ГОСТ)`
        : `Превышен предел повторяемости (разность ${convergenceDiff.toFixed(2)}% > ${rLimit.toFixed(2)}% по ГОСТ, требуется повторить анализ)`;
    }

    return {
      m0: Math.round(m0 * 10000) / 10000,
      md: Math.round(md * 10000) / 10000,
      mw: Math.round(mw * 10000) / 10000,
      Wm: Math.round(Wm * 100) / 100,
      u: Math.round(u * 1000) / 1000,
      Wv: Math.round(Wv * 100) / 100,
      convergenceDiff: convergenceDiff !== null ? Math.round(convergenceDiff * 100) / 100 : null,
      isConvergent,
      verdict
    };
  },

  /**
   * 2. Расчет давления насыщенного пара чистой воды P0(T) по уравнению Антуана
   * @param {number} tempC - Температура в °C (диапазон 0..100°C)
   * @returns {number} Давление пара в Па
   */
  calculateP0(tempC) {
    const { A, B, C } = this.CONSTANTS.ANTOINE;
    const log10Pmm = A - (B / (tempC + C)); // Давление в мм рт. ст.
    const Pmm = Math.pow(10, log10Pmm);
    const P_Pa = Pmm * 133.322387415;       // Перевод в Паскали
    return Math.round(P_Pa * 10) / 10;
  },

  /**
   * 3. Расчет активности воды aw по капиллярному радиусу поры (уравнение Кельвина)
   * @param {number} radiusNm - Радиус поры в нанометрах (нм)
   * @param {number} tempC - Температура в °C
   * @param {number} contactAngleDeg - Краевой угол смачивания (по умолчанию 0°)
   */
  calculateAwFromKelvin(radiusNm, tempC = 20, contactAngleDeg = 0) {
    if (radiusNm <= 0) {
      throw new Error('Радиус поры должен быть строго положительным числом');
    }

    const T_K = tempC + 273.15;
    const r_m = radiusNm * 1e-9;
    const cosTheta = Math.cos((contactAngleDeg * Math.PI) / 180);
    const exponent = -(2 * this.CONSTANTS.SIGMA_20 * this.CONSTANTS.V_M * cosTheta) / 
                     (r_m * this.CONSTANTS.R * T_K);
    const aw = Math.exp(exponent);
    return Math.min(1.0, Math.max(0.001, Math.round(aw * 10000) / 10000));
  },

  /**
   * 4. Расчет полного водного потенциала Psi (МПа)
   * @param {number} aw - Активность воды (0.001..1.000)
   * @param {number} tempC - Температура в °C
   */
  calculateWaterPotential(aw, tempC = 20) {
    if (aw <= 0 || aw > 1.0) {
      throw new Error('Активность воды aw должна быть в диапазоне (0; 1]');
    }

    if (aw >= 0.9999) return 0.0;

    const T_K = tempC + 273.15;
    const psi_Pa = (this.CONSTANTS.R * T_K / this.CONSTANTS.V_M) * Math.log(aw);
    const psi_MPa = psi_Pa * 1e-6;
    return Math.round(psi_MPa * 100) / 100;
  },

  /**
   * 5. Классификатор микробиологических рисков ComBase (6 зон)
   * @param {number} aw - Активность воды
   */
  classifyRiskZone(aw) {
    if (aw >= 0.95) {
      return {
        zone: 1,
        code: 'high_bacterial',
        name: 'Зона 1: Критический бактериальный риск (aw ≥ 0.95)',
        badgeColor: '#da1e28', // Carbon Red
        description: 'Оптимум для грамотрицательных психротрофов и энтеропатогенов (Pseudomonas spp., Salmonella enterica, Escherichia coli). Быстрая порча охлажденного сырья.',
        actions: 'Обязательны непрерывная холодильная цепь (≤ +4°C), термообработка и сокращенные сроки хранения.'
      };
    } else if (aw >= 0.91) {
      return {
        zone: 2,
        code: 'moderate_spore',
        name: 'Зона 2: Спорообразующий анаэробный риск (0.91 ≤ aw < 0.95)',
        badgeColor: '#ff832b', // Carbon Orange
        description: 'Грамотрицательные бактерии ингибированы. Высокий риск вегетации Clostridium botulinum (типы А и В), Clostridium perfringens и Bacillus cereus.',
        actions: 'Контроль pH (< 4.6), автоклавирование консервов (F0 ≥ 3.0 мин) или внесение нитрита натрия.'
      };
    } else if (aw >= 0.86) {
      return {
        zone: 3,
        code: 'staphylococcal',
        name: 'Зона 3: Селективный стафилококковый риск (0.86 ≤ aw < 0.91)',
        badgeColor: '#f1c21b', // Carbon Yellow
        description: 'Селективная ниша для гало- и осмотолерантного Staphylococcus aureus. Способен аэробно синтезировать термостабильные энтеротоксины.',
        actions: 'Санитарный мониторинг персонала (носительство), исключение контакта готового продукта с руками.'
      };
    } else if (aw >= 0.70) {
      return {
        zone: 4,
        code: 'mycological',
        name: 'Зона 4: Микологический риск плесневения (0.70 ≤ aw < 0.86)',
        badgeColor: '#8a3ffc', // Carbon Purple
        description: 'Бактериальный рост полностью блокирован. Активное развитие мицелиальных микромицетов (Penicillium, Aspergillus) и осмотолерантных дрожжей.',
        actions: 'Герметичная упаковка, модифицированная газовая среда (без O2), применение сорбатов/бензоатов.'
      };
    } else if (aw >= 0.60) {
      return {
        zone: 5,
        code: 'xerophilic',
        name: 'Зона 5: Ксерофильно-осмофильная зона (0.60 ≤ aw < 0.70)',
        badgeColor: '#0f62fe', // Carbon Blue
        description: 'Рост подавляющего большинства грибов подавлен. Риск порчи экстремальными ксерофилами (Wallemia sebi, Xeromyces bisporus) и дрожжами Zygosaccharomyces rouxii.',
        actions: 'Технологический контроль при производстве меда, джемов, сгущенного молока и сухофруктов.'
      };
    } else {
      return {
        zone: 6,
        code: 'stable_anabiosis',
        name: 'Зона 6: Абсолютная биологическая стабильность (aw < 0.60)',
        badgeColor: '#24a148', // Carbon Green
        description: 'Полный метаболический анабиоз всех известных микроорганизмов. Деление клеток и биосинтез токсинов термодинамически невозможны.',
        actions: 'Критическая контрольная точка (ККТ) пройдена. Защита продукта от вторичного увлажнения (сорбции влаги из воздуха).'
      };
    }
  },

  /**
   * Инициализация интерактивных элементов UI Семинара 3
   */
  init() {
    this.bindEvents();
    this.runCalc1();
    this.runCalc2();
  },

  bindEvents() {
    // Калькулятор 1
    const calc1Ids = [
      'sem3-calc1-mtare', 'sem3-calc1-mwet', 'sem3-calc1-mdry', 
      'sem3-calc1-density', 'sem3-calc1-rlim', 'sem3-calc1-parallel'
    ];
    calc1Ids.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('input', () => this.runCalc1());
        el.addEventListener('change', () => this.runCalc1());
      }
    });

    const btnCalc1 = document.getElementById('sem3-calc1-btn');
    if (btnCalc1) {
      btnCalc1.addEventListener('click', () => this.runCalc1());
    }

    // Калькулятор 2
    const calc2Inputs = ['sem3-calc2-temp', 'sem3-calc2-val'];
    calc2Inputs.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('input', () => this.runCalc2());
        el.addEventListener('change', () => this.runCalc2());
      }
    });

    const modeRadios = document.querySelectorAll('input[name="sem3-calc2-mode"]');
    modeRadios.forEach(radio => {
      radio.addEventListener('change', () => {
        this.updateCalc2ModeUI();
        this.runCalc2();
      });
    });

    const btnCalc2 = document.getElementById('sem3-calc2-btn');
    if (btnCalc2) {
      btnCalc2.addEventListener('click', () => this.runCalc2());
    }
  },

  updateCalc2ModeUI() {
    const selectedMode = document.querySelector('input[name="sem3-calc2-mode"]:checked')?.value || 'p';
    const label = document.getElementById('sem3-calc2-val-label');
    const input = document.getElementById('sem3-calc2-val');
    const hint = document.getElementById('sem3-calc2-val-hint');

    if (!label || !input) return;

    if (selectedMode === 'p') {
      label.textContent = 'Парциальное давление пара над продуктом P (Па):';
      input.placeholder = 'Например: 2515';
      if (hint) hint.textContent = 'Равновесное давление водяного пара P при заданной температуре.';
    } else if (selectedMode === 'erh') {
      label.textContent = 'Равновесная влажность воздуха ERH (%):';
      input.placeholder = 'Например: 79.4';
      if (hint) hint.textContent = 'Равновесная относительная влажность воздуха в герметичной ячейке.';
    } else if (selectedMode === 'r') {
      label.textContent = 'Эффективный радиус преобладающих пор матрицы r (нм):';
      input.placeholder = 'Например: 15.0';
      if (hint) hint.textContent = 'Радиус нанокапилляров гидрофильной матрицы (расчет по Кельвину при θ = 0°).';
    }
  },

  runCalc1() {
    const mTare = parseFloat(document.getElementById('sem3-calc1-mtare')?.value);
    const mWet = parseFloat(document.getElementById('sem3-calc1-mwet')?.value);
    const mDry = parseFloat(document.getElementById('sem3-calc1-mdry')?.value);
    const density = parseFloat(document.getElementById('sem3-calc1-density')?.value) || 1.00;
    const rLim = parseFloat(document.getElementById('sem3-calc1-rlim')?.value) || 0.50;
    const parallelRaw = document.getElementById('sem3-calc1-parallel')?.value;
    const parallelVal = parallelRaw && parallelRaw.trim() !== '' ? parseFloat(parallelRaw) : null;

    if (isNaN(mTare) || isNaN(mWet) || isNaN(mDry)) return;

    try {
      const res = this.calculateMoisture(mTare, mWet, mDry, density, rLim, parallelVal);

      const outM0 = document.getElementById('sem3-calc1-out-m0');
      const outMw = document.getElementById('sem3-calc1-out-mw');
      const outWm = document.getElementById('sem3-calc1-out-wm');
      const outU = document.getElementById('sem3-calc1-out-u');
      const outWv = document.getElementById('sem3-calc1-out-wv');
      const outVerdict = document.getElementById('sem3-calc1-out-verdict');

      if (outM0) outM0.textContent = `${res.m0.toFixed(4)} г`;
      if (outMw) outMw.textContent = `${res.mw.toFixed(4)} г`;
      if (outWm) outWm.textContent = `${res.Wm.toFixed(2)} %`;
      if (outU) outU.textContent = `${res.u.toFixed(3)} г/г`;
      if (outWv) outWv.textContent = `${res.Wv.toFixed(2)} %`;

      if (outVerdict) {
        outVerdict.textContent = res.verdict;
        outVerdict.style.color = res.isConvergent === true ? '#24a148' : (res.isConvergent === false ? '#da1e28' : 'var(--cds-text-secondary)');
      }
    } catch (e) {
      console.warn('Calc1 error:', e.message);
    }
  },

  runCalc2() {
    const tempC = parseFloat(document.getElementById('sem3-calc2-temp')?.value) || 20;
    const mode = document.querySelector('input[name="sem3-calc2-mode"]:checked')?.value || 'p';
    const val = parseFloat(document.getElementById('sem3-calc2-val')?.value);

    if (isNaN(val)) return;

    try {
      const P0 = this.calculateP0(tempC);
      let aw = 1.0;

      if (mode === 'p') {
        aw = Math.min(1.0, Math.max(0.001, val / P0));
      } else if (mode === 'erh') {
        aw = Math.min(1.0, Math.max(0.001, val / 100.0));
      } else if (mode === 'r') {
        aw = this.calculateAwFromKelvin(val, tempC);
      }

      const psi = this.calculateWaterPotential(aw, tempC);
      const risk = this.classifyRiskZone(aw);

      const outP0 = document.getElementById('sem3-calc2-out-p0');
      const outAw = document.getElementById('sem3-calc2-out-aw');
      const outErh = document.getElementById('sem3-calc2-out-erh');
      const outPsi = document.getElementById('sem3-calc2-out-psi');
      const outZoneBadge = document.getElementById('sem3-calc2-out-zone-badge');
      const outZoneDesc = document.getElementById('sem3-calc2-out-zone-desc');
      const outZoneAction = document.getElementById('sem3-calc2-out-zone-action');

      if (outP0) outP0.textContent = `${P0.toFixed(1)} Па`;
      if (outAw) outAw.textContent = aw.toFixed(3);
      if (outErh) outErh.textContent = `${(aw * 100).toFixed(1)} %`;
      if (outPsi) outPsi.textContent = `${psi.toFixed(2)} МПа`;

      if (outZoneBadge) {
        outZoneBadge.textContent = risk.name;
        outZoneBadge.style.backgroundColor = risk.badgeColor;
        outZoneBadge.style.color = '#ffffff';
      }
      if (outZoneDesc) outZoneDesc.textContent = risk.description;
      if (outZoneAction) outZoneAction.textContent = risk.actions;
    } catch (e) {
      console.warn('Calc2 error:', e.message);
    }
  }
};

if (typeof window !== 'undefined') {
  window.CalculatorsSem3 = CalculatorsSem3;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { CalculatorsSem3 };
}


/**
 * Интерактивные химико-аналитические калькуляторы Семинара 0
 * Курс «Пищевая микробиология, санитария и гигиена» • АТИ РУДН
 */

const CalculatorsSem0 = {
  init() {
    this.initConcConverter();
    this.initDilutionMixer();
    this.initKineticsCalc();
    this.initAcidBaseBufferCalc();
  },

  /* -------------------------------------------------------------------------
     1. КАЛЬКУЛЯТОР 1: Универсальный конвертер размерностей концентраций
     ------------------------------------------------------------------------- */
  initConcConverter() {
    const inputType = document.getElementById('c0-conv-type');
    const inputVal = document.getElementById('c0-conv-val');
    const inputMolarMass = document.getElementById('c0-conv-m');
    const inputDensity = document.getElementById('c0-conv-rho');
    const inputFeq = document.getElementById('c0-conv-feq');
    const btnCalc = document.getElementById('btn-c0-conv-calc');

    const update = () => {
      const type = inputType ? inputType.value : 'omega';
      const val = parseFloat(inputVal ? inputVal.value : 10);
      const M = parseFloat(inputMolarMass ? inputMolarMass.value : 58.44);
      const rho = parseFloat(inputDensity ? inputDensity.value : 1.07);
      const feq = parseFloat(inputFeq ? inputFeq.value : 1.0);

      if (isNaN(val) || val <= 0 || isNaN(M) || M <= 0 || isNaN(rho) || rho <= 0) return;

      let omega = 0; // %
      let CM = 0;    // mol/L
      let m = 0;     // mol/kg
      let CN = 0;    // mol-eq/L
      let Cm = 0;    // g/L
      let T = 0;     // g/mL
      let chi = 0;   // mol fraction

      if (type === 'omega') {
        omega = val;
        CM = (10 * omega * rho) / M;
        m = (1000 * omega) / (M * (100 - omega));
        CN = CM / feq;
        Cm = (omega / 100) * rho * 1000;
        T = (omega / 100) * rho;
        const nSolute = omega / M;
        const nWater = (100 - omega) / 18.015;
        chi = nSolute / (nSolute + nWater);
      } else if (type === 'cm') {
        CM = val;
        omega = (CM * M) / (10 * rho);
        m = (1000 * CM) / (1000 * rho - CM * M);
        CN = CM / feq;
        Cm = CM * M;
        T = Cm / 1000;
        const nSolute = CM;
        const nWater = (1000 * rho - CM * M) / 18.015;
        chi = nSolute / (nSolute + nWater);
      } else if (type === 'mass_conc') {
        Cm = val;
        CM = Cm / M;
        omega = (Cm / (1000 * rho)) * 100;
        m = (1000 * omega) / (M * (100 - omega));
        CN = CM / feq;
        T = Cm / 1000;
        const nSolute = omega / M;
        const nWater = (100 - omega) / 18.015;
        chi = nSolute / (nSolute + nWater);
      }

      this.setTxt('res-c0-omega', `${omega.toFixed(3)} %`);
      this.setTxt('res-c0-cm', `${CM.toFixed(4)} моль/л (${(CM * 1000).toFixed(1)} мМ)`);
      this.setTxt('res-c0-cn', `${CN.toFixed(4)} н. (моль-экв/л)`);
      this.setTxt('res-c0-m', `${m.toFixed(4)} моль/кг воды`);
      this.setTxt('res-c0-massconc', `${Cm.toFixed(2)} г/л`);
      this.setTxt('res-c0-t', `${T.toFixed(5)} г/мл`);
      this.setTxt('res-c0-chi', `${(chi * 100).toFixed(3)} % (${chi.toFixed(5)})`);
    };

    if (btnCalc) btnCalc.addEventListener('click', update);
    [inputType, inputVal, inputMolarMass, inputDensity, inputFeq].forEach(el => {
      if (el) el.addEventListener('input', update);
    });
    update();
  },

  /* -------------------------------------------------------------------------
     2. КАЛЬКУЛЯТОР 2: Разбавление и смешивание растворов (Крест Пирсона)
     ------------------------------------------------------------------------- */
  initDilutionMixer() {
    // Режим А: C1*V1 = C2*V2
    const inC1 = document.getElementById('c0-dil-c1');
    const inV2 = document.getElementById('c0-dil-v2');
    const inC2 = document.getElementById('c0-dil-c2');
    const btnDil = document.getElementById('btn-c0-dil-calc');

    const updateDil = () => {
      const c1 = parseFloat(inC1 ? inC1.value : 2.0);
      const v2 = parseFloat(inV2 ? inV2.value : 500);
      const c2 = parseFloat(inC2 ? inC2.value : 0.1);

      if (c1 <= 0 || v2 <= 0 || c2 <= 0 || c2 >= c1) {
        this.setTxt('res-c0-dil-v1', 'Ошибка (C2 должно быть < C1)');
        return;
      }
      const v1 = (c2 * v2) / c1;
      const vWater = v2 - v1;
      const df = c1 / c2;
      this.setTxt('res-c0-dil-v1', `${v1.toFixed(2)} мл`);
      this.setTxt('res-c0-dil-water', `${vWater.toFixed(2)} мл`);
      this.setTxt('res-c0-dil-df', `${df.toFixed(2)}x (1:${df.toFixed(1)})`);
    };

    if (btnDil) btnDil.addEventListener('click', updateDil);
    [inC1, inV2, inC2].forEach(el => { if (el) el.addEventListener('input', updateDil); });

    // Режим Б: Крест Пирсона
    const inW1 = document.getElementById('c0-mix-w1');
    const inW2 = document.getElementById('c0-mix-w2');
    const inWTarget = document.getElementById('c0-mix-target');
    const inMTotal = document.getElementById('c0-mix-mtotal');
    const btnMix = document.getElementById('btn-c0-mix-calc');

    const updateMix = () => {
      const w1 = parseFloat(inW1 ? inW1.value : 40);
      const w2 = parseFloat(inW2 ? inW2.value : 5);
      const wt = parseFloat(inWTarget ? inWTarget.value : 15);
      const mTot = parseFloat(inMTotal ? inMTotal.value : 600);

      if (wt <= Math.min(w1, w2) || wt >= Math.max(w1, w2) || mTot <= 0) {
        this.setTxt('res-c0-mix-m1', 'Ошибка (Целевая conc должна быть между w1 и w2)');
        return;
      }

      const p1 = Math.abs(wt - w2);
      const p2 = Math.abs(w1 - wt);
      const pTot = p1 + p2;

      const m1 = (p1 / pTot) * mTot;
      const m2 = (p2 / pTot) * mTot;

      this.setTxt('res-c0-mix-m1', `${m1.toFixed(2)} г (${((m1 / mTot) * 100).toFixed(1)}%)`);
      this.setTxt('res-c0-mix-m2', `${m2.toFixed(2)} г (${((m2 / mTot) * 100).toFixed(1)}%)`);
      this.setTxt('res-c0-mix-ratio', `${(m1 / m2).toFixed(3)} : 1 (или ${p1.toFixed(1)} : ${p2.toFixed(1)} частей)`);
    };

    if (btnMix) btnMix.addEventListener('click', updateMix);
    [inW1, inW2, inWTarget, inMTotal].forEach(el => { if (el) el.addEventListener('input', updateMix); });

    updateDil();
    updateMix();
  },

  /* -------------------------------------------------------------------------
     3. КАЛЬКУЛЯТОР 3: Химическая кинетика, Вант-Гофф и Аррениус
     ------------------------------------------------------------------------- */
  initKineticsCalc() {
    const inK1 = document.getElementById('c0-kin-k1');
    const inT1 = document.getElementById('c0-kin-t1');
    const inK2 = document.getElementById('c0-kin-k2');
    const inT2 = document.getElementById('c0-kin-t2');
    const inOrder = document.getElementById('c0-kin-order');
    const inC0 = document.getElementById('c0-kin-c0');
    const btnKin = document.getElementById('btn-c0-kin-calc');

    const updateKin = () => {
      const k1 = parseFloat(inK1 ? inK1.value : 0.0011);
      const t1 = parseFloat(inT1 ? inT1.value : 20);
      const k2 = parseFloat(inK2 ? inK2.value : 0.0055);
      const t2 = parseFloat(inT2 ? inT2.value : 40);
      const order = parseInt(inOrder ? inOrder.value : 1, 10);
      const c0 = parseFloat(inC0 ? inC0.value : 1.0);

      if (k1 <= 0 || k2 <= 0 || t1 >= t2) return;

      const T1_K = t1 + 273.15;
      const T2_K = t2 + 273.15;
      const deltaT = t2 - t1;

      // Вант-Гофф: k2/k1 = gamma^(deltaT / 10)
      const ratio = k2 / k1;
      const gamma = Math.pow(ratio, 10 / deltaT);

      // Аррениус: ln(k2/k1) = (Ea / R) * (1/T1 - 1/T2)
      const R = 8.31446;
      const invDiff = (1 / T1_K) - (1 / T2_K);
      const Ea_J = (R * Math.log(ratio)) / invDiff;
      const Ea_kJ = Ea_J / 1000;

      // Период полупревращения при T1
      let t_half = 0;
      if (order === 0) {
        t_half = c0 / (2 * k1);
      } else if (order === 1) {
        t_half = Math.LN2 / k1;
      } else if (order === 2) {
        t_half = 1 / (k1 * c0);
      }

      this.setTxt('res-c0-kin-gamma', `${gamma.toFixed(3)}`);
      this.setTxt('res-c0-kin-ea', `${Ea_kJ.toFixed(2)} кДж/моль (${Ea_J.toFixed(0)} Дж/моль)`);
      this.setTxt('res-c0-kin-thalf', `${t_half.toFixed(2)} с (${(t_half / 60).toFixed(2)} мин)`);
    };

    if (btnKin) btnKin.addEventListener('click', updateKin);
    [inK1, inT1, inK2, inT2, inOrder, inC0].forEach(el => { if (el) el.addEventListener('input', updateKin); });
    updateKin();
  },

  /* -------------------------------------------------------------------------
     4. КАЛЬКУЛЯТОР 4: Диссоциация, pH, гидролиз и буферы
     ------------------------------------------------------------------------- */
  initAcidBaseBufferCalc() {
    // Вкладка A: Кислота / Основание
    const inAcidC = document.getElementById('c0-ab-c');
    const inAcidPka = document.getElementById('c0-ab-pka');
    const inAbType = document.getElementById('c0-ab-type'); // strong_acid, weak_acid, strong_base, weak_base

    const updateAcidBase = () => {
      const C = parseFloat(inAcidC ? inAcidC.value : 0.05);
      const pKa = parseFloat(inAcidPka ? inAcidPka.value : 4.76);
      const type = inAbType ? inAbType.value : 'weak_acid';

      if (C <= 0) return;

      let pH = 7.0;
      let alpha = 1.0;
      let hConc = 1e-7;

      if (type === 'strong_acid') {
        hConc = C;
        pH = -Math.log10(hConc);
        alpha = 1.0;
      } else if (type === 'weak_acid') {
        const Ka = Math.pow(10, -pKa);
        // [H+] = sqrt(Ka * C)
        hConc = Math.sqrt(Ka * C);
        alpha = hConc / C;
        pH = -Math.log10(hConc);
      } else if (type === 'strong_base') {
        const ohConc = C;
        const pOH = -Math.log10(ohConc);
        pH = 14.0 - pOH;
        hConc = Math.pow(10, -pH);
        alpha = 1.0;
      } else if (type === 'weak_base') {
        const Kb = Math.pow(10, -pKa); // pKb
        const ohConc = Math.sqrt(Kb * C);
        const pOH = -Math.log10(ohConc);
        pH = 14.0 - pOH;
        alpha = ohConc / C;
        hConc = Math.pow(10, -pH);
      }

      this.setTxt('res-c0-ab-ph', pH.toFixed(3));
      this.setTxt('res-c0-ab-poh', (14.0 - pH).toFixed(3));
      this.setTxt('res-c0-ab-h', `${(hConc * 1e6).toFixed(2)} мкМ (${hConc.toExponential(3)} М)`);
      this.setTxt('res-c0-ab-alpha', `${(alpha * 100).toFixed(3)} % (${alpha.toFixed(5)})`);
    };

    [inAcidC, inAcidPka, inAbType].forEach(el => { if (el) el.addEventListener('input', updateAcidBase); });

    // Вкладка B: Буфер Гендерсона-Хассельбаха
    const inBufAcid = document.getElementById('c0-buf-acid');
    const inBufSalt = document.getElementById('c0-buf-salt');
    const inBufPka = document.getElementById('c0-buf-pka');
    const inBufAdd = document.getElementById('c0-buf-add'); // добавление щелочи +моль/л

    const updateBuffer = () => {
      const cAcid = parseFloat(inBufAcid ? inBufAcid.value : 0.20);
      const cSalt = parseFloat(inBufSalt ? inBufSalt.value : 0.30);
      const pKa = parseFloat(inBufPka ? inBufPka.value : 4.76);
      const add = parseFloat(inBufAdd ? inBufAdd.value : 0.02);

      if (cAcid <= 0 || cSalt <= 0) return;

      const pH0 = pKa + Math.log10(cSalt / cAcid);

      let pH1 = pH0;
      let delta = 0;
      if (add !== 0 && cAcid - add > 0) {
        pH1 = pKa + Math.log10((cSalt + add) / (cAcid - add));
        delta = pH1 - pH0;
      }
      const beta = Math.abs(delta) > 0 ? Math.abs(add / delta) : 0;

      this.setTxt('res-c0-buf-ph0', pH0.toFixed(3));
      this.setTxt('res-c0-buf-ph1', pH1.toFixed(3));
      this.setTxt('res-c0-buf-delta', `${delta >= 0 ? '+' : ''}${delta.toFixed(3)} ед. pH`);
      this.setTxt('res-c0-buf-beta', `${beta.toFixed(3)} моль/(л·ед. pH)`);
    };

    [inBufAcid, inBufSalt, inBufPka, inBufAdd].forEach(el => { if (el) el.addEventListener('input', updateBuffer); });

    updateAcidBase();
    updateBuffer();
  },

  setTxt(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  }
};

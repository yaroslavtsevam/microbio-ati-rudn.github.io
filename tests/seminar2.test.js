/**
 * Тесты для Семинара 2 (RedOx, rH2, биоэнергетика, калькуляторы и банк 20 задач)
 * Запуск: node --test tests/seminar2.test.js
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { TaskBankSem2, TASK_BANK_SEM2 } = require('../js/task-bank-sem2.js');
const { CalculatorsSem2 } = require('../js/calculators-sem2.js');

describe('ГРУППА 1: Схема и целостность банка расчетных задач Семинара 2', () => {
  test('1.1. Банк Семинара 2 содержит ровно 20 расчетных задач', () => {
    assert.equal(TASK_BANK_SEM2.length, 20, 'В банке Семинара 2 должно быть ровно 20 задач');
    assert.equal(TaskBankSem2.getAllTasks().length, 20);
  });

  test('1.2. В банке ровно 4 категории, по 5 задач в каждой', () => {
    for (let cat = 1; cat <= 4; cat++) {
      const catTasks = TaskBankSem2.getTasksByCategory(cat);
      assert.equal(catTasks.length, 5, `Категория ${cat} должна содержать ровно 5 задач`);
      catTasks.forEach(task => {
        assert.equal(task.category, cat, `Категория задачи ${task.id} должна быть ${cat}`);
      });
    }
  });

  test('1.3. Все задачи обладают обязательными полями', () => {
    const requiredFields = [
      'id', 'category', 'categoryName', 'badge', 'title', 
      'scenario', 'question', 'unit', 'placeholder', 
      'correctAnswer', 'tolerancePercent', 'hint'
    ];

    const seenIds = new Set();

    TASK_BANK_SEM2.forEach(task => {
      assert.ok(!seenIds.has(task.id), `Дубликат ID задачи: ${task.id}`);
      seenIds.add(task.id);

      requiredFields.forEach(field => {
        assert.ok(task[field] !== undefined && task[field] !== null, 
          `Задача ${task.id} не содержит обязательного поля '${field}'`);
      });

      assert.equal(typeof task.correctAnswer, 'number');
      assert.ok(typeof task.tolerancePercent === 'number' && task.tolerancePercent > 0);
    });
  });

  test('1.4. Функция getRandomTasks() возвращает 4 задачи (по 1 из каждой категории)', () => {
    for (let run = 0; run < 10; run++) {
      const ticket = TaskBankSem2.getRandomTasks();
      assert.equal(ticket.length, 4, 'В билете должно быть ровно 4 задачи');

      const catCounts = {};
      const ids = new Set();

      ticket.forEach(task => {
        catCounts[task.category] = (catCounts[task.category] || 0) + 1;
        assert.ok(!ids.has(task.id), `Повторяющаяся задача ${task.id} в билете`);
        ids.add(task.id);
      });

      for (let c = 1; c <= 4; c++) {
        assert.equal(catCounts[c], 1, `В билете должна быть ровно 1 задача из категории ${c}`);
      }
    }
  });
});

describe('ГРУППА 2: Валидация и парсинг числовых ответов в TaskBankSem2', () => {
  test('2.1. Точный правильный ответ проходит валидацию', () => {
    const task = TASK_BANK_SEM2[0];
    const res = TaskBankSem2.validateAnswer(task.id, task.correctAnswer);
    assert.equal(res, true);
  });

  test('2.2. Ответ с запятой и единицей измерения распознается корректно', () => {
    const task = TASK_BANK_SEM2[0]; // e.g. -299.3 mV
    const valWithComma = String(task.correctAnswer).replace('.', ',') + ' мВ';
    const res = TaskBankSem2.validateAnswer(task.id, valWithComma);
    assert.equal(res, true);
  });

  test('2.3. Ответ в пределах допуска tolerancePercent считается верным', () => {
    const task = TASK_BANK_SEM2[1];
    const tol = task.tolerancePercent / 100;
    const slightlyHigher = task.correctAnswer * (1 + tol * 0.8);
    const res = TaskBankSem2.validateAnswer(task.id, slightlyHigher);
    assert.equal(res, true);
  });

  test('2.4. Ответ вне допуска tolerancePercent бракуется', () => {
    const task = TASK_BANK_SEM2[1];
    const tol = task.tolerancePercent / 100;
    const wayHigher = task.correctAnswer * (1 + tol * 2.0);
    const res = TaskBankSem2.validateAnswer(task.id, wayHigher);
    assert.equal(res, false);
  });

  test('2.5. Пустой ввод или текст без чисел возвращает false', () => {
    const task = TASK_BANK_SEM2[0];
    const resEmpty = TaskBankSem2.validateAnswer(task.id, '');
    assert.equal(resEmpty, false);

    const resText = TaskBankSem2.validateAnswer(task.id, 'не знаю ответ');
    assert.equal(resText, false);
  });
});

describe('ГРУППА 3: Математическая логика калькуляторов Семинара 2', () => {
  test('3.1. База электродов сравнения содержит Ag/AgCl и НВЭ', () => {
    assert.ok(CalculatorsSem2.REF_ELECTRODES.ag_cl_sat);
    assert.equal(CalculatorsSem2.REF_ELECTRODES.ag_cl_sat.potential, 207.0);
    assert.equal(CalculatorsSem2.REF_ELECTRODES.she.potential, 0.0);
  });

  test('3.2. Расчет Eh = Eизм + Eсравн и rH2 Кларка', () => {
    const eMeas = 43.0; // мВ
    const eRef = 207.0; // мВ
    const ph = 5.80;
    const ehMv = eMeas + eRef; // +250.0 мВ
    const ehV = ehMv / 1000.0; // +0.250 В
    const nernst = 0.05916;
    const clark = (ehV + nernst * ph) / (nernst / 2);

    assert.equal(ehMv, 250.0);
    assert.ok(Math.abs(clark - 20.05) < 0.1);
  });

  test('3.3. Расчет биоэнергетики Редокс-башни: ΔE°\' и ΔG°\'', () => {
    const eDonor = CalculatorsSem2.REDOX_PAIRS.nadh.potential; // -0.320 В
    const eAcceptor = CalculatorsSem2.REDOX_PAIRS.o2.potential; // +0.815 В
    const deltaE = eAcceptor - eDonor; // 1.135 В
    const n = 2;
    const F = 96.4853;
    const deltaG = -n * F * deltaE; // -219.02 кДж/моль

    assert.equal(deltaE, 1.135);
    assert.ok(Math.abs(deltaG - (-219.02)) < 0.05);
  });
});

describe('ГРУППА 4: Физическое наличие файлов курса и раздаточных материалов Семинара 2', () => {
  test('4.1. Все методические файлы семинара 2 присутствуют на диске', () => {
    const sem2Dir = path.join(__dirname, '../../seminars/seminar_02');
    const requiredFiles = [
      'README.md',
      'theory_guide.md',
      'constants_table.md',
      'student_tasks.md',
      'instructor_solutions.md',
      'typst/student_handout.typ',
      'typst/instructor_handout.typ',
      'typst/student_handout.pdf',
      'typst/instructor_handout.pdf'
    ];

    requiredFiles.forEach(relFile => {
      const fullPath = path.join(sem2Dir, relFile);
      assert.ok(fs.existsSync(fullPath), `Файл не найден: ${fullPath}`);
      const stats = fs.statSync(fullPath);
      assert.ok(stats.size > 100, `Файл слишком мал или пуст: ${fullPath}`);
    });
  });

  test('4.2. Скомпилированные PDF раздаток скопированы в assets/pdf/', () => {
    const assetsPdfDir = path.join(__dirname, '../assets/pdf');
    const studentPdf = path.join(assetsPdfDir, 'student_handout_sem2.pdf');
    const instructorPdf = path.join(assetsPdfDir, 'instructor_handout_sem2.pdf');

    assert.ok(fs.existsSync(studentPdf), `PDF студента не найден в assets: ${studentPdf}`);
    assert.ok(fs.existsSync(instructorPdf), `PDF преподавателя не найден в assets: ${instructorPdf}`);
    assert.ok(fs.statSync(studentPdf).size > 50000);
    assert.ok(fs.statSync(instructorPdf).size > 50000);
  });

  test('4.3. index.html содержит корректные элементы и скрипты Семинара 2', () => {
    const indexHtml = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf-8');
    assert.ok(indexHtml.includes('id="view-seminar2"'), 'view-seminar2 отсутствует в index.html');
    assert.ok(indexHtml.includes('data-nav="seminar2"'), 'data-nav="seminar2" отсутствует в index.html');
    assert.ok(indexHtml.includes('js/calculators-sem2.js'), 'скрипт calculators-sem2.js не подключен в index.html');
    assert.ok(indexHtml.includes('js/task-bank-sem2.js'), 'скрипт task-bank-sem2.js не подключен в index.html');
    assert.ok(indexHtml.includes('value="sem2"'), 'option value="sem2" отсутствует в форме тестирования');
  });
});

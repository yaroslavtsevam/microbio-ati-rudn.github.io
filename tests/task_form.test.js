/**
 * Комплексный набор тестов функционала банка задач и формы экспресс-тестирования
 * Курс «Пищевая микробиология, санитария и гигиена» • АТИ РУДН
 * Запуск: node --test tests/task_form.test.js
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

const { TaskBank, TASK_BANK } = require('../js/task-bank.js');
const { CONFIG } = require('../js/config.js');
const { GDriveSync } = require('../js/gdrive-sync.js');

global.CONFIG = CONFIG;

// Мок LocalStorage для Node.js среды тестирования
if (!global.localStorage || typeof global.localStorage.getItem !== 'function') {
  const store = {};
  global.localStorage = {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
    clear: () => { Object.keys(store).forEach(k => delete store[k]); }
  };
}

describe('ГРУППА 1: Схема и целостность банка расчетных задач (TASK_BANK)', () => {
  test('1.1. Банк содержит ровно 20 расчетных задач', () => {
    assert.equal(TASK_BANK.length, 20, 'В банке должно быть ровно 20 задач');
    assert.equal(TaskBank.getAllTasks().length, 20, 'TaskBank.getAllTasks() должен возвращать 20 задач');
  });

  test('1.2. В банке ровно 4 категории, по 5 задач в каждой', () => {
    for (let cat = 1; cat <= 4; cat++) {
      const catTasks = TaskBank.getTasksByCategory(cat);
      assert.equal(catTasks.length, 5, `Категория ${cat} должна содержать ровно 5 задач`);
      catTasks.forEach(task => {
        assert.equal(task.category, cat, `Категория задачи ${task.id} должна быть равна ${cat}`);
      });
    }
  });

  test('1.3. Все задачи обладают валидной схемой обязательных полей', () => {
    const requiredFields = [
      'id', 'category', 'categoryName', 'badge', 'title', 
      'scenario', 'question', 'unit', 'placeholder', 
      'correctAnswer', 'tolerancePercent', 'hint'
    ];

    const seenIds = new Set();

    TASK_BANK.forEach(task => {
      // Уникальность id
      assert.ok(!seenIds.has(task.id), `Обнаружен дубликат ID задачи: ${task.id}`);
      seenIds.add(task.id);

      // Проверка наличия и непустоты строковых полей
      requiredFields.forEach(field => {
        assert.ok(task[field] !== undefined && task[field] !== null, 
          `Задача ${task.id} не имеет обязательного поля '${field}'`);
      });

      assert.ok(typeof task.title === 'string' && task.title.trim().length > 5, 
        `Задача ${task.id} должна иметь содержательный заголовок`);
      assert.ok(typeof task.scenario === 'string' && task.scenario.trim().length > 10, 
        `Задача ${task.id} должна иметь содержательное условие`);
      assert.ok(typeof task.question === 'string' && task.question.trim().length > 5, 
        `Задача ${task.id} должна иметь сформулированный вопрос`);
      assert.ok(typeof task.unit === 'string' && task.unit.trim().length > 0, 
        `Задача ${task.id} должна иметь единицу измерения`);

      // Проверка числовых значений эталонов
      assert.ok(typeof task.correctAnswer === 'number' && Number.isFinite(task.correctAnswer), 
        `Эталонный ответ задачи ${task.id} должен быть конечным числом`);
      assert.ok(task.correctAnswer > 0, 
        `Эталонный ответ задачи ${task.id} должен быть строго положительным числом`);

      // Проверка диапазона погрешности (1.0% - 5.0%)
      assert.ok(task.tolerancePercent >= 1.0 && task.tolerancePercent <= 5.0, 
        `Допуск задачи ${task.id} (${task.tolerancePercent}%) должен быть в пределах 1.0% - 5.0%`);
    });
  });
});

describe('ГРУППА 2: Алгоритм рандомизации и выборки задач (TaskBank.getRandomTasks)', () => {
  test('2.1. Всегда возвращает ровно 4 задачи', () => {
    for (let i = 0; i < 50; i++) {
      const selected = TaskBank.getRandomTasks();
      assert.equal(selected.length, 4, 'Выборка должна содержать ровно 4 задачи');
    }
  });

  test('2.2. Задачи строго распределены по категориям 1, 2, 3 и 4', () => {
    for (let i = 0; i < 50; i++) {
      const selected = TaskBank.getRandomTasks();
      const categories = selected.map(t => t.category).sort((a, b) => a - b);
      assert.deepEqual(categories, [1, 2, 3, 4], 'Выборка обязана содержать ровно по 1 задаче из категорий 1, 2, 3, 4');
    }
  });

  test('2.3. В каждой сессии все задачи уникальны (нет дубликатов)', () => {
    for (let i = 0; i < 50; i++) {
      const selected = TaskBank.getRandomTasks();
      const ids = selected.map(t => t.id);
      const uniqueIds = new Set(ids);
      assert.equal(uniqueIds.size, 4, 'Все 4 задачи в сессии должны иметь уникальные ID');
    }
  });

  test('2.4. Статистическая равномерность выборки (randomness check)', () => {
    const counts = {};
    TASK_BANK.forEach(t => { counts[t.id] = 0; });

    const TRIALS = 300;
    for (let i = 0; i < TRIALS; i++) {
      const selected = TaskBank.getRandomTasks();
      selected.forEach(t => {
        counts[t.id]++;
      });
    }

    // При 300 испытаниях каждая задача из 5 вариантов категории должна выпасть в среднем 60 раз.
    // Проверяем, что нет «зависших» вариантов с нулевым или экстремально низким выпадением.
    Object.entries(counts).forEach(([id, count]) => {
      assert.ok(count >= 15, `Задача ${id} выпала слишком редко (${count} раз из ${TRIALS}), возможна асимметрия генератора`);
    });
  });
});

describe('ГРУППА 3: Парсинг числового ввода и валидация ответов', () => {
  test('3.1. TaskBank.parseNumericInput корректно парсит числа с точкой, запятой и пробелами', () => {
    assert.equal(TaskBank.parseNumericInput(398.1), 398.1);
    assert.equal(TaskBank.parseNumericInput("398.1"), 398.1);
    assert.equal(TaskBank.parseNumericInput("398,1"), 398.1, 'Запятая должна заменяться на точку');
    assert.equal(TaskBank.parseNumericInput("  1 258,9  "), 1258.9, 'Пробелы разрядов должны удаляться');
    assert.equal(TaskBank.parseNumericInput("0,0375"), 0.0375);
    assert.equal(TaskBank.parseNumericInput("1,618"), 1.618);
  });

  test('3.2. TaskBank.parseNumericInput безопасно обрабатывает невалидные значения', () => {
    assert.ok(Number.isNaN(TaskBank.parseNumericInput("")), 'Пустая строка должна давать NaN');
    assert.ok(Number.isNaN(TaskBank.parseNumericInput("   ")), 'Пробелы должны давать NaN');
    assert.ok(Number.isNaN(TaskBank.parseNumericInput("abc")), 'Текст должен давать NaN');
    assert.ok(Number.isNaN(TaskBank.parseNumericInput(null)), 'null должен давать NaN');
    assert.ok(Number.isNaN(TaskBank.parseNumericInput(undefined)), 'undefined должен давать NaN');
    assert.ok(Number.isNaN(TaskBank.parseNumericInput(NaN)), 'NaN должен давать NaN');
  });

  test('3.3. TaskBank.validateAnswer: точное совпадение дает true', () => {
    const task = TaskBank.getTaskById('c1_t1');
    assert.ok(task, 'Задача c1_t1 должна существовать');
    assert.ok(TaskBank.validateAnswer(task, task.correctAnswer), 'Точный эталонный ответ должен быть верен');
    assert.ok(TaskBank.validateAnswer(task.id, task.correctAnswer), 'Проверка по строковому id должна работать');
  });

  test('3.4. TaskBank.validateAnswer: ответы в пределах допуска засчитываются', () => {
    const task = TaskBank.getTaskById('c1_t1'); // correctAnswer: 398.1, tol: 3.0%
    const tolMargin = task.correctAnswer * (task.tolerancePercent / 100);

    // +2.0% (внутри допуска)
    const upperInside = task.correctAnswer + tolMargin * 0.8;
    assert.ok(TaskBank.validateAnswer(task, upperInside), 'Ответ +2.4% должен засчитываться');

    // -2.0% (внутри допуска)
    const lowerInside = task.correctAnswer - tolMargin * 0.8;
    assert.ok(TaskBank.validateAnswer(task, lowerInside), 'Ответ -2.4% должен засчитываться');

    // Проверка со строковым вводом и запятой
    assert.ok(TaskBank.validateAnswer(task, "398,1"), 'Ввод "398,1" должен засчитываться');
  });

  test('3.5. TaskBank.validateAnswer: ответы за пределами допуска отклоняются', () => {
    const task = TaskBank.getTaskById('c1_t1'); // correctAnswer: 398.1, tol: 3.0%
    const tolMargin = task.correctAnswer * (task.tolerancePercent / 100);

    // +5% (за пределами допуска 3%)
    const tooHigh = task.correctAnswer + tolMargin * 1.6;
    assert.equal(TaskBank.validateAnswer(task, tooHigh), false, 'Ответ с ошибкой 5% должен быть отклонен');

    // -5% (за пределами допуска 3%)
    const tooLow = task.correctAnswer - tolMargin * 1.6;
    assert.equal(TaskBank.validateAnswer(task, tooLow), false, 'Ответ с ошибкой -5% должен быть отклонен');

    // Абсурдные значения
    assert.equal(TaskBank.validateAnswer(task, 0), false, 'Ответ 0 должен быть отклонен');
    assert.equal(TaskBank.validateAnswer(task, -398.1), false, 'Отрицательный ответ должен быть отклонен');
    assert.equal(TaskBank.validateAnswer(task, "abc"), false, 'Нечисловой ввод должен быть отклонен');
  });
});

describe('ГРУППА 4: Конфигурация и расчет баллов тестирования', () => {
  test('4.1. Параметры тестирования в CONFIG соответствуют регламенту', () => {
    assert.ok(typeof CONFIG.TEST_DURATION_MINUTES === 'number' && CONFIG.TEST_DURATION_MINUTES > 0, 'Продолжительность должна быть положительным числом');
    assert.equal(CONFIG.TOTAL_TASKS, 4, 'Число задач должно быть 4');
    assert.equal(CONFIG.POINTS_PER_TASK, 25, 'За каждую задачу дается 25 баллов');
    assert.equal(CONFIG.MAX_SCORE, 100, 'Максимальный балл равен 100');
  });

  test('4.2. Корректный расчет баллов по результатам тестирования', () => {
    const sampleTasks = TaskBank.getRandomTasks();
    
    // Сценарий 1: Все 4 ответа верны (100 баллов)
    const allCorrect = sampleTasks.map(task => {
      const val = task.correctAnswer;
      const isCorrect = TaskBank.validateAnswer(task, val);
      return { isCorrect, points: isCorrect ? CONFIG.POINTS_PER_TASK : 0 };
    });
    const score100 = allCorrect.reduce((sum, a) => sum + a.points, 0);
    assert.equal(score100, 100, '4 правильных ответа дают 100 баллов');

    // Сценарий 2: 2 верных, 2 неверных (50 баллов)
    const halfCorrect = sampleTasks.map((task, idx) => {
      const val = idx < 2 ? task.correctAnswer : 999999;
      const isCorrect = TaskBank.validateAnswer(task, val);
      return { isCorrect, points: isCorrect ? CONFIG.POINTS_PER_TASK : 0 };
    });
    const score50 = halfCorrect.reduce((sum, a) => sum + a.points, 0);
    assert.equal(score50, 50, '2 правильных ответа дают 50 баллов');

    // Сценарий 3: Все неверны (0 баллов)
    const zeroCorrect = sampleTasks.map(task => {
      const isCorrect = TaskBank.validateAnswer(task, NaN);
      return { isCorrect, points: isCorrect ? CONFIG.POINTS_PER_TASK : 0 };
    });
    const score0 = zeroCorrect.reduce((sum, a) => sum + a.points, 0);
    assert.equal(score0, 0, '0 правильных ответов дают 0 баллов');
  });
});

describe('ГРУППА 5: Модуль синхронизации и квитанции (GDriveSync)', () => {
  test('5.1. Токен квитанции имеет установленный формат RUDN-MB-XXXX-YYYY', () => {
    const token = GDriveSync.generateReceiptToken();
    assert.match(token, /^RUDN-MB-[A-Z0-9]+-[A-Z0-9]+$/, 'Токен должен соответствовать шаблону RUDN-MB-XXXX-YYYY');
  });

  test('5.2. Генерация текста квитанции содержит все метаданные студента и проверочный хеш', () => {
    const mockPayload = {
      receiptToken: GDriveSync.generateReceiptToken(),
      surname: 'Иванов',
      name: 'Иван',
      group: 'АТИ-301',
      specialty: 'Стандартизация и метрология',
      submittedAtLocal: '14.09.2026, 04:30:00',
      timeSpentFormatted: '11 мин 45 сек',
      totalScore: 75,
      maxScore: 100,
      answers: [
        { categoryName: 'Раздел 1: Автопротолиз', taskId: 'c1_t1', userAnswer: 398.1, unit: 'мкМ' },
        { categoryName: 'Раздел 2: Ионная сила', taskId: 'c2_t1', userAnswer: 0.0375, unit: 'моль/л' },
        { categoryName: 'Раздел 3: Гендерсон-Хассельбах', taskId: 'c3_t1', userAnswer: 86.04, unit: '%' },
        { categoryName: 'Раздел 4: Растворимость', taskId: 'c4_t1', userAnswer: 999.0, unit: 'г/л' }
      ]
    };

    const text = GDriveSync.generateReceiptContent(mockPayload);
    assert.ok(text.includes('ОФИЦИАЛЬНАЯ ЭЛЕКТРОННАЯ КВИТАНЦИЯ'), 'Заголовок квитанции должен присутствовать');
    assert.ok(text.includes(mockPayload.receiptToken), 'Код квитанции должен присутствовать в тексте');
    assert.ok(text.includes('Иванов Иван'), 'ФИО студента должно присутствовать в тексте');
    assert.ok(text.includes('АТИ-301'), 'Группа должна присутствовать в тексте');
    assert.ok(text.includes('75 из 100'), 'Баллы должны присутствовать в тексте');
    assert.ok(text.includes('c1_t1'), 'Идентификаторы задач должны присутствовать в тексте');
    assert.ok(text.includes('Проверочный хеш:'), 'Проверочный крипто-хеш должен присутствовать в тексте');
  });

  test('5.3. В полезной нагрузке для Google Таблицы присутствуют квитанция сдачи, исходные вопросы и ответы', async () => {
    const originalFetch = global.fetch;
    global.fetch = async () => ({
      ok: true,
      json: async () => ({ status: 'success' })
    });

    try {
      const sampleTasks = TaskBank.getRandomTasks();
      const answers = sampleTasks.map((t, idx) => ({
        taskId: t.id,
        category: t.category,
        categoryName: t.categoryName,
        title: t.title,
        scenario: t.scenario,
        question: t.question,
        unit: t.unit,
        expectedAnswer: t.correctAnswer,
        userAnswer: t.correctAnswer,
        userRawInput: String(t.correctAnswer),
        userNotes: `Тестовое примечание ${idx + 1}`,
        isCorrect: true,
        points: 25
      }));

      const payload = {
        surname: 'Сидоров',
        name: 'Алексей',
        group: 'АТИ-303',
        specialty: 'Управление качеством',
        answers,
        correctCount: 4,
        totalScore: 100,
        maxScore: 100,
        isAutoSubmit: false,
        timeSpentFormatted: '10 мин 15 сек',
        elapsedSeconds: 615
      };

      // Проверяем вызов GDriveSync.submitResults
      const res = await GDriveSync.submitResults(payload);
      assert.ok(res.receiptToken, 'Результат отправки должен содержать receiptToken');
      assert.match(res.receiptToken, /^RUDN-MB-[A-Z0-9]+-[A-Z0-9]+$/, 'Токен должен иметь формат RUDN-MB-XXXX-YYYY');

      // Проверяем сохраненный локальный бэкап
      const lastReceipt = JSON.parse(global.localStorage.getItem('rudn_microbio_last_receipt'));
      assert.ok(lastReceipt, 'Бэкап последней квитанции должен существовать');
      assert.equal(lastReceipt.receiptToken, res.receiptToken);
      assert.equal(lastReceipt.sessionToken, res.receiptToken);

      // Проверяем сохранение исходных вопросов и ответов для каждой задачи
      assert.equal(lastReceipt.answers.length, 4);
      lastReceipt.answers.forEach((ans, i) => {
        assert.ok(ans.question && ans.question.length > 5, `Задача ${i + 1} должна содержать исходный вопрос`);
        assert.ok(ans.scenario && ans.scenario.length > 5, `Задача ${i + 1} должна содержать исходное условие`);
        assert.ok(ans.userAnswer !== null, `Задача ${i + 1} должна содержать ответ пользователя`);
        assert.ok(ans.expectedAnswer !== null, `Задача ${i + 1} должна содержать эталонный ответ`);
      });

      // Проверяем плоские поля task1_question, task1_answer и т.д.
      for (let i = 1; i <= 4; i++) {
        assert.ok(lastReceipt[`task${i}_question`], `Поле task${i}_question должно быть заполнено`);
        assert.ok(lastReceipt[`task${i}_answer`], `Поле task${i}_answer должно быть заполнено`);
        assert.ok(lastReceipt[`task${i}_expected`], `Поле task${i}_expected должно быть заполнено`);
      }
    } finally {
      global.fetch = originalFetch;
    }
  });

  test('5.4. Симуляция формирования строки ведомости Google Таблицы', () => {
    const token = 'RUDN-MB-MU0KSLNR-U1RY';
    const mockData = {
      receiptToken: token,
      surname: 'Смирнова',
      name: 'Елена',
      group: 'АТИ-301',
      specialty: 'Стандартизация и метрология',
      totalScore: 75,
      correctCount: 3,
      timeSpentFormatted: '13 мин 20 сек',
      isAutoSubmit: false,
      answers: [
        {
          taskId: 'c1_t1',
          categoryName: 'Автопротолиз воды',
          scenario: 'При контроле сока pH = 3.40',
          question: 'Рассчитайте [H+] в мкМ',
          userAnswer: 398.1,
          expectedAnswer: 398.1,
          unit: 'мкМ',
          isCorrect: true,
          points: 25,
          userNotes: '10^(-3.4)'
        },
        {
          taskId: 'c2_t1',
          categoryName: 'Ионная сила',
          scenario: 'Раствор солей',
          question: 'Рассчитайте ионную силу',
          userAnswer: 0.0375,
          expectedAnswer: 0.0375,
          unit: 'моль/л',
          isCorrect: true,
          points: 25,
          userNotes: ''
        },
        {
          taskId: 'c3_t1',
          categoryName: 'Гендерсон-Хассельбах',
          scenario: 'Клюквенный морс',
          question: 'Рассчитайте долю HA',
          userAnswer: 86.04,
          expectedAnswer: 86.04,
          unit: '%',
          isCorrect: true,
          points: 25,
          userNotes: ''
        },
        {
          taskId: 'c4_t1',
          categoryName: 'Растворимость',
          scenario: 'Осадок сорбиновой кислоты',
          question: 'Рассчитайте pH_крит',
          userAnswer: 2.50,
          expectedAnswer: 3.28,
          unit: 'ед. pH',
          isCorrect: false,
          points: 0,
          userNotes: 'ошибка в логарифме'
        }
      ]
    };

    // Эмуляция сборки строки как в google-apps-script/Code.gs
    const taskColumns = [];
    mockData.answers.forEach((ans) => {
      const tId = `[${ans.taskId}] ${ans.categoryName}`;
      const tQuestion = `${ans.scenario}\nВопрос: ${ans.question}`;
      const tUserAns = `${ans.userAnswer} ${ans.unit}`;
      const tExpected = `${ans.expectedAnswer} ${ans.unit}`;
      const tPoints = `${ans.points} б. (${ans.isCorrect ? 'Верно' : 'Неверно'})`;
      taskColumns.push(tId, tQuestion, tUserAns, tExpected, tPoints);
    });

    const row = [
      mockData.receiptToken,
      '2026-09-14 04:45:00',
      mockData.surname,
      mockData.name,
      mockData.group,
      mockData.specialty,
      `${mockData.totalScore} из 100`,
      `${mockData.correctCount} из 4`,
      mockData.timeSpentFormatted,
      mockData.isAutoSubmit ? 'Автосдача' : 'Штатная сдача'
    ].concat(taskColumns);

    // Верификация ключевых колонок
    assert.equal(row[0], token, 'Колонка 1 обязана содержать токен квитанции');
    assert.equal(row[2], 'Смирнова', 'Колонка 3 обязана содержать фамилию');
    assert.equal(row[4], 'АТИ-301', 'Колонка 5 обязана содержать группу');

    // Проверка наличия исходных вопросов и ответов
    assert.ok(row[11].includes('Рассчитайте [H+] в мкМ'), 'Колонка вопроса задачи 1 должна содержать текст вопроса');
    assert.equal(row[12], '398.1 мкМ', 'Колонка ответа задачи 1 должна содержать ответ студента');
    assert.equal(row[13], '398.1 мкМ', 'Колонка эталона задачи 1 должна содержать эталон');
    assert.equal(row[14], '25 б. (Верно)', 'Колонка результата задачи 1 должна содержать вердикт');

    // Проверка 4 задачи (неверной)
    assert.ok(row[26].includes('Рассчитайте pH_крит'), 'Колонка вопроса задачи 4 должна содержать текст вопроса');
    assert.equal(row[27], '2.5 ед. pH', 'Колонка ответа задачи 4 должна содержать неверный ответ студента');
    assert.equal(row[28], '3.28 ед. pH', 'Колонка эталона задачи 4 должна содержать верный эталон');
    assert.equal(row[29], '0 б. (Неверно)', 'Колонка результата задачи 4 должна содержать 0 б. (Неверно)');
  });
});

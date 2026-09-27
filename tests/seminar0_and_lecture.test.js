/**
 * Тесты для Лекции 1 (45 слайдов) и Семинара 0 (банк 60 задач, валидация)
 * Запуск: node --test tests/seminar0_and_lecture.test.js
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { TaskBankSem0, TASK_BANK_SEM0 } = require('../js/task-bank-sem0.js');

// Загрузка LECTURE1_SLIDES из JS файла
const lectureJsContent = fs.readFileSync(path.join(__dirname, '../js/lecture1-slides.js'), 'utf-8');
const lectureSlidesMatch = lectureJsContent.match(/const LECTURE1_SLIDES = (\[[\s\S]*\]);/);
const LECTURE1_SLIDES = lectureSlidesMatch ? JSON.parse(lectureSlidesMatch[1]) : [];

describe('ГРУППА 1: Схема и целостность базы слайдов Лекции 1', () => {
  test('1.1. База содержит ровно 45 слайдов', () => {
    assert.equal(LECTURE1_SLIDES.length, 45, 'Лекция 1 должна содержать ровно 45 слайдов');
  });

  test('1.2. Каждый слайд имеет уникальный id от 1 до 45 и валидный type', () => {
    const validTypes = ['title', 'wide_cards_2', 'split_media', 'horizontal_media'];
    const ids = new Set();

    LECTURE1_SLIDES.forEach((slide, idx) => {
      assert.equal(slide.id, idx + 1, `ID слайда должен быть ${idx + 1}`);
      assert.ok(!ids.has(slide.id), `Дубликат ID: ${slide.id}`);
      ids.add(slide.id);

      assert.ok(validTypes.includes(slide.type), `Неизвестный тип слайда ${slide.type} у слайда ${slide.id}`);
      assert.ok(slide.title && slide.title.length > 0, `У слайда ${slide.id} отсутствует заголовок`);
    });
  });

  test('1.3. Все медиа-файлы слайдов физически существуют на диске', () => {
    let imageCount = 0;
    LECTURE1_SLIDES.forEach(slide => {
      if (slide.image) {
        imageCount++;
        const fullPath = path.join(__dirname, '..', slide.image);
        assert.ok(fs.existsSync(fullPath), `Файл изображения не найден: ${fullPath}`);
      }
    });
    assert.equal(imageCount, 26, 'Должно быть ровно 26 слайдов с иллюстрациями');
  });
});

describe('ГРУППА 2: Схема и целостность банка расчетных задач Семинара 0', () => {
  test('2.1. Банк Семинара 0 содержит ровно 60 расчетных задач', () => {
    assert.equal(TASK_BANK_SEM0.length, 60, 'В банке Семинара 0 должно быть ровно 60 задач (3x к Семинару 1)');
    assert.equal(TaskBankSem0.getAllTasks().length, 60);
  });

  test('2.2. В банке ровно 6 категорий, по 10 задач в каждой', () => {
    for (let cat = 1; cat <= 6; cat++) {
      const catTasks = TaskBankSem0.getTasksByCategory(cat);
      assert.equal(catTasks.length, 10, `Категория ${cat} должна содержать ровно 10 задач`);
      catTasks.forEach(task => {
        assert.equal(task.category, cat, `Категория задачи ${task.id} должна быть равна ${cat}`);
      });
    }
  });

  test('2.3. Все задачи обладают валидными обязательными полями', () => {
    const requiredFields = [
      'id', 'category', 'categoryName', 'badge', 'title', 
      'scenario', 'question', 'unit', 'placeholder', 
      'correctAnswer', 'tolerancePercent', 'hint'
    ];

    const seenIds = new Set();

    TASK_BANK_SEM0.forEach(task => {
      assert.ok(!seenIds.has(task.id), `Дубликат ID: ${task.id}`);
      seenIds.add(task.id);

      requiredFields.forEach(field => {
        assert.ok(task[field] !== undefined && task[field] !== null, 
          `Задача ${task.id} не имеет обязательного поля '${field}'`);
      });

      assert.equal(typeof task.correctAnswer, 'number');
      assert.ok(typeof task.tolerancePercent === 'number' && task.tolerancePercent > 0);
    });
  });

  test('2.4. Функция getRandomTasks() возвращает ровно 12 задач (по 2 из 6 категорий)', () => {
    for (let run = 0; run < 10; run++) {
      const ticket = TaskBankSem0.getRandomTasks();
      assert.equal(ticket.length, 12, 'В билете должно быть ровно 12 задач');

      const catCounts = {};
      const ids = new Set();

      ticket.forEach(task => {
        catCounts[task.category] = (catCounts[task.category] || 0) + 1;
        assert.ok(!ids.has(task.id), `Повторяющаяся задача ${task.id} в одном билете`);
        ids.add(task.id);
      });

      for (let cat = 1; cat <= 6; cat++) {
        assert.equal(catCounts[cat], 2, `В билете должно быть ровно 2 задачи из категории ${cat}`);
      }
    }
  });

  test('2.5. Валидация ответов студентов работает корректно с учетом допусков', () => {
    const task = TaskBankSem0.getTaskById('sem0_c1_t1'); // C = 0.500 моль/л, tol = 2%
    assert.ok(task);

    // Точный ответ
    assert.ok(TaskBankSem0.validateAnswer(task, '0.500'));
    assert.ok(TaskBankSem0.validateAnswer(task, '0,500'));
    assert.ok(TaskBankSem0.validateAnswer(task, 0.500));

    // В пределах допуска +-2% (0.491 to 0.509)
    assert.ok(TaskBankSem0.validateAnswer(task, '0.505'));
    assert.ok(TaskBankSem0.validateAnswer(task, '0.495'));

    // За пределами допуска
    assert.ok(!TaskBankSem0.validateAnswer(task, '0.520'));
    assert.ok(!TaskBankSem0.validateAnswer(task, '0.470'));
    assert.ok(!TaskBankSem0.validateAnswer(task, 'abc'));
  });
});

/**
 * Конфигурация веб-портала и параметров экспресс-тестирования
 * Курс «Пищевая микробиология, санитария и гигиена» • АТИ РУДН
 */

const CONFIG = {
  // URL веб-приложения Google Apps Script для записи в Google Таблицу на Google Drive
  // Замените на ваш URL после развертывания по инструкции в google-apps-script/README.md
  GOOGLE_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbxv6vGp48TgIBfqOjqogr4MoTrSvonn8LeagFA80OLKbZ2TaFosgB97LMSM4zljwJQ/exec',

  // Время на выполнение тестирования (в минутах)
  TEST_DURATION_MINUTES: 15,

  // Количество случайных задач (по 1 из каждого раздела)
  TOTAL_TASKS: 4,

  // Баллов за каждую задачу
  POINTS_PER_TASK: 25,

  // Максимальный балл
  MAX_SCORE: 100,

  // Версия платформы
  VERSION: '2.0.0 (IBM Carbon)'
};

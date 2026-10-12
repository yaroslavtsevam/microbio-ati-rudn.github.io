/**
 * Конфигурация веб-портала и параметров выполнения домашних заданий
 * Курс «Пищевая микробиология, санитария и гигиена» • АТИ РУДН
 */

const CONFIG = {
  // URL веб-приложения Google Apps Script для записи в Google Таблицу на Google Drive
  // Замените на ваш URL после развертывания по инструкции в google-apps-script/README.md
  GOOGLE_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbwcLuQFnT6FLQW5Kp8xgVbbLjs66nkqhZKcD-G8xGoPDJNe04wDOOzz38WUwFy1OYny/exec',

  // Время на выполнение домашнего задания (в минутах)
  TEST_DURATION_MINUTES: 30,

  // Количество расчетных задач в билете домашнего задания
  TOTAL_TASKS: 6,

  // Максимальный балл
  MAX_SCORE: 100,

  // Версия платформы
  VERSION: '2.5.0 (Homework & Zero-Knowledge)'
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { CONFIG };
}

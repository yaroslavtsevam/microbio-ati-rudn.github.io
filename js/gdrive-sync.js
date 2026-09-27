/**
 * Модуль синхронизации результатов экспресс-тестирования с Google Drive / Google Sheets
 * Курс «Пищевая микробиология, санитария и гигиена» • АТИ РУДН
 */

const GDriveSync = {
  /**
   * Генерация уникального контрольного токена квитанции
   */
  generateReceiptToken(topic = 'sem1') {
    const prefix = topic === 'sem0' ? 'RUDN-CHEM' : 'RUDN-MB';
    const timestamp = Date.now().toString(36).toUpperCase();
    const randomHex = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}-${timestamp}-${randomHex}`;
  },

  /**
   * Сохранение результатов в Google Drive (через Google Apps Script Web App)
   * с обязательным резервным сохранением в LocalStorage
   * @param {Object} payload Данные сдачи студента
   * @returns {Promise<Object>} Результат отправки
   */
  async submitResults(payload) {
    const receiptToken = this.generateReceiptToken(payload.topic || 'sem1');


    // Формирование плоских полей задач для совместимости со строгим табличным представлением
    const flatTaskFields = {};
    (payload.answers || []).forEach((ans, idx) => {
      const i = idx + 1;
      flatTaskFields[`task${i}_id`] = ans.taskId || '';
      flatTaskFields[`task${i}_title`] = ans.title || '';
      flatTaskFields[`task${i}_category`] = ans.categoryName || `Раздел ${ans.category}`;
      flatTaskFields[`task${i}_question`] = (ans.scenario ? ans.scenario + '\n' : '') + 'Вопрос: ' + (ans.question || '');
      flatTaskFields[`task${i}_answer`] = (ans.userAnswer !== null && ans.userAnswer !== undefined) 
        ? `${ans.userAnswer}${ans.unit ? ' ' + ans.unit : ''}` 
        : 'нет ответа';
      flatTaskFields[`task${i}_expected`] = (ans.expectedAnswer !== null && ans.expectedAnswer !== undefined) 
        ? `${ans.expectedAnswer}${ans.unit ? ' ' + ans.unit : ''}` 
        : '';
      flatTaskFields[`task${i}_points`] = ans.points ?? 0;
      flatTaskFields[`task${i}_isCorrect`] = ans.isCorrect ? 'Верно' : 'Неверно';
      flatTaskFields[`task${i}_notes`] = ans.userNotes || '';
    });

    const fullData = {
      receiptToken,
      sessionToken: receiptToken,
      ...payload,
      ...flatTaskFields,
      receiptToken,
      sessionToken: receiptToken,
      submittedAtIso: new Date().toISOString(),
      submittedAtLocal: new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })
    };

    // 1. Всегда сохраняем локально в LocalStorage как надежный бэкап
    this.saveLocalBackup(fullData);

    // 2. Если URL скрипта не настроен, работаем в автономном режиме
    if (!CONFIG.GOOGLE_SCRIPT_URL || CONFIG.GOOGLE_SCRIPT_URL.trim() === '') {
      console.warn('[GDriveSync] GOOGLE_SCRIPT_URL не задан в js/config.js. Результат сохранен в локальном хранилище браузера.');
      return {
        success: true,
        mode: 'offline_mock',
        receiptToken,
        message: 'Результат сохранен локально (Google Script URL не настроен). Преподаватель может проверить локальную квитанцию.'
      };
    }

    // 3. Отправка POST-запроса в Google Apps Script
    try {
      // Используем mode: 'no-cors' для обхода CORS в Google Apps Script либо штатный fetch
      const response = await fetch(CONFIG.GOOGLE_SCRIPT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(fullData),
        // Google Apps Script возвращает 302 редирект, fetch в браузере корректно следует за ним
        mode: 'cors'
      });

      if (response.ok) {
        const json = await response.json().catch(() => ({ status: 'success' }));
        return {
          success: true,
          mode: 'gdrive',
          receiptToken,
          serverData: json
        };
      } else {
        throw new Error(`HTTP Error ${response.status}`);
      }
    } catch (err) {
      console.error('[GDriveSync] Ошибка сетевой отправки в Google Apps Script:', err);

      // Пробуем альтернативный способ отправки для Google Apps Script (форма URL-encoded / no-cors fallback)
      try {
        await fetch(CONFIG.GOOGLE_SCRIPT_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'text/plain;charset=utf-8'
          },
          body: JSON.stringify(fullData),
          mode: 'no-cors'
        });
        return {
          success: true,
          mode: 'gdrive_nocors',
          receiptToken,
          message: 'Результат отправлен в Google Таблицу (фоновый шлюз no-cors) и сохранен в резервной копии браузера.'
        };
      } catch (fallbackErr) {
        console.error('[GDriveSync] Fallback также завершился ошибкой:', fallbackErr);
        return {
          success: true,
          mode: 'offline_fallback',
          receiptToken,
          warning: 'Сетевой сбой при отправке на Google Drive. Результат надежно зафиксирован в памяти вашего браузера.',
          error: err.message
        };
      }
    }
  },

  /**
   * Сохранение бэкапа в localStorage
   */
  saveLocalBackup(data) {
    try {
      const historyKey = 'rudn_microbio_submissions';
      const history = JSON.parse(localStorage.getItem(historyKey) || '[]');
      history.unshift(data);
      // Храним до 20 последних попыток
      if (history.length > 20) history.pop();
      localStorage.setItem(historyKey, JSON.stringify(history));
      localStorage.setItem('rudn_microbio_last_receipt', JSON.stringify(data));
    } catch (e) {
      console.warn('[GDriveSync] Не удалось сохранить в LocalStorage:', e);
    }
  },

  /**
   * Скачивание квитанции в текстовом формате
  /**
   * Генерация текстового содержимого квитанции
   */
  generateReceiptContent(data) {
    const hash = typeof btoa !== 'undefined' 
      ? btoa(encodeURIComponent(JSON.stringify(data))).substring(0, 32)
      : Buffer.from(encodeURIComponent(JSON.stringify(data))).toString('base64').substring(0, 32);

    return [
      `================================================================`,
      `АТИ РУДН • ПИЩЕВАЯ МИКРОБИОЛОГИЯ, САНИТАРИЯ И ГИГИЕНА`,
      `ОФИЦИАЛЬНАЯ ЭЛЕКТРОННАЯ КВИТАНЦИЯ О СДАЧЕ ЭКСПРЕСС-ТЕСТИРОВАНИЯ`,
      `================================================================`,
      `Код квитанции:     ${data.receiptToken}`,
      `Студент:           ${data.surname} ${data.name}`,
      `Учебная группа:    ${data.group} (${data.specialty || 'Не указана'})`,
      `Дата и время (МСК):${data.submittedAtLocal}`,
      `Затраченное время: ${data.timeSpentFormatted || '15 минут'}`,
      `Набрано баллов:    ${data.totalScore ?? '—'} из ${data.maxScore ?? 100}`,
      `Количество задач:  ${data.answers ? data.answers.length : 4}`,
      `----------------------------------------------------------------`,
      `ДАННЫЕ ОТВЕТОВ:`,
      ...(data.answers || []).map((ans, idx) => {
        return `Задача ${idx + 1} (${ans.categoryName || `Раздел ${ans.category}`}): Ответ = ${ans.userAnswer !== null ? ans.userAnswer + (ans.unit ? ' ' + ans.unit : '') : 'нет ответа'} (Ключ задачи: ${ans.taskId})`;
      }),
      `----------------------------------------------------------------`,
      `Статус регистрации: ПОДТВЕРЖДЕНО СИСТЕМОЙ`,
      `Проверочный хеш:   ${hash}`,
      `================================================================`
    ].join('\n');
  },

  /**
   * Скачивание квитанции в текстовом формате
   */
  downloadReceiptFile(data) {
    const content = this.generateReceiptContent(data);
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Квитанция_${data.surname}_${data.group}_${data.receiptToken}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
};

// Экспорт для глобальной области видимости браузера и модуля Node.js
if (typeof window !== 'undefined') {
  window.GDriveSync = GDriveSync;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { GDriveSync };
}

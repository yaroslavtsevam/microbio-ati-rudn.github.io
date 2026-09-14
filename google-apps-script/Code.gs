/**
 * Google Apps Script для автоматической фиксации результатов экспресс-тестирования
 * Курс «Пищевая микробиология, санитария и гигиена» • АТИ РУДН
 * Репозиторий: https://github.com/yaroslavtsevam/microbio-ati-rudn.github.io
 */

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    // Блокировка на 10 сек для предотвращения коллизий одновременных записей
    lock.waitLock(10000);

    var rawData = e.postData ? e.postData.contents : null;
    var data = {};
    if (rawData) {
      try {
        data = JSON.parse(rawData);
      } catch (err) {
        data = e.parameter || {};
      }
    } else {
      data = e.parameter || {};
    }

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheetName = "Ведомость_Семинар_1";
    var sheet = ss.getSheetByName(sheetName);

    // Если листа нет, создаем и оформляем шапку таблицы
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      var headers = [
        "Дата и время",
        "Фамилия",
        "Имя",
        "Академическая группа",
        "ID варианта",
        "Задача 1 (pH / Вода)",
        "Задача 2 (Ионная сила)",
        "Задача 3 (Консервант)",
        "Задача 4 (Растворимость)",
        "Правильных ответов",
        "Итоговый балл (из 100)",
        "Затрачено времени",
        "Контрольный токен сессии"
      ];
      sheet.appendRow(headers);
      var headerRange = sheet.getRange(1, 1, 1, headers.length);
      headerRange.setFontWeight("bold");
      headerRange.setBackground("#0F62FE");
      headerRange.setFontColor("#FFFFFF");
      sheet.setFrozenRows(1);
    }

    var now = new Date();
    var timeFormatted = Utilities.formatDate(now, "Europe/Moscow", "yyyy-MM-dd HH:mm:ss");

    var row = [
      timeFormatted,
      data.surname || "",
      data.name || "",
      data.group || "",
      data.variantId || "Случайный",
      data.task1_answer !== undefined ? String(data.task1_answer) : "",
      data.task2_answer !== undefined ? String(data.task2_answer) : "",
      data.task3_answer !== undefined ? String(data.task3_answer) : "",
      data.task4_answer !== undefined ? String(data.task4_answer) : "",
      data.correctCount !== undefined ? data.correctCount : "",
      data.totalScore !== undefined ? data.totalScore : "",
      data.timeSpentFormatted || (data.timeSpentSeconds ? Math.round(data.timeSpentSeconds / 60) + " мин" : ""),
      data.sessionToken || ""
    ];

    sheet.appendRow(row);

    var response = {
      status: "success",
      message: "Ответы успешно сохранены в ведомости Google Drive",
      timestamp: timeFormatted,
      rowNumber: sheet.getLastRow()
    };

    return ContentService.createTextOutput(JSON.stringify(response))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: "ok",
    service: "RUDN Microbiology Testing Service",
    timestamp: new Date().toISOString()
  })).setMimeType(ContentService.MimeType.JSON);
}

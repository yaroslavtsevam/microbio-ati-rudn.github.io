/**
 * Google Apps Script для автоматической фиксации результатов экспресс-тестирования
 * Курс «Пищевая микробиология, санитария и гигиена» • АТИ РУДН
 * Репозиторий: https://github.com/yaroslavtsevam/microbio-ati-rudn.github.io
 * 
 * Поддерживает:
 *  - Семинар 0 (Вводная химия): 12 расчетных задач -> Лист "Ведомость_Семинар_0"
 *  - Семинар 1 (Гомеостаз микроорганизмов): 4 расчетные задачи -> Лист "Ведомость_Семинар_1"
 */

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    // Блокировка на 10 сек для предотвращения коллизий при одновременной сдаче группой
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
    var topic = String(data.topic || 'sem0').toLowerCase();
    
    // Определение имени листа в зависимости от темы
    var sheetName = (topic === 'sem0' || topic.indexOf('хим') !== -1 || topic.indexOf('0') !== -1)
      ? "Ведомость_Семинар_0"
      : "Ведомость_Семинар_1";

    var sheet = ss.getSheetByName(sheetName);

    var answers = Array.isArray(data.answers) ? data.answers : [];
    var totalTasks = answers.length > 0 ? answers.length : (topic === 'sem0' ? 12 : 4);

    // Построение заголовков таблицы
    var headers = [
      "Квитанция сдачи (Receipt Token)",
      "Дата и время (МСК)",
      "Фамилия",
      "Имя",
      "Учебная группа",
      "Специальность",
      "Итоговый балл",
      "Верных ответов",
      "Затраченное время",
      "Режим сдачи"
    ];

    for (var t = 1; t <= totalTasks; t++) {
      headers.push(
        "Задача " + t + ": Раздел и ID",
        "Задача " + t + ": Исходное условие и вопрос",
        "Задача " + t + ": Исходный ответ студента",
        "Задача " + t + ": Эталонный ответ",
        "Задача " + t + ": Результат"
      );
    }

    headers.push("Ход решения / Примечания студента");

    // Если листа нет, создаем и оформляем шапку таблицы
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      sheet.appendRow(headers);
      formatHeaderRow(sheet, headers.length);
    } else {
      // Автоматическая актуализация шапки при изменении количества задач
      var currentCols = sheet.getLastColumn();
      var firstCell = sheet.getLastRow() >= 1 ? sheet.getRange(1, 1).getValue() : "";
      if (firstCell !== headers[0] || currentCols < headers.length) {
        sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
        formatHeaderRow(sheet, headers.length);
      }
    }

    var now = new Date();
    var timeFormatted = Utilities.formatDate(now, "Europe/Moscow", "yyyy-MM-dd HH:mm:ss");
    var receiptToken = data.receiptToken || data.sessionToken || "НЕТ_ТОКЕНА";

    // Извлечение данных по каждой задаче
    var taskColumns = [];
    var notesList = [];

    for (var i = 1; i <= totalTasks; i++) {
      var ans = answers[i - 1] || {};

      // 1. Идентификатор и тема
      var tId = ans.taskId 
        ? ("[" + ans.taskId + "] " + (ans.categoryName || ans.title || ("Раздел " + i))) 
        : (data["task" + i + "_id"] ? ("[" + data["task" + i + "_id"] + "] " + (data["task" + i + "_category"] || "")) : ("Раздел " + i));

      // 2. Исходное условие и вопрос задачи
      var tQuestion = "";
      if (ans.scenario && ans.question) {
        tQuestion = ans.scenario + "\nВопрос: " + ans.question;
      } else if (ans.question) {
        tQuestion = ans.question;
      } else if (data["task" + i + "_question"]) {
        tQuestion = data["task" + i + "_question"];
      } else {
        tQuestion = "Условие не передано";
      }

      // 3. Исходный ответ студента
      var tUserAns = "";
      if (ans.userAnswer !== undefined && ans.userAnswer !== null) {
        tUserAns = String(ans.userAnswer) + (ans.unit ? (" " + ans.unit) : "");
      } else if (ans.userRawInput) {
        tUserAns = String(ans.userRawInput) + (ans.unit ? (" " + ans.unit) : "");
      } else if (data["task" + i + "_answer"] !== undefined && data["task" + i + "_answer"] !== "") {
        tUserAns = String(data["task" + i + "_answer"]);
      } else {
        tUserAns = "нет ответа";
      }

      // 4. Эталонный ответ
      var tExpected = "";
      if (ans.expectedAnswer !== undefined && ans.expectedAnswer !== null) {
        tExpected = String(ans.expectedAnswer) + (ans.unit ? (" " + ans.unit) : "");
      } else if (data["task" + i + "_expected"]) {
        tExpected = String(data["task" + i + "_expected"]);
      } else {
        tExpected = "—";
      }

      // 5. Результат проверки и баллы
      var tPoints = "";
      if (ans.points !== undefined) {
        tPoints = Math.round(ans.points * 10) / 10 + " б. (" + (ans.isCorrect ? "Верно" : "Неверно") + ")";
      } else if (data["task" + i + "_points"] !== undefined) {
        tPoints = data["task" + i + "_points"] + " б. (" + (data["task" + i + "_isCorrect"] || "") + ")";
      } else {
        tPoints = "—";
      }

      taskColumns.push(tId, tQuestion, tUserAns, tExpected, tPoints);

      if (ans.userNotes && String(ans.userNotes).trim()) {
        notesList.push("Задача " + i + ": " + String(ans.userNotes).trim());
      } else if (data["task" + i + "_notes"] && String(data["task" + i + "_notes"]).trim()) {
        notesList.push("Задача " + i + ": " + String(data["task" + i + "_notes"]).trim());
      }
    }

    var totalScoreVal = data.totalScore !== undefined ? data.totalScore : 0;
    var correctCountVal = data.correctCount !== undefined 
      ? data.correctCount 
      : answers.filter(function(a) { return a.isCorrect; }).length;

    var timeSpent = data.timeSpentFormatted || (data.elapsedSeconds ? Math.floor(data.elapsedSeconds / 60) + " мин " + (data.elapsedSeconds % 60) + " сек" : "15 мин");
    var submitMode = data.isAutoSubmit ? "Автосдача (таймаут)" : "Штатная сдача студентом";

    var allNotes = notesList.length > 0 ? notesList.join("\n") : "—";

    var row = [
      receiptToken,
      timeFormatted,
      data.surname || "",
      data.name || "",
      data.group || "",
      data.specialty || "—",
      totalScoreVal + " из 100",
      correctCountVal + " из " + totalTasks,
      timeSpent,
      submitMode
    ].concat(taskColumns).concat([allNotes]);

    sheet.appendRow(row);

    var lastRowIdx = sheet.getLastRow();
    // Выравнивание по верхнему краю для комфортного чтения больших текстов условий
    sheet.getRange(lastRowIdx, 1, 1, row.length).setVerticalAlignment("top");

    var response = {
      status: "success",
      sheetName: sheetName,
      receiptToken: receiptToken,
      message: "Ответы (" + totalTasks + " задач), исходные вопросы и квитанция успешно сохранены в листе [" + sheetName + "]",
      timestamp: timeFormatted,
      rowNumber: lastRowIdx
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

function formatHeaderRow(sheet, numColumns) {
  var headerRange = sheet.getRange(1, 1, 1, numColumns);
  headerRange.setFontWeight("bold");
  headerRange.setBackground("#0F62FE"); // IBM Carbon Blue
  headerRange.setFontColor("#FFFFFF");
  headerRange.setWrap(true);
  sheet.setRowHeight(1, 45);
  sheet.setFrozenRows(1);
}

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: "ok",
    service: "RUDN Microbiology & Chemistry Testing Gateway (v2.2 Universal)",
    supportedSeminars: ["Семинар 0 (12 задач)", "Семинар 1 (4 задачи)"],
    timestamp: new Date().toISOString()
  })).setMimeType(ContentService.MimeType.JSON);
}

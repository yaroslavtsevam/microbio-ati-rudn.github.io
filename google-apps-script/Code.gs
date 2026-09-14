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
      "Режим сдачи",

      "Задача 1: Раздел и ID",
      "Задача 1: Исходное условие и вопрос",
      "Задача 1: Исходный ответ студента",
      "Задача 1: Эталонный ответ",
      "Задача 1: Результат",

      "Задача 2: Раздел и ID",
      "Задача 2: Исходное условие и вопрос",
      "Задача 2: Исходный ответ студента",
      "Задача 2: Эталонный ответ",
      "Задача 2: Результат",

      "Задача 3: Раздел и ID",
      "Задача 3: Исходное условие и вопрос",
      "Задача 3: Исходный ответ студента",
      "Задача 3: Эталонный ответ",
      "Задача 3: Результат",

      "Задача 4: Раздел и ID",
      "Задача 4: Исходное условие и вопрос",
      "Задача 4: Исходный ответ студента",
      "Задача 4: Эталонный ответ",
      "Задача 4: Результат",

      "Ход решения / Примечания студента"
    ];

    // Если листа нет, создаем и оформляем шапку таблицы
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      sheet.appendRow(headers);
      formatHeaderRow(sheet, headers.length);
    } else if (sheet.getLastRow() <= 1) {
      // Если лист пуст или содержит только старую короткую шапку без данных, обновляем шапку
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      formatHeaderRow(sheet, headers.length);
    }

    var now = new Date();
    var timeFormatted = Utilities.formatDate(now, "Europe/Moscow", "yyyy-MM-dd HH:mm:ss");
    var receiptToken = data.receiptToken || data.sessionToken || "НЕТ_ТОКЕНА";

    var answers = Array.isArray(data.answers) ? data.answers : [];

    // Извлечение данных по каждой из 4 задач
    var taskColumns = [];
    var notesList = [];

    for (var i = 1; i <= 4; i++) {
      var ans = answers[i - 1] || {};

      // 1. Идентификатор и тема
      var tId = ans.taskId ? ("[" + ans.taskId + "] " + (ans.categoryName || ans.title || ("Раздел " + i))) 
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
        tPoints = ans.points + " б. (" + (ans.isCorrect ? "Верно" : "Неверно") + ")";
      } else if (data["task" + i + "_points"] !== undefined) {
        tPoints = data["task" + i + "_points"] + " б. (" + (data["task" + i + "_isCorrect"] || "") + ")";
      } else {
        tPoints = "—";
      }

      taskColumns.push(tId, tQuestion, tUserAns, tExpected, tPoints);

      if (ans.userNotes && ans.userNotes.trim()) {
        notesList.push("Задача " + i + ": " + ans.userNotes.trim());
      } else if (data["task" + i + "_notes"] && String(data["task" + i + "_notes"]).trim()) {
        notesList.push("Задача " + i + ": " + String(data["task" + i + "_notes"]).trim());
      }
    }

    var totalScoreVal = data.totalScore !== undefined ? data.totalScore : 0;
    var correctCountVal = data.correctCount !== undefined 
      ? data.correctCount 
      : answers.filter(function(a) { return a.isCorrect; }).length;

    var timeSpent = data.timeSpentFormatted || (data.elapsedSeconds ? Math.floor(data.elapsedSeconds / 60) + " мин " + (data.elapsedSeconds % 60) + " сек" : "15 мин");
    var submitMode = data.isAutoSubmit ? "Автосдача (таймаут 15 мин)" : "Штатная сдача студентом";

    var allNotes = notesList.length > 0 ? notesList.join("\n") : "—";

    var row = [
      receiptToken,
      timeFormatted,
      data.surname || "",
      data.name || "",
      data.group || "",
      data.specialty || "—",
      totalScoreVal + " из 100",
      correctCountVal + " из 4",
      timeSpent,
      submitMode
    ].concat(taskColumns).concat([allNotes]);

    sheet.appendRow(row);

    var lastRowIdx = sheet.getLastRow();
    // Выравнивание ячеек по верхнему краю для комфортного чтения условий
    sheet.getRange(lastRowIdx, 1, 1, row.length).setVerticalAlignment("top");

    var response = {
      status: "success",
      receiptToken: receiptToken,
      message: "Ответы, исходные вопросы и квитанция успешно сохранены в Google Таблице",
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
    service: "RUDN Microbiology Testing Service (v2.1 with Receipt & Questions)",
    timestamp: new Date().toISOString()
  })).setMimeType(ContentService.MimeType.JSON);
}

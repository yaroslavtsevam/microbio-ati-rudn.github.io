/**
 * Модуль управления сессией экспресс-тестирования (Семинары 0, 1 и 2)
 * Курс «Пищевая микробиология, санитария и гигиена» • АТИ РУДН
 */

const TestSession = {
  state: {
    student: {
      surname: '',
      name: '',
      group: '',
      specialty: '',
      topic: 'sem2'
    },
    tasks: [],
    startTime: null,
    endTime: null,
    totalSeconds: 15 * 60,
    remainingSeconds: 15 * 60,
    timerInterval: null,
    isSubmitted: false
  },

  init() {
    this.bindEvents();
    this.checkActiveSession();
  },

  bindEvents() {
    const startBtn = document.getElementById('btn-start-test');
    if (startBtn) {
      startBtn.addEventListener('click', () => this.startNewSession());
    }

    const submitBtn = document.getElementById('btn-submit-test');
    if (submitBtn) {
      submitBtn.addEventListener('click', () => {
        if (confirm('Вы уверены, что хотите завершить тестирование и отправить ответы?')) {
          this.submitSession(false);
        }
      });
    }

    const topicSelect = document.getElementById('student-test-topic');
    if (topicSelect) {
      topicSelect.addEventListener('change', (e) => {
        const desc = document.getElementById('test-topic-description');
        if (desc) {
          if (e.target.value === 'sem0') {
            desc.innerHTML = '⏱ <strong>30 минут</strong> • <strong>12 расчетных задач</strong> (по 2 из 6 категорий базовой химии) • Максимум: 100 баллов';
          } else if (e.target.value === 'sem2') {
            desc.innerHTML = '⏱ <strong>15 минут</strong> • <strong>6 расчетных задач</strong> (по 1 из 6 разделов RedOx, rH₂, синтрофии и АФК) • Максимум: 100 баллов';
          } else {
            desc.innerHTML = '⏱ <strong>15 минут</strong> • <strong>4 расчетные задачи</strong> (по 1 из 4 разделов гомеостаза) • Максимум: 100 баллов';
          }
        }
      });
    }
  },

  /**
   * Восстановление сессии при случайной перезагрузке страницы
   */
  checkActiveSession() {
    try {
      const saved = sessionStorage.getItem('rudn_active_test_session');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (!parsed.isSubmitted && parsed.startTime) {
          const elapsed = Math.floor((Date.now() - parsed.startTime) / 1000);
          const duration = parsed.totalSeconds || (15 * 60);
          const remaining = duration - elapsed;
          if (remaining > 0) {
            this.state = parsed;
            this.state.remainingSeconds = remaining;
            this.showTestView();
            this.renderTasks();
            this.startTimer();
          } else {
            sessionStorage.removeItem('rudn_active_test_session');
          }
        }
      }
    } catch (e) {
      console.warn('Session restore error:', e);
    }
  },

  /**
   * Старт нового тестирования
   */
  startNewSession() {
    const surnameInput = document.getElementById('student-surname');
    const nameInput = document.getElementById('student-name');
    const groupInput = document.getElementById('student-group');
    const specialtyInput = document.getElementById('student-specialty');
    const topicInput = document.getElementById('student-test-topic');
    const errorBox = document.getElementById('reg-error-box');

    const surname = surnameInput ? surnameInput.value.trim() : '';
    const name = nameInput ? nameInput.value.trim() : '';
    const group = groupInput ? groupInput.value.trim() : '';
    const specialty = specialtyInput ? specialtyInput.value : '';
    const topic = topicInput ? topicInput.value : 'sem2';

    if (!surname || !name || !group) {
      if (errorBox) {
        errorBox.style.display = 'block';
        errorBox.textContent = 'Пожалуйста, заполните обязательные поля: Фамилия, Имя и Учебная группа.';
      }
      return;
    }

    if (errorBox) errorBox.style.display = 'none';

    const isSem0 = topic === 'sem0';
    const isSem2 = topic === 'sem2';
    const durationMinutes = isSem0 ? 30 : 15;

    this.state.student = { surname, name, group, specialty, topic };
    
    if (isSem0) {
      this.state.tasks = typeof TaskBankSem0 !== 'undefined' ? TaskBankSem0.getRandomTasks() : [];
    } else if (isSem2) {
      this.state.tasks = typeof TaskBankSem2 !== 'undefined' ? TaskBankSem2.getRandomTasks() : [];
    } else {
      this.state.tasks = typeof TaskBank !== 'undefined' ? TaskBank.getRandomTasks() : [];
    }

    this.state.startTime = Date.now();
    this.state.totalSeconds = durationMinutes * 60;
    this.state.remainingSeconds = this.state.totalSeconds;
    this.state.isSubmitted = false;

    // Сохранение в sessionStorage
    sessionStorage.setItem('rudn_active_test_session', JSON.stringify(this.state));

    this.showTestView();
    this.renderTasks();
    this.startTimer();
  },

  /**
   * Переключение между шагами теста (Регистрация -> Задачи -> Квитанция)
   */
  showTestView() {
    const stepReg = document.getElementById('test-step-registration');
    const stepActive = document.getElementById('test-step-active');
    const stepReceipt = document.getElementById('test-step-receipt');
    const timerBar = document.getElementById('test-timer-bar');

    if (stepReg) stepReg.style.display = 'none';
    if (stepActive) stepActive.style.display = 'block';
    if (stepReceipt) stepReceipt.style.display = 'none';
    if (timerBar) timerBar.style.display = 'flex';

    // Заполнение метаданных студента в верхней плашке
    const studentMeta = document.getElementById('test-timer-student');
    if (studentMeta) {
      studentMeta.innerHTML = `Студент: <strong>${this.state.student.surname} ${this.state.student.name}</strong> • Группа: <strong>${this.state.student.group}</strong>`;
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  /**
   * Отрисовка задач в Carbon-стиле
   */
  renderTasks() {
    const container = document.getElementById('test-tasks-container');
    if (!container) return;

    container.innerHTML = '';
    const totalCount = this.state.tasks.length;
    const ptsPerTask = (100 / totalCount).toFixed(1);

    this.state.tasks.forEach((task, idx) => {
      const card = document.createElement('div');
      card.className = 'task-card';
      card.id = `task-card-${task.id}`;

      card.innerHTML = `
        <div class="task-card__badge">${task.badge || `Раздел ${task.category}`} • Задача ${idx + 1} из ${totalCount} • ${ptsPerTask} баллов</div>
        <h4 class="task-card__title">${task.title}</h4>
        <div class="cds--tile__subtitle" style="margin-bottom: 0.75rem;">${task.categoryName || `Раздел ${task.category}`}</div>
        
        <div class="task-card__scenario" style="margin-bottom: 0.75rem; line-height: 1.6; color: var(--cds-text-primary);">
          ${task.scenario}
        </div>

        <div class="task-card__question" style="margin-bottom: 1.25rem; font-weight: 600; line-height: 1.5; color: var(--cds-text-primary);">
          ${task.question}
        </div>

        <div class="cds--row">
          <div class="cds--col-6">
            <div class="cds--form-item">
              <label class="cds--label" for="ans-${task.id}">
                Ваш числовой ответ (${task.unit || 'безразмерный'}) <span style="color: var(--cds-support-error);">*</span>:
              </label>
              <input type="text" inputmode="decimal" class="cds--text-input task-answer-input" 
                     id="ans-${task.id}" data-task-id="${task.id}" 
                     placeholder="${task.placeholder || 'Например: 4.60'}" required>
              <div class="cds--label" style="font-size: 0.75rem; margin-top: 0.25rem; color: var(--cds-text-secondary);">
                Единицы: <strong>${task.unit || '—'}</strong> • Допустимая погрешность: <strong>±${task.tolerancePercent}%</strong>
              </div>
            </div>
          </div>
          <div class="cds--col-6">
            <div class="cds--form-item">
              <label class="cds--label" for="notes-${task.id}">
                Краткое обоснование / ход расчета (по желанию):
              </label>
              <input type="text" class="cds--text-input task-notes-input" 
                     id="notes-${task.id}" data-task-id="${task.id}" 
                     placeholder="Использована формула...">
            </div>
          </div>
        </div>
      `;

      container.appendChild(card);
    });

    // Компиляция математических формул внутри карточек задач
    if (typeof App !== 'undefined' && App.renderMath) {
      App.renderMath(container);
    }
  },

  /**
   * Таймер обратного отсчета
   */
  startTimer() {
    this.updateTimerDisplay();

    if (this.state.timerInterval) clearInterval(this.state.timerInterval);

    this.state.timerInterval = setInterval(() => {
      this.state.remainingSeconds--;

      this.updateTimerDisplay();

      // Обновляем состояние в sessionStorage
      sessionStorage.setItem('rudn_active_test_session', JSON.stringify(this.state));

      // Проверка окончания времени
      if (this.state.remainingSeconds <= 0) {
        clearInterval(this.state.timerInterval);
        const timerBar = document.getElementById('test-timer-bar');
        if (timerBar) {
          timerBar.className = 'test-timer-bar test-timer-bar--danger';
          const clock = document.getElementById('test-timer-clock');
          if (clock) clock.textContent = '00:00 (Время истекло)';
        }
        this.submitSession(true);
      }
    }, 1000);
  },

  updateTimerDisplay() {
    const timerElem = document.getElementById('test-timer-clock');
    const timerBar = document.getElementById('test-timer-bar');
    if (!timerElem) return;

    const mins = Math.floor(Math.max(0, this.state.remainingSeconds) / 60);
    const secs = Math.max(0, this.state.remainingSeconds) % 60;
    const formatted = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    timerElem.textContent = formatted;

    if (timerBar) {
      if (this.state.remainingSeconds <= 60) {
        timerBar.className = 'test-timer-bar test-timer-bar--danger';
      } else if (this.state.remainingSeconds <= 180) {
        timerBar.className = 'test-timer-bar test-timer-bar--warning';
      } else {
        timerBar.className = 'test-timer-bar';
      }
    }
  },

  /**
   * Завершение и отправка теста
   * @param {boolean} isAutoSubmit Флаг автоматической отправки по таймауту
   */
  async submitSession(isAutoSubmit = false) {
    if (this.state.isSubmitted) return;
    this.state.isSubmitted = true;
    clearInterval(this.state.timerInterval);

    this.state.endTime = Date.now();
    const elapsedSeconds = Math.round((this.state.endTime - this.state.startTime) / 1000);
    const minsSpent = Math.floor(elapsedSeconds / 60);
    const secsSpent = elapsedSeconds % 60;
    const timeSpentFormatted = `${minsSpent} мин ${secsSpent} сек`;

    const isSem0 = this.state.student.topic === 'sem0';
    const isSem2 = this.state.student.topic === 'sem2';

    let bank = typeof TaskBank !== 'undefined' ? TaskBank : null;
    let topicTitle = 'Семинар 1: Физико-химия гомеостаза';

    if (isSem0) {
      bank = typeof TaskBankSem0 !== 'undefined' ? TaskBankSem0 : bank;
      topicTitle = 'Семинар 0: Базовая химия';
    } else if (isSem2) {
      bank = typeof TaskBankSem2 !== 'undefined' ? TaskBankSem2 : bank;
      topicTitle = 'Семинар 2: RedOx-потенциал и биоэнергетика';
    }

    const ptsPerTask = 100 / (this.state.tasks.length || 1);

    // Сбор ответов
    const answers = this.state.tasks.map((task) => {
      const input = document.getElementById(`ans-${task.id}`);
      const notes = document.getElementById(`notes-${task.id}`);
      const rawVal = input ? input.value : '';
      const userVal = bank ? bank.parseNumericInput(rawVal) : parseFloat(rawVal);
      const userNotes = notes ? notes.value.trim() : '';

      // Метрика корректности (вспомогательно для аналитики преподавателя)
      const isCorrect = !isNaN(userVal) && bank && bank.validateAnswer(task, userVal);

      return {
        taskId: task.id,
        category: task.category,
        categoryName: task.categoryName || `Раздел ${task.category}`,
        title: task.title,
        scenario: task.scenario || '',
        question: task.question || '',
        unit: task.unit || '',
        expectedAnswer: task.correctAnswer,
        userAnswer: isNaN(userVal) ? null : userVal,
        userRawInput: rawVal,
        userNotes,
        isCorrect,
        points: isCorrect ? ptsPerTask : 0
      };
    });

    const correctCount = answers.filter(a => a.isCorrect).length;
    const totalScore = Math.round(answers.reduce((sum, a) => sum + a.points, 0));

    const payload = {
      surname: this.state.student.surname,
      name: this.state.student.name,
      group: this.state.student.group,
      specialty: this.state.student.specialty,
      topic: this.state.student.topic || 'sem2',
      topicTitle,
      answers,
      correctCount,
      totalScore,
      maxScore: 100,
      isAutoSubmit,
      timeSpentFormatted,
      elapsedSeconds
    };

    // Блокируем кнопку отправки и показываем лоадер
    const submitBtn = document.getElementById('btn-submit-test');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Синхронизация с Google Drive...';
    }

    // Отправка через модуль GDriveSync
    const syncResult = await GDriveSync.submitResults(payload);

    // Очищаем активную сессию в sessionStorage
    sessionStorage.removeItem('rudn_active_test_session');

    // Отрисовка квитанции
    this.renderReceiptScreen(payload, syncResult);
  },

  /**
   * Отображение финальной электронной квитанции
   */
  renderReceiptScreen(payload, syncResult) {
    const stepActive = document.getElementById('test-step-active');
    const stepReceipt = document.getElementById('test-step-receipt');
    const timerBar = document.getElementById('test-timer-bar');

    if (stepActive) stepActive.style.display = 'none';
    if (timerBar) timerBar.style.display = 'none';
    if (stepReceipt) stepReceipt.style.display = 'block';

    const tokenElem = document.getElementById('receipt-token-code');
    const studentInfo = document.getElementById('receipt-student-info');
    const syncStatus = document.getElementById('receipt-sync-status');
    const answersTableBody = document.getElementById('receipt-answers-body');
    const downloadBtn = document.getElementById('btn-download-receipt');

    if (tokenElem) tokenElem.textContent = syncResult.receiptToken;

    if (studentInfo) {
      studentInfo.innerHTML = `
        <strong>${payload.surname} ${payload.name}</strong> (${payload.group})<br>
        Тематика: <strong>${payload.topicTitle}</strong><br>
        Специальность: ${payload.specialty || 'Стандартизация и метрология / Управление качеством'}<br>
        Время сдачи: ${new Date().toLocaleString('ru-RU')} • Затрачено: ${payload.timeSpentFormatted}
        ${payload.isAutoSubmit ? '<br><span class="cds--tag cds--tag--red" style="margin-top: 0.5rem;">Автоматическая сдача по истечении времени</span>' : ''}
      `;
    }

    if (syncStatus) {
      if (syncResult.mode === 'gdrive' || syncResult.mode === 'gdrive_nocors') {
        syncStatus.className = 'cds--inline-notification cds--inline-notification--success';
        syncStatus.innerHTML = `<strong>Статус синхронизации:</strong> Результаты успешно записаны в Google Таблицу <code>[${syncResult.sheetName || 'Ведомость'}]</code> на Google Drive преподавателя.`;
      } else {
        syncStatus.className = 'cds--inline-notification cds--inline-notification--info';
        syncStatus.innerHTML = '<strong>Локальная фиксация:</strong> Результаты надежно сохранены в резервной памяти браузера. Сохраните номер квитанции.';
      }
    }

    if (answersTableBody) {
      answersTableBody.innerHTML = payload.answers.map((a, i) => `
        <tr>
          <td><strong>Задача ${i + 1}</strong></td>
          <td>${a.categoryName || `Раздел ${a.category}`}</td>
          <td><code>${a.userAnswer !== null ? a.userAnswer + (a.unit ? ' ' + a.unit : '') : 'нет ответа'}</code></td>
          <td>${a.userNotes || '—'}</td>
        </tr>
      `).join('');
    }

    if (downloadBtn) {
      downloadBtn.onclick = () => GDriveSync.downloadReceiptFile({
        ...payload,
        receiptToken: syncResult.receiptToken,
        submittedAtLocal: new Date().toLocaleString('ru-RU')
      });
    }

    const returnBtn = document.getElementById('btn-receipt-return') || document.querySelector('#test-step-receipt [data-go-to]');
    if (returnBtn) {
      const viewTarget = payload.topic === 'sem0' ? 'seminar0' : (payload.topic === 'sem2' ? 'seminar2' : 'seminar1');
      const semNum = payload.topic === 'sem0' ? '0' : (payload.topic === 'sem2' ? '2' : '1');
      returnBtn.setAttribute('data-go-to', viewTarget);
      const span = returnBtn.querySelector('span:first-child');
      if (span) span.textContent = `Вернуться к материалам Семинара ${semNum}`;
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
};

// Экспорт для глобальной области видимости браузера и модуля Node.js
if (typeof window !== 'undefined') {
  window.TestSession = TestSession;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { TestSession };
}

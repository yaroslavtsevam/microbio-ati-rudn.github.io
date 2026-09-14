/**
 * Модуль управления сессией 15-минутного экспресс-тестирования
 * Курс «Пищевая микробиология, санитария и гигиена» • АТИ РУДН
 */

const TestSession = {
  state: {
    student: {
      surname: '',
      name: '',
      group: '',
      specialty: ''
    },
    tasks: [],
    startTime: null,
    endTime: null,
    totalSeconds: CONFIG.TEST_DURATION_MINUTES * 60,
    remainingSeconds: CONFIG.TEST_DURATION_MINUTES * 60,
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
          const remaining = (CONFIG.TEST_DURATION_MINUTES * 60) - elapsed;
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
    const errorBox = document.getElementById('reg-error-box');

    const surname = surnameInput ? surnameInput.value.trim() : '';
    const name = nameInput ? nameInput.value.trim() : '';
    const group = groupInput ? groupInput.value.trim() : '';
    const specialty = specialtyInput ? specialtyInput.value : '';

    if (!surname || !name || !group) {
      if (errorBox) {
        errorBox.style.display = 'block';
        errorBox.textContent = 'Пожалуйста, заполните обязательные поля: Фамилия, Имя и Учебная группа.';
      }
      return;
    }

    if (errorBox) errorBox.style.display = 'none';

    this.state.student = { surname, name, group, specialty };
    this.state.tasks = TaskBank.getRandomTasks();
    this.state.startTime = Date.now();
    this.state.totalSeconds = CONFIG.TEST_DURATION_MINUTES * 60;
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
   * Отрисовка 4 задач в Carbon-стиле
   */
  renderTasks() {
    const container = document.getElementById('test-tasks-container');
    if (!container) return;

    container.innerHTML = '';

    this.state.tasks.forEach((task, idx) => {
      const card = document.createElement('div');
      card.className = 'task-card';
      card.id = `task-card-${task.id}`;

      card.innerHTML = `
        <div class="task-card__badge">${task.badge || `Раздел ${task.category}`} • Задача ${idx + 1} из 4 • 25 баллов</div>
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
   * Таймер обратного отсчета (15 минут)
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

    // Сбор ответов
    const answers = this.state.tasks.map((task) => {
      const input = document.getElementById(`ans-${task.id}`);
      const notes = document.getElementById(`notes-${task.id}`);
      const rawVal = input ? input.value : '';
      const userVal = TaskBank.parseNumericInput(rawVal);
      const userNotes = notes ? notes.value.trim() : '';

      // Метрика корректности (вспомогательно для аналитики преподавателя)
      const isCorrect = !isNaN(userVal) && TaskBank.validateAnswer(task, userVal);

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
        points: isCorrect ? CONFIG.POINTS_PER_TASK : 0
      };
    });

    const correctCount = answers.filter(a => a.isCorrect).length;
    const totalScore = answers.reduce((sum, a) => sum + a.points, 0);

    const payload = {
      surname: this.state.student.surname,
      name: this.state.student.name,
      group: this.state.student.group,
      specialty: this.state.student.specialty,
      answers,
      correctCount,
      totalScore,
      maxScore: CONFIG.MAX_SCORE,
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
        Специальность: ${payload.specialty || 'Стандартизация и метрология / Управление качеством'}<br>
        Время сдачи: ${new Date().toLocaleString('ru-RU')} • Затрачено: ${payload.timeSpentFormatted}
        ${payload.isAutoSubmit ? '<br><span class="cds--tag cds--tag--red" style="margin-top: 0.5rem;">Автоматическая сдача по истечении 15 минут</span>' : ''}
      `;
    }

    if (syncStatus) {
      if (syncResult.mode === 'gdrive' || syncResult.mode === 'gdrive_nocors') {
        syncStatus.className = 'cds--inline-notification cds--inline-notification--success';
        syncStatus.innerHTML = '<strong>Статус синхронизации:</strong> Результаты успешно записаны в Google Таблицу на Google Drive преподавателя.';
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

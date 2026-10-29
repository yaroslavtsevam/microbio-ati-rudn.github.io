/**
 * Главный координирующий модуль веб-портала
 * Курс «Пищевая микробиология, санитария и гигиена» • АТИ РУДН
 */

document.addEventListener('DOMContentLoaded', () => {
  App.init();
});

const App = {
  currentView: 'catalog',

  init() {
    this.initTheme();
    this.initNavigation();
    this.initTabs();
    this.initCatalogFilters();
    // Инициализация фильтров вопросов Коллоквиума 1
    this.initColloquiumFilters();


    // Инициализация калькуляторов, плеера слайдов и модуля тестирования
    if (typeof Calculators !== 'undefined') Calculators.init();
    if (typeof CalculatorsSem0 !== 'undefined') CalculatorsSem0.init();
    if (typeof CalculatorsSem2 !== 'undefined') CalculatorsSem2.init();
    if (typeof CalculatorsSem3 !== 'undefined') CalculatorsSem3.init();
    if (typeof SlidesPlayer !== 'undefined') SlidesPlayer.init();
    if (typeof TestSession !== 'undefined') TestSession.init();

    // Первичная компиляция математических формул KaTeX
    this.renderMath();

    // Обработка прямого URL хеша
    this.handleRouteHash();
    window.addEventListener('hashchange', () => this.handleRouteHash());
  },

  /* ------------------------------------------------------------------------
     1. ТЕМАТИЧЕСКИЙ РЕЖИМ (IBM Carbon: White vs Gray 100)
     ------------------------------------------------------------------------ */
  initTheme() {
    const themeBtn = document.getElementById('btn-theme-toggle');
    const savedTheme = localStorage.getItem('rudn_carbon_theme') || 'white';
    
    document.documentElement.setAttribute('data-carbon-theme', savedTheme);
    this.updateThemeButton(savedTheme);

    if (themeBtn) {
      themeBtn.addEventListener('click', () => {
        const current = document.documentElement.getAttribute('data-carbon-theme');
        const next = current === 'g100' ? 'white' : 'g100';
        document.documentElement.setAttribute('data-carbon-theme', next);
        localStorage.setItem('rudn_carbon_theme', next);
        this.updateThemeButton(next);
      });
    }
  },

  updateThemeButton(theme) {
    const icon = document.getElementById('theme-icon');
    if (!icon) return;
    icon.textContent = theme === 'g100' ? '☀️' : '🌙';
  },

  /* ------------------------------------------------------------------------
     2. НАВИГАЦИЯ МЕЖДУ РАЗДЕЛАМИ ПОРТАЛА И CARBON SUBMENUS
     ------------------------------------------------------------------------ */
  initNavigation() {
    // 2.1. Прямые клики по элементам навигации с data-nav
    document.addEventListener('click', (e) => {
      const navLink = e.target.closest('[data-nav]');
      if (navLink) {
        e.preventDefault();
        const targetView = navLink.getAttribute('data-nav');
        this.closeAllSubmenus();
        this.switchView(targetView);
        window.location.hash = targetView;
        return;
      }

      // 2.2. Кнопка-триггер выпадающего меню Carbon Submenu
      const submenuBtn = e.target.closest('[data-submenu-trigger]');
      if (submenuBtn) {
        e.preventDefault();
        const parentSubmenu = submenuBtn.closest('.cds--header__submenu');
        if (parentSubmenu) {
          const isOpen = parentSubmenu.classList.contains('cds--header__submenu--open');
          this.closeAllSubmenus();
          if (!isOpen) {
            parentSubmenu.classList.add('cds--header__submenu--open');
            submenuBtn.setAttribute('aria-expanded', 'true');
          }
        }
        return;
      }

      // 2.3. Клик вне навигации закрывает все открытые выпадающие списки
      if (!e.target.closest('.cds--header__submenu')) {
        this.closeAllSubmenus();
      }

      // 2.4. Делегирование ссылок на переход внутри контентных карточек и кнопок
      const targetGoTo = e.target.closest('[data-go-to]');
      if (targetGoTo) {
        e.preventDefault();
        const view = targetGoTo.getAttribute('data-go-to');
        const testTopic = targetGoTo.getAttribute('data-test-topic');
        this.closeAllSubmenus();
        this.switchView(view);
        window.location.hash = view;

        if (view === 'test' && testTopic) {
          const select = document.getElementById('student-test-topic');
          if (select) {
            select.value = testTopic;
            select.dispatchEvent(new Event('change'));
          }
        }
      }
    });

    // 2.5. Закрытие меню по нажатию клавиши Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeAllSubmenus();
      }
    });
  },

  closeAllSubmenus() {
    const submenus = document.querySelectorAll('.cds--header__submenu');
    submenus.forEach(menu => {
      menu.classList.remove('cds--header__submenu--open');
      const trigger = menu.querySelector('[data-submenu-trigger]');
      if (trigger) trigger.setAttribute('aria-expanded', 'false');
    });
  },

  handleRouteHash() {
    const rawHash = window.location.hash.replace('#', '');
    const validViews = ['catalog', 'lectures', 'seminar0', 'seminar1', 'seminar2', 'seminar3', 'colloquium1', 'test'];

    if (!rawHash) {
      this.switchView('catalog');
      return;
    }

    if (validViews.includes(rawHash)) {
      this.switchView(rawHash);
      return;
    }

    // Если хеш является внутристраничным якорем (colloquium-theme-*, question-*, case-*)
    if (rawHash.startsWith('colloquium-') || rawHash.startsWith('theme-') || rawHash.startsWith('question-') || rawHash.startsWith('case-')) {
      if (this.currentView !== 'colloquium1') {
        this.switchView('colloquium1');
      }
      setTimeout(() => {
        const targetEl = document.getElementById(rawHash);
        if (targetEl) {
          const parentPanel = targetEl.closest('.cds--tab-panel');
          if (parentPanel && !parentPanel.classList.contains('cds--tab-panel--active')) {
            const tabBtn = document.querySelector(`[data-tab-target="${parentPanel.id}"]`);
            if (tabBtn) tabBtn.click();
          }
          targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
      return;
    }

    this.switchView('catalog');
  },

  switchView(viewName) {
    this.currentView = viewName;
    this.closeAllSubmenus();

    // 1. Обновление активных прямых ссылок меню
    const navLinks = document.querySelectorAll('.cds--header__menu-link[data-nav]');
    navLinks.forEach(link => {
      if (link.getAttribute('data-nav') === viewName) {
        link.classList.add('cds--header__menu-link--active');
      } else {
        link.classList.remove('cds--header__menu-link--active');
      }
    });

    // 2. Обновление активных элементов внутри выпадающих подменю
    const submenuLinks = document.querySelectorAll('.cds--header__menu-item-link[data-nav]');
    submenuLinks.forEach(item => {
      if (item.getAttribute('data-nav') === viewName) {
        item.classList.add('cds--header__menu-item-link--active');
      } else {
        item.classList.remove('cds--header__menu-item-link--active');
      }
    });

    // 3. Подсветка родительского триггера подменю при активном дочернем роуте
    const lecturesViews = ['lectures'];
    const seminarsViews = ['seminar0', 'seminar1', 'seminar2', 'seminar3', 'seminar4'];

    const lecturesTrigger = document.querySelector('[data-submenu-trigger="lectures"]');
    const seminarsTrigger = document.querySelector('[data-submenu-trigger="seminars"]');

    if (lecturesTrigger) {
      if (lecturesViews.includes(viewName)) {
        lecturesTrigger.classList.add('cds--header__menu-title--active');
      } else {
        lecturesTrigger.classList.remove('cds--header__menu-title--active');
      }
    }

    if (seminarsTrigger) {
      if (seminarsViews.includes(viewName)) {
        seminarsTrigger.classList.add('cds--header__menu-title--active');
      } else {
        seminarsTrigger.classList.remove('cds--header__menu-title--active');
      }
    }

    // 4. Скрытие / показ представлений
    const views = {
      catalog: document.getElementById('view-catalog'),
      lectures: document.getElementById('view-lectures'),
      seminar0: document.getElementById('view-seminar0'),
      seminar1: document.getElementById('view-seminar1'),
      seminar2: document.getElementById('view-seminar2'),
      seminar3: document.getElementById('view-seminar3'),
      seminar4: document.getElementById('view-seminar4'),
      colloquium1: document.getElementById('view-colloquium1'),
      test: document.getElementById('view-test')
    };

    Object.entries(views).forEach(([key, elem]) => {
      if (elem) {
        elem.style.display = key === viewName ? 'block' : 'none';
      }
    });

    // Специальная инициализация при переходе в лекции
    if (viewName === 'lectures' && typeof SlidesPlayer !== 'undefined') {
      SlidesPlayer.renderSlide(SlidesPlayer.currentIndex);
    }

    this.renderMath();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  /* ------------------------------------------------------------------------
     3. ТАБЫ ВНУТРИ СЕМИНАРОВ 0, 1 И 2
     ------------------------------------------------------------------------ */
  initTabs() {
    const tabContainers = document.querySelectorAll('.cds--tabs');

    tabContainers.forEach(container => {
      const tabs = container.querySelectorAll('.cds--tab');
      tabs.forEach(tab => {
        tab.addEventListener('click', () => {
          const targetId = tab.getAttribute('data-tab-target');
          const parentView = tab.closest('main') || document;
          const panels = parentView.querySelectorAll('.cds--tab-panel');

          tabs.forEach(t => t.classList.remove('cds--tab--selected'));
          panels.forEach(p => p.classList.remove('cds--tab-panel--active'));

          tab.classList.add('cds--tab--selected');
          const targetPanel = document.getElementById(targetId);
          if (targetPanel) {
            targetPanel.classList.add('cds--tab-panel--active');
            this.renderMath(targetPanel);
          }
        });
      });
    });
  },

  /**
   * Компиляция математической разметки LaTeX через KaTeX
   */
  renderMath(element = document.body) {
    if (typeof renderMathInElement === 'function') {
      try {
        renderMathInElement(element, {
          delimiters: [
            { left: '$$', right: '$$', display: true },
            { left: '$', right: '$', display: false },
            { left: '\\(', right: '\\)', display: false },
            { left: '\\[', right: '\\]', display: true }
          ],
          throwOnError: false
        });
      } catch (e) {
        console.warn('[KaTeX] Render warning:', e);
      }
    }
  },

  /* ------------------------------------------------------------------------
     4. ФИЛЬТРАЦИЯ КАРТОЧЕК В КАТАЛОГЕ (ДВУХУРОВНЕВЫЙ РУБРИКАТОР)
     ------------------------------------------------------------------------ */
  
  /* ------------------------------------------------------------------------
     4.5. НАВИГАЦИЯ И ПЕРЕКЛЮЧЕНИЕ ТАБОВ КОЛЛОКВИУМА 1
     ------------------------------------------------------------------------ */
  initColloquiumFilters() {
    // 1. Кнопки переключения табов в шапке Коллоквиума
    document.addEventListener('click', (e) => {
      const switchBtn = e.target.closest('[data-tab-switch]');
      if (switchBtn) {
        const targetTabId = switchBtn.getAttribute('data-tab-switch');
        const targetTab = document.querySelector(`[data-tab-target="${targetTabId}"]`);
        if (targetTab) {
          targetTab.click();
          targetTab.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        return;
      }

      // 2. Ссылки быстрой навигации по темам (#colloquium-theme-*, [data-scroll-to])
      const anchorLink = e.target.closest('a[href^="#colloquium-theme-"], [data-scroll-to]');
      if (anchorLink) {
        e.preventDefault();
        const targetId = anchorLink.getAttribute('data-scroll-to') || anchorLink.getAttribute('href').replace('#', '');
        const targetEl = document.getElementById(targetId);
        if (targetEl) {
          const parentPanel = targetEl.closest('.cds--tab-panel');
          if (parentPanel && !parentPanel.classList.contains('cds--tab-panel--active')) {
            const tabBtn = document.querySelector(`[data-tab-target="${parentPanel.id}"]`);
            if (tabBtn) tabBtn.click();
          }
          setTimeout(() => {
            targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
            history.replaceState(null, '', `#${targetId}`);
          }, 50);
        }
        return;
      }

      // 3. Кнопки "Развернуть все / Свернуть все кейсы"
      const toggleAllCasesBtn = e.target.closest('[data-colloquium-toggle-cases]');
      if (toggleAllCasesBtn) {
        const action = toggleAllCasesBtn.getAttribute('data-colloquium-toggle-cases');
        const detailsList = document.querySelectorAll('#colloquium-answers-accordion details');
        detailsList.forEach(d => {
          d.open = action === 'expand';
        });
        return;
      }
    });

    // 4. Фильтрация карточек вопросов (60 вопросов)
    const filterBar = document.getElementById('colloquium-filter-bar');
    if (filterBar) {
      filterBar.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-filter]');
        if (!btn) return;
        const filter = btn.getAttribute('data-filter');
        filterBar.querySelectorAll('[data-filter]').forEach(b => {
          b.className = 'cds--btn cds--btn--sm cds--btn--secondary';
        });
        btn.className = 'cds--btn cds--btn--sm cds--btn--primary';

        const cards = document.querySelectorAll('.colloquium-q-card');
        cards.forEach(card => {
          const cat = card.getAttribute('data-category');
          if (filter === 'all' || cat === filter) {
            card.style.display = '';
          } else {
            card.style.display = 'none';
          }
        });
      });
    }
  },

  initCatalogFilters() {
    const filterBtns = document.querySelectorAll('.catalog-filter-btn');
    const cards = document.querySelectorAll('.seminar-catalog-card');

    let activeType = 'all';
    let activeTopic = 'all';

    const updateFilter = () => {
      cards.forEach(card => {
        const cardType = card.getAttribute('data-type') || '';
        const category = card.getAttribute('data-category') || '';

        const matchesType = (activeType === 'all') ||
                            (activeType === 'type-seminar' && cardType === 'seminar') ||
                            (activeType === 'type-lecture' && cardType === 'lecture') ||
                            category.includes(activeType);

        const matchesTopic = (activeTopic === 'all') || category.includes(activeTopic);

        if (matchesType && matchesTopic) {
          card.style.display = 'block';
        } else {
          card.style.display = 'none';
        }
      });
    };

    filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const filter = btn.getAttribute('data-filter');

        if (filter === 'all') {
          activeType = 'all';
          activeTopic = 'all';
          filterBtns.forEach(b => {
            const f = b.getAttribute('data-filter');
            if (f === 'all') {
              b.className = 'cds--btn cds--btn--sm cds--btn--primary catalog-filter-btn';
            } else if (f === 'type-seminar' || f === 'type-lecture') {
              b.className = 'cds--btn cds--btn--sm cds--btn--secondary catalog-filter-btn';
            } else {
              b.className = 'cds--btn cds--btn--sm cds--btn--ghost catalog-filter-btn';
            }
          });
        } else if (filter === 'type-seminar' || filter === 'type-lecture') {
          activeType = (activeType === filter) ? 'all' : filter;
          filterBtns.forEach(b => {
            const f = b.getAttribute('data-filter');
            if (f === 'all') {
              b.className = `cds--btn cds--btn--sm ${activeType === 'all' ? 'cds--btn--primary' : 'cds--btn--secondary'} catalog-filter-btn`;
            } else if (f === 'type-seminar' || f === 'type-lecture') {
              b.className = `cds--btn cds--btn--sm ${activeType === f ? 'cds--btn--primary' : 'cds--btn--secondary'} catalog-filter-btn`;
            }
          });
        } else {
          activeTopic = (activeTopic === filter) ? 'all' : filter;
          filterBtns.forEach(b => {
            const f = b.getAttribute('data-filter');
            if (['intro', 'drylab', 'reg', 'haccp'].includes(f)) {
              b.className = `cds--btn cds--btn--sm ${activeTopic === f ? 'cds--btn--primary' : 'cds--btn--ghost'} catalog-filter-btn`;
            }
          });
        }

        updateFilter();
      });
    });
  }
};

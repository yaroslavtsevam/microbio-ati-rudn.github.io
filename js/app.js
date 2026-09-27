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

    // Инициализация калькуляторов, плеера слайдов и модуля тестирования
    if (typeof Calculators !== 'undefined') Calculators.init();
    if (typeof CalculatorsSem0 !== 'undefined') CalculatorsSem0.init();
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
     2. НАВИГАЦИЯ МЕЖДУ РАЗДЕЛАМИ ПОРТАЛА
     ------------------------------------------------------------------------ */
  initNavigation() {
    const navLinks = document.querySelectorAll('.cds--header__menu-link[data-nav]');
    navLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const targetView = link.getAttribute('data-nav');
        this.switchView(targetView);
        window.location.hash = targetView;
      });
    });

    // Делегирование ссылок на переход внутри карточек и кнопок
    document.addEventListener('click', (e) => {
      const target = e.target.closest('[data-go-to]');
      if (target) {
        e.preventDefault();
        const view = target.getAttribute('data-go-to');
        this.switchView(view);
        window.location.hash = view;
      }
    });
  },

  handleRouteHash() {
    const hash = window.location.hash.replace('#', '');
    const validViews = ['catalog', 'lectures', 'seminar0', 'seminar1', 'test'];
    if (validViews.includes(hash)) {
      this.switchView(hash);
    } else {
      this.switchView('catalog');
    }
  },

  switchView(viewName) {
    this.currentView = viewName;

    // Обновление активных кнопок меню
    const navLinks = document.querySelectorAll('.cds--header__menu-link[data-nav]');
    navLinks.forEach(link => {
      if (link.getAttribute('data-nav') === viewName) {
        link.classList.add('cds--header__menu-link--active');
      } else {
        link.classList.remove('cds--header__menu-link--active');
      }
    });

    // Скрытие / показ представлений
    const views = {
      catalog: document.getElementById('view-catalog'),
      lectures: document.getElementById('view-lectures'),
      seminar0: document.getElementById('view-seminar0'),
      seminar1: document.getElementById('view-seminar1'),
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
     3. ТАБЫ ВНУТРИ СЕМИНАРОВ 0 И 1
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
     4. ФИЛЬТРАЦИЯ КАРТОЧЕК В КАТАЛОГЕ
     ------------------------------------------------------------------------ */
  initCatalogFilters() {
    const filterBtns = document.querySelectorAll('.catalog-filter-btn');
    const cards = document.querySelectorAll('.seminar-catalog-card');

    filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const filter = btn.getAttribute('data-filter');

        filterBtns.forEach(b => b.classList.remove('cds--btn--primary'));
        filterBtns.forEach(b => b.classList.add('cds--btn--secondary'));

        btn.classList.remove('cds--btn--secondary');
        btn.classList.add('cds--btn--primary');

        cards.forEach(card => {
          const category = card.getAttribute('data-category') || '';
          if (filter === 'all' || category.includes(filter)) {
            card.style.display = 'block';
          } else {
            card.style.display = 'none';
          }
        });
      });
    });
  }
};

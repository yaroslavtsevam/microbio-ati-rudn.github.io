/**
 * Интерактивный плеер презентаций Лекции (IBM Carbon Design System v11)
 * Курс «Пищевая микробиология, санитария и гигиена» • АТИ РУДН
 */

const SlidesPlayer = {
  currentIndex: 0,
  slides: [],
  container: null,

  init(containerId = 'slide-viewport') {
    if (typeof LECTURE1_SLIDES === 'undefined') {
      console.warn('LECTURE1_SLIDES is not loaded');
      return;
    }

    this.slides = LECTURE1_SLIDES;
    this.container = document.getElementById(containerId);
    if (!this.container) return;

    this.initControls();
    this.initKeyboard();
    this.populateModuleSelector();
    this.renderSlide(this.currentIndex);
  },

  initControls() {
    const btnPrev = document.getElementById('btn-slide-prev');
    const btnNext = document.getElementById('btn-slide-next');
    const btnFullscreen = document.getElementById('btn-slide-fullscreen');
    const selectModule = document.getElementById('select-slide-jump');

    if (btnPrev) btnPrev.addEventListener('click', () => this.prevSlide());
    if (btnNext) btnNext.addEventListener('click', () => this.nextSlide());
    if (btnFullscreen) btnFullscreen.addEventListener('click', () => this.toggleFullscreen());
    if (selectModule) {
      selectModule.addEventListener('change', (e) => {
        const idx = parseInt(e.target.value, 10);
        if (!isNaN(idx)) this.goToSlide(idx);
      });
    }
  },

  initKeyboard() {
    window.addEventListener('keydown', (e) => {
      // Игнорируем если фокус в поле ввода
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) return;

      const lecturesView = document.getElementById('view-lectures');
      if (!lecturesView || lecturesView.style.display === 'none') return;

      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') {
        e.preventDefault();
        this.nextSlide();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        this.prevSlide();
      } else if (e.key === 'f' || e.key === 'F' || e.key === 'а' || e.key === 'А') {
        e.preventDefault();
        this.toggleFullscreen();
      } else if (e.key === 'Home') {
        e.preventDefault();
        this.goToSlide(0);
      } else if (e.key === 'End') {
        e.preventDefault();
        this.goToSlide(this.slides.length - 1);
      }
    });
  },

  populateModuleSelector() {
    const selector = document.getElementById('select-slide-jump');
    if (!selector) return;

    selector.innerHTML = '';
    this.slides.forEach((slide, idx) => {
      const opt = document.createElement('option');
      opt.value = idx;
      const modPrefix = slide.module ? `[${slide.module.split(':')[0]}] ` : '';
      opt.textContent = `${idx + 1}. ${modPrefix}${slide.title}`;
      selector.appendChild(opt);
    });
  },

  nextSlide() {
    if (this.currentIndex < this.slides.length - 1) {
      this.goToSlide(this.currentIndex + 1);
    }
  },

  prevSlide() {
    if (this.currentIndex > 0) {
      this.goToSlide(this.currentIndex - 1);
    }
  },

  goToSlide(index) {
    if (index < 0 || index >= this.slides.length) return;
    this.currentIndex = index;
    this.renderSlide(this.currentIndex);
  },

  renderSlide(index) {
    const slide = this.slides[index];
    if (!slide || !this.container) return;

    // Обновление элементов управления и счетчиков
    const counter = document.getElementById('slide-counter-badge');
    const progressBar = document.getElementById('slide-progress-fill');
    const selectModule = document.getElementById('select-slide-jump');
    const btnPrev = document.getElementById('btn-slide-prev');
    const btnNext = document.getElementById('btn-slide-next');

    if (counter) counter.textContent = `${index + 1} / ${this.slides.length}`;
    if (progressBar) {
      const pct = ((index + 1) / this.slides.length) * 100;
      progressBar.style.width = `${pct}%`;
    }
    if (selectModule) selectModule.value = index;
    if (btnPrev) btnPrev.disabled = index === 0;
    if (btnNext) btnNext.disabled = index === this.slides.length - 1;

    // Генерация HTML слайда в зависимости от типа
    let html = '';
    switch (slide.type) {
      case 'title':
        html = this.renderTitleSlide(slide);
        break;
      case 'wide_cards_2':
        html = this.renderWideCardsSlide(slide);
        break;
      case 'split_media':
        html = this.renderSplitMediaSlide(slide);
        break;
      case 'horizontal_media':
        html = this.renderHorizontalMediaSlide(slide);
        break;
      default:
        html = `<div class="slide-content"><h2 class="slide-title">${slide.title}</h2></div>`;
    }

    this.container.innerHTML = html;

    // Рендеринг формул KaTeX
    if (typeof renderMathInElement === 'function') {
      try {
        renderMathInElement(this.container, {
          delimiters: [
            { left: '$$', right: '$$', display: true },
            { left: '$', right: '$', display: false },
            { left: '\\(', right: '\\)', display: false },
            { left: '\\[', right: '\\]', display: true }
          ],
          throwOnError: false
        });
      } catch (e) {
        console.warn('KaTeX slide error:', e);
      }
    }
  },

  renderTitleSlide(slide) {
    const metaHtml = (slide.meta || []).map(([k, v]) => `
      <div class="slide-meta-item">
        <span class="slide-meta-label">${this.escape(k)}</span>
        <span class="slide-meta-val">${this.escape(v)}</span>
      </div>
    `).join('');

    return `
      <div class="slide-card slide-card--title">
        <div class="slide-title-tag">ЛЕКЦИЯ 1 • АТИ РУДН</div>
        <h1 class="slide-hero-title">${this.escape(slide.title)}</h1>
        <p class="slide-hero-subtitle">${this.escape(slide.subtitle || '')}</p>
        <div class="slide-meta-grid">${metaHtml}</div>
      </div>
    `;
  },

  renderWideCardsSlide(slide) {
    const renderCard = (card) => {
      if (!card) return '';
      const sectionsHtml = (card.sections || []).map(([heading, text]) => `
        <div class="slide-section-block">
          <div class="slide-section-heading">${this.escape(heading)}</div>
          <div class="slide-section-text">${this.escape(text)}</div>
        </div>
      `).join('');

      return `
        <div class="slide-info-card">
          <h3 class="slide-card-header">${this.escape(card.title)}</h3>
          <div class="slide-card-body">${sectionsHtml}</div>
        </div>
      `;
    };

    return `
      <div class="slide-card">
        <div class="slide-header">
          <div class="slide-module-badge">${this.escape(slide.module || '')}</div>
          <h2 class="slide-title">${this.escape(slide.title)}</h2>
          ${slide.subtitle ? `<div class="slide-subtitle">${this.escape(slide.subtitle)}</div>` : ''}
        </div>
        <div class="slide-grid-2">
          ${renderCard(slide.card_left)}
          ${renderCard(slide.card_right)}
        </div>
      </div>
    `;
  },

  renderSplitMediaSlide(slide) {
    const blocksHtml = (slide.blocks || []).map(([heading, text]) => `
      <div class="slide-section-block">
        <div class="slide-section-heading">${this.escape(heading)}</div>
        <div class="slide-section-text">${this.escape(text)}</div>
      </div>
    `).join('');

    return `
      <div class="slide-card">
        <div class="slide-header">
          <div class="slide-module-badge">${this.escape(slide.module || '')}</div>
          <h2 class="slide-title">${this.escape(slide.title)}</h2>
          ${slide.subtitle ? `<div class="slide-subtitle">${this.escape(slide.subtitle)}</div>` : ''}
        </div>
        <div class="slide-split-container">
          <div class="slide-media-box">
            <img src="${slide.image}" alt="${this.escape(slide.title)}" class="slide-media-img" />
            ${slide.caption ? `<div class="slide-caption">${this.escape(slide.caption)}</div>` : ''}
          </div>
          <div class="slide-text-box">
            ${blocksHtml}
          </div>
        </div>
      </div>
    `;
  },

  renderHorizontalMediaSlide(slide) {
    const renderCol = (blocks) => {
      return (blocks || []).map(([heading, text]) => `
        <div class="slide-section-block">
          <div class="slide-section-heading">${this.escape(heading)}</div>
          <div class="slide-section-text">${this.escape(text)}</div>
        </div>
      `).join('');
    };

    return `
      <div class="slide-card">
        <div class="slide-header">
          <div class="slide-module-badge">${this.escape(slide.module || '')}</div>
          <h2 class="slide-title">${this.escape(slide.title)}</h2>
          ${slide.subtitle ? `<div class="slide-subtitle">${this.escape(slide.subtitle)}</div>` : ''}
        </div>
        <div class="slide-horizontal-container">
          <div class="slide-media-box slide-media-box--horizontal">
            <img src="${slide.image}" alt="${this.escape(slide.title)}" class="slide-media-img-horizontal" />
            ${slide.caption ? `<div class="slide-caption">${this.escape(slide.caption)}</div>` : ''}
          </div>
          <div class="slide-grid-2" style="margin-top: 1rem;">
            <div class="slide-info-card">${renderCol(slide.blocks_left)}</div>
            <div class="slide-info-card">${renderCol(slide.blocks_right)}</div>
          </div>
        </div>
      </div>
    `;
  },

  toggleFullscreen() {
    const playerWrapper = document.getElementById('presentation-player-wrapper');
    if (!playerWrapper) return;

    if (!document.fullscreenElement) {
      playerWrapper.requestFullscreen().catch(err => {
        console.warn(`Fullscreen error: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  },

  escape(text) {
    if (!text) return '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
};

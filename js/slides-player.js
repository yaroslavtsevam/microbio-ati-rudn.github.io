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
        html = `<div class="slide-content"><h2 class="slide-title">${this.formatMathText(slide.title)}</h2></div>`;
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
        <span class="slide-meta-label">${this.formatMathText(k)}</span>
        <span class="slide-meta-val">${this.formatMathText(v)}</span>
      </div>
    `).join('');

    return `
      <div class="slide-card slide-card--title">
        <div class="slide-title-tag">ЛЕКЦИЯ 1 • АТИ РУДН</div>
        <h1 class="slide-hero-title">${this.formatMathText(slide.title)}</h1>
        <p class="slide-hero-subtitle">${this.formatMathText(slide.subtitle || '')}</p>
        <div class="slide-meta-grid">${metaHtml}</div>
      </div>
    `;
  },

  renderBlockContent(b) {
    if (!b) return '';
    
    // Если передан массив [heading, text]
    if (Array.isArray(b)) {
      return `
        <div class="slide-section-block">
          <div class="slide-section-heading">${this.formatMathText(b[0] || '')}</div>
          <div class="slide-section-text">${this.formatMathText(b[1] || '')}</div>
        </div>
      `;
    }

    // Если передан объект { title, text, items, ... }
    let out = '<div class="slide-section-block">';
    if (b.title) {
      out += `<div class="slide-section-heading">${this.formatMathText(b.title)}</div>`;
    }
    if (b.text) {
      out += `<div class="slide-section-text">${this.formatMathText(b.text)}</div>`;
    }
    if (b.items && Array.isArray(b.items)) {
      out += '<ul class="slide-items-list" style="margin: 0.4rem 0 0 1.2rem; padding: 0; line-height: 1.5; font-size: 0.9rem;">';
      b.items.forEach(item => {
        if (Array.isArray(item)) {
          out += `<li style="margin-bottom: 0.3rem;"><strong>${this.formatMathText(item[0])}:</strong> ${this.formatMathText(item[1])}</li>`;
        } else if (typeof item === 'string') {
          out += `<li style="margin-bottom: 0.3rem;">${this.formatMathText(item)}</li>`;
        }
      });
      out += '</ul>';
    }
    out += '</div>';
    return out;
  },

  renderWideCardsSlide(slide) {
    const renderCard = (card) => {
      if (!card) return '';
      let sectionsHtml = '';
      if (card.sections && Array.isArray(card.sections)) {
        sectionsHtml = card.sections.map(s => this.renderBlockContent(s)).join('');
      } else if (card.blocks && Array.isArray(card.blocks)) {
        sectionsHtml = card.blocks.map(b => this.renderBlockContent(b)).join('');
      } else if (card.text) {
        sectionsHtml = `<div class="slide-section-text">${this.formatMathText(card.text)}</div>`;
      }

      return `
        <div class="slide-info-card">
          <h3 class="slide-card-header">${this.formatMathText(card.title || '')}</h3>
          <div class="slide-card-body">${sectionsHtml}</div>
        </div>
      `;
    };

    return `
      <div class="slide-card">
        <div class="slide-header">
          <div class="slide-module-badge">${this.formatMathText(slide.module || '')}</div>
          <h2 class="slide-title">${this.formatMathText(slide.title)}</h2>
          ${slide.subtitle ? `<div class="slide-subtitle">${this.formatMathText(slide.subtitle)}</div>` : ''}
        </div>
        <div class="slide-grid-2">
          ${renderCard(slide.card_left)}
          ${renderCard(slide.card_right)}
        </div>
      </div>
    `;
  },

  renderSplitMediaSlide(slide) {
    let blocksHtml = '';
    if (slide.blocks && Array.isArray(slide.blocks)) {
      blocksHtml = slide.blocks.map(b => this.renderBlockContent(b)).join('');
    }

    return `
      <div class="slide-card">
        <div class="slide-header">
          <div class="slide-module-badge">${this.formatMathText(slide.module || '')}</div>
          <h2 class="slide-title">${this.formatMathText(slide.title)}</h2>
          ${slide.subtitle ? `<div class="slide-subtitle">${this.formatMathText(slide.subtitle)}</div>` : ''}
        </div>
        <div class="slide-split-container">
          <div class="slide-media-box">
            <img src="${slide.image}" alt="${this.escape(slide.title)}" class="slide-media-img" loading="lazy" />
            ${slide.caption ? `<div class="slide-caption">${this.formatMathText(slide.caption)}</div>` : ''}
          </div>
          <div class="slide-text-box">
            ${blocksHtml}
          </div>
        </div>
      </div>
    `;
  },

  renderHorizontalMediaSlide(slide) {
    let leftBlocksHtml = '';
    let rightBlocksHtml = '';

    if (slide.blocks_left || slide.blocks_right) {
      leftBlocksHtml = (slide.blocks_left || []).map(b => this.renderBlockContent(b)).join('');
      rightBlocksHtml = (slide.blocks_right || []).map(b => this.renderBlockContent(b)).join('');
    } else if (slide.blocks && Array.isArray(slide.blocks)) {
      // Распределяем блоки по двум колонкам
      const mid = Math.ceil(slide.blocks.length / 2);
      const left = slide.blocks.slice(0, mid);
      const right = slide.blocks.slice(mid);
      leftBlocksHtml = left.map(b => this.renderBlockContent(b)).join('');
      rightBlocksHtml = right.map(b => this.renderBlockContent(b)).join('');
    }

    return `
      <div class="slide-card">
        <div class="slide-header">
          <div class="slide-module-badge">${this.formatMathText(slide.module || '')}</div>
          <h2 class="slide-title">${this.formatMathText(slide.title)}</h2>
          ${slide.subtitle ? `<div class="slide-subtitle">${this.formatMathText(slide.subtitle)}</div>` : ''}
        </div>
        <div class="slide-horizontal-container">
          <div class="slide-media-box slide-media-box--horizontal">
            <img src="${slide.image}" alt="${this.escape(slide.title)}" class="slide-media-img-horizontal" loading="lazy" />
            ${slide.caption ? `<div class="slide-caption">${this.formatMathText(slide.caption)}</div>` : ''}
          </div>
          <div class="slide-grid-2" style="margin-top: 1rem;">
            <div class="slide-info-card">${leftBlocksHtml}</div>
            <div class="slide-info-card">${rightBlocksHtml}</div>
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
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  },

  formatMathText(text) {
    if (!text) return '';
    
    // Разделяем строку на математические блоки ($...$ или $$...$$) и обычный текст
    const parts = String(text).split(/(\$\$[^\$]+\$\$|\$[^\$]+\$)/g);
    
    return parts.map(part => {
      if (!part) return '';
      
      // Математический блок: сохраняем знаки <, >, &, нормализуем экранирование
      if (part.startsWith('$') && part.endsWith('$')) {
        return part;
      }
      
      // Обычный текст: экранируем HTML и преобразуем markdown bold/italic
      let res = this.escape(part);
      res = res.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
      res = res.replace(/\*([^*]+)\*/g, '<em>$1</em>');
      return res;
    }).join('');
  }
};

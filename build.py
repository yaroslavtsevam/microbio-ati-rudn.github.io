#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Модульный сборщик веб-портала курса микробиологии АТИ РУДН
Собирает монолитный index.html для GitHub Pages из модульных файлов в src/views/

Использование:
  python3 build.py          # Сборка index.html
  python3 build.py --check  # Проверка синхронизации без перезаписи
"""

import os
import sys

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
VIEWS_DIR = os.path.join(BASE_DIR, 'src', 'views')
OUTPUT_FILE = os.path.join(BASE_DIR, 'index.html')

# Порядок сборки модульных представлений
VIEWS_ORDER = [
    'shell_header.html',
    'view-catalog.html',
    'view-lectures.html',
    'view-seminar0.html',
    'view-seminar1.html',
    'view-seminar2.html',
    'view-seminar3.html',
    'view-seminar4.html',
    'view-colloquium1.html',
    'view-test.html',
    'shell_footer.html'
]

def build():
    check_mode = '--check' in sys.argv

    assembled_chunks = []
    total_lines = 0

    for filename in VIEWS_ORDER:
        filepath = os.path.join(VIEWS_DIR, filename)
        if not os.path.exists(filepath):
            print(f"ОШИБКА: Модульный файл {filename} не найден в {VIEWS_DIR}!", file=sys.stderr)
            sys.exit(1)
        
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
            assembled_chunks.append(content)
            total_lines += content.count('\n')

    assembled_html = "".join(assembled_chunks)

    if check_mode:
        if not os.path.exists(OUTPUT_FILE):
            print("ОШИБКА: index.html отсутствует!", file=sys.stderr)
            sys.exit(1)
        with open(OUTPUT_FILE, 'r', encoding='utf-8') as f:
            current_html = f.read()
        if current_html == assembled_html:
            print("СИНХРОНИЗАЦИЯ: index.html полностью соответствует модулям src/views/ (OK).")
            sys.exit(0)
        else:
            print("РАССИНХРОНИЗАЦИЯ: index.html отличается от модулей src/views/! Запустите python3 build.py.", file=sys.stderr)
            sys.exit(1)

    with open(OUTPUT_FILE, 'w', encoding='utf-8') as out:
        out.write(assembled_html)

    print(f"УСПЕХ: index.html собран из {len(VIEWS_ORDER)} модулей ({total_lines} строк, {len(assembled_html)} байт).")

if __name__ == '__main__':
    build()

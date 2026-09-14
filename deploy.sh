#!/usr/bin/env bash
# ==============================================================================
# Скрипт безопасного деплоя / пуша в репозиторий по GitHub Personal Access Token
# Курс «Пищевая микробиология, санитария и гигиена» • АТИ РУДН
# ==============================================================================

set -e

REPO_OWNER="yaroslavtsevam"
REPO_NAME="microbio-ati-rudn.github.io"
TARGET_BRANCH="main"

echo "=== Деплой в репозиторий https://github.com/${REPO_OWNER}/${REPO_NAME} ==="

# Проверяем, передан ли токен в переменной окружения
if [ -z "$GH_TOKEN" ] && [ -z "$GITHUB_TOKEN" ]; then
  printf "Введите GitHub Personal Access Token (ввод скрыт): "
  read -s TOKEN_INPUT
  echo ""
  if [ -z "$TOKEN_INPUT" ]; then
    echo "Ошибка: токен не может быть пустым!"
    exit 1
  fi
  DEPLOY_TOKEN="$TOKEN_INPUT"
else
  DEPLOY_TOKEN="${GH_TOKEN:-$GITHUB_TOKEN}"
fi

echo "Настройка удаленного репозитория origin с токеном авторизации..."
git remote set-url origin "https://${DEPLOY_TOKEN}@github.com/${REPO_OWNER}/${REPO_NAME}.git"

echo "Отправка коммитов в ветку ${TARGET_BRANCH}..."
git push origin "${TARGET_BRANCH}"

echo ""
echo "Успешно! Коммиты отправлены в репозиторий."
echo "GitHub Actions автоматически запустит деплой на GitHub Pages по токену GITHUB_TOKEN."
echo "Ссылка на портал: https://${REPO_OWNER}.github.io/${REPO_NAME}/"

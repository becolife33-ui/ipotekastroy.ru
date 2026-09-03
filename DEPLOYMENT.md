# Деплой на REG.RU

При каждом push в ветку `main` GitHub Actions проверяет PHP-файл и копирует сайт
на REG.RU по SSH. Запуск вручную доступен во вкладке **Actions**.

## Подготовка доступа

Создайте отдельный ключ без парольной фразы:

```bash
ssh-keygen -t ed25519 -C "github-actions-ipotekastroy" -f reg_ru_deploy
```

Добавьте `reg_ru_deploy.pub` в `~/.ssh/authorized_keys` аккаунта хостинга.
Приватный файл `reg_ru_deploy` никому не отправляйте и не добавляйте в Git.

Получите ключ сервера с доверенного компьютера:

```bash
ssh-keyscan -H HOST_REG_RU
```

Сверьте fingerprint с данными REG.RU. Не получайте `known_hosts` внутри CI.

## GitHub Secrets

В GitHub откройте **Settings → Environments**, создайте `production` и добавьте:

| Секрет | Значение |
| --- | --- |
| `REG_RU_HOST` | IP-адрес или имя сервера REG.RU |
| `REG_RU_SSH_PORT` | SSH-порт, обычно `22` |
| `REG_RU_USER` | Основной логин хостинга вида `u1234567` |
| `REG_RU_DEPLOY_PATH` | Корневая папка сайта, например `/var/www/u1234567/data/www/example.ru` |
| `REG_RU_SSH_PRIVATE_KEY` | Полное содержимое файла `reg_ru_deploy` |
| `REG_RU_SSH_KNOWN_HOSTS` | Проверенная строка от `ssh-keyscan` |

После добавления секретов: **Actions → Deploy to REG.RU → Run workflow**.
Последующие push в `main` будут деплоиться автоматически.

> SSH доступен на Linux-хостинге REG.RU, кроме Host-Lite. Для Windows-хостинга
> этот workflow не подходит.

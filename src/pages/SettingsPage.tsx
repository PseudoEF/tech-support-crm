import { useState } from 'react';
import { getSnapshotCounts } from '../domain/selectors';
import { formatDateTime } from '../lib/format';
import { navigate, routeHref } from '../lib/router';
import { useCrm, useCrmData } from '../state/CrmContext';
import { useToast } from '../state/ToastContext';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { HoldToReset } from '../components/HoldToReset';
import { Icon } from '../components/Icon';
import { PageHeader } from '../components/PageHeader';

export function SettingsPage() {
  const data = useCrmData();
  const { resetDemo } = useCrm();
  const { notify } = useToast();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const counts = getSnapshotCounts(data);

  async function handleReset() {
    setBusy(true);
    try {
      await resetDemo();
      setConfirmOpen(false);
      notify('Демо-данные восстановлены');
      navigate(routeHref.dashboard);
    } catch (error) {
      console.error('Failed to reset demo data', error);
      notify('Не удалось сбросить демо. Проверьте доступ к IndexedDB.', 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page settings-page">
      <PageHeader
        title="Настройки демо"
        description="Всё работает локально в браузере — без сервера, аккаунта и отправки данных."
        actions={
          <span className="demo-pill">
            <span className="local-dot" aria-hidden="true" />
            Демо-режим
          </span>
        }
      />

      <div className="settings-grid">
        <div className="settings-main">
          <section className="card about-demo-card" aria-labelledby="about-demo-title">
            <header className="card-header">
              <div>
                <h2 id="about-demo-title">Что это за приложение</h2>
                <p>Портфолио-демо внутренней CRM службы поддержки ISP</p>
              </div>
              <span className="about-icon">
                <Icon name="spark" size={21} />
              </span>
            </header>
            <p className="about-copy">
              ЛинкСервис — вымышленный оператор связи. Демо показывает рабочие сценарии
              техподдержки: приоритизацию очереди, контроль SLA, переписку с клиентом,
              внутренние заметки, клиентскую базу и базу знаний.
            </p>
            <div className="about-facts">
              <div>
                <span className="fact-dot fact-dot-green" aria-hidden="true" />
                <span>Данные только в вашем браузере</span>
              </div>
              <div>
                <span className="fact-dot fact-dot-blue" aria-hidden="true" />
                <span>Без backend и сетевых запросов</span>
              </div>
              <div>
                <span className="fact-dot fact-dot-amber" aria-hidden="true" />
                <span>Все имена и контакты вымышлены</span>
              </div>
            </div>
          </section>

          <section className="card data-card" aria-labelledby="data-title">
            <header className="card-header">
              <div>
                <h2 id="data-title">Данные демо</h2>
                <p>Сгенерированы детерминированно и сохранены в IndexedDB</p>
              </div>
              <span className="seed-date">Создано {formatDateTime(data.seededAt)}</span>
            </header>

            <div className="seed-grid">
              <div>
                <strong>{counts.tickets}</strong>
                <span>заявок</span>
              </div>
              <div>
                <strong>{counts.clients}</strong>
                <span>клиентов</span>
              </div>
              <div>
                <strong>{counts.agents}</strong>
                <span>агентов</span>
              </div>
              <div>
                <strong>{counts.teams}</strong>
                <span>команды</span>
              </div>
              <div>
                <strong>{counts.assets}</strong>
                <span>единиц оборудования</span>
              </div>
              <div>
                <strong>{counts.articles}</strong>
                <span>статей базы знаний</span>
              </div>
              <div>
                <strong>{counts.messages}</strong>
                <span>сообщений</span>
              </div>
              <div>
                <strong>{counts.activities}</strong>
                <span>событий</span>
              </div>
            </div>

            <div className="reset-zone">
              <div>
                <strong>Сбросить демо</strong>
                <p>
                  Удалит все изменения и заново создаст исходный набор заявок, сообщений и
                  заметок. Действие нельзя отменить.
                </p>
              </div>
              <HoldToReset onComplete={() => setConfirmOpen(true)} />
            </div>
          </section>

          <section className="card shortcuts-card" aria-labelledby="shortcuts-title">
            <header className="card-header">
              <div>
                <h2 id="shortcuts-title">Горячие клавиши</h2>
                <p>Навигация без мыши</p>
              </div>
              <Icon name="command" size={20} />
            </header>
            <dl className="shortcut-list">
              <div>
                <dt>
                  <kbd>Ctrl</kbd> / <kbd>⌘</kbd> + <kbd>K</kbd>
                </dt>
                <dd>Открыть быстрый поиск</dd>
              </div>
              <div>
                <dt>
                  <kbd>/</kbd>
                </dt>
                <dd>Быстрый поиск из любого раздела</dd>
              </div>
              <div>
                <dt>
                  <kbd>G</kbd> → <kbd>D</kbd>
                </dt>
                <dd>Перейти к обзору</dd>
              </div>
              <div>
                <dt>
                  <kbd>G</kbd> → <kbd>T</kbd>
                </dt>
                <dd>Перейти к заявкам</dd>
              </div>
              <div>
                <dt>
                  <kbd>G</kbd> → <kbd>C</kbd>
                </dt>
                <dd>Перейти к клиентам</dd>
              </div>
              <div>
                <dt>
                  <kbd>G</kbd> → <kbd>K</kbd>
                </dt>
                <dd>Перейти к базе знаний</dd>
              </div>
              <div>
                <dt>
                  <kbd>Esc</kbd>
                </dt>
                <dd>Закрыть поиск или мобильное меню</dd>
              </div>
            </dl>
          </section>
        </div>

        <aside className="settings-side" aria-label="О демо">
          <section className="card local-card" aria-labelledby="local-title">
            <div className="local-card-top">
              <span className="local-badge">
                <span className="local-dot" aria-hidden="true" />
                Локально
              </span>
              <Icon name="lock" size={20} />
            </div>
            <h2 id="local-title">Приватность по умолчанию</h2>
            <p>
              CRM не отправляет сетевые запросы. Заявки, сообщения и настройки остаются в
              IndexedDB этого браузера и доступны только на этом устройстве.
            </p>
            <ul className="check-list">
              <li>
                <Icon name="check" size={14} /> Нет аналитики и трекеров
              </li>
              <li>
                <Icon name="check" size={14} /> Нет внешних шрифтов и изображений
              </li>
              <li>
                <Icon name="check" size={14} /> Сброс полностью пересоздаёт базу
              </li>
            </ul>
          </section>

          <section className="card stack-card" aria-labelledby="stack-title">
            <header className="card-header">
              <div>
                <h2 id="stack-title">Под капотом</h2>
                <p>Frontend-only архитектура</p>
              </div>
            </header>
            <ul className="stack-list">
              <li>
                <span>UI</span>
                <strong>React 19 + TypeScript strict</strong>
              </li>
              <li>
                <span>Сборка</span>
                <strong>Vite · plain CSS</strong>
              </li>
              <li>
                <span>Хранилище</span>
                <strong>IndexedDB через idb</strong>
              </li>
              <li>
                <span>Данные</span>
                <strong>Детерминированный PRNG-сид</strong>
              </li>
              <li>
                <span>Тесты</span>
                <strong>Vitest</strong>
              </li>
            </ul>
          </section>

          <section className="card limitations-card" aria-labelledby="limits-title">
            <header className="card-header">
              <div>
                <h2 id="limits-title">Границы демо</h2>
                <p>Осознанные ограничения</p>
              </div>
            </header>
            <ul className="limitation-list">
              <li>Нет авторизации и разделения ролей</li>
              <li>Нет вложений и внешних интеграций</li>
              <li>Нет синхронизации между устройствами</li>
              <li>Оценки статей не сохраняются</li>
            </ul>
            <p className="settings-note">
              Это клиентский прототип, а не production-система для реальных клиентов.
            </p>
          </section>
        </aside>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Сбросить демо-данные?"
        description={
          <>
            <p>Все добавленные сообщения, заметки и изменения статусов будут удалены.</p>
            <p>
              Будет создан новый набор: <strong>{counts.tickets} заявок</strong>,{' '}
              <strong>{counts.clients} клиентов</strong> и{' '}
              <strong>{counts.articles} статей</strong>. Отменить это действие нельзя.
            </p>
          </>
        }
        confirmLabel="Сбросить и создать заново"
        danger
        busy={busy}
        onConfirm={() => void handleReset()}
        onClose={() => {
          if (!busy) setConfirmOpen(false);
        }}
      />
    </div>
  );
}

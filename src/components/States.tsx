import { Icon } from './Icon';

export function AppLoading() {
  return (
    <div className="app-loading" role="status" aria-live="polite">
      <div className="brand-mark brand-mark-large" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <strong>ЛинкСервис</strong>
      <p>Загружаем демо-данные из браузера…</p>
      <span className="spinner spinner-dark" aria-hidden="true" />
    </div>
  );
}

interface LoadErrorProps {
  message: string;
  onRetry: () => void;
}

export function LoadError({ message, onRetry }: LoadErrorProps) {
  return (
    <div className="fatal-screen">
      <div className="fatal-card">
        <span className="fatal-icon">
          <Icon name="alert-triangle" size={26} />
        </span>
        <h1>Не удалось открыть демо</h1>
        <p>
          Браузер не дал доступ к IndexedDB или хранилище повреждено. Попробуйте
          обновить страницу. Приватный режим некоторых браузеров блокирует локальное
          хранилище.
        </p>
        <code>{message}</code>
        <button type="button" className="button button-primary" onClick={onRetry}>
          <Icon name="refresh" size={16} />
          Попробовать снова
        </button>
      </div>
    </div>
  );
}

import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return {
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Unhandled CRM UI error', error, info);
  }

  override render(): ReactNode {
    if (this.state.error) {
      return (
        <div className="fatal-screen">
          <div className="fatal-card">
            <span className="fatal-icon" aria-hidden="true">
              !
            </span>
            <h1>Что-то пошло не так</h1>
            <p>
              Интерфейс столкнулся с непредвиденной ошибкой. Демо-данные остались в
              IndexedDB и не были удалены.
            </p>
            <code>{this.state.error.message}</code>
            <button
              type="button"
              className="button button-primary"
              onClick={() => window.location.reload()}
            >
              Перезагрузить
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

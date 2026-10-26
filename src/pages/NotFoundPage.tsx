import { routeHref } from '../lib/router';
import { EmptyState } from '../components/EmptyState';
import { PageHeader } from '../components/PageHeader';

export function NotFoundPage({ path }: { path: string }) {
  return (
    <div className="page">
      <PageHeader
        title="Страница не найдена"
        description={path ? `Маршрут «${path}» не существует в демо.` : undefined}
      />
      <div className="card">
        <EmptyState
          icon="search"
          title="Здесь ничего нет"
          description="Проверьте адрес или вернитесь на обзор. Навигация доступна через меню и Ctrl+K."
          action={
            <a href={routeHref.dashboard} className="button button-primary">
              На обзор
            </a>
          }
        />
      </div>
    </div>
  );
}

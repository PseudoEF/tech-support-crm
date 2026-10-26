import { useMemo, useState } from 'react';
import { filterKbArticles } from '../domain/selectors';
import type { KbArticle } from '../domain/types';
import { formatDateShort } from '../lib/format';
import { routeHref } from '../lib/router';
import { useCrmData } from '../state/CrmContext';
import { EmptyState } from '../components/EmptyState';
import { Icon } from '../components/Icon';
import { PageHeader } from '../components/PageHeader';
import { categoryClass, categoryIcon } from '../components/kbCategories';

function updatedLabel(article: KbArticle): string {
  return formatDateShort(article.updatedAt);
}

export function KnowledgeBasePage() {
  const data = useCrmData();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>('all');

  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    data.kbArticles.forEach((article) => {
      counts.set(article.category, (counts.get(article.category) ?? 0) + 1);
    });
    return Array.from(counts.entries()).sort(([left], [right]) => left.localeCompare(right, 'ru'));
  }, [data.kbArticles]);

  const articles = useMemo(
    () => filterKbArticles(data.kbArticles, search, category),
    [category, data.kbArticles, search],
  );

  return (
    <div className="page kb-page">
      <PageHeader
        title="База знаний"
        description={`${data.kbArticles.length} статей · регламенты, диагностика и ответы для первой линии`}
        actions={
          <a href={routeHref.tickets} className="button button-secondary">
            <Icon name="tickets" size={16} />
            Создать заявку
          </a>
        }
      />

      <section className="kb-toolbar" aria-label="Поиск по базе знаний">
        <div className="search-field kb-search">
          <label htmlFor="kb-search">Поиск по базе знаний</label>
          <div className="search-input-wrap">
            <Icon name="search" size={17} />
            <input
              id="kb-search"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Например, LOS, VPN или двойное списание"
            />
            {search ? (
              <button
                type="button"
                className="search-clear"
                aria-label="Очистить поиск"
                onClick={() => setSearch('')}
              >
                <Icon name="close" size={14} />
              </button>
            ) : null}
          </div>
        </div>
        <span className="result-count">
          {articles.length} {articles.length === 1 ? 'статья' : 'статей'}
        </span>
      </section>

      <div className="kb-category-bar" role="group" aria-label="Категории статей">
        <button
          type="button"
          className={`kb-category-chip ${category === 'all' ? 'is-active' : ''}`}
          aria-pressed={category === 'all'}
          onClick={() => setCategory('all')}
        >
          Все статьи
          <span>{data.kbArticles.length}</span>
        </button>
        {categories.map(([name, count]) => (
          <button
            key={name}
            type="button"
            className={`kb-category-chip kb-${categoryClass(name)} ${
              category === name ? 'is-active' : ''
            }`}
            aria-pressed={category === name}
            onClick={() => setCategory(name)}
          >
            <Icon name={categoryIcon(name)} size={14} />
            {name}
            <span>{count}</span>
          </button>
        ))}
      </div>

      {articles.length === 0 ? (
        <div className="card">
          <EmptyState
            icon="book"
            title="Статей не найдено"
            description="Попробуйте другой запрос или выберите категорию «Все статьи»."
            action={
              <button
                type="button"
                className="button button-secondary"
                onClick={() => {
                  setSearch('');
                  setCategory('all');
                }}
              >
                Сбросить поиск
              </button>
            }
          />
        </div>
      ) : (
        <div className="kb-grid">
          {articles.map((article) => (
            <article className="kb-card" key={article.id}>
              <header className="kb-card-head">
                <span className={`kb-category kb-${categoryClass(article.category)}`}>
                  <Icon name={categoryIcon(article.category)} size={14} />
                  {article.category}
                </span>
                <span className="kb-read-time">{article.readMinutes} мин</span>
              </header>
              <a href={routeHref.article(article.slug)} className="kb-card-title">
                {article.title}
              </a>
              <p>{article.excerpt}</p>
              <footer className="kb-card-footer">
                <span>Обновлено {updatedLabel(article)}</span>
                <a
                  href={routeHref.article(article.slug)}
                  className="kb-open-link"
                  aria-label={`Читать статью ${article.title}`}
                >
                  <Icon name="arrow-up-right" size={16} />
                </a>
              </footer>
            </article>
          ))}
        </div>
      )}

      <section className="kb-help-banner">
        <span className="kb-help-icon">
          <Icon name="message" size={22} />
        </span>
        <div>
          <strong>Не нашли ответ в базе знаний?</strong>
          <p>Создайте заявку — первая линия подключится и зафиксирует решение.</p>
        </div>
        <a href={routeHref.tickets} className="button button-secondary">
          К заявкам
          <Icon name="arrow-right" size={15} />
        </a>
      </section>
    </div>
  );
}

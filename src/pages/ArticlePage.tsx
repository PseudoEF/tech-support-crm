import { useState } from 'react';
import { formatDate } from '../lib/format';
import { routeHref } from '../lib/router';
import { useCrmData } from '../state/CrmContext';
import { EmptyState } from '../components/EmptyState';
import { Icon } from '../components/Icon';
import { PageHeader } from '../components/PageHeader';
import { categoryClass, categoryIcon } from '../components/kbCategories';

interface ArticlePageProps {
  slug: string;
}

type Feedback = 'idle' | 'yes' | 'no';

export function ArticlePage({ slug }: ArticlePageProps) {
  const data = useCrmData();
  const [feedback, setFeedback] = useState<Feedback>('idle');
  const article = data.kbArticles.find((item) => item.slug === slug);

  if (!article) {
    return (
      <div className="page">
        <PageHeader title="Статья не найдена" description={`Адрес: ${slug}`} />
        <div className="card">
          <EmptyState
            icon="book"
            title="Такой статьи нет"
            description="Возможно, ссылка устарела или демо-данные были сброшены."
            action={
              <a href={routeHref.kb} className="button button-primary">
                Вернуться в базу знаний
              </a>
            }
          />
        </div>
      </div>
    );
  }

  const related = data.kbArticles
    .filter((item) => item.id !== article.id)
    .sort((left, right) => {
      const leftMatch = left.category === article.category ? 1 : 0;
      const rightMatch = right.category === article.category ? 1 : 0;
      return rightMatch - leftMatch;
    })
    .slice(0, 3);

  const scrollToSection = (index: number) => {
    document
      .getElementById(`kb-section-${article.id}-${index}`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="page article-page">
      <nav className="breadcrumbs" aria-label="Хлебные крошки">
        <a href={routeHref.kb}>База знаний</a>
        <Icon name="chevron-right" size={13} />
        <span aria-current="page">{article.category}</span>
      </nav>

      <header className="article-header">
        <span className={`kb-category kb-${categoryClass(article.category)}`}>
          <Icon name={categoryIcon(article.category)} size={14} />
          {article.category}
        </span>
        <h1>{article.title}</h1>
        <p>{article.excerpt}</p>
        <div className="article-meta">
          <span>
            <Icon name="calendar" size={15} />
            Обновлено {formatDate(article.updatedAt)}
          </span>
          <span>
            <Icon name="clock" size={15} />
            {article.readMinutes} мин чтения
          </span>
          <span>
            <Icon name="book" size={15} />
            {article.sections.length} разделов
          </span>
        </div>
      </header>

      <div className="article-layout">
        <article className="card article-body">
          {article.sections.map((section, index) => (
            <section
              key={section.heading}
              id={`kb-section-${article.id}-${index}`}
              className="article-section"
            >
              <h2>{section.heading}</h2>
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
              {section.bullets ? (
                <ul>
                  {section.bullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
              ) : null}
            </section>
          ))}

          <div className="article-tags">
            {article.tags.map((tag) => (
              <span className="tag-chip" key={tag}>
                {tag}
              </span>
            ))}
          </div>

          <div className="article-feedback">
            <div>
              <strong>Материал был полезен?</strong>
              <span>Оценка помогает улучшать базу знаний</span>
            </div>
            <div className="feedback-actions">
              <button
                type="button"
                className={`button button-secondary ${
                  feedback === 'yes' ? 'is-selected' : ''
                }`}
                aria-pressed={feedback === 'yes'}
                onClick={() => setFeedback('yes')}
              >
                <Icon name="check" size={15} />
                Да
              </button>
              <button
                type="button"
                className={`button button-secondary ${
                  feedback === 'no' ? 'is-selected' : ''
                }`}
                aria-pressed={feedback === 'no'}
                onClick={() => setFeedback('no')}
              >
                Нет
              </button>
              {feedback !== 'idle' ? (
                <span className="feedback-thanks" role="status">
                  Спасибо за оценку
                </span>
              ) : null}
            </div>
          </div>
        </article>

        <aside className="article-aside">
          <nav className="card toc-card" aria-labelledby="toc-title">
            <h2 id="toc-title">Содержание</h2>
            <ol className="toc-list">
              {article.sections.map((section, index) => (
                <li key={section.heading}>
                  <button type="button" onClick={() => scrollToSection(index)}>
                    <span>{String(index + 1).padStart(2, '0')}</span>
                    {section.heading}
                  </button>
                </li>
              ))}
            </ol>
          </nav>

          <section className="card related-card" aria-labelledby="related-title">
            <h2 id="related-title">Читайте также</h2>
            <ul className="related-list">
              {related.map((item) => (
                <li key={item.id}>
                  <a href={routeHref.article(item.slug)}>
                    <span className={`related-dot kb-${categoryClass(item.category)}`} />
                    <span>
                      <strong>{item.title}</strong>
                      <small>
                        {item.category} · {item.readMinutes} мин
                      </small>
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </section>

          <div className="article-help-card">
            <Icon name="message" size={20} />
            <strong>Нужна помощь?</strong>
            <p>Откройте заявку, если статья не решила вопрос.</p>
            <a href={routeHref.tickets} className="text-link">
              Перейти к заявкам <Icon name="arrow-right" size={14} />
            </a>
          </div>
        </aside>
      </div>
    </div>
  );
}

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from 'motion/react';
import { summarizeTickets } from '../domain/selectors';
import type { Agent, CrmSnapshot } from '../domain/types';
import { routeHref, isSectionActive, navigate, type Route } from '../lib/router';
import { useNow } from '../lib/useNow';
import { useCrmData } from '../state/CrmContext';
import { Avatar } from './Avatar';
import { Icon, type IconName } from './Icon';

interface LayoutProps {
  route: Route;
  children: ReactNode;
  onOpenPalette: () => void;
}

const SECTION_LABEL: Record<Route['name'], string> = {
  dashboard: 'Обзор',
  tickets: 'Заявки',
  ticket: 'Заявки',
  clients: 'Клиенты',
  client: 'Клиенты',
  kb: 'База знаний',
  article: 'База знаний',
  settings: 'Настройки демо',
  'not-found': 'Страница не найдена',
};

interface NavItem {
  section: 'dashboard' | 'tickets' | 'clients' | 'kb';
  href: string;
  label: string;
  icon: IconName;
  badge?: number;
}

function currentAgent(data: CrmSnapshot): Agent {
  return data.agents.find((agent) => agent.id === 'agent-1') ?? data.agents[0];
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  return ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}

function SidebarContent({
  route,
  data,
  overdue,
  openTickets,
  onNavigate,
  closeButton,
  motionScope,
}: {
  route: Route;
  data: CrmSnapshot;
  overdue: number;
  openTickets: number;
  onNavigate?: () => void;
  closeButton?: ReactNode;
  motionScope: string;
}) {
  const reducedMotion = useReducedMotion();
  const agent = currentAgent(data);
  const navItems: NavItem[] = [
    {
      section: 'dashboard',
      href: routeHref.dashboard,
      label: 'Обзор',
      icon: 'dashboard',
    },
    {
      section: 'tickets',
      href: routeHref.tickets,
      label: 'Заявки',
      icon: 'tickets',
      badge: openTickets,
    },
    {
      section: 'clients',
      href: routeHref.clients,
      label: 'Клиенты',
      icon: 'clients',
    },
    {
      section: 'kb',
      href: routeHref.kb,
      label: 'База знаний',
      icon: 'book',
    },
  ];

  return (
    <>
      <div className="sidebar-top">
        <a
          href={routeHref.dashboard}
          className="brand"
          aria-label="ЛинкСервис — на главную"
          onClick={onNavigate}
        >
          <span className="brand-mark" aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
          <span className="brand-text">
            <strong>ЛинкСервис</strong>
            <span>Service Desk</span>
          </span>
        </a>
        {closeButton}
      </div>

      <div className="sidebar-context">
        <span className="workspace-dot" aria-hidden="true" />
        <span>Операционная смена</span>
        <span className="workspace-time">09:00–21:00</span>
      </div>

      <LayoutGroup id={`${motionScope}-nav`}>
        <nav className="sidebar-nav" aria-label="Основная навигация">
          <span className="nav-group-label">Рабочее пространство</span>
          {navItems.map((item) => {
            const active = isSectionActive(route, item.section);
            return (
              <a
                key={item.section}
                href={item.href}
                className={`nav-item ${active ? 'is-active' : ''}`}
                aria-current={active ? 'page' : undefined}
                onClick={onNavigate}
              >
                {active ? (
                  <motion.span
                    className="nav-active-bg"
                    layoutId={`${motionScope}-active`}
                    transition={{
                      duration: reducedMotion ? 0 : 0.26,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                  />
                ) : null}
                <Icon name={item.icon} size={19} />
                <span>{item.label}</span>
                {item.badge !== undefined && item.badge > 0 ? (
                  <span className="nav-count">{item.badge}</span>
                ) : null}
              </a>
            );
          })}

          <span className="nav-group-label nav-group-label-spaced">Система</span>
          <a
            href={routeHref.settings}
            className={`nav-item ${isSectionActive(route, 'settings') ? 'is-active' : ''}`}
            aria-current={route.name === 'settings' ? 'page' : undefined}
            onClick={onNavigate}
          >
            {isSectionActive(route, 'settings') ? (
              <motion.span
                className="nav-active-bg"
                layoutId={`${motionScope}-active`}
                transition={{
                  duration: reducedMotion ? 0 : 0.26,
                  ease: [0.22, 1, 0.36, 1],
                }}
              />
            ) : null}
            <Icon name="settings" size={19} />
            <span>Настройки демо</span>
          </a>
        </nav>
      </LayoutGroup>

      <div className="sidebar-bottom">
        <a href={routeHref.tickets} className="sidebar-alert" onClick={onNavigate}>
          <span className="sidebar-alert-icon">
            <Icon name="clock" size={17} />
          </span>
          <span>
            <strong>{overdue} с просроченным SLA</strong>
            <small>Перейти к заявкам</small>
          </span>
          <Icon name="chevron-right" size={15} />
        </a>

        <div className="sidebar-demo">
          <div className="sidebar-demo-head">
            <span className="local-dot" aria-hidden="true" />
            <strong>Локальные данные</strong>
          </div>
          <p>IndexedDB · без сервера и внешних запросов</p>
          <a href={routeHref.settings} className="text-link" onClick={onNavigate}>
            Настройки демо
          </a>
        </div>

        <div className="sidebar-user">
          <Avatar name={agent.name} size={36} online={agent.online} />
          <div>
            <strong>{agent.name}</strong>
            <span>{agent.role}</span>
          </div>
          <span className="user-status" title={agent.online ? 'В сети' : 'Не в сети'} />
        </div>
      </div>
    </>
  );
}

export function Layout({ route, children, onOpenPalette }: LayoutProps) {
  const data = useCrmData();
  const now = useNow(30_000);
  const metrics = summarizeTickets(data.tickets, now, data.slaPolicies);
  const reducedMotion = useReducedMotion();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const lastGPress = useRef(0);

  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  useEffect(() => {
    const handleHashChange = () => setDrawerOpen(false);
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  useEffect(() => {
    if (!drawerOpen) return;
    const previousOverflow = document.body.style.overflow;
    const menuButton = menuButtonRef.current;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeDrawer();
        return;
      }
      if (event.key !== 'Tab' || !drawerRef.current) return;
      const focusable = drawerRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
      menuButton?.focus();
    };
  }, [drawerOpen, closeDrawer]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setDrawerOpen(false);
        onOpenPalette();
        return;
      }
      if (event.metaKey || event.ctrlKey || event.altKey || isEditableTarget(event.target)) {
        return;
      }

      if (event.key === '/') {
        event.preventDefault();
        onOpenPalette();
        return;
      }

      const key = event.key.toLowerCase();
      if (key === 'g') {
        lastGPress.current = Date.now();
        return;
      }

      if (Date.now() - lastGPress.current < 1200) {
        const destinations: Record<string, string> = {
          d: routeHref.dashboard,
          t: routeHref.tickets,
          c: routeHref.clients,
          k: routeHref.kb,
          s: routeHref.settings,
        };
        const destination = destinations[key];
        if (destination) {
          event.preventDefault();
          lastGPress.current = 0;
          navigate(destination);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onOpenPalette]);

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Перейти к содержимому
      </a>

      <aside className="sidebar sidebar-desktop" aria-label="Боковая навигация">
        <SidebarContent
          route={route}
          data={data}
          overdue={metrics.overdueTickets}
          openTickets={metrics.openTickets}
          motionScope="desktop"
        />
      </aside>

      <AnimatePresence>
        {drawerOpen ? (
          <motion.button
            key="drawer-backdrop"
            type="button"
            className="drawer-backdrop"
            aria-label="Закрыть навигацию"
            onClick={closeDrawer}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reducedMotion ? 0 : 0.18 }}
          />
        ) : null}
        {drawerOpen ? (
          <motion.aside
            key="drawer"
            ref={drawerRef}
            className="sidebar sidebar-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Навигация"
            initial={{ x: reducedMotion ? 0 : '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: reducedMotion ? 0 : '-100%' }}
            transition={{
              duration: reducedMotion ? 0 : 0.22,
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            <SidebarContent
              route={route}
              data={data}
              overdue={metrics.overdueTickets}
              openTickets={metrics.openTickets}
              onNavigate={closeDrawer}
              motionScope="drawer"
              closeButton={
                <button
                  ref={closeButtonRef}
                  type="button"
                  className="icon-button sidebar-close"
                  aria-label="Закрыть навигацию"
                  onClick={closeDrawer}
                >
                  <Icon name="close" size={20} />
                </button>
              }
            />
          </motion.aside>
        ) : null}
      </AnimatePresence>

      <div className="app-main">
        <header className="topbar">
          <div className="topbar-left">
            <button
              ref={menuButtonRef}
              type="button"
              className="icon-button mobile-menu"
              aria-label="Открыть навигацию"
              aria-expanded={drawerOpen}
              onClick={() => setDrawerOpen(true)}
            >
              <Icon name="menu" size={22} />
            </button>
            <div className="topbar-context">
              <span className="topbar-kicker">Служба поддержки</span>
              <strong>{SECTION_LABEL[route.name]}</strong>
            </div>
          </div>

          <div className="topbar-actions">
            <button
              type="button"
              className="quick-search-trigger"
              onClick={onOpenPalette}
              aria-label="Открыть быстрый поиск"
            >
              <Icon name="search" size={17} />
              <span>Быстрый поиск</span>
              <kbd>Ctrl K</kbd>
            </button>
            <a
              href={routeHref.tickets}
              className="overdue-indicator"
              aria-label={`Заявок с просроченным SLA: ${metrics.overdueTickets}`}
            >
              <Icon name="clock" size={18} />
              <span>{metrics.overdueTickets}</span>
            </a>
            <div className="topbar-user">
              <Avatar name={currentAgent(data).name} size={32} />
            </div>
          </div>
        </header>

        <div className="demo-banner" role="note">
          <span className="demo-badge">Демо</span>
          <span className="demo-banner-text">· данные хранятся только в вашем браузере</span>
          <a href={routeHref.settings}>Сбросить демо</a>
        </div>

        <main id="main-content" className="main-content" tabIndex={-1}>
          {children}
        </main>
      </div>
    </div>
  );
}

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  createLead,
  deleteLead,
  LEAD_STATUSES,
  LeadsApiError,
  listLeads,
  updateLead,
} from '../api/leads';

const STATUS_META = {
  new: { label: 'Новый', tone: 'blue', short: 'Н' },
  contacted: { label: 'В работе', tone: 'amber', short: 'В' },
  qualified: { label: 'Квалифицирован', tone: 'violet', short: 'К' },
  won: { label: 'Выигран', tone: 'green', short: 'В' },
  lost: { label: 'Потерян', tone: 'red', short: 'П' },
};

const EMPTY_DRAFT = {
  name: '',
  email: '',
  phone: '',
  source: '',
  status: 'new',
  notes: '',
};

function Icon({ name, size = 18 }) {
  const paths = {
    arrowUp: (
      <>
        <path d="M12 19V5" />
        <path d="m6 11 6-6 6 6" />
      </>
    ),
    briefcase: (
      <>
        <rect x="3" y="7" width="18" height="13" rx="2" />
        <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        <path d="M3 12h18" />
        <path d="M10 12v2h4v-2" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
    chevronDown: <path d="m6 9 6 6 6-6" />,
    close: (
      <>
        <path d="M6 6l12 12" />
        <path d="m18 6-12 12" />
      </>
    ),
    command: (
      <>
        <path d="M18 9a3 3 0 1 0-3-3v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12Z" />
      </>
    ),
    edit: (
      <>
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z" />
      </>
    ),
    filter: (
      <>
        <path d="M4 6h16" />
        <path d="M7 12h10" />
        <path d="M10 18h4" />
      </>
    ),
    grid: (
      <>
        <rect x="4" y="4" width="6" height="6" rx="1" />
        <rect x="14" y="4" width="6" height="6" rx="1" />
        <rect x="4" y="14" width="6" height="6" rx="1" />
        <rect x="14" y="14" width="6" height="6" rx="1" />
      </>
    ),
    inbox: (
      <>
        <path d="M4 4h16v13H4z" />
        <path d="M4 13h4l2 3h4l2-3h4" />
      </>
    ),
    link: (
      <>
        <path d="M10 13a5 5 0 0 0 7.54.54l1.92-1.92a5 5 0 0 0-7.07-7.07l-1.1 1.1" />
        <path d="M14 11a5 5 0 0 0-7.54-.54l-1.92 1.92a5 5 0 0 0 7.07 7.07l1.1-1.1" />
      </>
    ),
    list: (
      <>
        <path d="M8 6h13" />
        <path d="M8 12h13" />
        <path d="M8 18h13" />
        <path d="M3 6h.01" />
        <path d="M3 12h.01" />
        <path d="M3 18h.01" />
      </>
    ),
    plus: (
      <>
        <path d="M12 5v14" />
        <path d="M5 12h14" />
      </>
    ),
    refresh: (
      <>
        <path d="M20 11a8.1 8.1 0 0 0-15.5-2M4 5v4h4" />
        <path d="M4 13a8.1 8.1 0 0 0 15.5 2M20 19v-4h-4" />
      </>
    ),
    search: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-4-4" />
      </>
    ),
    spark: (
      <>
        <path d="m12 3-1.35 5.65L5 10l5.65 1.35L12 17l1.35-5.65L19 10l-5.65-1.35Z" />
        <path d="m19 16-.55 2.45L16 19l2.45.55L19 22l.55-2.45L22 19l-2.45-.55Z" />
      </>
    ),
    trash: (
      <>
        <path d="M4 7h16" />
        <path d="M10 11v6M14 11v6" />
        <path d="m6 7 1 13h10l1-13" />
        <path d="M9 7V4h6v3" />
      </>
    ),
    users: (
      <>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      </>
    ),
  };

  return (
    <svg
      aria-hidden="true"
      className="icon"
      fill="none"
      height={size}
      viewBox="0 0 24 24"
      width={size}
    >
      {paths[name]}
    </svg>
  );
}

function getInitials(name) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase() || '?';
}

function formatDate(value) {
  if (!value) return '—';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';

  return new Intl.DateTimeFormat('ru-RU', {
    month: 'short',
    day: 'numeric',
  }).format(date);
}

function formatRelativeDate(value) {
  if (!value) return 'Нет активности';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Нет активности';

  const differenceInDays = Math.floor(
    (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (differenceInDays <= 0) return 'Сегодня';
  if (differenceInDays === 1) return 'Вчера';
  if (differenceInDays < 7) return `${differenceInDays} дн. назад`;

  return formatDate(value);
}

function StatusBadge({ status }) {
  const meta = STATUS_META[status] || STATUS_META.new;

  return (
    <span className={`status-badge status-badge--${meta.tone}`}>
      <span className="status-dot" />
      {meta.label}
    </span>
  );
}

function MetricCard({ label, value, detail, tone, icon }) {
  return (
    <article className={`metric-card metric-card--${tone}`}>
      <div className="metric-card__top">
        <span className="metric-card__label">{label}</span>
        <span className="metric-card__icon">
          <Icon name={icon} size={16} />
        </span>
      </div>
      <strong className="metric-card__value">{value}</strong>
      <span className="metric-card__detail">{detail}</span>
    </article>
  );
}

function LeadForm({ draft, isSaving, onChange, onClose, onSubmit }) {
  const isEditing = Boolean(draft.id);

  return (
    <div className="drawer-backdrop" role="presentation" onMouseDown={onClose}>
      <aside
        aria-labelledby="lead-drawer-title"
        className="lead-drawer"
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="drawer-header">
          <div>
            <span className="eyebrow">Карточка лида</span>
            <h2 id="lead-drawer-title">
              {isEditing ? 'Редактировать лида' : 'Добавить лида'}
            </h2>
          </div>
          <button
            aria-label="Close lead form"
            className="icon-button icon-button--quiet"
            onClick={onClose}
            type="button"
          >
            <Icon name="close" />
          </button>
        </div>

        <form className="lead-form" onSubmit={onSubmit}>
          <div className="form-intro">
            <span className="form-intro__mark">
              <Icon name={isEditing ? 'edit' : 'spark'} size={16} />
            </span>
            <p>
              {isEditing
                ? 'Держи карточку актуальной, чтобы следующий шаг был очевиден.'
                : 'Зафиксируй новую возможность, пока контекст ещё свеж.'}
            </p>
          </div>

          <label className="form-field form-field--full">
            <span>Имя <b aria-hidden="true">*</b></span>
            <input
              autoFocus
              maxLength={200}
              name="name"
              onChange={onChange}
              placeholder="Например, Анна Петрова"
              required
              value={draft.name}
            />
          </label>

          <div className="form-grid">
            <label className="form-field">
              <span>Email</span>
              <input
                maxLength={320}
                name="email"
                onChange={onChange}
                placeholder="anna@company.com"
                type="email"
                value={draft.email}
              />
            </label>
            <label className="form-field">
              <span>Телефон</span>
              <input
                maxLength={50}
                name="phone"
                onChange={onChange}
                placeholder="+7 900 123-45-67"
                type="tel"
                value={draft.phone}
              />
            </label>
          </div>

          <div className="form-grid">
            <label className="form-field">
              <span>Источник</span>
              <input
                maxLength={100}
                name="source"
                onChange={onChange}
                placeholder="Сайт, рекомендация…"
                value={draft.source}
              />
            </label>
            <label className="form-field">
              <span>Статус</span>
              <span className="select-wrap">
                <select name="status" onChange={onChange} value={draft.status}>
                  {LEAD_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {STATUS_META[status].label}
                    </option>
                  ))}
                </select>
                <Icon name="chevronDown" size={15} />
              </span>
            </label>
          </div>

          <label className="form-field form-field--full">
            <span>Заметки</span>
            <textarea
              maxLength={4000}
              name="notes"
              onChange={onChange}
              placeholder="Что команде важно помнить?"
              rows={5}
              value={draft.notes}
            />
            <small>{draft.notes.length}/4000</small>
          </label>

          <div className="drawer-actions">
            <button className="button button--secondary" onClick={onClose} type="button">
              Отмена
            </button>
            <button className="button button--primary" disabled={isSaving} type="submit">
              {isSaving ? 'Сохранение…' : isEditing ? 'Сохранить' : 'Создать лида'}
            </button>
          </div>
        </form>
      </aside>
    </div>
  );
}

function LeadRow({ lead, onDelete, onEdit }) {
  return (
    <tr>
      <td>
        <div className="lead-person">
          <span className="avatar avatar--small">{getInitials(lead.name)}</span>
          <div>
            <strong>{lead.name}</strong>
            <span>{lead.email || 'Email не указан'}</span>
          </div>
        </div>
      </td>
      <td>
        <span className="contact-cell">{lead.phone || '—'}</span>
      </td>
      <td>
        <span className="source-cell">{lead.source || 'Прямой контакт'}</span>
      </td>
      <td>
        <StatusBadge status={lead.status} />
      </td>
      <td>
        <span className="date-cell">
          {formatRelativeDate(lead.updatedAt || lead.createdAt)}
        </span>
      </td>
      <td>
        <div className="row-actions">
          <button
            aria-label={`Редактировать ${lead.name}`}
            className="table-action"
            onClick={() => onEdit(lead)}
            title="Редактировать"
            type="button"
          >
            <Icon name="edit" size={16} />
          </button>
          <button
            aria-label={`Удалить ${lead.name}`}
            className="table-action table-action--danger"
            onClick={() => onDelete(lead)}
            title="Удалить"
            type="button"
          >
            <Icon name="trash" size={16} />
          </button>
        </div>
      </td>
    </tr>
  );
}

function LeadCard({ lead, onDelete, onEdit }) {
  return (
    <article className="lead-card">
      <div className="lead-card__header">
        <div className="lead-person">
          <span className="avatar avatar--small">{getInitials(lead.name)}</span>
          <div>
            <strong>{lead.name}</strong>
          <span>{lead.email || 'Email не указан'}</span>
          </div>
        </div>
        <StatusBadge status={lead.status} />
      </div>
      <div className="lead-card__details">
        <span>{lead.source || 'Прямой контакт'}</span>
        <span>{lead.phone || 'Телефон не указан'}</span>
        <span>{formatRelativeDate(lead.updatedAt || lead.createdAt)}</span>
      </div>
      <div className="lead-card__actions">
        <button
          aria-label={`Редактировать ${lead.name}`}
          className="button button--small button--secondary"
          onClick={() => onEdit(lead)}
          type="button"
        >
          <Icon name="edit" size={14} />
          Редактировать
        </button>
        <button
          aria-label={`Удалить ${lead.name}`}
          className="button button--small button--ghost-danger"
          onClick={() => onDelete(lead)}
          type="button"
        >
          <Icon name="trash" size={14} />
        </button>
      </div>
    </article>
  );
}

function EmptyState({ hasFilters, onClear, onCreate }) {
  return (
    <div className="empty-state">
      <div className="empty-state__icon">
        <Icon name={hasFilters ? 'search' : 'inbox'} size={23} />
      </div>
      <h3>{hasFilters ? 'Лиды не найдены' : 'Воронка пока пуста'}</h3>
      <p>
        {hasFilters
          ? 'Попробуй другое имя, источник или статус.'
          : 'Добавь первого лида, чтобы держать следующую возможность в фокусе.'}
      </p>
      <button
        className="button button--secondary"
        onClick={hasFilters ? onClear : onCreate}
        type="button"
      >
        {hasFilters ? 'Сбросить фильтры' : 'Добавить первого лида'}
      </button>
    </div>
  );
}

export default function LeadsPage({ onSessionExpired }) {
  const [leads, setLeads] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [view, setView] = useState('table');
  const [draft, setDraft] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState('');

  const loadLeads = useCallback(async (signal) => {
    setIsLoading(true);
    setError('');

    try {
      const nextLeads = await listLeads({ signal });
      setLeads(nextLeads);
    } catch (loadError) {
      if (loadError.name === 'AbortError') return;
      if (loadError.status === 401) {
        await onSessionExpired?.();
        return;
      }
      setError(
        loadError instanceof LeadsApiError
          ? loadError.message
          : 'Не удалось загрузить лидов. Попробуй ещё раз.'
      );
    } finally {
      if (!signal?.aborted) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    loadLeads(controller.signal);
    return () => controller.abort();
  }, [loadLeads]);

  useEffect(() => {
    if (!notice) return undefined;
    const timeout = window.setTimeout(() => setNotice(''), 3500);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  const visibleLeads = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return leads.filter((lead) => {
      const matchesStatus = statusFilter === 'all' || lead.status === statusFilter;
      if (!matchesStatus) return false;
      if (!normalizedSearch) return true;

      return [
        lead.name,
        lead.email,
        lead.phone,
        lead.source,
        lead.notes,
      ].some((value) => value?.toLowerCase().includes(normalizedSearch));
    });
  }, [leads, search, statusFilter]);

  const metrics = useMemo(() => {
    const newLeads = leads.filter((lead) => lead.status === 'new').length;
    const qualifiedLeads = leads.filter((lead) => lead.status === 'qualified').length;
    const wonLeads = leads.filter((lead) => lead.status === 'won').length;
    const recentLeads = leads.filter((lead) => {
      const createdAt = new Date(lead.createdAt).getTime();
      return createdAt && Date.now() - createdAt < 7 * 24 * 60 * 60 * 1000;
    }).length;

    return { newLeads, qualifiedLeads, wonLeads, recentLeads };
  }, [leads]);

  function openCreate() {
    setError('');
    setDraft({ ...EMPTY_DRAFT });
  }

  function openEdit(lead) {
    setError('');
    setDraft({
      id: lead.id,
      name: lead.name || '',
      email: lead.email || '',
      phone: lead.phone || '',
      source: lead.source || '',
      status: lead.status || 'new',
      notes: lead.notes || '',
    });
  }

  function updateDraft(event) {
    const { name, value } = event.target;
    setDraft((current) => ({ ...current, [name]: value }));
  }

  async function saveDraft(event) {
    event.preventDefault();
    if (!draft?.name.trim()) return;

    setIsSaving(true);
    setError('');

    const payload = {
      name: draft.name.trim(),
      email: draft.email.trim() || null,
      phone: draft.phone.trim() || null,
      source: draft.source.trim(),
      status: draft.status,
      notes: draft.notes.trim(),
    };

    try {
      if (draft.id) {
        const savedLead = await updateLead(draft.id, payload);
        setLeads((current) =>
          current.map((lead) => (lead.id === savedLead.id ? savedLead : lead))
        );
        setNotice('Лид обновлён');
      } else {
        const savedLead = await createLead(payload);
        setLeads((current) => [savedLead, ...current]);
        setNotice('Лид добавлен в воронку');
      }
      setDraft(null);
    } catch (saveError) {
      if (saveError.status === 401) {
        await onSessionExpired?.();
        return;
      }
      setError(
        saveError instanceof LeadsApiError
          ? saveError.message
          : 'Не удалось сохранить лида.'
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function removeLead(lead) {
    if (!window.confirm(`Удалить лида «${lead.name}»? Это действие нельзя отменить.`)) {
      return;
    }

    setError('');
    try {
      await deleteLead(lead.id);
      setLeads((current) => current.filter((item) => item.id !== lead.id));
      setNotice('Лид удалён');
    } catch (deleteError) {
      if (deleteError.status === 401) {
        await onSessionExpired?.();
        return;
      }
      setError(
        deleteError instanceof LeadsApiError
          ? deleteError.message
          : 'Не удалось удалить лида.'
      );
    }
  }

  const hasFilters = Boolean(search.trim()) || statusFilter !== 'all';

  useEffect(() => {
    function focusSearch(event) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        document.querySelector('.search-field input')?.focus();
      }
    }

    window.addEventListener('keydown', focusSearch);
    return () => window.removeEventListener('keydown', focusSearch);
  }, []);

  return (
    <section className="leads-page">
      <header className="page-header">
        <div>
          <div className="breadcrumb">
            <span>Пространство</span>
            <span>/</span>
            <strong>Лиды</strong>
          </div>
          <div className="page-title-row">
            <div>
              <span className="eyebrow">Обзор воронки</span>
              <h1>Лиды</h1>
            </div>
            <span className="live-pill">
              <span className="live-pill__dot" />
              Рабочее пространство
            </span>
          </div>
          <p className="page-subtitle">
            Держи каждую возможность на пути к следующему полезному контакту.
          </p>
        </div>
        <div className="page-actions">
          <button
            aria-label="Обновить лидов"
            className="icon-button"
            disabled={isLoading}
            onClick={() => loadLeads()}
            title="Обновить"
            type="button"
          >
            <Icon name="refresh" />
          </button>
          <button className="button button--primary" onClick={openCreate} type="button">
            <Icon name="plus" size={17} />
            Добавить лида
          </button>
        </div>
      </header>

      <div className="metrics-grid">
        <MetricCard
          detail={`${metrics.recentLeads} добавлено за последние 7 дней`}
          icon="users"
          label="Все лиды"
          tone="blue"
          value={leads.length}
        />
        <MetricCard
          detail="Готовы к первому контакту"
          icon="inbox"
          label="Новые"
          tone="amber"
          value={metrics.newLeads}
        />
        <MetricCard
          detail="Показали явный интерес"
          icon="spark"
          label="Квалифицированные"
          tone="violet"
          value={metrics.qualifiedLeads}
        />
        <MetricCard
          detail="Конвертированные возможности"
          icon="check"
          label="Выигранные"
          tone="green"
          value={metrics.wonLeads}
        />
      </div>

      <section className="leads-panel">
        <div className="panel-toolbar">
          <div className="panel-toolbar__heading">
            <div className="panel-icon">
              <Icon name="briefcase" size={18} />
            </div>
            <div>
              <h2>Воронка лидов</h2>
              <span>
                {isLoading ? 'Синхронизация…' : `${visibleLeads.length} записей видно`}
              </span>
            </div>
          </div>
          <div className="view-switcher" role="group" aria-label="Вид лидов">
            <button
              aria-label="Табличный вид"
              className={view === 'table' ? 'is-active' : ''}
              onClick={() => setView('table')}
              type="button"
            >
              <Icon name="list" size={16} />
            </button>
            <button
              aria-label="Карточки"
              className={view === 'cards' ? 'is-active' : ''}
              onClick={() => setView('cards')}
              type="button"
            >
              <Icon name="grid" size={16} />
            </button>
          </div>
        </div>

        <div className="filters-bar">
          <label className="search-field">
            <Icon name="search" size={17} />
            <span className="sr-only">Поиск лидов</span>
            <input
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Поиск по имени, email, источнику…"
              type="search"
              value={search}
            />
            <kbd>⌘ K</kbd>
          </label>
          <label className="filter-select">
            <Icon name="filter" size={16} />
            <span className="sr-only">Фильтр по статусу</span>
            <select
              onChange={(event) => setStatusFilter(event.target.value)}
              value={statusFilter}
            >
              <option value="all">Все статусы</option>
              {LEAD_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {STATUS_META[status].label}
                </option>
              ))}
            </select>
            <Icon name="chevronDown" size={14} />
          </label>
        </div>

        {error && (
          <div className="inline-alert" role="alert">
            <div>
              <strong>Нужно внимание</strong>
              <span>{error}</span>
            </div>
            <button onClick={() => loadLeads()} type="button">
              Повторить
            </button>
          </div>
        )}

        {isLoading ? (
          <div aria-label="Загрузка лидов" className="loading-state" role="status">
            <span className="loading-spinner" />
            <span>Загружаем воронку…</span>
          </div>
        ) : visibleLeads.length === 0 ? (
          <EmptyState
            hasFilters={hasFilters}
            onClear={() => {
              setSearch('');
              setStatusFilter('all');
            }}
            onCreate={openCreate}
          />
        ) : view === 'table' ? (
          <div className="table-scroll">
            <table className="leads-table">
              <thead>
                <tr>
                  <th>Имя</th>
                  <th>Телефон</th>
                  <th>Источник</th>
                  <th>Статус</th>
                  <th>Обновлён</th>
                  <th><span className="sr-only">Действия</span></th>
                </tr>
              </thead>
              <tbody>
                {visibleLeads.map((lead) => (
                  <LeadRow
                    key={lead.id}
                    lead={lead}
                    onDelete={removeLead}
                    onEdit={openEdit}
                  />
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="leads-card-grid">
            {visibleLeads.map((lead) => (
              <LeadCard
                key={lead.id}
                lead={lead}
                onDelete={removeLead}
                onEdit={openEdit}
              />
            ))}
          </div>
        )}
      </section>

      <footer className="page-footer">
        <span>
          <Icon name="link" size={14} />
          Рабочее пространство компании
        </span>
        <span>Изменения сохраняются в защищённом пространстве</span>
      </footer>

      {notice && (
        <div className="toast" role="status">
          <span className="toast__icon"><Icon name="check" size={15} /></span>
          {notice}
        </div>
      )}

      {draft && (
        <LeadForm
          draft={draft}
          isSaving={isSaving}
          onChange={updateDraft}
          onClose={() => !isSaving && setDraft(null)}
          onSubmit={saveDraft}
        />
      )}
    </section>
  );
}

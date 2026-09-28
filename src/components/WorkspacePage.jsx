import { useEffect, useState } from 'react';
import {
  createKnowledge, createService, deleteKnowledge, deleteService,
  listKnowledge, listServices, updateKnowledge, updateService,
} from '../api/catalog';

const EMPTY_SERVICE = { name: '', description: '', priceFrom: '', priceTo: '', currency: 'USD' };
const EMPTY_KNOWLEDGE = { question: '', answer: '', category: '' };

function Editor({ kind, value, onChange, onCancel, onSave }) {
  const knowledge = kind === 'knowledge';
  return (
    <form className="workspace-editor" onSubmit={(event) => { event.preventDefault(); onSave(); }}>
      {knowledge ? (
        <>
          <input required placeholder="Вопрос" value={value.question} onChange={(e) => onChange({ ...value, question: e.target.value })} />
          <textarea required placeholder="Ответ" value={value.answer} onChange={(e) => onChange({ ...value, answer: e.target.value })} />
          <input placeholder="Категория" value={value.category} onChange={(e) => onChange({ ...value, category: e.target.value })} />
        </>
      ) : (
        <>
          <input required placeholder="Название услуги" value={value.name} onChange={(e) => onChange({ ...value, name: e.target.value })} />
          <textarea placeholder="Описание" value={value.description} onChange={(e) => onChange({ ...value, description: e.target.value })} />
          <div className="workspace-editor__row">
            <input type="number" min="0" step="0.01" placeholder="Цена от" value={value.priceFrom} onChange={(e) => onChange({ ...value, priceFrom: e.target.value })} />
            <input type="number" min="0" step="0.01" placeholder="Цена до" value={value.priceTo} onChange={(e) => onChange({ ...value, priceTo: e.target.value })} />
            <input maxLength="3" placeholder="USD" value={value.currency} onChange={(e) => onChange({ ...value, currency: e.target.value.toUpperCase() })} />
          </div>
        </>
      )}
      <div className="workspace-editor__actions">
        <button type="button" onClick={onCancel}>Отмена</button>
        <button className="primary-button" type="submit">Сохранить</button>
      </div>
    </form>
  );
}

export default function WorkspacePage({ onSessionExpired }) {
  const [tab, setTab] = useState('services');
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState('');
  const load = async () => {
    try {
      setError('');
      setItems(tab === 'services' ? await listServices() : await listKnowledge());
    } catch (err) {
      if (err.status === 401) onSessionExpired();
      setError(err.status === 302 ? 'Маршрут закрыт Cloudflare Access.' : err.message);
    }
  };
  useEffect(() => { load(); }, [tab]);
  async function save() {
    try {
      const knowledge = tab === 'knowledge';
      const input = knowledge
        ? { question: editing.question, answer: editing.answer, category: editing.category }
        : { ...editing, priceFrom: editing.priceFrom === '' ? null : Number(editing.priceFrom), priceTo: editing.priceTo === '' ? null : Number(editing.priceTo) };
      const item = editing.id
        ? (knowledge ? await updateKnowledge(editing.id, input) : await updateService(editing.id, input))
        : (knowledge ? await createKnowledge(input) : await createService(input));
      setItems((current) => editing.id ? current.map((entry) => entry.id === item.id ? item : entry) : [...current, item]);
      setEditing(null);
    } catch (err) { setError(err.message); }
  }
  async function remove(item) {
    if (!window.confirm('Удалить запись?')) return;
    try {
      if (tab === 'services') await deleteService(item.id); else await deleteKnowledge(item.id);
      setItems((current) => current.filter((entry) => entry.id !== item.id));
    } catch (err) { setError(err.message); }
  }
  return (
    <main className="workspace-page">
      <div className="workspace-page__header">
        <div><span className="eyebrow">РАБОЧЕЕ ПРОСТРАНСТВО</span><h1>{tab === 'services' ? 'Услуги' : 'База знаний'}</h1></div>
        <button className="primary-button" onClick={() => setEditing(tab === 'services' ? { ...EMPTY_SERVICE } : { ...EMPTY_KNOWLEDGE })}>+ Добавить</button>
      </div>
      <div className="workspace-tabs">
        <button className={tab === 'services' ? 'is-active' : ''} onClick={() => { setTab('services'); setEditing(null); }}>Услуги</button>
        <button className={tab === 'knowledge' ? 'is-active' : ''} onClick={() => { setTab('knowledge'); setEditing(null); }}>База знаний</button>
      </div>
      {error && <p className="error-message" role="alert">{error}</p>}
      {editing && <Editor kind={tab} value={editing} onChange={setEditing} onCancel={() => setEditing(null)} onSave={save} />}
      {!editing && <section className="workspace-list">{items.length ? items.map((item) => (
        <article className="workspace-card" key={item.id}>
          <div><h2>{tab === 'services' ? item.name : item.question}</h2><p>{tab === 'services' ? item.description : item.answer}</p></div>
          <div className="workspace-card__actions"><button onClick={() => setEditing({ ...item })}>Изменить</button><button onClick={() => remove(item)}>Удалить</button></div>
        </article>
      )) : <p className="workspace-empty">Записей пока нет.</p>}</section>}
    </main>
  );
}

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import Icon from './Icon';


const time = (d) => new Date(d).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

/**
 * Messagerie de course, façon Uber : bulles, réponses rapides, envoi en un geste.
 * `me` = 'passenger' | 'driver' ; les messages en attente d'accusé portent `pending`.
 */
export default function ChatSheet({ me, title, messages, quickReplies, onSend, onClose, closed = false }) {
  const [text, setText] = useState('');
  const listRef = useRef(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages.length]);

  const send = (body) => {
    const t = body.trim();
    if (!t || closed) return;
    onSend(t);
    setText('');
  };

  return (
    <motion.div className="fixed inset-0 z-[75] bg-black/40 flex items-end justify-center"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div role="dialog" aria-modal="true" aria-labelledby="chat-title"
        initial={{ y: 40 }} animate={{ y: 0 }} exit={{ y: 40 }} transition={{ duration: 0.2 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-md bg-white rounded-t-2xl flex flex-col h-[80dvh]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="flex items-center justify-between px-4 h-14 border-b border-ink-line flex-shrink-0">
          <h2 id="chat-title" className="text-lg font-bold text-ink truncate">{title}</h2>
          <button onClick={onClose} aria-label="Fermer" className="w-11 h-11 -mr-2 rounded-full flex items-center justify-center text-ink-2 active:bg-ink-fill">
            <Icon name="x" size={20} />
          </button>
        </div>

        <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2" aria-live="polite" aria-label="Messages">
          {messages.length === 0 && (
            <p className="text-sm text-ink-2 text-center my-auto">
              Écris un message ou choisis une réponse rapide. Pour une urgence, appelle plutôt.
            </p>
          )}
          {messages.map(m => {
            const mine = m.sender === me;
            return (
              <div key={m.id ?? m.client_id} className={`max-w-[80%] ${mine ? 'self-end items-end' : 'self-start items-start'} flex flex-col`}>
                <span className={`px-3 py-2 rounded-2xl text-base leading-snug break-words ${mine ? 'bg-ink text-white rounded-br-md' : 'bg-ink-fill text-ink rounded-bl-md'}`}>
                  {m.body}
                </span>
                <span className="text-xs text-ink-3 mt-0.5 px-1">{m.pending ? 'Envoi…' : time(m.created_at)}</span>
              </div>
            );
          })}
        </div>

        {closed ? (
          <p className="text-sm text-ink-2 text-center py-4 border-t border-ink-line">La messagerie est fermée : la course est terminée.</p>
        ) : (
          <div className="border-t border-ink-line flex-shrink-0">
            <div className="flex gap-2 overflow-x-auto px-4 pt-3 pb-1" role="group" aria-label="Réponses rapides">
              {quickReplies.map(q => (
                <button key={q} onClick={() => send(q)}
                  className="h-9 px-3 rounded-full bg-ink-fill text-ink text-sm font-semibold whitespace-nowrap flex-shrink-0 active:bg-ink-line">{q}</button>
              ))}
            </div>
            <form onSubmit={e => { e.preventDefault(); send(text); }} className="flex items-center gap-2 px-4 py-3">
              <input value={text} onChange={e => setText(e.target.value.slice(0, 300))} placeholder="Message"
                aria-label="Ton message" enterKeyHint="send"
                className="flex-1 h-12 bg-ink-fill rounded-full px-4 text-base text-ink outline-none focus:ring-2 focus:ring-ink" />
              <button type="submit" disabled={!text.trim()} aria-label="Envoyer"
                className="w-12 h-12 rounded-full bg-ink text-white flex items-center justify-center disabled:bg-ink-fill disabled:text-ink-3">
                <Icon name="arrowUp" size={20} />
              </button>
            </form>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

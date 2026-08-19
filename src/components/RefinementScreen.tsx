import { useEffect, useRef, useState, type FormEvent } from "react";
import type { ChatMessage, SessionResponse, StudentIdentity } from "../types";

interface RefinementScreenProps {
  student: StudentIdentity;
  session: SessionResponse;
  messages: ChatMessage[];
  error: string | null;
  busy: boolean;
  finished: boolean;
  onSend: (message: string) => Promise<boolean>;
  onFinish: () => Promise<void>;
  onDownload: () => Promise<void>;
  onClose: () => void;
}

const initialMessage: ChatMessage = {
  role: "PRODUCT_OWNER",
  content:
    "Jestem Product Ownerem OrderFlow dla zmiany dotyczącej anulowania zamówień. Zadawaj konkretne pytania dotyczące elementów wymagających doprecyzowania.",
  createdAt: "",
};

export function RefinementScreen({
  student,
  session,
  messages,
  error,
  busy,
  finished,
  onSend,
  onFinish,
  onDownload,
  onClose,
}: RefinementScreenProps) {
  const [draft, setDraft] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const visibleMessages = messages.length > 0 ? messages : [initialMessage];

  useEffect(() => {
    const target = endRef.current;
    if (typeof target?.scrollIntoView === "function") {
      target.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [messages, busy]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const message = draft.trim();
    if (!message || busy || finished) return;
    if (await onSend(message)) setDraft("");
  };

  const finish = async () => {
    if (window.confirm("Czy na pewno zakończyć refinement? Po zakończeniu nie będzie można zadawać pytań.")) {
      await onFinish();
    }
  };

  return (
    <main className="workspace-shell">
      <header className="workspace-header">
        <div className="brand-inline">
          <div className="brand-mark small" aria-hidden="true">OF</div>
          <div>
            <p className="eyebrow">ORDERFLOW</p>
            <h1>Product Owner - Refinement</h1>
          </div>
        </div>
        <div className={`session-state ${finished ? "finished" : ""}`}>
          <span className="state-dot" /> {finished ? "Sesja zakończona" : "Sesja aktywna"}
        </div>
      </header>

      <section className="session-strip" aria-label="Dane sesji">
        <div><span>Student</span><strong>{student.firstName} {student.lastName}</strong></div>
        <div><span>Nr albumu</span><strong>{student.albumNumber}</strong></div>
        <div><span>Wersja</span><strong>{session.variant}</strong></div>
        <div><span>Session ID</span><strong className="session-id">{session.sessionId}</strong></div>
        <div className="question-meter">
          <span>Pytania</span>
          <strong>{session.questionCount} / {session.maxQuestions}</strong>
          <div className="meter-track" aria-hidden="true">
            <div
              className="meter-fill"
              style={{ width: `${Math.min(100, (session.questionCount / session.maxQuestions) * 100)}%` }}
            />
          </div>
        </div>
      </section>

      <section className="conversation-panel" aria-label="Rozmowa refinementowa">
        <div className="conversation-title">
          <div>
            <h2>Rozmowa</h2>
            <p>Odpowiedzi Product Ownera dotyczą wyłącznie konkretnie zadanego pytania.</p>
          </div>
          <span>{visibleMessages.length} wiadomości</span>
        </div>
        <div className="message-list" aria-live="polite">
          {visibleMessages.map((message, index) => (
            <article className={`message ${message.role === "STUDENT" ? "student" : "owner"}`} key={`${message.createdAt}-${index}`}>
              <div className="message-avatar" aria-hidden="true">
                {message.role === "STUDENT" ? student.firstName.slice(0, 1).toUpperCase() : "PO"}
              </div>
              <div className="message-body">
                <div className="message-meta">
                  <strong>{message.role === "STUDENT" ? "Student" : "Product Owner"}</strong>
                  {message.createdAt && <time>{new Date(message.createdAt).toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" })}</time>}
                </div>
                <p>{message.content}</p>
              </div>
            </article>
          ))}
          {busy && (
            <div className="typing-indicator" aria-label="Product Owner przygotowuje odpowiedź">
              <span /><span /><span />
            </div>
          )}
          <div ref={endRef} />
        </div>

        {error && <div className="error-banner workspace-error" role="alert">{error}</div>}

        <div className="composer-area">
          {finished ? (
            <div className="finished-actions">
              <div>
                <strong>Refinement został zakończony</strong>
                <p>Sesja jest tylko do odczytu. Pobierz transkrypt wygenerowany przez serwer.</p>
              </div>
              <div className="finished-buttons">
                <button className="primary-button compact" type="button" onClick={() => void onDownload()} disabled={busy}>
                  Pobierz transkrypt
                </button>
                <button className="secondary-button compact" type="button" onClick={onClose} disabled={busy}>
                  Zamknij widok sesji
                </button>
              </div>
            </div>
          ) : (
            <form className="composer" onSubmit={(event) => void submit(event)}>
              <label htmlFor="question">Zadaj pytanie</label>
              <div className="composer-row">
                <textarea
                  id="question"
                  rows={2}
                  maxLength={2000}
                  placeholder="Wpisz konkretne pytanie biznesowe..."
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  disabled={busy}
                />
                <button className="primary-button compact" type="submit" disabled={busy || !draft.trim()}>
                  Wyślij
                </button>
              </div>
              <div className="composer-footer">
                <span>{draft.length} / 2000</span>
                <button className="text-button danger" type="button" onClick={() => void finish()} disabled={busy}>
                  Zakończ refinement
                </button>
              </div>
            </form>
          )}
        </div>
      </section>
    </main>
  );
}

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, api } from "./api";
import { LoginScreen } from "./components/LoginScreen";
import { RefinementScreen } from "./components/RefinementScreen";
import type {
  ChatMessage,
  SessionRequest,
  SessionResponse,
  SessionSnapshotResponse,
  StudentIdentity,
} from "./types";

const SESSION_TOKEN_KEY = "orderflow.sessionToken";

function readSessionToken(): string | null {
  try {
    return window.sessionStorage.getItem(SESSION_TOKEN_KEY);
  } catch {
    return null;
  }
}

function storeSessionToken(token: string): void {
  try {
    window.sessionStorage.setItem(SESSION_TOKEN_KEY, token);
  } catch {
    // The session still works in memory when browser storage is unavailable.
  }
}

function clearSessionToken(): void {
  try {
    window.sessionStorage.removeItem(SESSION_TOKEN_KEY);
  } catch {
    // Nothing else is required when browser storage is unavailable.
  }
}

function errorMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : "Wystąpił nieoczekiwany błąd. Spróbuj ponownie.";
}

function downloadMarkdown(fileName: string, markdown: string): void {
  const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function App() {
  const [student, setStudent] = useState<StudentIdentity | null>(null);
  const [session, setSession] = useState<SessionResponse | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [finished, setFinished] = useState(false);
  const [resumeToken, setResumeToken] = useState<string | null>(() => readSessionToken());
  const [restoring, setRestoring] = useState(true);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const restorationStarted = useRef(false);

  const applySnapshot = useCallback((token: string, snapshot: SessionSnapshotResponse) => {
    setStudent(snapshot.student);
    setMessages(snapshot.history);
    setSession({
      sessionId: snapshot.sessionId,
      sessionToken: token,
      variant: snapshot.variant,
      maxQuestions: snapshot.maxQuestions,
      questionCount: snapshot.questionCount,
      history: snapshot.history,
    });
    setFinished(snapshot.status === "FINISHED");
  }, []);

  const restore = useCallback(async (token: string) => {
    setRestoring(true);
    setRestoreError(null);
    setError(null);
    try {
      applySnapshot(token, await api.session(token));
    } catch (caught) {
      const invalidSession =
        caught instanceof ApiError &&
        (caught.status === 401 || caught.code === "SESSION_EXPIRED");
      if (invalidSession) {
        clearSessionToken();
        setResumeToken(null);
        setError("Sesja wygasła lub wymaga ponownego uwierzytelnienia. Zaloguj się ponownie.");
      } else {
        setRestoreError(errorMessage(caught));
      }
    } finally {
      setRestoring(false);
    }
  }, [applySnapshot]);

  useEffect(() => {
    if (restorationStarted.current) return;
    restorationStarted.current = true;
    if (resumeToken) {
      void restore(resumeToken);
    } else {
      setRestoring(false);
    }
  }, [restore, resumeToken]);

  const resetAuthenticatedSession = (message: string) => {
    clearSessionToken();
    setResumeToken(null);
    setStudent(null);
    setSession(null);
    setMessages([]);
    setFinished(false);
    setError(message);
  };

  const closeSessionView = () => {
    clearSessionToken();
    setResumeToken(null);
    setStudent(null);
    setSession(null);
    setMessages([]);
    setFinished(false);
    setRestoreError(null);
    setError(null);
  };

  const handleOperationError = (caught: unknown) => {
    if (
      caught instanceof ApiError &&
      (caught.status === 401 || caught.code === "SESSION_EXPIRED")
    ) {
      resetAuthenticatedSession(
        "Sesja wygasła lub wymaga ponownego uwierzytelnienia. Zaloguj się ponownie.",
      );
      return;
    }
    setError(errorMessage(caught));
  };

  const start = async (input: SessionRequest, identity: StudentIdentity) => {
    setBusy(true);
    setError(null);
    try {
      const created = await api.startSession(input);
      setStudent(identity);
      setMessages(created.history ?? []);
      setSession(created);
      setFinished(false);
      setRestoreError(null);
      storeSessionToken(created.sessionToken);
      setResumeToken(created.sessionToken);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  };

  const send = async (message: string): Promise<boolean> => {
    if (!session) return false;
    setBusy(true);
    setError(null);
    try {
      const answer = await api.refine(session.sessionToken, message);
      const now = new Date().toISOString();
      setMessages((current) => [
        ...current,
        { role: "STUDENT", content: message, createdAt: now },
        { role: "PRODUCT_OWNER", content: answer.message, createdAt: now },
      ]);
      setSession((current) => current ? { ...current, questionCount: answer.questionCount } : current);
      return true;
    } catch (caught) {
      handleOperationError(caught);
      return false;
    } finally {
      setBusy(false);
    }
  };

  const finish = async () => {
    if (!session) return;
    setBusy(true);
    setError(null);
    try {
      await api.finish(session.sessionToken);
      setFinished(true);
    } catch (caught) {
      handleOperationError(caught);
    } finally {
      setBusy(false);
    }
  };

  const download = async () => {
    if (!session) return;
    setBusy(true);
    setError(null);
    try {
      const transcript = await api.transcript(session.sessionToken);
      downloadMarkdown(transcript.fileName, transcript.markdown);
    } catch (caught) {
      handleOperationError(caught);
    } finally {
      setBusy(false);
    }
  };

  if (restoring) {
    return (
      <main className="entry-shell">
        <section className="entry-panel" aria-live="polite">
          <p className="eyebrow">ORDERFLOW</p>
          <h1>Przywracanie sesji</h1>
          <p>Trwa bezpieczne pobieranie historii rozmowy...</p>
        </section>
      </main>
    );
  }

  if (restoreError && resumeToken && !session) {
    return (
      <main className="entry-shell">
        <section className="entry-panel" aria-labelledby="restore-title">
          <p className="eyebrow">ORDERFLOW</p>
          <h1 id="restore-title">Nie udało się przywrócić sesji</h1>
          <div className="error-banner" role="alert">{restoreError}</div>
          <div className="finished-actions">
            <button className="primary-button compact" type="button" onClick={() => void restore(resumeToken)}>
              Spróbuj ponownie
            </button>
            <button
              className="text-button"
              type="button"
              onClick={() => {
                clearSessionToken();
                setResumeToken(null);
                setRestoreError(null);
              }}
            >
              Zaloguj się ponownie
            </button>
          </div>
        </section>
      </main>
    );
  }

  if (!session || !student) {
    return <LoginScreen error={error} loading={busy} onStart={start} />;
  }

  return (
    <RefinementScreen
      student={student}
      session={session}
      messages={messages}
      error={error}
      busy={busy}
      finished={finished}
      onSend={send}
      onFinish={finish}
      onDownload={download}
      onClose={closeSessionView}
    />
  );
}

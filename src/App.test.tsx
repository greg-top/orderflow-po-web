import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";

function response(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function completeLoginForm(accessCode = "valid-code") {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Imię"), "Jan");
  await user.type(screen.getByLabelText("Nazwisko"), "Kowalski");
  await user.type(screen.getByLabelText("Numer albumu"), "12345");
  await user.type(screen.getByLabelText("Kod dostępu"), accessCode);
  await user.click(screen.getByRole("checkbox"));
  return user;
}

const sessionBody = {
  sessionId: "REF-A-20260819-TEST",
  sessionToken: "session-token",
  variant: "A",
  maxQuestions: 60,
  questionCount: 0,
  history: [],
};

describe("OrderFlow refinement UI", () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubEnv("VITE_API_BASE_URL", "https://agent.example");
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("validates the required entry form and privacy acknowledgement", async () => {
    render(<App />);
    await userEvent.click(screen.getByRole("button", { name: "Rozpocznij refinement" }));
    expect(screen.getByText(/Podaj poprawne imię/)).toBeInTheDocument();
    expect(screen.getByText(/Podaj poprawne nazwisko/)).toBeInTheDocument();
    expect(screen.getByText(/Numer albumu powinien/)).toBeInTheDocument();
    expect(screen.getByText("Podaj kod dostępu.")).toBeInTheDocument();
    expect(screen.getByText(/Potwierdź zapoznanie/)).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("shows a controlled login error and clears the access code field", async () => {
    fetchMock.mockResolvedValueOnce(
      response({ error: { code: "INVALID_ACCESS_CODE", message: "Nieprawidłowy kod dostępu." } }, 401),
    );
    render(<App />);
    const user = await completeLoginForm("wrong-code");
    await user.click(screen.getByRole("button", { name: "Rozpocznij refinement" }));
    expect(await screen.findByText("Nieprawidłowy kod dostępu.")).toBeInTheDocument();
    expect(screen.getByLabelText("Kod dostępu")).toHaveValue("");
  });

  it("creates a session and renders the server-provided history", async () => {
    fetchMock.mockResolvedValueOnce(
      response({
        ...sessionBody,
        questionCount: 1,
        history: [
          { role: "STUDENT", content: "Poprzednie pytanie", createdAt: "2026-08-19T12:00:00Z" },
          { role: "PRODUCT_OWNER", content: "Poprzednia odpowiedź", createdAt: "2026-08-19T12:00:01Z" },
        ],
      }, 201),
    );
    render(<App />);
    const user = await completeLoginForm();
    await user.click(screen.getByRole("button", { name: "Rozpocznij refinement" }));
    expect(await screen.findByText("REF-A-20260819-TEST")).toBeInTheDocument();
    expect(screen.getByText("Jan Kowalski")).toBeInTheDocument();
    expect(screen.getByText("Poprzednie pytanie")).toBeInTheDocument();
    expect(screen.getByText("Poprzednia odpowiedź")).toBeInTheDocument();
  });

  it("sends a question and renders the Product Owner response", async () => {
    fetchMock
      .mockResolvedValueOnce(response(sessionBody, 201))
      .mockResolvedValueOnce(
        response({ message: "Odpowiedź testowa Product Ownera.", questionCount: 1, maxQuestions: 60 }),
      );
    render(<App />);
    const user = await completeLoginForm();
    await user.click(screen.getByRole("button", { name: "Rozpocznij refinement" }));
    await screen.findByText("REF-A-20260819-TEST");
    await user.type(screen.getByLabelText("Zadaj pytanie"), "Czy ten przypadek wymaga doprecyzowania?");
    await user.click(screen.getByRole("button", { name: "Wyślij" }));
    expect(await screen.findByText("Odpowiedź testowa Product Ownera.")).toBeInTheDocument();
    expect(screen.getByText("Czy ten przypadek wymaga doprecyzowania?")).toBeInTheDocument();
    expect(screen.getByText("1 / 60")).toBeInTheDocument();
    const refinementCall = fetchMock.mock.calls[1];
    expect(refinementCall?.[1]?.headers).toMatchObject({ Authorization: "Bearer session-token" });
  });

  it("shows a refinement service error without adding an unsaved question", async () => {
    fetchMock
      .mockResolvedValueOnce(response(sessionBody, 201))
      .mockResolvedValueOnce(
        response({ error: { code: "OPENAI_UNAVAILABLE", message: "Product Owner jest chwilowo niedostępny." } }, 503),
      );
    render(<App />);
    const user = await completeLoginForm();
    await user.click(screen.getByRole("button", { name: "Rozpocznij refinement" }));
    await screen.findByText("REF-A-20260819-TEST");
    await user.type(screen.getByLabelText("Zadaj pytanie"), "Pytanie bez odpowiedzi");
    await user.click(screen.getByRole("button", { name: "Wyślij" }));
    expect(await screen.findByText("Product Owner jest chwilowo niedostępny.")).toBeInTheDocument();
    expect(screen.queryByText("Pytanie bez odpowiedzi")).not.toBeInTheDocument();
  });

  it("finishes the session and downloads the server transcript", async () => {
    fetchMock
      .mockResolvedValueOnce(response(sessionBody, 201))
      .mockResolvedValueOnce(
        response({ sessionId: sessionBody.sessionId, transcriptHash: "abc123", status: "FINISHED" }),
      )
      .mockResolvedValueOnce(
        response({
          sessionId: sessionBody.sessionId,
          transcriptHash: "abc123",
          markdown: "OrderFlow - Refinement Report\nTranscript hash:\nabc123",
          fileName: "REF-A-20260819-TEST.md",
        }),
      );
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const createObjectUrl = vi.fn(() => "blob:test");
    const revokeObjectUrl = vi.fn();
    Object.defineProperty(URL, "createObjectURL", { configurable: true, value: createObjectUrl });
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: revokeObjectUrl });
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);

    render(<App />);
    const user = await completeLoginForm();
    await user.click(screen.getByRole("button", { name: "Rozpocznij refinement" }));
    await screen.findByText("REF-A-20260819-TEST");
    await user.click(screen.getByRole("button", { name: "Zakończ refinement" }));
    expect(await screen.findByText("Refinement został zakończony")).toBeInTheDocument();
    expect(screen.queryByLabelText("Zadaj pytanie")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Pobierz transkrypt" }));
    await waitFor(() => expect(createObjectUrl).toHaveBeenCalledOnce());
    expect(click).toHaveBeenCalledOnce();
    expect(revokeObjectUrl).toHaveBeenCalledWith("blob:test");
  });
});

# OrderFlow Product Owner Web

Publiczny klient React przeznaczony do studenckich sesji refinementu z Product Ownerem systemu OrderFlow. Aplikacja udostępnia formularz wejściowy, widok rozmowy, licznik pytań, zakończenie sesji oraz pobieranie transkryptu wygenerowanego przez serwer.

Repozytorium zawiera wyłącznie kod interfejsu, publiczne kontrakty API i testy frontendu. Nie zawiera wiedzy biznesowej, promptów agenta, prywatnych ewaluacji, źródłowych plików PDF ani sekretów.

## Uruchomienie lokalne

Wymagane są Node.js 24 oraz pnpm 11.19:

```text
pnpm install --frozen-lockfile
copy .env.example .env.local
pnpm dev
```

W zmiennej `VITE_API_BASE_URL` ustaw adres bazowy Workera. Kod dostępu jest przesyłany bezpośrednio do Workera i nigdy nie trafia do `localStorage`, `sessionStorage`, IndexedDB ani logów aplikacji.

Token aktywnej sesji jest zapisywany wyłącznie w `sessionStorage`, aby po odświeżeniu tej samej karty można było automatycznie pobrać aktualny stan i historię z endpointu `GET /api/session`. Token znika po zamknięciu karty lub po odrzuceniu go przez serwer. Frontend nie zapisuje lokalnie historii rozmowy.

## Kontrola jakości i budowanie

```text
pnpm check
pnpm test:coverage
```

Vite używa ścieżki bazowej repozytorium `/orderflow-po-web/`. Mapy źródłowe są wyłączone w buildzie produkcyjnym.

## GitHub Pages

Ustaw zmienną repozytorium `VITE_API_BASE_URL` na produkcyjny adres Workera, a następnie skonfiguruj Pages do publikacji przez GitHub Actions. Workflow instaluje zależności z pliku blokady, uruchamia lint i testy, buduje katalog `dist`, przesyła artefakt Pages i wykonuje wdrożenie.

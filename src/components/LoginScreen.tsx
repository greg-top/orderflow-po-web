import { useState, type FormEvent } from "react";
import type { SessionRequest, StudentIdentity } from "../types";

interface LoginScreenProps {
  error: string | null;
  loading: boolean;
  onStart: (input: SessionRequest, identity: StudentIdentity) => Promise<void>;
}

interface Errors {
  firstName?: string;
  lastName?: string;
  albumNumber?: string;
  accessCode?: string;
  consent?: string;
}

const NAME_PATTERN = /^[\p{L}][\p{L}\p{M}' -]*[\p{L}\p{M}]$/u;
const ALBUM_PATTERN = /^[A-Za-z0-9-]{3,20}$/;

function validateName(value: string): boolean {
  return value.length >= 2 && value.length <= 80 && NAME_PATTERN.test(value);
}

export function LoginScreen({ error, loading, onStart }: LoginScreenProps) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [albumNumber, setAlbumNumber] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<Errors>({});

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalized = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      albumNumber: albumNumber.trim().toUpperCase(),
      accessCode: accessCode.trim(),
    };
    const nextErrors: Errors = {};
    if (!validateName(normalized.firstName)) nextErrors.firstName = "Podaj poprawne imię (2-80 znaków).";
    if (!validateName(normalized.lastName)) nextErrors.lastName = "Podaj poprawne nazwisko (2-80 znaków).";
    if (!ALBUM_PATTERN.test(normalized.albumNumber)) {
      nextErrors.albumNumber = "Numer albumu powinien mieć 3-20 liter, cyfr lub myślników.";
    }
    if (!normalized.accessCode || normalized.accessCode.length > 256) {
      nextErrors.accessCode = "Podaj kod dostępu.";
    }
    if (!consent) nextErrors.consent = "Potwierdź zapoznanie się z informacją o zapisie sesji.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    try {
      await onStart(normalized, {
        firstName: normalized.firstName,
        lastName: normalized.lastName,
        albumNumber: normalized.albumNumber,
      });
    } finally {
      setAccessCode("");
    }
  };

  return (
    <main className="entry-shell">
      <section className="entry-panel" aria-labelledby="entry-title">
        <header className="brand-header">
          <div className="brand-mark" aria-hidden="true">OF</div>
          <div>
            <p className="eyebrow">ORDERFLOW</p>
            <h1 id="entry-title">Product Owner - Refinement</h1>
            <p className="variant-label">Wersja A - Anulowanie zamówienia</p>
          </div>
        </header>

        <div className="privacy-note">
          <span className="privacy-icon" aria-hidden="true">i</span>
          <div>
            <h2>Informacja o zapisie sesji</h2>
            <p>
              Imię, nazwisko, numer albumu, przebieg rozmowy i czas sesji zostaną zapisane w celu
              dokumentacji pracy etapowej oraz późniejszej oceny. Nie zbieramy innych danych osobowych.
            </p>
          </div>
        </div>

        <form className="entry-form" onSubmit={(event) => void handleSubmit(event)} noValidate>
          <div className="field-grid">
            <label className="field">
              <span>Imię</span>
              <input
                autoComplete="given-name"
                maxLength={80}
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                aria-invalid={Boolean(errors.firstName)}
              />
              {errors.firstName && <small role="alert">{errors.firstName}</small>}
            </label>
            <label className="field">
              <span>Nazwisko</span>
              <input
                autoComplete="family-name"
                maxLength={80}
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
                aria-invalid={Boolean(errors.lastName)}
              />
              {errors.lastName && <small role="alert">{errors.lastName}</small>}
            </label>
          </div>
          <label className="field">
            <span>Numer albumu</span>
            <input
              autoComplete="off"
              maxLength={20}
              value={albumNumber}
              onChange={(event) => setAlbumNumber(event.target.value)}
              aria-invalid={Boolean(errors.albumNumber)}
            />
            {errors.albumNumber && <small role="alert">{errors.albumNumber}</small>}
          </label>
          <label className="field">
            <span>Kod dostępu</span>
            <input
              type="password"
              autoComplete="off"
              maxLength={256}
              value={accessCode}
              onChange={(event) => setAccessCode(event.target.value)}
              aria-invalid={Boolean(errors.accessCode)}
            />
            {errors.accessCode && <small role="alert">{errors.accessCode}</small>}
          </label>
          <label className="consent-row">
            <input
              type="checkbox"
              checked={consent}
              onChange={(event) => setConsent(event.target.checked)}
            />
            <span>Zapoznałem(-am) się z informacją o zapisie i celu przetwarzania danych sesji.</span>
          </label>
          {errors.consent && <small className="form-error" role="alert">{errors.consent}</small>}
          {error && <div className="error-banner" role="alert">{error}</div>}
          <button className="primary-button" type="submit" disabled={loading}>
            {loading ? "Rozpoczynanie..." : "Rozpocznij refinement"}
          </button>
        </form>
        <p className="entry-footer">
          Bezpieczna sesja · Limit 60 pytań · Wersja A<br />
          Aktywna sesja zostanie automatycznie przywrócona po odświeżeniu tej karty.
        </p>
      </section>
    </main>
  );
}

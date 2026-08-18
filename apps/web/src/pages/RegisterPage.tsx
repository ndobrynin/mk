import { useState, type FormEvent, type ReactElement } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ru } from "../i18n/ru";
import { register } from "../lib/api";
import { saveTokens } from "../lib/auth-storage";

export function RegisterPage(): ReactElement {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const user = await register(email, password);
      saveTokens(user);
      navigate("/rooms");
    } catch {
      setError(ru.auth.genericError);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main>
      <h1>{ru.auth.registerTitle}</h1>
      <form onSubmit={handleSubmit}>
        <label htmlFor="register-email">{ru.auth.emailLabel}</label>
        <input
          id="register-email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
        <label htmlFor="register-password">{ru.auth.passwordLabel}</label>
        <input
          id="register-password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
        <button type="submit" disabled={isSubmitting}>
          {ru.auth.registerSubmit}
        </button>
      </form>
      {error ? <p role="alert">{error}</p> : null}
      <Link to="/login">{ru.auth.goToLogin}</Link>
    </main>
  );
}

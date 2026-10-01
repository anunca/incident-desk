import type { FormEvent } from "react";
import type { Credentials } from "../api.js";

interface LoginFormProps {
  busy: boolean;
  onLogin: (credentials: Credentials) => Promise<boolean>;
}
export function LoginForm({ busy, onLogin }: LoginFormProps) {
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const succeeded = await onLogin({
      email: String(data.get("email")),
      password: String(data.get("password")),
    });
    if (succeeded) form.reset();
  }
  return (
    <form id="login" onSubmit={handleSubmit}>
      <h2>Connexion</h2>
      <label>
        E-mail
        <input name="email" type="email" autoComplete="username" required />
      </label>
      <label>
        Mot de passe
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </label>
      <button disabled={busy}>Se connecter</button>
    </form>
  );
}

import { useState } from "react";
import { isSupabaseConfigured, supabase } from "../services/supabase";

export function AuthScreen({ onDemo }: { onDemo: () => void }) {
  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function submitAuth(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    if (!supabase) {
      setMessage(
        "Add your Supabase URL and anon key to .env.local, then restart the dev server.",
      );
      return;
    }

    setLoading(true);
    const response =
      mode === "signup"
        ? await supabase.auth.signUp({
            email,
            password,
            options: {
              data: {
                display_name: displayName,
                username,
              },
            },
          })
        : await supabase.auth.signInWithPassword({ email, password });

    setLoading(false);

    if (response.error) {
      setMessage(response.error.message);
      return;
    }

    setMessage(
      mode === "signup"
        ? "Account created. Check your email if confirmation is enabled."
        : "Signed in.",
    );
  }

  if (!isSupabaseConfigured) {
    return (
      <AuthShell>
        <section className="auth-card">
          <p className="eyebrow">Auth setup</p>
          <h1>Connect Supabase to enable signup and login.</h1>
          <p>
            Create a `.env.local` file from `.env.example`, paste your project
            URL and anon key, then restart `npm run dev`.
          </p>
          <div className="auth-code">
            VITE_SUPABASE_URL=https://your-project.supabase.co
            <br />
            VITE_SUPABASE_ANON_KEY=your-anon-key
          </div>
          <button type="button" onClick={onDemo}>
            Continue in demo mode
          </button>
        </section>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <section className="auth-card">
        <p className="eyebrow">Welcome to CubeVa</p>
        <h1>
          {mode === "signup"
            ? "Create your cubing profile."
            : "Sign in to your cubing log."}
        </h1>
        <form className="auth-form" onSubmit={submitAuth}>
          {mode === "signup" && (
            <>
              <label>
                Display name
                <input
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  placeholder="Maya Chen"
                  required
                />
              </label>
              <label>
                Username
                <input
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  placeholder="mayacuber"
                  required
                />
              </label>
            </>
          )}
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              minLength={6}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="At least 6 characters"
              required
            />
          </label>
          <button type="submit" disabled={loading}>
            {loading
              ? "Working..."
              : mode === "signup"
                ? "Create Account"
                : "Sign In"}
          </button>
        </form>
        {message && <p className="auth-message">{message}</p>}
        <button
          className="link-button"
          type="button"
          onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
        >
          {mode === "signup"
            ? "Already have an account? Sign in"
            : "Need an account? Sign up"}
        </button>
        <button className="link-button" type="button" onClick={onDemo}>
          Continue in demo mode
        </button>
      </section>
    </AuthShell>
  );
}

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="auth-shell">
      <div className="brand auth-brand">
        <div className="brand-mark">CV</div>
        <div>
          <h1>CubeVa</h1>
          <p>Training feed for speedcubers</p>
        </div>
      </div>
      {children}
    </main>
  );
}

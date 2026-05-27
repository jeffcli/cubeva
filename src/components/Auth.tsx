import { useState } from "react";
import { isSupabaseConfigured, supabase } from "../services/supabase";

export function AuthScreen() {
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
        <section className="grid w-[min(100%,480px)] max-w-[480px] gap-4 rounded-lg border border-line bg-card p-6 shadow-[0_22px_60px_rgba(29,35,32,0.12)] [&>h1]:m-0 [&>p]:m-0">
          <p className="m-0 text-[0.72rem] font-black uppercase text-soft-muted">
            Auth setup
          </p>
          <h1 className="text-[clamp(2rem,5vw,3.4rem)] leading-none">
            Connect Supabase to enable signup and login.
          </h1>
          <p>
            Create a `.env.local` file from `.env.example`, paste your project
            URL and anon key, then restart `npm run dev`.
          </p>
          <div className="rounded-lg bg-ink p-3.5 text-center font-mono text-[0.86rem] leading-[1.7] text-[#f8f2e7] [overflow-wrap:anywhere]">
            VITE_SUPABASE_URL=https://your-project.supabase.co
            <br />
            VITE_SUPABASE_ANON_KEY=your-anon-key
          </div>
        </section>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <section className="grid w-[min(100%,480px)] max-w-[480px] gap-4 rounded-lg border border-line bg-card p-6 shadow-[0_22px_60px_rgba(29,35,32,0.12)] [&>h1]:m-0 [&>p]:m-0">
        <p className="text-[0.72rem] font-black uppercase text-soft-muted">
          Welcome to CubeVa
        </p>
        <h1 className="text-[clamp(2rem,5vw,3.4rem)] leading-none">
          {mode === "signup"
            ? "Create your cubing profile."
            : "Sign in to your cubing log."}
        </h1>
        <form
          className="grid gap-3 [&_label]:grid [&_label]:gap-1.5 [&_label]:text-[0.82rem] [&_label]:font-extrabold [&_label]:text-muted"
          onSubmit={submitAuth}
        >
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
          <button
            className="min-h-[46px] bg-ink px-4 text-white"
            type="submit"
            disabled={loading}
          >
            {loading
              ? "Working..."
              : mode === "signup"
                ? "Create Account"
                : "Sign In"}
          </button>
        </form>
        {message && (
          <p className="m-0 rounded-lg bg-panel p-3 font-bold text-ink">
            {message}
          </p>
        )}
        <button
          className="min-h-0 justify-self-start bg-transparent p-0 text-teal"
          type="button"
          onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
        >
          {mode === "signup"
            ? "Already have an account? Sign in"
            : "Need an account? Sign up"}
        </button>
      </section>
    </AuthShell>
  );
}

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="grid min-h-screen items-center justify-items-center gap-6 p-[22px]">
      <div className="fixed left-[22px] top-[22px] flex items-center gap-3">
        <div className="flex h-[42px] w-[42px] flex-none items-center justify-center rounded-lg bg-accent font-black text-[#101615] shadow-[inset_-10px_-10px_0_#f5a623,inset_10px_10px_0_#2f81ed]">
          CV
        </div>
        <div>
          <h1 className="m-0 text-[1.35rem]">CubeVa</h1>
          <p className="m-0 text-soft-muted">Training feed for speedcubers</p>
        </div>
      </div>
      {children}
    </main>
  );
}

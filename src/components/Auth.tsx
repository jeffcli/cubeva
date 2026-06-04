import { useState } from "react";
import { isSupabaseConfigured, supabase } from "../services/supabase";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

export function AuthScreen() {
  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [useTestEmailAlias, setUseTestEmailAlias] = useState(true);
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
    const authEmail =
      mode === "signup" && useTestEmailAlias
        ? makeTestEmailAlias(email, username)
        : email.trim();
    const response =
      mode === "signup"
        ? await supabase.auth.signUp({
            email: authEmail,
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
      setMessage(authErrorMessage(response.error.message));
      return;
    }

    if (mode === "signup" && !response.data.session) {
      setMessage(
        "Account created, but Supabase email confirmation is still enabled. Disable Confirm email in Supabase Auth settings for instant test signups.",
      );
      return;
    }

    setMessage(
      mode === "signup"
        ? useTestEmailAlias
          ? `Account created and signed in with ${authEmail}.`
          : "Account created and signed in."
        : "Signed in.",
    );
  }

  if (!isSupabaseConfigured) {
    return (
      <AuthShell>
        <section className="grid w-[min(100%,480px)] max-w-[480px] gap-4 rounded-lg border border-line bg-card p-6 shadow-md [&>h1]:m-0 [&>p]:m-0">
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
      <section className="grid w-[min(100%,480px)] max-w-[480px] gap-4 rounded-lg border border-line bg-card p-6 shadow-md [&>h1]:m-0 [&>p]:m-0">
        <p className="text-[0.72rem] font-black uppercase text-soft-muted">
          Welcome to CubeVa
        </p>
        <h1 className="text-[clamp(2rem,5vw,3.4rem)] leading-none">
          {mode === "signup"
            ? "Create your cubing profile."
            : "Sign in to your cubing log."}
        </h1>
        <form
          className="grid gap-3 [&_label]:grid [&_label]:gap-1.5 [&_label]:text-[0.82rem] [&_label]:font-medium [&_label]:text-muted"
          onSubmit={submitAuth}
        >
          {mode === "signup" && (
            <>
              <label>
                Display name
                <Input
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  placeholder="Maya Chen"
                  required
                />
              </label>
              <label>
                Username
                <Input
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
            <Input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              required
            />
          </label>
          {mode === "signup" && (
            <label className="flex flex-row items-start gap-2 rounded-md border border-line bg-panel p-3 text-sm">
              <input
                className="mt-0.5 min-h-0 w-auto"
                type="checkbox"
                checked={useTestEmailAlias}
                onChange={(event) => setUseTestEmailAlias(event.target.checked)}
              />
              <span>
                Use testing email alias
                <small className="mt-1 block font-normal text-muted">
                  Creates accounts like {previewTestEmailAlias(email, username)}
                  .
                </small>
              </span>
            </label>
          )}
          <label>
            Password
            <Input
              type="password"
              minLength={6}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="At least 6 characters"
              required
            />
          </label>
          <Button
            className="min-h-[46px]"
            type="submit"
            disabled={loading}
          >
            {loading
              ? "Working..."
              : mode === "signup"
                ? "Create Account"
                : "Sign In"}
          </Button>
        </form>
        {message && (
          <p className="m-0 rounded-lg bg-panel p-3 font-bold text-ink">
            {message}
          </p>
        )}
        <Button
          className="justify-self-start"
          variant="link"
          type="button"
          onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
        >
          {mode === "signup"
            ? "Already have an account? Sign in"
            : "Need an account? Sign up"}
        </Button>
      </section>
    </AuthShell>
  );
}

function makeTestEmailAlias(email: string, username: string) {
  const trimmedEmail = email.trim();
  const atIndex = trimmedEmail.lastIndexOf("@");
  if (atIndex <= 0) return trimmedEmail;

  const local = trimmedEmail.slice(0, atIndex);
  const domain = trimmedEmail.slice(atIndex + 1);
  const suffix =
    username
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || crypto.randomUUID().slice(0, 8);

  return `${local}+cubeva-${suffix}@${domain}`;
}

function previewTestEmailAlias(email: string, username: string) {
  if (!email.trim() || !email.includes("@")) {
    return "you+cubeva-mayacuber@example.com";
  }

  return makeTestEmailAlias(email, username || "test");
}

function authErrorMessage(message: string) {
  const normalized = message.toLowerCase();

  if (
    normalized.includes("rate limit") ||
    normalized.includes("confirmation email") ||
    normalized.includes("magiclink")
  ) {
    return "Supabase is still trying to send confirmation emails and hit the email rate limit. Disable Confirm email in Supabase Auth settings, or use supabase/create-confirmed-test-users.sql and sign in with those seeded users.";
  }

  return message;
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

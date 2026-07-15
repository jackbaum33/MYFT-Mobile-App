import { loginAction } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-navy px-4">
      <form
        action={loginAction}
        className="w-full max-w-sm rounded-xl border border-line bg-card p-6"
      >
        <h1 className="mb-4 text-xl font-black text-yellow">MYFT Admin</h1>
        {error && (
          <p className="mb-3 rounded-lg bg-red-500/20 px-3 py-2 text-sm font-semibold text-red-300">
            Incorrect password.
          </p>
        )}
        <label className="mb-1 block text-sm font-semibold text-text/90">Password</label>
        <input
          type="password"
          name="password"
          autoFocus
          required
          className="mb-4 w-full rounded-lg border border-line bg-navy px-3 py-2 text-text outline-none focus:border-yellow"
        />
        <button className="w-full rounded-lg bg-yellow py-2 font-black text-navy transition hover:opacity-90">
          Log in
        </button>
      </form>
    </div>
  );
}

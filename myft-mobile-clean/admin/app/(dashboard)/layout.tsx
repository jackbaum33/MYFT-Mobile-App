import Link from "next/link";
import { logoutAction } from "./actions";

// Every page here reads live Firestore state via the Admin SDK — never
// statically prerender (also avoids needing Firebase creds at build time).
export const dynamic = "force-dynamic";

const NAV = [
  { href: "/", label: "Home" },
  { href: "/games", label: "Games" },
  { href: "/teams", label: "Teams" },
  { href: "/players", label: "Players" },
  { href: "/config", label: "Config" },
  { href: "/brackets", label: "Brackets" },
  { href: "/schedule", label: "Schedule" },
  { href: "/leagues", label: "Leagues" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-navy">
      <header className="border-b border-line px-6 py-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-6">
            <span className="text-lg font-black text-yellow">MYFT Admin</span>
            <nav className="flex flex-wrap gap-4 text-sm font-semibold text-text/80">
              {NAV.map((item) => (
                <Link key={item.href} href={item.href} className="transition hover:text-yellow">
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <form action={logoutAction}>
            <button className="text-sm font-semibold text-text/60 transition hover:text-yellow">
              Log out
            </button>
          </form>
        </div>
      </header>
      <main className="flex-1 px-6 py-6">{children}</main>
    </div>
  );
}

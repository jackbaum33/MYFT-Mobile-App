import Link from "next/link";
import { db } from "@/lib/firebaseAdmin";
import type { GameDoc, LeagueDoc } from "@/lib/types";
import { card, pageTitle, sectionTitle } from "@/lib/ui";

const LINKS = [
  { href: "/games", label: "Games", desc: "Scores, status, stats, bracket fields" },
  { href: "/teams", label: "Teams", desc: "Records, rosters, point differential" },
  { href: "/players", label: "Players", desc: "Quick-create with photo upload" },
  { href: "/config", label: "Config", desc: "Playoff bracket settings" },
  { href: "/brackets", label: "Brackets", desc: "View + manually correct" },
  { href: "/schedule", label: "Schedule", desc: "Event reminders" },
  { href: "/leagues", label: "Leagues", desc: "Fantasy draft viewer (read-only)" },
];

export default async function HomePage() {
  const [gamesSnap, leaguesSnap] = await Promise.all([
    db.collection("games").get(),
    db.collection("leagues").get(),
  ]);

  const games = gamesSnap.docs.map((d) => d.data() as GameDoc);
  const leagues = leaguesSnap.docs.map((d) => d.data() as LeagueDoc);

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date(startOfToday);
  endOfToday.setDate(endOfToday.getDate() + 1);

  const gamesToday = games.filter((g) => {
    const t = g.startTime?.toDate();
    return t && t >= startOfToday && t < endOfToday;
  }).length;
  const liveNow = games.filter((g) => (g.status ?? "").toLowerCase() === "live").length;
  const draftsInProgress = leagues.filter((l) => l.status === "drafting").length;

  return (
    <div>
      <h1 className={pageTitle}>Dashboard</h1>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className={card}>
          <p className="text-3xl font-black text-yellow">{gamesToday}</p>
          <p className="text-sm text-text/70">Games today</p>
        </div>
        <div className={card}>
          <p className="text-3xl font-black text-green-400">{liveNow}</p>
          <p className="text-sm text-text/70">Live now</p>
        </div>
        <div className={card}>
          <p className="text-3xl font-black text-yellow">{draftsInProgress}</p>
          <p className="text-sm text-text/70">Drafts in progress</p>
        </div>
      </div>

      <h2 className={sectionTitle}>Go to</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href} className={`${card} block transition hover:border-yellow`}>
            <p className="font-bold text-text">{l.label}</p>
            <p className="text-xs text-text/60">{l.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

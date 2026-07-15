// Small shared Tailwind class bundles so every page reads consistently
// without a component library.

export const card = "rounded-xl border border-line bg-card p-4";
export const input =
  "w-full rounded-lg border border-line bg-navy px-3 py-2 text-text outline-none focus:border-yellow";
export const select = input;
export const label = "mb-1 block text-sm font-semibold text-text/90";
export const btnPrimary =
  "inline-block rounded-lg bg-yellow px-4 py-2 font-black text-navy transition hover:opacity-90 disabled:opacity-50";
export const btnSecondary =
  "inline-block rounded-lg border border-line px-4 py-2 font-semibold text-text transition hover:border-yellow hover:text-yellow";
export const btnDanger =
  "inline-block rounded-lg bg-red-500/20 px-4 py-2 font-semibold text-red-300 transition hover:bg-red-500/30";
export const btnSmall = "px-2 py-1 text-xs";
export const tableWrap = "overflow-x-auto rounded-xl border border-line";
export const table = "w-full border-collapse";
export const th = "border-b border-line px-3 py-2 text-left text-xs font-bold uppercase tracking-wide text-text/60";
export const td = "border-b border-line px-3 py-2 text-sm text-text align-middle";
export const pageTitle = "mb-4 text-2xl font-black text-yellow";
export const sectionTitle = "mb-2 text-sm font-bold uppercase tracking-wide text-yellow";
export const badge = "inline-block rounded-full px-2 py-0.5 text-xs font-bold";

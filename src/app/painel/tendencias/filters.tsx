import { formats, niches, periods, regions, sorts, type TrendFilters } from "@/lib/youtube/niches";

const selectClass =
  "mt-1 w-full rounded-lg border border-line bg-night/60 px-3 py-2 text-sm text-ink outline-none focus:border-pink";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-xs text-muted">
      {label}
      {children}
    </label>
  );
}

/** Formulário GET: os filtros ficam na URL, sem JavaScript no cliente. */
export function TrendFiltersForm({ filters }: { filters: TrendFilters }) {
  return (
    <form className="glass mb-6 grid grid-cols-2 gap-3 rounded-2xl p-4 md:grid-cols-6 md:items-end">
      <Field label="Nicho">
        <select name="nicho" defaultValue={filters.niche.id} className={selectClass}>
          {niches.map((n) => (
            <option key={n.id} value={n.id}>
              {n.label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="País">
        <select name="regiao" defaultValue={filters.region} className={selectClass}>
          {regions.map((r) => (
            <option key={r.code} value={r.code}>
              {r.label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Formato">
        <select name="formato" defaultValue={filters.format} className={selectClass}>
          {formats.map((f) => (
            <option key={f.id} value={f.id}>
              {f.label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Período">
        <select name="periodo" defaultValue={filters.period} className={selectClass}>
          {periods.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Ordenar por">
        <select name="ordem" defaultValue={filters.sort} className={selectClass}>
          {sorts.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </Field>
      <button type="submit" className="btn-sunset col-span-2 rounded-lg py-2.5 text-sm font-semibold text-white md:col-span-1">
        Buscar virais
      </button>
    </form>
  );
}

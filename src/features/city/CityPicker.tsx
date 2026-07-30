import { useMemo, useState } from "react";
import { CITIES, cityName, slugifyCity } from "../../lib/cities";
import { IconCheck, IconCity, IconLocation, IconSearch } from "../../components/icons";
import { Sheet } from "../../components/ui";
import { useTimes } from "../prayer-times/TimesContext";
import { useLocateCity } from "./useLocateCity";

/**
 * Şehir seçim ekranı. `fullscreen` modunda (ilk kurulum) kapatılamaz,
 * modal modunda alt sayfa olarak açılır.
 */
export function CityPicker({ fullscreen = false }: { fullscreen?: boolean }) {
  const { citySlug, recentCities, selectCity, closePicker } = useTimes();
  const { locate, locating } = useLocateCity();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = slugifyCity(query);
    if (!q) return CITIES;
    return CITIES.filter((c) => c.slug.includes(q));
  }, [query]);

  const body = (
    <>
      <div className="search-box">
        <IconSearch size={18} />
        <input
          type="text"
          placeholder="Şehir ara…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus={!fullscreen}
          aria-label="Şehir ara"
        />
      </div>
      {!query && (
        <button
          className="btn btn-subtle btn-block btn-sm"
          style={{ marginBottom: "var(--sp-3)" }}
          onClick={locate}
          disabled={locating}
        >
          <IconLocation size={18} />
          {locating ? "Konum alınıyor…" : "Konumumu kullan"}
        </button>
      )}
      {recentCities.length > 0 && !query && (
        <div className="chip-row">
          {recentCities.map((slug) => (
            <button key={slug} className="chip" onClick={() => selectCity(slug)}>
              {cityName(slug)}
            </button>
          ))}
        </div>
      )}
      <div className="city-list">
        {filtered.map((c) => (
          <button
            key={c.slug}
            className={`city-item${c.slug === citySlug ? " selected" : ""}`}
            onClick={() => selectCity(c.slug)}
          >
            <IconCity size={18} />
            <span style={{ flex: 1 }}>{c.name}</span>
            {c.slug === citySlug && <IconCheck size={18} />}
          </button>
        ))}
        {filtered.length === 0 && (
          <div className="caption" style={{ padding: "var(--sp-4)" }}>
            "{query}" ile eşleşen şehir bulunamadı.
          </div>
        )}
      </div>
    </>
  );

  if (fullscreen) {
    return (
      <div className="app">
        <div className="page">
          <div className="page-title">Şehrini seç</div>
          <p style={{ color: "var(--text-muted)", fontSize: "var(--fs-sm)" }}>
            Namaz vakitleri seçtiğin şehre göre gösterilir. Şehrini daha sonra
            istediğin zaman değiştirebilirsin.
          </p>
          <div className="card" style={{ display: "flex", flexDirection: "column", maxHeight: "70dvh" }}>
            {body}
          </div>
        </div>
      </div>
    );
  }

  return (
    <Sheet title="Şehir seç" onClose={closePicker}>
      {body}
    </Sheet>
  );
}

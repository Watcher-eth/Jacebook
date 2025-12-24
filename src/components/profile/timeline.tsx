// src/components/profile/timeline.tsx
const defaultYears = ["Recent", "2015", "2014", "2013", "2012", "2011", "2010", "2009", "2008", "2007", "2006", "Born"];

export function TimelineSection({ years = defaultYears }: { years?: string[] }) {
  return (
    <div className="relative">
      <div className="absolute left-0 top-0 bottom-0  bg-border" />
      <div className="pl-4 space-y-1">
        {years.map((year, index) => (
          <button
            key={year}
            className={`w-full text-left px-2 py-1.5 rounded text-sm hover:bg-accent/50 transition-colors ${
              index === 0 ? "font-semibold text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {year}
          </button>
        ))}
      </div>
    </div>
  );
}
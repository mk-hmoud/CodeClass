import * as React from "react";

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = React.useState(() =>
    typeof window !== "undefined" ? window.matchMedia(query).matches : false
  );

  React.useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    onChange();
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [query]);

  return matches;
}

// Matches Tailwind's `lg` breakpoint (1024px) -- the same cutoff already used
// throughout the app's own `lg:` classes. Below this, tablets and phones get a
// stacked layout instead of a fixed multi-column horizontal split.
export const useIsCompactLayout = () => useMediaQuery("(max-width: 1023px)");

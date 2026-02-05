/**
 * Single source of truth for all app URL paths.
 * Use these constants for <Route path>, <Link href>, setLocation(), and redirects.
 */
export const ROUTES = {
  home: "/",
  login: "/login",
  browse: "/browse",
  /** Path pattern for Route: /browse/title/:titleNumber */
  browseTitlePattern: "/browse/title/:titleNumber",
  /** Path pattern for Route: /browse/title/:titleNumber/part/:partNumber */
  browsePartPattern: "/browse/title/:titleNumber/part/:partNumber",
  /** Assured link to a CFR title (shareable, bookmarkable). */
  browseTitle: (titleNumber: number, year?: number) =>
    `/browse/title/${titleNumber}${year != null ? `?year=${year}` : ""}`,
  /** Assured link to a CFR title part (shareable, bookmarkable). */
  browsePart: (titleNumber: number, partNumber: number, year?: number) =>
    `/browse/title/${titleNumber}/part/${partNumber}${year != null ? `?year=${year}` : ""}`,
  search: "/search",
  askCFR: "/ask",
  ragAdmin: "/admin/rag",
  docs: "/docs",
  dashboard: "/dashboard",
  masterclass: "/masterclass",
  notFound: "/404",
  /** Hash anchors on home (e.g. /#features, /#pricing) */
  homeHash: (hash: string) => `${ROUTES.home}#${hash}`,
  /** Docs with hash (e.g. /docs#section-123) */
  docsHash: (hash: string) => `${ROUTES.docs}#${hash}`,
} as const;

export type RoutePath = (typeof ROUTES)[keyof Omit<typeof ROUTES, "homeHash" | "docsHash">];

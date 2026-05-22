export type MobileLabRoute = "overview" | "navbar" | "modals" | "drawer" | "banque-heures";

const ROUTES: Record<string, MobileLabRoute> = {
  "": "overview",
  navbar: "navbar",
  modals: "modals",
  drawer: "drawer",
  "banque-heures": "banque-heures",
};

export function shouldRenderMobileLab(pathname: string, isDev: boolean): boolean {
  return isDev && (pathname === "/mobile-lab" || pathname.startsWith("/mobile-lab/"));
}

export function getMobileLabRoute(pathname: string): MobileLabRoute {
  const routeKey = pathname.replace(/^\/mobile-lab\/?/, "").split("/")[0] ?? "";
  return ROUTES[routeKey] ?? "overview";
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { LogoutButton } from "@/components/layout/logout-button";
import { isGuardianRole } from "@/modules/auth/roles";
import type { AuthSession } from "@/modules/auth/types";

export type AppShellIconName =
  | "dashboard"
  | "students"
  | "overview"
  | "upload"
  | "workbook"
  | "chart"
  | "notes"
  | "templates"
  | "assignment"
  | "onboarding"
  | "create"
  | "status";

export type AppShellNavItem = {
  href: string;
  label: string;
  icon?: AppShellIconName;
  exact?: boolean;
};

type AppShellSlotConfig = {
  contextNav?: AppShellNavItem[];
  sidebarSummary?: ReactNode;
  headerActions?: ReactNode;
  headerTitle?: string;
  headerSubtitle?: string;
};

type AppShellProps = {
  title: string;
  subtitle: string;
  session: AuthSession;
  children: ReactNode;
  primaryNav?: AppShellNavItem[];
  contextNav?: AppShellNavItem[];
  sidebarSummary?: ReactNode;
  headerActions?: ReactNode;
  headerTitle?: string;
  headerSubtitle?: string;
};

type AppShellContextValue = {
  setConfig: (config: AppShellSlotConfig) => void;
  clearConfig: () => void;
};

const AppShellContext = createContext<AppShellContextValue | null>(null);

function classNames(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function BrandMark() {
  return (
    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-400 via-amber-400 to-emerald-300 shadow-[0_10px_24px_rgba(249,115,22,0.28)]">
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6 text-slate-950">
        <path
          d="M12 3.2 18.5 5.9v5.8c0 4.1-2.5 7.6-6.5 9.1-4-1.5-6.5-5-6.5-9.1V5.9L12 3.2Z"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
      </svg>
    </div>
  );
}

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
      <path d="M4 7h16M4 12h16M4 17h16" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
      <path d="M6 6 18 18M18 6 6 18" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
    </svg>
  );
}

function NavIcon({ icon }: { icon?: AppShellIconName }) {
  switch (icon) {
    case "students":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4">
          <path
            d="M8.5 11.5a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7 2a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM4.5 18.5c0-2.4 2.2-4 5-4s5 1.6 5 4M13.5 18.5c.3-1.6 1.8-2.7 3.8-2.7 1.1 0 2.1.3 2.7.9"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.6"
          />
        </svg>
      );
    case "overview":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4">
          <path
            d="M4.5 5.5h6v6h-6Zm9 0h6v4h-6Zm0 7h6v6h-6Zm-9 8h6v-4h-6Z"
            fill="none"
            stroke="currentColor"
            strokeLinejoin="round"
            strokeWidth="1.6"
          />
        </svg>
      );
    case "upload":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4">
          <path
            d="M12 16V6m0 0-3.5 3.5M12 6l3.5 3.5M5 17.5v1a1.5 1.5 0 0 0 1.5 1.5h11a1.5 1.5 0 0 0 1.5-1.5v-1"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.6"
          />
        </svg>
      );
    case "workbook":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4">
          <path
            d="M6 4.5h9.5A2.5 2.5 0 0 1 18 7v12.5H8.5A2.5 2.5 0 0 0 6 22V4.5Zm0 0A2.5 2.5 0 0 0 3.5 7v11a2.5 2.5 0 0 1 2.5-2.5H18"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.6"
          />
        </svg>
      );
    case "chart":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4">
          <path
            d="M5 18.5V11m7 7.5V7m7 11.5v-5"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth="1.8"
          />
        </svg>
      );
    case "notes":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4">
          <path
            d="M7 4.5h10A2.5 2.5 0 0 1 19.5 7v10a2.5 2.5 0 0 1-2.5 2.5H7A2.5 2.5 0 0 1 4.5 17V7A2.5 2.5 0 0 1 7 4.5Zm2.5 4h5m-5 4h5m-5 4h3"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.6"
          />
        </svg>
      );
    case "templates":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4">
          <path
            d="M5.5 6.5h13m-13 5h13m-13 5h8"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth="1.8"
          />
          <path d="M4.5 4.5h15v15h-15z" fill="none" stroke="currentColor" strokeWidth="1.4" />
        </svg>
      );
    case "assignment":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4">
          <path
            d="M7.5 7h9m-9 5h9m-9 5h5M5.5 4.5h13A1.5 1.5 0 0 1 20 6v12a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18V6a1.5 1.5 0 0 1 1.5-1.5Z"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.6"
          />
        </svg>
      );
    case "onboarding":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4">
          <path
            d="M12 4.5v15m-7.5-7.5h15"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth="1.8"
          />
        </svg>
      );
    case "create":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4">
          <path
            d="M12 7v10m-5-5h10M6.5 4.5h11A2 2 0 0 1 19.5 6.5v11A2 2 0 0 1 17.5 19.5h-11A2 2 0 0 1 4.5 17.5v-11A2 2 0 0 1 6.5 4.5Z"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.6"
          />
        </svg>
      );
    case "status":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4">
          <path
            d="M6 12.5 10 16l8-8"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
          />
          <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="1.4" />
        </svg>
      );
    case "dashboard":
    default:
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4">
          <path
            d="M5 13.5h3.5V19H5v-5.5Zm5.25-8h3.5V19h-3.5V5.5Zm5.25 4h3.5V19h-3.5V9.5Z"
            fill="none"
            stroke="currentColor"
            strokeLinejoin="round"
            strokeWidth="1.6"
          />
        </svg>
      );
  }
}

function isSectionHref(href: string) {
  return href.startsWith("#");
}

function defaultPrimaryNav(session: AuthSession): AppShellNavItem[] {
  return isGuardianRole(session.role)
    ? [
        { href: "/dashboard", label: "대시보드", icon: "dashboard", exact: true },
        { href: "/students/manage", label: "학생 관리", icon: "students", exact: true },
      ]
    : [{ href: "/student/dashboard", label: "대시보드", icon: "dashboard", exact: true }];
}

function useActiveSection(contextNav: AppShellNavItem[]) {
  const defaultSection = useMemo(() => {
    const sectionItems = contextNav.filter((item) => isSectionHref(item.href));
    const initialHash = typeof window !== "undefined" ? window.location.hash : "";

    return sectionItems.some((item) => item.href === initialHash) ? initialHash : sectionItems[0]?.href ?? "";
  }, [contextNav]);
  const [observedSection, setObservedSection] = useState("");
  const activeSection = contextNav.some((item) => item.href === observedSection) ? observedSection : defaultSection;

  useEffect(() => {
    const sectionItems = contextNav.filter((item) => isSectionHref(item.href));
    if (!sectionItems.length) {
      return;
    }

    const targets = sectionItems
      .map((item) => document.getElementById(item.href.slice(1)))
      .filter((element): element is HTMLElement => Boolean(element));

    if (!targets.length) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntries = entries
          .filter((entry) => entry.isIntersecting)
          .sort((left, right) => {
            if (left.intersectionRatio !== right.intersectionRatio) {
              return right.intersectionRatio - left.intersectionRatio;
            }

            return left.boundingClientRect.top - right.boundingClientRect.top;
          });

        if (!visibleEntries.length) {
          return;
        }

        setObservedSection(`#${visibleEntries[0].target.id}`);
      },
      {
        rootMargin: "-18% 0px -60% 0px",
        threshold: [0.15, 0.35, 0.6],
      },
    );

    for (const target of targets) {
      observer.observe(target);
    }

    const handleHashChange = () => {
      const nextHash = window.location.hash;
      if (sectionItems.some((item) => item.href === nextHash)) {
        setObservedSection(nextHash);
      }
    };

    window.addEventListener("hashchange", handleHashChange);

    return () => {
      observer.disconnect();
      window.removeEventListener("hashchange", handleHashChange);
    };
  }, [contextNav]);

  return [activeSection, setObservedSection] as const;
}

export function useAppShellConfig(config: AppShellSlotConfig) {
  const context = useContext(AppShellContext);

  useEffect(() => {
    if (!context) {
      return;
    }

    context.setConfig(config);

    return () => {
      context.clearConfig();
    };
  }, [config, context]);
}

export function AppShell({
  title,
  subtitle,
  session,
  children,
  primaryNav,
  contextNav,
  sidebarSummary,
  headerActions,
  headerTitle,
  headerSubtitle,
}: AppShellProps) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [shellConfig, setShellConfig] = useState<AppShellSlotConfig>({});
  const drawerTriggerRef = useRef<HTMLButtonElement | null>(null);
  const previousDrawerOpenRef = useRef(false);
  const primaryItems = useMemo(() => primaryNav ?? defaultPrimaryNav(session), [primaryNav, session]);
  const currentContextNav = shellConfig.contextNav ?? contextNav ?? [];
  const currentSidebarSummary = shellConfig.sidebarSummary ?? sidebarSummary;
  const currentHeaderActions = shellConfig.headerActions ?? headerActions;
  const currentHeaderTitle = shellConfig.headerTitle ?? headerTitle ?? title;
  const currentHeaderSubtitle = shellConfig.headerSubtitle ?? headerSubtitle ?? subtitle;
  const [activeSection, setActiveSection] = useActiveSection(currentContextNav);
  const roleLabel = isGuardianRole(session.role) ? "Guardian" : "Student";
  const identity = session.email ?? session.loginId;

  useEffect(() => {
    if (!drawerOpen) {
      document.body.style.overflow = "";
      if (previousDrawerOpenRef.current) {
        drawerTriggerRef.current?.focus();
      }
      previousDrawerOpenRef.current = false;
      return;
    }

    previousDrawerOpenRef.current = true;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setDrawerOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [drawerOpen]);

  const contextValue = useMemo<AppShellContextValue>(
    () => ({
      setConfig: (config) => {
        setShellConfig(config);
      },
      clearConfig: () => {
        setShellConfig({});
      },
    }),
    [],
  );

  const renderNavItem = (item: AppShellNavItem, kind: "primary" | "section") => {
    const isActive = kind === "primary"
      ? item.exact
        ? pathname === item.href
        : pathname === item.href || pathname.startsWith(`${item.href}/`)
      : activeSection === item.href;
    const baseClassName =
      "group flex min-h-11 items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950/40";
    const content = (
      <>
        <span
          className={classNames(
            "flex h-8 w-8 items-center justify-center rounded-xl border transition",
            isActive
              ? "border-white/20 bg-white/12 text-white"
              : "border-white/10 bg-white/5 text-slate-300 group-hover:border-white/20 group-hover:bg-white/10 group-hover:text-white",
          )}
        >
          <NavIcon icon={item.icon} />
        </span>
        <span className="min-w-0 flex-1 truncate">{item.label}</span>
      </>
    );

    if (isSectionHref(item.href)) {
      return (
        <a
          key={`${kind}-${item.href}`}
          href={item.href}
          aria-current={isActive ? "location" : undefined}
          onClick={() => {
            setActiveSection(item.href);
            setDrawerOpen(false);
          }}
          className={classNames(
            baseClassName,
            isActive
              ? "bg-white/12 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]"
              : "text-slate-300 hover:bg-white/8 hover:text-white",
          )}
        >
          {content}
        </a>
      );
    }

    return (
      <Link
        key={`${kind}-${item.href}`}
        href={item.href}
        aria-current={isActive ? "page" : undefined}
        onClick={() => setDrawerOpen(false)}
        className={classNames(
          baseClassName,
          isActive
            ? "bg-gradient-to-r from-orange-400/30 via-amber-300/18 to-emerald-300/20 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]"
            : "text-slate-200 hover:bg-white/8 hover:text-white",
        )}
      >
        {content}
      </Link>
    );
  };

  const renderSidebar = () => (
    <div className="flex h-full flex-col bg-[radial-gradient(circle_at_top,_rgba(251,146,60,0.18),_transparent_26%),linear-gradient(180deg,_#0f172a_0%,_#111827_48%,_#020617_100%)] text-white">
      <div className="border-b border-white/10 px-5 py-5">
        <div className="flex items-center gap-4">
          <BrandMark />
          <div className="min-w-0">
            <p className="truncate text-lg font-semibold">Study Project</p>
            <p className="mt-1 text-sm text-slate-300">{roleLabel} Workspace</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5">
        <div className="rounded-[1.75rem] border border-white/10 bg-white/6 px-4 py-4 shadow-[0_20px_40px_rgba(2,6,23,0.24)]">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white/12 text-sm font-semibold text-white">
              {session.name.slice(0, 1)}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">{session.name}</p>
              <p className="truncate text-xs text-slate-300">{identity}</p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="rounded-full border border-white/12 bg-white/8 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-200">
              {roleLabel}
            </span>
            <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-[11px] font-semibold text-emerald-100">
              학습 추적 활성
            </span>
          </div>
        </div>

        <div className="mt-6">
          <p className="px-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Primary</p>
          <nav aria-label="기본 탐색" className="mt-3 space-y-1.5">
            {primaryItems.map((item) => renderNavItem(item, "primary"))}
          </nav>
        </div>

        {currentContextNav.length ? (
          <div className="mt-6">
            <p className="px-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Sections</p>
            <nav aria-label="페이지 섹션 탐색" className="mt-3 space-y-1.5">
              {currentContextNav.map((item) => renderNavItem(item, "section"))}
            </nav>
          </div>
        ) : null}

        {currentSidebarSummary ? <div className="mt-6">{currentSidebarSummary}</div> : null}
      </div>
    </div>
  );

  return (
    <AppShellContext.Provider value={contextValue}>
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(251,146,60,0.16),_transparent_18%),linear-gradient(180deg,_#fbf8f2_0%,_#f4efe6_52%,_#f8fafc_100%)] text-slate-950">
        <a
          href="#main-content"
          className="sr-only z-[60] rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
        >
          본문으로 건너뛰기
        </a>

        <div className="xl:grid xl:grid-cols-[272px_minmax(0,1fr)]">
          <aside className="hidden xl:sticky xl:top-0 xl:block xl:h-screen xl:border-r xl:border-slate-200/70">
            {renderSidebar()}
          </aside>

          <div className="min-w-0">
            <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-[rgba(251,248,242,0.88)] backdrop-blur-xl">
              <div className="px-4 py-4 sm:px-6 xl:px-8">
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    ref={drawerTriggerRef}
                    type="button"
                    aria-label="메뉴 열기"
                    aria-expanded={drawerOpen}
                    aria-controls="app-shell-mobile-drawer"
                    onClick={() => setDrawerOpen(true)}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-slate-300 hover:text-slate-950 xl:hidden"
                  >
                    <MenuIcon />
                  </button>

                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">{currentHeaderSubtitle}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-3">
                      <h1 className="text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl">{currentHeaderTitle}</h1>
                      <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                        {roleLabel}
                      </span>
                    </div>
                  </div>

                  {currentHeaderActions ? (
                    <div className="flex basis-full flex-wrap items-center gap-3 md:justify-end xl:ml-auto xl:basis-auto xl:flex-1 xl:justify-end">
                      {currentHeaderActions}
                    </div>
                  ) : null}
                  <div className="ml-auto">
                    <LogoutButton />
                  </div>
                </div>
              </div>
            </header>

            <main id="main-content" className="px-4 py-6 sm:px-6 xl:px-8 xl:py-8">
              {children}
            </main>
          </div>
        </div>

        {drawerOpen ? (
          <div className="fixed inset-0 z-50 xl:hidden" aria-hidden={!drawerOpen}>
            <button
              type="button"
              aria-label="사이드바 닫기"
              className="absolute inset-0 bg-slate-950/55 backdrop-blur-sm"
              onClick={() => setDrawerOpen(false)}
            />
            <aside
              id="app-shell-mobile-drawer"
              className="relative z-10 h-full w-[min(88vw,320px)] border-r border-white/10 shadow-2xl"
            >
              <div className="absolute right-4 top-4 z-10">
                <button
                  type="button"
                  aria-label="메뉴 닫기"
                  onClick={() => setDrawerOpen(false)}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/12 bg-white/8 text-white"
                >
                  <CloseIcon />
                </button>
              </div>
              {renderSidebar()}
            </aside>
          </div>
        ) : null}
      </div>
    </AppShellContext.Provider>
  );
}

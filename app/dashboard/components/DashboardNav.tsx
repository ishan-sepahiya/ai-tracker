"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Route = {
  href: string;
  label: string;
};

export default function DashboardNav({
  routes,
}: {
  routes: Route[];
}) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/dashboard") {
      return pathname === href;
    }

    return (
      pathname === href ||
      pathname.startsWith(`${href}/`)
    );
  };

  return (
    <>
      {/* Desktop Navigation */}
      <nav className="ml-10 hidden items-center gap-1 md:flex">
        {routes.map((route) => {
          const active = isActive(route.href);

          return (
            <Link
              key={route.href}
              href={route.href}
              aria-current={
                active ? "page" : undefined
              }
              className={[
                "rounded-lg px-4 py-2.5 text-sm font-medium transition-all",
                active
                  ? "bg-slate-950 text-white shadow-sm"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900",
              ].join(" ")}
            >
              {route.label}
            </Link>
          );
        })}
      </nav>

      {/* Mobile Navigation */}
      <div className="border-t border-gray-100 px-4 py-2 md:hidden">
        <nav className="flex gap-1 overflow-x-auto pb-0.5">
          {routes.map((route) => {
            const active = isActive(route.href);

            return (
              <Link
                key={route.href}
                href={route.href}
                aria-current={
                  active ? "page" : undefined
                }
                className={[
                  "shrink-0 rounded-lg px-3 py-2 text-sm font-medium transition-all",
                  active
                    ? "bg-slate-950 text-white shadow-sm"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900",
                ].join(" ")}
              >
                {route.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </>
  );
}
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const links = [{ href: "/work", label: "Work" }, { href: "/work/new", label: "New engagement" }, { href: "/activity", label: "Activity" }, { href: "/account", label: "Account" }];

export function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const active = (href: string) => pathname === href || (href !== "/work" && pathname.startsWith(`${href}/`)) || (href === "/work" && pathname.startsWith("/work/") && !pathname.startsWith("/work/new"));
  return <div className="shell"><header className="top"><Link className="brand" href="/"><span className="brandMark" aria-hidden="true">A</span><span>Accordant</span></Link><nav aria-label="Primary navigation">{links.map((link) => <Link className={active(link.href) ? "active" : ""} key={link.href} href={link.href}>{link.label}</Link>)}</nav><div className="headerMeta"><span className="networkBadge">Studionet · 61999</span></div><details className="mobileMenu"><summary>Menu</summary><div><span className="networkBadge">Studionet · 61999</span>{links.map((link) => <Link className={active(link.href) ? "active" : ""} key={link.href} href={link.href}>{link.label}</Link>)}</div></details></header><main>{children}</main></div>;
}

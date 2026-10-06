import Link from "next/link";
import type { ReactNode } from "react";
export function Shell({ children }: { children: ReactNode }) {
  return <div className="shell"><header className="top"><Link className="brand" href="/">Accordant</Link><nav><Link href="/work">Work</Link><Link href="/work/new">New engagement</Link><Link href="/activity">Activity</Link><Link href="/account">Account</Link></nav></header><main>{children}</main></div>;
}

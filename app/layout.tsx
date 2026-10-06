import type { Metadata } from "next";
import "./globals.css";
import { Shell } from "@/components/Shell";
export const metadata: Metadata = { title: "Accordant", description: "Neutral milestone acceptance on GenLayer" };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body><Shell>{children}</Shell></body></html>; }

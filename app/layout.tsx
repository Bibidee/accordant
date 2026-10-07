import type { Metadata } from "next";
import "./globals.css";
import { Shell } from "@/components/Shell";
import { WalletProvider } from "@/components/WalletContext";
export const metadata: Metadata = { title: "Accordant", description: "Neutral milestone acceptance on GenLayer" };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body><WalletProvider><Shell>{children}</Shell></WalletProvider></body></html>; }

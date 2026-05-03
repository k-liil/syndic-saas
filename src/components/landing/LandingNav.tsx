"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";

export default function LandingNav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const navLinks = [
    { label: "Fonctionnalités", href: "#features" },
    { label: "Témoignages", href: "#testimonials" },
    { label: "Comment ça marche", href: "#how" },
    { label: "FAQ", href: "#faq" },
  ];

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
      style={{
        background: scrolled ? "rgba(255,255,255,0.96)" : "transparent",
        boxShadow: scrolled ? "0 1px 0 rgba(0,0,0,0.08)" : "none",
        backdropFilter: scrolled ? "blur(12px)" : "none",
      }}
    >
      <div className="mx-auto flex max-w-7xl items-center gap-8 px-6 py-0 h-[68px]">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 no-underline">
          <Image src="/logo.png" alt="Syndicly" width={36} height={36} unoptimized />
          <span
            className="font-bold text-xl tracking-tight transition-colors duration-300"
            style={{ color: scrolled ? "#1a3a6b" : "#fff", letterSpacing: "-0.02em" }}
          >
            Syndicly
          </span>
        </Link>

        {/* Links */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-sm font-medium transition-colors no-underline"
              style={{ color: scrolled ? "#4a5568" : "rgba(255,255,255,0.85)" }}
            >
              {l.label}
            </a>
          ))}
        </div>

        <div className="flex-1" />

        {/* Connexion ghost */}
        <Link
          href="/login"
          className="hidden md:inline-flex items-center text-sm font-medium px-5 py-2 rounded-xl transition-all no-underline"
          style={{
            color: scrolled ? "#1a3a6b" : "#fff",
            border: `1.5px solid ${scrolled ? "rgba(26,58,107,0.3)" : "rgba(255,255,255,0.3)"}`,
            background: "transparent",
          }}
        >
          Connexion
        </Link>

        {/* Demo CTA */}
        <Link
          href="/login"
          className="btn-primary inline-flex items-center gap-2 text-sm font-semibold rounded-xl px-5 py-2"
        >
          Demander une démo
        </Link>
      </div>
    </nav>
  );
}

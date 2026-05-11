"use client";

import Image from "next/image";
import Link from "next/link";
import pkg from "../../package.json";

const APP_VERSION = pkg.version;

export function SidebarBrand() {
  return (
    <Link
      href="/dashboard"
      className="flex items-center gap-2.5 rounded-xl px-2 py-1 transition-colors duration-200 hover:bg-slate-100/60"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white shadow-[0_2px_8px_rgba(15,23,42,0.06)]">
        <Image
          src="/logo.png"
          alt="Syndicly"
          width={28}
          height={28}
          unoptimized
          className="h-7 w-7 object-contain"
        />
      </span>
      <span className="flex min-w-0 flex-col leading-tight">
        <span className="text-[15px] font-bold tracking-tight text-slate-900">
          Syndicly
        </span>
        <span className="text-[10px] font-medium tracking-wide text-slate-400">
          v{APP_VERSION}
        </span>
      </span>
    </Link>
  );
}

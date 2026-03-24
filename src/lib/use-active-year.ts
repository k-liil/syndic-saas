"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";

export function useActiveYear() {
  const searchParams = useSearchParams();

  return useMemo(() => {
    const fromQuery = searchParams.get("year");
    if (fromQuery) {
      return fromQuery;
    }

    if (typeof window !== "undefined") {
      return localStorage.getItem("syndic-year");
    }

    return null;
  }, [searchParams]);
}

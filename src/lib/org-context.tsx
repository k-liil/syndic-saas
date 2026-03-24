"use client";

import { createContext, useContext, useState, useEffect, useMemo, useCallback, ReactNode } from "react";

export type OrgInfo = {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string | null;
};

type OrgContextType = {
  org: OrgInfo | null;
  orgs: OrgInfo[];
  loading: boolean;
  switchOrg: (org: OrgInfo) => void;
  getOrgId: () => string | null;
};

const OrgContext = createContext<OrgContextType>({
  org: null,
  orgs: [],
  loading: true,
  switchOrg: () => {},
  getOrgId: () => null,
});

export function OrgProvider({ children }: { children: ReactNode }) {
  const [org, setOrg] = useState<OrgInfo | null>(null);
  const [orgs, setOrgs] = useState<OrgInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedOrgId = localStorage.getItem("syndic-org-id");
    
    fetch("/api/organizations/simple", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setOrgs(data);
          const saved = data.find((o: OrgInfo) => o.id === savedOrgId);
          const selected = saved || data[0];
          setOrg(selected);
          if (!saved) {
            localStorage.setItem("syndic-org-id", selected.id);
          }
        }
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  const switchOrg = useCallback((newOrg: OrgInfo) => {
    setOrg(newOrg);
    localStorage.setItem("syndic-org-id", newOrg.id);
    localStorage.removeItem("syndic-year");
  }, []);

  const getOrgId = useCallback(() => {
    return org?.id || null;
  }, [org]);

  const contextValue = useMemo(
    () => ({ org, orgs, loading, switchOrg, getOrgId }),
    [org, orgs, loading, switchOrg, getOrgId]
  );

  return (
    <OrgContext.Provider value={contextValue}>
      {children}
    </OrgContext.Provider>
  );
}

export function useOrganization() {
  return useContext(OrgContext);
}

export function useOrgId() {
  const { getOrgId } = useContext(OrgContext);
  return getOrgId();
}

export function useApiUrl() {
  const { org } = useContext(OrgContext);
  const orgId = org?.id ?? null;
  return useCallback((path: string) => {
    if (!orgId) return path;
    return path.includes("?") ? `${path}&orgId=${orgId}` : `${path}?orgId=${orgId}`;
  }, [orgId]);
}

export function apiUrl(path: string, orgId: string | null) {
  return orgId ? `${path}?orgId=${orgId}` : path;
}

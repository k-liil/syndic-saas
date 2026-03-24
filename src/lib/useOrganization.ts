import { useState, useEffect, useCallback } from "react";

export type OrgInfo = {
  id: string;
  name: string;
  slug: string;
  brandName?: string;
  brandColor?: string;
};

export function useOrganization() {
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
          setOrg(saved || data[0]);
          if (!saved) {
            localStorage.setItem("syndic-org-id", data[0].id);
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

  const apiUrl = useCallback((path: string) => {
    const orgId = getOrgId();
    return orgId ? `${path}?orgId=${orgId}` : path;
  }, [getOrgId]);

  return { org, orgs, loading, switchOrg, getOrgId, apiUrl };
}

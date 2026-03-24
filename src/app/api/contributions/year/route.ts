import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/authz";
import { getOrgIdFromRequest } from "@/lib/org-utils";

function naturalLotSort(a: { lotNumber: string | null; reference: string | null }, b: { lotNumber: string | null; reference: string | null }) {
  const collator = new Intl.Collator("fr", {
    numeric: true,
    sensitivity: "base",
  });

  const aValue = a.lotNumber || a.reference || "";
  const bValue = b.lotNumber || b.reference || "";

  return collator.compare(aValue, bValue);
}

export async function GET(req: Request) {

  const gate = await requireAuth();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const orgId = await getOrgIdFromRequest(req, gate);
  if (!orgId) {
    return NextResponse.json([]);
  }

  const { searchParams } = new URL(req.url);

  const year = Number(searchParams.get("year"));
  const buildingId = searchParams.get("buildingId") || undefined;

  if (!year) {
    return NextResponse.json({ error: "year required" }, { status: 400 });
  }

  const start = new Date(Date.UTC(year, 0, 1));
  const end = new Date(Date.UTC(year, 11, 31));

  const buildings = await prisma.building.findMany({
    where: buildingId
      ? { id: buildingId, organizationId: orgId }
      : { organizationId: orgId },
    select: {
      id: true,
      name: true,
      units: {
        select: {
          id: true,
          lotNumber: true,
          reference: true,
          ownerships: {
            where: { endDate: null, organizationId: orgId },
            select: {
              owner: { select: { firstName: true, name: true } }
            }
          },
          dues: {
            where: {
              organizationId: orgId,
              period: {
                gte: start,
                lte: end
              }
            },
            select: {
              period: true,
              status: true
            }
          }
        }
      }
    }
  });

  const months = Array.from({ length: 12 }, (_, i) => i);

  const result = buildings.map((building) => ({
    ...building,
    units: [...building.units]
      .sort(naturalLotSort)
      .map((unit) => {

        const duesMap = new Map(
          unit.dues.map((d) => [
            new Date(d.period).getUTCMonth(),
            d.status
          ])
        );

        const fullYear = months.map((m) => ({
          month: m,
          status: duesMap.get(m) || "UNPAID"
        }));

        return {
          ...unit,
          fullYear
        };
      })
  }));

  return NextResponse.json(result);
}

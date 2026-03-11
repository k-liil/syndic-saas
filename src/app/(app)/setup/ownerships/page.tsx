"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Owner = { id: string; name: string };
type Building = { id: string; name: string };
type Unit = {
  id: string;
  reference: string;
  type: "APARTMENT" | "GARAGE" | "COMMERCIAL";
  building: Building;
};

type Ownership = {
  id: string;
  startDate: string;
  endDate: string | null;
  owner: Owner;
  unit: Unit;
};

export default function OwnershipsPage() {
  const [owners, setOwners] = useState<Owner[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [items, setItems] = useState<Ownership[]>([]);

  const [ownerId, setOwnerId] = useState("");
  const [unitId, setUnitId] = useState("");
  const [loading, setLoading] = useState(false);

  async function load() {
    const [oRes, uRes, ownRes] = await Promise.all([
      fetch("/api/owners"),
      fetch("/api/units"),
      fetch("/api/ownerships"),
    ]);

    const o = await oRes.json();
    const u = await uRes.json();
    const own = await ownRes.json();

    setOwners(o);
    setUnits(u);
    setItems(own);

    if (!ownerId && o.length > 0) setOwnerId(o[0].id);
    if (!unitId && u.length > 0) setUnitId(u[0].id);
  }

  async function createOwnership() {
    if (!ownerId || !unitId) return;

    setLoading(true);
    const res = await fetch("/api/ownerships", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ownerId, unitId }),
    });

    setLoading(false);

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(err?.error ?? "Failed to create ownership");
      return;
    }

    load();
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ready = owners.length > 0 && units.length > 0;

  return (
    <main className="p-6 max-w-4xl mx-auto space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Ownerships</h1>
        <Link href="/" className="text-sm underline">
          Back
        </Link>
      </header>

      {!ready ? (
        <div className="border rounded-xl p-4">
          <div className="font-medium">Missing data</div>
          <div className="text-sm opacity-70 mt-1">
            You need at least one owner and one unit before creating ownerships.
          </div>
          <div className="text-sm mt-2 space-x-3">
            <Link className="underline" href="/owners">
              Go to owners
            </Link>
            <Link className="underline" href="/units">
              Go to units
            </Link>
          </div>
        </div>
      ) : (
        <section className="border rounded-xl p-4 space-y-3">
          <div className="font-medium">Link an owner to a unit</div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <select
              className="border rounded-lg p-2"
              value={ownerId}
              onChange={(e) => setOwnerId(e.target.value)}
            >
              {owners.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>

            <select
              className="border rounded-lg p-2"
              value={unitId}
              onChange={(e) => setUnitId(e.target.value)}
            >
              {units.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.reference} • {u.type} • {u.building?.name}
                </option>
              ))}
            </select>
          </div>

          <button
            className="border rounded-lg px-3 py-2 text-sm"
            onClick={createOwnership}
            disabled={loading}
          >
            {loading ? "Linking..." : "Create link"}
          </button>
        </section>
      )}

      <section className="border rounded-xl overflow-hidden">
        {items.length === 0 ? (
          <div className="p-4 opacity-70">No ownerships yet.</div>
        ) : (
          <div className="divide-y">
            {items.map((x) => (
              <div key={x.id} className="p-3">
                <div className="font-medium">
                  {x.owner.name} → {x.unit.reference}{" "}
                  <span className="opacity-60">
                    • {x.unit.type} • {x.unit.building?.name}
                  </span>
                </div>
                <div className="text-sm opacity-70">
                  Start: {new Date(x.startDate).toLocaleDateString()}
                  {x.endDate
                    ? ` • End: ${new Date(x.endDate).toLocaleDateString()}`
                    : " • Active"}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

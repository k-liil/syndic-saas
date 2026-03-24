import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/authz";
import { getOrgIdFromRequest } from "@/lib/org-utils";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const gate = await requireAuth();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const orgId = await getOrgIdFromRequest(req, gate);
  if (!orgId) {
    return NextResponse.json({ error: "No organization" }, { status: 400 });
  }

  const receipt = await prisma.receipt.findFirst({
    where: { id: params.id, organizationId: orgId },
    include: {
      owner: { select: { id: true, name: true, firstName: true } },
      unit: { select: { id: true, lotNumber: true, reference: true, type: true } },
      building: { select: { id: true, name: true } },
      allocations: {
        select: {
          amount: true,
          due: { select: { period: true, amountDue: true } },
        },
        orderBy: { due: { period: "asc" } },
      },
    },
  });

  if (!receipt) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { name: true, email: true, phone: true, logoUrl: true, address: true, city: true },
  });

  const settings = await prisma.appSettings.findFirst({
    where: { organizationId: orgId },
    select: { receiptPrefix: true, receiptUsePrefix: true },
  });

  const prefix = settings?.receiptUsePrefix && settings?.receiptPrefix ? settings.receiptPrefix : "";
  const receiptRef = `${prefix}${receipt.receiptNumber}`;

  const dateStr = receipt.date
    ? new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" }).format(new Date(receipt.date))
    : "—";

  const ownerName = [receipt.owner?.firstName, receipt.owner?.name].filter(Boolean).join(" ").toUpperCase() || "—";
  const lotLabel = receipt.unit?.lotNumber ?? receipt.unit?.reference ?? "—";
  const buildingLabel = receipt.building?.name ?? "—";

  const methodLabel: Record<string, string> = {
    CASH: "Espèces",
    TRANSFER: "Virement bancaire",
    CHECK: "Chèque",
    DEBIT: "Prélèvement",
  };

  const paymentMethod = methodLabel[receipt.method] ?? receipt.method;
  const bankRef = receipt.bankRef ? ` N°:${receipt.bankRef}` : "";
  const paymentLine = `Paiement par ${paymentMethod}${bankRef}`;

  const amount = Number(receipt.amount);
  const amountFmt = amount.toLocaleString("fr-FR", { minimumFractionDigits: 2 }) + " MAD";

  // Années couvertes
  const years = new Set(
    receipt.allocations.map((a) => new Date(a.due.period).getFullYear())
  );
  const yearLabel = [...years].sort().join(", ");

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <title>Reçu ${receiptRef}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Inter', sans-serif; background: #f8fafc; color: #1e293b; }

    .page {
      max-width: 720px;
      margin: 40px auto;
      background: #fff;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 4px 24px rgba(0,0,0,0.10);
      position: relative;
    }

    /* Décorations latérales */
    .deco-right {
      position: absolute; top: 0; right: 0; width: 56px; height: 220px;
      background: #0e7490; border-radius: 0 0 0 40px;
    }
    .deco-left {
      position: absolute; bottom: 80px; left: 0; width: 48px; height: 160px;
      background: #0e7490; border-radius: 0 40px 40px 0;
    }

    .header { padding: 36px 48px 24px; }
    .header-top { display: flex; align-items: flex-start; justify-content: space-between; }
    .receipt-title { font-size: 22px; font-weight: 700; color: #1e293b; margin-bottom: 24px; text-align: center; }
    .logo { height: 72px; object-fit: contain; }
    .logo-placeholder { width: 120px; height: 72px; background: #f1f5f9; border-radius: 8px; display:flex; align-items:center; justify-content:center; font-size:11px; color:#94a3b8; }
    .date-block { text-align: right; font-size: 14px; }
    .date-block .date { font-weight: 700; font-size: 15px; color: #1e293b; }
    .date-block .from { color: #64748b; margin-top: 4px; }
    .date-block .owner { font-weight: 700; font-size: 16px; color: #1e293b; margin-top: 2px; }

    .org-name { padding: 0 48px; font-size: 17px; font-weight: 600; color: #1e293b; margin-bottom: 20px; }

    .divider { border: none; border-top: 2px solid #e2e8f0; margin: 0 48px; }

    table { width: calc(100% - 96px); margin: 20px 48px 0; border-collapse: collapse; font-size: 14px; }
    thead tr th { padding: 8px 0; border-bottom: 2px solid #1e293b; font-weight: 700; text-align: left; }
    thead tr th:last-child { text-align: right; }
    tbody tr td { padding: 12px 0; }
    tbody tr td:last-child { text-align: right; font-weight: 600; }

    .summary { margin: 24px 48px 0; font-size: 14px; }
    .summary-line { display: flex; justify-content: space-between; padding: 6px 0; color: #475569; }
    .summary-line.total { background: #e2e8f0; border-radius: 8px; padding: 10px 16px; font-weight: 700; font-size: 15px; color: #1e293b; margin-top: 8px; }

    .payment-note { margin: 20px 48px 0; font-style: italic; font-size: 13px; color: #64748b; text-align: right; }

    .footer { margin: 28px 48px 36px; font-size: 12px; color: #64748b; }
    .footer .contact { display: flex; align-items: center; gap: 6px; margin-top: 6px; }
    .footer .label { font-size: 12px; margin-bottom: 8px; }

    @media print {
      body { background: #fff; }
      .page { box-shadow: none; margin: 0; max-width: 100%; border-radius: 0; }
      .no-print { display: none !important; }
    }

    .print-bar {
      position: fixed; bottom: 24px; right: 24px;
      display: flex; gap: 12px;
    }
    .btn { padding: 10px 24px; border-radius: 12px; font-size: 14px; font-weight: 600; cursor: pointer; border: none; }
    .btn-print { background: #0e7490; color: #fff; }
    .btn-close { background: #e2e8f0; color: #1e293b; }
  </style>
</head>
<body>

<div class="page">
  <div class="deco-right"></div>
  <div class="deco-left"></div>

  <div class="header">
    <div class="receipt-title">Reçu de paiement</div>
    <div class="header-top">
      <div>
        ${org?.logoUrl
          ? `<img src="${org.logoUrl}" alt="Logo" class="logo" />`
          : `<div class="logo-placeholder">${org?.name ?? ""}</div>`}
      </div>
      <div class="date-block">
        <div class="date">${dateStr}</div>
        <div class="from">De</div>
        <div class="from">Mmes/M.</div>
        <div class="owner">${ownerName}</div>
      </div>
    </div>
  </div>

  <div class="org-name">${org?.name ?? ""}</div>
  <hr class="divider" />

  <table>
    <thead>
      <tr>
        <th>Référence</th>
        <th>Bien</th>
        <th>TOTAL</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>${receiptRef}</td>
        <td>${buildingLabel} – Lot ${lotLabel}</td>
        <td>${amountFmt}</td>
      </tr>
    </tbody>
  </table>

  <div class="summary">
    <div class="summary-line">
      <span>Cotisation de fonctionnement${yearLabel ? " " + yearLabel : ""}</span>
      <span>${amountFmt}</span>
    </div>
    ${yearLabel ? `<div class="summary-line"><span>Total des cotisations de l'année ${yearLabel}</span><span></span></div>` : ""}
    <div class="summary-line total">
      <span>TOTAL</span>
      <span>${amountFmt}</span>
    </div>
  </div>

  <div class="payment-note">${paymentLine}</div>

  ${(org?.email || org?.phone) ? `
  <div class="footer">
    <div class="label">Pour toute question ou information, prière de contacter votre gestionnaire de site :</div>
    ${org.email ? `<div class="contact">✉ ${org.email}</div>` : ""}
    ${org.phone ? `<div class="contact">📞 ${org.phone}</div>` : ""}
  </div>
  ` : ""}
</div>

<div class="print-bar no-print">
  <button class="btn btn-print" onclick="window.print()">🖨 Imprimer</button>
  <button class="btn btn-close" onclick="window.close()">Fermer</button>
</div>

</body>
</html>`;

  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

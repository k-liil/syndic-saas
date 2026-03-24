import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireManager } from "@/lib/authz";
import { getOrgIdFromRequest } from "@/lib/org-utils";
import { resolveActiveFiscalYear } from "@/lib/active-fiscal-year";

function getErrorDetail(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export async function GET(req: Request) {
  const gate = await requireManager();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const orgId = await getOrgIdFromRequest(req, gate);
  if (!orgId) {
    return NextResponse.json({ budgets: [], posts: [], kpis: null });
  }

  const { searchParams } = new URL(req.url);
  const yearParam = searchParams.get("year");
  const year = await resolveActiveFiscalYear(orgId, yearParam);

  if (!year) {
    return NextResponse.json({ budgets: [], posts: [], kpis: null });
  }

  const startDate = new Date(Date.UTC(year, 0, 1));
  const endDate = new Date(Date.UTC(year + 1, 0, 1));

  const [posts, budgets, payments] = await Promise.all([
    prisma.accountingPost.findMany({
      where: { organizationId: orgId, isActive: true },
      orderBy: [{ postType: "asc" }, { code: "asc" }],
    }),
    prisma.budget.findMany({
      where: { organizationId: orgId, year },
      include: { accountingPost: true },
    }),
    prisma.payment.findMany({
      where: {
        organizationId: orgId,
        date: { gte: startDate, lt: endDate },
        accountingPostId: { not: null },
      },
      select: {
        amount: true,
        accountingPostId: true,
      },
    }),
  ]);

  const budgetsMap = new Map<string, { id: string; amount: number; accountingPostId: string }>();
  budgets.forEach((b: { id: string; amount: unknown; accountingPostId: string }) => {
    budgetsMap.set(b.accountingPostId, {
      id: b.id,
      amount: Number(b.amount),
      accountingPostId: b.accountingPostId,
    });
  });

  const paidByPost = new Map<string, number>();
  payments.forEach((p: { amount: unknown; accountingPostId: string | null }) => {
    if (p.accountingPostId) {
      const current = paidByPost.get(p.accountingPostId) || 0;
      paidByPost.set(p.accountingPostId, current + Number(p.amount));
    }
  });

  const charges = posts.filter((p: { postType: string }) => p.postType === "CHARGE");
  const products = posts.filter((p: { postType: string }) => p.postType === "PRODUCT");

  const chargeBudgets = charges.map((post: { id: string; code: string; name: string; postType: string }) => {
    const budget = budgetsMap.get(post.id);
    const paid = paidByPost.get(post.id) || 0;
    const budgetAmount = budget?.amount || 0;
    return {
      accountingPost: post,
      budgetId: budget?.id || null,
      budgetAmount,
      paidAmount: paid,
      executionPercent: budgetAmount > 0 ? Math.round((paid / budgetAmount) * 100) : 0,
    };
  });

  const productBudgets = products.map((post: { id: string; code: string; name: string; postType: string }) => {
    const budget = budgetsMap.get(post.id);
    const budgetAmount = budget?.amount || 0;
    return {
      accountingPost: post,
      budgetId: budget?.id || null,
      budgetAmount,
      paidAmount: 0,
      executionPercent: 0,
    };
  });

  const totalChargeBudget = chargeBudgets.reduce((sum: number, b: { budgetAmount: number }) => sum + b.budgetAmount, 0);
  const totalChargePaid = chargeBudgets.reduce((sum: number, b: { paidAmount: number }) => sum + b.paidAmount, 0);
  const totalProductBudget = productBudgets.reduce((sum: number, b: { budgetAmount: number }) => sum + b.budgetAmount, 0);

  return NextResponse.json({
    year,
    charges: chargeBudgets,
    products: productBudgets,
    kpis: {
      totalBudget: totalChargeBudget + totalProductBudget,
      totalExpenses: totalChargePaid,
      totalCollected: 0,
      balance: totalProductBudget - totalChargeBudget,
      remaining: totalChargeBudget - totalChargePaid,
      chargeBudget: totalChargeBudget,
      chargePaid: totalChargePaid,
      productBudget: totalProductBudget,
    },
  });
}

export async function POST(req: Request) {
  const gate = await requireManager();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const orgId = await getOrgIdFromRequest(req, gate);
  if (!orgId) {
    return NextResponse.json({ error: "No organization" }, { status: 400 });
  }

  try {
    const body = await req.json();
    const accountingPostId = typeof body.accountingPostId === "string" ? body.accountingPostId.trim() : "";
    const year = await resolveActiveFiscalYear(orgId, typeof body.year === "number" ? body.year : null);

    if (!year) {
      return NextResponse.json({ error: "YEAR_REQUIRED" }, { status: 400 });
    }
    const amount = Number(String(body.amount ?? "0").replace(/[^\d.-]/g, "")) || 0;

    if (!accountingPostId) {
      return NextResponse.json({ error: "ACCOUNTING_POST_REQUIRED" }, { status: 400 });
    }

    const existing = await prisma.budget.findFirst({
      where: { organizationId: orgId, accountingPostId, year },
    });

    if (existing) {
      const updated = await prisma.budget.update({
        where: { id: existing.id },
        data: { amount },
        include: { accountingPost: true },
      });
      return NextResponse.json({ budget: updated });
    }

    const budget = await prisma.budget.create({
      data: {
        organizationId: orgId,
        accountingPostId,
        year,
        amount,
      },
      include: { accountingPost: true },
    });

    return NextResponse.json({ budget });
  } catch (e) {
    console.error("POST /api/budgets failed:", e);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", detail: getErrorDetail(e) },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  const gate = await requireManager();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const orgId = await getOrgIdFromRequest(req, gate);
  if (!orgId) {
    return NextResponse.json({ error: "No organization" }, { status: 400 });
  }

  try {
    const body = await req.json();
    const id = typeof body.id === "string" ? body.id.trim() : "";

    if (!id) {
      return NextResponse.json({ error: "ID_REQUIRED" }, { status: 400 });
    }

    const existing = await prisma.budget.findFirst({
      where: { id, organizationId: orgId },
    });

    if (!existing) {
      return NextResponse.json({ error: "BUDGET_NOT_FOUND" }, { status: 404 });
    }

    const budget = await prisma.budget.update({
      where: { id },
      data: {
        amount: typeof body.amount === "number" ? body.amount : undefined,
        isActive: typeof body.isActive === "boolean" ? body.isActive : undefined,
      },
      include: { accountingPost: true },
    });

    return NextResponse.json({ budget });
  } catch (e) {
    console.error("PUT /api/budgets failed:", e);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", detail: getErrorDetail(e) },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  const gate = await requireManager();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const orgId = await getOrgIdFromRequest(req, gate);
  if (!orgId) {
    return NextResponse.json({ error: "No organization" }, { status: 400 });
  }

  try {
    const body = await req.json();
    const id = typeof body.id === "string" ? body.id.trim() : "";

    if (!id) {
      return NextResponse.json({ error: "ID_REQUIRED" }, { status: 400 });
    }

    const existing = await prisma.budget.findFirst({
      where: { id, organizationId: orgId },
    });

    if (!existing) {
      return NextResponse.json({ error: "BUDGET_NOT_FOUND" }, { status: 404 });
    }

    await prisma.budget.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("DELETE /api/budgets failed:", e);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", detail: getErrorDetail(e) },
      { status: 500 }
    );
  }
}

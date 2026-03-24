import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const ORG_SLUG = "cit-intellak-ii";

function normalizeText(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function includesOneOf(text: string, terms: string[]) {
  return terms.some((term) => text.includes(term));
}

function getPostCode(supplierName: string, note: string | null) {
  const supplier = normalizeText(supplierName);
  const text = normalizeText(note);

  if (supplier === "redal") {
    if (text.includes("consommation")) return "6111";
    if (text.includes("pourboire")) return "6191";
    return "6111";
  }

  if (supplier === "inwi") {
    return "6114";
  }

  if (supplier === "banque") {
    return "6132";
  }

  if (supplier === "cnss") {
    return "6172";
  }

  if (supplier.includes("gestionnaire du syndic")) {
    return "6131";
  }

  if (supplier === "personnel") {
    if (includesOneOf(text, ["souliers", "gants", "seau"])) return "6142";
    return "6171";
  }

  if (supplier === "plombier") {
    return "6135";
  }

  if (supplier === "electricien") {
    if (includesOneOf(text, ["ampoule", "pannel", "panel", "eclairage"])) return "6112";
    return "6135";
  }

  if (supplier.includes("fournisseur materiel")) {
    if (includesOneOf(text, ["essence", "huile"])) return "6161";
    if (includesOneOf(text, ["eau de javel", "nettoyant", "balai", "lave vitre", "detergent"])) return "6116";
    if (includesOneOf(text, ["cartouche", "photocopie", "fournitures de bureau", "traitement de texte"])) return "6141";
    if (includesOneOf(text, ["taxes services communaux"])) return "6151";
    if (includesOneOf(text, ["medicaments"])) return "6173";
    if (includesOneOf(text, ["elagage", "dechets verts", "fil de coupe", "materiel jardin", "tondeuse"])) return "6122";
    if (includesOneOf(text, ["rebouchage", "anti-cafar"])) return "6121";
    if (includesOneOf(text, ["compensation", "pourboire"])) return "6191";
    if (
      includesOneOf(text, [
        "cadenas",
        "tuyau",
        "combinaisons",
        "raclette",
        "botte",
        "blouses",
        "tabliers",
        "serrure",
        "bougie",
        "insecticide",
        "seau",
      ])
    ) {
      return "6142";
    }
    return "6116";
  }

  return null;
}

async function main() {
  const organization = await prisma.organization.findFirst({
    where: { slug: ORG_SLUG },
    select: { id: true, name: true },
  });

  if (!organization) {
    throw new Error(`Organization not found for slug ${ORG_SLUG}`);
  }

  const posts = await prisma.accountingPost.findMany({
    where: { organizationId: organization.id, postType: "CHARGE" },
    select: { id: true, code: true, isActive: true },
  });

  const postIdByCode = new Map(posts.map((post) => [post.code, post.id]));

  const payments = await prisma.payment.findMany({
    where: { organizationId: organization.id },
    select: {
      id: true,
      paymentNumber: true,
      note: true,
      accountingPostId: true,
      supplier: { select: { name: true } },
    },
    orderBy: { paymentNumber: "asc" },
  });

  const updates: Array<{ id: string; paymentNumber: number; code: string }> = [];
  const codesToActivate = new Set<string>();
  const unmapped: Array<{ paymentNumber: number; supplier: string; note: string | null }> = [];

  for (const payment of payments) {
    const code = getPostCode(payment.supplier.name, payment.note);

    if (!code) {
      unmapped.push({
        paymentNumber: payment.paymentNumber,
        supplier: payment.supplier.name,
        note: payment.note,
      });
      continue;
    }

    const postId = postIdByCode.get(code);
    if (!postId) {
      throw new Error(`Accounting post ${code} not found in ${organization.name}`);
    }

    codesToActivate.add(code);

    if (payment.accountingPostId !== postId) {
      updates.push({ id: payment.id, paymentNumber: payment.paymentNumber, code });
    }
  }

  const operations = updates.map((update) => {
    const postId = postIdByCode.get(update.code)!;
    return prisma.payment.update({
      where: { id: update.id },
      data: { accountingPostId: postId },
    });
  });

  if (codesToActivate.size > 0) {
    operations.push(
      prisma.accountingPost.updateMany({
        where: {
          organizationId: organization.id,
          code: { in: Array.from(codesToActivate) },
        },
        data: { isActive: true },
      })
    );
  }

  const chunkSize = 25;
  for (let index = 0; index < operations.length; index += chunkSize) {
    await prisma.$transaction(operations.slice(index, index + chunkSize));
  }

  console.log(
    JSON.stringify(
      {
        organization: organization.name,
        updatedPayments: updates.length,
        activatedCodes: Array.from(codesToActivate).sort(),
        unmapped,
      },
      null,
      2
    )
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

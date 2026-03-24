const XLSX = require("xlsx");
const { PrismaClient, PostType } = require("@prisma/client");

const prisma = new PrismaClient();

const FILE_PATH = process.argv[2] || "Liste des dépenses.xlsx";
const TARGET_ORG_SLUG = process.argv[3] || "les-jardins-de-cherrat";

function normalizeText(value) {
  return (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function includesOneOf(text, terms) {
  return terms.some((term) => text.includes(term));
}

function getSuggestedPostCode(supplierName, note) {
  const supplier = normalizeText(supplierName);
  const text = normalizeText(note);

  if (supplier === "cb gest") return "6131";
  if (supplier.includes("prestataire prive")) return "6122";
  if (supplier.includes("srmi") || supplier.includes("electricite")) return "6112";
  if (supplier === "deaud concept") return "6135";
  if (supplier.includes("technicien independant")) return "6135";
  if (supplier.includes("agent onee")) return "6135";
  if (supplier.includes("beka ascenseur")) return "6135";

  if (supplier === "redal") {
    if (text.includes("pourboire")) return "6191";
    return "6111";
  }

  if (supplier === "banque") return "6132";
  if (supplier.includes("gestionnaire du syndic")) return "6131";
  if (supplier === "cnss") return "6172";

  if (supplier === "personnel") {
    if (includesOneOf(text, ["souliers", "gants", "seau"])) return "6142";
    return "6171";
  }

  return null;
}

const POST_METADATA = {
  "6112": { name: "Electricite", note: "Consommation electricite" },
  "6122": { name: "Espaces verts", note: "Jardinage et espaces verts" },
  "6131": { name: "Honoraires syndic", note: "Frais de gestion" },
  "6135": { name: "Entretien et petites reparations", note: "Interventions techniques" },
  "6191": { name: "Autres charges", note: "Charges diverses" },
};

function parseDate(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return new Date(Date.UTC(value.getFullYear(), value.getMonth(), value.getDate()));
  }

  const text = String(value || "").trim();
  const match = text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) {
    throw new Error(`Date invalide: ${text}`);
  }

  const [, day, month, year] = match;
  return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
}

function parseAmount(value) {
  const amount = Number(String(value ?? "").replace(/\s/g, "").replace(",", "."));
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error(`Montant invalide: ${value}`);
  }
  return amount;
}

async function ensureSupplier(organizationId, supplierName) {
  const existing = await prisma.supplier.findFirst({
    where: {
      organizationId,
      name: {
        equals: supplierName,
        mode: "insensitive",
      },
    },
  });

  if (existing) {
    return { supplier: existing, created: false };
  }

  const supplier = await prisma.supplier.create({
    data: {
      organizationId,
      name: supplierName,
      isActive: true,
    },
  });

  return { supplier, created: true };
}

async function ensurePost(organizationId, code) {
  const existing = await prisma.accountingPost.findFirst({
    where: { organizationId, code },
  });

  if (existing) {
    if (!existing.isActive) {
      await prisma.accountingPost.update({
        where: { id: existing.id },
        data: { isActive: true },
      });
    }
    return existing.id;
  }

  const metadata = POST_METADATA[code];
  if (!metadata) {
    throw new Error(`Poste comptable non configure: ${code}`);
  }

  const created = await prisma.accountingPost.create({
    data: {
      organizationId,
      code,
      name: metadata.name,
      note: metadata.note,
      postType: PostType.CHARGE,
      isActive: true,
    },
  });

  return created.id;
}

async function main() {
  const workbook = XLSX.readFile(FILE_PATH);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

  const organization = await prisma.organization.findUnique({
    where: { slug: TARGET_ORG_SLUG },
    select: { id: true, name: true },
  });

  if (!organization) {
    throw new Error(`Organisation introuvable: ${TARGET_ORG_SLUG}`);
  }

  const settings = await prisma.appSettings.findFirst({
    where: { organizationId: organization.id },
    select: { paymentStartNumber: true },
  });

  const lastPayment = await prisma.payment.findFirst({
    where: { organizationId: organization.id },
    orderBy: { paymentNumber: "desc" },
    select: { paymentNumber: true },
  });

  let nextPaymentNumber = lastPayment?.paymentNumber
    ? Math.max(lastPayment.paymentNumber + 1, settings?.paymentStartNumber ?? 1)
    : settings?.paymentStartNumber ?? 1;

  const dataRows = rows.slice(2).filter((row) => row.some((cell) => String(cell ?? "").trim() !== ""));
  const summary = {
    organization: organization.name,
    imported: 0,
    skipped: 0,
    createdSuppliers: 0,
    activatedOrCreatedPosts: new Set(),
    duplicates: [],
  };

  for (const row of dataRows) {
    const date = parseDate(row[1]);
    const supplierName = String(row[5] ?? "").trim();
    const note = String(row[3] ?? "").trim();
    const amount = parseAmount(row[4]);
    const rawPost = String(row[2] ?? "").trim();

    const { supplier, created } = await ensureSupplier(organization.id, supplierName);
    if (created) {
      summary.createdSuppliers += 1;
    }

    let postCode =
      getSuggestedPostCode(supplierName, note) ||
      (rawPost === "6139" ? "6131" : rawPost === "6111/2" ? "6112" : normalizeText(rawPost).replace(/[^0-9]/g, ""));

    if (!postCode) {
      throw new Error(`Impossible de determiner le poste pour ${supplierName} / ${note}`);
    }

    const accountingPostId = await ensurePost(organization.id, postCode);
    summary.activatedOrCreatedPosts.add(postCode);

    const existing = await prisma.payment.findFirst({
      where: {
        organizationId: organization.id,
        supplierId: supplier.id,
        amount,
        date,
        note: note || null,
      },
      select: { id: true, paymentNumber: true },
    });

    if (existing) {
      summary.skipped += 1;
      summary.duplicates.push(existing.paymentNumber);
      continue;
    }

    await prisma.fiscalYear.upsert({
      where: {
        organizationId_year: {
          organizationId: organization.id,
          year: date.getUTCFullYear(),
        },
      },
      update: {},
      create: {
        organizationId: organization.id,
        year: date.getUTCFullYear(),
        startsAt: new Date(Date.UTC(date.getUTCFullYear(), 0, 1)),
        endsAt: new Date(Date.UTC(date.getUTCFullYear(), 11, 31)),
      },
    });

    await prisma.payment.create({
      data: {
        organizationId: organization.id,
        supplierId: supplier.id,
        accountingPostId,
        method: "CASH",
        amount,
        date,
        note: note || null,
        paymentNumber: nextPaymentNumber,
        attachments: [],
      },
    });

    nextPaymentNumber += 1;
    summary.imported += 1;
  }

  console.log(
    JSON.stringify(
      {
        ...summary,
        activatedOrCreatedPosts: Array.from(summary.activatedOrCreatedPosts).sort(),
      },
      null,
      2,
    ),
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

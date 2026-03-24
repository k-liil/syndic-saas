import { PostType, PrismaClient } from "@prisma/client";

type PrismaLike = {
  organization: PrismaClient["organization"];
  accountingPost: PrismaClient["accountingPost"];
};

export const DEFAULT_ACCOUNTING_POST_SOURCE_SLUG = "cit-intellak-ii";

export const DEFAULT_ACCOUNTING_POST_TEMPLATES = [
  { code: "611", name: "Achats de matieres et fournitures", postType: PostType.CHARGE, note: "" },
  { code: "6111", name: "Eau", postType: PostType.CHARGE, note: "" },
  { code: "6112", name: "Electricite", postType: PostType.CHARGE, note: "" },
  { code: "6113", name: "Chauffage, energie et combustibles", postType: PostType.CHARGE, note: "" },
  { code: "6114", name: "Achats produits d'entretien et petits equipements", postType: PostType.CHARGE, note: "" },
  { code: "6115", name: "Petit materiel", postType: PostType.CHARGE, note: "" },
  { code: "6116", name: "Fournitures", postType: PostType.CHARGE, note: "" },
  { code: "612", name: "Autres charges", postType: PostType.CHARGE, note: "" },
  { code: "6121", name: "Remboursement d'emprunts", postType: PostType.CHARGE, note: "" },
  { code: "613", name: "Achats de services exterieurs", postType: PostType.CHARGE, note: "" },
  { code: "6131", name: "Nettoyage des locaux", postType: PostType.CHARGE, note: "" },
  { code: "6132", name: "Locations immobilieres", postType: PostType.CHARGE, note: "" },
  { code: "6133", name: "Locations mobilieres", postType: PostType.CHARGE, note: "" },
  { code: "6134", name: "Contrats de maintenance", postType: PostType.CHARGE, note: "" },
  { code: "6135", name: "Entretien et petites reparations", postType: PostType.CHARGE, note: "" },
  { code: "6136", name: "Primes d'assurances", postType: PostType.CHARGE, note: "" },
  { code: "6137", name: "Remunerations du syndic sur gestion copropriet", postType: PostType.CHARGE, note: "" },
  { code: "6138", name: "Autres remunerations", postType: PostType.CHARGE, note: "" },
  { code: "614", name: "Autres services exterieurs", postType: PostType.CHARGE, note: "" },
  { code: "6140", name: "Frais postaux", postType: PostType.CHARGE, note: "" },
  { code: "6141", name: "Frais bancaires", postType: PostType.CHARGE, note: "" },
  { code: "6142", name: "Honoraires", postType: PostType.CHARGE, note: "" },
  { code: "6143", name: "Autres charges", postType: PostType.CHARGE, note: "" },
  { code: "6144", name: "Charges d'interets", postType: PostType.CHARGE, note: "" },
  { code: "616", name: "Impot - taxes et versements assimiles", postType: PostType.CHARGE, note: "" },
  { code: "6161", name: "Impot et taxes", postType: PostType.CHARGE, note: "" },
  { code: "617", name: "Frais de personnel", postType: PostType.CHARGE, note: "" },
  { code: "6171", name: "Salaires", postType: PostType.CHARGE, note: "" },
  { code: "6172", name: "Charges sociales", postType: PostType.CHARGE, note: "" },
  { code: "6173", name: "Autres (medecine du travail, mutuelles, etc)", postType: PostType.CHARGE, note: "" },
  { code: "6174", name: "Assurance accident de travail", postType: PostType.CHARGE, note: "" },
  { code: "651", name: "Charges pour travaux et operations non courantes", postType: PostType.CHARGE, note: "" },
  { code: "6511", name: "Travaux decides par l'assemblee generale", postType: PostType.CHARGE, note: "" },
  { code: "6512", name: "Travaux urgents", postType: PostType.CHARGE, note: "" },
  { code: "6513", name: "Etudes techniques, diagnostic, consultation", postType: PostType.CHARGE, note: "" },
  { code: "6514", name: "Pertes sur creances irrecouvrables", postType: PostType.CHARGE, note: "" },
  { code: "6515", name: "Charges non courantes", postType: PostType.CHARGE, note: "" },
  { code: "691", name: "Dotations aux depreciations sur creances douteuses", postType: PostType.CHARGE, note: "" },
  { code: "711", name: "Appels de fonds", postType: PostType.PRODUCT, note: "" },
  { code: "7111", name: "Provisions sur operations courantes", postType: PostType.PRODUCT, note: "" },
  { code: "7112", name: "Provisions sur travaux", postType: PostType.PRODUCT, note: "" },
  { code: "7113", name: "Avances", postType: PostType.PRODUCT, note: "" },
  { code: "712", name: "Autres produits", postType: PostType.PRODUCT, note: "" },
  { code: "7121", name: "Emprunts", postType: PostType.PRODUCT, note: "" },
  { code: "7122", name: "Subventions", postType: PostType.PRODUCT, note: "" },
  { code: "7123", name: "Indemnites d'assurances", postType: PostType.PRODUCT, note: "" },
  { code: "7124", name: "Produits divers", postType: PostType.PRODUCT, note: "" },
  { code: "7125", name: "Produits financiers", postType: PostType.PRODUCT, note: "" },
  { code: "751", name: "Produits pour travaux et operations non courantes", postType: PostType.PRODUCT, note: "" },
  { code: "7511", name: "Autres produits decides par l'assemblee generale", postType: PostType.PRODUCT, note: "" },
  { code: "7512", name: "Produits de cession recus", postType: PostType.PRODUCT, note: "" },
  { code: "7513", name: "Dons recus", postType: PostType.PRODUCT, note: "" },
  { code: "7514", name: "Entrees sur creances soldees", postType: PostType.PRODUCT, note: "" },
  { code: "7515", name: "Autres produits non courants", postType: PostType.PRODUCT, note: "" },
  { code: "791", name: "Reprises de depreciations sur creances douteuses", postType: PostType.PRODUCT, note: "" },
] as const;

type AccountingPostTemplate = (typeof DEFAULT_ACCOUNTING_POST_TEMPLATES)[number];

async function loadSourceTemplates(
  prisma: PrismaLike,
  sourceOrganizationSlug: string,
): Promise<AccountingPostTemplate[]> {
  const sourceOrg = await prisma.organization.findUnique({
    where: { slug: sourceOrganizationSlug },
    select: {
      accountingPosts: {
        select: {
          code: true,
          name: true,
          note: true,
          postType: true,
        },
        orderBy: { code: "asc" },
      },
    },
  });

  if (!sourceOrg || sourceOrg.accountingPosts.length === 0) {
    return [...DEFAULT_ACCOUNTING_POST_TEMPLATES];
  }

  return sourceOrg.accountingPosts.map((post) => ({
    code: post.code,
    name: post.name,
    note: post.note ?? "",
    postType: post.postType,
  }));
}

export async function ensureOrganizationAccountingPosts(
  prisma: PrismaLike,
  organizationId: string,
  sourceOrganizationSlug = DEFAULT_ACCOUNTING_POST_SOURCE_SLUG,
) {
  const [templates, existingPosts] = await Promise.all([
    loadSourceTemplates(prisma, sourceOrganizationSlug),
    prisma.accountingPost.findMany({
      where: { organizationId },
      select: { code: true },
    }),
  ]);

  const existingCodes = new Set(existingPosts.map((post) => post.code));
  const missingPosts = templates.filter((post) => !existingCodes.has(post.code));

  if (missingPosts.length === 0) {
    return { createdCount: 0 };
  }

  await prisma.accountingPost.createMany({
    data: missingPosts.map((post) => ({
      organizationId,
      code: post.code,
      name: post.name,
      note: post.note,
      postType: post.postType,
      isActive: false,
    })),
    skipDuplicates: true,
  });

  return { createdCount: missingPosts.length };
}

export function normalizePaymentText(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function includesOneOf(text: string, terms: string[]) {
  return terms.some((term) => text.includes(term));
}

export function getSuggestedPaymentPostCode(
  supplierName: string,
  note: string | null | undefined,
) {
  const supplier = normalizePaymentText(supplierName);
  const text = normalizePaymentText(note);

  if (supplier === "redal") {
    if (text.includes("consommation")) return "6111";
    if (text.includes("pourboire")) return "6191";
    return "6111";
  }

  if (supplier === "inwi") return "6114";
  if (supplier === "banque") return "6132";
  if (supplier.includes("gestionnaire du syndic")) return "6131";
  if (supplier === "cb gest") return "6131";
  if (supplier === "cnss") return "6172";

  if (supplier === "personnel") {
    if (includesOneOf(text, ["souliers", "gants", "seau"])) return "6142";
    return "6171";
  }

  if (supplier === "plombier") return "6135";

  if (
    supplier === "electricien" ||
    supplier === "deaud concept" ||
    supplier.includes("technicien independant") ||
    supplier.includes("agent onee")
  ) {
    if (includesOneOf(text, ["ampoule", "pannel", "panel", "eclairage", "fusible", "detecteur", "horloge", "lampe"])) {
      return "6135";
    }
    return "6135";
  }

  if (supplier.includes("beka ascenseur")) {
    return "6135";
  }

  if (supplier.includes("prestataire prive")) {
    if (includesOneOf(text, ["dechets verts", "elagage", "jardin", "taille", "fil de coupe"])) {
      return "6122";
    }
    return "6122";
  }

  if (supplier.includes("srmi") || supplier.includes("electricite")) {
    return "6112";
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

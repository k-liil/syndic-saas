const fs = require('fs');
const path = 'c:/Users/kferhat/OneDrive - DXC Production/Personal/Dev/syndic-mvp/src/app/(app)/dashboard/page.tsx';
let content = fs.readFileSync(path, 'utf8');

const replacements = [
  ["Aucun exercice selectionne", "Aucun exercice sélectionné"],
  ["Creez ou selectionnez un exercice fiscal depuis l'en-tete", "Créez ou sélectionnez un exercice fiscal depuis l'en-tête"],
  ["Suivez la tresorerie, les coproprietaires payeurs et la repartition des depenses", "Suivez la trésorerie, les copropriétaires payeurs et la répartition des dépenses"],
  ["Coproprietaires payes", "Copropriétaires payés"],
  ["Tresorerie totale", "Trésorerie totale"],
  ["Total encaisse (", "Total encaissé ("],
  ["Total depense (", "Total dépensé ("],
  ["Charges reglees", "Charges réglées"],
  ["Creances en retard (", "Créances en retard ("],
  ["Coproprietaires restant a regulariser", "Copropriétaires restant à régulariser"],
  ["Flux de tresorerie (", "Flux de trésorerie ("],
  ["Encaisse", "Encaissé"],
  ["Depense", "Dépense"],
  ["Solde cumule", "Solde cumulé"],
  ["Janvier demarre", "Janvier démarre"],
  ["Recettes - Depenses", "Recettes - Dépenses"],
  ["Synthese rapide", "Synthèse rapide"],
  ["Total recu", "Total reçu"],
  ["Paiements coproprietaires", "Paiements copropriétaires"],
  ["Taux d'encaissement coproprietaires", "Taux d'encaissement copropriétaires"],
  ["Aucun coproprietaire n'a encore paye", "Aucun copropriétaire n'a encore payé"],
  ["Paye (", "Payé ("],
  ["Non paye (", "Non payé ("],
  ["coproprietaires ont paye", "copropriétaires ont payé"],
  ["Repartition des depenses", "Répartition des dépenses"],
  ["Aucune depense sur cet exercice", "Aucune dépense sur cet exercice"],
  [': "Sans categorie"', ': "Sans catégorie"'],
  ["Generer les cotisations", "Générer les cotisations"],
  ['stroke="#0f172a"', 'stroke="#ef4444"'],
  ['fill="#0f172a"', 'fill="#ef4444"'],
  ['bg-slate-900', 'bg-red-500'],
  ['h-0.5', 'h-1'],
];

replacements.forEach(([oldText, newText]) => {
  content = content.split(oldText).join(newText);
});

// Case variants that might have been missed
content = content.replace(/encaisses/g, "encaissé");
content = content.replace(/depenses/g, "dépenses");

// Fix some specific lowercase cases in code that we shouldn't have changed back but did in previous tools
// Actually encaisses/depenses are keys in chartData, let's keep those keys as they are but change labels.
// Wait, my previous split/join might have changed 'encaisses' key in chartData! 
// Let's reload and be more surgical.

content = fs.readFileSync(path, 'utf8');

// Surgical replacements
content = content.replace("Aucun exercice selectionne", "Aucun exercice sélectionné");
content = content.replace("Creez ou selectionnez un exercice fiscal depuis l'en-tete", "Créez ou sélectionnez un exercice fiscal depuis l'en-tête");
content = content.replace("Suivez la tresorerie, les coproprietaires payeurs et la repartition des depenses", "Suivez la trésorerie, les copropriétaires payeurs et la répartition des dépenses");
content = content.replace("Coproprietaires payes", "Copropriétaires payés");
content = content.replace("Tresorerie totale", "Trésorerie totale");
content = content.replace(/Total encaisse \(/g, "Total encaissé (");
content = content.replace(/Total depense \(/g, "Total dépensé (");
content = content.replace("Charges reglees", "Charges réglées");
content = content.replace(/Creances en retard \(/g, "Créances en retard (");
content = content.replace("Coproprietaires restant a regulariser", "Copropriétaires restant à régulariser");
content = content.replace(/Flux de tresorerie \(/g, "Flux de trésorerie (");
content = content.replace(/"Encaisse"/g, '"Encaissé"');
content = content.replace(/"Depense"/g, '"Dépensé"');
content = content.replace(/"Solde cumule"/g, '"Solde cumulé"');
content = content.replace(/"Encaisse"/g, '"Encaissé"'); // duplicates handled by replace
content = content.replace("Encaisse\r\n", "Encaissé\r\n");
content = content.replace("Depense\r\n", "Dépensé\r\n");
content = content.replace("Solde cumule\r\n", "Solde cumulé\r\n");
content = content.replace("Janvier demarre", "Janvier démarre");
content = content.replace("Recettes - Depenses", "Recettes - Dépenses");
content = content.replace("Synthese rapide", "Synthèse rapide");
content = content.replace("Total recu", "Total reçu");
content = content.replace("Paiements coproprietaires", "Paiements copropriétaires");
content = content.replace("Taux d'encaissement coproprietaires", "Taux d'encaissement copropriétaires");
content = content.replace("Aucun coproprietaire n'a encore paye", "Aucun copropriétaire n'a encore payé");
content = content.replace(/Paye \(/g, "Payé (");
content = content.replace(/Non paye \(/g, "Non payé (");
content = content.replace("coproprietaires ont paye", "copropriétaires ont payé");
content = content.replace("Repartition des depenses", "Répartition des dépenses");
content = content.replace("Aucune depense sur cet exercice", "Aucune dépense sur cet exercice");
content = content.replace(': "Sans categorie"', ': "Sans catégorie"');
content = content.replace("Generer les cotisations", "Générer les cotisations");

// Visuals
content = content.replace('stroke="#0f172a"', 'stroke="#ef4444"');
content = content.replace('fill="#0f172a"', 'fill="#ef4444"');
content = content.replace('bg-slate-900', 'bg-red-500');
content = content.replace('h-0.5', 'h-1');

fs.writeFileSync(path, content);
console.log('Replacements done surgeons style.');

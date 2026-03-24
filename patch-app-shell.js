const fs = require('fs');
const path = 'src/components/AppShell.tsx';
let txt = fs.readFileSync(path, 'utf-8');
const search = '<main className="min-h-0 flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>';
const replace = `<main className="min-h-0 flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            {orgLoading ? (
              <div className="flex h-full items-center justify-center p-8">
                <div className="animate-pulse text-sm text-slate-400">Chargement de l'environnement...</div>
              </div>
            ) : (
              children
            )}
          </main>`;
txt = txt.replace(search, replace);
fs.writeFileSync(path, txt);
console.log("Patched AppShell children.");

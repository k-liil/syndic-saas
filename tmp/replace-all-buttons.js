const fs = require('fs');
const pt = require('path');

const rootDir = pt.join(__dirname, '..', 'src');

function walk(d) {
  let res = [];
  fs.readdirSync(d).forEach(f => {
    const p = pt.join(d, f);
    if(fs.statSync(p).isDirectory()) res = res.concat(walk(p));
    else if(p.endsWith('.tsx') || p.endsWith('.css')) res.push(p);
  });
  return res;
}

const allFiles = walk(pt.join(rootDir, 'app', '(app)')).concat(walk(pt.join(rootDir, 'components')));

let count = 0;
allFiles.forEach(file => {
  let original = fs.readFileSync(file, 'utf8');
  let content = original;

  // Global replacements globally to ensure all buttons and identical UI elements reflect it
  content = content.replace(/bg-zinc-900(?!\/)/g, 'bg-blue-600 hover:bg-blue-700');
  
  // Replace extremely rounded borders
  content = content.replace(/rounded-2xl/g, 'rounded-md');
  content = content.replace(/rounded-xl/g, 'rounded-md');
  content = content.replace(/rounded-full/g, 'rounded-md');

  // Fix up btn-brand text with icons and spacing
  // First, find lines with {canEdit ? (<button ...> + Ajouter )} etc
  // We'll use regex for "+ [word]"
  let addedPlus = false;
  let addedUpload = false;

  content = content.replace(/>\s*\+\s*([a-zA-ZÀ-ÿ0-9\s]+)\s*<\/button>/g, (match, word) => {
    addedPlus = true;
    return `>\n<PlusCircle className="h-4 w-4" /> ${word.trim()}\n</button>`;
  });

  // Importer
  content = content.replace(/>\s*(Importer)\s*<\/button>/g, (match, word) => {
    addedUpload = true;
    return `>\n<Upload className="h-4 w-4" /> ${word.trim()}\n</button>`;
  });

  // Now ensure that any button that got an icon has "flex items-center gap-2"
  // It's a bit tricky with Regex so let's do a heuristic search: if `<Upload ` or `<PlusCircle ` is inside `<button ...>`, ensure it has flex and gap-2
  // We'll just look for `<button className="([^"]*)"[^>]*>\s*(<PlusCircle|<Upload)`
  content = content.replace(/<button\s+([^>]*className=")([^"]*)(")/g, (match, p1, p2, p3) => {
    if (!p2.includes('flex')) {
      p2 = 'flex items-center gap-2 ' + p2;
    } else if (!p2.includes('gap-')) {
      p2 = p2 + ' gap-2';
    }
    return `<button ${p1}${p2}${p3}`;
  });

  // Add Lucide imports
  if (addedPlus || addedUpload) {
    let importsToAdd = [];
    if (addedPlus && !content.includes('PlusCircle')) importsToAdd.push('PlusCircle');
    if (addedUpload && !content.includes('Upload')) importsToAdd.push('Upload');

    if (importsToAdd.length > 0) {
      if (content.includes('lucide-react')) {
        const rx = /import\s*\{([^}]+)\}\s*from\s*["']lucide-react["']/;
        content = content.replace(rx, (m, g1) => {
          return `import { ${g1.trim()}, ${importsToAdd.join(', ')} } from "lucide-react"`;
        });
      } else {
        const importStr = `import { ${importsToAdd.join(', ')} } from "lucide-react";\n`;
        const lastReactImport = content.lastIndexOf('import React');
        if (lastReactImport !== -1) {
           const endOfLine = content.indexOf('\n', lastReactImport);
           content = content.slice(0, endOfLine + 1) + importStr + content.slice(endOfLine + 1);
        } else {
           const lastImportIndex = content.lastIndexOf('import ');
           if (lastImportIndex !== -1) {
             const endOfLine = content.indexOf('\n', lastImportIndex);
             content = content.slice(0, endOfLine + 1) + importStr + content.slice(endOfLine + 1);
           } else {
             content = importStr + content;
           }
        }
      }
    }
  }

  // Also replace `inline-flex` with `flex items-center gap-3` for containers holding These buttons if they exist
  // We'll just ignore for now, the buttons themselves having gaps means we might need a container gap.
  // We can just rely on the existing container classes which might be inline-flex and we'll change it to inline-flex gap-3.
  if (content.match(/inline-flex(?![a-z])/)) {
    content = content.replace(/inline-flex(?!\s+gap|-[a-z])/g, 'inline-flex gap-3');
  }

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    count++;
    console.log('Modified', file.replace(rootDir, 'src'));
  }
});
console.log(`Total modified: ${count}`);

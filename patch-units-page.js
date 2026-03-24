const fs = require('fs');

const path = 'src/app/(app)/setup/units/page.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Interface
content = content.replace(
  '  building: Building | null;\n  surface: number | null;',
  '  building: Building | null;\n  floor: number | null;\n  surface: number | null;'
);

// 2. State
content = content.replace(
  '  const [reference, setReference] = useState("");\n  const [surface, setSurface] = useState<string>("");',
  '  const [reference, setReference] = useState("");\n  const [floor, setFloor] = useState<string>("");\n  const [surface, setSurface] = useState<string>("");'
);

// 3. Reset 1
content = content.replace(
  '    setReference("");\n    setSurface("");',
  '    setReference("");\n    setFloor("");\n    setSurface("");'
);

// 4. Reset 2
content = content.replace(
  '    setReference(lot.reference ?? "");\n    setSurface(lot.surface?.toString() ?? "");',
  '    setReference(lot.reference ?? "");\n    setFloor(lot.floor?.toString() ?? "");\n    setSurface(lot.surface?.toString() ?? "");'
);

// 5. Parse
content = content.replace(
  '      const surfaceNum = surface.trim() ? Number(surface) : null;',
  '      const surfaceNum = surface.trim() ? Number(surface) : null;\n      const floorNum = floor.trim() ? Number(floor) : null;'
);

// 6. Payload 1 (PATCH)
content = content.replace(
  '            type: apiType,\n            ...(type === "APARTMENT" ? { buildingId } : { buildingId: null }),\n            surface: surfaceNum,',
  '            type: apiType,\n            floor: type === "APARTMENT" ? floorNum : null,\n            ...(type === "APARTMENT" ? { buildingId } : { buildingId: null }),\n            surface: surfaceNum,'
);

// 7. Payload 2 (POST)
content = content.replace(
  '            type: apiType,\n            ...(type === "APARTMENT" ? { buildingId } : {}),\n            surface: surfaceNum,',
  '            type: apiType,\n            floor: type === "APARTMENT" ? floorNum : null,\n            ...(type === "APARTMENT" ? { buildingId } : {}),\n            surface: surfaceNum,'
);

// 8. Table Headers
content = content.replace(
  '            <TH>Bâtiment</TH>\n            <TH className="text-right">Actions</TH>',
  '            <TH>Bâtiment</TH>\n            <TH>Étage</TH>\n            <TH className="text-right">Actions</TH>'
);

// 9. Table empty cells
content = content.replace(
  '              <TD />\n              <TD />\n              <TD />\n            </TR>',
  '              <TD />\n              <TD />\n              <TD />\n              <TD />\n            </TR>'
);

// 10. Table display
content = content.replace(
  '                <TD className="text-zinc-600">{l.building?.name ?? "—"}</TD>\n\n                <TD>',
  '                <TD className="text-zinc-600">{l.building?.name ?? "—"}</TD>\n\n                <TD className="text-zinc-600">{l.type === "APARTMENT" && l.floor !== null && l.floor !== undefined ? l.floor : "—"}</TD>\n\n                <TD>'
);

// 11. Form UI Input
content = content.replace(
  `              {type === "APARTMENT" ? (
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Bâtiment *</label>
                  <select
                    className="h-10 rounded-xl border border-zinc-200 bg-white px-3"
                    value={buildingId}
                    onChange={(e) => setBuildingId(e.target.value)}
                  >
                    {buildings.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (`,
  `              {type === "APARTMENT" ? (
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">Bâtiment *</label>
                    <select
                      className="h-10 rounded-xl border border-zinc-200 bg-white px-3"
                      value={buildingId}
                      onChange={(e) => setBuildingId(e.target.value)}
                    >
                      {buildings.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">Étage</label>
                    <input
                      className="h-10 rounded-xl border border-zinc-200 px-3"
                      value={floor}
                      onChange={(e) => setFloor(e.target.value)}
                      placeholder="Ex: 3"
                      inputMode="numeric"
                    />
                  </div>
                </div>
              ) : (`
);

fs.writeFileSync(path, content);
console.log('Successfully patched units page!');

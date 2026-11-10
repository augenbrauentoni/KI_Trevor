/**
 * Test für API /api/task/start und Structured Steps
 */
const resp = await fetch('http://localhost:3000/api/task/start', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ prompt: 'Erstelle einen Supabase Auth Flow mit Role-Based Access Control und React UI' })
});

const data = await resp.json();
console.log('API Response success:', data.success);
if (!data.success) {
  console.error('Error:', data.error);
  process.exit(1);
}

const steps = data.task?.checkpoint_data?.structured_steps;
console.log(`Anzahl strukturierter Maßnahmen: ${steps?.length || 0}`);
if (!steps || steps.length === 0) {
  console.error('FEHLER: Keine structured_steps im Task gefunden!');
  process.exit(1);
}

steps.forEach(s => {
  console.log(`[${s.id}] ${s.title}`);
  console.log(`   Ziel: ${s.target_file} | Dept: ${s.department} | Enabled: ${s.enabled}`);
});

console.log('\n[PASS] API erzeugt echte strukturierte Maßnahmen-Roadmap!');

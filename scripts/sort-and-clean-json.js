const fs = require('fs');
const path = require('path');

const files = ['src/data/types.json', 'src/data/scopes.json'];

for (const file of files) {
  const filePath = path.join(process.cwd(), file);

  let data;
  try {
    data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (err) {
    console.error(`⚠️ Failed to read or parse ${file}: ${err.message}`);
    continue;
  }

  if (!Array.isArray(data)) {
    console.error(`⚠️  ${file} is not an array. Skipping.`);
    continue;
  }

  data.sort((a, b) => String(a).localeCompare(String(b)));
  console.log(`🎉 Sorted ${file} successfully`);

  const seen = new Set();
  const duplicatesMap = new Map();

  const cleanedData = data.filter((val, idx) => {
    const lineNumber = idx + 2;
    if (seen.has(val)) {
      if (!duplicatesMap.has(val)) duplicatesMap.set(val, []);
      duplicatesMap.get(val).push(lineNumber);
      return false;
    }
    seen.add(val);
    return true;
  });

  for (const [val, lines] of duplicatesMap.entries()) {
    console.info(
      `🌱 Removed duplicate "${val}" at ${lines.length === 1 ? 'line' : 'lines'} ${lines.join(', ')}`,
    );
  }

  fs.writeFileSync(
    filePath,
    JSON.stringify(cleanedData, null, 2) + '\n',
    'utf8',
  );
}

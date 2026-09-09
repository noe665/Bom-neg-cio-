const fs = require('fs');
let content = fs.readFileSync('src/lib/forms.ts', 'utf8');

content = content.replace(
  `if (!createRes.ok) {
    throw new Error('Failed to create form');
  }`,
  `if (!createRes.ok) {
    const errText = await createRes.text();
    console.error('Create Form Error:', errText);
    throw new Error('Failed to create form: ' + errText);
  }`
);

content = content.replace(
  `if (!updateRes.ok) {
    throw new Error('Failed to update form');
  }`,
  `if (!updateRes.ok) {
    const errText = await updateRes.text();
    console.error('Update Form Error:', errText);
    throw new Error('Failed to update form: ' + errText);
  }`
);

fs.writeFileSync('src/lib/forms.ts', content);

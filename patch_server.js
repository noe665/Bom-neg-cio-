const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf-8');

code = code.replace(
  "model: 'gemini-2.5-flash',\n              contents: prompt,",
  "model: 'gemini-2.5-flash',\n              contents: prompt,\n              config: { responseMimeType: 'application/json' }"
);

code = code.replace(
  "model: 'gemini-2.5-flash',\n              contents: prompt,",
  "model: 'gemini-2.5-flash',\n              contents: prompt,\n              config: { responseMimeType: 'application/json' }"
);

code = code.replace(
  "model: 'gemini-2.5-flash',\n              contents: prompt,",
  "model: 'gemini-2.5-flash',\n              contents: prompt,\n              config: { responseMimeType: 'application/json' }"
);

fs.writeFileSync('server.ts', code);

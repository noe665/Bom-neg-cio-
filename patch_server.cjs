const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf-8');

// The endpoints that expect JSON are /api/suggest-estimates and /api/generate-form-questions.
// Let's just use string replacement carefully.
// Find suggest-estimates block:
let suggestStart = code.indexOf('/api/suggest-estimates');
if (suggestStart > -1) {
  let generateCallStart = code.indexOf("model: 'gemini-2.5-flash',", suggestStart);
  if (generateCallStart > -1) {
    let before = code.substring(0, generateCallStart);
    let after = code.substring(generateCallStart);
    after = after.replace("contents: prompt,", "contents: prompt,\n              config: { responseMimeType: 'application/json' },");
    code = before + after;
  }
}

let formStart = code.indexOf('/api/generate-form-questions');
if (formStart > -1) {
  let generateCallStart = code.indexOf("model: 'gemini-2.5-flash',", formStart);
  if (generateCallStart > -1) {
    let before = code.substring(0, generateCallStart);
    let after = code.substring(generateCallStart);
    after = after.replace("contents: prompt,", "contents: prompt,\n              config: { responseMimeType: 'application/json' },");
    code = before + after;
  }
}

fs.writeFileSync('server.ts', code);

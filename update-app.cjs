const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

// 1. Change marketQuestions type
code = code.replace(
  "const [marketQuestions, setMarketQuestions] = useState<string[]>([]);",
  "const [marketQuestions, setMarketQuestions] = useState<FormQuestion[]>([]);"
);

// 2. Change hardcoded questions and parsing in handleGenerateForm
const oldQuestionsArray = `let questions = [
        'Qual o seu nível de interesse nesta ideia?',
        'Quanto você estaria disposto a pagar por isso?',
        'Quais funcionalidades não podem faltar?'
      ];`;
const newQuestionsArray = `let questions: FormQuestion[] = [
        { title: 'Qual o seu nível de interesse nesta ideia?', type: 'radio', options: ['Muito interessado', 'Interessado', 'Pouco interessado', 'Nenhum interesse'] },
        { title: 'Quanto você estaria disposto a pagar por isso?', type: 'text' },
        { title: 'Quais funcionalidades não podem faltar?', type: 'textarea' }
      ];`;
code = code.replace(oldQuestionsArray, newQuestionsArray);

// 3. Update Modal Rendering to look like a form
const oldModalRender = `<div className="space-y-4 mb-6">
                {marketQuestions.map((q, idx) => (
                  <div key={idx} className="bg-[#0a0763] p-4 rounded-xl border border-[#140242]">
                    <p className="text-white text-sm font-medium">{idx + 1}. {q}</p>
                  </div>
                ))}
              </div>`;

const newModalRender = `<div className="space-y-6 mb-6">
                {marketQuestions.map((q, idx) => (
                  <div key={idx} className="bg-[#0a0763] p-6 rounded-xl border border-[#140242]">
                    <p className="text-white text-base font-bold mb-4">{idx + 1}. {q.title}</p>
                    
                    {q.type === 'radio' && q.options && (
                      <div className="space-y-3">
                        {q.options.map((opt, i) => (
                          <label key={i} className="flex items-center space-x-3 text-slate-300">
                            <input type="radio" name={\`question-\${idx}\`} className="form-radio h-4 w-4 text-blue-600 bg-slate-800 border-slate-600 focus:ring-blue-500 focus:ring-offset-slate-900" />
                            <span>{opt}</span>
                          </label>
                        ))}
                      </div>
                    )}

                    {q.type === 'checkbox' && q.options && (
                      <div className="space-y-3">
                        {q.options.map((opt, i) => (
                          <label key={i} className="flex items-center space-x-3 text-slate-300">
                            <input type="checkbox" className="form-checkbox h-4 w-4 rounded text-blue-600 bg-slate-800 border-slate-600 focus:ring-blue-500 focus:ring-offset-slate-900" />
                            <span>{opt}</span>
                          </label>
                        ))}
                      </div>
                    )}

                    {(q.type === 'text') && (
                      <input type="text" placeholder="Sua resposta..." className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500" />
                    )}

                    {(q.type === 'textarea') && (
                      <textarea rows={3} placeholder="Sua resposta detalhada..." className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"></textarea>
                    )}
                  </div>
                ))}
              </div>`;
code = code.replace(oldModalRender, newModalRender);

// 4. Update the text sharing generator
const oldTextFormatter = `const text = marketQuestions.map((q, i) => \`\${i + 1}. \${q}\`).join('\\n\\n');`;
const newTextFormatter = `const text = marketQuestions.map((q, i) => {
                      let str = \`\${i + 1}. \${q.title}\`;
                      if (q.options && q.options.length > 0) {
                        str += '\\n' + q.options.map(opt => \`  - [ ] \${opt}\`).join('\\n');
                      } else {
                        str += '\\n  ________________________________________';
                      }
                      return str;
                    }).join('\\n\\n');`;

// Because oldTextFormatter appears twice (WhatsApp and Copiar):
code = code.replaceAll(oldTextFormatter, newTextFormatter);

// 5. Update the modal top message description
code = code.replace(
  "Copie as perguntas abaixo e utilize-as na sua plataforma preferida",
  "Abaixo está a pré-visualização do seu formulário. Copie as perguntas formatadas e utilize-as na sua plataforma preferida"
);

fs.writeFileSync('src/App.tsx', code);

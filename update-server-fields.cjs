const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf-8');

code = code.replace(
`- Nome: \${projectData.name}
- Tipo: \${projectData.type}
- Visão: \${projectData.vision}`,
`- Nome: \${projectData.name}
- Autor: \${projectData.authorName || 'Não informado'}
- Tipo: \${projectData.type}
- Produto Específico: \${projectData.specificProductName || 'N/A'}
- Localização: \${projectData.location || 'Não informada'}
- Visão: \${projectData.vision}`
);

// Also do for the Business Plan prompt (Tipologia vs Tipo)
code = code.replace(
`- Nome: \${projectData.name}
- Tipologia: \${projectData.type}
- Visão: \${projectData.vision}`,
`- Nome: \${projectData.name}
- Autor: \${projectData.authorName || 'Não informado'}
- Tipologia: \${projectData.type}
- Produto Específico: \${projectData.specificProductName || 'N/A'}
- Localização: \${projectData.location || 'Não informada'}
- Visão: \${projectData.vision}`
);


fs.writeFileSync('server.ts', code);

const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

const oldFuncStart = code.indexOf("const downloadBusinessPlanPDF = async () => {");
const oldFuncEnd = code.indexOf("const downloadReport = async () => {");
const oldFunc = code.substring(oldFuncStart, oldFuncEnd);

const newFunc = `const downloadBusinessPlanPDF = async () => {
    if (!generatedPlan) return;
    const doc = new jsPDF({ format: 'a4' });
    
    const img = new Image();
    img.src = logoImg;
    await new Promise((resolve) => {
      img.onload = resolve;
      img.onerror = resolve; 
    });

    const margin = 25.4; 
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const textWidth = pageWidth - (margin * 2);

    // --- CAPA ---
    if (img.complete && img.naturalWidth > 0) {
      doc.addImage(img, 'JPEG', (pageWidth - 40) / 2, 30, 40, 40);
    }

    doc.setFont("times", "bold");
    doc.setFontSize(20);
    const title = \`Plano de Negócio "\${projectData.name || 'Projeto'}"\`;
    doc.text(title, pageWidth / 2, 100, { align: 'center' });

    doc.setFont("times", "normal");
    doc.setFontSize(14);
    const author = projectData.authorName || 'Autor não informado';
    
    // Split author to multiple lines if needed and center
    const authorLines = doc.splitTextToSize(\`Autor(es): \${author}\`, textWidth);
    let authorY = 130;
    authorLines.forEach((line: string) => {
      doc.text(line, pageWidth / 2, authorY, { align: 'center' });
      authorY += 7;
    });

    authorY += 5;
    doc.text("__________________________________", pageWidth / 2, authorY, { align: 'center' });
    doc.setFontSize(10);
    doc.text("Assinatura", pageWidth / 2, authorY + 5, { align: 'center' });

    // Desenho / Quadro da Visão e Missão para dar ênfase
    doc.setDrawColor(20, 2, 66); // Dark blue/purple
    doc.setFillColor(245, 245, 255);
    doc.setLineWidth(0.5);
    doc.roundedRect(margin, 170, textWidth, 60, 3, 3, 'FD');
    
    doc.setFontSize(12);
    doc.setFont("times", "bolditalic");
    doc.text("A Nossa Visão:", margin + 5, 180);
    doc.setFont("times", "italic");
    const visionLines = doc.splitTextToSize(projectData.vision || 'Não especificada', textWidth - 10);
    doc.text(visionLines.slice(0, 3), margin + 5, 188); // limit to 3 lines

    doc.setFont("times", "bolditalic");
    doc.text("A Nossa Missão:", margin + 5, 208);
    doc.setFont("times", "italic");
    const missionLines = doc.splitTextToSize(projectData.mission || 'Não especificada', textWidth - 10);
    doc.text(missionLines.slice(0, 3), margin + 5, 216); 

    doc.setFont("times", "normal");
    doc.setFontSize(12);
    const dateLoc = \`\${projectData.location || 'Local não informado'}, \${new Date().toLocaleDateString('pt-BR')}\`;
    doc.text(dateLoc, pageWidth / 2, pageHeight - 30, { align: 'center' });

    // --- FUNÇÃO PARA HEADER (Logotipo e Numeração) ---
    let pageNum = 2;
    const addHeader = () => {
       if (img.complete && img.naturalWidth > 0) {
         doc.addImage(img, 'JPEG', margin, 10, 15, 15);
       }
       doc.setFont("times", "normal");
       doc.setFontSize(10);
       doc.text(String(pageNum), pageWidth - margin, 15, { align: 'right' });
       doc.setFontSize(12);
    };

    // --- PÁGINA 2: INTRODUÇÃO ---
    doc.addPage();
    addHeader();
    let yPos = 40;

    doc.setFont("times", "bold");
    doc.setFontSize(16);
    doc.text("Introdução", margin, yPos);
    yPos += 15;
    
    doc.setFontSize(12);
    doc.setFont("times", "normal");
    const introText = \`Este documento apresenta o plano de negócio para o projeto "\${projectData.name}", estruturado segundo o modelo de "\${projectData.type}". O relatório gerado tem como objetivo fornecer uma visão estratégica e detalhada, orientando os próximos passos, a alocação de recursos e as perspectivas de crescimento do negócio no seu mercado de atuação.\`;
    
    const introLines = doc.splitTextToSize(introText, textWidth);
    introLines.forEach((line: string, idx: number) => {
       doc.text(line, margin, yPos, { maxWidth: textWidth, align: (idx === introLines.length - 1) ? 'left' : 'justify' });
       yPos += 7.5; // Espaçamento 1.5
    });

    // --- PÁGINAS SEGUINTES: CONTEÚDO DO PLANO ---
    doc.addPage();
    pageNum++;
    addHeader();
    yPos = 40;

    const paragraphs = generatedPlan.split('\\n').map(p => p.trim()).filter(p => p.length > 0);
    const lineSpacing = 7.5; // ~1.5 spacing for 12pt font

    paragraphs.forEach(para => {
      let isHeading = false;
      let textToPrint = para;
      
      if (textToPrint.startsWith('#')) {
        isHeading = true;
        textToPrint = textToPrint.replace(/#/g, '').trim();
        doc.setFont("times", "bold");
        doc.setFontSize(14);
      } else if (textToPrint.startsWith('**') && textToPrint.endsWith('**')) {
         isHeading = true;
         textToPrint = textToPrint.replace(/\\*\\*/g, '').trim();
         doc.setFont("times", "bold");
         doc.setFontSize(12);
      } else {
         doc.setFont("times", "normal");
         doc.setFontSize(12);
         textToPrint = textToPrint.replace(/\\*\\*/g, '');
      }

      if (yPos > pageHeight - margin) {
        doc.addPage();
        pageNum++;
        addHeader();
        yPos = 40;
      }

      if (isHeading) {
         doc.text(textToPrint, margin, yPos);
         const split = doc.splitTextToSize(textToPrint, textWidth);
         yPos += split.length * lineSpacing;
      } else {
         // Indent 1.5cm (~15mm)
         const indentSpaces = "               "; 
         const textLines = doc.splitTextToSize(indentSpaces + textToPrint, textWidth);
         
         textLines.forEach((line: string, index: number) => {
             if (yPos > pageHeight - margin) {
                doc.addPage();
                pageNum++;
                addHeader();
                yPos = 40;
             }
             const isLastLine = index === textLines.length - 1;
             doc.text(line, margin, yPos, { maxWidth: textWidth, align: isLastLine ? 'left' : 'justify' });
             yPos += lineSpacing;
         });
      }
      yPos += 5; // space between paragraphs
    });

    doc.save(\`Plano_de_Negocio_\${projectData.name ? projectData.name.replace(/\\s+/g, '_') : 'Projeto'}.pdf\`);
  };

  `;

code = code.replace(oldFunc, newFunc);
fs.writeFileSync('src/App.tsx', code);

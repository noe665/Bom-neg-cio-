const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf8');

const newFunc = `  const downloadSocialProject = async () => {
    setIsGeneratingReport(true);
    try {
      const response = await fetch('/api/generate-social-project', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectData })
      });
      
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      
      const projectText = data.projectText || '';
      const pagesContent = projectText.split('[PAGE_BREAK]').map((p: string) => p.trim());
      
      const doc = new jsPDF({ format: 'a4' });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const marginT = 20; // 2cm
      const marginR = 20; // 2cm
      const marginB = 30; // 3cm
      const marginL = 30; // 3cm
      const textWidth = pageWidth - marginL - marginR;
      
      // Page 1: Cover (Styled like the attached model header)
      doc.setFillColor(38, 38, 38); // Dark gray background for header
      doc.rect(0, 0, pageWidth, 130, 'F');
      
      // Logo (top center, small, watermark opacity)
      doc.setGState(new (doc as any).GState({opacity: 0.15}));
      const logoWidth = 40;
      const logoHeight = 40;
      doc.addImage(logoImg, 'PNG', (pageWidth - logoWidth) / 2, 10, logoWidth, logoHeight);
      doc.setGState(new (doc as any).GState({opacity: 1.0}));
      
      // Yellow badge
      doc.setFillColor(234, 179, 8); // Tailwind yellow-500
      doc.rect(marginL, 40, 48, 7, 'F');
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      doc.text("PROPOSTA DE PROJETO", marginL + 2, 45.2);
      
      // Title
      doc.setFont("helvetica", "bold");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      const titleLines = doc.splitTextToSize(projectData.name ? projectData.name.toUpperCase() : 'PROJETO SOCIAL', textWidth);
      doc.text(titleLines, marginL, 60);
      
      // Subtitle
      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(234, 179, 8); // Yellow
      doc.text(\`Programa / Iniciativa: "\${projectData.name || 'Projeto'}"\`, marginL, 60 + (titleLines.length * 8) + 5);
      
      // Proponent info
      doc.setFontSize(10);
      doc.setTextColor(200, 200, 200);
      doc.text(\`Proponente: \${projectData.investorName || 'Não Informado'} | Foco: \${projectData.targetAudience || 'Impacto Social'}\`, marginL, 60 + (titleLines.length * 8) + 15, { maxWidth: textWidth });
      
      // Date at bottom center
      doc.setTextColor(100, 100, 100);
      const dateStr = new Date().toLocaleDateString('pt-BR');
      doc.setFontSize(11);
      doc.text(dateStr, pageWidth / 2, pageHeight - marginB, { align: 'center' });
      
      // Pages 2, 3, 4, 5
      for (let i = 0; i < 4; i++) {
        doc.addPage();
        const content = pagesContent[i] || '';
        const paragraphs = content.split('\\n').map((p: string) => p.trim()).filter((p: string) => p.length > 0);
        let yPos = marginT;
        const lineSpacing = 6;
        
        paragraphs.forEach((para: string) => {
          let textToPrint = para;
          let isHeading = false;
          let isBullet = textToPrint.startsWith('•') || textToPrint.startsWith('-');
          
          if (textToPrint === textToPrint.toUpperCase() && textToPrint.length > 5 && !isBullet) {
             isHeading = true;
          }
          
          if (yPos > pageHeight - marginB - 10) {
            doc.addPage();
            yPos = marginT;
          }
          
          if (isHeading) {
             yPos += 4; // Extra space before heading
             
             // Draw yellow vertical bar
             doc.setFillColor(234, 179, 8);
             doc.rect(marginL - 4, yPos - 4.5, 1.5, 5.5, 'F');
             
             doc.setFont("helvetica", "bold");
             doc.setFontSize(13);
             doc.setTextColor(0, 0, 0);
             const split = doc.splitTextToSize(textToPrint, textWidth);
             doc.text(split, marginL, yPos);
             yPos += split.length * lineSpacing;
             yPos += 2; // Extra space after heading
          } else {
             doc.setFont("helvetica", "normal");
             doc.setFontSize(11);
             doc.setTextColor(60, 60, 60);
             
             let currentMarginL = marginL;
             let currentTextWidth = textWidth;
             if (isBullet) {
                 currentMarginL = marginL + 5;
                 currentTextWidth = textWidth - 5;
             }
             
             const textLines = doc.splitTextToSize(textToPrint, currentTextWidth);
             textLines.forEach((line: string, index: number) => {
                 if (yPos > pageHeight - marginB) {
                    doc.addPage();
                    yPos = marginT;
                 }
                 const isLastLine = index === textLines.length - 1;
                 doc.text(line, currentMarginL, yPos, { maxWidth: currentTextWidth, align: (isLastLine || isBullet) ? 'left' : 'justify' });
                 yPos += lineSpacing;
             });
             yPos += 3; // space between paragraphs
          }
        });
        
        // Footer on all content pages
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(150, 150, 150);
        doc.text(\`Proposta de Projeto Social — \${projectData.name || 'Projeto'} | Página \${i + 2}\`, pageWidth / 2, pageHeight - 15, { align: 'center' });
      }
      
      doc.save(\`Projeto_Social_\${projectData.name ? projectData.name.replace(/\\s+/g, '_') : 'Projeto'}.pdf\`);
    } catch (error) {
      console.error('Erro ao gerar projeto social:', error);
      alert('Ocorreu um erro ao gerar o documento do projeto. Tente novamente.');
    } finally {
      setIsGeneratingReport(false);
    }
  };`;

const startIndex = content.indexOf('  const downloadSocialProject = async () => {');
const endIndex = content.indexOf('  const downloadReport = async () => {');

if (startIndex !== -1 && endIndex !== -1) {
  content = content.substring(0, startIndex) + newFunc + '\n\n' + content.substring(endIndex);
  fs.writeFileSync('src/App.tsx', content);
  console.log('Replaced downloadSocialProject successfully.');
} else {
  console.log('Could not find function boundaries.');
}

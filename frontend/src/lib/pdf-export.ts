// frontend/src/lib/pdf-export.ts
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export interface PDFExportOptions {
  studentName: string;
  className: string;
  visualization: 'radar' | 'bar' | 'table';
  overallMastery: number;
  masteryData: any[];
  recommendations: any[];
  stats: {
    total_interactions: number;
    correct_interactions: number;
    accuracy: number;
    skills_practiced: number;
  };
}

export async function exportRecommendationsPDF(
  chartElementId: string,
  options: PDFExportOptions
): Promise<void> {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - (2 * margin);
  let yPosition = margin;

  // Hilfsfunktionen
  const addPageIfNeeded = (requiredSpace: number) => {
    if (yPosition + requiredSpace > pageHeight - margin) {
      pdf.addPage();
      yPosition = margin;
    }
  };

  const addText = (text: string, fontSize: number = 12, isBold: boolean = false) => {
    pdf.setFontSize(fontSize);
    if (isBold) {
      pdf.setFont('bold');
    } else {
      pdf.setFont('normal');
    }
    
    const lines = pdf.splitTextToSize(text, contentWidth);
    lines.forEach((line: string) => {
      addPageIfNeeded(10);
      pdf.text(line, margin, yPosition);
      yPosition += fontSize * 0.4;
    });
  };

  // 1. Titel und Header
  addText(`Lernfortschrittsbericht`, 20, true);
  yPosition += 5;
  
  addText(`Schüler: ${options.studentName}`, 14);
  addText(`Klasse: ${options.className}`, 14);
  addText(`Erstellt am: ${new Date().toLocaleDateString('de-DE', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })}`, 12);
  
  yPosition += 10;
  pdf.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 10;

  // 2. Aktivitätsübersicht
  addText('Aktivitätsübersicht', 16, true);
  yPosition += 5;

  const statsData = [
    ['Gesamtaktivität:', `${options.stats.total_interactions} Aufgaben`],
    ['Erfolgsrate:', `${options.stats.accuracy}% (${options.stats.correct_interactions} von ${options.stats.total_interactions} richtig)`],
    ['Geübte Skills:', `${options.stats.skills_practiced}`],
    ['Gesamtfortschritt:', `${Math.round(options.overallMastery * 100)}%`]
  ];

  statsData.forEach(([label, value]) => {
    addPageIfNeeded(10);
    pdf.setFont('bold');
    pdf.text(label, margin, yPosition);
    pdf.setFont('normal');
    pdf.text(value, margin + 45, yPosition);
    yPosition += 7;
  });

  yPosition += 10;

  // 3. Visualisierung (Chart)
  addText('Skill-Beherrschung', 16, true);
  yPosition += 5;

  const chartElement = document.getElementById(chartElementId);
  if (chartElement) {
    try {
      const canvas = await html2canvas(chartElement, {
        scale: 2,
        backgroundColor: '#ffffff',
        logging: false
      });
      
      const imgData = canvas.toDataURL('image/png');
      const imgWidth = contentWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      addPageIfNeeded(imgHeight);
      pdf.addImage(imgData, 'PNG', margin, yPosition, imgWidth, imgHeight);
      yPosition += imgHeight + 10;
    } catch (error) {
      console.error('Fehler beim Rendern des Charts:', error);
      addText('(Visualisierung konnte nicht geladen werden)', 10);
      yPosition += 5;
    }
  }

    if (options.masteryData && options.masteryData.length > 0) {
    addPageIfNeeded(15); // Platz für Titel und einige Zeilen
    yPosition += 8;

    pdf.setFontSize(10);
    
    // Zweispaltiges Layout für die Konfidenzwerte
    const midPoint = margin + contentWidth / 2;
    let leftY = yPosition;
    let rightY = yPosition;

    options.masteryData.forEach((skill, index) => {
        const skillText = `${skill.skill_name}:`;
        const confidenceText = skill.confidence;

        if (index % 2 === 0) { // Linke Spalte
            addPageIfNeeded(7);
            pdf.setFont('bold');
            pdf.text(skillText, margin, leftY);
            pdf.setFont('normal');
            pdf.text(confidenceText, margin + 50, leftY);
            leftY += 7;
        } else { // Rechte Spalte
            pdf.setFont('bold');
            pdf.text(skillText, midPoint, rightY);
            pdf.setFont('normal');
            pdf.text(confidenceText, midPoint + 50, rightY);
            rightY += 7;
        }
    });

    yPosition = Math.max(leftY, rightY) + 10;
  }

  // 4. Skill-Details (bei Tabellen-Ansicht zusätzlich)
  if (options.visualization === 'table' && options.masteryData.length > 0) {
    addPageIfNeeded(40);
    addText('Skill-Details', 14, true);
    yPosition += 5;

    // Tabellenkopf
    const tableHeaders = ['Skill', 'Beherrschung', 'Versuche'];
    const colWidths = [80, 40, 40];
    
    pdf.setFontSize(10);
    pdf.setFont('bold');
    tableHeaders.forEach((header, index) => {
      const xPos = margin + colWidths.slice(0, index).reduce((a, b) => a + b, 0);
      pdf.text(header, xPos, yPosition);
    });
    yPosition += 5;
    pdf.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 5;

    // Tabellendaten
    pdf.setFont('normal');
    options.masteryData.forEach((skill) => {
      addPageIfNeeded(10);
      
      const skillName = skill.skill_name.length > 40 
        ? skill.skill_name.substring(0, 40) + '...' 
        : skill.skill_name;
      
      pdf.text(skillName, margin, yPosition);
      pdf.text(`${Math.round(skill.mastery * 100)}%`, margin + colWidths[0], yPosition);
      pdf.text(skill.attempt_count.toString(), margin + colWidths[0] + colWidths[1], yPosition);
      yPosition += 7;
    });
    
    yPosition += 10;
  }

  // 5. Empfohlene Aufgaben
  addPageIfNeeded(40);
  addText('Empfohlene Aufgaben', 16, true);
  yPosition += 5;

  if (options.recommendations && options.recommendations.length > 0) {
    options.recommendations.forEach((rec, index) => {
      addPageIfNeeded(35);
      
      // Aufgabennummer und Skill
      pdf.setFont('bold');
      addText(`${index + 1}. ${rec.skill.name}`, 12);
      pdf.setFont('normal');
      
      // Problem ID
      addText(`Problem ID: ${rec.original_problem_id}`, 10);
      
      // Erfolgswahrscheinlichkeit und Schwierigkeit
      const difficulty = rec.difficulty_category.replace('_', ' ');
      addText(
        `Erfolgswahrscheinlichkeit: ${Math.round(rec.predicted_success * 100)}% | Schwierigkeit: ${difficulty}`,
        10
      );
      
      // Empfehlungsgrund
      if (rec.recommendation_reason) {
        pdf.setTextColor(100, 100, 100);
        addText(rec.recommendation_reason, 9);
        pdf.setTextColor(0, 0, 0);
      }
      
      yPosition += 5;
    });
  } else {
    addText('Keine Empfehlungen verfügbar.', 12);
  }

  // PDF speichern
  const fileName = `Lernbericht_${options.studentName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
  pdf.save(fileName);
}
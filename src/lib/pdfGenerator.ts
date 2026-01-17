// PDF generation utility for TQB Calculator
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { PDFExportData, TeamStats, GameData, TieBreakMethod } from './types';
import { formatTQBValue, outsToInnings, getDynamicTQBExplanation, calculateDisplayRanks } from './calculations';

/**
 * Generate PDF report for tournament rankings
 */
export function generatePDF(data: PDFExportData): void {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Colors
    const primaryColor: [number, number, number] = [139, 92, 246]; // Purple
    const darkBg: [number, number, number] = [26, 26, 46];
    const textLight: [number, number, number] = [255, 255, 255];
    const textMuted: [number, number, number] = [156, 163, 175];

    // ===== HEADER =====
    doc.setFillColor(...darkBg);
    doc.rect(0, 0, pageWidth, 50, 'F');

    // Tournament name
    doc.setTextColor(...textLight);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text(data.tournamentName || 'Tournament', pageWidth / 2, 20, { align: 'center' });

    // Subtitle
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...primaryColor);
    doc.text('WBSC Softball Tournament Rankings - Rule C11', pageWidth / 2, 30, { align: 'center' });

    // Date
    doc.setFontSize(10);
    doc.setTextColor(...textMuted);
    doc.text(`Date: ${data.date}`, pageWidth / 2, 40, { align: 'center' });

    let yPos = 60;

    // ===== FINAL STANDINGS TABLE =====
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Final Standings', 14, yPos);
    yPos += 8;

    const displayRanksStandings = calculateDisplayRanks(data.rankings, data.useERTQB);
    const rankingsData = data.rankings.map((team, index) => [
        `#${displayRanksStandings[index]}`,
        team.name,
        `${team.wins}-${team.losses}`,
        formatTQBValue(data.useERTQB ? team.erTqb : team.tqb),
    ]);

    autoTable(doc, {
        startY: yPos,
        head: [['Rank', 'Team', 'W-L', data.useERTQB ? 'ER-TQB' : 'TQB']],
        body: rankingsData,
        theme: 'grid',
        headStyles: {
            fillColor: primaryColor,
            textColor: textLight,
            fontStyle: 'bold',
            halign: 'center',
        },
        columnStyles: {
            0: { halign: 'center', cellWidth: 20 },
            1: { halign: 'left' },
            2: { halign: 'center', cellWidth: 25 },
            3: { halign: 'center', cellWidth: 30, font: 'courier' },
        },
        alternateRowStyles: {
            fillColor: [245, 245, 250],
        },
        margin: { left: 14, right: 14 },
    });

    // Get Y position after table
    yPos = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 15;

    // ===== TQB CALCULATION SUMMARY =====
    if (yPos > 240) {
        doc.addPage();
        yPos = 20;
    }

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`${data.useERTQB ? 'ER-TQB' : 'TQB'} Calculation Summary (${data.rankings.length}-Way Tie)`, 14, yPos);
    yPos += 8;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);

    const dynamicExplanation = getDynamicTQBExplanation(data.rankings, data.useERTQB);
    const dynamicLines = doc.splitTextToSize(dynamicExplanation, pageWidth - 28);
    doc.setFont('helvetica', 'bolditalic');
    doc.text(dynamicLines, 14, yPos);
    yPos += dynamicLines.length * 5 + 3;

    doc.setFont('helvetica', 'normal');
    const summaryIntro = `This summary provides a detailed breakdown of the ${data.useERTQB ? 'ER-TQB' : 'TQB'} components. The tie is resolved by comparing the offensive efficiency (Ratio Scored) against the defensive efficiency (Ratio Allowed) based on each team's total innings played.`;
    const introLines = doc.splitTextToSize(summaryIntro, pageWidth - 28);
    doc.text(introLines, 14, yPos);
    yPos += introLines.length * 5 + 5;

    const displayRanksSummary = calculateDisplayRanks(data.rankings, data.useERTQB);
    const summaryTableData = data.rankings.map((team, index) => {
        const runsS = data.useERTQB ? team.earnedRunsScored : team.runsScored;
        const runsA = data.useERTQB ? team.earnedRunsAllowed : team.runsAllowed;
        const innBat = team.inningsAtBatOuts / 3;
        const innDef = team.inningsOnDefenseOuts / 3;
        const ratioS = innBat > 0 ? runsS / innBat : 0;
        const ratioA = innDef > 0 ? runsA / innDef : 0;
        const finalVal = data.useERTQB ? team.erTqb : team.tqb;

        return [
            `#${displayRanksSummary[index]}`,
            team.name,
            `${runsS}`,
            `${outsToInnings(team.inningsAtBatOuts).toFixed(1)}`,
            `${runsA}`,
            `${outsToInnings(team.inningsOnDefenseOuts).toFixed(1)}`,
            ratioS.toFixed(4),
            ratioA.toFixed(4),
            formatTQBValue(finalVal)
        ];
    });

    autoTable(doc, {
        startY: yPos,
        head: [['Rank', 'Team', 'Runs S.', 'Inn. Bat', 'Runs A.', 'Inn. Def.', 'Ratio S.', 'Ratio A.', 'Final']],
        body: summaryTableData,
        theme: 'grid',
        headStyles: {
            fillColor: [60, 60, 80],
            textColor: textLight,
            fontStyle: 'bold',
            halign: 'center',
            fontSize: 8,
        },
        columnStyles: {
            0: { halign: 'center', cellWidth: 15 },
            1: { halign: 'left' },
            2: { halign: 'center' },
            3: { halign: 'center' },
            4: { halign: 'center' },
            5: { halign: 'center' },
            6: { halign: 'center', font: 'courier' },
            7: { halign: 'center', font: 'courier' },
            8: { halign: 'right', font: 'courier' },
        },
        styles: { fontSize: 8 },
        alternateRowStyles: {
            fillColor: [245, 245, 250],
        },
        margin: { left: 14, right: 14 },
    });

    yPos = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;

    // ===== TIE-BREAKING METHOD =====
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...primaryColor);
    doc.text('Tie-Breaking Method:', 14, yPos);
    yPos += 6;

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    const methodText = getTieBreakMethodTextForPDF(data.tieBreakMethod);
    doc.text(methodText, 14, yPos);
    yPos += 15;

    // ===== GAME RESULTS SUMMARY =====
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Game Results Summary', 14, yPos);
    yPos += 8;

    const gamesData = data.games.map(game => [
        game.teamAName,
        `${game.runsA ?? 0}`,
        'vs',
        `${game.runsB ?? 0}`,
        game.teamBName,
    ]);

    autoTable(doc, {
        startY: yPos,
        head: [['Team A', 'Runs', '', 'Runs', 'Team B']],
        body: gamesData,
        theme: 'grid',
        headStyles: {
            fillColor: [100, 100, 120],
            textColor: textLight,
            fontStyle: 'bold',
            halign: 'center',
        },
        columnStyles: {
            0: { halign: 'left' },
            1: { halign: 'center', cellWidth: 20, font: 'courier' },
            2: { halign: 'center', cellWidth: 15 },
            3: { halign: 'center', cellWidth: 20, font: 'courier' },
            4: { halign: 'right' },
        },
        alternateRowStyles: {
            fillColor: [245, 245, 250],
        },
        margin: { left: 14, right: 14 },
    });

    yPos = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 15;

    // ===== FORMULAS REFERENCE =====
    // Check if we need a new page
    if (yPos > 250) {
        doc.addPage();
        yPos = 20;
    }

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Formulas Reference', 14, yPos);
    yPos += 8;

    doc.setFontSize(10);
    doc.setFont('courier', 'normal');

    doc.text('TQB = (Runs Scored / Innings at Bat) - (Runs Allowed / Innings on Defense)', 14, yPos);
    yPos += 6;

    doc.text('ER-TQB = (Earned Runs Scored / Innings at Bat) - (Earned Runs Allowed / Innings on Defense)', 14, yPos);
    yPos += 15;

    // ===== FOOTER =====
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(...textMuted);
    doc.text('Generated by TQB Calculator - WBSC Rule C11 Tie-Breaker', pageWidth / 2, 285, { align: 'center' });

    // Save PDF
    const filename = `${data.tournamentName.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '')}_Rankings.pdf`;
    doc.save(filename);
}

function getTieBreakMethodTextForPDF(method: TieBreakMethod): string {
    const texts: Record<TieBreakMethod, string> = {
        WIN_LOSS: 'Rankings determined by Win-Loss Record',
        HEAD_TO_HEAD: 'Ties resolved using Head-to-Head Results',
        TQB: 'Ties resolved using TQB (Team Quality Balance)',
        ER_TQB: 'Ties resolved using ER-TQB (Earned Runs Team Quality Balance)',
        UNRESOLVED: 'Some ties remain unresolved - Manual review needed (Batting Average or Coin Toss)',
    };
    return texts[method];
}

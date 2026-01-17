// TQB and ER-TQB calculation utilities
import { GameData, TeamStats, RankingResult, TieBreakMethod } from './types';

const TIE_TOLERANCE = 0.0001;

/**
 * Convert innings display format (e.g., 7.2) to total outs
 * 7.2 means 7 complete innings + 2 outs = 23 outs
 */
export function inningsToOuts(innings: string | number): number {
    const value = typeof innings === 'string' ? parseFloat(innings) : innings;
    if (isNaN(value) || value < 0) return 0;

    const whole = Math.floor(value);
    const decimal = value - whole;
    // Round to handle floating point issues (0.1 or 0.2)
    const outs = Math.round(decimal * 10);

    return whole * 3 + outs;
}

/**
 * Convert total outs back to innings display format
 */
export function outsToInnings(outs: number): number {
    if (outs <= 0) return 0;
    const whole = Math.floor(outs / 3);
    const remainder = outs % 3;
    return whole + remainder * 0.1;
}

/**
 * Calculate team statistics from game data
 */
export function calculateTeamStats(
    teamId: string,
    teamName: string,
    games: GameData[]
): TeamStats {
    let wins = 0;
    let losses = 0;
    let runsScored = 0;
    let runsAllowed = 0;
    let inningsAtBatOuts = 0;
    let inningsOnDefenseOuts = 0;
    let earnedRunsScored = 0;
    let earnedRunsAllowed = 0;

    for (const game of games) {
        const isTeamA = game.teamAId === teamId;
        const isTeamB = game.teamBId === teamId;

        if (!isTeamA && !isTeamB) continue;

        const myRuns = isTeamA ? (game.runsA ?? 0) : (game.runsB ?? 0);
        const oppRuns = isTeamA ? (game.runsB ?? 0) : (game.runsA ?? 0);
        const myInningsBat = isTeamA ? game.inningsABatting : game.inningsBBatting;
        const myInningsDef = isTeamA ? game.inningsADefense : game.inningsBDefense;
        const myEarnedRuns = isTeamA ? (game.earnedRunsA ?? 0) : (game.earnedRunsB ?? 0);
        const oppEarnedRuns = isTeamA ? (game.earnedRunsB ?? 0) : (game.earnedRunsA ?? 0);

        if (myRuns > oppRuns) {
            wins++;
        } else if (myRuns < oppRuns) {
            losses++;
        }
        // Ties count as neither win nor loss

        runsScored += myRuns;
        runsAllowed += oppRuns;
        inningsAtBatOuts += inningsToOuts(myInningsBat);
        inningsOnDefenseOuts += inningsToOuts(myInningsDef);
        earnedRunsScored += myEarnedRuns;
        earnedRunsAllowed += oppEarnedRuns;
    }

    // Calculate TQB
    const batInnings = inningsAtBatOuts / 3;
    const defInnings = inningsOnDefenseOuts / 3;

    const tqb = batInnings > 0 && defInnings > 0
        ? (runsScored / batInnings) - (runsAllowed / defInnings)
        : 0;

    const erTqb = batInnings > 0 && defInnings > 0
        ? (earnedRunsScored / batInnings) - (earnedRunsAllowed / defInnings)
        : 0;

    return {
        id: teamId,
        name: teamName,
        wins,
        losses,
        runsScored,
        runsAllowed,
        inningsAtBatOuts,
        inningsOnDefenseOuts,
        earnedRunsScored,
        earnedRunsAllowed,
        tqb,
        erTqb,
    };
}

/**
 * Get head-to-head record among a group of tied teams
 * Returns the teams sorted by their record among themselves
 */
function getHeadToHeadRecord(
    tiedTeams: TeamStats[],
    games: GameData[]
): { team: TeamStats; h2hWins: number; h2hLosses: number }[] {
    const tiedIds = new Set(tiedTeams.map(t => t.id));

    // Filter games to only those between tied teams
    const relevantGames = games.filter(
        g => tiedIds.has(g.teamAId) && tiedIds.has(g.teamBId)
    );

    const h2hRecords = tiedTeams.map(team => {
        let h2hWins = 0;
        let h2hLosses = 0;

        for (const game of relevantGames) {
            const isTeamA = game.teamAId === team.id;
            const isTeamB = game.teamBId === team.id;

            if (!isTeamA && !isTeamB) continue;

            const myRuns = isTeamA ? (game.runsA ?? 0) : (game.runsB ?? 0);
            const oppRuns = isTeamA ? (game.runsB ?? 0) : (game.runsA ?? 0);

            if (myRuns > oppRuns) h2hWins++;
            else if (myRuns < oppRuns) h2hLosses++;
        }

        return { team, h2hWins, h2hLosses };
    });

    // Sort by h2h wins descending, then losses ascending
    return h2hRecords.sort((a, b) => {
        if (b.h2hWins !== a.h2hWins) return b.h2hWins - a.h2hWins;
        return a.h2hLosses - b.h2hLosses;
    });
}

/**
 * Check if head-to-head resolves a tie by seeing if records are different
 */
function headToHeadResolvesTie(
    h2hRecords: { team: TeamStats; h2hWins: number; h2hLosses: number }[]
): boolean {
    for (let i = 0; i < h2hRecords.length - 1; i++) {
        // If any two adjacent teams have the same h2h record, tie not resolved
        if (
            h2hRecords[i].h2hWins === h2hRecords[i + 1].h2hWins &&
            h2hRecords[i].h2hLosses === h2hRecords[i + 1].h2hLosses
        ) {
            return false;
        }
    }
    return true;
}

/**
 * Check if TQB values resolve ties among teams with same win-loss record
 */
function tqbResolvesTies(teams: TeamStats[], useTQB: boolean = true): boolean {
    // Group by wins
    const byWins: Map<number, TeamStats[]> = new Map();
    for (const team of teams) {
        const wins = team.wins;
        if (!byWins.has(wins)) {
            byWins.set(wins, []);
        }
        byWins.get(wins)!.push(team);
    }

    // Check each group with 2+ teams
    for (const group of byWins.values()) {
        if (group.length < 2) continue;

        const values = group.map(t => useTQB ? t.tqb : t.erTqb).sort((a, b) => b - a);

        for (let i = 0; i < values.length - 1; i++) {
            if (Math.abs(values[i] - values[i + 1]) < TIE_TOLERANCE) {
                return false;
            }
        }
    }

    return true;
}

/**
 * Main ranking calculation function
 */
export function calculateRankings(
    teams: { id: string; name: string }[],
    games: GameData[],
    useERTQB: boolean = false
): RankingResult {
    // Step 1: Calculate stats for all teams
    const allStats = teams.map(team =>
        calculateTeamStats(team.id, team.name, games)
    );

    // Step 2: Sort by wins (descending)
    allStats.sort((a, b) => b.wins - a.wins);

    // Step 3: Group teams by win count
    const rankGroups: Map<number, TeamStats[]> = new Map();
    for (const team of allStats) {
        if (!rankGroups.has(team.wins)) {
            rankGroups.set(team.wins, []);
        }
        rankGroups.get(team.wins)!.push(team);
    }

    let tieBreakMethod: TieBreakMethod = 'WIN_LOSS';
    let needsTQB = false;
    let needsERTQB = false;

    // Step 4: Process each group of teams with same wins
    const finalRankings: TeamStats[] = [];
    const sortedWins = Array.from(rankGroups.keys()).sort((a, b) => b - a);

    for (const wins of sortedWins) {
        const group = rankGroups.get(wins)!;

        if (group.length === 1) {
            finalRankings.push(group[0]);
            continue;
        }

        // Multiple teams with same record - apply tie-breakers
        // Try head-to-head first
        const h2hRecords = getHeadToHeadRecord(group, games);

        if (headToHeadResolvesTie(h2hRecords)) {
            // Head-to-head resolved it
            if (tieBreakMethod === 'WIN_LOSS') {
                tieBreakMethod = 'HEAD_TO_HEAD';
            }
            finalRankings.push(...h2hRecords.map(r => r.team));
        } else {
            // Head-to-head didn't resolve - use TQB or ER-TQB
            needsTQB = true;

            const sortedByBalance = [...group].sort((a, b) => {
                const balanceA = useERTQB ? a.erTqb : a.tqb;
                const balanceB = useERTQB ? b.erTqb : b.tqb;
                return balanceB - balanceA;
            });

            if (tieBreakMethod === 'WIN_LOSS' || tieBreakMethod === 'HEAD_TO_HEAD') {
                tieBreakMethod = useERTQB ? 'ER_TQB' : 'TQB';
            }

            finalRankings.push(...sortedByBalance);
        }
    }

    // Check if there are still unresolved ties
    const hasTies = !tqbResolvesTies(finalRankings, !useERTQB);

    if (hasTies && !useERTQB) {
        needsERTQB = true;
    } else if (hasTies && useERTQB) {
        tieBreakMethod = 'UNRESOLVED';
    }

    return {
        rankings: finalRankings,
        tieBreakMethod,
        hasTies,
        needsERTQB,
    };
}

/**
 * Validate innings format (X, X.1, or X.2 only)
 */
export function validateInningsFormat(value: string): boolean {
    if (!value || value === '') return false;
    const regex = /^(\d+)(\.([12]))?$/;
    return regex.test(value);
}

/**
 * Generate all round-robin matchups
 */
export function generateMatchups(
    teams: { id: string; name: string }[]
): Omit<GameData, 'runsA' | 'runsB' | 'inningsABatting' | 'inningsADefense' | 'inningsBBatting' | 'inningsBDefense' | 'earnedRunsA' | 'earnedRunsB'>[] {
    const matchups: Omit<GameData, 'runsA' | 'runsB' | 'inningsABatting' | 'inningsADefense' | 'inningsBBatting' | 'inningsBDefense' | 'earnedRunsA' | 'earnedRunsB'>[] = [];

    for (let i = 0; i < teams.length; i++) {
        for (let j = i + 1; j < teams.length; j++) {
            matchups.push({
                id: `${teams[i].id}-${teams[j].id}`,
                teamAId: teams[i].id,
                teamBId: teams[j].id,
                teamAName: teams[i].name,
                teamBName: teams[j].name,
            });
        }
    }

    return matchups;
}

/**
 * Format TQB/ER-TQB value with sign for display
 */
export function formatTQBValue(value: number): string {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(4)}`;
}

/**
 * Get tie-break method display text
 */
export function getTieBreakMethodText(method: TieBreakMethod, lang: 'en' | 'es' = 'en'): string {
    const texts = {
        en: {
            WIN_LOSS: 'Rankings determined by Win-Loss Record',
            HEAD_TO_HEAD: 'Ties resolved using Head-to-Head Results',
            TQB: 'Ties resolved using TQB (Team Quality Balance)',
            ER_TQB: 'Ties resolved using ER-TQB (Earned Runs Team Quality Balance)',
            UNRESOLVED: 'ER-TQB did not resolve all ties. Manual review needed for Batting Average or Coin Toss.',
        },
        es: {
            WIN_LOSS: 'Clasificación determinada por Récord de Victorias-Derrotas',
            HEAD_TO_HEAD: 'Empates resueltos usando Resultados Directos',
            TQB: 'Empates resueltos usando TQB (Balance de Calidad del Equipo)',
            ER_TQB: 'Empates resueltos usando ER-TQB (Balance de Calidad por Carreras Limpias)',
            UNRESOLVED: 'ER-TQB no resolvió todos los empates. Se requiere revisión manual para Promedio de Bateo o Lanzamiento de Moneda.',
        },
    };

    return texts[lang][method];
}

/**
 * Calculate display ranks handling ties (teams with same record/TQB get same rank)
 */
export function calculateDisplayRanks(rankings: TeamStats[], isERTQB: boolean = false): number[] {
    const ranks: number[] = [];
    let currentRank = 1;

    for (let i = 0; i < rankings.length; i++) {
        if (i > 0) {
            const currentVal = isERTQB ? rankings[i].erTqb : rankings[i].tqb;
            const prevVal = isERTQB ? rankings[i - 1].erTqb : rankings[i - 1].tqb;

            // They share a rank if wins are the same AND their TQB/ER-TQB are essentially equal
            if (rankings[i].wins !== rankings[i - 1].wins || Math.abs(currentVal - prevVal) >= TIE_TOLERANCE) {
                currentRank = i + 1;
            }
        }
        ranks.push(currentRank);
    }
    return ranks;
}

/**
 * Generate a dynamic explanation sentence for TQB results
 */
export function getDynamicTQBExplanation(rankings: TeamStats[], isERTQB: boolean = false): string {
    if (rankings.length < 2) return '';

    const winner = rankings[0];
    const runnerUp = rankings[1];
    const method = isERTQB ? 'ER-TQB' : 'TQB';

    // Check if the tie is actually unresolved between the top two
    const wVal = isERTQB ? winner.erTqb : winner.tqb;
    const ruVal = isERTQB ? runnerUp.erTqb : runnerUp.tqb;

    if (Math.abs(wVal - ruVal) < TIE_TOLERANCE) {
        return `In this ${rankings.length}-way tie, the ${method} values are identical, leaving the tie unresolved at this stage.`;
    }

    // Calculate donor ratios
    const wRunsS = isERTQB ? winner.earnedRunsScored : winner.runsScored;
    const wRunsA = isERTQB ? winner.earnedRunsAllowed : winner.runsAllowed;
    const wInnBat = winner.inningsAtBatOuts / 3;
    const wInnDef = winner.inningsOnDefenseOuts / 3;

    const ruRunsS = isERTQB ? runnerUp.earnedRunsScored : runnerUp.runsScored;
    const ruRunsA = isERTQB ? runnerUp.earnedRunsAllowed : runnerUp.runsAllowed;
    const ruInnBat = runnerUp.inningsAtBatOuts / 3;
    const ruInnDef = runnerUp.inningsOnDefenseOuts / 3;

    const wRatioS = wInnBat > 0 ? wRunsS / wInnBat : 0;
    const wRatioA = wInnDef > 0 ? wRunsA / wInnDef : 0;

    const ruRatioS = ruInnBat > 0 ? ruRunsS / ruInnBat : 0;
    const ruRatioA = ruInnDef > 0 ? ruRunsA / ruInnDef : 0;

    // Compare differences
    // Offset_S: positive means winner has better offense
    const offsetS = wRatioS - ruRatioS;
    // Offset_A: positive means winner has better defense (lower ratio)
    const offsetA = ruRatioA - wRatioA;

    let decidingFactor = '';
    let factorValue = 0;

    if (offsetS > offsetA) {
        decidingFactor = 'Offensive Efficiency';
        factorValue = wRatioS;
    } else {
        decidingFactor = 'Defensive Efficiency';
        factorValue = wRatioA;
    }

    return `In this ${rankings.length}-way tie, ${winner.name} secured Rank #1 primarily due to their superior ${decidingFactor} (${factorValue.toFixed(4)}).`;
}


'use client';

import { FileDown, RotateCcw, AlertTriangle, Trophy, Info, CheckCircle, ArrowLeft } from 'lucide-react';
import { TeamStats, TieBreakMethod, GameData } from '@/lib/types';
import { formatTQBValue, getTieBreakMethodText, calculateDisplayRanks } from '@/lib/calculations';
import StepIndicator from '../StepIndicator';
import TQBExplanationTable from '../TQBExplanationTable';

interface ERTQBRankingsProps {
    rankings: TeamStats[];
    tieBreakMethod: TieBreakMethod;
    hasUnresolvedTies: boolean;
    onExportPDF: () => void;
    onStartNew: () => void;
    onBack?: () => void;
    games: GameData[];
}

export default function ERTQBRankings({
    rankings,
    tieBreakMethod,
    hasUnresolvedTies,
    onExportPDF,
    onStartNew,
    onBack,
    games,
}: ERTQBRankingsProps) {
    return (
        <div className="max-w-4xl mx-auto animate-fade-in">
            <StepIndicator currentStep={5} totalSteps={5} />

            <div className="card">
                <div className="card-header">
                    <div className="flex items-center gap-4">
                        {onBack && (
                            <button
                                onClick={onBack}
                                className="group flex items-center justify-center w-10 h-10 rounded-full bg-dark-600 text-gray-400 hover:text-white hover:bg-dark-500 transition-all duration-200"
                                aria-label="Go back"
                            >
                                <ArrowLeft size={20} className="group-hover:-translate-x-0.5 transition-transform" />
                            </button>
                        )}
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 
                  flex items-center justify-center shadow-lg shadow-primary-500/30">
                                <Trophy size={24} className="text-white" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-white">ER-TQB Rankings</h2>
                                <p className="text-sm text-gray-400">
                                    Earned Runs Team Quality Balance - Final Results
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="card-body space-y-6">
                    {/* Tie-Break Method Indicator */}
                    <div className={`p-4 rounded-xl border flex items-start gap-3 ${hasUnresolvedTies
                        ? 'bg-warning-500/10 border-warning-500/30'
                        : 'bg-success-500/10 border-success-500/30'
                        }`}>
                        {hasUnresolvedTies ? (
                            <AlertTriangle size={20} className="text-warning-400 flex-shrink-0 mt-0.5" />
                        ) : (
                            <CheckCircle size={20} className="text-success-400 flex-shrink-0 mt-0.5" />
                        )}
                        <div>
                            <p className={`text-sm font-medium ${hasUnresolvedTies ? 'text-warning-400' : 'text-success-400'}`}>
                                {hasUnresolvedTies
                                    ? getTieBreakMethodText('UNRESOLVED')
                                    : getTieBreakMethodText(tieBreakMethod)
                                }
                            </p>
                            {!hasUnresolvedTies && (
                                <p className="text-xs text-gray-400 mt-1">
                                    If further tie-breaking is needed: 5) Highest Batting Average, 6) Coin Toss
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Rankings Table */}
                    <div className="overflow-x-auto">
                        <table className="table-dark w-full">
                            <thead>
                                <tr>
                                    <th className="w-16">Rank</th>
                                    <th>Team</th>
                                    <th className="text-center w-24">W-L</th>
                                    <th className="text-right w-32">ER-TQB</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(() => {
                                    const displayRanks = calculateDisplayRanks(rankings, true);
                                    return rankings.map((team, index) => (
                                        <tr key={team.id} className="animate-slide-up" style={{ animationDelay: `${index * 50}ms` }}>
                                            <td>
                                                <RankBadge rank={displayRanks[index]} />
                                            </td>
                                            <td>
                                                <span className="font-semibold text-white">{team.name}</span>
                                            </td>
                                            <td className="text-center">
                                                <span className="font-mono">
                                                    <span className="text-success-400">{team.wins}</span>
                                                    <span className="text-gray-500">-</span>
                                                    <span className="text-error-400">{team.losses}</span>
                                                </span>
                                            </td>
                                            <td className="text-right">
                                                <span className={`font-mono font-bold ${team.erTqb >= 0 ? 'text-success-400' : 'text-error-400'
                                                    }`}>
                                                    {formatTQBValue(team.erTqb)}
                                                </span>
                                            </td>
                                        </tr>
                                    ));
                                })()}
                            </tbody>
                        </table>
                    </div>

                    {/* ER-TQB Explanation Summary */}
                    <TQBExplanationTable rankings={rankings} isERTQB={true} />

                    {/* ER-TQB Formula */}
                    <div className="p-4 bg-dark-700/50 rounded-xl border border-dark-500">
                        <h4 className="text-sm font-semibold text-gray-300 mb-2 flex items-center gap-2">
                            <Info size={14} />
                            ER-TQB Formula
                        </h4>
                        <p className="font-mono text-sm text-primary-400">
                            ER-TQB = (Earned Runs Scored ÷ Innings at Bat) - (Earned Runs Allowed ÷ Innings on Defense)
                        </p>
                    </div>

                    {/* Comparison: TQB vs ER-TQB */}
                    <details className="group">
                        <summary className="cursor-pointer text-sm text-gray-400 hover:text-white transition-colors flex items-center gap-2">
                            <span className="group-open:rotate-90 transition-transform">▶</span>
                            Compare TQB vs ER-TQB values
                        </summary>
                        <div className="mt-3 overflow-x-auto">
                            <table className="table-dark w-full">
                                <thead>
                                    <tr>
                                        <th>Team</th>
                                        <th className="text-right">TQB</th>
                                        <th className="text-right">ER-TQB</th>
                                        <th className="text-right">Difference</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rankings.map((team) => {
                                        const diff = team.erTqb - team.tqb;
                                        return (
                                            <tr key={team.id}>
                                                <td className="text-white">{team.name}</td>
                                                <td className="text-right font-mono text-gray-400">
                                                    {formatTQBValue(team.tqb)}
                                                </td>
                                                <td className="text-right font-mono text-primary-400">
                                                    {formatTQBValue(team.erTqb)}
                                                </td>
                                                <td className={`text-right font-mono ${diff >= 0 ? 'text-success-400' : 'text-error-400'
                                                    }`}>
                                                    {formatTQBValue(diff)}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </details>

                    {/* Game Results Summary */}
                    <details className="group">
                        <summary className="cursor-pointer text-sm text-gray-400 hover:text-white transition-colors flex items-center gap-2">
                            <span className="group-open:rotate-90 transition-transform">▶</span>
                            View game results summary
                        </summary>
                        <div className="mt-3 p-4 bg-dark-700/30 rounded-xl space-y-2">
                            {games.map((game, index) => (
                                <div key={game.id} className="flex items-center justify-between text-sm py-2 border-b border-dark-600 last:border-0">
                                    <span className="text-gray-400">Game {index + 1}</span>
                                    <span className="font-mono text-white">
                                        {game.teamAName}{' '}
                                        <span className={
                                            (game.runsA ?? 0) > (game.runsB ?? 0) ? 'text-success-400' :
                                                (game.runsA ?? 0) < (game.runsB ?? 0) ? 'text-gray-400' : 'text-warning-400'
                                        }>{game.runsA}</span>
                                        <span className="text-gray-600">/{game.earnedRunsA}</span>
                                        <span className="text-gray-500 mx-2">vs</span>
                                        <span className={
                                            (game.runsB ?? 0) > (game.runsA ?? 0) ? 'text-success-400' :
                                                (game.runsB ?? 0) < (game.runsA ?? 0) ? 'text-gray-400' : 'text-warning-400'
                                        }>{game.runsB}</span>
                                        <span className="text-gray-600">/{game.earnedRunsB}</span>{' '}
                                        {game.teamBName}
                                    </span>
                                </div>
                            ))}
                            <p className="text-xs text-gray-500 pt-2">
                                Format: Total Runs / Earned Runs
                            </p>
                        </div>
                    </details>

                    {/* Actions */}
                    <div className="flex flex-col sm:flex-row gap-3 pt-4">
                        <button
                            onClick={onExportPDF}
                            className="flex-1 btn-primary py-4"
                        >
                            <FileDown size={20} />
                            Export to PDF
                        </button>
                        <button
                            onClick={onStartNew}
                            className="flex-1 btn-ghost py-4"
                        >
                            <RotateCcw size={20} />
                            Start New Calculation
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function RankBadge({ rank }: { rank: number }) {
    const getClass = () => {
        switch (rank) {
            case 1: return 'rank-1';
            case 2: return 'rank-2';
            case 3: return 'rank-3';
            default: return 'rank-default';
        }
    };

    return (
        <div className={getClass()}>
            #{rank}
        </div>
    );
}

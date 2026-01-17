'use client';

import { useState, useCallback, useMemo } from 'react';
import { Calculator, AlertCircle, Info, ArrowLeft } from 'lucide-react';
import { GameData } from '@/lib/types';
import StepIndicator from '../StepIndicator';

interface EarnedRunsEntryProps {
    games: GameData[];
    onGamesChange: (games: GameData[]) => void;
    onCalculate: () => void;
    onBack?: () => void;
}

export default function EarnedRunsEntry({
    games,
    onGamesChange,
    onCalculate,
    onBack
}: EarnedRunsEntryProps) {
    const [errors, setErrors] = useState<Record<string, Record<string, string>>>({});

    const updateGame = useCallback((
        gameId: string,
        field: 'earnedRunsA' | 'earnedRunsB',
        value: number | null
    ) => {
        onGamesChange(
            games.map(g => g.id === gameId ? { ...g, [field]: value } : g)
        );

        // Clear specific field error when user types
        if (errors[gameId]?.[field]) {
            setErrors(prev => ({
                ...prev,
                [gameId]: {
                    ...prev[gameId],
                    [field]: '',
                },
            }));
        }
    }, [games, onGamesChange, errors]);

    const validateGames = useCallback((): boolean => {
        const newErrors: Record<string, Record<string, string>> = {};
        let hasErrors = false;

        for (const game of games) {
            const gameErrors: Record<string, string> = {};

            // Validate earned runs (required, non-negative, <= total runs)
            if (game.earnedRunsA === null || game.earnedRunsA === undefined || game.earnedRunsA < 0) {
                gameErrors.earnedRunsA = 'Required';
                hasErrors = true;
            } else if (game.earnedRunsA > (game.runsA ?? 0)) {
                gameErrors.earnedRunsA = 'Cannot exceed total runs';
                hasErrors = true;
            }

            if (game.earnedRunsB === null || game.earnedRunsB === undefined || game.earnedRunsB < 0) {
                gameErrors.earnedRunsB = 'Required';
                hasErrors = true;
            } else if (game.earnedRunsB > (game.runsB ?? 0)) {
                gameErrors.earnedRunsB = 'Cannot exceed total runs';
                hasErrors = true;
            }

            if (Object.keys(gameErrors).length > 0) {
                newErrors[game.id] = gameErrors;
            }
        }

        setErrors(newErrors);
        return !hasErrors;
    }, [games]);

    const handleCalculate = useCallback(() => {
        if (validateGames()) {
            onCalculate();
        }
    }, [validateGames, onCalculate]);

    const allFieldsFilled = useMemo(() => {
        return games.every(game =>
            game.earnedRunsA !== null && game.earnedRunsA !== undefined &&
            game.earnedRunsB !== null && game.earnedRunsB !== undefined
        );
    }, [games]);

    return (
        <div className="max-w-4xl mx-auto animate-fade-in">
            <StepIndicator currentStep={4} totalSteps={5} />

            <div className="card">
                <div className="card-header flex items-center gap-4">
                    {onBack && (
                        <button
                            onClick={onBack}
                            className="group flex items-center justify-center w-10 h-10 rounded-full bg-dark-600 text-gray-400 hover:text-white hover:bg-dark-500 transition-all duration-200"
                            aria-label="Go back"
                        >
                            <ArrowLeft size={20} className="group-hover:-translate-x-0.5 transition-transform" />
                        </button>
                    )}
                    <div>
                        <h2 className="text-2xl font-bold text-white">Enter Earned Runs</h2>
                        <p className="text-sm text-gray-400 mt-1">
                            TQB did not resolve all ties. Enter earned runs for ER-TQB calculation.
                        </p>
                    </div>
                </div>

                <div className="card-body space-y-6">
                    {/* Info Panel */}
                    <div className="p-4 bg-primary-500/10 border border-primary-500/30 rounded-xl flex items-start gap-3">
                        <Info size={20} className="text-primary-400 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="text-sm font-medium text-primary-400">
                                What are Earned Runs?
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                                Earned runs are runs that scored without the benefit of an error or passed ball.
                                They cannot exceed the total runs scored in each game.
                            </p>
                        </div>
                    </div>

                    {/* Games List */}
                    <div className="space-y-4">
                        {games.map((game, index) => (
                            <EarnedRunsCard
                                key={game.id}
                                game={game}
                                gameNumber={index + 1}
                                errors={errors[game.id] || {}}
                                onUpdate={(field, value) => updateGame(game.id, field, value)}
                            />
                        ))}
                    </div>

                    {/* Error Summary */}
                    {Object.keys(errors).length > 0 && (
                        <div className="p-4 bg-error-500/10 border border-error-500/30 rounded-xl flex items-start gap-3">
                            <AlertCircle size={20} className="text-error-400 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm font-medium text-error-400">
                                    Please fix the errors above
                                </p>
                                <p className="text-xs text-error-300 mt-1">
                                    All earned runs fields are required and cannot exceed total runs.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Calculate Button */}
                    <div className="pt-4">
                        <button
                            onClick={handleCalculate}
                            disabled={!allFieldsFilled}
                            className="w-full btn-success py-4 text-xl shadow-xl shadow-success-500/20"
                        >
                            <Calculator size={22} className="mr-1" />
                            Calculate ER-TQB Rankings
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Subcomponent for each game card
interface EarnedRunsCardProps {
    game: GameData;
    gameNumber: number;
    errors: Record<string, string>;
    onUpdate: (field: 'earnedRunsA' | 'earnedRunsB', value: number | null) => void;
}

function EarnedRunsCard({ game, gameNumber, errors, onUpdate }: EarnedRunsCardProps) {
    const handleChange = (field: 'earnedRunsA' | 'earnedRunsB', value: string) => {
        const num = value === '' ? null : parseInt(value, 10);
        if (value === '' || (!isNaN(num!) && num! >= 0)) {
            onUpdate(field, num);
        }
    };

    return (
        <div className="game-card animate-slide-up">
            {/* Game Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-dark-600">
                <div className="flex items-center gap-4">
                    <span className="flex items-center justify-center w-12 h-12 bg-dark-700/50 rounded-xl text-sm font-mono text-primary-400 border border-dark-500 shadow-inner">
                        #{gameNumber}
                    </span>
                    <div>
                        <div className="flex items-center gap-3">
                            <h3 className="text-xl font-bold text-white tracking-tight">
                                {game.teamAName}
                                <span className="mx-2 text-gray-600 font-light">vs</span>
                                {game.teamBName}
                            </h3>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5 uppercase tracking-widest font-semibold font-mono">
                            Tie-Breaker Matchup
                        </p>
                    </div>
                </div>

                <div className="px-4 py-2 bg-dark-600/50 border border-dark-500 rounded-lg text-sm font-mono text-white flex items-center gap-2">
                    <span className="text-gray-500 text-[10px] uppercase font-bold tracking-wider">Final:</span>
                    <span className="text-success-400">{game.runsA}</span>
                    <span className="text-gray-600">-</span>
                    <span className="text-success-400">{game.runsB}</span>
                </div>
            </div>

            {/* Two Column Layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Team A - Visitor */}
                <div>
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-primary-500" />
                            <span className="font-semibold text-white">{game.teamAName}</span>
                            <span className="text-sm text-gray-500">(Total: {game.runsA} runs)</span>
                        </div>
                        <span className="text-[10px] font-bold text-primary-400 tracking-widest uppercase bg-primary-500/10 px-2 py-0.5 rounded border border-primary-500/20">
                            Visitor
                        </span>
                    </div>

                    <div>
                        <label className="block text-xs text-gray-400 mb-1">Earned Runs Scored</label>
                        <input
                            type="number"
                            min="0"
                            max={game.runsA ?? 0}
                            value={game.earnedRunsA ?? ''}
                            onChange={(e) => handleChange('earnedRunsA', e.target.value)}
                            className={`input font-mono ${errors.earnedRunsA ? 'input-error' : ''}`}
                            placeholder="0"
                        />
                        {errors.earnedRunsA && (
                            <p className="mt-1 text-xs text-error-400">{errors.earnedRunsA}</p>
                        )}
                    </div>
                </div>

                {/* Team B - Home */}
                <div>
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-success-500" />
                            <span className="font-semibold text-white">{game.teamBName}</span>
                            <span className="text-sm text-gray-500">(Total: {game.runsB} runs)</span>
                        </div>
                        <span className="text-[10px] font-bold text-success-400 tracking-widest uppercase bg-success-500/10 px-2 py-0.5 rounded border border-success-500/20">
                            Home Team
                        </span>
                    </div>

                    <div>
                        <label className="block text-xs text-gray-400 mb-1">Earned Runs Scored</label>
                        <input
                            type="number"
                            min="0"
                            max={game.runsB ?? 0}
                            value={game.earnedRunsB ?? ''}
                            onChange={(e) => handleChange('earnedRunsB', e.target.value)}
                            className={`input font-mono ${errors.earnedRunsB ? 'input-error' : ''}`}
                            placeholder="0"
                        />
                        {errors.earnedRunsB && (
                            <p className="mt-1 text-xs text-error-400">{errors.earnedRunsB}</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

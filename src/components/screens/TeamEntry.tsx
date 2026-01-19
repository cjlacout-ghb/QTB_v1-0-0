'use client';

import { useState, useRef, useCallback } from 'react';
import { Plus, Trash2, Upload, HelpCircle, ArrowRight, AlertCircle, ArrowLeft } from 'lucide-react';
import { Team, GameData } from '@/lib/types';
import { parseCSV, getSampleCSV } from '@/lib/csvParser';
import StepIndicator from '../StepIndicator';

interface TeamEntryProps {
    teams: Team[];
    onTeamsChange: (teams: Team[]) => void;
    onContinue: () => void;
    onCSVImport: (teams: Team[], games: GameData[]) => void;
    onBack?: () => void;
    onOpenManual?: (section?: string) => void;
}

const MAX_TEAMS = 8;
const MIN_TEAMS = 3;

export default function TeamEntry({
    teams,
    onTeamsChange,
    onContinue,
    onCSVImport,
    onBack,
    onOpenManual
}: TeamEntryProps) {
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [csvError, setCSVError] = useState<string[]>([]);
    const [showCSVHelp, setShowCSVHelp] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const addTeam = useCallback(() => {
        if (teams.length >= MAX_TEAMS) return;

        const newTeam: Team = {
            id: `team-${Date.now()}`,
            name: '',
        };
        onTeamsChange([...teams, newTeam]);
    }, [teams, onTeamsChange]);

    const removeTeam = useCallback((teamId: string) => {
        if (teams.length <= MIN_TEAMS) return;
        onTeamsChange(teams.filter(t => t.id !== teamId));

        // Clear error for removed team
        setErrors(prev => {
            const next = { ...prev };
            delete next[teamId];
            return next;
        });
    }, [teams, onTeamsChange]);

    const updateTeamName = useCallback((teamId: string, name: string) => {
        onTeamsChange(
            teams.map(t => t.id === teamId ? { ...t, name } : t)
        );

        // Clear error when user starts typing
        if (errors[teamId]) {
            setErrors(prev => {
                const next = { ...prev };
                delete next[teamId];
                return next;
            });
        }
    }, [teams, onTeamsChange, errors]);

    const validateTeams = useCallback((): boolean => {
        const newErrors: Record<string, string> = {};
        const names = new Set<string>();

        for (const team of teams) {
            const trimmedName = team.name.trim();

            if (!trimmedName) {
                newErrors[team.id] = 'Team name is required';
            } else if (names.has(trimmedName.toLowerCase())) {
                newErrors[team.id] = 'Duplicate team name';
            } else {
                names.add(trimmedName.toLowerCase());
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    }, [teams]);

    const handleContinue = useCallback(() => {
        if (validateTeams()) {
            // Trim team names before continuing
            onTeamsChange(teams.map(t => ({ ...t, name: t.name.trim() })));
            onContinue();
        }
    }, [validateTeams, teams, onTeamsChange, onContinue]);

    const handleFileUpload = useCallback((file: File) => {
        setCSVError([]);

        if (!file.name.endsWith('.csv') && !file.name.endsWith('.txt')) {
            setCSVError(['Please upload a CSV or TXT file']);
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target?.result as string;
            const result = parseCSV(content);

            if (!result.success) {
                setCSVError(result.errors);
                return;
            }

            // Successfully parsed CSV
            onCSVImport(result.teams, result.games);
        };
        reader.readAsText(file);
    }, [onCSVImport]);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        const file = e.dataTransfer.files[0];
        if (file) handleFileUpload(file);
    }, [handleFileUpload]);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const hasValidTeams = teams.length >= MIN_TEAMS &&
        teams.every(t => t.name.trim().length > 0);

    return (
        <div className="max-w-2xl mx-auto animate-fade-in">
            <StepIndicator currentStep={1} totalSteps={3} />

            <div className="card">
                <div className="card-header">
                    <div className="flex items-center gap-4">
                        {onBack && (
                            <button
                                onClick={onBack}
                                className="group flex items-center justify-center w-10 h-10 rounded-full bg-dark-600 text-gray-400 hover:text-white hover:bg-dark-500 transition-all duration-200"
                                title="Reset form"
                                aria-label="Reset form"
                            >
                                <ArrowLeft size={20} className="group-hover:-translate-x-0.5 transition-transform" />
                            </button>
                        )}
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-2xl font-bold text-white">Enter Teams</h2>
                                <div className="group relative">
                                    <button
                                        onClick={() => onOpenManual?.('official-rule-c11')}
                                        className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-primary-500/10 border border-primary-500/20 text-[10px] font-bold text-primary-400 uppercase tracking-wider cursor-pointer hover:bg-primary-500/20 transition-colors"
                                    >
                                        Rule C11
                                        <HelpCircle size={10} />
                                    </button>
                                    {/* Tooltip */}
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-dark-800 border border-dark-500 rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                                        <p className="text-xs text-gray-300 leading-relaxed">
                                            This calculator follows the official <span className="text-primary-400 font-bold">WBSC Rule C11</span> tie-breaking procedures, including Win-Loss, Head-to-Head, TQB, and ER-TQB criteria.
                                        </p>
                                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-dark-800"></div>
                                    </div>
                                </div>
                            </div>
                            <p className="text-sm text-gray-400 mt-1">
                                Add teams that are involved in the tiebreaker
                            </p>
                        </div>
                    </div>
                </div>

                <div className="card-body space-y-6">
                    {/* Team List */}
                    <div className="space-y-3">
                        {teams.map((team, index) => (
                            <div key={team.id} className="flex items-start gap-3 animate-slide-up">
                                <div className="w-8 h-10 flex items-center justify-center text-gray-500 font-mono text-sm">
                                    {index + 1}.
                                </div>
                                <div className="flex-1">
                                    <input
                                        type="text"
                                        value={team.name}
                                        onChange={(e) => updateTeamName(team.id, e.target.value)}
                                        placeholder={`Team ${index + 1} name`}
                                        className={`input ${errors[team.id] ? 'input-error' : ''}`}
                                        maxLength={50}
                                        aria-label={`Team ${index + 1} name`}
                                    />
                                    {errors[team.id] && (
                                        <p className="mt-1 text-sm text-error-400 flex items-center gap-1">
                                            <AlertCircle size={14} />
                                            {errors[team.id]}
                                        </p>
                                    )}
                                </div>
                                <button
                                    onClick={() => removeTeam(team.id)}
                                    disabled={teams.length <= MIN_TEAMS}
                                    className="h-10 px-3 text-gray-400 hover:text-error-400 hover:bg-error-500/10 
                    rounded-lg transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
                                    aria-label={`Remove team ${index + 1}`}
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        ))}
                    </div>

                    {/* Add Team Button */}
                    <button
                        onClick={addTeam}
                        disabled={teams.length >= MAX_TEAMS}
                        className="w-full py-3 border-2 border-dashed border-dark-500 rounded-xl
              text-gray-400 hover:text-primary-400 hover:border-primary-500/50
              transition-all duration-200 flex items-center justify-center gap-2
              disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:text-gray-400 disabled:hover:border-dark-500"
                    >
                        <Plus size={18} />
                        Add Team ({teams.length}/{MAX_TEAMS})
                    </button>

                    {/* Divider */}
                    <div className="relative py-4">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-dark-500" />
                        </div>
                        <div className="relative flex justify-center">
                            <span className="px-4 text-sm text-gray-500 bg-dark-800">
                                or upload file
                            </span>
                        </div>
                    </div>

                    {/* CSV Upload */}
                    <div
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        className={`
              relative p-10 border-2 border-dashed rounded-2xl text-center
              transition-all duration-200 cursor-pointer
              ${isDragging
                                ? 'border-primary-500 bg-primary-500/10 scale-[1.01]'
                                : 'border-dark-500 hover:border-primary-500/50 hover:bg-dark-700/30'
                            }
            `}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".csv,.txt"
                            onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                            className="hidden"
                            aria-label="Upload file"
                        />

                        <Upload
                            size={40}
                            className={`mx-auto mb-4 ${isDragging ? 'text-primary-400' : 'text-gray-500'}`}
                        />
                        <p className="text-gray-200 font-bold text-lg">
                            Drop your file here or click to browse
                        </p>
                        <p className="text-base text-gray-400 mt-2">
                            Pre-fill all team and game data
                        </p>

                        {/* CSV Help Button */}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowCSVHelp(!showCSVHelp);
                            }}
                            className="mt-3 inline-flex items-center gap-1 text-sm text-primary-400 hover:text-primary-300"
                        >
                            <HelpCircle size={14} />
                            View file format
                        </button>
                    </div>

                    {/* CSV Help Panel */}
                    {showCSVHelp && (
                        <div className="p-4 bg-dark-700/50 rounded-xl border border-dark-500 animate-slide-up">
                            <h4 className="text-sm font-semibold text-gray-300 mb-2">
                                Required Columns:
                            </h4>
                            <p className="text-xs text-gray-400 font-mono mb-3 break-all">
                                Team_A, Team_B, Runs_A, Runs_B, Earned_Runs_A, Earned_Runs_B,
                                Innings_A_Batting, Innings_A_Defense, Innings_B_Batting, Innings_B_Defense
                            </p>
                            <h4 className="text-sm font-semibold text-gray-300 mb-2">
                                Example:
                            </h4>
                            <pre className="text-xs text-gray-400 font-mono bg-dark-900 p-3 rounded-lg overflow-x-auto">
                                {getSampleCSV()}
                            </pre>
                        </div>
                    )}

                    {/* CSV Errors */}
                    {csvError.length > 0 && (
                        <div className="p-4 bg-error-500/10 border border-error-500/30 rounded-xl">
                            <h4 className="text-sm font-semibold text-error-400 mb-2 flex items-center gap-2">
                                <AlertCircle size={16} />
                                File Upload Error
                            </h4>
                            <ul className="text-sm text-error-300 space-y-1">
                                {csvError.map((error, i) => (
                                    <li key={i}>• {error}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Continue Button */}
                    <button
                        onClick={handleContinue}
                        disabled={!hasValidTeams}
                        className="w-full btn-primary py-4 text-lg"
                    >
                        Continue to Games
                        <ArrowRight size={20} />
                    </button>
                </div>
            </div>
        </div>
    );
}

'use client';

import { Book } from 'lucide-react';

interface HeaderProps {
    onOpenManual: () => void;
}

export default function Header({ onOpenManual }: HeaderProps) {
    return (
        <header className="sticky top-0 z-30 bg-dark-900/80 backdrop-blur-md border-b border-dark-500">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    {/* Logo & Title */}
                    <div className="flex items-center gap-3">
                        <img
                            src="/images/logo.png"
                            alt="TQB Calculator Logo"
                            className="w-10 h-10 rounded-xl object-contain shadow-lg shadow-primary-500/20"
                        />
                        <div>
                            <h1 className="text-lg font-bold text-white tracking-tight">
                                TQB Calculator
                            </h1>
                            <p className="text-xs text-gray-400 hidden sm:block">
                                WBSC Rule C11 Tie-Breaker
                            </p>
                        </div>
                    </div>

                    {/* Navigation */}
                    <nav className="flex items-center gap-4">
                        <button
                            onClick={onOpenManual}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-300 hover:text-white hover:bg-white/5 rounded-lg transition-all duration-200"
                            aria-label="Open User Manual"
                        >
                            <Book size={18} />
                            <span className="hidden sm:inline">📖 User Manual</span>
                            <span className="sm:hidden">📖</span>
                        </button>
                    </nav>
                </div>
            </div>
        </header>
    );
}

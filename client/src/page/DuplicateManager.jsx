import React, { useState, useEffect } from 'react';

const DuplicateManager = ({ duplicateGroups, onDelete }) => {
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [deleting, setDeleting] = useState(false);
    const [zoomedImage, setZoomedImage] = useState(null);

    // Clean up blob URLs on unmount
    useEffect(() => {
        return () => {
            duplicateGroups.forEach(group => {
                group.samples.forEach(sample => {
                    if (sample.blobUrl) {
                        URL.revokeObjectURL(sample.blobUrl);
                    }
                });
            });
        };
    }, []);

    const toggleSelection = (path) => {
        setSelectedFiles(prev =>
            prev.includes(path) ? prev.filter(p => p !== path) : [...prev, path]
        );
    };

    const selectAllInGroup = (group) => {
        const toSelect = group.samples.slice(1).map(f => f.path);
        setSelectedFiles(prev => {
            const newSet = new Set(prev);
            toSelect.forEach(p => newSet.add(p));
            return [...newSet];
        });
    };

    const deselectAllInGroup = (group) => {
        const groupPaths = new Set(group.samples.map(f => f.path));
        setSelectedFiles(prev => prev.filter(p => !groupPaths.has(p)));
    };

    const handleDelete = async () => {
        if (selectedFiles.length === 0) return;

        const confirmed = window.confirm(
            `Are you sure you want to permanently delete ${selectedFiles.length} file(s)? This cannot be undone.`
        );
        if (!confirmed) return;

        setDeleting(true);
        try {
            await onDelete(selectedFiles);
            setSelectedFiles([]);
        } catch (err) {
            console.error('Delete failed:', err);
        } finally {
            setDeleting(false);
        }
    };

    if (duplicateGroups.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-[50vh] animate-fade-in-up">
                <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center mb-6">
                    <svg className="h-10 w-10 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
                <p className="text-xl font-semibold text-white">No duplicates found!</p>
                <p className="text-sm text-zinc-500 mt-2">All images in this folder are unique. Your storage looks clean.</p>
            </div>
        );
    }

    return (
        <div className="max-w-[1600px] mx-auto px-8 py-8 pb-24 relative z-10">
            {/* Results Header */}
            <header className="mb-8 animate-fade-in-up">
                <h2 className="text-2xl font-bold text-white mb-1">
                    Side-by-Side Comparison
                </h2>
                <p className="text-sm text-zinc-500">
                    {duplicateGroups.length} group{duplicateGroups.length !== 1 ? 's' : ''} found —
                    click images to mark for deletion
                </p>
            </header>

            {/* Floating Delete Bar */}
            <div
                className={`fixed bottom-0 left-0 right-0 z-50 transition-all duration-300 ease-in-out
                    ${selectedFiles.length > 0 ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 pointer-events-none'}`}
            >
                <div className="glass-dark border-t border-white/10 shadow-[0_-8px_40px_rgba(0,0,0,0.4)]">
                    <div className="max-w-[1600px] mx-auto px-6 py-3.5 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-red-500/15 flex items-center justify-center">
                                <span className="text-sm font-bold text-red-400">{selectedFiles.length}</span>
                            </div>
                            <span className="text-sm text-zinc-400">
                                file{selectedFiles.length !== 1 ? 's' : ''} marked for deletion
                            </span>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setSelectedFiles([])}
                                className="text-sm text-zinc-500 hover:text-zinc-300 font-medium px-4 py-2 rounded-lg
                                           hover:bg-white/5 transition"
                            >
                                Clear All
                            </button>
                            <button
                                onClick={handleDelete}
                                className="btn-danger px-6 py-2.5 rounded-xl text-white font-semibold text-sm
                                           disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                                disabled={deleting}
                            >
                                {deleting ? (
                                    <>
                                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                        </svg>
                                        Deleting...
                                    </>
                                ) : (
                                    <>
                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                        Delete Selected
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Duplicate Groups */}
            <div className="space-y-6">
                {duplicateGroups.map((group, groupIndex) => {
                    const groupSelectedCount = group.samples.filter(f => selectedFiles.includes(f.path)).length;
                    return (
                        <div
                            key={group.hash}
                            className="glass rounded-2xl overflow-hidden card-hover animate-fade-in-up"
                            style={{ animationDelay: `${groupIndex * 80}ms` }}
                        >
                            {/* Group Header */}
                            <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/5">
                                <div className="flex items-center gap-3">
                                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg
                                                     bg-violet-500/15 text-violet-400 text-xs font-bold">
                                        {groupIndex + 1}
                                    </span>
                                    <span className="text-sm text-zinc-400">
                                        <strong className="text-zinc-200">{group.samples.length}</strong> identical files
                                    </span>
                                    <span className="font-mono text-[11px] text-zinc-600 bg-white/5 px-2.5 py-0.5 rounded-md">
                                        {group.hash.substring(0, 12)}
                                    </span>
                                    {groupSelectedCount > 0 && (
                                        <span className="text-[11px] text-red-400 bg-red-500/10 px-2.5 py-0.5 rounded-full font-medium">
                                            {groupSelectedCount} marked
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => selectAllInGroup(group)}
                                        className="text-xs text-violet-400 hover:text-violet-300 font-medium px-3 py-1.5 rounded-lg
                                                   hover:bg-violet-500/10 transition"
                                    >
                                        Select duplicates
                                    </button>
                                    <button
                                        onClick={() => deselectAllInGroup(group)}
                                        className="text-xs text-zinc-600 hover:text-zinc-400 font-medium px-3 py-1.5 rounded-lg
                                                   hover:bg-white/5 transition"
                                    >
                                        Clear
                                    </button>
                                </div>
                            </div>

                            {/* Side-by-side image row */}
                            <div className="flex overflow-x-auto">
                                {group.samples.map((file, fileIndex) => {
                                    const isSelected = selectedFiles.includes(file.path);
                                    const imgSrc = file.blobUrl || '';
                                    return (
                                        <div
                                            key={file.path}
                                            className={`flex-shrink-0 flex flex-col transition-all duration-200 relative
                                                ${group.samples.length <= 3 ? 'flex-1 min-w-[280px]' : 'w-[320px]'}
                                                ${fileIndex > 0 ? 'border-l border-white/5' : ''}
                                                ${isSelected ? 'bg-red-500/5' : 'hover:bg-white/[0.02]'}
                                            `}
                                        >
                                            {/* Image */}
                                            <div
                                                className="relative cursor-pointer group"
                                                onClick={() => toggleSelection(file.path)}
                                            >
                                                <img
                                                    src={imgSrc}
                                                    alt={file.name}
                                                    className={`w-full h-56 object-cover transition-all duration-200
                                                        ${isSelected ? 'opacity-40 scale-[0.98]' : 'group-hover:opacity-80'}
                                                    `}
                                                    loading="lazy"
                                                />

                                                {/* Selected overlay */}
                                                {isSelected && (
                                                    <div className="absolute inset-0 flex items-center justify-center">
                                                        <div className="bg-red-500 text-white rounded-full p-3 shadow-lg shadow-red-500/30 animate-fade-in">
                                                            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                                            </svg>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Hover overlay */}
                                                {!isSelected && (
                                                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100
                                                                    bg-black/30 transition-all duration-200">
                                                        <div className="bg-white/10 backdrop-blur-sm text-white rounded-full p-2.5 border border-white/20">
                                                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                            </svg>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Original badge */}
                                                {fileIndex === 0 && (
                                                    <span className="absolute top-3 left-3 bg-emerald-500/90 backdrop-blur-sm text-white text-[10px]
                                                                     font-bold px-2.5 py-1 rounded-lg shadow-lg shadow-emerald-500/20 uppercase tracking-wider">
                                                        ★ Original
                                                    </span>
                                                )}

                                                {/* Duplicate badge */}
                                                {fileIndex > 0 && (
                                                    <span className="absolute top-3 left-3 bg-amber-500/80 backdrop-blur-sm text-white text-[10px]
                                                                     font-bold px-2.5 py-1 rounded-lg shadow-lg uppercase tracking-wider">
                                                        Copy {fileIndex}
                                                    </span>
                                                )}

                                                {/* Zoom */}
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setZoomedImage(imgSrc);
                                                    }}
                                                    className="absolute top-3 right-3 bg-black/40 backdrop-blur-sm hover:bg-black/60 text-white rounded-lg p-2
                                                               opacity-0 group-hover:opacity-100 transition-all duration-200 border border-white/10"
                                                >
                                                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                                                    </svg>
                                                </button>
                                            </div>

                                            {/* File info */}
                                            <div className={`px-4 py-3 border-t ${isSelected ? 'border-red-500/20 bg-red-500/5' : 'border-white/5'}`}>
                                                <p className="text-xs font-medium text-zinc-300 truncate" title={file.path}>
                                                    {file.name}
                                                </p>
                                                <div className="flex items-center gap-4 mt-1.5">
                                                    <span className="text-[11px] text-zinc-600 flex items-center gap-1.5">
                                                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                                        </svg>
                                                        {file.size}
                                                    </span>
                                                    <span className="text-[11px] text-zinc-600 flex items-center gap-1.5">
                                                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                                                        </svg>
                                                        {file.resolution}
                                                    </span>
                                                </div>
                                                <p className="text-[10px] text-zinc-700 truncate mt-1" title={file.path}>
                                                    {file.path}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Zoom Modal */}
            {zoomedImage && (
                <div
                    className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-sm flex items-center justify-center p-8 cursor-pointer animate-fade-in"
                    onClick={() => setZoomedImage(null)}
                >
                    <img
                        src={zoomedImage}
                        alt="Zoomed"
                        className="max-w-full max-h-full object-contain rounded-xl shadow-2xl"
                    />
                    <button
                        className="absolute top-6 right-6 text-zinc-500 hover:text-white transition-colors bg-white/5 hover:bg-white/10
                                   rounded-xl p-2.5 border border-white/10"
                        onClick={() => setZoomedImage(null)}
                    >
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            )}
        </div>
    );
};

export default DuplicateManager;

import React, { useState, useEffect } from 'react';

const DuplicateManager = ({ duplicateGroups, onDelete, scanMode = 'single' }) => {
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
        <div className="max-w-[1600px] mx-auto py-8 pb-28 relative z-10" style={{ paddingLeft: '48px', paddingRight: '48px' }}>
            {/* Results Header */}
            <header className="animate-fade-in-up" style={{
                position: 'sticky',
                top: '100px',
                zIndex: 15,
                background: 'rgba(10, 10, 15, 0.9)',
                backdropFilter: 'blur(12px)',
                paddingTop: '16px',
                paddingBottom: '16px',
                marginBottom: '16px',
                marginLeft: '-16px',
                marginRight: '-16px',
                paddingLeft: '16px',
                paddingRight: '16px',
                borderRadius: '12px',
            }}>
                <h2 className="text-2xl font-bold text-white mb-1">
                    {scanMode === 'compare' ? 'Cross-Folder Matches' : 'Side-by-Side Comparison'}
                </h2>
                <p className="text-sm text-zinc-500">
                    {duplicateGroups.length} {scanMode === 'compare' ? 'matching group' : 'group'}{duplicateGroups.length !== 1 ? 's' : ''} found —
                    click images to mark for deletion
                </p>
            </header>

            {/* Floating Delete Bar */}
            <div
                style={{
                    position: 'fixed',
                    bottom: selectedFiles.length > 0 ? '16px' : '-80px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    zIndex: 50,
                    width: '100%',
                    maxWidth: '680px',
                    padding: '0 16px',
                    transition: 'bottom 0.3s ease',
                    pointerEvents: selectedFiles.length > 0 ? 'auto' : 'none',
                }}
            >
                <div style={{
                    background: 'rgba(15, 15, 25, 0.92)',
                    backdropFilter: 'blur(16px)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '16px',
                    padding: '14px 24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                            width: '32px', height: '32px', borderRadius: '50%',
                            background: 'rgba(239, 68, 68, 0.15)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                            <span style={{ fontSize: '14px', fontWeight: 700, color: '#f87171' }}>{selectedFiles.length}</span>
                        </div>
                        <span style={{ fontSize: '14px', color: '#a1a1aa' }}>
                            file{selectedFiles.length !== 1 ? 's' : ''} marked
                        </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button
                            onClick={() => setSelectedFiles([])}
                            style={{
                                padding: '8px 16px',
                                background: 'transparent',
                                border: '1px solid rgba(255,255,255,0.08)',
                                borderRadius: '10px',
                                color: '#71717a',
                                fontSize: '13px',
                                fontWeight: 500,
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.color = '#d4d4d8'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.color = '#71717a'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}
                        >
                            Clear All
                        </button>
                        <button
                            onClick={handleDelete}
                            disabled={deleting}
                            style={{
                                padding: '8px 20px',
                                background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                                border: 'none',
                                borderRadius: '10px',
                                color: '#fff',
                                fontSize: '13px',
                                fontWeight: 600,
                                cursor: deleting ? 'not-allowed' : 'pointer',
                                opacity: deleting ? 0.5 : 1,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                boxShadow: '0 2px 8px rgba(239, 68, 68, 0.3)',
                                transition: 'all 0.2s ease',
                            }}
                        >
                            {deleting ? (
                                <>
                                    <svg className="animate-spin" style={{ height: '14px', width: '14px' }} viewBox="0 0 24 24">
                                        <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                        <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                    Deleting...
                                </>
                            ) : (
                                <>
                                    <svg style={{ height: '14px', width: '14px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                    Delete Selected
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Duplicate Groups */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                {duplicateGroups.map((group, groupIndex) => {
                    const groupSelectedCount = group.samples.filter(f => selectedFiles.includes(f.path)).length;
                    return (
                        <div
                            key={group.hash}
                            className="glass rounded-2xl overflow-hidden card-hover animate-fade-in-up"
                            style={{ animationDelay: `${groupIndex * 80}ms` }}
                        >
                            {/* Group Header */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <span style={{
                                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                        width: '28px', height: '28px', borderRadius: '8px',
                                        background: 'rgba(139, 92, 246, 0.15)', color: '#a78bfa',
                                        fontSize: '12px', fontWeight: 700,
                                    }}>
                                        {groupIndex + 1}
                                    </span>
                                    <span style={{ fontSize: '13px', color: '#a1a1aa' }}>
                                        <strong style={{ color: '#e4e4e7' }}>{group.samples.length}</strong> identical files
                                    </span>
                                    <span style={{
                                        fontFamily: 'monospace', fontSize: '11px', color: '#52525b',
                                        background: 'rgba(255,255,255,0.05)', padding: '2px 10px', borderRadius: '6px',
                                    }}>
                                        {group.hash.substring(0, 12)}
                                    </span>
                                    {groupSelectedCount > 0 && (
                                        <span style={{
                                            fontSize: '11px', color: '#f87171',
                                            background: 'rgba(239, 68, 68, 0.1)', padding: '3px 10px',
                                            borderRadius: '20px', fontWeight: 500,
                                        }}>
                                            {groupSelectedCount} marked
                                        </span>
                                    )}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <button
                                        onClick={() => selectAllInGroup(group)}
                                        style={{
                                            fontSize: '12px', color: '#a78bfa', fontWeight: 500,
                                            padding: '6px 14px', borderRadius: '8px', border: '1px solid rgba(139, 92, 246, 0.2)',
                                            background: 'rgba(139, 92, 246, 0.08)', cursor: 'pointer',
                                            transition: 'all 0.2s ease',
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.background = 'rgba(139, 92, 246, 0.15)';
                                            e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.35)';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.background = 'rgba(139, 92, 246, 0.08)';
                                            e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.2)';
                                        }}
                                    >
                                        Select duplicates
                                    </button>
                                    <button
                                        onClick={() => deselectAllInGroup(group)}
                                        style={{
                                            fontSize: '12px', color: '#71717a', fontWeight: 500,
                                            padding: '6px 14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)',
                                            background: 'transparent', cursor: 'pointer',
                                            transition: 'all 0.2s ease',
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                                            e.currentTarget.style.color = '#a1a1aa';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.background = 'transparent';
                                            e.currentTarget.style.color = '#71717a';
                                        }}
                                    >
                                        Clear
                                    </button>
                                </div>
                            </div>

                            {/* Side-by-side image row */}
                            <div style={{ display: 'flex', overflowX: 'auto', gap: '12px', padding: '12px' }}>
                                {group.samples.map((file, fileIndex) => {
                                    const isSelected = selectedFiles.includes(file.path);
                                    const imgSrc = file.blobUrl || '';
                                    return (
                                        <div
                                            key={file.path}
                                            className={`flex-shrink-0 flex flex-col transition-all duration-200 relative rounded-xl overflow-hidden
                                                ${group.samples.length <= 3 ? 'flex-1 min-w-[280px]' : 'w-[320px]'}
                                                ${isSelected ? 'ring-2 ring-red-500/50 bg-red-500/5' : 'ring-1 ring-white/10 hover:ring-white/20'}
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

                                                {/* Badge — folder label in compare mode, Original/Copy in single mode */}
                                                {scanMode === 'compare' && file.folderName ? (
                                                    <span style={{
                                                        position: 'absolute', top: '12px', left: '12px',
                                                        background: file.folder === 'A' ? 'rgba(59, 130, 246, 0.85)' : 'rgba(16, 185, 129, 0.85)',
                                                        backdropFilter: 'blur(8px)',
                                                        color: '#fff', fontSize: '10px', fontWeight: 700,
                                                        padding: '4px 10px', borderRadius: '8px',
                                                        textTransform: 'uppercase', letterSpacing: '0.05em',
                                                        boxShadow: file.folder === 'A'
                                                            ? '0 2px 8px rgba(59, 130, 246, 0.3)'
                                                            : '0 2px 8px rgba(16, 185, 129, 0.3)',
                                                    }}>
                                                        📁 {file.folderName}
                                                    </span>
                                                ) : (
                                                    <>
                                                        {fileIndex === 0 && (
                                                            <span className="absolute top-3 left-3 bg-emerald-500/90 backdrop-blur-sm text-white text-[10px]
                                                                             font-bold px-2.5 py-1 rounded-lg shadow-lg shadow-emerald-500/20 uppercase tracking-wider">
                                                                ★ Original
                                                            </span>
                                                        )}
                                                        {fileIndex > 0 && (
                                                            <span className="absolute top-3 left-3 bg-amber-500/80 backdrop-blur-sm text-white text-[10px]
                                                                             font-bold px-2.5 py-1 rounded-lg shadow-lg uppercase tracking-wider">
                                                                Copy {fileIndex}
                                                            </span>
                                                        )}
                                                    </>
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
                                                <p className="text-[10px] text-zinc-500 truncate mt-1" title={file.path}>
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

            {/* Advertisement */}
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '32px' }}>
                <a href='https://s.click.aliexpress.com/e/_c4dF3RSP?bz=725*90' target='_parent'>
                    <img width='725' height='90' src='https://ae-pic-a1.aliexpress-media.com/kf/S4d974047acf24e1c83066e09c4f8c5adw.png' />
                </a>
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

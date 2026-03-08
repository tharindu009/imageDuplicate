import React, { useState } from 'react';

const DuplicateManager = ({ duplicateGroups, onDelete }) => {
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [deleting, setDeleting] = useState(false);
    const [zoomedImage, setZoomedImage] = useState(null);

    const toggleSelection = (path) => {
        setSelectedFiles(prev =>
            prev.includes(path) ? prev.filter(p => p !== path) : [...prev, path]
        );
    };

    const selectAllInGroup = (group) => {
        // Select all except the first one (keep the original)
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
            <div className="flex flex-col items-center justify-center h-[50vh] text-gray-400">
                <svg className="h-16 w-16 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-lg font-medium text-gray-600">No duplicates found!</p>
                <p className="text-sm mt-1">All images in this folder are unique.</p>
            </div>
        );
    }

    return (
        <div className="max-w-[1600px] mx-auto px-6 py-6">
            {/* Header */}
            <header className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Side-by-Side Comparison</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        {duplicateGroups.length} group{duplicateGroups.length !== 1 ? 's' : ''} found —
                        click images to mark for deletion
                    </p>
                </div>
                <button
                    onClick={handleDelete}
                    className="bg-red-500 hover:bg-red-600 text-white px-6 py-2.5 rounded-lg font-medium shadow-md
                     transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                    disabled={selectedFiles.length === 0 || deleting}
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
                            Delete Selected ({selectedFiles.length})
                        </>
                    )}
                </button>
            </header>

            {/* Duplicate Groups — Row-based comparison */}
            <div className="space-y-6">
                {duplicateGroups.map((group, groupIndex) => {
                    const groupSelectedCount = group.samples.filter(f => selectedFiles.includes(f.path)).length;
                    return (
                        <div key={group.hash} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                            {/* Group Header */}
                            <div className="flex items-center justify-between px-5 py-3 bg-gray-50 border-b border-gray-200">
                                <div className="flex items-center gap-3">
                                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">
                                        {groupIndex + 1}
                                    </span>
                                    <span className="text-sm text-gray-600">
                                        <strong>{group.samples.length}</strong> identical files
                                    </span>
                                    <span className="font-mono text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
                                        {group.hash.substring(0, 10)}…
                                    </span>
                                    {groupSelectedCount > 0 && (
                                        <span className="text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded-full font-medium">
                                            {groupSelectedCount} marked
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => selectAllInGroup(group)}
                                        className="text-xs text-blue-600 hover:text-blue-800 font-medium px-3 py-1 rounded
                               hover:bg-blue-50 transition"
                                    >
                                        Select all but first
                                    </button>
                                    <button
                                        onClick={() => deselectAllInGroup(group)}
                                        className="text-xs text-gray-500 hover:text-gray-700 font-medium px-3 py-1 rounded
                               hover:bg-gray-100 transition"
                                    >
                                        Clear
                                    </button>
                                </div>
                            </div>

                            {/* Side-by-side image row */}
                            <div className="flex overflow-x-auto gap-0 divide-x divide-gray-100">
                                {group.samples.map((file, fileIndex) => {
                                    const isSelected = selectedFiles.includes(file.path);
                                    return (
                                        <div
                                            key={file.path}
                                            className={`flex-shrink-0 flex flex-col transition-all relative
                        ${group.samples.length <= 3 ? 'flex-1 min-w-[280px]' : 'w-[320px]'}
                        ${isSelected ? 'bg-red-50' : 'bg-white hover:bg-gray-50'}
                      `}
                                        >
                                            {/* Image with click-to-select */}
                                            <div
                                                className="relative cursor-pointer group"
                                                onClick={() => toggleSelection(file.path)}
                                            >
                                                <img
                                                    src={`http://localhost:5000/api/images?path=${encodeURIComponent(file.path)}`}
                                                    alt={file.path.split('/').pop()}
                                                    className={`w-full h-56 object-cover transition-all
                            ${isSelected ? 'opacity-60' : 'group-hover:opacity-90'}
                          `}
                                                    loading="lazy"
                                                />

                                                {/* Selection overlay */}
                                                {isSelected && (
                                                    <div className="absolute inset-0 flex items-center justify-center bg-red-500/20">
                                                        <div className="bg-red-500 text-white rounded-full p-2 shadow-lg">
                                                            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                                            </svg>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Hover overlay for unselected */}
                                                {!isSelected && (
                                                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100
                                          bg-black/10 transition-opacity">
                                                        <div className="bg-white/90 text-gray-700 rounded-full p-2 shadow-md">
                                                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                            </svg>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* File index badge */}
                                                {fileIndex === 0 && (
                                                    <span className="absolute top-2 left-2 bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow">
                                                        ORIGINAL
                                                    </span>
                                                )}

                                                {/* Zoom button */}
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setZoomedImage(`http://localhost:5000/api/images?path=${encodeURIComponent(file.path)}`);
                                                    }}
                                                    className="absolute top-2 right-2 bg-white/80 hover:bg-white text-gray-600 rounded-full p-1.5
                                     opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                                                >
                                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                                                    </svg>
                                                </button>
                                            </div>

                                            {/* File info */}
                                            <div className={`px-4 py-3 border-t ${isSelected ? 'border-red-200' : 'border-gray-100'}`}>
                                                <p className="text-xs font-medium text-gray-700 truncate" title={file.path}>
                                                    {file.path.split('/').pop()}
                                                </p>
                                                <div className="flex items-center gap-3 mt-1.5">
                                                    <span className="text-[11px] text-gray-400 flex items-center gap-1">
                                                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10c0 2 1 3 3 3h10c2 0 3-1 3-3V7M4 7l8-4 8 4" />
                                                        </svg>
                                                        {file.size}
                                                    </span>
                                                    <span className="text-[11px] text-gray-400 flex items-center gap-1">
                                                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                                                        </svg>
                                                        {file.resolution}
                                                    </span>
                                                </div>
                                                <p className="text-[10px] text-gray-300 truncate mt-1" title={file.path}>
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
                    className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-8 cursor-pointer"
                    onClick={() => setZoomedImage(null)}
                >
                    <img
                        src={zoomedImage}
                        alt="Zoomed"
                        className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                    />
                    <button
                        className="absolute top-6 right-6 text-white/70 hover:text-white transition"
                        onClick={() => setZoomedImage(null)}
                    >
                        <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            )}
        </div>
    );
};

export default DuplicateManager;

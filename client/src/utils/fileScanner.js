/**
 * Client-side duplicate image scanner using the File System Access API.
 * All processing happens in the browser — no files leave the user's machine.
 */

const IMAGE_EXTENSIONS = new Set([
    'jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'tiff', 'tif', 'svg', 'ico',
]);

/**
 * Check if the File System Access API is supported.
 */
export function isFileSystemAccessSupported() {
    return typeof window !== 'undefined' && 'showDirectoryPicker' in window;
}

/**
 * Prompt the user to select a directory.
 * Returns a FileSystemDirectoryHandle or null if cancelled.
 */
export async function pickDirectory() {
    try {
        const handle = await window.showDirectoryPicker({ mode: 'readwrite' });
        return handle;
    } catch (err) {
        if (err.name === 'AbortError') return null; // user cancelled
        throw err;
    }
}

/**
 * Format bytes into a human-readable string.
 */
function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
}

/**
 * Get image dimensions using an Image element.
 */
function getImageDimensions(blobUrl) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(`${img.naturalWidth}×${img.naturalHeight}`);
        img.onerror = () => resolve('N/A');
        img.src = blobUrl;
    });
}

/**
 * Recursively collect all image files from a directory handle.
 * Returns an array of { file, handle, parentHandle, relativePath }.
 */
async function collectImageFiles(dirHandle, relativePath = '', onProgress) {
    const results = [];

    for await (const [name, entryHandle] of dirHandle) {
        const entryPath = relativePath ? `${relativePath}/${name}` : name;

        if (entryHandle.kind === 'directory') {
            try {
                const subResults = await collectImageFiles(entryHandle, entryPath, onProgress);
                results.push(...subResults);
            } catch (err) {
                console.warn(`Cannot read directory: ${entryPath} — ${err.message}`);
            }
        } else if (entryHandle.kind === 'file') {
            const ext = name.split('.').pop()?.toLowerCase();
            if (ext && IMAGE_EXTENSIONS.has(ext)) {
                try {
                    const file = await entryHandle.getFile();
                    results.push({
                        file,
                        handle: entryHandle,
                        parentHandle: dirHandle,
                        name,
                        relativePath: entryPath,
                    });
                    if (onProgress) onProgress({ phase: 'collecting', count: results.length });
                } catch (err) {
                    console.warn(`Cannot read file: ${entryPath} — ${err.message}`);
                }
            }
        }
    }

    return results;
}

/**
 * Hash a file's contents using SHA-256 via the Web Crypto API.
 */
async function hashFile(file) {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Scan a directory for duplicate images.
 *
 * @param {FileSystemDirectoryHandle} dirHandle — the selected folder
 * @param {Function} onProgress — callback({ phase, count, total, current })
 * @returns {{ duplicateGroups: Array, totalImages: number }}
 */
export async function scanForDuplicates(dirHandle, onProgress) {
    // Phase 1: Collect all image files
    if (onProgress) onProgress({ phase: 'collecting', count: 0 });
    const imageFiles = await collectImageFiles(dirHandle, '', onProgress);

    if (imageFiles.length === 0) {
        return { duplicateGroups: [], totalImages: 0 };
    }

    // Phase 2: Hash each file
    const hashMap = new Map(); // hash → [fileEntry, ...]

    for (let i = 0; i < imageFiles.length; i++) {
        const entry = imageFiles[i];
        if (onProgress) {
            onProgress({
                phase: 'hashing',
                count: i + 1,
                total: imageFiles.length,
                current: entry.name,
            });
        }

        try {
            const hash = await hashFile(entry.file);
            if (!hashMap.has(hash)) {
                hashMap.set(hash, []);
            }
            hashMap.get(hash).push(entry);
        } catch (err) {
            console.warn(`Failed to hash: ${entry.relativePath} — ${err.message}`);
        }
    }

    // Phase 3: Build duplicate groups (only groups with 2+ files)
    const duplicateGroups = [];

    for (const [hash, entries] of hashMap) {
        if (entries.length < 2) continue;

        const samples = await Promise.all(
            entries.map(async (entry) => {
                const blob = new Blob([await entry.file.arrayBuffer()], { type: entry.file.type });
                const blobUrl = URL.createObjectURL(blob);
                const resolution = await getImageDimensions(blobUrl);

                return {
                    path: entry.relativePath,
                    name: entry.name,
                    size: formatFileSize(entry.file.size),
                    sizeBytes: entry.file.size,
                    resolution,
                    blobUrl,
                    handle: entry.handle,
                    parentHandle: entry.parentHandle,
                };
            })
        );

        duplicateGroups.push({ hash, count: entries.length, samples });
    }

    return { duplicateGroups, totalImages: imageFiles.length };
}

/**
 * Compare two folders to find matching images across them.
 *
 * @param {FileSystemDirectoryHandle} dirHandleA — first folder
 * @param {FileSystemDirectoryHandle} dirHandleB — second folder
 * @param {Function} onProgress — callback({ phase, count, total, current })
 * @returns {{ duplicateGroups: Array, totalImages: number }}
 */
export async function compareFolders(dirHandleA, dirHandleB, onProgress) {
    // Phase 1: Collect images from both folders
    if (onProgress) onProgress({ phase: 'collecting', count: 0, folder: 'A' });
    const filesA = await collectImageFiles(dirHandleA, dirHandleA.name, (p) => {
        if (onProgress) onProgress({ ...p, folder: 'A' });
    });

    if (onProgress) onProgress({ phase: 'collecting', count: 0, folder: 'B' });
    const filesB = await collectImageFiles(dirHandleB, dirHandleB.name, (p) => {
        if (onProgress) onProgress({ ...p, folder: 'B' });
    });

    const allFiles = [
        ...filesA.map(f => ({ ...f, folder: 'A', folderName: dirHandleA.name })),
        ...filesB.map(f => ({ ...f, folder: 'B', folderName: dirHandleB.name })),
    ];

    if (allFiles.length === 0) {
        return { duplicateGroups: [], totalImages: 0 };
    }

    // Phase 2: Hash all files
    const hashMap = new Map();

    for (let i = 0; i < allFiles.length; i++) {
        const entry = allFiles[i];
        if (onProgress) {
            onProgress({
                phase: 'hashing',
                count: i + 1,
                total: allFiles.length,
                current: entry.name,
            });
        }

        try {
            const hash = await hashFile(entry.file);
            if (!hashMap.has(hash)) {
                hashMap.set(hash, []);
            }
            hashMap.get(hash).push(entry);
        } catch (err) {
            console.warn(`Failed to hash: ${entry.relativePath} — ${err.message}`);
        }
    }

    // Phase 3: Build groups — only keep groups that have files from BOTH folders
    const duplicateGroups = [];

    for (const [hash, entries] of hashMap) {
        const hasA = entries.some(e => e.folder === 'A');
        const hasB = entries.some(e => e.folder === 'B');
        if (!hasA || !hasB) continue; // skip if only in one folder

        const samples = await Promise.all(
            entries.map(async (entry) => {
                const blob = new Blob([await entry.file.arrayBuffer()], { type: entry.file.type });
                const blobUrl = URL.createObjectURL(blob);
                const resolution = await getImageDimensions(blobUrl);

                return {
                    path: entry.relativePath,
                    name: entry.name,
                    size: formatFileSize(entry.file.size),
                    sizeBytes: entry.file.size,
                    resolution,
                    blobUrl,
                    handle: entry.handle,
                    parentHandle: entry.parentHandle,
                    folder: entry.folder,
                    folderName: entry.folderName,
                };
            })
        );

        duplicateGroups.push({ hash, count: entries.length, samples });
    }

    return { duplicateGroups, totalImages: allFiles.length };
}

/**
 * Delete files using their File System Access API handles.
 *
 * @param {Array} filesToDelete — array of { handle, parentHandle, name, path }
 * @returns {{ deleted: string[], errors: { path: string, error: string }[] }}
 */
export async function deleteFiles(filesToDelete) {
    const results = { deleted: [], errors: [] };

    for (const file of filesToDelete) {
        try {
            await file.parentHandle.removeEntry(file.name);
            results.deleted.push(file.path);

            // Revoke blob URL to free memory
            if (file.blobUrl) {
                URL.revokeObjectURL(file.blobUrl);
            }
        } catch (err) {
            results.errors.push({ path: file.path, error: err.message });
        }
    }

    return results;
}

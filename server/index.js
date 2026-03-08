const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const sizeOf = require('image-size');

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

// Supported image extensions
const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.tiff', '.tif']);

/**
 * Recursively find all image files in a directory
 */
function findImages(dirPath, results = []) {
    let entries;
    try {
        entries = fs.readdirSync(dirPath, { withFileTypes: true });
    } catch (err) {
        console.warn(`Cannot read directory: ${dirPath} — ${err.message}`);
        return results;
    }

    for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        if (entry.isDirectory()) {
            findImages(fullPath, results);
        } else if (entry.isFile()) {
            const ext = path.extname(entry.name).toLowerCase();
            if (IMAGE_EXTENSIONS.has(ext)) {
                results.push(fullPath);
            }
        }
    }

    return results;
}

/**
 * Compute SHA-256 hash of a file
 */
function hashFile(filePath) {
    const buffer = fs.readFileSync(filePath);
    return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * Format file size to human-readable string
 */
function formatSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Get image resolution safely
 */
function getResolution(filePath) {
    try {
        const dimensions = sizeOf(filePath);
        return `${dimensions.width}x${dimensions.height}`;
    } catch {
        return 'Unknown';
    }
}

// ─── POST /api/scan ─────────────────────────────────────────────
// Scan a folder for duplicate images
app.post('/api/scan', (req, res) => {
    const { folderPath } = req.body;

    if (!folderPath) {
        return res.status(400).json({ error: 'folderPath is required' });
    }

    // Resolve and validate the path
    const resolvedPath = path.resolve(folderPath);
    if (!fs.existsSync(resolvedPath)) {
        return res.status(400).json({ error: `Path does not exist: ${resolvedPath}` });
    }

    const stat = fs.statSync(resolvedPath);
    if (!stat.isDirectory()) {
        return res.status(400).json({ error: `Path is not a directory: ${resolvedPath}` });
    }

    console.log(`Scanning: ${resolvedPath}`);

    // Find all images
    const imagePaths = findImages(resolvedPath);
    console.log(`Found ${imagePaths.length} images`);

    // Hash each image and group by hash
    const hashMap = {};
    for (const imgPath of imagePaths) {
        try {
            const hash = hashFile(imgPath);
            if (!hashMap[hash]) {
                hashMap[hash] = [];
            }
            const stats = fs.statSync(imgPath);
            hashMap[hash].push({
                path: imgPath,
                size: formatSize(stats.size),
                resolution: getResolution(imgPath),
            });
        } catch (err) {
            console.warn(`Error processing ${imgPath}: ${err.message}`);
        }
    }

    // Filter to only groups with 2+ files (actual duplicates)
    const duplicateGroups = Object.entries(hashMap)
        .filter(([, files]) => files.length >= 2)
        .map(([hash, samples]) => ({ hash, samples }));

    console.log(`Found ${duplicateGroups.length} duplicate groups`);

    res.json({
        totalImages: imagePaths.length,
        duplicateGroups,
    });
});

// ─── GET /api/images ────────────────────────────────────────────
// Serve an image file by its absolute path
app.get('/api/images', (req, res) => {
    const filePath = req.query.path;

    if (!filePath) {
        return res.status(400).json({ error: 'path query parameter is required' });
    }

    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'File not found' });
    }

    res.sendFile(filePath);
});

// ─── POST /api/delete ───────────────────────────────────────────
// Delete selected image files
app.post('/api/delete', (req, res) => {
    const { files } = req.body;

    if (!files || !Array.isArray(files) || files.length === 0) {
        return res.status(400).json({ error: 'files array is required' });
    }

    const results = { deleted: [], errors: [] };

    for (const filePath of files) {
        try {
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                results.deleted.push(filePath);
                console.log(`Deleted: ${filePath}`);
            } else {
                results.errors.push({ path: filePath, error: 'File not found' });
            }
        } catch (err) {
            results.errors.push({ path: filePath, error: err.message });
        }
    }

    res.json(results);
});

// ─── Start Server ───────────────────────────────────────────────
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

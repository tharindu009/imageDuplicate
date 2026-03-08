import { useState, useRef } from 'react'
import './App.css'
import DuplicateManager from './page/DuplicateManager'
import { isFileSystemAccessSupported, pickDirectory, scanForDuplicates, deleteFiles } from './utils/fileScanner'

function App() {
  const [duplicateGroups, setDuplicateGroups] = useState([])
  const [totalImages, setTotalImages] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [scanned, setScanned] = useState(false)
  const [folderName, setFolderName] = useState('')
  const [progress, setProgress] = useState(null)
  const dirHandleRef = useRef(null)

  const isSupported = isFileSystemAccessSupported()

  const handleSelectAndScan = async () => {
    setError('')
    setProgress(null)

    try {
      const dirHandle = await pickDirectory()
      if (!dirHandle) return // user cancelled

      dirHandleRef.current = dirHandle
      setFolderName(dirHandle.name)
      setLoading(true)
      setScanned(false)

      const result = await scanForDuplicates(dirHandle, (p) => {
        setProgress(p)
      })

      setDuplicateGroups(result.duplicateGroups)
      setTotalImages(result.totalImages)
      setScanned(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
      setProgress(null)
    }
  }

  const handleRescan = async () => {
    if (!dirHandleRef.current) return
    setLoading(true)
    setError('')
    setScanned(false)
    setProgress(null)

    try {
      const result = await scanForDuplicates(dirHandleRef.current, (p) => {
        setProgress(p)
      })
      setDuplicateGroups(result.duplicateGroups)
      setTotalImages(result.totalImages)
      setScanned(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
      setProgress(null)
    }
  }

  const handleDelete = async (selectedFilePaths) => {
    // Build file entries from duplicate groups matching paths
    const filesToDelete = []
    for (const group of duplicateGroups) {
      for (const sample of group.samples) {
        if (selectedFilePaths.includes(sample.path)) {
          filesToDelete.push(sample)
        }
      }
    }

    const result = await deleteFiles(filesToDelete)

    if (result.errors.length > 0) {
      setError(`Failed to delete ${result.errors.length} file(s): ${result.errors[0].error}`)
    }

    if (result.deleted.length > 0) {
      await handleRescan()
    }

    return result
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] bg-grid relative" style={{ overflowX: 'hidden' }}>
      {/* Ambient background glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-purple-600/[0.07] rounded-full blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-indigo-600/[0.05] rounded-full blur-[120px]" />
      </div>

      {/* Navigation */}
      <nav className="sticky top-0 z-30 glass-dark">
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '12px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div className="flex items-center gap-3">
            {/* Logo */}
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
              <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h1 className="text-lg font-bold tracking-tight">
              <span className="gradient-text">DupliCleaner</span>
            </h1>
          </div>
          <a href="https://github.com/tharindu009/imageDuplicate" target="_blank" rel="noopener noreferrer"
            className="text-zinc-500 hover:text-violet-400 transition-colors">
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
          </a>
        </div>
      </nav>

      {/* Hero / Search Section */}
      {!scanned && !loading ? (
        <div className="relative z-10 flex flex-col items-center justify-center min-h-[85vh] px-6">
          <div className="text-center max-w-3xl animate-fade-in-up">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass mb-6 text-xs font-medium text-violet-300">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              Free & Open Source
            </div>

            {/* Heading */}
            <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight mb-6 leading-[1.1]">
              <span className="text-white">Find & Clean</span><br />
              <span className="gradient-text">Duplicate Images</span>
            </h1>

            <p className="text-zinc-400 text-lg leading-relaxed max-w-xl mx-auto" style={{ marginBottom: '56px' }}>
              Scan any folder, compare duplicates side-by-side, and reclaim your storage. Fast, private, and runs entirely in your browser.
            </p>

            {/* Select Folder Button */}
            <div className="w-full max-w-2xl mx-auto">
              {isSupported ? (
                <div className="relative" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <button
                    onClick={handleSelectAndScan}
                    disabled={loading}
                    style={{
                      width: '100%',
                      padding: '20px 32px',
                      background: 'linear-gradient(135deg, #7c3aed 0%, #6366f1 100%)',
                      border: 'none',
                      borderRadius: '16px',
                      color: '#fff',
                      fontSize: '16px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '12px',
                      transition: 'all 0.3s ease',
                      boxShadow: '0 4px 20px rgba(124, 58, 237, 0.3)',
                      letterSpacing: '0.02em',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 8px 30px rgba(124, 58, 237, 0.45)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 4px 20px rgba(124, 58, 237, 0.3)';
                    }}
                  >
                    <svg style={{ height: '20px', width: '20px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
                    </svg>
                    Select Folder & Scan
                  </button>

                  <p className="text-zinc-600 text-sm text-center">
                    Your browser will ask you to pick a folder — no files are uploaded anywhere
                  </p>
                </div>
              ) : (
                /* Unsupported browser fallback */
                <div style={{
                  padding: '24px',
                  background: 'rgba(234, 179, 8, 0.08)',
                  border: '1.5px solid rgba(234, 179, 8, 0.2)',
                  borderRadius: '16px',
                  textAlign: 'center',
                }}>
                  <svg style={{ height: '32px', width: '32px', margin: '0 auto 12px', color: '#eab308' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                  </svg>
                  <p style={{ color: '#eab308', fontWeight: 600, fontSize: '15px', marginBottom: '8px' }}>
                    Browser Not Supported
                  </p>
                  <p style={{ color: '#a1a1aa', fontSize: '14px', lineHeight: 1.6 }}>
                    The File System Access API is required for client-side scanning.<br />
                    Please use <strong style={{ color: '#fff' }}>Google Chrome</strong>, <strong style={{ color: '#fff' }}>Microsoft Edge</strong>, or <strong style={{ color: '#fff' }}>Opera</strong>.
                  </p>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="mt-4 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 animate-fade-in">
                  <div className="flex items-center gap-2">
                    <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                    </svg>
                    {error}
                  </div>
                </div>
              )}
            </div>

            {/* Features */}
            <div className="flex flex-wrap items-center justify-center gap-10 text-sm text-zinc-500" style={{ marginTop: '48px' }}>
              <div className="flex items-center gap-2">
                <svg className="h-4 w-4 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                100% Private & Local
              </div>
              <div className="flex items-center gap-2">
                <svg className="h-4 w-4 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                SHA-256 Hashing
              </div>
              <div className="flex items-center gap-2">
                <svg className="h-4 w-4 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                No Upload Required
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Compact Top Bar (when scanning/scanned) */}
          <div className="sticky top-[52px] z-20 glass-dark border-b border-white/5">
            <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '12px 32px' }}>
              <div className="flex items-center gap-3">
                {/* Folder info */}
                <div className="flex items-center gap-2 flex-1">
                  <svg className="h-4 w-4 text-violet-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
                  </svg>
                  <span className="text-sm text-zinc-300 font-medium truncate">{folderName}</span>
                </div>

                {/* Action buttons */}
                <button
                  onClick={handleRescan}
                  disabled={loading}
                  className="btn-primary px-5 py-2 rounded-xl text-white font-semibold text-sm
                             disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Scanning...
                    </>
                  ) : (
                    'Re-scan'
                  )}
                </button>
                <button
                  onClick={handleSelectAndScan}
                  disabled={loading}
                  className="text-sm text-zinc-500 hover:text-violet-400 font-medium px-4 py-2 rounded-xl
                             hover:bg-white/5 transition disabled:opacity-40"
                >
                  Change Folder
                </button>
              </div>

              {/* Error */}
              {error && (
                <div className="mt-2 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2 animate-fade-in">
                  {error}
                </div>
              )}

              {/* Stats */}
              {scanned && !loading && (
                <div className="flex items-center gap-4 mt-2.5">
                  <div className="flex items-center gap-2 text-xs text-zinc-500">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                    <span><strong className="text-zinc-300">{totalImages}</strong> images scanned</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-zinc-500">
                    <div className="w-1.5 h-1.5 rounded-full bg-violet-400" />
                    <span><strong className="text-zinc-300">{duplicateGroups.length}</strong> duplicate group{duplicateGroups.length !== 1 ? 's' : ''}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Loading State with Progress */}
          {loading && (
            <div className="flex flex-col items-center justify-center h-[60vh] animate-fade-in">
              <div className="relative">
                <div className="w-16 h-16 rounded-full border-2 border-violet-500/20 border-t-violet-500 animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <svg className="h-6 w-6 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>

              {progress && progress.phase === 'collecting' && (
                <>
                  <p className="text-zinc-400 mt-6 font-medium">Discovering images...</p>
                  <p className="text-zinc-600 text-sm mt-1">Found {progress.count} images so far</p>
                </>
              )}
              {progress && progress.phase === 'hashing' && (
                <>
                  <p className="text-zinc-400 mt-6 font-medium">Hashing images...</p>
                  <p className="text-zinc-600 text-sm mt-1">
                    {progress.count} / {progress.total} — {progress.current}
                  </p>
                  {/* Progress bar */}
                  <div style={{
                    width: '240px', height: '4px', background: 'rgba(255,255,255,0.05)',
                    borderRadius: '4px', marginTop: '16px', overflow: 'hidden',
                  }}>
                    <div style={{
                      width: `${(progress.count / progress.total) * 100}%`,
                      height: '100%',
                      background: 'linear-gradient(90deg, #7c3aed, #6366f1)',
                      borderRadius: '4px',
                      transition: 'width 0.2s ease',
                    }} />
                  </div>
                </>
              )}
              {!progress && (
                <>
                  <p className="text-zinc-400 mt-6 font-medium">Scanning for duplicates...</p>
                  <p className="text-zinc-600 text-sm mt-1">This may take a moment for large folders</p>
                </>
              )}
            </div>
          )}

          {/* Results */}
          {scanned && !loading && (
            <DuplicateManager
              duplicateGroups={duplicateGroups}
              onDelete={handleDelete}
            />
          )}
        </>
      )}

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 mt-auto">
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px', color: '#52525b' }}>
          <span>© 2026 DupliCleaner. Built with ♥</span>
          <span>All processing happens in your browser</span>
        </div>
      </footer>
    </div>
  )
}

export default App

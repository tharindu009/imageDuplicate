import { useState } from 'react'
import './App.css'
import DuplicateManager from './page/DuplicateManager'

const API_BASE = 'http://localhost:5000'

function App() {
  const [folderPath, setFolderPath] = useState('')
  const [duplicateGroups, setDuplicateGroups] = useState([])
  const [totalImages, setTotalImages] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [scanned, setScanned] = useState(false)

  const handleScan = async () => {
    if (!folderPath.trim()) {
      setError('Please enter a folder path')
      return
    }

    setLoading(true)
    setError('')
    setScanned(false)

    try {
      const response = await fetch(`${API_BASE}/api/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderPath: folderPath.trim() }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to scan folder')
      }

      setDuplicateGroups(data.duplicateGroups)
      setTotalImages(data.totalImages)
      setScanned(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (selectedFiles) => {
    try {
      const response = await fetch(`${API_BASE}/api/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files: selectedFiles }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete files')
      }

      // Re-scan after deletion to refresh the list
      if (data.deleted.length > 0) {
        handleScan()
      }

      return data
    } catch (err) {
      setError(err.message)
      throw err
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Search Bar */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <input
                type="text"
                value={folderPath}
                onChange={(e) => setFolderPath(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleScan()}
                placeholder="Enter folder path to scan (e.g. /Users/you/Pictures)"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm
                           focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                           placeholder-gray-400"
                disabled={loading}
              />
            </div>
            <button
              onClick={handleScan}
              disabled={loading}
              className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg
                         font-medium shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed
                         flex items-center gap-2"
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
                'Scan for Duplicates'
              )}
            </button>
          </div>

          {/* Status bar */}
          {error && (
            <div className="mt-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
              {error}
            </div>
          )}
          {scanned && !loading && (
            <div className="mt-3 text-sm text-gray-500">
              Scanned <strong>{totalImages}</strong> images — found{' '}
              <strong>{duplicateGroups.length}</strong> duplicate group{duplicateGroups.length !== 1 ? 's' : ''}
            </div>
          )}
        </div>
      </div>

      {/* Results */}
      {scanned ? (
        <DuplicateManager
          duplicateGroups={duplicateGroups}
          onDelete={handleDelete}
        />
      ) : !loading ? (
        <div className="flex flex-col items-center justify-center h-[60vh] text-gray-400">
          <svg className="h-16 w-16 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p className="text-lg font-medium">Enter a folder path to find duplicate images</p>
          <p className="text-sm mt-1">We'll scan recursively and group images with identical content</p>
        </div>
      ) : null}
    </div>
  )
}

export default App

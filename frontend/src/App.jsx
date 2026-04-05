import { useState, useCallback } from 'react'
import { LangProvider, useLang } from './context/LangContext'
import Header from './components/Header'
import DropZone from './components/DropZone'
import FeatureTabs from './components/FeatureTabs'
import RemoveBgPanel from './components/panels/RemoveBgPanel'
import UpscalePanel from './components/panels/UpscalePanel'
import ResizePanel from './components/panels/ResizePanel'
import WatermarkPanel from './components/panels/WatermarkPanel'
import ImagePreview from './components/ImagePreview'
import LoadingSpinner from './components/LoadingSpinner'
import ErrorToast from './components/ErrorToast'
import { useImageUpload } from './hooks/useImageUpload'
import { useProcessing } from './hooks/useProcessing'

function AppInner() {
  const { tr } = useLang()
  const [activeTab, setActiveTab] = useState('removebg')
  const upload = useImageUpload()
  const { isLoading, result, error, process, clearResult } = useProcessing()

  const LOADING_MESSAGES = {
    removebg:  tr('loading_removebg'),
    upscale:   tr('loading_upscale'),
    resize:    tr('loading_resize'),
    watermark: tr('loading_watermark'),
  }

  const handleTabChange = useCallback((tab) => {
    setActiveTab(tab)
    clearResult()
  }, [clearResult])

  const handleProcess = useCallback((params = {}) => {
    if (!upload.file) return
    process(activeTab, upload.file, params)
  }, [upload.file, activeTab, process])

  const handleReset = useCallback(() => {
    upload.reset()
    clearResult()
    setActiveTab('removebg')
  }, [upload, clearResult])

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="max-w-3xl mx-auto px-4 py-6 sm:py-8 space-y-6">
        <section>
          <DropZone
            file={upload.file}
            preview={upload.preview}
            dragOver={upload.dragOver}
            uploadError={upload.uploadError}
            setDragOver={upload.setDragOver}
            handleDrop={upload.handleDrop}
            handleChange={upload.handleChange}
            reset={handleReset}
          />
        </section>

        {upload.file && (
          <>
            <section>
              <FeatureTabs activeTab={activeTab} onChange={handleTabChange} />
            </section>

            <section>
              {activeTab === 'removebg' && (
                <RemoveBgPanel onProcess={handleProcess} isLoading={isLoading} />
              )}
              {activeTab === 'upscale' && (
                <UpscalePanel onProcess={handleProcess} isLoading={isLoading} />
              )}
              {activeTab === 'resize' && (
                <ResizePanel onProcess={handleProcess} isLoading={isLoading} />
              )}
              {activeTab === 'watermark' && (
                <WatermarkPanel onProcess={handleProcess} isLoading={isLoading} />
              )}
            </section>

            {result && (
              <section>
                <ImagePreview originalPreview={upload.preview} result={result} />
              </section>
            )}
          </>
        )}
      </main>

      {isLoading && <LoadingSpinner message={LOADING_MESSAGES[activeTab]} />}
      <ErrorToast message={error} onClose={() => clearResult()} />
    </div>
  )
}

export default function App() {
  return (
    <LangProvider>
      <AppInner />
    </LangProvider>
  )
}

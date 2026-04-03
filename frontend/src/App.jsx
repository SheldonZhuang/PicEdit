import { useState, useCallback } from 'react'
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

const LOADING_MESSAGES = {
  removebg:  'AI 抠图处理中，首次加载模型约需 15~30 秒...',
  upscale:   '高清化处理中...',
  resize:    '缩放处理中...',
  watermark: '添加水印中...',
}

export default function App() {
  const [activeTab, setActiveTab] = useState('removebg')
  const upload = useImageUpload()
  const { isLoading, result, error, process, clearResult } = useProcessing()

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

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* 上传区域 */}
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

        {/* 功能区（有文件才显示）*/}
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

            {/* 结果预览 */}
            {result && (
              <section>
                <ImagePreview originalPreview={upload.preview} result={result} />
              </section>
            )}
          </>
        )}
      </main>

      {/* 全局弹层 */}
      {isLoading && <LoadingSpinner message={LOADING_MESSAGES[activeTab]} />}
      <ErrorToast message={error} onClose={() => clearResult()} />
    </div>
  )
}

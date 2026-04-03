import { ImageIcon } from 'lucide-react'

export default function Header() {
  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="max-w-5xl mx-auto flex items-center gap-3">
        <div className="bg-blue-600 p-2 rounded-xl">
          <ImageIcon className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900 leading-none">PicEdit</h1>
          <p className="text-xs text-gray-500 mt-0.5">AI 图片处理工具</p>
        </div>
      </div>
    </header>
  )
}

# PicEdit 项目说明

## 技术栈
- 前端：React 18 + Vite + Tailwind CSS（`frontend/`）
- 后端：FastAPI + Python（`backend/`）
- AI 抠图：BiRefNet-general 本地推理

## 快速启动
```bash
# 后端（首次需先下载模型：python backend/download_model.py）
cd backend && uvicorn main:app --port 8001

# 前端
cd frontend && npm run dev
# 访问 http://localhost:5173（或 5174/5175/5176）
```

## 项目知识库（随代码分发）

本项目附带 Claude Code 知识库，克隆后即可使用：

| 类型 | 路径 | 用途 |
|------|------|------|
| Skill | `.claude/skills/image-processing-app/` | AI图片处理全栈开发指南 |
| Agent | `.claude/agents/birefnet-bg-removal.md` | 抠图质量调试专用 Agent |
| Template | `.claude/templates/birefnet-postprocess-pipeline.md` | 后处理管线完整代码 |

### 如何激活

1. **Skill 自动触发**：打开项目后告诉 Claude "我要做图片处理功能"，会自动加载
2. **Agent 手动调用**：`@birefnet-bg-removal 帮我诊断这个抠图结果`
3. **Template 引用**：`参考 .claude/templates/birefnet-postprocess-pipeline.md 生成代码`

## 关键注意事项
- 模型权重 `backend/weights/` 不入 Git（约 424MB），需手动下载
- Windows CPU 推理约 30-40 秒，部署到 GPU 可降至 1-3 秒
- 后端端口默认 8001（8000 可能被占用），前端 `.env.local` 已配置
- 不要用 `--reload` 启动 uvicorn（Windows 多进程 cv2 内存问题）

# METS - Mechanism Timing Simulation

METS (Mechanism Timing Simulation) 是一個專業的機構運動時序視覺化工具，用於模擬和分析機械設備的運動時序。

## 功能特點

- 📊 **CSV 數據導入** - 支援標準 CSV 格式的時序數據導入
- 🎬 **動畫播放** - 直觀的時間軸控制和動畫播放功能
- 🎨 **視覺化呈現** - 網格化的運動時序圖表
- 🌏 **多語言支援** - 支援繁體中文、簡體中文、英文、日文
- 💾 **多格式導出** - 支援 Excel、PDF、PNG、MP4 等格式
- ⚡ **快捷鍵操作** - 豐富的鍵盤快捷鍵提升效率
- 🔄 **撤銷/重做** - 完整的編輯歷史記錄
- ⚙️ **個性化設定** - 可自定義的界面和動畫參數

## 技術架構

- **框架**: Electron + React + TypeScript
- **UI 庫**: Tailwind CSS + Radix UI
- **狀態管理**: Zustand
- **國際化**: i18next
- **構建工具**: Vite

## 開發環境設置

### 前置需求

- Node.js 18+ 
- npm 或 yarn

### 安裝依賴

```bash
npm install
```

### 開發模式

```bash
npm run dev
```

### 構建應用

```bash
# 構建所有平台
npm run build

# macOS
npm run dist:mac

# Windows
npm run dist:win

# Linux
npm run dist:linux
```

## CSV 數據格式

CSV 文件應包含以下欄位：

- `模組名稱` / `Module Name` - 機構模組的名稱
- `動作說明` / `Action Description` - 動作的描述
- `起始位置` / `Start Position` - 動作的起始位置（格數）
- `移動格數` / `Move Count` - 移動的格數
- `持續時間` / `Duration` - 每格的持續時間（毫秒）
- `階段` / `Stage` - 動作所屬的階段

範例：
```csv
模組名稱,動作說明,起始位置,移動格數,持續時間,階段
Feeder_1,material_loading,0,25,100,A
Feeder_1,vibration_control,0,20,120,A
Conveyor_1,belt_operation,10,30,100,A
```

## 快捷鍵

| 功能 | 快捷鍵 |
|------|--------|
| 播放/暫停 | `空格` |
| 停止 | `Escape` |
| 重置 | `Home` |
| 下一幀 | `→` |
| 上一幀 | `←` |
| 導入 CSV | `Ctrl/Cmd + Shift + O` |
| 導出 | `Ctrl/Cmd + Shift + E` |
| 撤銷 | `Ctrl/Cmd + Z` |
| 重做 | `Ctrl/Cmd + Shift + Z` |
| 循環播放 | `Ctrl/Cmd + L` |
| 加速 | `+` |
| 減速 | `-` |
| 切換十字線 | `C` |

## 跨平台支援

- macOS (Intel & Apple Silicon)
- Windows (x64)
- Linux (x64)

## 授權

本軟體受版權保護，保留所有權利。

---

開發者：Motionforge
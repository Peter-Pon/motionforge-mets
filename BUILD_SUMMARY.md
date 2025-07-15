# METS Build Summary - 修復版本

## 已修復的問題

✅ **白屏問題** - 修復了生產環境中的白屏問題
✅ **DevTools 問題** - 移除了生產版本中的開發者工具

## 構建完成的版本

### macOS
- **DMG 安裝包**:
  - `METS-1.0.0-x64.dmg` (Intel) - 137.7 MB
  - `METS-1.0.0-arm64.dmg` (Apple Silicon) - 132.7 MB
  
- **ZIP 便攜版**:
  - `METS-1.0.0-mac.zip` (Intel) - 132.7 MB
  - `METS-1.0.0-arm64-mac.zip` (Apple Silicon) - 127.6 MB

### Windows
- **單文件便攜版** (推薦):
  - `METS-Portable-1.0.0.exe` (x64) - 84.6 MB (雙擊即可運行，無需安裝)
  
- **安裝程序**:
  - `METS-Setup-1.0.0.exe` (x64) - 84.8 MB (標準安裝程序)
  
- **ZIP 完整版**:
  - `METS-1.0.0-win.zip` (x64) - 140.8 MB (包含所有依賴文件)

### Linux
- **AppImage 便攜版**:
  - `METS-1.0.0.AppImage` (x64) - 143.8 MB (可執行文件)
  
- **TAR.GZ 壓縮包**:
  - `mets-1.0.0.tar.gz` (x64) - 100.7 MB

## 安裝說明

### macOS
1. **DMG 安裝**：下載 DMG 文件，雙擊打開，將 METS 拖到 Applications 文件夾
2. **ZIP 便攜版**：解壓後直接運行 METS.app

### Windows
1. **單文件便攜版** (推薦)：直接雙擊 `METS-Portable-1.0.0.exe` 即可運行，無需安裝
2. **安裝程序**：運行 `METS-Setup-1.0.0.exe` 進行標準安裝
3. **ZIP 完整版**：解壓後運行 `METS.exe` (包含所有 DLL 依賴文件)

### Linux
1. **AppImage**：下載後添加執行權限 (`chmod +x METS-1.0.0.AppImage`)，然後直接運行
2. **TAR.GZ**：解壓後運行 `./mets`

## 功能特點

- ✅ CSV 數據導入/導出
- ✅ 多語言支援 (中文繁體/簡體、英語、日語)
- ✅ 動畫播放控制
- ✅ 撤銷/重做功能
- ✅ 鍵盤快捷鍵
- ✅ 跨平台支援

## 系統需求

- **macOS**: macOS 10.12 或更高版本
- **Windows**: Windows 10 或更高版本 (x64)
- **Linux**: 支援 AppImage 的現代 Linux 發行版

## 注意事項

1. 首次在 macOS 上運行時可能需要在「系統偏好設定」→「安全性與隱私」中允許運行
2. Linux 版本需要 GLIBC 2.17 或更高版本
3. 所有版本都包含完整的運行時環境，無需額外安裝依賴
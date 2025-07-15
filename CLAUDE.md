# CLAUDE Development Guidelines

## 1. Development Workflow

### Large Module Development
For major features and modules, follow this structured approach:
- **Planning Phase**: Create detailed implementation plan and break down into tasks
- **Development Phase**: Implement the planned features systematically
- **Manual Testing Phase**: Wait for human verification before proceeding

### Small Bug Fixes and Minor Changes
- Can be implemented directly without formal planning
- Quick fixes and small improvements don't require the full workflow

## 2. Git Commit Guidelines

### Commit Messages
- Write clear, concise commit messages describing the changes
- DO NOT include any AI/Claude generation indicators
- Use conventional commit format when appropriate (feat:, fix:, docs:, etc.)

### Commit Authorization
- **NEVER** commit changes automatically
- **ALWAYS** wait for explicit human instruction before committing
- Present changes for review first, then wait for commit approval

## 3. Network Access with curl

### Internal Network Access
**IMPORTANT**: When accessing internal/local network resources:
```bash
curl --noproxy '*' [URL]
```
- The `--noproxy` flag bypasses global proxy settings
- This is critical for accessing localhost and internal network resources
- Always use this flag for internal API calls and local services

### Example Usage
```bash
# Accessing local development server
curl --noproxy '*' http://localhost:3000/api/data

# Accessing internal network resources
curl --noproxy '*' http://192.168.1.100:8080/status
```

## 4. Internationalization (i18n) Guidelines

### Development Standards
- **All UI text** must use i18n functions - never hardcode text
- **Default language**: Traditional Chinese (zh-TW)
- **Supported languages**: zh-TW, zh-CN, en, ja
- **Translation keys**: Use semantic naming (e.g., `menu.file.import` not `btn_1`)
- **Dynamic content**: Support variable interpolation and pluralization

### File Structure
```
src/locales/
├── zh-TW/   # Traditional Chinese (default)
├── zh-CN/   # Simplified Chinese
├── en/      # English
└── ja/      # Japanese
```

### Best Practices
- Extract all text during component development
- Provide context comments for translators
- Test all languages during development
- Handle missing translations gracefully with fallback

## Summary
1. Large features: Plan → Develop → Test (with human verification)
2. Small fixes: Direct implementation allowed
3. Git commits: No AI markers, require explicit permission
4. curl usage: Always use `--noproxy '*'` for internal network access
5. i18n: All UI text must be internationalized, default language is zh-TW
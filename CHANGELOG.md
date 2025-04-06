# Change Log

All notable changes to the "Concatenate for AI" extension will be documented in this file.

## [0.1.4] - 2025-4-6

### Removed
- WebView-based output panel functionality including:
  - WebView HTML template and associated CSS/JS
  - File escaping logic for HTML rendering
  - Clipboard integration through WebView UI
- Legacy `concatenate.explorerFiles` command from:
  - Command palette registry
  - Explorer context menu
  - Extension activation logic
- Deprecated file copy operations from build scripts

### Changed
- **Dependency Updates**:
  - @types/node 22.13.16 → 22.14.0
  - @types/vscode 1.98.0 → 1.99.0
  - eslint 9.23.0 → 9.24.0
  - typescript 5.8.2 → 5.8.3
- Simplified content handling:
  - Removed HTML escaping from concatenation pipeline
  - Streamlined file processing logic

### Fixed
- Build process optimizations:
  - Removed unnecessary asset copying during compilation
  - Improved TypeScript compilation efficiency

## [0.1.3] - 2025-4-6

### Docs

-   Added demo animation to README.md

## [0.1.2] - 2025-4-6

### Fixed

-   Implemented HTML entity escaping for the content of each processed file, including its header and code fence wrappers. This ensures that such characters are displayed literally and safely, preventing rendering errors in the webview and maintaining the integrity of the output when saved as a new document.

## [0.1.1] - 2025-4-3

### Added

-   Distinct formatting `(empty file)` for files that are empty or contain only whitespace during concatenation, replacing the standard code block
-   Added `pricing` information to `package.json` for marketplace clarity

### Changed

-   Improved logic for counting successfully processed files to correctly include empty files while excluding files that failed to read

## [0.1.0] - 2025-4-1

### Fixed

- **Critical Packaging Bug:** Resolved an issue where the extension failed to load correctly when installed from the `.vsix` package (often resulting in "command not found" errors). This was caused by the `ignore` package (needed for `.gitignore` handling in the File Hierarchy feature) not being bundled into the extension package due to an incorrect `.vscodeignore` setting. The commands should now work reliably after installation

## [0.0.9] - 2025-3-31

### Added

- **File Hierarchy View:** Introduced a new optional feature to prepend an ASCII file hierarchy tree to the concatenated output
    - The hierarchy is generated based on the common workspace folder containing the selected files
    - It intelligently respects `.gitignore` rules found in the root and subdirectories, ensuring excluded files/folders are not shown in the tree
- **Configuration Setting:** Added a new setting `concatenate.prependFileHierarchy` (default: `false`)

### Changed

- **Asynchronous Operations:** Refactored the extension to use asynchronous file system operations (`async`/`await` with `fs/promises`)
- **Improved Error Reporting:** If reading a specific file fails during concatenation, an error message detailing the issue is now included inline
- **Enhanced Status Messages:** Updated the notification messages shown after concatenation to be more informative
- **Code Structure:** Major internal refactoring for better maintainability and organization

### Maintenance

- **Dependencies:**
    - Updated development dependencies: `@typescript-eslint/eslint-plugin`, `@typescript-eslint/parser`, `eslint`
    - Added the `ignore` package dependency to handle `.gitignore` parsing for the file hierarchy feature

## [0.0.8] - 2025-3-30

### Improved

- **Enhanced Type Safety**: Completely refactored the extension with proper TypeScript interfaces and result types
- **Better Error Handling**: Added comprehensive error handling with proper error messages for all operations
- **Improved Context Menu Visibility**: Simplified menu item conditions, making context menu options more reliably available
- **Enhanced UX**: Improved success/error messages with file count information
- **Code Quality**: Modernized codebase with async/await patterns and better TypeScript practices

### Fixed

- Issues with path handling by using `.fsPath` instead of `.path` for more reliable file access
- Fixed file reading errors by adding specific error handling for individual file issues
- Added proper markdown language identification for new documents

### Changed

- Streamlined README documentation for clarity and focus
- Simplified extension description and feature list
- Updated title in WebView to show number of concatenated files
- Changed code style to be more consistent with modern TypeScript practices

### Technical

- Added proper TypeScript interfaces for operation results
- Improved function signatures with explicit return types
- Added individual file error handling without stopping the entire operation
- Modernized async code patterns for better maintainability
- Enhanced parameter naming for better code readability

## [0.0.7] - 2025-3-30 (Initial Version)

### New

Concatenate selected files for use with AI:

- New window: Allow you to copy the generated content
- New document: Will create a new document with concatenated content

# Change Log

All notable changes to the "Concatenate for AI" extension will be documented in this file.

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

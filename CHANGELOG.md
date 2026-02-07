# Change Log

All notable changes to the "Concatenate for AI" extension will be documented in this file.

## [0.4.8] - 2026-02-07

### Added
- **Smart Formatting ("Unfenced" Extensions)**: Added `concatenate.noFenceExtensions` setting (default: `['md', 'mdx']`). Files matching these extensions are now separated by horizontal rules (`---`) instead of code blocks. This allows you to include prompt instructions or documentation that the LLM should read naturally, rather than treating it as code to be analyzed.
- **Binary File Detection**: The extension now automatically detects binary files during traversal. Instead of outputting garbled text, it inserts a placeholder `(Binary file omitted)`, preventing token waste and confusion.

### Changed
- **Architecture Overhaul**: Complete refactor of the core logic into modular services (`Traverser`, `Builders`, `Utils`). This improves stability and makes the extension easier to maintain.
- **Strict .gitignore Compliance**: Implemented robust, nested `.gitignore` handling. The extension now correctly respects ignore rules located in subdirectories, ensuring that generated contexts match exactly what you expect from your git configuration.
- **Performance**: Optimized the recursive file traversal and tree generation logic for faster processing of large directories.
- **Configuration**: `ConfigurationManager` now uses `Set` data structures for O(1) lookup performance when checking file extensions.

## [0.3.0] - 2025-06-29

### Refactor
- **Asset Management**: Updated project structure to use `assets` folder instead of `images` for better organization and marketplace compatibility.

## [0.2.2] - 2025-06-21

### Changed
- Updated project repository and bug report URLs in `package.json` to point to the new `ionsignal` GitHub organization.
- Added new demo assets (`.gif`, `.mp4`) to the extension manifest for an improved showcase on the Visual Studio Marketplace.

### Fixed
- Corrected the debugger configuration (`.vscode/launch.json`) to use the standard schema version (`0.2.0`).

## [0.2.1] - 2025-06-21

### Fixed
- **Corrected Recursive `.gitignore` Parsing**: Fixed a critical bug where `.gitignore` rules in a subdirectory would incorrectly apply to its parent or sibling directories. The ignore logic now correctly scopes rules to their respective directories, ensuring that file searches and hierarchy generation accurately reflect the behavior of `git`.
- Improved path handling for ignore rules to ensure cross-platform compatibility.

## [0.2.0] - 2025-6-20

### Added
- **Recursive Folder Concatenation**: New command `Concatenate files in folder as new document` available on the folder context menu. This command recursively finds all files within the selected folder(s), respecting `.gitignore` rules, and concatenates them.
- **Configuration for File Types**: Added a new setting `concatenate.recursiveSearchFileExtensions` (defaulting to `['mdx', 'ts', 'js']`) to control which file extensions are included during a recursive folder search.

### Changed
- The command for concatenating folders can handle a selection of multiple folders at once, de-duplicating and sorting the final file list.

## [0.1.5] - 2025-4-6

### Removed
- Removed "Concatenate to Viewer" output option and associated demo video  
- Streamlined user interface by consolidating to single output method  

### Changed
- **Dependency Updates**  
  - Updated minimum VS Code requirement to v1.99.0  

# Fixed
- Added clean step to prepublish script for more reliable builds   

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

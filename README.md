# Concatenate for AI

A powerful VS Code extension that makes it easy to bundle multiple files into a single formatted document, optimized for use with AI tools like Google Gemini 2.5, ChatGPT, Claude, and other large language models (LLMs).

## Why You Need This

Working with Large Language Models (LLMs) often requires providing multiple code files for context. This extension solves common challenges:

- **Streamline AI-assisted programming** by quickly assembling relevant project files
- **Preserve file paths** for proper context when discussing code with AI assistants
- **Maintain code formatting and syntax highlighting** with proper language tags

## Features

### Concatenate Files or Folders

- **Select Individual Files**: Hand-pick any number of files from the Explorer.
- **Select Folders**: Right-click a folder (or multiple folders) to recursively find and concatenate all relevant files within them. The search respects your `.gitignore` files and is configurable to only include certain file extensions.

### Convenient Output Option

**Concatenate to New Document** - Creates a new unsaved document with all your selected files properly formatted

## How to Use

1.  In the VS Code Explorer:
    -   To concatenate files: Select multiple files (using `Ctrl/Cmd+Click`).
    -   To concatenate a folder's contents: Select one or more folders.
2.  Right-click on your selection and choose:
    -   **Concatenate selected files as new document**
    -   **Concatenate files in folder as new document**
3.  Copy the resulting output to your favorite AI tool.

## Output Format

Files are concatenated with proper Markdown code fencing and language detection.

## Configuration

- `concatenate.recursiveSearchFileExtensions`: Control which files are included when concatenating a folder. Defaults to `["mdx", "ts", "js"]`.
- `concatenate.prependFileHierarchy`: Optionally prepend an ASCII tree of your project structure to the output.

## Feedback & Contributions

Issues and contributions are welcome on [GitHub](https://github.com/neutrino84/vscode.concatenate.ai)

## License

MIT
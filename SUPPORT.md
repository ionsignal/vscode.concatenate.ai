# Support

## Purpose

This file provides resources and information to help users and contributors with the **Concatenate for AI** VS Code extension.

## Contact

*   **Report Bugs or Suggest Features:** Please use the [GitHub Issues](https://github.com/neutrino84/vscode.concatenate.ai/issues) page. Check existing issues first to avoid duplicates.

## Contribution Guidelines

We welcome contributions to improve Concatenate for AI! Whether it's fixing bugs, adding new features, or improving documentation, your help is appreciated.

### Reporting Issues

*   Use the [GitHub Issues](https://github.com/neutrino84/vscode.concatenate.ai/issues) tracker.
*   Provide a clear title and description.
*   Include steps to reproduce the bug if applicable.
*   Mention your VS Code version and operating system.

### Submitting Changes (Pull Requests)

1.  **Fork the Repository:** Create your own fork of the [neutrino84/vscode.concatenate.ai](https://github.com/neutrino84/vscode.concatenate.ai) repository on GitHub.
2.  **Clone Your Fork:** Clone your forked repository to your local machine.
    ```bash
    git clone https://github.com/YOUR_USERNAME/vscode.concatenate.ai.git
    cd vscode.concatenate.ai
    ```
3.  **Install Dependencies:**
    ```bash
    npm install
    ```
4.  **Create a Branch:** Create a new branch for your changes. Choose a descriptive name (e.g., `fix/empty-file-handling`, `feat/add-ignore-patterns`).
    ```bash
    git checkout -b your-branch-name
    ```
5.  **Make Your Changes:** Implement your fix or feature.
6.  **Lint and Compile:** Ensure your code adheres to the project's style guidelines and compiles correctly.
    ```bash
    npm run lint
    npm run compile
    ```
    Fix any errors reported by the linter or compiler.
7.  **Commit Your Changes:** Write clear and concise commit messages.
    ```bash
    git add .
    git commit -m "feat: Describe your feature"
    # or
    git commit -m "fix: Describe your fix"
    ```
8.  **Push to Your Fork:** Push your branch to your forked repository on GitHub.
    ```bash
    git push origin your-branch-name
    ```
9.  **Open a Pull Request:** Go to the original [neutrino84/vscode.concatenate.ai](https://github.com/neutrino84/vscode.concatenate.ai) repository and open a Pull Request (PR) from your branch to the `main` branch.
10. **Describe Your PR:** Provide a clear description of the changes you made and why. Reference any related issues (e.g., "Fixes #123").

### Code Style

This project uses ESLint and Prettier for code linting and formatting. Please ensure your contributions conform to the styles defined in the configuration files (`.eslintrc.js`, `.prettierrc.json`). Running `npm run lint` will help identify issues.

### License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE) that covers the project.

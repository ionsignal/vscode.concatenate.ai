# Support

## Where can I report a problem?

Use the [GitHub issue tracker](https://github.com/ionsignal/vscode.concatenate.ai/issues) to report bugs or request features.

Before opening an issue:

1. Search existing issues for the same problem.
2. Describe what you expected and what happened instead.
3. Include steps that reproduce the problem.
4. Include your VS Code version and operating system.

## How can I contribute?

You need write access to push directly to this repository. If you do not have write access, contribute through a fork and pull request.

1. Fork [ionsignal/vscode.concatenate.ai](https://github.com/ionsignal/vscode.concatenate.ai).
   - Your GitHub account now has a copy of the repository.

2. Clone your fork.

   ```bash
   git clone https://github.com/YOUR_USERNAME/vscode.concatenate.ai.git
   cd vscode.concatenate.ai
   ```

3. Create a branch for your change.

   ```bash
   git checkout -b fix/describe-the-change
   ```

4. Install dependencies.

   ```bash
   npm install
   ```

5. Make and review your changes.

6. Validate the extension.

   ```bash
   npm run compile
   npm run lint
   ```

   - Both commands should finish without errors.

7. Commit and push your branch.

   ```bash
   git add .
   git commit -m "fix: describe the change"
   git push origin fix/describe-the-change
   ```

8. Open a pull request against the `main` branch of
   [ionsignal/vscode.concatenate.ai](https://github.com/ionsignal/vscode.concatenate.ai).
   - Describe the change and its purpose.
   - Link related issues when applicable.

## License

By submitting a contribution, you agree to license it under this repository's MIT license.

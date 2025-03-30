import * as fs from 'fs'
import * as path from 'path'
import * as vscode from 'vscode'

// operations succeed/fail
interface Result<T> {
  success: boolean
  value?: T
  error?: Error
}

// concatenation results
interface ConcatenationResult extends Result<string> {
  fileCount: number
}

export function activate(context: vscode.ExtensionContext) {
  /**
   * Simple concat files in a new document
   */
  const concatenateFiles = (files: vscode.Uri[]): ConcatenationResult => {
    try {
      if (!files.length) {
        return {
          success: false,
          error: new Error('No files selected'),
          fileCount: 0,
        }
      }
      const concatenatedContent: string[] = []
      files.forEach(fileUri => {
        try {
          const filePath = fileUri.fsPath // More reliable than .path
          const fileContent = fs.readFileSync(filePath, 'utf8')
          const fileExtension = path.extname(filePath).substring(1)
          concatenatedContent.push(`File: ${filePath}`)
          concatenatedContent.push(`\`\`\`${fileExtension}`)
          concatenatedContent.push(fileContent)
          concatenatedContent.push('```')
        } catch (err) {
          // Handle individual file errors but continue processing
          concatenatedContent.push(`File: ${fileUri.fsPath}`)
          concatenatedContent.push(`\`\`\`error`)
          concatenatedContent.push(
            `Error reading file: ${err instanceof Error ? err.message : String(err)}`
          )
          concatenatedContent.push('```')
        }
      })
      return {
        success: true,
        value: concatenatedContent.join('\n\n'),
        fileCount: files.length,
      }
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err : new Error(String(err)),
        fileCount: 0,
      }
    }
  }

  /**
   * Displays concatenated files in a WebView with copy functionality
   */
  const concatenateExplorerFiles = async (
    _unusedUri: vscode.Uri, // Prefix with underscore to indicate it's unused
    selectedFiles: vscode.Uri[]
  ): Promise<void> => {
    const result = concatenateFiles(selectedFiles)

    if (!result.success || !result.value) {
      vscode.window.showErrorMessage(
        `Concatenation failed: ${result.error?.message || 'Unknown error'}`
      )
      return
    }

    // Create webview panel
    const vscodeWebViewOutputTab = vscode.window.createWebviewPanel(
      'concatenatedFiles',
      `Concatenated Files (${result.fileCount})`,
      { viewColumn: vscode.ViewColumn.Active },
      { enableScripts: true }
    )
    try {
      const htmlTemplatePath = context.asAbsolutePath(path.join('out', 'webview.html'))
      const uri = vscode.Uri.file(htmlTemplatePath)
      const pathUri = uri.with({ scheme: 'vscode-resource' })
      const htmlTemplate = fs.readFileSync(pathUri.fsPath, 'utf8')
      const finalHtml = htmlTemplate.replace('###REPLACE_CONTENT###', result.value)
      vscodeWebViewOutputTab.webview.html = finalHtml
      vscode.window.showInformationMessage(`Successfully concatenated ${result.fileCount} files!`)
    } catch (err) {
      vscode.window.showErrorMessage(
        `Failed to create webview: ${err instanceof Error ? err.message : String(err)}`
      )
    }
  }

  /**
   * Creates a new document with concatenated file content
   */
  const concatenateExplorerFilesAsNewDocument = async (
    _unusedUri: vscode.Uri,
    selectedFiles: vscode.Uri[]
  ): Promise<void> => {
    const result = concatenateFiles(selectedFiles)
    if (!result.success || !result.value) {
      vscode.window.showErrorMessage(
        `Concatenation failed: ${result.error?.message || 'Unknown error'}`
      )
      return
    }
    try {
      const document = await vscode.workspace.openTextDocument({
        content: result.value,
        language: 'markdown', // Set language mode to markdown for proper syntax highlighting
      })
      await vscode.window.showTextDocument(document)
      vscode.window.showInformationMessage(`Successfully concatenated ${result.fileCount} files!`)
    } catch (err) {
      vscode.window.showErrorMessage(
        `Failed to create document: ${err instanceof Error ? err.message : String(err)}`
      )
    }
  }

  // Register commands with proper types
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'concatenate.explorerFiles',
      (uri: vscode.Uri, selectedUris: vscode.Uri[]) => concatenateExplorerFiles(uri, selectedUris)
    )
  )

  context.subscriptions.push(
    vscode.commands.registerCommand(
      'concatenate.explorerFilesAsNewDocument',
      (uri: vscode.Uri, selectedUris: vscode.Uri[]) =>
        concatenateExplorerFilesAsNewDocument(uri, selectedUris)
    )
  )
}

export function deactivate() {}

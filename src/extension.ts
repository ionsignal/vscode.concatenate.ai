import * as fs from 'fs/promises'
import * as path from 'path'
import * as vscode from 'vscode'
import { concatenateFiles } from './helpers'
import type { ConcatenationResult } from './types'

export async function activate(context: vscode.ExtensionContext) {
  /**
   * Show concat final status message
   */
  const showMessage = (result: ConcatenationResult) => {
    if (result.fileCount == result.successfulFileCount)
      vscode.window.showInformationMessage(
        `Successfully concatenated ${result.successfulFileCount} files!`
      )
    else
      vscode.window.showWarningMessage(
        `Failed to concatenate ${result.fileCount - result.successfulFileCount} files!`
      )
  }

  /**
   * displays concatenated files in a WebView with copy
   * to clipboard button functionality
   */
  const concatenateExplorerFiles = async (
    _unusedUri: vscode.Uri,
    selectedFiles: vscode.Uri[]
  ): Promise<void> => {
    const result = await concatenateFiles(selectedFiles)
    if (!result.success || !result.value) {
      vscode.window.showErrorMessage(
        `Concatenation failed: ${result.error?.message || 'Unknown error'}`
      )
      return
    }
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
      const htmlTemplate = await fs.readFile(pathUri.fsPath, 'utf8')
      const finalHtml = htmlTemplate.replace('###REPLACE_CONTENT###', result.value)
      vscodeWebViewOutputTab.webview.html = finalHtml
      showMessage(result)
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
    const result = await concatenateFiles(selectedFiles)
    if (!result.success || !result.value) {
      vscode.window.showErrorMessage(
        `Concatenation failed: ${result.error?.message || 'Unknown error'}`
      )
      return
    }
    try {
      const document = await vscode.workspace.openTextDocument({
        content: result.value,
        language: 'markdown',
      })
      await vscode.window.showTextDocument(document)
      showMessage(result)
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

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
      'concatenate.explorerFilesAsNewDocument',
      (uri: vscode.Uri, selectedUris: vscode.Uri[]) =>
        concatenateExplorerFilesAsNewDocument(uri, selectedUris)
    )
  )
}

export function deactivate() {}

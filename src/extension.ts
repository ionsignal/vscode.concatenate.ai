import * as vscode from 'vscode'
import { concatenateFiles, getAllFilesInDirectory } from './helpers'
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

  context.subscriptions.push(
    vscode.commands.registerCommand(
      'concatenate.explorerDirectoryAsNewDocument',
      async (_uri: vscode.Uri, selectedUris: vscode.Uri[]) => {
        // Find all directories in the selection
        const statPromises = selectedUris.map(async u => ({
          uri: u,
          isDirectory: (await vscode.workspace.fs.stat(u)).type === vscode.FileType.Directory,
        }))
        const resolvedUris = await Promise.all(statPromises)
        const folderUris = resolvedUris.filter(item => item.isDirectory).map(item => item.uri)

        if (folderUris.length === 0) {
          vscode.window.showInformationMessage('No directories selected.')
          return
        }

        // Get all files from all selected directories
        let allFileUris: vscode.Uri[] = []
        for (const folderUri of folderUris) {
          const filesInFolder = await getAllFilesInDirectory(folderUri)
          allFileUris.push(...filesInFolder)
        }

        if (allFileUris.length === 0) {
          vscode.window.showInformationMessage(
            'No files found matching the configured extensions in the selected directories.'
          )
          return
        }

        // Remove duplicates that might occur if a folder is selected inside another selected folder
        const uniqueFileUris = [...new Map(allFileUris.map(item => [item.fsPath, item])).values()]

        // Sort files by path for consistent output
        uniqueFileUris.sort((a, b) => a.fsPath.localeCompare(b.fsPath))

        // We can reuse the main concatenation logic.
        // We need a URI for the first argument, let's use the first folder.
        await concatenateExplorerFilesAsNewDocument(folderUris[0], uniqueFileUris)
      }
    )
  )
}

export function deactivate() {}

import * as vscode from 'vscode'
import { ConcatenateCommand } from './commands/concatenateCommand'

export function activate(context: vscode.ExtensionContext) {
  // Register the command.
  // We register both command IDs to the same handler because our ConcatenateCommand
  // is smart enough to handle both Files and Folders based on the input URIs.
  // This simplifies the logic significantly.
  const disposableFiles = vscode.commands.registerCommand(
    'concatenate.explorerFilesAsNewDocument',
    (uri: vscode.Uri, selectedUris: vscode.Uri[]) => {
      return ConcatenateCommand.execute(uri, selectedUris)
    }
  )
  const disposableFolder = vscode.commands.registerCommand(
    'concatenate.explorerDirectoryAsNewDocument',
    (uri: vscode.Uri, selectedUris: vscode.Uri[]) => {
      return ConcatenateCommand.execute(uri, selectedUris)
    }
  )
  context.subscriptions.push(disposableFiles, disposableFolder)
}

export function deactivate() {}

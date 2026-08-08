import * as vscode from 'vscode'
import { run } from './concatenate/run'

export function activate(context: vscode.ExtensionContext): void {
  const concatenate = (uri?: vscode.Uri, selectedUris?: vscode.Uri[]) => run(uri, selectedUris)
  const files = vscode.commands.registerCommand(
    'concatenate.explorerFilesAsNewDocument',
    concatenate
  )
  const folders = vscode.commands.registerCommand(
    'concatenate.explorerDirectoryAsNewDocument',
    concatenate
  )
  context.subscriptions.push(files, folders)
}

export function deactivate(): void {}

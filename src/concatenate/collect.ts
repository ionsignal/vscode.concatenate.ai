import * as vscode from 'vscode'
import { type Issue, unique } from '../issue'
import { merge } from '../tree/merge'
import { type DirectoryNode, type FileNode } from '../tree/model'
import { walk, type WalkOptions } from '../tree/walk'
import { common, identity, normalize } from '../vscode/uri'
import { type Selection } from './select'

export interface Collection {
  tree: DirectoryNode
  files: FileNode[]
  headerRoot?: vscode.Uri
  issues: Issue[]
}

export async function collect(
  selection: Selection,
  options: WalkOptions = {}
): Promise<Collection> {
  const walks = await Promise.all(selection.folders.map(target => walk(target, options)))
  const merged = merge({
    targets: selection.targets,
    folders: walks.map(result => result.tree),
    files: selection.files,
  })
  return {
    tree: merged.tree,
    files: merged.files,
    headerRoot: headers(selection.targets),
    issues: unique([...selection.issues, ...walks.flatMap(result => result.issues)]),
  }
}

function headers(targets: readonly vscode.Uri[]): vscode.Uri | undefined {
  if (targets.length === 0) {
    return undefined
  }
  const first = vscode.workspace.getWorkspaceFolder(targets[0])
  if (
    first &&
    targets.every(target => {
      const folder = vscode.workspace.getWorkspaceFolder(target)
      return folder !== undefined && identity(folder.uri) === identity(first.uri)
    })
  ) {
    return normalize(first.uri)
  }
  return common(targets)
}

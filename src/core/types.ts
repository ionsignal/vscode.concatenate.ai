import * as vscode from 'vscode'

export enum NodeType {
  File,
  Directory,
}

export interface FileNode {
  type: NodeType.File
  name: string
  uri: vscode.Uri
  relativePath: string
}

export interface DirectoryNode {
  type: NodeType.Directory
  name: string
  uri: vscode.Uri
  relativePath: string
  children: (FileNode | DirectoryNode)[]
}

export type TreeNode = FileNode | DirectoryNode

export interface TraversalOptions {
  /**
   * If provided, only files with these extensions (without dot) will be included in the tree.
   * Directories are traversed to find matching files.
   */
  allowedExtensions?: Set<string>

  /**
   * Whether to respect .gitignore files. Defaults to true.
   */
  useGitIgnore?: boolean
}

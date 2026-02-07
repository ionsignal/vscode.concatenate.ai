import * as vscode from 'vscode'
import { Ignore } from 'ignore'
import { FileSystem } from '../utils/fileSystem'
import { PathUtils } from '../utils/pathUtils'
import { IgnoreHelper } from './ignoreHelper'
import { DirectoryNode, FileNode, NodeType, TraversalOptions, TreeNode } from './types'

interface IgnoreStackEntry {
  ignore: Ignore
  basePath: string // The directory path relative to root where this ignore instance applies
}

/**
 * Core engine for recursively walking the file system.
 * Handles .gitignore rules, filtering, and sorting.
 */
export class FileSystemTraverser {
  /**
   * recursively walks the directory and builds a tree structure.
   * @param rootUri The root directory URI.
   * @param options Traversal options (extensions, gitignore).
   */
  public async getDirectoryStructure(
    rootUri: vscode.Uri,
    options: TraversalOptions = {}
  ): Promise<DirectoryNode> {
    // Initialize the ignore stack
    const ignoreStack: IgnoreStackEntry[] = []
    if (options.useGitIgnore !== false) {
      const rootIgnore = IgnoreHelper.create()
      IgnoreHelper.addDefaultRules(rootIgnore)
      // We always add the root ignore, even if empty, to handle default rules like .git
      await IgnoreHelper.loadIgnoreRules(rootIgnore, rootUri)
      ignoreStack.push({ ignore: rootIgnore, basePath: '' })
    }
    const rootNode: DirectoryNode = {
      type: NodeType.Directory,
      name: PathUtils.basename(rootUri.fsPath),
      uri: rootUri,
      relativePath: '',
      children: [],
    }
    rootNode.children = await this._traverseRecursive(
      rootUri,
      '', // relative path from root starts empty
      ignoreStack,
      options
    )
    return rootNode
  }

  private async _traverseRecursive(
    currentUri: vscode.Uri,
    relativePath: string,
    ignoreStack: IgnoreStackEntry[],
    options: TraversalOptions
  ): Promise<TreeNode[]> {
    // Create a local copy of the stack for this directory level
    // We might push a new ignore instance onto it if a .gitignore exists here
    const currentStack = [...ignoreStack]
    if (options.useGitIgnore !== false && relativePath !== '') {
      // Check for .gitignore in the current directory
      // We create a fresh instance (no inheritance) because the stack handles the hierarchy
      const localIgnore = IgnoreHelper.create()
      const hasRules = await IgnoreHelper.loadIgnoreRules(localIgnore, currentUri)
      if (hasRules) {
        currentStack.push({ ignore: localIgnore, basePath: relativePath })
      }
    }
    // Read Directory
    let entries: [string, vscode.FileType][]
    try {
      entries = await FileSystem.readDirectory(currentUri)
    } catch (error) {
      console.warn(`Skipping directory ${currentUri.fsPath}:`, error)
      return []
    }
    const nodes: TreeNode[] = []
    // Process Entries
    for (const [name, type] of entries) {
      // PathUtils.joinPosix ensures we use '/' for the ignore library
      const entryRelativePath = PathUtils.joinPosix(relativePath, name)
      const isDirectory = type === vscode.FileType.Directory
      // Check Ignore Rules against the Stack
      let isIgnored = false
      for (const entry of currentStack) {
        // Calculate the path relative to the ignore file's location
        // If basePath is empty, it's the full relative path.
        // If basePath is 'src', and file is 'src/test.ts', relative is 'test.ts'
        let pathForIgnore = entryRelativePath
        if (entry.basePath) {
          // +1 for the slash
          pathForIgnore = entryRelativePath.substring(entry.basePath.length + 1)
        }
        if (
          entry.ignore.ignores(pathForIgnore) ||
          (isDirectory && entry.ignore.ignores(`${pathForIgnore}/`))
        ) {
          isIgnored = true
          break
        }
      }
      if (isIgnored) {
        continue
      }
      const entryUri = vscode.Uri.joinPath(currentUri, name)
      if (isDirectory) {
        // Recurse
        const children = await this._traverseRecursive(
          entryUri,
          entryRelativePath,
          currentStack,
          options
        )
        nodes.push({
          type: NodeType.Directory,
          name,
          uri: entryUri,
          relativePath: entryRelativePath,
          children,
        })
      } else if (type === vscode.FileType.File) {
        // Check Extension Filter
        if (options.allowedExtensions) {
          const ext = PathUtils.extname(name).toLowerCase().replace(/^\./, '')
          if (!options.allowedExtensions.has(ext)) {
            continue
          }
        }

        nodes.push({
          type: NodeType.File,
          name,
          uri: entryUri,
          relativePath: entryRelativePath,
        })
      }
    }
    // Sort (Folders > Files, then Alphabetical)
    nodes.sort((a, b) => {
      if (a.type === NodeType.Directory && b.type !== NodeType.Directory) {
        return -1
      }
      if (a.type !== NodeType.Directory && b.type === NodeType.Directory) {
        return 1
      }
      return a.name.localeCompare(b.name)
    })
    return nodes
  }
}

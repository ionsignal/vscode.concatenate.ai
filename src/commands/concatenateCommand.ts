import * as vscode from 'vscode'
import * as path from 'node:path'
import { ConfigurationManager } from '../config/configurationManager'
import { FileSystemTraverser } from '../core/fileSystemTraverser'
import { TreeBuilder } from '../builders/treeBuilder'
import { MarkdownBuilder } from '../builders/markdownBuilder'
import { PathUtils } from '../utils/pathUtils'
import { FileSystem } from '../utils/fileSystem'
import { DirectoryNode, FileNode, NodeType, TreeNode } from '../core/types'

export class ConcatenateCommand {
  public static async execute(uri: vscode.Uri, selectedUris: vscode.Uri[]): Promise<void> {
    // Normalize Selection
    let targets = selectedUris || [uri]
    if (!targets || targets.length === 0) {
      vscode.window.showInformationMessage('No files or directories selected.')
      return
    }
    // Deduplicate
    targets = [...new Map(targets.map(item => [item.fsPath, item])).values()]
    // Sort alphabetically
    targets.sort((a, b) => a.fsPath.localeCompare(b.fsPath))
    // Analyze Targets (File vs Directory Mode)
    const statPromises = targets.map(async u => ({
      uri: u,
      stat: await FileSystem.stat(u),
    }))
    const stats = await Promise.all(statPromises)
    const directories = stats.filter(s => s.stat.type === vscode.FileType.Directory).map(s => s.uri)
    // Filter files: Exclude files that are already inside one of the selected directories
    // This prevents duplicates in the tree and content.
    let files = stats.filter(s => s.stat.type === vscode.FileType.File).map(s => s.uri)
    files = files.filter(f => {
      return !directories.some(d => {
        // Check if file is inside directory (using strict path logic)
        const rel = path.relative(d.fsPath, f.fsPath)
        return !rel.startsWith('..') && !path.isAbsolute(rel)
      })
    })
    // Determine Root Context for Markdown Headers (Workspace vs Common Base)
    let root: vscode.Uri | undefined
    if (targets.length > 0) {
      const firstFolder = vscode.workspace.getWorkspaceFolder(targets[0])
      const allInSameFolder =
        firstFolder &&
        targets.every(t => {
          const f = vscode.workspace.getWorkspaceFolder(t)
          return f && f.uri.toString() === firstFolder.uri.toString()
        })
      if (allInSameFolder) {
        root = firstFolder.uri
      } else {
        root = PathUtils.findCommonBasePath(targets)
      }
    }
    // Configuration
    const config = ConfigurationManager.instance
    const allowedExtensions = config.recursiveSearchFileExtensions
    const prependHierarchy = config.prependFileHierarchy
    const noFenceExtensions = config.noFenceExtensions
    let finalContent = ''
    let totalFiles = 0
    let successFiles = 0
    // Unified Tree Generation ---
    if (prependHierarchy) {
      // Calculate Common Base for the Visual Tree
      // We include both files and directories to find the true visual root.
      const allTargets = [...directories, ...files]
      const visualRootUri = PathUtils.findCommonBasePath(allTargets)
      if (visualRootUri) {
        const visualRootNode: DirectoryNode = {
          type: NodeType.Directory,
          name: PathUtils.basename(visualRootUri.fsPath),
          uri: visualRootUri,
          relativePath: '',
          children: [],
        }
        const traverser = new FileSystemTraverser()
        // Process Directories
        for (const dir of directories) {
          // Traverse the selected directory to get its internal structure
          const dirTree = await traverser.getDirectoryStructure(dir, { allowedExtensions })
          // Calculate where this directory sits relative to the visual root
          const relPath = PathUtils.relative(visualRootUri.fsPath, dir.fsPath)
          // Insert the traversed tree into our unified root
          this.insertNode(visualRootNode, relPath, dirTree)
        }
        // Process Files
        for (const file of files) {
          const relPath = PathUtils.relative(visualRootUri.fsPath, file.fsPath)
          const fileNode: FileNode = {
            type: NodeType.File,
            name: PathUtils.basename(file.fsPath),
            uri: file,
            relativePath: relPath, // Note: relativePath here is for the node itself
          }
          this.insertNode(visualRootNode, relPath, fileNode)
        }
        // Generate Tree String
        const treeString = TreeBuilder.build(visualRootNode)
        finalContent += `File Hierarchy (from ${visualRootNode.name}):\n${treeString}\n\n`
      }
    }
    // Process Directories (Recursive Mode)
    if (directories.length > 0) {
      const traverser = new FileSystemTraverser()
      for (const dir of directories) {
        const tree = await traverser.getDirectoryStructure(dir, { allowedExtensions })
        // Calculate the relative path from the determined root to this directory
        let pathPrefix = ''
        if (root) {
          pathPrefix = PathUtils.relative(root.fsPath, dir.fsPath)
        }
        // Note: We no longer generate the tree here.
        const result = await MarkdownBuilder.buildFromDirectory(tree, {
          noFenceExtensions,
          pathPrefix,
        })
        finalContent += result.content + '\n\n'
        totalFiles += result.fileCount
        successFiles += result.successfulFileCount
      }
    }
    // Process Explicit Files (File Mode)
    if (files.length > 0) {
      // Note: We no longer generate the tree here.
      const result = await MarkdownBuilder.buildFromUris(files, root, { noFenceExtensions })
      finalContent += result.content + '\n\n'
      totalFiles += result.fileCount
      successFiles += result.successfulFileCount
    }
    // Output Result
    if (totalFiles === 0) {
      vscode.window.showWarningMessage('No matching files found to concatenate.')
      return
    }
    try {
      const doc = await vscode.workspace.openTextDocument({
        content: finalContent.trim(),
        language: 'markdown',
      })
      await vscode.window.showTextDocument(doc)
      if (totalFiles === successFiles) {
        vscode.window.showInformationMessage(`Successfully concatenated ${successFiles} files!`)
      } else {
        vscode.window.showWarningMessage(
          `Concatenated ${successFiles} files. Failed to read ${totalFiles - successFiles} files.`
        )
      }
    } catch (err) {
      vscode.window.showErrorMessage(
        `Failed to create document: ${err instanceof Error ? err.message : String(err)}`
      )
    }
  }

  /**
   * Helper to insert a node into a directory tree at a specific relative path.
   * Creates intermediate directories if they don't exist.
   */
  private static insertNode(root: DirectoryNode, relativePath: string, node: TreeNode): void {
    // relativePath is the path from root to the node (including the node's name)
    // e.g. "src/utils/helper.ts" or "src/components"
    const parts = relativePath.split('/').filter(p => p.length > 0)
    // We navigate to the parent of the target node
    // If parts is ["src", "utils", "helper.ts"], we want to end up at "utils"
    const parentPathParts = parts.slice(0, -1)
    let current = root
    for (const part of parentPathParts) {
      let child = current.children.find(
        c => c.name === part && c.type === NodeType.Directory
      ) as DirectoryNode
      if (!child) {
        // Create virtual intermediate directory
        child = {
          type: NodeType.Directory,
          name: part,
          uri: vscode.Uri.joinPath(current.uri, part),
          relativePath: PathUtils.joinPosix(current.relativePath, part),
          children: [],
        }
        current.children.push(child)
        // Sort children so the tree looks correct immediately
        this.sortChildren(current)
      }
      current = child
    }

    // Check if node already exists to avoid duplicates
    const existing = current.children.find(c => c.name === node.name)
    if (!existing) {
      current.children.push(node)
      this.sortChildren(current)
    }
  }

  /**
   * Sorts children of a directory node: Directories first, then Files, alphabetically.
   */
  private static sortChildren(node: DirectoryNode): void {
    node.children.sort((a, b) => {
      if (a.type === NodeType.Directory && b.type !== NodeType.Directory) {
        return -1
      }
      if (a.type !== NodeType.Directory && b.type === NodeType.Directory) {
        return 1
      }
      return a.name.localeCompare(b.name)
    })
  }
}

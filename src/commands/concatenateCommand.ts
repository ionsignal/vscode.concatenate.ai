import * as vscode from 'vscode'
import { ConfigurationManager } from '../config/configurationManager'
import { FileSystemTraverser } from '../core/fileSystemTraverser'
import { TreeBuilder } from '../builders/treeBuilder'
import { MarkdownBuilder } from '../builders/markdownBuilder'
import { PathUtils } from '../utils/pathUtils'
import { FileSystem } from '../utils/fileSystem'

export class ConcatenateCommand {
  public static async execute(uri: vscode.Uri, selectedUris: vscode.Uri[]): Promise<void> {
    // Normalize Selection
    // If command is triggered from command palette, selectedUris might be undefined.
    // If triggered from context menu on a single item, selectedUris might be undefined, use uri.
    let targets = selectedUris || [uri]
    if (!targets || targets.length === 0) {
      // Fallback for command palette with no active selection
      vscode.window.showInformationMessage('No files or directories selected.')
      return
    }
    // Deduplicate
    targets = [...new Map(targets.map(item => [item.fsPath, item])).values()]
    // Sort alphabetically
    targets.sort((a, b) => a.fsPath.localeCompare(b.fsPath))
    // Analyze Targets (File vs Directory Mode)
    // We need to know if we are dealing with directories to decide traversal strategy.
    const statPromises = targets.map(async u => ({
      uri: u,
      stat: await FileSystem.stat(u),
    }))
    const stats = await Promise.all(statPromises)
    const directories = stats.filter(s => s.stat.type === vscode.FileType.Directory).map(s => s.uri)
    const files = stats.filter(s => s.stat.type === vscode.FileType.File).map(s => s.uri)
    // Determine Root Context
    // We check if all selected items belong to the same workspace folder.
    // If so, we use that workspace folder as the root to provide full context paths.
    // If not (or if no workspace is open), we fall back to the common base path of the selection.
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
    // Process Directories (Recursive Mode)
    if (directories.length > 0) {
      const traverser = new FileSystemTraverser()
      for (const dir of directories) {
        const tree = await traverser.getDirectoryStructure(dir, { allowedExtensions })
        // Generate Tree if enabled
        if (prependHierarchy) {
          const treeString = TreeBuilder.build(tree)
          finalContent += `File Hierarchy (from ${tree.name}):\n${treeString}\n\n`
        }
        // Generate Content
        // Calculate the relative path from the determined root to this directory
        // This ensures the file headers show the full path context (e.g. "src/utils/file.ts")
        let pathPrefix = ''
        if (root) {
          pathPrefix = PathUtils.relative(root.fsPath, dir.fsPath)
        }
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
      // If hierarchy is enabled for explicit files, we generate a tree for their common parent
      // Note: For the Visual Tree, we still use the common base of the *files* to keep the tree compact.
      // But for the Content Headers, we use the global 'root' calculated above.
      if (prependHierarchy) {
        const filesCommonBase = PathUtils.findCommonBasePath(files)
        if (filesCommonBase) {
          const traverser = new FileSystemTraverser()
          // We will run traverser WITHOUT extension filter for the visual tree to be accurate to FS.
          const tree = await traverser.getDirectoryStructure(filesCommonBase, {
            useGitIgnore: true,
          })
          const treeString = TreeBuilder.build(tree)
          finalContent += `File Hierarchy (from ${tree.name}):\n${treeString}\n\n`
        }
      }
      // Pass the determined global root to ensure relative paths in output match the workspace context
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
}

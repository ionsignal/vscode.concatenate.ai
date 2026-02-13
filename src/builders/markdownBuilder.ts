import * as vscode from 'vscode'
import * as path from 'node:path'
import { DirectoryNode, FileNode, NodeType } from '../core/types'
import { FileSystem } from '../utils/fileSystem'
import { PathUtils } from '../utils/pathUtils'

export interface MarkdownResult {
  content: string
  fileCount: number
  successfulFileCount: number
}

export interface MarkdownBuilderOptions {
  /**
   * Set of file extensions (without dots) that should not be fenced in code blocks.
   * These files will be separated by horizontal rules (---).
   */
  noFenceExtensions?: Set<string>
  /**
   * Optional prefix to prepend to the relative path of files in the header.
   * Useful when files are deep in a directory structure but we want to show context relative to the workspace root.
   */
  pathPrefix?: string
}

/**
 * Handles reading files and formatting them into a concatenated Markdown string.
 */
export class MarkdownBuilder {
  /**
   * Builds markdown from a DirectoryNode (recursive traversal result).
   */
  public static async buildFromDirectory(
    root: DirectoryNode,
    options?: MarkdownBuilderOptions
  ): Promise<MarkdownResult> {
    const files = this.flattenDirectory(root)
    return this.processFiles(files, options)
  }

  /**
   * Builds markdown from a specific list of URIs.
   * @param uris The list of file URIs.
   * @param root Optional root URI to calculate relative paths against.
   * @param options Optional configuration for building markdown.
   */
  public static async buildFromUris(
    uris: vscode.Uri[],
    root?: vscode.Uri,
    options?: MarkdownBuilderOptions
  ): Promise<MarkdownResult> {
    // We map URIs to simple FileNode-like structures for processing
    const files = uris.map(uri => {
      let relativePath = PathUtils.basename(uri.fsPath)
      // Calculate relative path if root context is provided
      if (root) {
        const rel = path.relative(root.fsPath, uri.fsPath)
        relativePath = PathUtils.toPosix(rel)
      }
      return {
        type: NodeType.File,
        name: PathUtils.basename(uri.fsPath),
        uri: uri,
        relativePath: relativePath,
      } as FileNode
    })
    return this.processFiles(files, options)
  }
  private static flattenDirectory(node: DirectoryNode): FileNode[] {
    const files: FileNode[] = []
    for (const child of node.children) {
      if (child.type === NodeType.File) {
        files.push(child)
      } else if (child.type === NodeType.Directory) {
        files.push(...this.flattenDirectory(child))
      }
    }
    return files
  }

  private static async processFiles(
    files: FileNode[],
    options?: MarkdownBuilderOptions
  ): Promise<MarkdownResult> {
    let successfulFileReadCount = 0
    const contentParts: string[] = []
    const fileProcessingPromises = files.map(async file => {
      try {
        const fileContent = await FileSystem.readFile(file.uri)
        // Construct the header path, optionally prepending a prefix
        let headerPath = file.relativePath
        if (options?.pathPrefix) {
          headerPath = PathUtils.joinPosix(options.pathPrefix, file.relativePath)
        }
        // If readFile returns null (e.g. file not found), we handle it gracefully
        if (fileContent === null) {
          return `File: ${headerPath}\n(file not found)`
        }
        const fileExtension = PathUtils.extname(file.uri.fsPath).substring(1).toLowerCase() // remove dot & lowercase
        if (fileContent.trim() === '') {
          return `File: ${headerPath}\n(empty file)`
        } else {
          // Check if this extension should be unfenced
          const shouldNotFence = options?.noFenceExtensions?.has(fileExtension)
          if (shouldNotFence) {
            // Unfenced format: Separated by horizontal rules
            // We use double newlines to ensure clean separation
            return [`File: ${headerPath}`, '---', fileContent, '---'].join('\n\n')
          } else {
            // Standard fenced format
            return [`File: ${headerPath}`, `\`\`\`${fileExtension}`, fileContent, '```'].join('\n')
          }
        }
      } catch (err) {
        const error = err as Error
        let headerPath = file.relativePath
        if (options?.pathPrefix) {
          headerPath = PathUtils.joinPosix(options.pathPrefix, file.relativePath)
        }
        // Handle binary files gracefully
        if (error.message === 'Binary file detected') {
          return `File: ${headerPath}\n(Binary file omitted)`
        }
        const errorMessage = `Error reading file: ${error.message || String(err)}`
        // Errors are always fenced to distinguish them from content
        return [`File: ${headerPath}`, `\`\`\`error`, errorMessage, '```'].join('\n')
      }
    })
    const results = await Promise.allSettled(fileProcessingPromises)
    results.forEach(result => {
      if (result.status === 'fulfilled') {
        contentParts.push(result.value)
        // We consider it a "success" if we got a result, even if that result
        // contains an error message block.
        // If it's a binary file or error, we technically "handled" it, but for stats
        // we might only want to count actual text reads.
        // Current logic: if it doesn't contain "Error reading file", it's a success.
        if (!result.value.includes('Error reading file')) {
          successfulFileReadCount++
        }
      } else {
        contentParts.push(
          `\`\`\`error\nUnexpected error during processing: ${result.reason}\n\`\`\``
        )
      }
    })
    return {
      content: contentParts.join('\n\n'),
      fileCount: files.length,
      successfulFileCount: successfulFileReadCount,
    }
  }
}

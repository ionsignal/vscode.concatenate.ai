import * as path from 'node:path'
import { posix as posixPath } from 'path' // Use POSIX for ignore paths
import * as vscode from 'vscode'
import ignore, { type Ignore } from 'ignore'
import { TreeGenerator } from './treeGenerator'
import type { ConcatenationResult } from './types'

/**
 * Recursively finds all files in a directory that match the allowed extensions, respecting .gitignore files.
 * @param directoryUri The URI of the directory to search.
 * @param relativeBasePath
 * @param parentIg The ignore instance from the parent directory.
 * @param allowedExtensions A Set of allowed file extensions (without the dot).
 * @returns A promise that resolves to an array of file URIs.
 */
const getUrisInDirectoryRecursive = async (
  directoryUri: vscode.Uri,
  relativeBasePath: string,
  parentIg: Ignore,
  allowedExtensions: Set<string>
): Promise<vscode.Uri[]> => {
  const currentIg = ignore().add(parentIg)
  const currentGitignoreUri = vscode.Uri.joinPath(directoryUri, '.gitignore')
  try {
    const gitignoreContent = await vscode.workspace.fs.readFile(currentGitignoreUri)
    currentIg.add(Buffer.from(gitignoreContent).toString('utf8'))
  } catch (error) {
    if (!(error instanceof vscode.FileSystemError && error.code === 'FileNotFound')) {
      vscode.window.showWarningMessage(
        `Could not read .gitignore in ${directoryUri.fsPath}: ${
          error instanceof Error ? error.message : String(error)
        }`
      )
    }
  }

  let entries: [string, vscode.FileType][] = []
  try {
    entries = await vscode.workspace.fs.readDirectory(directoryUri)
  } catch (error) {
    vscode.window.showWarningMessage(`Could not read directory: ${directoryUri.fsPath}`)
    return []
  }

  const allFileUris: vscode.Uri[] = []
  for (const [name, type] of entries) {
    const entryRelativePath = posixPath.join(relativeBasePath, name)
    const isIgnored =
      currentIg.ignores(entryRelativePath) ||
      (type === vscode.FileType.Directory && currentIg.ignores(`${entryRelativePath}/`))
    if (isIgnored) {
      continue
    }
    const entryUri = vscode.Uri.joinPath(directoryUri, name)
    if (type === vscode.FileType.Directory) {
      const nestedFiles = await getUrisInDirectoryRecursive(
        entryUri,
        entryRelativePath,
        currentIg,
        allowedExtensions
      )
      allFileUris.push(...nestedFiles)
    } else if (type === vscode.FileType.File) {
      const extension = path.extname(name).substring(1).toLowerCase()
      if (allowedExtensions.has(extension)) {
        allFileUris.push(entryUri)
      }
    }
  }
  return allFileUris
}

/**
 * Gets all file URIs within a directory, filtered by settings and .gitignore.
 */
export const getAllFilesInDirectory = async (directoryUri: vscode.Uri): Promise<vscode.Uri[]> => {
  const config = vscode.workspace.getConfiguration('concatenate')
  const extensions = config.get<string[]>('recursiveSearchFileExtensions', ['mdx', 'ts', 'js'])
  const allowedExtensions = new Set(extensions.map(ext => ext.toLowerCase()))
  const rootIg = ignore().add('.git') // Always ignore .git
  return getUrisInDirectoryRecursive(directoryUri, '', rootIg, allowedExtensions)
}

/**
 * Finds the deepest common directory path for a given array of file URIs.
 * @param uris An array of file URIs.
 * @returns A vscode.Uri representing the common base path, or undefined if no common path is found.
 */
function findCommonBasePath(uris: vscode.Uri[]): vscode.Uri | undefined {
  if (!uris || uris.length === 0) {
    return undefined
  }
  if (uris.length === 1) {
    return vscode.Uri.joinPath(uris[0], '..')
  }
  const paths = uris.map(uri => uri.fsPath.split(path.sep))
  let commonPathComponents = paths[0]
  for (let i = 1; i < paths.length; i++) {
    const currentPathComponents = paths[i]
    let j = 0
    while (
      j < commonPathComponents.length &&
      j < currentPathComponents.length &&
      commonPathComponents[j] === currentPathComponents[j]
    ) {
      j++
    }
    commonPathComponents = commonPathComponents.slice(0, j)
  }
  if (commonPathComponents.length === 0) {
    return undefined
  }
  const commonPathString = commonPathComponents.join(path.sep)
  return vscode.Uri.file(commonPathString)
}

/**
 * generates hierarchy string if enabled and possible.
 */
export const generateHierarchyIfEnabled = async (files: vscode.Uri[]): Promise<string | null> => {
  const config = vscode.workspace.getConfiguration('concatenate')
  const shouldPrependHierarchy = config.get<boolean>('prependFileHierarchy', false)
  if (!shouldPrependHierarchy || files.length === 0) {
    return null
  }
  const commonBaseUri = findCommonBasePath(files)
  if (commonBaseUri) {
    try {
      const hierarchyString = await TreeGenerator.generateAsciiTree(commonBaseUri)
      return `File Hierarchy (from ${path.basename(commonBaseUri.fsPath)}):\n${hierarchyString}`
    } catch (error) {
      vscode.window.showErrorMessage(
        `Failed to generate file hierarchy: ${
          error instanceof Error ? error.message : String(error)
        }`
      )
      return null
    }
  } else {
    vscode.window.showWarningMessage(
      'Could not determine a common base directory for the selected files to generate a hierarchy.'
    )
    return null
  }
}

/**
 * concatenate files implementation
 */
export const concatenateFiles = async (files: vscode.Uri[]): Promise<ConcatenationResult> => {
  if (!files.length) {
    return {
      success: false,
      error: new Error('No files selected'),
      fileCount: 0,
      successfulFileCount: 0,
    }
  }

  // content string array
  const concatenatedContent: string[] = []

  // process and add directory tree to content
  const directoryTreeContent = await generateHierarchyIfEnabled(files)
  if (directoryTreeContent) {
    concatenatedContent.push(directoryTreeContent)
  }

  // extract file content
  let successfulFileReadCount = 0
  const fileProcessingPromises = files.map(async fileUri => {
    try {
      const fileContentUint8Array = await vscode.workspace.fs.readFile(fileUri)
      const fileContent = Buffer.from(fileContentUint8Array).toString('utf8')
      const fileExtension = path.extname(fileUri.fsPath).substring(1)
      if (fileContent.trim() === '') {
        return { success: true, content: [`File: ${fileUri.fsPath}`, `(empty file)`].join('\n') }
      } else {
        return {
          success: true,
          content: [`File: ${fileUri.fsPath}`, `\`\`\`${fileExtension}`, fileContent, '```'].join(
            '\n'
          ),
        }
      }
    } catch (err) {
      const errorMessage = `Error reading file: ${err instanceof Error ? err.message : String(err)}`
      return {
        success: false,
        content: [`File: ${fileUri.fsPath}`, `\`\`\`error`, errorMessage, '```'].join('\n'),
      }
    }
  })

  const results = await Promise.allSettled(fileProcessingPromises)

  // process and add results to content
  results.forEach(result => {
    if (result.status === 'fulfilled') {
      // Push the formatted content (could be success, empty, or error format from the map)
      concatenatedContent.push(result.value.content)
      // Increment success count only if the file read operation itself was successful
      if (result.value.success) {
        successfulFileReadCount++
      }
    } else {
      // This case handles unexpected errors *within the map function's promise itself*,
      // which is less likely given the try/catch inside, but good practice to keep.
      concatenatedContent.push(
        `\`\`\`error\nUnexpected error during file processing: ${result.reason}\n\`\`\``
      )
    }
  })

  const overallSuccess = successfulFileReadCount > 0 || files.length === 0
  const output = concatenatedContent.join('\n\n')
  return {
    success: overallSuccess,
    value: output,
    fileCount: files.length,
    successfulFileCount: successfulFileReadCount,
  }
}

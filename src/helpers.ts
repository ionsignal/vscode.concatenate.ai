import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import * as vscode from 'vscode'
import ignore, { type Ignore } from 'ignore'
import { TreeGenerator } from './treeGenerator'
import type { ConcatenationResult } from './types'

/**
 * Recursively finds all files in a directory that match the allowed extensions, respecting .gitignore files.
 * @param directoryUri The URI of the directory to search.
 * @param parentIg The ignore instance from the parent directory.
 * @param allowedExtensions A Set of allowed file extensions (without the dot).
 * @returns A promise that resolves to an array of file URIs.
 */
const getUrisInDirectoryRecursive = async (
  directoryUri: vscode.Uri,
  parentIg: Ignore,
  allowedExtensions: Set<string>
): Promise<vscode.Uri[]> => {
  const currentIg = ignore().add(parentIg)
  const currentGitignoreUri = vscode.Uri.joinPath(directoryUri, '.gitignore')
  try {
    const gitignoreContent = await vscode.workspace.fs.readFile(currentGitignoreUri)
    currentIg.add(Buffer.from(gitignoreContent).toString('utf8'))
  } catch (error) {
    // Ignore if .gitignore doesn't exist.
  }

  let entries: [string, vscode.FileType][] = []
  try {
    entries = await vscode.workspace.fs.readDirectory(directoryUri)
  } catch (error) {
    vscode.window.showWarningMessage(`Could not read directory: ${directoryUri.fsPath}`)
    return []
  }

  const allFileUris: vscode.Uri[] = []

  const filteredEntries = entries.filter(([name, type]) => {
    const relativePath = name
    const isIgnored =
      currentIg.ignores(relativePath) ||
      (type === vscode.FileType.Directory && currentIg.ignores(`${relativePath}/`))
    return !isIgnored
  })

  for (const [name, type] of filteredEntries) {
    const entryUri = vscode.Uri.joinPath(directoryUri, name)
    if (type === vscode.FileType.Directory) {
      const nestedFiles = await getUrisInDirectoryRecursive(entryUri, currentIg, allowedExtensions)
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
  return getUrisInDirectoryRecursive(directoryUri, rootIg, allowedExtensions)
}

/**
 * finds the workspace folder that contains the selected files,
 * if all reside within a single workspace folder
 */
async function findWorkspaceBaseUriForTree(files: vscode.Uri[]): Promise<vscode.Uri | undefined> {
  const workspaceFolders = vscode.workspace.workspaceFolders
  if (!workspaceFolders || workspaceFolders.length === 0) {
    return undefined
  }
  const containingFolders = new Set<vscode.WorkspaceFolder>()
  let fileFoundInWorkspace = false
  for (const fileUri of files) {
    let foundContainer = false
    for (const wf of workspaceFolders) {
      const relativePath = path.relative(wf.uri.fsPath, fileUri.fsPath)
      if (relativePath && !relativePath.startsWith('..') && !path.isAbsolute(relativePath)) {
        containingFolders.add(wf)
        foundContainer = true
        fileFoundInWorkspace = true
        break
      }
    }
  }
  if (containingFolders.size === 1) {
    // get root workspace folder URI
    return containingFolders.values().next().value?.uri || undefined
  } else if (containingFolders.size > 1) {
    vscode.window.showWarningMessage(
      'Selected files span multiple workspace folders. Cannot determine a single root for hierarchy.'
    )
    return undefined
  } else {
    if (files.length > 0 && !fileFoundInWorkspace) {
      vscode.window.showWarningMessage(
        'Selected files are not part of an open workspace folder. Cannot generate hierarchy.'
      )
    }
    return undefined
  }
}

/**
 * generates hierarchy string if enabled and possible.
 */
export const generateHierarchyIfEnabled = async (files: vscode.Uri[]): Promise<string | null> => {
  const config = vscode.workspace.getConfiguration('concatenate')
  const shouldPrependHierarchy = config.get<boolean>('prependFileHierarchy', true)
  if (!shouldPrependHierarchy || files.length === 0) {
    return null
  }
  const commonBaseUri = await findWorkspaceBaseUriForTree(files)
  if (commonBaseUri)
    try {
      const hierarchyString = await TreeGenerator.generateAsciiTree(commonBaseUri)
      return `File Hierarchy (from ${path.basename(
        commonBaseUri.fsPath
      )}):\n${hierarchyString}\n\n---\n`
    } catch (error) {
      vscode.window.showErrorMessage(
        `Failed to generate file hierarchy: ${
          error instanceof Error ? error.message : String(error)
        }`
      )
      return null
    }
  else return null
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
  concatenatedContent.push(directoryTreeContent || '')

  // extract file content
  let successfulFileReadCount = 0
  const fileProcessingPromises = files.map(async fileUri => {
    const filePath = fileUri.fsPath
    try {
      const fileContent = await fs.readFile(filePath, 'utf8')
      const fileExtension = path.extname(filePath).substring(1)
      if (fileContent.trim() === '') {
        return { success: true, content: [`File: ${filePath}`, `(empty file)`].join('\n') }
      } else {
        return {
          success: true,
          content: [`File: ${filePath}`, `\`\`\`${fileExtension}`, fileContent, '```'].join('\n'),
        }
      }
    } catch (err) {
      const errorMessage = `Error reading file: ${err instanceof Error ? err.message : String(err)}`
      return {
        success: false,
        content: [`File: ${filePath}`, `\`\`\`error`, errorMessage, '```'].join('\n'),
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

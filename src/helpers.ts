import * as fs from 'fs/promises'
import * as path from 'path'
import * as vscode from 'vscode'
import { TreeGenerator } from './treeGenerator'
import type { ConcatenationResult } from './types'

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
  let successfulFileCount = 0
  const results = await Promise.allSettled(
    files.map(async fileUri => {
      const filePath = fileUri.fsPath
      try {
        const fileContent = await fs.readFile(filePath, 'utf8')
        const fileExtension = path.extname(filePath).substring(1)
        successfulFileCount++
        return [`File: ${filePath}`, `\`\`\`${fileExtension}`, fileContent, '```'].join('\n')
      } catch (err) {
        const errorMessage = `Error reading file: ${
          err instanceof Error ? err.message : String(err)
        }`
        return [`File: ${filePath}`, `\`\`\`error`, errorMessage, '```'].join('\n')
      }
    })
  )

  // process and add results to content
  results.forEach(result => {
    if (result.status === 'fulfilled') {
      concatenatedContent.push(result.value)
    } else {
      concatenatedContent.push(
        `\`\`\`error\nUnexpected error during processing: ${result.reason}\n\`\`\``
      )
    }
  })

  return {
    success: true,
    value: concatenatedContent.join('\n\n'),
    fileCount: files.length,
    successfulFileCount: successfulFileCount,
  }
}

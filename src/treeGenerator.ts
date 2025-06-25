import * as vscode from 'vscode'
import * as path from 'node:path'
import { posix as posixPath } from 'path'
import ignore, { Ignore } from 'ignore'

async function readFileContent(uri: vscode.Uri): Promise<string | null> {
  try {
    const fileContentUint8Array = await vscode.workspace.fs.readFile(uri)
    return Buffer.from(fileContentUint8Array).toString('utf8')
  } catch (error: unknown) {
    const errorCode = (error as { code?: string })?.code
    if (errorCode === 'FileNotFound' || errorCode === 'ENOENT') {
      return null
    }
    vscode.window.showWarningMessage(
      `Could not read ${path.basename(uri.fsPath)}: ${
        error instanceof Error ? error.message : String(error)
      }`
    )
    return null
  }
}

export class TreeGenerator {
  public static async generateAsciiTree(rootUri: vscode.Uri): Promise<string> {
    const rootName = path.basename(rootUri.fsPath)
    let treeString = rootName + '\n'
    let rootIg = ignore().add('.git')
    const rootGitignoreUri = vscode.Uri.joinPath(rootUri, '.gitignore')
    const rootGitignoreContent = await readFileContent(rootGitignoreUri)
    if (rootGitignoreContent !== null) {
      rootIg.add(rootGitignoreContent)
    }
    try {
      const subtree = await this._buildTreeRecursive(rootUri, '', '', rootIg)
      treeString += subtree
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      treeString += `└─ Error reading root directory: ${errorMessage}\n`
      vscode.window.showErrorMessage(`Error generating file tree: ${errorMessage}`)
    }
    return treeString.trimEnd()
  }

  private static async _buildTreeRecursive(
    directoryUri: vscode.Uri,
    prefix: string,
    relativeBasePath: string,
    parentIg: Ignore
  ): Promise<string> {
    // create ignore instance for the current level, inheriting from parent, this creates
    // a new instance so child .gitignores don't affect siblings/parents
    const currentIg = ignore().add(parentIg)
    const currentGitignoreUri = vscode.Uri.joinPath(directoryUri, '.gitignore')
    const currentGitignoreContent = await readFileContent(currentGitignoreUri)
    if (currentGitignoreContent !== null) {
      currentIg.add(currentGitignoreContent) // Add rules from this level
    }
    let entries: [string, vscode.FileType][] = []
    try {
      entries = await vscode.workspace.fs.readDirectory(directoryUri)
    } catch (error) {
      return `${prefix}└─ Error reading directory\n`
    }

    // filter entries based on the *current* ignore rules, we need paths relative
    // to the directoryUri for matching within this level's context
    const filteredEntries = entries.filter(([name, type]) => {
      const entryRelativePath = posixPath.join(relativeBasePath, name)
      const isIgnored =
        currentIg.ignores(entryRelativePath) ||
        (type === vscode.FileType.Directory && currentIg.ignores(`${entryRelativePath}/`))
      return !isIgnored
    })
    filteredEntries.sort((a, b) => {
      const [nameA, typeA] = a
      const [nameB, typeB] = b
      if (typeA === vscode.FileType.Directory && typeB !== vscode.FileType.Directory) {
        return -1
      }
      if (typeA !== vscode.FileType.Directory && typeB === vscode.FileType.Directory) {
        return 1
      }
      return nameA.localeCompare(nameB)
    })

    // use filteredEntries to enforce .gitignore
    let subtreeString = ''
    const totalFilteredEntries = filteredEntries.length
    for (let i = 0; i < totalFilteredEntries; i++) {
      const [name, type] = filteredEntries[i]
      const isLast = i === totalFilteredEntries - 1
      const connector = isLast ? '└─ ' : '├─ '
      const line = `${prefix}${connector}${name}\n`
      subtreeString += line
      if (type === vscode.FileType.Directory) {
        const childUri = vscode.Uri.joinPath(directoryUri, name)
        const childPrefix = prefix + (isLast ? '   ' : '|  ')
        const childRelativePath = path.join(relativeBasePath, name)
        subtreeString += await this._buildTreeRecursive(
          childUri,
          childPrefix,
          childRelativePath,
          currentIg
        )
      }
    }
    return subtreeString
  }
}

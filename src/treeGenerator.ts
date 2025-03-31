import * as vscode from 'vscode'
import * as path from 'path'
import ignore, { Ignore } from 'ignore'
import { promises as fsPromises } from 'fs'

async function readFileContent(uri: vscode.Uri): Promise<string | null> {
  try {
    const fileBuffer = await fsPromises.readFile(uri.fsPath)
    return fileBuffer.toString('utf8')
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return null
    }
    vscode.window.showWarningMessage(
      `Could not read ${path.basename(uri.fsPath)}: ${error.message}`
    )
    return null
  }
}

export class TreeGenerator {
  public static async generateAsciiTree(rootUri: vscode.Uri): Promise<string> {
    const rootName = path.basename(rootUri.fsPath)
    let treeString = rootName + '\n'

    // initialize the top-level ignore instance
    let rootIg = ignore().add('.git') // Always ignore .git by default

    // load .gitignore from the root directory, if it exists
    const rootGitignoreUri = vscode.Uri.joinPath(rootUri, '.gitignore')
    const rootGitignoreContent = await readFileContent(rootGitignoreUri)
    if (rootGitignoreContent !== null) {
      rootIg.add(rootGitignoreContent)
    }

    try {
      const subtree = await this._buildTreeRecursive(rootUri, '', rootIg)
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
      const isIgnored =
        currentIg.ignores(name) ||
        (type === vscode.FileType.Directory && currentIg.ignores(name + '/'))
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
        subtreeString += await this._buildTreeRecursive(childUri, childPrefix, currentIg)
      }
    }
    return subtreeString
  }
}

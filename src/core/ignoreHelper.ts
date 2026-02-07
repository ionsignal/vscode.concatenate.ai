import * as vscode from 'vscode'
import ignore, { type Ignore } from 'ignore'
import { FileSystem } from '../utils/fileSystem'

/**
 * Helper class to manage .gitignore rules using the 'ignore' library.
 */
export class IgnoreHelper {
  /**
   * Creates a new Ignore instance.
   * @param parent The parent Ignore instance to inherit rules from.
   */
  public static create(parent?: Ignore): Ignore {
    return ignore().add(parent || [])
  }

  /**
   * Loads .gitignore content from a directory and adds it to the provided Ignore instance.
   * @param ig The Ignore instance to add rules to.
   * @param directoryUri The directory to look for .gitignore in.
   * @returns True if rules were loaded, false otherwise.
   */
  public static async loadIgnoreRules(ig: Ignore, directoryUri: vscode.Uri): Promise<boolean> {
    const gitignoreUri = vscode.Uri.joinPath(directoryUri, '.gitignore')
    try {
      const content = await FileSystem.readFile(gitignoreUri)
      if (content && content.trim().length > 0) {
        ig.add(content)
        return true
      }
    } catch (error) {
      // If reading .gitignore fails (e.g. binary file, permission error),
      // we simply ignore it and proceed without adding rules.
      // We could log this if we had a logger.
    }
    return false
  }

  /**
   * Adds the default .git ignore rule.
   */
  public static addDefaultRules(ig: Ignore): void {
    ig.add('.git')
  }
}

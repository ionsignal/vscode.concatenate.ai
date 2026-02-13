import * as path from 'node:path'
import * as vscode from 'vscode'

/**
 * Utility class for path manipulation, ensuring POSIX consistency across platforms.
 * Critical for 'ignore' library compatibility.
 */
export class PathUtils {
  /**
   * Normalizes a path to use POSIX separators (forward slashes).
   *
   * @param filePath The path to normalize.
   * @returns The normalized POSIX path.
   */
  public static toPosix(filePath: string): string {
    return filePath.split(path.sep).join(path.posix.sep)
  }

  /**
   * Joins path segments using POSIX separators.
   *
   * @param paths The path segments to join.
   * @returns The joined POSIX path.
   */
  public static joinPosix(...paths: string[]): string {
    return path.posix.join(...paths)
  }

  /**
   * Gets the basename of a path (POSIX standard).
   *
   * @param filePath The path.
   */
  public static basename(filePath: string): string {
    return path.posix.basename(filePath)
  }

  /**
   * Gets the extension of a path.
   *
   * @param filePath The path.
   */
  public static extname(filePath: string): string {
    return path.posix.extname(filePath)
  }

  /**
   * Calculates the relative path from one path to another using POSIX separators.
   *
   * @param from The source path.
   * @param to The destination path.
   */
  public static relative(from: string, to: string): string {
    return this.toPosix(path.relative(from, to))
  }

  /**
   * Finds the deepest common directory path for a given array of file URIs.
   *
   * @param uris An array of file URIs.
   * @returns A vscode.Uri representing the common base path, or undefined if no common path is found.
   */
  public static findCommonBasePath(uris: vscode.Uri[]): vscode.Uri | undefined {
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
}

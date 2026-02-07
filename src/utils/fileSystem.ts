import * as vscode from 'vscode'
import { TextDecoder } from 'util'

/**
 * Wrapper around vscode.workspace.fs to provide standardized error handling
 * and text decoding.
 */
export class FileSystem {
  /**
   * Reads a file and returns its content as a string.
   *
   * Returns null if the file does not exist (useful for optional files like .gitignore).
   * Throws an error if the file appears to be binary.
   * @param uri The URI of the file to read.
   */
  public static async readFile(uri: vscode.Uri): Promise<string | null> {
    try {
      const fileContentUint8Array = await vscode.workspace.fs.readFile(uri)
      // Check for binary content before decoding
      if (this.isBinary(fileContentUint8Array)) {
        throw new Error('Binary file detected')
      }
      return new TextDecoder('utf-8').decode(fileContentUint8Array)
    } catch (error: unknown) {
      if (this.isFileNotFoundError(error)) {
        return null
      }
      // Re-throw unexpected errors so they can be handled by the caller or bubbled up
      throw error
    }
  }

  /**
   * Reads a directory and returns its entries.
   *
   * @param uri The URI of the directory.
   */
  public static async readDirectory(uri: vscode.Uri): Promise<[string, vscode.FileType][]> {
    try {
      return await vscode.workspace.fs.readDirectory(uri)
    } catch (error) {
      // Standardize error message or rethrow
      throw new Error(
        `Could not read directory ${uri.fsPath}: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  /**
   * Gets file statistics.
   *
   * @param uri The URI to stat.
   */
  public static async stat(uri: vscode.Uri): Promise<vscode.FileStat> {
    return await vscode.workspace.fs.stat(uri)
  }

  /**
   * Checks if an error is a "File Not Found" error.
   */
  private static isFileNotFoundError(error: unknown): boolean {
    if (error instanceof vscode.FileSystemError) {
      return error.code === 'FileNotFound' || error.code === 'ENOENT'
    }
    // Fallback check for error code property if not strictly an instance of FileSystemError
    const code = (error as { code?: string })?.code
    return code === 'FileNotFound' || code === 'ENOENT'
  }

  /**
   * Heuristic to check if a buffer contains binary data.
   * Checks for null bytes (0x00) in the first 512 bytes.
   */
  private static isBinary(buffer: Uint8Array): boolean {
    const checkLen = Math.min(buffer.length, 512)
    for (let i = 0; i < checkLen; i++) {
      if (buffer[i] === 0x00) {
        return true
      }
    }
    return false
  }
}

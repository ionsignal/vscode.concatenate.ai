import * as vscode from 'vscode'

/**
 * Configuration keys defined in package.json
 */
enum ConfigKeys {
  PrependFileHierarchy = 'prependFileHierarchy',
  RecursiveSearchFileExtensions = 'recursiveSearchFileExtensions',
}

const SECTION = 'concatenate'

/**
 * Singleton class to manage extension configuration.
 * Provides typed access to settings defined in package.json.
 */
export class ConfigurationManager {
  private static _instance: ConfigurationManager

  private constructor() {}

  public static get instance(): ConfigurationManager {
    if (!this._instance) {
      this._instance = new ConfigurationManager()
    }
    return this._instance
  }

  private getConfig(): vscode.WorkspaceConfiguration {
    return vscode.workspace.getConfiguration(SECTION)
  }

  /**
   * If enabled, prepend a full file hierarchy of the related root directory.
   */
  public get prependFileHierarchy(): boolean {
    return this.getConfig().get<boolean>(ConfigKeys.PrependFileHierarchy, false)
  }

  /**
   * An array of file extensions to include when recursively concatenating files.
   * Returns a Set for O(1) lookup performance.
   */
  public get recursiveSearchFileExtensions(): Set<string> {
    const extensions = this.getConfig().get<string[]>(ConfigKeys.RecursiveSearchFileExtensions, [
      'mdx',
      'ts',
      'js',
    ])
    // Normalize to lowercase and remove leading dots if present for robust matching
    return new Set(extensions.map(ext => ext.toLowerCase().replace(/^\./, '')))
  }
}

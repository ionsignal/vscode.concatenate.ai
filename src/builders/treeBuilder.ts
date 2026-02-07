import { DirectoryNode, FileNode, NodeType, TreeNode } from '../core/types'

/**
 * Generates an ASCII tree representation from a DirectoryNode structure.
 */
export class TreeBuilder {
  /**
   * Generates the ASCII tree string.
   *
   * @param root The root directory node.
   */
  public static build(root: DirectoryNode): string {
    let treeString = root.name + '\n'
    treeString += this._buildRecursive(root.children, '')
    return treeString.trimEnd()
  }

  private static _buildRecursive(nodes: TreeNode[], prefix: string): string {
    let result = ''
    const totalNodes = nodes.length
    for (let i = 0; i < totalNodes; i++) {
      const node = nodes[i]
      const isLast = i === totalNodes - 1
      const connector = isLast ? '└─ ' : '├─ '
      result += `${prefix}${connector}${node.name}\n`
      if (node.type === NodeType.Directory) {
        const childPrefix = prefix + (isLast ? '   ' : '|  ')
        result += this._buildRecursive(node.children, childPrefix)
      }
    }
    return result
  }
}

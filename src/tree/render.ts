import { type DirectoryNode, type TreeNode } from './model'

export function render(root: DirectoryNode): string {
  return `${root.name}\n${children(root.children, '')}`.trimEnd()
}

function children(nodes: readonly TreeNode[], prefix: string): string {
  let result = ''
  for (let index = 0; index < nodes.length; index++) {
    const node = nodes[index]
    const last = index === nodes.length - 1
    const connector = last ? '└─ ' : '├─ '
    result += `${prefix}${connector}${node.name}\n`
    if (node.type === 'directory') {
      result += children(node.children, `${prefix}${last ? '   ' : '|  '}`)
    }
  }
  return result
}

import * as vscode from 'vscode'
import { compare, display, identity, normalize } from '../vscode/uri'

export interface FileNode {
  type: 'file'
  name: string
  uri: vscode.Uri
}

export interface DirectoryNode {
  type: 'directory'
  name: string
  uri?: vscode.Uri
  children: TreeNode[]
}

export type TreeNode = FileNode | DirectoryNode

export function file(uri: vscode.Uri): FileNode {
  const target = normalize(uri)
  return {
    type: 'file',
    name: display(target),
    uri: target,
  }
}

export function folder(name: string, uri?: vscode.Uri): DirectoryNode {
  return {
    type: 'directory',
    name,
    uri: uri ? normalize(uri) : undefined,
    children: [],
  }
}

export function copy(node: TreeNode): TreeNode {
  if (node.type === 'file') {
    return {
      type: 'file',
      name: node.name,
      uri: normalize(node.uri),
    }
  }
  const result = folder(node.name, node.uri)
  result.children = node.children.map(copy)
  return result
}

export function sort(node: DirectoryNode): void {
  for (const child of node.children) {
    if (child.type === 'directory') {
      sort(child)
    }
  }
  node.children.sort(compareNodes)
}

export function flatten(root: DirectoryNode): FileNode[] {
  const files: FileNode[] = []
  const seen = new Set<string>()
  visit(root, files, seen)
  return files
}

function visit(node: DirectoryNode, files: FileNode[], seen: Set<string>): void {
  for (const child of node.children) {
    if (child.type === 'directory') {
      visit(child, files, seen)
      continue
    }
    const key = identity(child.uri)
    if (!seen.has(key)) {
      seen.add(key)
      files.push(child)
    }
  }
}

function compareNodes(left: TreeNode, right: TreeNode): number {
  if (left.type !== right.type) {
    return left.type === 'directory' ? -1 : 1
  }
  const name = compareNames(left.name, right.name)
  if (name !== 0) {
    return name
  }
  if (left.uri && right.uri) {
    return compare(left.uri, right.uri)
  }
  if (left.uri) {
    return -1
  }
  if (right.uri) {
    return 1
  }
  return 0
}

function compareNames(left: string, right: string): number {
  if (left === right) {
    return 0
  }
  return left < right ? -1 : 1
}

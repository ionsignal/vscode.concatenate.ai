import * as vscode from 'vscode'
import { common, display, identity, normalize, origin, relative } from '../vscode/uri'
import {
  copy,
  file,
  flatten,
  folder,
  sort,
  type DirectoryNode,
  type FileNode,
  type TreeNode,
} from './model'

export interface Sources {
  targets: readonly vscode.Uri[]
  folders: readonly DirectoryNode[]
  files: readonly vscode.Uri[]
}

export interface MergeResult {
  tree: DirectoryNode
  files: FileNode[]
  context?: vscode.Uri
}

export function merge(sources: Sources): MergeResult {
  const targets = sources.targets.map(normalize)
  if (targets.length === 0) {
    const tree = folder('Selection')
    return {
      tree,
      files: [],
    }
  }
  const context = common(targets)
  if (context) {
    const tree = folder(display(context), context)
    append(tree, context, sources.folders, sources.files)
    sort(tree)
    return {
      tree,
      files: flatten(tree),
      context,
    }
  }
  return mergeOrigins(sources, targets)
}

function mergeOrigins(sources: Sources, targets: readonly vscode.Uri[]): MergeResult {
  const tree = folder('Selection')
  const groups = new Map<string, vscode.Uri[]>()
  for (const target of targets) {
    const key = origin(target)
    const group = groups.get(key)
    if (group) {
      group.push(target)
    } else {
      groups.set(key, [target])
    }
  }
  for (const [key, groupTargets] of groups) {
    const context = common(groupTargets)
    const group = folder(context ? context.toString() : key, context)
    const folders = sources.folders.filter(
      source => source.uri !== undefined && origin(source.uri) === key
    )
    const files = sources.files.filter(source => origin(source) === key)
    if (context) {
      append(group, context, folders, files)
    } else {
      for (const source of folders) {
        mergeChild(group, source)
      }
      for (const source of files) {
        mergeChild(group, file(source))
      }
    }
    tree.children.push(group)
  }
  sort(tree)
  return {
    tree,
    files: flatten(tree),
  }
}

function append(
  root: DirectoryNode,
  context: vscode.Uri,
  folders: readonly DirectoryNode[],
  files: readonly vscode.Uri[]
): void {
  for (const source of folders) {
    add(root, context, source)
  }
  for (const source of files) {
    add(root, context, file(source))
  }
}

function add(root: DirectoryNode, context: vscode.Uri, node: TreeNode): void {
  const uri = node.uri
  if (!uri) {
    mergeChild(root, node)
    return
  }
  const entryPath = relative(context, uri)
  if (entryPath === undefined) {
    mergeChild(root, node)
    return
  }
  const parts = entryPath.split('/').filter(part => part.length > 0 && part !== '.')
  if (parts.includes('..')) {
    mergeChild(root, node)
    return
  }
  if (parts.length === 0) {
    if (node.type === 'directory' && same(root, node)) {
      mergeFolder(root, node)
    } else {
      mergeChild(root, node)
    }
    return
  }
  let parent = root
  for (let index = 0; index < parts.length - 1; index++) {
    parent = ensureFolder(parent, parts[index])
  }
  mergeChild(parent, node)
}

function ensureFolder(parent: DirectoryNode, name: string): DirectoryNode {
  const uri = parent.uri ? normalize(vscode.Uri.joinPath(parent.uri, name)) : undefined
  const existing = uri
    ? parent.children.find(
        child =>
          child.type === 'directory' &&
          child.uri !== undefined &&
          identity(child.uri) === identity(uri)
      )
    : undefined
  if (existing && existing.type === 'directory') {
    return existing
  }
  const virtual = parent.children.find(
    child => child.type === 'directory' && child.uri === undefined && child.name === name
  )
  if (virtual && virtual.type === 'directory') {
    if (uri) {
      virtual.uri = uri
    }
    return virtual
  }
  const result = folder(name, uri)
  parent.children.push(result)
  return result
}

function mergeChild(parent: DirectoryNode, node: TreeNode): void {
  const existing = parent.children.find(child => same(child, node))
  if (!existing) {
    parent.children.push(copy(node))
    return
  }
  if (existing.type === 'directory' && node.type === 'directory') {
    mergeFolder(existing, node)
  }
}

function mergeFolder(target: DirectoryNode, source: DirectoryNode): void {
  if (!target.uri && source.uri) {
    target.uri = source.uri
  }
  for (const child of source.children) {
    mergeChild(target, child)
  }
}

function same(left: TreeNode, right: TreeNode): boolean {
  return (
    left.uri !== undefined && right.uri !== undefined && identity(left.uri) === identity(right.uri)
  )
}

import * as path from 'node:path'
import * as vscode from 'vscode'
import { create, type Issue } from '../issue'
import { isDirectory, isFile, isSymbolicLink, list } from '../vscode/fs'
import { display, normalize } from '../vscode/uri'
import { ignores, load, scope, type IgnoreLayer } from './ignore'
import { file, folder, sort, type DirectoryNode, type TreeNode } from './model'

export interface WalkOptions {
  extensions?: ReadonlySet<string>
  gitIgnore?: boolean
}

export interface WalkResult {
  tree: DirectoryNode
  issues: Issue[]
}

export async function walk(rootUri: vscode.Uri, options: WalkOptions = {}): Promise<WalkResult> {
  const root = normalize(rootUri)
  const tree = folder(display(root), root)
  const issues: Issue[] = []
  if (insideGitDirectory(root)) {
    return {
      tree,
      issues,
    }
  }
  const ignore = options.gitIgnore === false ? undefined : await scope(root)
  if (ignore?.blocked) {
    return {
      tree,
      issues: [ignore.blocked],
    }
  }
  const rootPath = ignore?.rootPath ?? ''
  if (ignore && rootPath !== '' && ignores(ignore.layers, rootPath, true)) {
    return {
      tree,
      issues,
    }
  }
  tree.children = await scan(root, rootPath, ignore?.layers ?? [], options, issues)
  return {
    tree,
    issues,
  }
}

async function scan(
  directory: vscode.Uri,
  relativePath: string,
  layers: readonly IgnoreLayer[],
  options: WalkOptions,
  issues: Issue[]
): Promise<TreeNode[]> {
  const active = [...layers]
  if (options.gitIgnore !== false) {
    const local = await load(directory, relativePath)
    if (local.kind === 'error') {
      issues.push(local.issue)
      return []
    }
    if (local.kind === 'layer') {
      active.push(local.layer)
    }
  }
  const result = await list(directory)
  if (result.kind === 'error') {
    issues.push(create('directory', directory, result.message))
    return []
  }
  const nodes: TreeNode[] = []
  for (const [name, type] of result.entries) {
    if (isSymbolicLink(type) || name === '.git') {
      continue
    }
    const entryPath = path.posix.join(relativePath, name)
    const isFolder = isDirectory(type)
    if (active.length > 0 && ignores(active, entryPath, isFolder)) {
      continue
    }
    const uri = normalize(vscode.Uri.joinPath(directory, name))
    if (isFolder) {
      const node = folder(name, uri)
      node.children = await scan(uri, entryPath, active, options, issues)
      nodes.push(node)
      continue
    }
    if (isFile(type) && included(name, options.extensions)) {
      nodes.push(file(uri))
    }
  }
  const sorted = folder('', undefined)
  sorted.children = nodes
  sort(sorted)
  return sorted.children
}

function insideGitDirectory(uri: vscode.Uri): boolean {
  return uri.path.split('/').some(segment => segment === '.git')
}

function included(name: string, extensions?: ReadonlySet<string>): boolean {
  if (!extensions) {
    return true
  }
  const extension = path.posix.extname(name).slice(1).toLowerCase()
  return extensions.has(extension)
}

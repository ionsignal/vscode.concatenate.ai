import * as vscode from 'vscode'
import ignore, { type Ignore } from 'ignore'
import { create, type Issue } from '../issue'
import { message, read, stat } from '../vscode/fs'
import { identity, normalize, parent, relative } from '../vscode/uri'

export interface IgnoreLayer {
  rules: Ignore
  base: string
}

export interface IgnoreScope {
  rootPath: string
  layers: IgnoreLayer[]
  blocked?: Issue
}

export type LoadResult =
  | {
      kind: 'none'
    }
  | {
      kind: 'layer'
      layer: IgnoreLayer
    }
  | {
      kind: 'error'
      issue: Issue
    }

type Match = 'ignored' | 'included' | undefined

export async function scope(directory: vscode.Uri): Promise<IgnoreScope> {
  const target = normalize(directory)
  const root = await base(target)
  const rootPath = relativePath(root, target)
  const layers: IgnoreLayer[] = []
  for (const ancestor of ancestors(root, rootPath)) {
    const result = await load(ancestor, relativePath(root, ancestor))
    if (result.kind === 'layer') {
      layers.push(result.layer)
      continue
    }
    if (result.kind === 'error') {
      return {
        rootPath,
        layers,
        blocked: result.issue,
      }
    }
  }
  return {
    rootPath,
    layers,
  }
}

export async function load(directory: vscode.Uri, base: string): Promise<LoadResult> {
  const file = vscode.Uri.joinPath(directory, '.gitignore')
  const result = await read(file, { strict: true })
  if (result.kind === 'missing') {
    return { kind: 'none' }
  }
  if (result.kind === 'binary') {
    return {
      kind: 'error',
      issue: create('ignore', file, 'The .gitignore file is binary.'),
    }
  }
  if (result.kind === 'error') {
    return {
      kind: 'error',
      issue: create('ignore', file, `Unable to read .gitignore: ${result.message}`),
    }
  }
  if (result.text.trim() === '') {
    return { kind: 'none' }
  }

  try {
    const rules = ignore()
    rules.add(result.text)
    return {
      kind: 'layer',
      layer: {
        rules,
        base,
      },
    }
  } catch (error) {
    return {
      kind: 'error',
      issue: create('ignore', file, `Unable to parse .gitignore: ${message(error)}`),
    }
  }
}

export function ignores(
  layers: readonly IgnoreLayer[],
  entryPath: string,
  isDirectory: boolean
): boolean {
  let ignored = false
  for (const layer of layers) {
    const path = layerPath(layer, entryPath)
    if (!path) {
      continue
    }
    const result = test(layer.rules, isDirectory ? `${path}/` : path)
    if (result === 'ignored') {
      ignored = true
    } else if (result === 'included') {
      ignored = false
    }
  }
  return ignored
}

async function base(directory: vscode.Uri): Promise<vscode.Uri> {
  const repository = await repositoryRoot(directory)
  if (repository) {
    return repository
  }
  const workspace = vscode.workspace.getWorkspaceFolder(directory)
  return workspace ? normalize(workspace.uri) : directory
}

async function repositoryRoot(directory: vscode.Uri): Promise<vscode.Uri | undefined> {
  let current = normalize(directory)
  while (true) {
    if (await hasGitMarker(current)) {
      return current
    }
    const next = parent(current)
    if (identity(next) === identity(current)) {
      return undefined
    }
    current = next
  }
}

async function hasGitMarker(directory: vscode.Uri): Promise<boolean> {
  try {
    await stat(vscode.Uri.joinPath(directory, '.git'))
    return true
  } catch {
    return false
  }
}

function ancestors(root: vscode.Uri, rootPath: string): vscode.Uri[] {
  const result: vscode.Uri[] = []
  let current = root
  for (const part of rootPath.split('/')) {
    if (!part || part === '.') {
      continue
    }
    result.push(current)
    current = normalize(vscode.Uri.joinPath(current, part))
  }
  return result
}

function relativePath(root: vscode.Uri, target: vscode.Uri): string {
  const path = relative(root, target)
  if (path === undefined || outside(path)) {
    return ''
  }
  return path === '.' ? '' : path
}

function outside(path: string): boolean {
  return path === '..' || path.startsWith('../')
}

function layerPath(layer: IgnoreLayer, entryPath: string): string | undefined {
  if (layer.base === '') {
    return entryPath
  }
  const prefix = `${layer.base}/`
  if (!entryPath.startsWith(prefix)) {
    return undefined
  }
  return entryPath.slice(prefix.length)
}

function test(rules: Ignore, path: string): Match {
  const result = rules.test(path)
  if (result.ignored) {
    return 'ignored'
  }
  if (result.unignored) {
    return 'included'
  }
  return undefined
}

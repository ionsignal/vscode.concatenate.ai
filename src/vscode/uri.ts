import * as path from 'node:path'
import * as vscode from 'vscode'

export function normalize(uri: vscode.Uri): vscode.Uri {
  const normalizedPath = normalizePath(uri.path)

  if (normalizedPath === uri.path) {
    return uri
  }

  return uri.with({ path: normalizedPath })
}

export function identity(uri: vscode.Uri): string {
  return normalize(uri).toString()
}

export function origin(uri: vscode.Uri): string {
  const target = normalize(uri)
  return `${target.scheme}://${target.authority}`
}

export function sameOrigin(left: vscode.Uri, right: vscode.Uri): boolean {
  const first = normalize(left)
  const second = normalize(right)
  return first.scheme === second.scheme && first.authority === second.authority
}

export function compare(left: vscode.Uri, right: vscode.Uri): number {
  const first = identity(left)
  const second = identity(right)
  if (first === second) {
    return 0
  }
  return first < second ? -1 : 1
}

export function parent(uri: vscode.Uri): vscode.Uri {
  const target = normalize(uri)
  const parentPath = target.path === '' ? '' : path.posix.dirname(target.path)
  return context(target, parentPath === '.' ? '' : parentPath)
}

export function common(uris: readonly vscode.Uri[]): vscode.Uri | undefined {
  if (uris.length === 0) {
    return undefined
  }
  const targets = uris.map(normalize)
  const first = targets[0]
  if (!targets.every(target => sameOrigin(first, target))) {
    return undefined
  }
  if (targets.length === 1) {
    return parent(first)
  }
  const absolute = first.path.startsWith('/')
  if (!targets.every(target => target.path.startsWith('/') === absolute)) {
    return undefined
  }
  let shared = segments(first.path)
  for (let index = 1; index < targets.length; index++) {
    const current = segments(targets[index].path)
    let length = 0
    while (
      length < shared.length &&
      length < current.length &&
      shared[length] === current[length]
    ) {
      length++
    }
    shared = shared.slice(0, length)
  }
  if (shared.length === 0 && !absolute) {
    return undefined
  }
  const commonPath = absolute ? `/${shared.join('/')}` : shared.join('/')
  return context(first, commonPath || (absolute ? '/' : ''))
}

export function relative(from: vscode.Uri, to: vscode.Uri): string | undefined {
  const base = normalize(from)
  const target = normalize(to)
  if (!sameOrigin(base, target)) {
    return undefined
  }
  if (base.path.startsWith('/') !== target.path.startsWith('/')) {
    return undefined
  }
  const baseParts = segments(base.path)
  const targetParts = segments(target.path)
  let shared = 0
  while (
    shared < baseParts.length &&
    shared < targetParts.length &&
    baseParts[shared] === targetParts[shared]
  ) {
    shared++
  }
  const upwards = Array.from({ length: baseParts.length - shared }, () => '..')
  const downwards = targetParts.slice(shared)
  return [...upwards, ...downwards].join('/')
}

export function display(uri: vscode.Uri): string {
  const target = normalize(uri)
  const basename = path.posix.basename(target.path)
  return basename || target.path || target.authority || target.scheme
}

function context(uri: vscode.Uri, uriPath: string): vscode.Uri {
  return normalize(uri).with({
    path: uriPath,
    query: '',
    fragment: '',
  })
}

function normalizePath(uriPath: string): string {
  if (uriPath === '') {
    return ''
  }
  let normalized = path.posix.normalize(uriPath)
  if (normalized.length > 1 && normalized.endsWith('/')) {
    normalized = normalized.slice(0, -1)
  }
  return normalized
}

function segments(uriPath: string): string[] {
  return uriPath.split('/').filter(segment => segment.length > 0 && segment !== '.')
}

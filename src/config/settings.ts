import * as vscode from 'vscode'

const SECTION = 'concatenate'
const DEFAULT_RECURSIVE_EXTENSIONS = [
  'md',
  'mdx',
  'ts',
  'js',
  'tsx',
  'jsx',
  'json',
  'py',
  'go',
  'rs',
  'java',
] as const

export interface Settings {
  hierarchy: boolean
  extensions: Set<string>
}

export function get(): Settings {
  const configuration = vscode.workspace.getConfiguration(SECTION)
  return {
    hierarchy: flag(configuration.get<unknown>('prependFileHierarchy'), false),
    extensions: extensions(
      configuration.get<unknown>('recursiveSearchFileExtensions'),
      DEFAULT_RECURSIVE_EXTENSIONS
    ),
  }
}

function flag(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback
}

function extensions(value: unknown, fallback: readonly string[]): Set<string> {
  const source: readonly unknown[] = Array.isArray(value) ? value : fallback
  const result = new Set<string>()
  for (const extension of source) {
    if (typeof extension !== 'string') {
      continue
    }
    const normalized = extension.trim().toLowerCase().replace(/^\./, '')
    if (normalized) {
      result.add(normalized)
    }
  }
  return result
}

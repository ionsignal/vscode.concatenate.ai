import * as path from 'node:path'
import * as vscode from 'vscode'
import { type Issue } from '../issue'
import { type FileNode } from '../tree/model'
import { read } from '../vscode/fs'
import { relative } from '../vscode/uri'

export interface Options {
  root?: vscode.Uri
  issues: readonly Issue[]
}

export interface Result {
  content: string
  fileCount: number
  handledCount: number
}

interface Entry {
  content: string
  handled: boolean
}

export async function build(files: readonly FileNode[], options: Options): Promise<Result> {
  const entries = await Promise.all(files.map(file => format(file, options)))
  const sections = entries.map(entry => entry.content)
  const problems = diagnostics(options.issues, options.root)
  if (problems) {
    sections.unshift(problems)
  }
  return {
    content: sections.join('\n\n'),
    fileCount: files.length,
    handledCount: entries.filter(entry => entry.handled).length,
  }
}

async function format(file: FileNode, options: Options): Promise<Entry> {
  const filePath = location(file.uri, options.root)
  const result = await read(file.uri)
  if (result.kind === 'text') {
    return formatText(filePath, extension(file), result.text)
  }
  if (result.kind === 'missing') {
    return {
      content: `File: ${filePath}\n(file not found)`,
      handled: true,
    }
  }
  if (result.kind === 'binary') {
    return {
      content: `File: ${filePath}\n(Binary file omitted)`,
      handled: true,
    }
  }
  return {
    content: [`File: ${filePath}`, '```error', `Error reading file: ${result.message}`, '```'].join(
      '\n'
    ),
    handled: false,
  }
}

function formatText(filePath: string, fileExtension: string, content: string): Entry {
  if (content.trim() === '') {
    return {
      content: `File: ${filePath}\n(empty file)`,
      handled: true,
    }
  }
  const delimiter = fence(fileExtension)
  return {
    content: [`File: ${filePath}`, `${delimiter}${fileExtension}`, content, delimiter].join('\n'),
    handled: true,
  }
}

function fence(fileExtension: string): string {
  return fileExtension === 'md' || fileExtension === 'mdx' || fileExtension === 'markdown'
    ? '````'
    : '```'
}

function diagnostics(issues: readonly Issue[], root: vscode.Uri | undefined): string | undefined {
  if (issues.length === 0) {
    return undefined
  }
  const entries = issues.map(
    issue => `- ${title(issue.kind)}: ${location(issue.uri, root)} — ${issue.message}`
  )
  return ['Discovery issues:', entries.join('\n')].join('\n\n')
}

function title(kind: Issue['kind']): string {
  switch (kind) {
    case 'selection':
      return 'Selected resource unavailable'
    case 'ignore':
      return '.gitignore unavailable'
    case 'directory':
      return 'Directory unavailable'
  }
}

function location(uri: vscode.Uri, root: vscode.Uri | undefined): string {
  if (root) {
    const relativePath = relative(root, uri)
    if (relativePath && !outside(relativePath)) {
      return relativePath
    }
  }
  return uri.toString()
}

function outside(relativePath: string): boolean {
  return relativePath === '..' || relativePath.startsWith('../')
}

function extension(file: FileNode): string {
  return path.posix.extname(file.uri.path).slice(1).toLowerCase()
}

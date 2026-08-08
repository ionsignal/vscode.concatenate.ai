import * as vscode from 'vscode'
import { TextDecoder } from 'node:util'

export type FileRead =
  | {
      kind: 'text'
      text: string
    }
  | {
      kind: 'missing'
    }
  | {
      kind: 'binary'
    }
  | {
      kind: 'error'
      message: string
    }

export type DirectoryRead =
  | {
      kind: 'entries'
      entries: [string, vscode.FileType][]
    }
  | {
      kind: 'error'
      message: string
    }

export interface ReadOptions {
  strict?: boolean
}

export async function read(uri: vscode.Uri, options: ReadOptions = {}): Promise<FileRead> {
  try {
    const bytes = await vscode.workspace.fs.readFile(uri)
    if (isBinary(bytes)) {
      return { kind: 'binary' }
    }

    return {
      kind: 'text',
      text: new TextDecoder('utf-8', { fatal: options.strict === true }).decode(bytes),
    }
  } catch (error) {
    if (isMissing(error)) {
      return { kind: 'missing' }
    }

    return {
      kind: 'error',
      message: message(error),
    }
  }
}

export async function list(uri: vscode.Uri): Promise<DirectoryRead> {
  try {
    return {
      kind: 'entries',
      entries: await vscode.workspace.fs.readDirectory(uri),
    }
  } catch (error) {
    return {
      kind: 'error',
      message: message(error),
    }
  }
}

export async function stat(uri: vscode.Uri): Promise<vscode.FileStat> {
  return vscode.workspace.fs.stat(uri)
}

export function isDirectory(type: vscode.FileType): boolean {
  return (type & vscode.FileType.Directory) === vscode.FileType.Directory
}

export function isFile(type: vscode.FileType): boolean {
  return (type & vscode.FileType.File) === vscode.FileType.File
}

export function isSymbolicLink(type: vscode.FileType): boolean {
  return (type & vscode.FileType.SymbolicLink) === vscode.FileType.SymbolicLink
}

export function isMissing(error: unknown): boolean {
  const code = errorCode(error)
  return code === 'FileNotFound' || code === 'ENOENT'
}

export function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function errorCode(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null || !('code' in error)) {
    return undefined
  }
  const code = (error as { code?: unknown }).code
  return typeof code === 'string' ? code : undefined
}

function isBinary(bytes: Uint8Array): boolean {
  const length = Math.min(bytes.length, 512)
  for (let index = 0; index < length; index++) {
    if (bytes[index] === 0x00) {
      return true
    }
  }
  return false
}

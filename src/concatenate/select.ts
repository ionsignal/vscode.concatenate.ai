import * as vscode from 'vscode'
import { create, type Issue } from '../issue'
import * as fs from '../vscode/fs'
import { compare, identity, normalize } from '../vscode/uri'

export interface Selection {
  inputs: vscode.Uri[]
  targets: vscode.Uri[]
  files: vscode.Uri[]
  folders: vscode.Uri[]
  issues: Issue[]
}

interface Resource {
  type: 'file' | 'folder'
  uri: vscode.Uri
}

type Classified = Resource | Issue

export async function select(
  uri: vscode.Uri | undefined,
  selected: readonly vscode.Uri[] | undefined
): Promise<Selection> {
  const inputs = selected && selected.length > 0 ? selected : uri ? [uri] : []
  const unique = new Map<string, vscode.Uri>()
  for (const input of inputs) {
    const target = normalize(input)
    const key = identity(target)
    if (!unique.has(key)) {
      unique.set(key, target)
    }
  }
  const candidates = [...unique.values()].sort(compare)
  const classified = await Promise.all(candidates.map(classify))
  const resources = classified.filter(isResource)
  const issues = classified.filter(isIssue)
  const files = resources
    .filter(resource => resource.type === 'file')
    .map(resource => resource.uri)
    .sort(compare)
  const folders = resources
    .filter(resource => resource.type === 'folder')
    .map(resource => resource.uri)
    .sort(compare)
  return {
    inputs: candidates,
    targets: resources.map(resource => resource.uri),
    files,
    folders,
    issues,
  }
}

async function classify(uri: vscode.Uri): Promise<Classified> {
  try {
    const result = await fs.stat(uri)
    if (fs.isDirectory(result.type)) {
      return {
        type: 'folder',
        uri,
      }
    }
    if (fs.isFile(result.type)) {
      return {
        type: 'file',
        uri,
      }
    }
    return create('selection', uri, 'The selected resource is neither a file nor a directory.')
  } catch (error) {
    if (fs.isMissing(error)) {
      return {
        type: 'file',
        uri,
      }
    }
    return create('selection', uri, fs.message(error))
  }
}

function isResource(value: Classified): value is Resource {
  return 'type' in value
}

function isIssue(value: Classified): value is Issue {
  return 'kind' in value
}

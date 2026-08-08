import * as vscode from 'vscode'
import { compare, identity, normalize } from './vscode/uri'

export type IssueKind = 'selection' | 'ignore' | 'directory'

export interface Issue {
  kind: IssueKind
  uri: vscode.Uri
  message: string
}

const ORDER: Record<IssueKind, number> = {
  selection: 0,
  ignore: 1,
  directory: 2,
}

export function create(kind: IssueKind, uri: vscode.Uri, message: string): Issue {
  return {
    kind,
    uri: normalize(uri),
    message: clean(message),
  }
}

export function unique(issues: readonly Issue[]): Issue[] {
  const result: Issue[] = []
  const seen = new Set<string>()
  for (const issue of issues) {
    const normalized = create(issue.kind, issue.uri, issue.message)
    const key = `${normalized.kind}\u0000${identity(normalized.uri)}\u0000${normalized.message}`
    if (!seen.has(key)) {
      seen.add(key)
      result.push(normalized)
    }
  }
  return result.sort(compareIssues)
}

function compareIssues(left: Issue, right: Issue): number {
  const kind = ORDER[left.kind] - ORDER[right.kind]
  if (kind !== 0) {
    return kind
  }
  const uri = compare(left.uri, right.uri)
  if (uri !== 0) {
    return uri
  }
  if (left.message === right.message) {
    return 0
  }
  return left.message < right.message ? -1 : 1
}

function clean(message: string): string {
  return message.replace(/[\s\u0000]+/g, ' ').trim() || 'Unknown error'
}

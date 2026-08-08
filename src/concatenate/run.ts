import * as vscode from 'vscode'
import * as settings from '../config/settings'
import { type Issue } from '../issue'
import { build } from '../markdown/build'
import { render } from '../tree/render'
import { message } from '../vscode/fs'
import { collect } from './collect'
import { select } from './select'

interface Output {
  content: string
  fileCount: number
  handledCount: number
  issues: readonly Issue[]
}

export async function run(uri?: vscode.Uri, selectedUris?: readonly vscode.Uri[]): Promise<void> {
  const output = await prepare(uri, selectedUris)
  if (!output) {
    return
  }
  try {
    const document = await vscode.workspace.openTextDocument({
      content: output.content,
      language: 'markdown',
    })
    await vscode.window.showTextDocument(document)
    report(output)
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to create document: ${message(error)}`)
  }
}

async function prepare(
  uri: vscode.Uri | undefined,
  selectedUris: readonly vscode.Uri[] | undefined
): Promise<Output | undefined> {
  try {
    const selection = await select(uri, selectedUris)
    if (selection.inputs.length === 0) {
      vscode.window.showInformationMessage('No files or directories selected.')
      return undefined
    }
    const configuration = settings.get()
    const collection = await collect(selection, {
      extensions: configuration.extensions,
    })
    const markdown = await build(collection.files, {
      root: collection.headerRoot,
      issues: collection.issues,
    })
    if (markdown.fileCount === 0) {
      reportEmpty(collection.issues)
      return undefined
    }
    const sections = [markdown.content]
    if (configuration.hierarchy) {
      sections.unshift(`File Hierarchy (from ${collection.tree.name}):\n${render(collection.tree)}`)
    }
    return {
      content: sections.join('\n\n').trim(),
      fileCount: markdown.fileCount,
      handledCount: markdown.handledCount,
      issues: collection.issues,
    }
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to concatenate: ${message(error)}`)
    return undefined
  }
}

function reportEmpty(issues: readonly Issue[]): void {
  if (issues.length === 0) {
    vscode.window.showWarningMessage('No matching files found to concatenate.')
    return
  }
  vscode.window.showErrorMessage(
    `Could not concatenate any files because ${summary(issues)} blocked selection or traversal.`
  )
}

function report(output: Output): void {
  const failedReads = output.fileCount - output.handledCount
  if (failedReads === 0 && output.issues.length === 0) {
    vscode.window.showInformationMessage(`Successfully concatenated ${output.handledCount} files!`)
    return
  }
  const parts = [`Concatenated ${plural(output.handledCount, 'file')}.`]
  if (failedReads > 0) {
    parts.push(`Failed to read ${plural(failedReads, 'file')}.`)
  }
  if (output.issues.length > 0) {
    parts.push(`Output is partial: ${summary(output.issues)}.`)
  }
  vscode.window.showWarningMessage(parts.join(' '))
}

function summary(issues: readonly Issue[]): string {
  const categories: ReadonlyArray<readonly [Issue['kind'], string]> = [
    ['selection', 'selected resource'],
    ['ignore', 'ignore file'],
    ['directory', 'directory'],
  ]
  const details: string[] = []
  for (const [kind, name] of categories) {
    const count = issues.filter(issue => issue.kind === kind).length
    if (count > 0) {
      details.push(plural(count, name))
    }
  }
  return `${plural(issues.length, 'discovery issue')} (${details.join(', ')})`
}

function plural(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? '' : 's'}`
}

// operations succeed/fail
export interface Result<T> {
  success: boolean
  value?: T
  error?: Error
}

// concatenation results
export interface ConcatenationResult extends Result<string> {
  fileCount: number
  successfulFileCount: number
}

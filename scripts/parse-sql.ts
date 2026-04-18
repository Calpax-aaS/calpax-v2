/**
 * MySQL INSERT dump parser.
 * Reads a MySQL dump file and returns a Map of table name to array of rows
 * where each row is a Record of column name to string value (or null for NULL).
 *
 * Usage:
 *   import { parseSqlDump } from './parse-sql'
 *   const tables = parseSqlDump('/path/to/dump.sql')
 *   const rows = tables.get('billetvol') ?? []
 */
import { readFileSync } from 'node:fs'

export type SqlRow = Record<string, string | null>

/**
 * Parse all column definitions from CREATE TABLE statements.
 * Returns a map: tableName to ordered list of column names.
 */
function parseColumnMap(sql: string): Map<string, string[]> {
  const columnMap = new Map<string, string[]>()

  // Match CREATE TABLE blocks
  const createTableRegex = /CREATE\s+TABLE\s+`([^`]+)`\s*\(([\s\S]+?)\)\s*ENGINE=/g
  let match: RegExpExecArray | null

  while ((match = createTableRegex.exec(sql)) !== null) {
    const tableName = match[1]
    const body = match[2]
    if (!tableName || !body) continue

    const columns: string[] = []
    // Each column line looks like: `columnName` type ...
    const colRegex = /^\s*`([^`]+)`\s+\S/gm
    let colMatch: RegExpExecArray | null

    while ((colMatch = colRegex.exec(body)) !== null) {
      const colName = colMatch[1]
      if (colName) {
        columns.push(colName)
      }
    }

    if (columns.length > 0) {
      columnMap.set(tableName, columns)
    }
  }

  return columnMap
}

/**
 * Parse a single VALUES tuple string into an array of string|null values.
 * Handles: integers, floats, quoted strings (with backslash escaping), NULL.
 */
function parseValuesTuple(tuple: string): Array<string | null> {
  const values: Array<string | null> = []
  let i = 0
  const len = tuple.length

  while (i < len) {
    // Skip whitespace
    while (
      i < len &&
      (tuple[i] === ' ' || tuple[i] === '\t' || tuple[i] === '\n' || tuple[i] === '\r')
    ) {
      i++
    }
    if (i >= len) break

    if (tuple[i] === ',') {
      i++
      continue
    }

    if (tuple[i] === "'") {
      // Quoted string — scan for closing quote, handling backslash escapes
      i++ // skip opening quote
      let str = ''
      while (i < len) {
        if (tuple[i] === '\\' && i + 1 < len) {
          const next = tuple[i + 1]
          if (next === "'") {
            str += "'"
            i += 2
          } else if (next === '\\') {
            str += '\\'
            i += 2
          } else if (next === 'n') {
            str += '\n'
            i += 2
          } else if (next === 'r') {
            str += '\r'
            i += 2
          } else if (next === 't') {
            str += '\t'
            i += 2
          } else {
            str += tuple[i]
            i++
          }
        } else if (tuple[i] === "'") {
          i++ // skip closing quote
          break
        } else {
          str += tuple[i]
          i++
        }
      }
      values.push(str)
    } else {
      // Unquoted value: NULL, integer, float
      let raw = ''
      while (i < len && tuple[i] !== ',' && tuple[i] !== ' ' && tuple[i] !== '\t') {
        raw += tuple[i]
        i++
      }
      if (raw.toUpperCase() === 'NULL') {
        values.push(null)
      } else {
        values.push(raw)
      }
    }
  }

  return values
}

/**
 * Split a VALUES block (everything after VALUES keyword) into individual tuple strings.
 * Handles multi-row inserts: (row1),(row2),...
 */
function splitValuesTuples(valuesBlock: string): string[] {
  const tuples: string[] = []
  let depth = 0
  let start = -1
  let i = 0
  const len = valuesBlock.length
  let inString = false

  while (i < len) {
    const ch = valuesBlock[i]

    if (inString) {
      if (ch === '\\' && i + 1 < len) {
        i += 2
        continue
      }
      if (ch === "'") {
        inString = false
      }
      i++
      continue
    }

    if (ch === "'") {
      inString = true
      i++
      continue
    }

    if (ch === '(') {
      if (depth === 0) {
        start = i + 1
      }
      depth++
    } else if (ch === ')') {
      depth--
      if (depth === 0 && start >= 0) {
        tuples.push(valuesBlock.slice(start, i))
        start = -1
      }
    }
    i++
  }

  return tuples
}

/**
 * Parse a MySQL dump file and return all table data.
 *
 * @param filePath Absolute path to the SQL dump file
 * @returns Map keyed by table name, each value is an array of row objects
 */
export function parseSqlDump(filePath: string): Map<string, SqlRow[]> {
  const sql = readFileSync(filePath, 'utf-8')

  // Step 1: parse column names from CREATE TABLE statements
  const columnMap = parseColumnMap(sql)

  const result = new Map<string, SqlRow[]>()

  // Step 2: parse INSERT INTO statements
  // Pattern: INSERT INTO `tablename` VALUES (...),(...),...;
  // These can span multiple lines, so we scan to the terminating semicolon manually.
  const insertStartRegex = /INSERT INTO `([^`]+)` VALUES /g
  let match: RegExpExecArray | null

  while ((match = insertStartRegex.exec(sql)) !== null) {
    const tableName = match[1]
    if (!tableName) continue

    const columns = columnMap.get(tableName)
    if (!columns || columns.length === 0) {
      // Unknown table structure — skip
      continue
    }

    // Find the end of this INSERT statement (semicolon at statement level)
    const valuesStart = match.index + match[0].length
    let valuesEnd = valuesStart
    let inStr = false

    while (valuesEnd < sql.length) {
      const ch = sql[valuesEnd]
      if (inStr) {
        if (ch === '\\' && valuesEnd + 1 < sql.length) {
          valuesEnd += 2
          continue
        }
        if (ch === "'") inStr = false
        valuesEnd++
        continue
      }
      if (ch === "'") {
        inStr = true
        valuesEnd++
        continue
      }
      if (ch === ';') {
        break
      }
      valuesEnd++
    }

    const valuesBlock = sql.slice(valuesStart, valuesEnd)
    const tuples = splitValuesTuples(valuesBlock)

    const rows: SqlRow[] = []
    for (const tuple of tuples) {
      const vals = parseValuesTuple(tuple)
      const row: SqlRow = {}
      for (let ci = 0; ci < columns.length; ci++) {
        const col = columns[ci]
        if (col) {
          row[col] = ci < vals.length ? (vals[ci] ?? null) : null
        }
      }
      rows.push(row)
    }

    // Merge rows if multiple INSERT INTO for same table
    const existing = result.get(tableName)
    if (existing) {
      existing.push(...rows)
    } else {
      result.set(tableName, rows)
    }
  }

  return result
}

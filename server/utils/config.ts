import Ajv from 'ajv'
import fs from 'node:fs'
import path from 'node:path'

export interface ColumnMappings {
  [role: string]: string
}

export interface Source {
  databaseId: string
  name: string
  columnMappings: ColumnMappings
}

export interface SourceConfig {
  sources: Source[]
}

const ajv = new Ajv()

const sourcesSchema = {
  type: 'object',
  properties: {
    sources: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'object',
        properties: {
          databaseId: { type: 'string', minLength: 1 },
          name: { type: 'string', minLength: 1 },
          columnMappings: {
            type: 'object',
            additionalProperties: { type: 'string' }
          }
        },
        required: ['databaseId', 'name', 'columnMappings'],
        additionalProperties: false
      }
    }
  },
  required: ['sources'],
  additionalProperties: false
}

const validate = ajv.compile(sourcesSchema)

let _config: SourceConfig | null = null

const DEFAULT_CONFIG_PATH = '/app/config/sources.json'

export async function loadConfig(configPath: string = DEFAULT_CONFIG_PATH): Promise<SourceConfig> {
  const resolvedPath = path.resolve(configPath)

  if (!fs.existsSync(resolvedPath)) {
    throw new Error(
      `[vizu] Config file not found at ${resolvedPath}\n` +
      `Copy config/sources.example.json to config/sources.json and update it with your Notion database IDs.`
    )
  }

  let raw: string
  try {
    raw = fs.readFileSync(resolvedPath, 'utf-8')
  } catch (err) {
    throw new Error(`[vizu] Failed to read config file at ${resolvedPath}: ${err}`)
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch (err) {
    throw new Error(`[vizu] sources.json is not valid JSON: ${err}`)
  }

  if (!validate(parsed)) {
    throw new Error(
      `[vizu] Config schema validation failed:\n${JSON.stringify(validate.errors, null, 2)}\n` +
      `See config/sources.example.json for the correct format.`
    )
  }

  _config = parsed as SourceConfig
  console.log(`[vizu] Loaded config with ${_config.sources.length} source(s) from ${resolvedPath}`)
  return _config
}

export function getConfig(): SourceConfig {
  if (!_config) {
    throw new Error('[vizu] Config not loaded. loadConfig() must be called before getConfig().')
  }
  return _config
}

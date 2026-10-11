#!/usr/bin/env node
/**
 * Pixelpaper's local agent bridge.
 *
 * Send one JSON object per line on stdin and receive one JSON object per line
 * on stdout. It never makes network requests and keeps the document in memory.
 * Example:
 *   echo '{"id":1,"tool":"studio.create","arguments":{"width":8,"height":8}}' | npm run agent
 */
import readline from 'node:readline'
import {
  AGENT_PROTOCOL_VERSION,
  AgentToolError,
  agentTools,
  createStudioState,
  invokeTool,
} from '../src/studio/model.ts'

let state = createStudioState()

function response(id, payload) {
  return JSON.stringify({ id: id ?? null, ...payload })
}

function handle(line) {
  let request
  try {
    request = JSON.parse(line)
  } catch {
    return response(null, { ok: false, error: { code: 'INVALID_JSON', message: 'request must be valid JSON' } })
  }
  if (!request || typeof request !== 'object' || Array.isArray(request)) {
    return response(null, { ok: false, error: { code: 'INVALID_REQUEST', message: 'request must be a JSON object' } })
  }
  const id = request.id ?? null
  if (typeof request.tool !== 'string' || request.tool.trim() === '') {
    return response(id, { ok: false, error: { code: 'INVALID_REQUEST', message: 'request.tool must be a non-empty string' } })
  }
  try {
    const result = invokeTool(state, request.tool, request.arguments ?? {})
    state = result.state
    return response(id, { ok: true, protocolVersion: AGENT_PROTOCOL_VERSION, result: result.result })
  } catch (error) {
    if (error instanceof AgentToolError) return response(id, { ok: false, protocolVersion: AGENT_PROTOCOL_VERSION, error: { code: error.code, message: error.message } })
    return response(id, { ok: false, protocolVersion: AGENT_PROTOCOL_VERSION, error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'unknown error' } })
  }
}

const input = readline.createInterface({ input: process.stdin, crlfDelay: Infinity })
for await (const line of input) {
  if (!line.trim()) continue
  process.stdout.write(`${handle(line)}\n`)
}

// Keep the import visible to tools that inspect this file and make accidental
// removal of the public registry obvious during review.
void agentTools

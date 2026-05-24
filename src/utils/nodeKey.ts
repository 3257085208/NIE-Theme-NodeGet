import type { Node } from '../types'

export function nodeKeyFrom(source: string, uuid: string) {
  return `${source}::${uuid}`
}

export function nodeKey(node: Node) {
  return nodeKeyFrom(node.source, node.uuid)
}

import type { RpcClient } from './client'
import type { DynamicDataResponse, DynamicSummary, StaticData, TaskQueryCondition, TaskQueryResult } from '../types'

export const listAgentUuids = (c: RpcClient) =>
  c.call<{ uuids?: string[] }>('nodeget-server_list_all_agent_uuid', {}).then(r => r?.uuids || [])

export const staticDataMulti = (c: RpcClient, uuids: string[], fields: string[]) =>
  c.call<StaticData[]>('agent_static_data_multi_last_query', { uuids, fields })

export const dynamicSummaryMulti = (c: RpcClient, uuids: string[], fields: string[]) =>
  c.call<DynamicSummary[]>('agent_dynamic_summary_multi_last_query', { uuids, fields })

export const dynamicDataMulti = (c: RpcClient, uuids: string[], fields: string[]) =>
  c.call<DynamicDataResponse[]>('agent_dynamic_data_multi_last_query', { uuids, fields })

export const dynamicDataAvg = (
  c: RpcClient,
  uuid: string,
  fields: string[],
  timestamp_from: number,
  timestamp_to: number,
  points: number,
) =>
  c.call<DynamicDataResponse[]>(
    'agent_query_dynamic_avg',
    {
      dynamic_data_avg_query: {
        fields,
        uuid,
        timestamp_from,
        timestamp_to,
        points,
      },
    },
    18_000,
  )

export const dynamicDataQuery = (
  c: RpcClient,
  uuid: string,
  fields: string[],
  timestamp_from: number,
  timestamp_to: number,
  limit: number,
) =>
  c.call<DynamicDataResponse[]>(
    'agent_query_dynamic',
    {
      dynamic_data_query: {
        fields,
        condition: [
          { uuid },
          { timestamp_from_to: [timestamp_from, timestamp_to] },
          { limit },
        ],
      },
    },
    18_000,
  )

export const dynamicSummaryAvg = (
  c: RpcClient,
  uuid: string,
  fields: string[],
  timestamp_from: number,
  timestamp_to: number,
  points: number,
) =>
  c.call<DynamicSummary[]>(
    'agent_query_dynamic_summary_avg',
    {
      dynamic_summary_avg_query: {
        fields,
        uuid,
        timestamp_from,
        timestamp_to,
        points,
      },
    },
    18_000,
  )

export const dynamicSummaryQuery = (
  c: RpcClient,
  uuid: string,
  fields: string[],
  timestamp_from: number,
  timestamp_to: number,
  limit: number,
) =>
  c.call<DynamicSummary[]>(
    'agent_query_dynamic_summary',
    {
      dynamic_summary_query: {
        fields,
        condition: [
          { uuid },
          { timestamp_from_to: [timestamp_from, timestamp_to] },
          { limit },
        ],
      },
    },
    18_000,
  )

export const kvGetMulti = (
  c: RpcClient,
  items: { namespace: string; key: string }[],
) => c.call<{ namespace: string; key: string; value: unknown }[]>('kv_get_multi_value', { namespace_key: items })

export const taskQuery = (
  c: RpcClient,
  conditions: TaskQueryCondition[],
  timeoutMs?: number,
) => c.call<TaskQueryResult[]>('task_query', { task_data_query: { condition: conditions } }, timeoutMs)

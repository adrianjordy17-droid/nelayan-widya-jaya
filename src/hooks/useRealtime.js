import { useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

/**
 * Subscribe to real-time changes on a Supabase table.
 * Calls onChange(payload) whenever INSERT/UPDATE/DELETE fires.
 *
 * Usage:
 *   useRealtime('orders', (payload) => { refetch() })
 */
export function useRealtime(table, onChange, filter) {
  const handleChange = useCallback(onChange, [])

  useEffect(() => {
    const channel = supabase
      .channel(`realtime:${table}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table,
          ...(filter || {}),
        },
        handleChange
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [table, handleChange])
}

/**
 * Subscribe to stock changes and trigger restock alerts.
 * Calls onLowStock(item) when qty <= minQty after an update.
 */
export function useStockAlerts(onLowStock) {
  useRealtime('products', (payload) => {
    if (payload.eventType === 'UPDATE') {
      const item = payload.new
      if (item.qty <= item.min_qty) {
        onLowStock?.(item)
      }
    }
  })
}

/**
 * Subscribe to new orders in real-time.
 */
export function useOrderUpdates(onNewOrder) {
  useRealtime('orders', (payload) => {
    if (payload.eventType === 'INSERT') {
      onNewOrder?.(payload.new)
    }
  })
}

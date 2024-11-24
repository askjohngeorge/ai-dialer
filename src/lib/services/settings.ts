import { supabase } from '../supabase'

export type AutomationSettings = {
  automation_enabled: boolean
  max_calls_batch?: number
  retry_interval?: number
  max_attempts?: number
}

const DEFAULT_SETTINGS: AutomationSettings = {
  automation_enabled: false,
  max_calls_batch: 5,
  retry_interval: 4,
  max_attempts: 3
}

export const settingsService = {
  async getAutomationSettings(): Promise<AutomationSettings> {
    const { data, error } = await supabase
      .from('settings')
      .select('automation_enabled, max_calls_batch, retry_interval, max_attempts')
      .single()

    if (error) {
      // If no settings exist, try to create default settings
      if (error.code === 'PGRST116') { // PostgreSQL "no rows returned" error
        const { data: newData, error: insertError } = await supabase
          .from('settings')
          .insert([DEFAULT_SETTINGS])
          .select()
          .single()

        if (insertError) {
          // If we can't create settings (e.g., due to permissions), just use defaults in memory
          // This ensures the app still works even if we can't persist settings
          console.log('Using in-memory default settings')
          return DEFAULT_SETTINGS
        }

        return newData || DEFAULT_SETTINGS
      }

      // For any other errors, log them but continue with defaults
      console.log('Using default settings due to error:', error.message)
      return DEFAULT_SETTINGS
    }

    // Return data with fallback to defaults for any missing fields
    return {
      automation_enabled: data.automation_enabled ?? DEFAULT_SETTINGS.automation_enabled,
      max_calls_batch: data.max_calls_batch ?? DEFAULT_SETTINGS.max_calls_batch,
      retry_interval: data.retry_interval ?? DEFAULT_SETTINGS.retry_interval,
      max_attempts: data.max_attempts ?? DEFAULT_SETTINGS.max_attempts
    }
  },

  async updateAutomationEnabled(enabled: boolean): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('settings')
        .update({ automation_enabled: enabled })
        .not('id', 'is', null) // Update all rows (should only be one)

      if (error) throw error

      return { success: true }
    } catch (error: any) {
      console.log('Error updating automation settings:', error.message)
      return { 
        success: false, 
        error: error.message || 'Failed to update settings'
      }
    }
  }
}
import type { PluginHost } from '@launcharr/tui/plugins'
import { invoke } from '@tauri-apps/api/core'

/**
 * The desktop `host` a plugin's cell or panel receives (docs/PLUGINS.md):
 * every call is one recorded IPC command, and this file is the whole list.
 * `open`/`copy` reuse the scripts action runner; `send` reaches the plugin's
 * service stdin; `openPanel` summons the launcher in panel mode.
 */
export function makeHost(pluginId: string): PluginHost {
  return {
    open: (target) =>
      invoke('script_action', {
        action: { type: 'open', value: target },
      }).catch(console.error),
    copy: (text) =>
      invoke('script_action', { action: { type: 'copy', value: text } }).catch(
        console.error,
      ),
    send: (message) =>
      invoke('plugin_send', { id: pluginId, message }).catch(console.error),
    openPanel: (id = pluginId) =>
      invoke('open_panel', { id }).catch(console.error),
  }
}

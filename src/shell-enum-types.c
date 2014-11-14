
/* Generated data (by glib-mkenums) */

#include "shell-enum-types.h"
/* enumerations from "./shell-app.h" */
#include "./shell-app.h"
GType
shell_app_state_get_type(void) {
  static GType enum_type_id = 0;
  if (G_UNLIKELY (!enum_type_id))
    {
      static const GEnumValue values[] = {
        { SHELL_APP_STATE_STOPPED, "SHELL_APP_STATE_STOPPED", "stopped" },
        { SHELL_APP_STATE_STARTING, "SHELL_APP_STATE_STARTING", "starting" },
        { SHELL_APP_STATE_RUNNING, "SHELL_APP_STATE_RUNNING", "running" },
        { 0, NULL, NULL }
      };
      enum_type_id = g_enum_register_static("ShellAppState", values);
    }
  return enum_type_id;
}
/* enumerations from "./shell-global.h" */
#include "./shell-global.h"
GType
shell_stage_input_mode_get_type(void) {
  static GType enum_type_id = 0;
  if (G_UNLIKELY (!enum_type_id))
    {
      static const GEnumValue values[] = {
        { SHELL_STAGE_INPUT_MODE_NONREACTIVE, "SHELL_STAGE_INPUT_MODE_NONREACTIVE", "nonreactive" },
        { SHELL_STAGE_INPUT_MODE_NORMAL, "SHELL_STAGE_INPUT_MODE_NORMAL", "normal" },
        { SHELL_STAGE_INPUT_MODE_FOCUSED, "SHELL_STAGE_INPUT_MODE_FOCUSED", "focused" },
        { SHELL_STAGE_INPUT_MODE_FULLSCREEN, "SHELL_STAGE_INPUT_MODE_FULLSCREEN", "fullscreen" },
        { 0, NULL, NULL }
      };
      enum_type_id = g_enum_register_static("ShellStageInputMode", values);
    }
  return enum_type_id;
}
GType
shell_cursor_get_type(void) {
  static GType enum_type_id = 0;
  if (G_UNLIKELY (!enum_type_id))
    {
      static const GEnumValue values[] = {
        { SHELL_CURSOR_DND_IN_DRAG, "SHELL_CURSOR_DND_IN_DRAG", "dnd-in-drag" },
        { SHELL_CURSOR_DND_UNSUPPORTED_TARGET, "SHELL_CURSOR_DND_UNSUPPORTED_TARGET", "dnd-unsupported-target" },
        { SHELL_CURSOR_DND_MOVE, "SHELL_CURSOR_DND_MOVE", "dnd-move" },
        { SHELL_CURSOR_DND_COPY, "SHELL_CURSOR_DND_COPY", "dnd-copy" },
        { SHELL_CURSOR_POINTING_HAND, "SHELL_CURSOR_POINTING_HAND", "pointing-hand" },
        { SHELL_CURSOR_CROSSHAIR, "SHELL_CURSOR_CROSSHAIR", "crosshair" },
        { 0, NULL, NULL }
      };
      enum_type_id = g_enum_register_static("ShellCursor", values);
    }
  return enum_type_id;
}
/* enumerations from "./shell-keybinding-modes.h" */
#include "./shell-keybinding-modes.h"
GType
shell_key_binding_mode_get_type(void) {
  static GType enum_type_id = 0;
  if (G_UNLIKELY (!enum_type_id))
    {
      static const GFlagsValue values[] = {
        { SHELL_KEYBINDING_MODE_NONE, "SHELL_KEYBINDING_MODE_NONE", "none" },
        { SHELL_KEYBINDING_MODE_NORMAL, "SHELL_KEYBINDING_MODE_NORMAL", "normal" },
        { SHELL_KEYBINDING_MODE_OVERVIEW, "SHELL_KEYBINDING_MODE_OVERVIEW", "overview" },
        { SHELL_KEYBINDING_MODE_LOCK_SCREEN, "SHELL_KEYBINDING_MODE_LOCK_SCREEN", "lock-screen" },
        { SHELL_KEYBINDING_MODE_UNLOCK_SCREEN, "SHELL_KEYBINDING_MODE_UNLOCK_SCREEN", "unlock-screen" },
        { SHELL_KEYBINDING_MODE_LOGIN_SCREEN, "SHELL_KEYBINDING_MODE_LOGIN_SCREEN", "login-screen" },
        { SHELL_KEYBINDING_MODE_MESSAGE_TRAY, "SHELL_KEYBINDING_MODE_MESSAGE_TRAY", "message-tray" },
        { SHELL_KEYBINDING_MODE_SYSTEM_MODAL, "SHELL_KEYBINDING_MODE_SYSTEM_MODAL", "system-modal" },
        { SHELL_KEYBINDING_MODE_LOOKING_GLASS, "SHELL_KEYBINDING_MODE_LOOKING_GLASS", "looking-glass" },
        { SHELL_KEYBINDING_MODE_TOPBAR_POPUP, "SHELL_KEYBINDING_MODE_TOPBAR_POPUP", "topbar-popup" },
        { SHELL_KEYBINDING_MODE_ALL, "SHELL_KEYBINDING_MODE_ALL", "all" },
        { 0, NULL, NULL }
      };
      enum_type_id = g_flags_register_static("ShellKeyBindingMode", values);
    }
  return enum_type_id;
}
/* enumerations from "./shell-network-agent.h" */
#include "./shell-network-agent.h"
GType
shell_network_agent_response_get_type(void) {
  static GType enum_type_id = 0;
  if (G_UNLIKELY (!enum_type_id))
    {
      static const GEnumValue values[] = {
        { SHELL_NETWORK_AGENT_CONFIRMED, "SHELL_NETWORK_AGENT_CONFIRMED", "confirmed" },
        { SHELL_NETWORK_AGENT_USER_CANCELED, "SHELL_NETWORK_AGENT_USER_CANCELED", "user-canceled" },
        { SHELL_NETWORK_AGENT_INTERNAL_ERROR, "SHELL_NETWORK_AGENT_INTERNAL_ERROR", "internal-error" },
        { 0, NULL, NULL }
      };
      enum_type_id = g_enum_register_static("ShellNetworkAgentResponse", values);
    }
  return enum_type_id;
}

/* Generated data ends here */


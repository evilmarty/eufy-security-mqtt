import { ParamType, CommandType } from 'eufy-security-client'

export const TYPE_NUMBER = 'number'
export const TYPE_OBJECT = 'object'

export const MANUFACTURER = 'Eufy Security'

export const STATUS_ONLINE = 'online'
export const STATUS_OFFLINE = 'offline'

export const STATE_ON = 'on'
export const STATE_OFF = 'off'
export const STATE_CLASS_MEASUREMENT = 'measurement'

export const ARM_AWAY = 'armed_away'
export const ARM_HOME = 'armed_home'
export const DISARM = 'disarmed'

export const DEVICE_CLASS = {
  charging_days: undefined,
  charing_total: 'power_factor',
  charging_reserve: 'power_factor',
  charging_missing: undefined,
  battery_usage_last_week: 'power_factor',
  custom_locked: 'lock',
  custom_motionDetected: 'motion',
  custom_personDetected: 'motion',
  custom_petDetected: 'motion',
  custom_soundDetected: 'sound',
  custom_cryingDetected: 'sound',
  custom_ringing: 'sound',
  [CommandType.CMD_GET_BATTERY]: 'battery',
  [CommandType.CMD_MOTION_SENSOR_BAT_STATE]: 'battery',
  [CommandType.CMD_KEYPAD_BATTERY_CAP_STATE]: 'battery',
  [CommandType.CMD_ENTRY_SENSOR_BAT_STATE]: 'battery',
  [CommandType.CMD_GET_BATTERY_TEMP]: 'temperature',
  [CommandType.CMD_GET_WIFI_RSSI]: 'signal_strength',
  [CommandType.CMD_GET_SUB1G_RSSI]: 'signal_strength',
  [ParamType.PRIVATE_MODE]: undefined,
  [CommandType.CMD_DEV_LED_SWITCH]: 'light',
  [CommandType.CMD_INDOOR_LED_SWITCH]: 'light',
  [CommandType.CMD_BAT_DOORBELL_SET_LED_ENABLE]: 'light',
  [ParamType.COMMAND_LED_NIGHT_OPEN]: 'light',
  [CommandType.CMD_GET_DEV_STATUS]: undefined,
  [CommandType.CMD_ENTRY_SENSOR_STATUS]: 'opening',
  [CommandType.CMD_ENTRY_SENSOR_CHANGE_TIME]: undefined,
  [CommandType.CMD_MOTION_SENSOR_PIR_EVT]: undefined,
}

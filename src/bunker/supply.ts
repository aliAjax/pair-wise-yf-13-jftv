/**
 * 供应信息：油品、供应船、受油舱预设。
 * 与校验逻辑、界面分开维护，供应方或舱容变动时只改这里。
 */

export interface TankPreset {
  tankName: string;
  capacity: number; // 舱容上限(t)
}

/** 常用油品 */
export const OIL_TYPES: string[] = [
  "船用重油 HFO 380",
  "船用重油 HFO 180",
  "低硫燃料油 VLSFO",
  "船用轻柴油 MGO",
  "船用柴油 MDO",
];

/** 常见供油船 */
export const SUPPLIER_BARGES: string[] = [
  "沪油供6号",
  "甬港供油12号",
  "穗油供3号",
  "青油供9号",
];

/** 本船受油舱与舱容上限 */
export const TANK_PRESETS: TankPreset[] = [
  { tankName: "1号燃油舱(左)", capacity: 120 },
  { tankName: "1号燃油舱(右)", capacity: 120 },
  { tankName: "2号燃油舱(左)", capacity: 150 },
  { tankName: "2号燃油舱(右)", capacity: 150 },
  { tankName: "轻油日用柜", capacity: 40 },
  { tankName: "燃油沉淀柜", capacity: 60 },
];

export function tankPreset(name: string): TankPreset | undefined {
  return TANK_PRESETS.find((p) => p.tankName === name.trim());
}

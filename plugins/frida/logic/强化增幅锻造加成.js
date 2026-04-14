/**
 * 强化增幅锻造加成.js - v1.1.0 (配置分离版 - 全中文键名)
 * 功能：根据 VIP 配置或穿戴物品提升强化/增幅/锻造成功率
 * 2026.2.15 By.南瓜
 * 2026.3.27 配置外部化改造
 */

module.exports = {
    // ==================== 配置文件路径 ====================
    configPath: '/plugins/frida/configs/强化增幅锻造加成.json',
    
    hasAmplifyAbility(invenItem) {
        return invenItem.add(17).readU8() !== 0;
    },

    isInRange(level, rangeStr) {
        const parts = rangeStr.split('-');
        
        if (parts.length === 1) {
            return level === parseInt(parts[0]);
        } else if (parts.length === 2) {
            const min = parseInt(parts[0]);
            const max = parseInt(parts[1]);
            return level >= min && level <= max;
        }
        
        return false;
    },

    getBoostValue(boostConfig, level) {
        if (!boostConfig) return 0;
        
        for (let range in boostConfig) {
            if (this.isInRange(level, range)) {
                return boostConfig[range];
            }
        }
        
        return 0;
    },

    getFinalBoost(user, level, upgradeType) {
        const characNo = CUserCharacInfo_getCurCharacNo(user);
        
        // 1. 检查 VIP 配置（优先级最高，直接返回）
        for (let vip of this.CONFIG['VIP 玩家配置']) {
            if (vip['角色 ID 列表'].includes(characNo)) {
                const boost = this.getBoostValue(vip['加成配置'][upgradeType], level);
                return boost;
            }
        }
        
        // 2. 检查穿戴物品（可叠加）
        const inven = CUserCharacInfo_getCurCharacInvenR(user);
        if (inven.isNull()) return 0;
        
        let totalBoost = 0;
        
        for (let item of this.CONFIG['穿戴物品配置']) {
            const itemPtr = CInventory_GetInvenRef(inven, INVENTORY_TYPE_BODY, item['槽位']);
            
            if (Inven_Item_isEmpty(itemPtr)) continue;
            
            const itemId = Inven_Item_getKey(itemPtr);
            
            if (itemId === item['物品 ID']) {
                const boost = this.getBoostValue(item['加成配置'][upgradeType], level);
                if (boost > 0) {
                    totalBoost += boost;
                }
            }
        }
        
        return totalBoost;
    },
    
    init() {
        const self = this;
        // Hook 强化/增幅入口 (0x0854755A - WongWork::CItemUpgrade::Enter)
        Interceptor.attach(ptr(0x0854755A), {
            onEnter: function(args) {
                try {
                    const user = args[1];
                    const invenItem = args[2];
                    const upgradeInfo = args[3];
                    const probBase = args[0].add(0x4EC).readU32();
                    
                    // 读取当前等级和类型
                    const currentLevel = Inven_Item_GetUpgrade(invenItem);
                    const targetLevel = currentLevel + 1;
                    const isAmplify = self.hasAmplifyAbility(invenItem);
                    const upgradeType = isAmplify ? "增幅" : "强化";
                    
                    // 获取加成
                    const boost = self.getFinalBoost(user, targetLevel, upgradeType);
                    
                    if (boost > 0) {
                        const originalFailRate = upgradeInfo.add(32).readU32();
                        const boostAmount = Math.floor(probBase * boost / 100);
                        let newFailRate = originalFailRate - boostAmount;
                        if (newFailRate < 0) newFailRate = 0;
                        
                        upgradeInfo.add(32).writeU32(newFailRate);
                    }
                } catch (e) {
                    log_crash("强化加成", "强化/增幅处理", e);
                }
            }
        });
        
        // Hook 锻造入口 (0x0811E468 - WongWork::CItemUpgrade::Separate_Enter)
        Interceptor.attach(ptr(0x0811E468), {
            onEnter: function(args) {
                try {
                    const thisPtr = args[0];
                    const user = args[1];
                    const invenItem = args[2];
                    const upgradeInfo = args[3];
                    
                    // 读取当前等级
                    const currentLevel = invenItem.add(51).readU8();
                    const targetLevel = currentLevel + 1;
                    
                    // 获取加成
                    const boost = self.getFinalBoost(user, targetLevel, "锻造");
                    
                    if (boost > 0) {
                        const probBase = thisPtr.add(400).readU32();
                        const originalSuccessRate = upgradeInfo.add(4).readU32();
                        const boostAmount = Math.floor((probBase / 10) * boost / 100);
                        let newSuccessRate = originalSuccessRate + boostAmount;
                        if (newSuccessRate > 10000) newSuccessRate = 10000;
                        
                        upgradeInfo.add(4).writeU32(newSuccessRate);
                    }
                } catch (e) {
                    log_crash("强化加成", "锻造处理", e);
                }
            }
        });
    }
};

/**
 * 副本金币卡片奖励接管模块
 * 按副本 ID 难度配置不同的奖励
 * 2026.2.8 By.南瓜
 * 2026.3.25 配置外部化改造
 * 2026.3.27 改用全中文键名
 */

module.exports = {
    // ==================== 配置文件路径 ====================
    configPath: '/plugins/frida/configs/指定副本金牌奖励.json',

    // JSON 中文键 → JS 英文键 映射
    fieldMapping: {
        "副本金牌奖励配置": "dungeonRewards",
        "物品 ID":   "itemId",
        "最小数量":  "minCount",
        "最大数量":  "maxCount",
        "权重":      "weight"
    },

    init() {
        this.hookGoldCardReward();
    },

    /**
     * 根据权重随机选择物品
     */
    selectItemByWeight(itemList) {
        if (!itemList || itemList.length === 0) {
            return null;
        }
        
        let totalWeight = 0;
        for (let i = 0; i < itemList.length; i++) {
            totalWeight += itemList[i].weight;
        }
        
        let randomValue = Math.random() * totalWeight;
        let currentWeight = 0;
        
        for (let i = 0; i < itemList.length; i++) {
            currentWeight += itemList[i].weight;
            
            if (randomValue < currentWeight) {
                let item = itemList[i];
                return {
                    itemId: item.itemId,
                    count: this.randomInt(item.minCount, item.maxCount)
                };
            }
        }
        
        let item = itemList[0];
        return {
            itemId: item.itemId,
            count: this.randomInt(item.minCount, item.maxCount)
        };
    },

    /**
     * 生成指定范围内的随机整数
     */
    randomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    },

    /**
     * 写入物品到指定位置
     */
    writeCardItem(party, member_no, item_id, item_count, user) {
        const item_offset = 1965 + 122 * member_no;
        const CurCharacInvenR = CUserCharacInfo_getCurCharacInvenR(user);
        const item_type = CInventory_GetItemType(CurCharacInvenR, item_id);
        
        // 清空物品数据
        for (let i = 0; i < 122; i++) {
            party.add(item_offset + i).writeU8(0);
        }
        
        if (item_type === 1) {
            // 装备类型
            const Citem = CDataManager_find_item(G_CDataManager(), item_id);
            if (!Citem || Citem.isNull()) {
                return false;
            }
            
            const durability = CEquipItem_get_endurance(Citem);
            const AttachType = CItem_getAttachType(Citem);
            
            party.add(item_offset + 0).writeU8(AttachType === 3 ? 1 : 0);
            party.add(item_offset + 1).writeU8(item_type);
            party.add(item_offset + 2).writeU32(item_id);
            party.add(item_offset + 7).writeU32(get_rand_int(0));
            party.add(item_offset + 11).writeU16(durability);
        } 
        else if (item_type === 2 || item_type === 3 || item_type === 12) {
            // 消耗品/材料
            party.add(item_offset + 0).writeU8(0);
            party.add(item_offset + 1).writeU8(item_type);
            party.add(item_offset + 2).writeU32(item_id);
            party.add(item_offset + 7).writeU32(item_count);
        }
        else {
            return false;
        }
        
        return true;
    },

    /**
     * Hook 金币卡片翻牌逻辑
     */
    hookGoldCardReward() {
        const self = this;
        
        Interceptor.attach(ptr(0x085B415A), {
            onEnter(args) {
                const party = args[0];
                const user = args[1];
                const card_index = args[2].toInt32();
                const card_type = args[3].toInt32();
                
                // 只处理金币卡片 (type = 1)
                if (card_type !== 1) {
                    return;
                }
                
                try {
                    const member_no = CParty_GetMemberSlotNo(party, user);
                    const dungeon_ptr = party.add(812 * 4);
                    const dungeon_id = CDungeon_get_index(dungeon_ptr);
                    const difficulty = CBattle_Field_get_dungeon_diff(party.add(2852));
                    const config_key = dungeon_id + "_" + difficulty;
                    const itemConfig = self.CONFIG.dungeonRewards[config_key];

                    if (!itemConfig) {
                        return;
                    }

                    const selectedItem = self.selectItemByWeight(itemConfig);
                    if (selectedItem) {
                        self.writeCardItem(party, member_no, selectedItem.itemId, selectedItem.count, user);
                    }
                } catch (e) {
                    log_error('[GoldCard] Process failed: {}', e.message);
                }
            }
        });
    },
};
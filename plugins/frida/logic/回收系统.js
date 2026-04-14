/**
 * 回收系统.js - v1.1 (配置分离版 - 全中文键名)
 * 
 * 功能：使用回收箱回收指定物品获得奖励
 * 2026.3.27 配置外部化改造
 */

module.exports = {
    // ==================== 配置文件路径 ====================
    configPath: '/plugins/frida/configs/回收系统.json',
    init() {
        this.hookRecycleFunction();
        this.hookRecycleCheck();
    },
    
    /**
     * Hook 回收功能主函数
     */
    hookRecycleFunction() {
        const self = this;
        Interceptor.replace(ptr(0x081D3D38), new NativeCallback(function (a1, user, a3, packet_buf) {
            // 获取背包和物品
            const inven = CUserCharacInfo_getCurCharacInvenW(user);
            // 读取物品槽位和回收箱槽位
            const slot = packet_buf.add(20 * Process.pointerSize).readPointer().add(13).readU16();
            const box_slot = packet_buf.add(20 * Process.pointerSize).readPointer().add(19).readU16();
            const box = CInventory_GetInvenRef(inven, 1, box_slot);
            const boxID = box.add(2).readU32();

            // 获取当前回收箱的配置
            const recycleConfig = self.CONFIG['回收箱配置'][boxID];
            if (!recycleConfig) {
                return 0;
            }

            // 待回收物品对象
            const item = CInventory_GetInvenRef(inven, 1, slot);
            
            // 待回收物品ID和数量
            const item_id = Inven_Item_getKey(item);
            const item_count = item.add(7).readU32();
            
            // 判断是否为装备
            const isEquipment = api_is_Equipment_item(item_id);
            
            // 确定实际回收数量
            const recycle_count = isEquipment ? 1 : item_count;
            
            // 从当前回收箱配置中获取回收奖励
            const rewards = recycleConfig[item_id];
            
            if (rewards) {
                // 删除回收的物品
                CInventory_delete_item(inven, 1, slot, recycle_count, 5, 1);
                CUser_SendUpdateItemList(user, 1, 0, slot);
                
                // 构建奖励列表
                const itemList = [];
                let totalCera = 0;
                let totalCeraPoint = 0;
                
                rewards.forEach(([reward_id, reward_count]) => {
                    if (reward_id === -1) {
                        // 点券奖励
                        totalCera += reward_count * recycle_count;
                    } else if (reward_id === -2) {
                        // 代币奖励
                        totalCeraPoint += reward_count * recycle_count;
                    } else {
                        // 物品奖励
                        const total_reward = reward_count * recycle_count;
                        
                        // 判断奖励是否为装备
                        if (api_is_Equipment_item(reward_id)) {
                            for (let i = 0; i < total_reward; i++) {
                                itemList.push([reward_id, 1]);
                            }
                        } else {
                            itemList.push([reward_id, total_reward]);
                        }
                    }
                });
                
                // 发放物品奖励
                if (itemList.length > 0) {
                    api_CUser_Add_Item_list(user, itemList);
                }
                
                // 发放点券
                if (totalCera > 0) {
                    api_recharge_cash_cera(user, totalCera);
                    api_CUser_SendNotiPacketMessage(user, `获得点券: ${totalCera}`, 0);
                }
                
                // 发放代币
                if (totalCeraPoint > 0) {
                    api_recharge_cash_cera_point(user, totalCeraPoint);
                    api_CUser_SendNotiPacketMessage(user, `获得代币: ${totalCeraPoint}`, 0);
                }
                
                // 消耗回收箱
                CInventory_delete_item(inven, 1, box_slot, 1, 5, 1);
                CUser_SendUpdateItemList(user, 1, 0, box_slot);
                
            } else {
                api_send_msg(user, '回收失败，该物品不支持回收。', 1);
            }
            
            return 0;
        }, 'int', ['pointer', 'pointer', 'pointer', 'pointer']));
    },
    
    hookRecycleCheck() {
        Interceptor.replace(ptr(0x081D4784), new NativeCallback(function(a1, a2, a3) {
            return 0;
        }, 'int', ['pointer', 'pointer', 'pointer']));
    }
};

/**
 * 宠物附魔.js - v1.0
 * 功能: 顾名思义，可以给宠物以及宠物装备附魔
 * 说明: 需搭配dll或登录器支持
 * 2026.1.29 By.南瓜
 */

module.exports = {
    _patched: false,

    init() {
        if (!this._patched) {
            const patchAddr = ptr(0x0850DEDE);
            Memory.protect(patchAddr, 2, 'rwx');
            patchAddr.writeByteArray([0x90, 0x90]);
            this._patched = true;
        }

        // 判断卡片匹配
        const getUsableItemType = new NativeFunction(ptr(0x0850D780), 'bool', ['pointer','int'], { abi: 'sysv' });
        // 获取卡片ID
        const getMonsterCardId = new NativeFunction(ptr(0x0849F530), 'int', ['pointer'], { abi: 'sysv' });
        // 原附魔函数
        const originalEnchantFunc = new NativeFunction(ptr(0x0849ED1A), 'int', ['pointer', 'pointer', 'int','int','int','int'], { abi: 'sysv' });

        Interceptor.replace(ptr(0x0849ED1A), new NativeCallback(function(a1, a2, a3, a4, a5, a6) {
            // a6 > 56 表示宠物背包槽位范围
            if (a6 > 56) {
                const user = a2;
                const inven = CUserCharacInfo_getCurCharacInvenW(user);
                const beadPtr = CInventory_GetInvenRef(inven, 1, a4);
                
                if (beadPtr.isNull()) return originalEnchantFunc(a1, a2, a3, a4, a5, a6);
                const beadId = beadPtr.add(2).readU32();
                const cardId = getMonsterCardId(CDataManager_find_item(G_CDataManager(), beadId));
                
                const creatureSlot = a6 - 57;
                const creature = CInventory_GetInvenRef(inven, 3, creatureSlot);
                if (creature.isNull()) return originalEnchantFunc(a1, a2, a3, a4, a5, a6);
                const creatureId = Inven_Item_getKey(creature);
                const creatureData = CDataManager_find_item(G_CDataManager(), creatureId);
                const creatureType = CEquipItem_GetItemType(creatureData);
                const cardData = CDataManager_find_item(G_CDataManager(), cardId);
                
                if (getUsableItemType(cardData, creatureType) === 0) {
                    api_send_msg(user, "附魔错误：卡片与部位不匹配", 1);
                    return 0;
                }
                creature.add(13).writeU32(cardId);
                
                CUser_SendUpdateItemList(user, 1, 7, creatureSlot);
                CInventory_delete_item(inven, 1, a4, 1, 5, 1);
                CUser_SendUpdateItemList(user, 1, 0, a4);
                if (creatureSlot < 140) {
                    const uiId = creature.add(7).readInt();
                    const charNo = CUserCharacInfo_getCurCharacNo(user);
                    
                    const selectSql = `select card from \`taiwan_cain_2nd\`.\`creature_items_enchant\` where ui_id = ${uiId}`;
                    if (api_MySQL_exec(globalThis.mysql_frida, selectSql)) {
                        if (MySQL_get_n_rows(globalThis.mysql_frida)) {
                            const updateSql = `update \`taiwan_cain_2nd\`.\`creature_items_enchant\` set \`card\` = '${cardId}' where \`ui_id\` = ${uiId}`;
                            api_MySQL_exec(globalThis.mysql_frida, updateSql);
                        } else {
                            const insertSql = `INSERT INTO \`taiwan_cain_2nd\`.\`creature_items_enchant\`(\`ui_id\`, \`charac_no\`, \`card\`) VALUES (${uiId}, ${charNo}, ${cardId})`;
                            api_MySQL_exec(globalThis.mysql_frida, insertSql);
                        }
                    }
                }
                // 发送成功包
                const packet = api_PacketGuard_PacketGuard();
                InterfacePacketBuf_put_header(packet, 1, 275);
                InterfacePacketBuf_put_byte(packet, 1);
                InterfacePacketBuf_finalize(packet, 1);
                CUser_Send(user, packet);
                Destroy_PacketGuard_PacketGuard(packet);
                
                return 0;
            } else {
                return originalEnchantFunc(a1, a2, a3, a4, a5, a6);
            }
        }, 'int', ['pointer', 'pointer', 'int', 'int', 'int', 'int']));

    },

    // ==================== 登录恢复附魔 ====================
    onLogin(user, charNo) {
        const sql = `select ui_id, card from \`taiwan_cain_2nd\`.\`creature_items_enchant\` where charac_no = ${charNo}`;
        
        if (api_MySQL_exec(globalThis.mysql_frida, sql)) {
            const rows = MySQL_get_n_rows(globalThis.mysql_frida);
            if (rows > 0) {
                const dbData = []; 
                for (let i = 0; i < rows; i++) {
                    MySQL_fetch(globalThis.mysql_frida);
                    dbData.push({
                        uiId: api_MySQL_get_int(globalThis.mysql_frida, 0),
                        card: api_MySQL_get_int(globalThis.mysql_frida, 1)
                    });
                }

                const inven = CUserCharacInfo_getCurCharacInvenW(user);
        
                for (let i = 0; i < 141; i++) {
                    let type = 3; 
                    let slot = i;
                    
                    if (i === 140) { 
                        type = 0; 
                        slot = 22; 
                    }
                    
                    const item = CInventory_GetInvenRef(inven, type, slot);
                    if (item.isNull()) continue;

                    const currentUiId = item.add(7).readInt();
                    const record = dbData.find(d => d.uiId === currentUiId);
                    if (record) {
                        item.add(13).writeU32(record.card);
                        if (i === 140) CUser_SendUpdateItemList(user, 1, 0, 22);
                        else CUser_SendUpdateItemList(user, 1, 7, i);
                    }
                }
            }
        }
    }
};

/**
 * 跨界石.js - v1.2 (配置分离版 - 全中文键名)
 * 多彩蜜蜡改的跨界石 + 黄金品级调整箱
 * 2026.1.28 By.南瓜
 * 2026.3.27 配置外部化改造
 */

module.exports = {
    // ==================== 配置文件路径 ====================
    configPath: '/plugins/frida/configs/多彩蜜蜡改跨界石.json',

    init() {
        const self = this;

        function getEquipmentType(itemId) {
            const itemData = CDataManager_find_item(G_CDataManager(), itemId);
            return itemData.isNull() ? 0 : itemData.add(141 * 4).readU32();
        }

        function cross_check(itemId) {
            if (self.CONFIG['跨界石排除配置']['禁止的装备 ID'].includes(itemId)) {
                return false;
            }
            
            const equipType = getEquipmentType(itemId);
            if (self.CONFIG['跨界石排除配置']['禁止的装备类型'].includes(equipType)) {
                return false;
            }
            
            return true;
        }

        function SendConsume(CUser, ItemSlot, num) {
            const packet_guard = api_PacketGuard_PacketGuard();
            InterfacePacketBuf_put_header(packet_guard, 1, 84);
            InterfacePacketBuf_put_byte(packet_guard, 1);
            InterfacePacketBuf_put_short(packet_guard, ItemSlot);
            InterfacePacketBuf_put_int(packet_guard, num);
            InterfacePacketBuf_put_short(packet_guard, 2);
            InterfacePacketBuf_finalize(packet_guard, 1);
            CUser_Send(CUser, packet_guard);
            Destroy_PacketGuard_PacketGuard(packet_guard);
        }

        // ==================== Hook ModItemAttr ====================
        const ARAD_Singleton_ServiceRestrictManager_Get = new NativeFunction(ptr(0x081625E6), 'pointer', [], { "abi": "sysv" });
        const ServiceRestrictManager_isRestricted = new NativeFunction(ptr(0x0816E6B8), 'pointer', ['int','pointer','int','int'], { "abi": "sysv" });
        const CSecu_ProtectionField_Check = new NativeFunction(ptr(0x08288A02), 'int', ['pointer','pointer','int'], { "abi": "sysv" });
        const MyDispatcher_ModItemAttr__SendResult = new NativeFunction(ptr(0x08201938), 'int', ['pointer', 'pointer', 'uint16','uint16','uint16'], { "abi": "sysv" });
        const Hook_Dispatcher_ModItemAttr_dispatch_sig = new NativeFunction(ptr(0x8200B08), 'int', ['pointer', 'pointer', 'pointer'], { abi: 'sysv' });

        Interceptor.replace(ptr(0x8200B08), new NativeCallback(function (a1, CUser, PacketBuf) {
            if (CUser_get_state(CUser) != 3 || !CUserCharacInfo_getCurCharacNo(CUser)) {
                return 0;
            }
            if (CUser_CheckInTrade(CUser) != 0) {
                return 0;
            }

            const OrPacketBuf = api_PacketBuf_get_buf(PacketBuf);
            const ItemSlot = OrPacketBuf.add(6).readU16();
            const EquSlot = OrPacketBuf.add(0).readU16();
            
            const inven = CUserCharacInfo_getCurCharacInvenW(CUser);
            const inven_item = CInventory_GetInvenRef(inven, 1, ItemSlot);
            const item_id = Inven_Item_getKey(inven_item);
            const inven_equ = CInventory_GetInvenRef(inven, 1, EquSlot);

            // ==================== 跨界石功能 ====================
            if (item_id == self.CONFIG['跨界石道具 ID']) {
                // 检查装备是否存在
                if (inven_equ.isNull()) {
                    CUser_SendCmdErrorPacket(CUser, 84, 4);
                    return 0;
                }
                
                // 检查装备是否锁定
                if (CUser_CheckItemLock(CUser, 1, EquSlot) != 0) {
                    CUser_SendCmdErrorPacket(CUser, 84, 213);
                    return 0;
                }

                // 检查账号仓库
                const AccountCargo = CUser_getAccountCargo(CUser);
                if (!CUser_IsExistAccountCargo(CUser)) {
                    api_send_msg(CUser, "没有开通账号仓库！", 1);
                    return 0;
                }
                
                const empty_slot = CAccountCargo_GetEmptySlot(AccountCargo);
                if (empty_slot == -1) {
                    CAccountCargo_SendItemList(AccountCargo);
                    api_send_msg(CUser, '跨界转移失败,账号金库没有空余位置。', 1);
                    return 0;
                }
                
                // 检查装备是否允许跨界
                if (!cross_check(Inven_Item_getKey(inven_equ))) {
                    api_send_msg(CUser, '跨界转移失败,该装备不支持跨界转移。', 1);
                    return 0;
                }
                
                // 执行跨界转移
                const tag = CAccountCargo_InsertItem(AccountCargo, inven_equ, empty_slot);
                if (tag >= 0) {
                    // 删除跨界石
                    if (CInventory_delete_item(inven, 1, ItemSlot, 1, 3, 1) != 1) {
                        CUser_SendCmdErrorPacket(CUser, 84, 22);
                        return 0;
                    }
                    
                    // 删除装备
                    CInventory_delete_item(inven, 1, EquSlot, 1, 7, 1);
                    
                    // 更新客户端
                    CAccountCargo_SendItemList(AccountCargo);
                    CUser_SendUpdateItemList(CUser, 1, 0, EquSlot);
                    
                    // 发送消耗通知
                    const ItemEqu = CInventory_GetInvenRef(inven, 1, ItemSlot);
                    const num = ItemEqu.add(7).readU32();
                    SendConsume(CUser, ItemSlot, num);
                    
                    return 0;
                }
                
                CUser_SendCmdErrorPacket(CUser, 84, 13);
                return 0;
            }
            
            // ==================== 黄金品级调整箱功能 ====================
            else if (item_id == self.CONFIG['黄金品级调整箱道具 ID']) {
                const manage = ARAD_Singleton_ServiceRestrictManager_Get();
                const isRestricted = ServiceRestrictManager_isRestricted(
                    manage.toInt32(), 
                    CUser, 
                    1, 
                    15
                );
                if (isRestricted != 0) {
                    CUser_SendCmdErrorPacket(CUser, 84, 209);
                    return 0;
                }
                
                const check = CSecu_ProtectionField_Check(
                    ptr(ptr(0x0941F7CC).readU32()), 
                    CUser, 
                    38
                );
                if (check != 0) {
                    CUser_SendCmdErrorPacket(CUser, 84, check);
                    return 0;
                }
                
                // 检查装备是否锁定
                if (CUser_CheckItemLock(CUser, 1, EquSlot) != 0) {
                    CUser_SendCmdErrorPacket(CUser, 84, 213);
                    return 0;
                }
                
                // 检查装备是否存在
                if (inven_equ.isNull()) {
                    CUser_SendCmdErrorPacket(CUser, 208, 8);
                    return 0;
                }
                
                // 删除黄金调整箱
                if (CInventory_delete_item(inven, 1, ItemSlot, 1, 3, 1) != 1) {
                    CUser_SendCmdErrorPacket(CUser, 84, 22);
                    return 0;
                }
                
                Inven_Item_set_add_info(inven_equ, 999999998);
                
                MyDispatcher_ModItemAttr__SendResult(a1, CUser, 2, ItemSlot, EquSlot);
                
                return 0;
            }
            else {
                return Hook_Dispatcher_ModItemAttr_dispatch_sig(a1, CUser, PacketBuf);
            }
            
        }, 'int', ['pointer', 'pointer', 'pointer']));
    }
};

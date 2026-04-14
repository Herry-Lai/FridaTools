/**
 * 装备镶嵌.js - v1.0
 * 功能:可以给装备打孔及镶嵌
 * 2026.1.28 By.南瓜
 */

module.exports = {

    // ==================== 配置文件路径 ====================
    fieldMapping: {
        "允许武器开孔": "ALLOW_WEAPON",
        "允许称号开孔": "ALLOW_TITLE"
    },

    configPath: '/plugins/frida/configs/装备镶嵌.json',

    init() {
        const self = this;

        function lengthCutting(str, ystr, num, maxLength) {
            var strArr = '';
            var length = str.length;
            while (str.length < maxLength) {
                str = '0'.concat(str)
            }
            for (var i = 0; i < str.length; i += num) {
                strArr = str.slice(i, i + num).concat(strArr)
            }
            return ystr + strArr;
        }

        function api_get_jewel_socket_data(mysql, id) {
            api_MySQL_exec(mysql, 'SELECT jewel_data FROM data where equ_id = ' + id + ';')
            var v = Memory.alloc(30);
            v.add(0).writeU8(0)
            if (MySQL_get_n_rows(mysql) == 1) {
                if (MySQL_fetch(mysql)) {
                    var buf = api_MySQL_get_binary(mysql, 0);
                    if (buf) v.writeByteArray(buf);
                }
            }
            return v;
        }

        function get_timestamp() {
            let date = new Date();
            date = new Date(date.setHours(date.getHours() + 0));
            let year = date.getFullYear().toString();
            let month = (date.getMonth() + 1).toString();
            let day = date.getDate().toString();
            let hour = date.getHours().toString();
            let minute = date.getMinutes().toString();
            let second = date.getSeconds().toString();
            let ms = date.getMilliseconds().toString();
            return year + '-' + month + '-' + day + ' ' + hour + ':' + minute + ':' + second;
        }

        function api_exitjeweldata(id) {
            api_MySQL_exec(mysql_frida, 'SELECT andonglishanbai_flag FROM data where equ_id = ' + id + ';')
            var exit = 0;
            if (MySQL_get_n_rows(mysql_frida) == 1) {
                if (MySQL_fetch(mysql_frida)) {
                    exit = api_MySQL_get_int(mysql_frida, 0);
                }
            }
            return exit;
        }

        function save_equiment_socket(socket_data, id) {
            if (api_MySQL_exec(mysql_frida, 'UPDATE data SET jewel_data = 0x' + socket_data + ' WHERE equ_id = ' + id + ';') == 1) {
                return 1;
            }
            return 0;
        }

        function api_set_JewelSocketData(jewelSocketData, slot, emblem_item_id) {
            if (!jewelSocketData.isNull()) {
                jewelSocketData.add(slot * 6 + 2).writeInt(emblem_item_id);
            }
        }

        // 生成开孔数据
        function add_equiment_socket(equipment_type) {
            var DB_JewelsocketData = '';
            switch (equipment_type) {
                case 10: case 11: case 20: case 21: DB_JewelsocketData = '100000000000000000000000000000000000000000000000000000000000'; break;
                case 12: case 14: DB_JewelsocketData = '040000000000040000000000000000000000000000000000000000000000'; break;
                case 13: case 17: DB_JewelsocketData = '020000000000020000000000000000000000000000000000000000000000'; break;
                case 15: case 18: DB_JewelsocketData = '080000000000080000000000000000000000000000000000000000000000'; break;
                case 16: case 19: DB_JewelsocketData = '010000000000010000000000000000000000000000000000000000000000'; break;
                default: DB_JewelsocketData = '000000000000000000000000000000000000000000000000000000000000'; break;
            }
            var date = get_timestamp();
            // 建表
            api_MySQL_exec(mysql_frida, "CREATE TABLE IF NOT EXISTS `data` (`equ_id` int(11) NOT NULL AUTO_INCREMENT, `andonglishanbai_flag` int(11) DEFAULT '0', `jewel_data` blob, `date` datetime DEFAULT NULL, PRIMARY KEY (`equ_id`)) ENGINE=InnoDB DEFAULT CHARSET=utf8;");
            
            if (api_MySQL_exec(mysql_frida, 'INSERT INTO data (andonglishanbai_flag,jewel_data,date) VALUES(1,0x' + DB_JewelsocketData + ',\'' + date + '\');') == 1) {
                api_MySQL_exec(mysql_frida, 'SELECT equ_id FROM data where date = \'' + date + '\';')
                if (MySQL_get_n_rows(mysql_frida) == 1) {
                    if (MySQL_fetch(mysql_frida)) {
                        return api_MySQL_get_int(mysql_frida, 0);
                    }
                }
            }
            return 0;
        }

        // 发送更新包
        function CUser_SendUpdateItemList_DB(CUser, Slot, DB_JewelSocketData) {
            var v10 = api_PacketGuard_PacketGuard();
            InterfacePacketBuf_put_header(v10, 0, 14);
            InterfacePacketBuf_put_byte(v10, 0);
            InterfacePacketBuf_put_short(v10, 1);
            var v4 = CUserCharacInfo_getCurCharacInvenW(CUser);
            CInventory_MakeItemPacket(v4, 1, Slot, v10);
            InterfacePacketBuf_put_binary(v10, DB_JewelSocketData, 30);
            InterfacePacketBuf_finalize(v10, 1);
            CUser_Send(CUser, v10);
            Destroy_PacketGuard_PacketGuard(v10);
        }

        // ==================== 称号回包 ====================
        Interceptor.replace(ptr(0x08641A6A), new NativeCallback(function(CTitleBook, PacketGuard, a3, Inven_Item) {
            var JewelSocketData = Memory.alloc(30);
            var ret = CTitleBook_putItemData(CTitleBook, PacketGuard, a3, Inven_Item);
            JewelSocketData = api_get_jewel_socket_data(mysql_frida, Inven_Item.add(25).readU32())
            if (JewelSocketData.add(0).readU8() != 0) {
                InterfacePacketBuf_put_binary(PacketGuard, JewelSocketData, 30);
                return ret;
            }
            return ret
        }, 'int', ['pointer', 'pointer', 'int', 'pointer']));

        // ==================== 继承 ====================
        Interceptor.replace(ptr(0x08671EB2), new NativeCallback(function(CUser, Inven_Item1, Inven_Item2) {
            var jewelSocketID = Inven_Item2.add(25).readU32()
            Inven_Item1.add(25).writeU32(jewelSocketID)
            // 直接调用全局函数
            return CUser_copyItemOption(CUser, Inven_Item1, Inven_Item2);
        }, 'int', ['pointer', 'pointer', 'pointer']));

        // ==================== 装备开孔 ====================
        Interceptor.replace(ptr(0x0821A412), new NativeCallback(function(Dispatcher_AddSocketToAvatar, CUser, PacketBuf) {
            var pack = Memory.alloc(0x20000)
            Memory.copy(pack, PacketBuf, 1000)
            var ret = 0;
            try {
                var equ_slot = api_PacketBuf_get_short(pack);
                var equitem_id = api_PacketBuf_get_int(pack);
                var sta_slot = api_PacketBuf_get_short(pack);
                var CurCharacInvenW = CUserCharacInfo_getCurCharacInvenW(CUser);
                var inven_item = CInventory_GetInvenRef(CurCharacInvenW, 1, equ_slot);

                // 时装逻辑
                if (equ_slot > 56) {
                    equ_slot = equ_slot - 57;
                    var C_PacketBuf = api_PacketBuf_get_buf(PacketBuf)
                    C_PacketBuf.add(0).writeShort(equ_slot)
                    return Dispatcher_AddSocket(Dispatcher_AddSocketToAvatar, CUser, PacketBuf);
                }

                var equ_id = inven_item.add(25).readU32()
                if (api_exitjeweldata(equ_id) == 1) {
                    CUser_SendCmdErrorPacket(CUser, 209, 19);
                    return 0;
                }

                var item = CDataManager_find_item(G_CDataManager(), equitem_id);
                var ItemType = CEquipItem_GetItemType(item);

                // ============== 武器/称号限制 ==============
                if (ItemType == 10 && !self.CONFIG.ALLOW_WEAPON) {
                    api_send_msg(CUser, '武器类型的装备暂不支持打孔。', 1);
                    CUser_SendCmdErrorPacket(CUser, 209, 0);
                    return 0;
                }
                else if (ItemType == 11 && !self.CONFIG.ALLOW_TITLE) {
                    api_send_msg(CUser, '称号类型的装备暂不支持打孔。', 1);
                    CUser_SendCmdErrorPacket(CUser, 209, 0);
                    return 0;
                }
                // ===============================================

                var id = add_equiment_socket(ItemType)
                log_info("开孔-生成的ID:" + id)
                CInventory_delete_item(CurCharacInvenW, 1, sta_slot, 1, 8, 1);
                inven_item.add(25).writeU32(id)
                CUser_SendUpdateItemList(CUser, 1, 0, equ_slot);
                var packet_guard = api_PacketGuard_PacketGuard();
                InterfacePacketBuf_put_header(packet_guard, 1, 209);
                InterfacePacketBuf_put_byte(packet_guard, 1);
                InterfacePacketBuf_put_short(packet_guard, equ_slot + 104);
                InterfacePacketBuf_put_short(packet_guard, sta_slot);
                InterfacePacketBuf_finalize(packet_guard, 1);
                CUser_Send(CUser, packet_guard);
                Destroy_PacketGuard_PacketGuard(packet_guard);
            } catch (error) {
                // console.log(error)
            }
            return 0;
        }, 'int', ['pointer', 'pointer', 'pointer']));

        // ==================== 镶嵌 ====================
        Interceptor.attach(ptr(0x8217BD6), {
            onEnter: function(args) {
                try {
                    var user = args[1];
                    var packet_buf = args[2];
                    
                    var pCopy = Memory.alloc(0x20000);
                    Memory.copy(pCopy, packet_buf, 1000);

                    var state = CUser_get_state(user);
                    if (state != 3) {
                        return;
                    }
                    var avartar_inven_slot = api_PacketBuf_get_short(pCopy);
                    var avartar_item_id = api_PacketBuf_get_int(pCopy);
                    var emblem_cnt = api_PacketBuf_get_byte(pCopy);

                    if (avartar_inven_slot > 104) {
                        var equipment_inven_slot = avartar_inven_slot - 104;
                        var inven = CUserCharacInfo_getCurCharacInvenW(user);
                        var equipment = CInventory_GetInvenRef(inven, 1, equipment_inven_slot);
                        if (Inven_Item_isEmpty(equipment) || (Inven_Item_getKey(equipment) != avartar_item_id) || CUser_CheckItemLock(user, 1, equipment_inven_slot)) {
                            return;
                        }

                        var id = equipment.add(25).readU32();
                        var JewelSocketData = Memory.alloc(30);
                        JewelSocketData = api_get_jewel_socket_data(mysql_frida, id)
                        if (JewelSocketData.isNull()) {
                            return;
                        }

                        if (emblem_cnt <= 3) {
                            var emblems = {};
                            for (var i = 0; i < emblem_cnt; i++) {
                                var emblem_inven_slot = api_PacketBuf_get_short(pCopy);
                                var emblem_item_id = api_PacketBuf_get_int(pCopy);
                                var equipment_socket_slot = api_PacketBuf_get_byte(pCopy);
                                var emblem = CInventory_GetInvenRef(inven, 1, emblem_inven_slot);
                                if (Inven_Item_isEmpty(emblem) || (Inven_Item_getKey(emblem) != emblem_item_id) || (equipment_socket_slot >= 3)) {
                                    return;
                                }

                                var citem = CDataManager_find_item(G_CDataManager(), emblem_item_id);
                                if (citem.isNull()) {
                                    return;
                                }

                                if (!CItem_is_stackable(citem) || (CStackableItem_GetItemType(citem) != 20)) {
                                    return;
                                }

                                var emblem_socket_type = CStackableItem_getJewelTargetSocket(citem);
                                var avartar_socket_type = JewelSocketData.add(equipment_socket_slot * 6).readU16();

                                if (!(emblem_socket_type & avartar_socket_type)) {
                                    return;
                                }

                                emblems[equipment_socket_slot] = [emblem_inven_slot, emblem_item_id];
                            }
                        }

                        for (var equipment_socket_slot in emblems) {
                            var emblem_inven_slot = emblems[equipment_socket_slot][0];
                            CInventory_delete_item(inven, 1, emblem_inven_slot, 1, 8, 1);
                            var emblem_item_id = emblems[equipment_socket_slot][1];
                            JewelSocketData.add(2 + 6 * equipment_socket_slot).writeU32(emblem_item_id)
                        }
                        var DB_JewelSocketData = '';
                        for (var i = 0; i <= 4; i++) {
                            DB_JewelSocketData = lengthCutting(JewelSocketData.add(i * 6).readU16().toString(16), DB_JewelSocketData, 2, 4)
                            DB_JewelSocketData = lengthCutting(JewelSocketData.add(2 + i * 6).readU32().toString(16), DB_JewelSocketData, 2, 8)
                        }
                        var a = save_equiment_socket(DB_JewelSocketData, id)
                        if (a == 0) {
                            return;
                        }
                        CUser_SendUpdateItemList_DB(user, equipment_inven_slot, JewelSocketData);
                        var packet_guard = api_PacketGuard_PacketGuard();
                        InterfacePacketBuf_put_header(packet_guard, 1, 209);
                        InterfacePacketBuf_put_byte(packet_guard, 1);
                        InterfacePacketBuf_put_short(packet_guard, equipment_inven_slot + 104);
                        InterfacePacketBuf_finalize(packet_guard, 1);
                        CUser_Send(user, packet_guard);
                        return;
                    }

                    // 时装镶嵌
                    var inven = CUserCharacInfo_getCurCharacInvenW(user);
                    var avartar = CInventory_GetInvenRef(inven, 2, avartar_inven_slot);

                    if (Inven_Item_isEmpty(avartar) || (Inven_Item_getKey(avartar) != avartar_item_id) || CUser_CheckItemLock(user, 2, avartar_inven_slot)) {
                        return;
                    }

                    var avartar_add_info = avartar.add(7).readInt();
                    var inven_avartar_mgr = CInventory_GetAvatarItemMgrR(inven);
                    var jewel_socket_data = WongWork_CAvatarItemMgr_getJewelSocketData(inven_avartar_mgr, avartar_add_info);

                    if (jewel_socket_data.isNull()) {
                        return;
                    }

                    if (emblem_cnt <= 3) {
                        var emblems = {};
                        for (var i = 0; i < emblem_cnt; i++) {
                            var emblem_inven_slot = api_PacketBuf_get_short(pCopy);
                            var emblem_item_id = api_PacketBuf_get_int(pCopy);
                            var avartar_socket_slot = api_PacketBuf_get_byte(pCopy);

                            var emblem = CInventory_GetInvenRef(inven, 1, emblem_inven_slot);
                            if (Inven_Item_isEmpty(emblem) || (Inven_Item_getKey(emblem) != emblem_item_id) || (avartar_socket_slot >= 3)) {
                                return;
                            }

                            var citem = CDataManager_find_item(G_CDataManager(), emblem_item_id);
                            if (citem.isNull()) {
                                return;
                            }
                            if (!CItem_is_stackable(citem) || (CStackableItem_GetItemType(citem) != 20)) {
                                return;
                            }

                            var emblem_socket_type = CStackableItem_getJewelTargetSocket(citem);
                            var avartar_socket_type = jewel_socket_data.add(avartar_socket_slot * 6).readShort();

                            if (!(emblem_socket_type & avartar_socket_type)) {
                                return;
                            }
                            emblems[avartar_socket_slot] = [emblem_inven_slot, emblem_item_id];
                        }

                        // 开始镶嵌
                        for (var avartar_socket_slot in emblems) {
                            var emblem_inven_slot = emblems[avartar_socket_slot][0];
                            CInventory_delete_item(inven, 1, emblem_inven_slot, 1, 8, 1);
                            var emblem_item_id = emblems[avartar_socket_slot][1];
                            api_set_JewelSocketData(jewel_socket_data, avartar_socket_slot, emblem_item_id); // 调用补全的函数
                        }

                        DB_UpdateAvatarJewelSlot_makeRequest(CUserCharacInfo_getCurCharacNo(user), avartar.add(7).readInt(), jewel_socket_data);
                        CUser_SendUpdateItemList(user, 1, 1, avartar_inven_slot);

                        var packet_guard = api_PacketGuard_PacketGuard();
                        InterfacePacketBuf_put_header(packet_guard, 1, 209);
                        InterfacePacketBuf_put_byte(packet_guard, 1);
                        InterfacePacketBuf_put_short(packet_guard, avartar_inven_slot);
                        InterfacePacketBuf_finalize(packet_guard, 1);
                        CUser_Send(user, packet_guard);
                    }

                } catch (error) {}
            },
            onLeave: function(retval) {
                retval.replace(0);
            }
        });

        // 装备发包
        Interceptor.replace(ptr(0x0815098e), new NativeCallback(function(PacketBuf, Inven_Item) {
            var ret = InterfacePacketBuf_put_packet(PacketBuf, Inven_Item);
            if (Inven_Item.add(1).readU8() == 1) {
                var JewelSocketData = Memory.alloc(30);
                JewelSocketData = api_get_jewel_socket_data(mysql_frida, Inven_Item.add(25).readU32())
                if (JewelSocketData.add(0).readU8() != 0) {
                    InterfacePacketBuf_put_binary(PacketBuf, JewelSocketData, 30);
                    return ret;
                }
            }
            return ret;
        }, 'int', ['pointer', 'pointer']));

        // 拍卖行 - 上架
        Interceptor.replace(ptr(0x084D7758), new NativeCallback(function(Inter_AuctionResultMyRegistedItems, CUser, src, a4) {
            var JewelSocketData = Memory.alloc(30)
            var count = src.add(5).readU8()
            for (var i = 0; i < count; i++) {
                var item_id = src.add(37 + 117 * i).readU32();
                var item = CDataManager_find_item(G_CDataManager(), item_id);
                var item_groupname = CItem_getItemGroupName(item)
                if (item_groupname > 0 && item_groupname < 59) {
                    JewelSocketData = api_get_jewel_socket_data(mysql_frida, src.add(59 + i * 117).readU32())
                    Memory.copy(src.add(89 + i * 117), JewelSocketData, 30);
                }
            }
            var ret = Inter_AuctionResultMyRegistedItems_dispatch_sig(Inter_AuctionResultMyRegistedItems, CUser, src, a4)
            return ret;
        }, 'int', ['pointer', 'pointer', 'pointer', 'int']));

        // 拍卖行 - 搜索
        Interceptor.replace(ptr(0x084D75BC), new NativeCallback(function(Inter_AuctionResultMyRegistedItems, CUser, src, a4) {
            var JewelSocketData = Memory.alloc(30)
            var count = src.add(5).readU8()
            for (var i = 0; i < count; i++) {
                var item_id = src.add(54 + 137 * i).readU32();
                var item = CDataManager_find_item(G_CDataManager(), item_id);
                var item_groupname = CItem_getItemGroupName(item)
                if (item_groupname > 0 && item_groupname < 59) {
                    JewelSocketData = api_get_jewel_socket_data(mysql_frida, src.add(76 + i * 137).readU32())
                    Memory.copy(src.add(106 + i * 137), JewelSocketData, 30);
                }
            }
            var ret = Inter_AuctionResultItemList(Inter_AuctionResultMyRegistedItems, CUser, src, a4)
            return ret;
        }, 'int', ['pointer', 'pointer', 'pointer', 'int']));

        // 拍卖行 - 竞拍
        Interceptor.replace(ptr(0x084D78F4), new NativeCallback(function(Inter_AuctionResultMyRegistedItems, CUser, src, a4) {
            var JewelSocketData = Memory.alloc(30)
            var count = src.add(5).readU8()
            for (var i = 0; i < count; i++) {
                var item_id = src.add(46 + 125 * i).readU32();
                var item = CDataManager_find_item(G_CDataManager(), item_id);
                var item_groupname = CItem_getItemGroupName(item)
                if (item_groupname > 0 && item_groupname < 59) {
                    JewelSocketData = api_get_jewel_socket_data(mysql_frida, src.add(68 + i * 125).readU32())
                    Memory.copy(src.add(98 + i * 125), JewelSocketData, 30);
                }
            }
            var ret = Inter_AuctionResultMyBidding(Inter_AuctionResultMyRegistedItems, CUser, src, a4)
            return ret;
        }, 'int', ['pointer', 'pointer', 'pointer', 'int']));

        Interceptor.replace(ptr(0x0814A62E), new NativeCallback(function(Inven_Item, CInven_Item) {
            Memory.copy(Inven_Item, CInven_Item, 61)
            return Inven_Item;
        }, 'pointer', ['pointer', 'pointer']));

        Interceptor.replace(ptr(0x080CB7D8), new NativeCallback(function(Inven_Item) {
            var MReset = Memory.alloc(61)
            Memory.copy(Inven_Item, MReset, 61)
            return Inven_Item;
        }, 'pointer', ['pointer']));

        // ==================== 装备掉落全字节保存 ====================
        Memory.patchCode(ptr(0x085A6563), 72, function (code) {
            var cw = new X86Writer(code, { pc: ptr(0x085A6563)});
            cw.putLeaRegRegOffset('eax','ebp',-392);      // lea eax, [ebp-188h]
            cw.putLeaRegRegOffset('ebx','ebp',-213);      // lea ebx, [ebp-0D5h]
            cw.putMovRegOffsetPtrU32('esp',8,61);         // mov [esp+8], 61
            cw.putMovRegOffsetPtrReg('esp',4,'eax');      // mov [esp+4], eax
            cw.putMovRegOffsetPtrReg('esp',0,'ebx');      // mov [esp], ebx
            cw.putCallAddress(ptr(0x0807d880));           // call memcpy
            
            cw.putLeaRegRegOffset('eax','ebp',-392);      // lea eax, [ebp-188h]
            cw.putLeaRegRegOffset('ebx','ebp',-300);      // lea ebx, [ebp-12Ch]
            cw.putAddRegImm('ebx',0x10);                  // add ebx, 0x10
            cw.putMovRegOffsetPtrU32('esp',8,61);         // mov [esp+8], 61
            cw.putMovRegOffsetPtrReg('esp',4,'eax');      // mov [esp+4], eax
            cw.putMovRegOffsetPtrReg('esp',0,'ebx');      // mov [esp], ebx
            cw.putCallAddress(ptr(0x0807d880));           // call memcpy
            
            cw.putNop();
            cw.putNop();
            cw.putNop();
            cw.putNop();
            cw.putNop();
            cw.flush();
        });
    }
};

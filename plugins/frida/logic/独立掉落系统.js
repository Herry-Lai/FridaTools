/**
 * 独立掉落系统.js - v1.0
 * 功能：每个人独立计算掉落，各自捡各自的
 * 作者:挺迷的
 */

module.exports = {
    init() {
        this.setIndepentDrop();
    },

    setIndepentDrop() {
        var self = this;

        /**
         * CBattle_Field_MakeDropItems
         * Hook: 替换原本的掉落计算逻辑，改为循环每个人单独计算
         */
        Interceptor.replace(CBattle_Field_MakeDropItems, new NativeCallback(
            function (battle_field, map_item_list, map_info, map_monster, killer_index, 
                     party_size, money_ratio, base_drop_rate, is_last_abyss_apc, 
                     apc_boss_named_flags, quick_party_reward_param, growth_premium_rate) {
                
                var party = battle_field.readPointer();
                var map_monster_param = this.context.ebp.add(0x10).readPointer(); 
                var monster_uid = this.context.ebp.add(0x18).readPointer().readU16();

                for (var i = 0; i < 4; i++) {
                    if (CParty_checkValidUser(party, i).toInt32()) {
                        var user = CParty_get_user(party, i);
                        var user_item_list = Memory.alloc(8); 
                        mapinfo_item_list_init(user_item_list);
                        
                        try {
                            CBattle_Field_MakeDropItems(
                                battle_field, 
                                user_item_list, 
                                map_info, 
                                map_monster, 
                                i + 1,
                                1,
                                money_ratio, 
                                base_drop_rate, 
                                is_last_abyss_apc, 
                                apc_boss_named_flags, 
                                quick_party_reward_param, 
                                growth_premium_rate
                            );
                            
                            self.copyMapinfoItems(map_item_list, user_item_list);
                            
                            var packet_guard = api_PacketGuard_PacketGuard();
                            CBattle_Field_MakeNotiPacketDieMonster(
                                battle_field, 
                                packet_guard, 
                                user_item_list, 
                                monster_uid, 
                                i + 1, 
                                map_monster, 
                                map_monster_param
                            );
                            
                            CUser_Send(user, packet_guard);
                            Destroy_PacketGuard_PacketGuard(packet_guard);
                            
                        } finally {
                            mapinfo_item_list_free(user_item_list);
                        }
                    }
                }
                return;
            }, 
            'void', ['pointer', 'pointer', 'pointer', 'pointer', 'int', 'int', 'int', 'int', 'int', 'pointer', 'float', 'int'])
        );

        // 跳过原本的怪物死亡掉落包构造
        Interceptor.replace(CBattle_Field_MakeNotiPacketDieMonster, new NativeCallback(function (a1, a2, a3, a4, a5, a6, a7) {
                if (this.returnAddress == 0x830ce08) {				
                    var v109 = this.context.ebp.sub(0x90).readPointer();
                    var v106 = this.context.ebp.sub(0x96);
                    if(v109.add(44).readU32() == 100 && v106.readU8() != 1 && a1.add(109 * 4).readU32() != 1)
                        return;
                }			
                CBattle_Field_MakeNotiPacketDieMonster(a1, a2, a3, a4, a5, a6, a7);
            }, 'void', ['pointer', 'pointer', 'pointer', 'int', 'int', 'pointer', 'pointer']));

        // 跳过原本的怪物死亡掉落包队伍发包
        Interceptor.replace(CParty_send_to_party, new NativeCallback(function (cparty, a2) {
                if (this.returnAddress == 0x85a39db && InterfacePacketBuf_get_len(a2) == 0) {
                    return 0;
                }
                return CParty_send_to_party(cparty, a2);
            }, 'int', ['pointer', 'pointer']));

        // DisPatcher_GetItem::check_error 校验用户是否非法捡取物品
        Interceptor.attach(ptr(0x081C35AC), {
            onEnter: function (args) {
                var user = this.context.ebp.add(0xc).readPointer();
                var msg_base = this.context.ebp.add(0x10).readPointer();
                var drop_id = msg_base.add(13).readU16();
                
                this.user = user;
                this.drop_id = drop_id;		
            },
            onLeave: function (retval) {			
                var result = self.validatePickupPermission(this.user, this.drop_id);
                retval.replace(result);
            }
        });	
        
        // 跳过物品掷点
        Interceptor.attach(ptr(0x0850D756), {
            onEnter: function (args) {},
            onLeave: function (retval) {
                retval.replace(0);
            }
        });

        // SS免确认
        Memory.patchCode(ptr(0x085A56CE).add(2), 1, function (code) {
            var cw = new X86Writer(code, { pc: ptr(0x085A56CE).add(2) });
            cw.putU8(9);
            cw.flush();
        });
        // SS免确认
        Interceptor.attach(ptr(0x08150f18), {
            onLeave: function (retval) {
                retval.replace(0);
            }
        });
        
        // 取消队友分金币
        Interceptor.attach(ptr(0x0859A918), {
            onEnter: function (args) {},
            onLeave: function (retval) {
                retval.replace(1); 
            }
        });
        
        // 硬编码补丁：Mov EAX, 0
        Memory.patchCode(ptr(0x085A41D1), 6, function (code) {
            var cw = new X86Writer(code, { pc: ptr(0x085A41D1) });
            cw.putBytes([
                0xB8, 0x00, 0x00, 0x00, 0x00,
                0x90
            ]);
            cw.flush();
        });

        // 建筑掉落处理
        Memory.protect(ptr(0x08302F6D), 1, 'rwx');
        Memory.patchCode(ptr(0x08302F6D), 1, function (code) {
            code.writeByteArray([0x00]);
        });
    },

    /**
     * 复制地图掉落物品列表
     */
    copyMapinfoItems(list_dest, list_src) {
        var it = Memory.alloc(4);
        var end = Memory.alloc(4);
        var next = Memory.alloc(4);
        
        mapinfo_item_list_begin(it, list_src);
        mapinfo_item_list_end(end, list_src);
        
        while (mapinfo_item_list_not_equal(it, end)) {
            var map_item = mapinfo_item_list_get(it);
            mapinfo_item_list_push(list_dest, map_item);
            mapinfo_item_list_next(next, it);
        }
    },

    /**
     * 验证用户是否可以捡取该物品
     */
    validatePickupPermission(user, drop_id) {  
        if (!user || user.isNull() || drop_id === undefined || drop_id === null) {
            return 1;
        }
        
        var party = CUser_GetParty(user);
        var battle_field = party.add(2852);
        var fit = Memory.alloc(4);
        
        var currentMapInfo = CBattle_Field_getCurrentMapInfo(battle_field);
        var drop_id_ptr = Memory.alloc(4);
        drop_id_ptr.writeInt(drop_id);
        
        mapinfo_item_map_find(fit, currentMapInfo.add(36), drop_id_ptr);
        var find_map_item = mapinfo_item_map_get(fit).add(4);
        
        if (find_map_item.isNull()) {
            log_error("[Security] 找不到掉落物品: {}", drop_id);
            return 1;
        }
        
        var find_map_item_index = find_map_item.readU8();
        if(!find_map_item_index) return 0;
        
        var find_map_item_partyIndex = find_map_item.add(8).readU32();
        
        if(find_map_item_partyIndex < 1 || find_map_item_partyIndex > 4) return 0;
        
        var cur_partyIndex = -1;
        for (var i = 0; i < 4; i++) {
            var party_user = CParty_get_user(party, i);
            if (CParty_checkValidUser(party, i).toInt32() && party_user.equals(user)) {        
                cur_partyIndex = i + 1;
                break;
            }
        }
        
        if(cur_partyIndex == find_map_item_partyIndex) return 0;
        return 1;
    },

    /**
     * 创建并添加自定义掉落物品到地图掉落中
     */
    addItemToMapinfo(battle_field, item_id, item_cnt, killer_index, map_item_list) {
        var citem = CDataManager_find_item(G_CDataManager(), item_id);
        var type = citem.add(84).readU8();
        
        var inven_item = Memory.alloc(61);
        Inven_Item(inven_item); 
        
        inven_item.add(2).writeU32(item_id);
        inven_item.add(7).writeU32(item_cnt);
        
        if (type == 0)
            CEquipItem_make_item(citem, inven_item); 
        else
            CStackableItem_make_item(citem, inven_item); 
            
        var currentMapInfo = CBattle_Field_getCurrentMapInfo(battle_field);
        var drop_id = currentMapInfo.add(64).readInt();
        currentMapInfo.add(64).writeInt(drop_id + 1);
        
        var map_item = Memory.alloc(84);
        Map_Item_ctor(map_item); 
        
        map_item.writeU8(1);
        map_item.add(4).writeU32(drop_id); 
        map_item.add(8).writeU32(killer_index); 
        
        var inven_data = inven_item.readByteArray(61); 
        map_item.add(16).writeByteArray(Array.from(new Uint8Array(inven_data)));
        
        var size = mapinfo_item_list_size(map_item_list);
        map_item.add(80).writeU32(0);
        
        mapinfo_item_list_push(map_item_list, map_item);
        this.mapinfoItemInsert(currentMapInfo, map_item); 
    },

    /**
     * 调用原生函数将地图物品添加到地图中
     */
    mapinfoItemInsert(mapinfo, map_item) {
        var argTypes = ['pointer'];
        for (var i = 0; i < 21; i++) argTypes.push('int');
        
        var MapInfo_Add_Item = new NativeFunction(ptr(0x081517E0), 'pointer', argTypes, "sysv");
        var args = [mapinfo];
        
        for (var i = 0; i < 84; i += 4) {
            args.push(map_item.add(i).readS32());
        }
        MapInfo_Add_Item.apply(null, args);
    },

    /**
     * 遍历单个怪物的掉落物品列表
     */
    mapinfoItemListForeach(map_item_list) {
        var it = Memory.alloc(4);
        var end = Memory.alloc(4);
        var next = Memory.alloc(4);
        mapinfo_item_list_begin(it, map_item_list);
        mapinfo_item_list_end(end, map_item_list);

        while (mapinfo_item_list_not_equal(it, end)) {
            var map_item = mapinfo_item_list_get(it);
            var item_drop_id = map_item.add(4).readInt();
            var item_id = map_item.add(18).readU32();
            var item_upgrad_level = map_item.add(22).readU8();
            var item_cnt = map_item.add(23).readU32();
            var item_durability = map_item.add(27).readU16();
            var item_card_id = map_item.add(29).readU32();
            var item_amplifyType = map_item.add(33).readU8();
            var item_amplifyValue = map_item.add(34).readU16();
            mapinfo_item_list_next(next, it);
        }
    },

    /**
     * 遍历当前map的所有掉落
     */
    mapinfoItemForeach(battle_field) {
        var it = Memory.alloc(4);
        var end = Memory.alloc(4);
        var next = Memory.alloc(4);
        var currentMapInfo = CBattle_Field_getCurrentMapInfo(battle_field);
        mapinfo_item_map_begin(it, currentMapInfo.add(36));
        mapinfo_item_map_end(end, currentMapInfo.add(36));

        while (mapinfo_item_map_not_equal(it, end)) {
            var map_item = mapinfo_item_map_get(it).add(4);
            var item_drop_id = map_item.add(4).readInt();
            var item_id = map_item.add(18).readU32();
            var item_upgrad_level = map_item.add(22).readU8();
            var item_cnt = map_item.add(23).readU32();
            var item_durability = map_item.add(27).readU16();
            var item_card_id = map_item.add(29).readU32();
            var item_amplifyType = map_item.add(33).readU8();
            var item_amplifyValue = map_item.add(34).readU16();
            mapinfo_item_map_next(next, it);
        }
    }
};

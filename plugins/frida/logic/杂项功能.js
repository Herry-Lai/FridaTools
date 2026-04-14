/**
 * 杂项功能.js - v1.7 (配置分离版 - 嵌套结构)
 * 包含：TP 点不发放、登录事件、删除角色无视创建时间、装备解锁时间控制、解除创建角色限制、14 格摆摊、14 键技能、超过 10 个邮件自动分批发、
 *      关闭回购、取消成长契约、无视副本摆摊限制、修复 6 点关摊、防卡商店道具、防卡人偶卡药剂 (进图刷新背包)、
 *      自定义每日交易金币限制、修复绝望之塔每 10 层进不去副本、绝望之塔通关后继续用门票调整与金币修复、
 *      强制神秘商店 NPC 固定为大妈、史诗免确认、龙袍变装
 * 2026.1.30 By.南瓜
 * 2026.3.25 配置外部化改造
 * 2026.3.27 适配嵌套 JSON 结构
 */

module.exports = {
    /** 
     * 中文键名映射（框架自动使用）
     * 注意：主框架会递归转换所有中文键名为英文
     */
    fieldMapping: {
        "可动态调整": "dynamicConfig",
        "需重启服务器": "restartRequired",
        
        "防卡商店道具": "ENABLE_FIX_SHOP_STUCK",
        "关闭NPC商店回购": "ENABLE_DISABLE_REDEEM_ITEM",
        "龙袍变装功能": "ENABLE_AVATAR_CHANGE",
        "解除删除角色24小时限制": "ENABLE_FAST_DELETE",
        "跨公会聊天高级信息": "ENABLE_CROSS_GUILD_CHAT",
        "解除每日创建角色数量限制": "ENABLE_UNLIMIT_CHAR_CREATE",
        "邮件物品超过10个自动分批发送": "ENABLE_AUTO_SPLIT_MAIL",
        "忽略在副本门口禁止摆摊": "ENABLE_IGNORE_RESTRICT_STALL_AT_DUNGEON",
        "防卡人偶卡药剂(进图刷新背包)": "ENABLE_REFRESH_SLOT_ON_ENTER_DUNGEON",
        "修复绝望之塔每10层进不去副本": "ENABLE_FIX_TOWER_OF_DESPAIR",
        "修复绝望之塔金币异常": "ENABLE_TOWER_GOLD_FIX",
        "强制神秘商店NPC为大妈": "ENABLE_FIX_MYSTERY_SHOP",
        "赛利亚房间互相可见": "ENABLE_SERIA_ROOM_VISIBILITY",
        "开启黑暗武士技能修复": "ENABLE_DS_SWORDMAN_SKILL",
        "装备解锁时间修改开关": "ENABLE_EQUIP_UNLOCK",
        "自定义解锁时间": "UNLOCK_SECONDS",
        "开启自定义每日交易金币限制": "ENABLE_CUSTOM_TRADE_GOLD_LIMIT",
        "每日交易金币上限": "TRADE_GOLD_LIMIT",
        "是否开启最大等级": "ENABLE_CUSTOM_MAX_LEVEL",
        "设置最大等级": "MAX_LEVEL",
        
        "14格摆摊": "ENABLE_14_SLOT_STORE",
        "14键技能": "ENABLE_14_SKILL_KEYS",
        "禁止TP发放": "ENABLE_BAN_TP",
        "史诗免确认": "ENABLE_CANCEL_EPIC_CONFIRM",
        "开启练习模式": "ENABLE_FIX_PRACTICEMODE",
        "开启缔造者创建": "ENABLE_CREATE_CREATOR",
        "取消新账号送成长契约": "ENABLE_DISABLE_GROWTH_CONTRACT",
        "解决每日6点摆摊会自动关闭": "ENABLE_FIX_STALL_AUTO_CLOSE",
        "绝望之塔通关后使用门票继续挑战": "ENABLE_TOWER_TICKET_PATCH"
    },

    // ==================== 配置文件路径 ====================
    configPath: '/plugins/frida/configs/杂项功能.json',

    _patched: false,

    init() {
        const self = this;
        const cfg = self.CONFIG;
        
        // 从分组中读取配置
        const dynamicCfg = cfg.dynamicConfig || {};
        const restartCfg = cfg.restartRequired || {};
        
        // 合并所有配置到 cfg，方便后续访问
        Object.assign(cfg, dynamicCfg, restartCfg);

        // ==================== 配对数组自动解析 ====================
        // 装备解锁时间 [enable, seconds]
        if (Array.isArray(cfg.ENABLE_EQUIP_UNLOCK)) {
            const [enable, seconds] = cfg.ENABLE_EQUIP_UNLOCK;
            cfg.ENABLE_EQUIP_UNLOCK = enable;
            cfg.UNLOCK_SECONDS = seconds;
        }
        // 自定义交易金币限制 [enable, limit]
        if (Array.isArray(cfg.ENABLE_CUSTOM_TRADE_GOLD_LIMIT)) {
            const [enable, limit] = cfg.ENABLE_CUSTOM_TRADE_GOLD_LIMIT;
            cfg.ENABLE_CUSTOM_TRADE_GOLD_LIMIT = enable;
            cfg.TRADE_GOLD_LIMIT = limit;
        }
        // 最大等级 [enable, lv]
        if (Array.isArray(cfg.ENABLE_CUSTOM_MAX_LEVEL)) {
            const [enable, lv] = cfg.ENABLE_CUSTOM_MAX_LEVEL;
            cfg.ENABLE_CUSTOM_MAX_LEVEL = enable;
            cfg.MAX_LEVEL = lv;
        }
        // ==================== 功能初始化 ====================
        if (cfg.ENABLE_BAN_TP && !this._patched) {
            this.applyTPPatches();
            this._patched = true;
        }
        if (cfg.ENABLE_FAST_DELETE) this.setupFastDeleteHook();
        if (cfg.ENABLE_EQUIP_UNLOCK) this.setupEquipUnlock(cfg.UNLOCK_SECONDS);
        if (cfg.ENABLE_UNLIMIT_CHAR_CREATE) this.setupUnlimitCharCreate();
        if (cfg.ENABLE_14_SLOT_STORE) this.setup14SlotStore();
        if (cfg.ENABLE_14_SKILL_KEYS) this.setup14SkillKeys();
        if (cfg.ENABLE_AUTO_SPLIT_MAIL) this.setupAutoSplitMail();
        if (cfg.ENABLE_DISABLE_REDEEM_ITEM) this.setupDisableRedeemItem();
        if (cfg.ENABLE_DISABLE_GROWTH_CONTRACT) this.setupDisableGrowthContract();
        if (cfg.ENABLE_IGNORE_RESTRICT_STALL_AT_DUNGEON) this.setupIgnoreRestrictStallAtDungeon();
        if (cfg.ENABLE_FIX_STALL_AUTO_CLOSE) this.setupFixStallAutoClose();
        if (cfg.ENABLE_FIX_SHOP_STUCK) this.setupFixShopStuck();
        if (cfg.ENABLE_REFRESH_SLOT_ON_ENTER_DUNGEON) this.setupRefreshSlotOnEnterDungeon();
        if (cfg.ENABLE_CUSTOM_TRADE_GOLD_LIMIT) this.setupCustomTradeGoldLimit();
        if (cfg.ENABLE_FIX_TOWER_OF_DESPAIR) this.setupFixTowerOfDespair();
        if (cfg.ENABLE_TOWER_TICKET_PATCH) this.setupTowerTicketPatch();
        if (cfg.ENABLE_TOWER_GOLD_FIX) this.setupTowerGoldFix();
        if (cfg.ENABLE_FIX_MYSTERY_SHOP) this.setupFixMysteryShop();
        if (cfg.ENABLE_CROSS_GUILD_CHAT) this.setupCrossGuildChat();
        if (cfg.ENABLE_SERIA_ROOM_VISIBILITY) this.setupSeriaRoomVisibility();
        if (cfg.ENABLE_CANCEL_EPIC_CONFIRM) this.setupCancelEpicConfirm();
        if (cfg.ENABLE_CUSTOM_MAX_LEVEL) this.setupCustomMaxLevel(cfg.MAX_LEVEL);
        if (cfg.ENABLE_DS_SWORDMAN_SKILL) this.HookDsSwordman_SkillSlot();
        if (cfg.ENABLE_CREATE_CREATOR) this.setup_createCreator();
        if (cfg.ENABLE_FIX_PRACTICEMODE) this.setup_FixPracticemode();
        if (cfg.ENABLE_AVATAR_CHANGE) this.setupAvatarChange();
    },

    // ==================== 功能实现区域 ====================

    // 解除每日创建角色数量
    setupUnlimitCharCreate() {
        Interceptor.attach(ptr(0x080E236C), {
            onLeave: function (retval) {
                const caller = this.returnAddress;
                if (caller.equals(ptr(0x08401601)) || caller.equals(ptr(0x08401A32))) {
                    const rows = retval.toInt32();
                    if (rows > 0) {
                        retval.replace(0);
                    }
                }
            }
        });
    },

    // 装备解锁时间修改
    setupEquipUnlock(second) {
        const CUser_OnItemUnlockWaitTimeout = new NativeFunction(ptr(0x8646912), "int", ["pointer"], { abi: "sysv" });

        Interceptor.attach(ptr(0x85432CC), {
            onLeave: function (retval) {
                const time = retval.add(4).readU32() - 259200 + second;
                retval.add(4).writeU32(time);
            }
        });

        Interceptor.attach(ptr(0x854231A), {
            onEnter: function (args) { this.user = args[1]; },
            onLeave: function (retval) {
                if (second > 0) {
                    api_scheduleOnMainThread_delay(CUser_OnItemUnlockWaitTimeout, [this.user], 1000 * second);
                } else {
                    CUser_OnItemUnlockWaitTimeout(this.user);
                }
            }
        });
    },

    // 14 格摆摊
    setup14SlotStore() {
        Memory.protect(ptr(0x085C6EB8), 4, 'rwx');
        ptr(0x085C6EB8).writeByteArray([0x66, 0x83, 0xF8, 0x0E]);
    },

    // 14 键技能
    setup14SkillKeys() {
        const patches = [
            { addr: 0x08608D7B, data: [0x83, 0xF8, 0x0B] },
            { addr: 0x08604B1E, data: [0x83, 0x7D, 0xEC, 0x07] },
            { addr: 0x08604B8C, data: [0xC7, 0x45, 0xE4, 0x08, 0x00, 0x00, 0x00] },
            { addr: 0x08604A09, data: [0x83, 0x7D, 0x0C, 0x07] },
            { addr: 0x086050b1, data: [0xC7, 0x45, 0xEC, 0x08, 0x00, 0x00, 0x00] },
            { addr: 0x0860511c, data: [0xC7, 0x45, 0xE8, 0x08, 0x00, 0x00, 0x00] }
        ];
        patches.forEach(p => {
            Memory.protect(ptr(p.addr), p.data.length, 'rwx');
            ptr(p.addr).writeByteArray(p.data);
        });
    },

    // 邮件自动分批发送
    setupAutoSplitMail() {
        const _origSend = new NativeFunction(ptr(0x8556B68), 'int', ['pointer', 'pointer', 'int', 'int', 'int', 'pointer', 'int', 'int', 'int', 'int'], { abi: 'sysv' });
        Interceptor.replace(ptr(0x8556B68), new NativeCallback(function(src, a2, a3, a4, a5, a6, a7, a8, a9, a10) {
            if (a3 <= 10) {
                return _origSend(src, a2, a3, a4, a5, a6, a7, a8, a9, a10);
            } else {
                var Pack = Memory.alloc(0x1000);
                var c = a3 - 10;
                _origSend(src, a2, 10, a4, a5, a6, a7, a8, a9, a10);
                for (var i = 0; i < c; i++) {
                    Memory.copy(Pack.add(61 * i), a2.add(61 * (i + 10)), 61);
                }
                return _origSend(src, Pack, c, a4, a5, a6, a7, a8, a9, a10);
            }
        }, 'int', ['pointer', 'pointer', 'int', 'int', 'int', 'pointer', 'int', 'int', 'int', 'int']));
    },

    // 禁止 TP 发放补丁
    applyTPPatches() {
        const patches = [
            { addr: 0x0867AB3C, data: [0x78] },
            { addr: 0x08608A41, data: [0x78] },
            { addr: 0x0860A5EC, data: [0x78] },
            { addr: 0x0866A4A8, data: [0x78] },
            { addr: 0x0866AAD2, data: [0xC3, 0x90] },
            { addr: 0x086035A4, data: [0x90, 0x90, 0x90] },
            { addr: 0x086035B7, data: [0x90, 0x90, 0x90] },
            { addr: 0x0867ABC7, data: [0x31, 0xC0, 0x90] },
            { addr: 0x08662D51, data: [0x78] }
        ];

        patches.forEach(p => {
            const pAddr = ptr(p.addr);
            Memory.protect(pAddr, p.data.length, 'rwx');
            pAddr.writeByteArray(p.data);
        });
    },

    // 快速删除角色
    setupFastDeleteHook() {
        Interceptor.attach(ptr(0x0864A830), {
            onLeave: function(retval) { retval.replace(1); }
        });
    },

    /**
     * 关闭 NPC 商店回购
     */
    setupDisableRedeemItem() {
        Interceptor.attach(ptr(0x085F7BE0), {
            onEnter: function (args) {},
            onLeave: function (retval) {
                retval.replace(1);
            }
        });
    },

    /**
     * 取消新账号送成长契约
     */
    setupDisableGrowthContract() {
        const Defptr = ptr(0x08161384);
        const value = Defptr.readU8()
        if (value != 0x0F) {
            Memory.protect(Defptr, 10, 'rwx');
            Defptr.writeShort(0x840F);
        }
        const Inter_DispatchPr = ptr(0x0816132A);
        const Inter_Dispatch = new NativeFunction(Inter_DispatchPr, 'int', ['pointer', 'pointer', 'pointer'], { "abi": "sysv" });
        
        Interceptor.replace(Inter_DispatchPr, new NativeCallback(function(InterSelectMobileAuthReward, CUser, a3) {
            const Inter_DispatchOpen = false; // 关闭开关
            if (Inter_DispatchOpen) {
                a3.add(4).writeInt(0);
                return Inter_Dispatch(InterSelectMobileAuthReward, CUser, a3); 
            }
            return 0;
        }, 'int', ['pointer', 'pointer', 'pointer']));
    },

    /**
     * 忽略在副本门口禁止摆摊
     */
    setupIgnoreRestrictStallAtDungeon() {
        Interceptor.attach(ptr(0x085c5082), {
            onEnter: function(args) {},
            onLeave: function(retval){
                retval.replace(1);
            }
        });
    },

    /**
     * 解决每日 6 点摆摊会自动关闭
     */
    setupFixStallAutoClose() {
        Memory.patchCode(ptr(0x0867DC05), 2, function (code) {
            const cw = new X86Writer(code, { pc: ptr(0x0867DC05) });
            cw.putU8(0x90);
            cw.putU8(0x90);
            cw.flush();
        });
    },

    /**
     * 防卡商店道具
     */
    setupFixShopStuck() {
        Interceptor.attach(ptr(0x081BE658), {
            onEnter: function (args) {
                this.BuyItemParam = args[3];
            },
            onLeave: function (retval) {
                if(this.BuyItemParam.add(156).readInt() < 0) {
                    return 10;
                }
            }
        });
    },

    /**
     * 防卡人偶卡药剂 (进图刷新背包)
     */
    setupRefreshSlotOnEnterDungeon() {
        Interceptor.attach(ptr(0x085B170A), {
            onEnter: function(args) {
                const party = args[0];
                for (var i = 0; i < 4; i++) {
                    const user = CParty_get_user(party, i);
                    if (!user.isNull()) {
                        const inven = CUserCharacInfo_getCurCharacInvenW(user);
                        for (var i = 3; i <= 8; i++) {
                            var item = CInventory_GetInvenRef(inven, 1, i);
                            if (Inven_Item_isEquipableItemType(item)) {
                                continue;
                            }
                            api_scheduleOnMainThread_delay(CUser_SendUpdateItemList, [user, 1, 0, i], 1);
                        }
                        for (var j = 57; j <= 104; j++) {
                            api_scheduleOnMainThread_delay(CUser_SendUpdateItemList, [user, 1, 0, j], 1);
                        }
                    }
                }
            }
        });
    },

    /**
     * 自定义每日交易金币限制
     */
    setupCustomTradeGoldLimit() {
        const limit = this.CONFIG.TRADE_GOLD_LIMIT;
        
        Interceptor.attach(ptr(0x08646496), {
            onEnter: function(args) {
                this.user = args[0];
                this.TradeGold = args[1].toInt32();
            },
            onLeave: function(retval) {
                const TradeGoldDaily = CUserCharacInfo_getCurCharacTradeGoldDaily(this.user);
                if (TradeGoldDaily + this.TradeGold <= limit) {
                    retval.replace(1);
                } else {
                    retval.replace(0);				
                }
            }
        });
    },

    /**
     * 修复绝望之塔每 10 层进不去副本
     */
    setupFixTowerOfDespair() {
        const Set_APC_Info_Func = new NativeFunction(ptr(0x085FED2E), 'void', ['pointer', 'pointer', 'pointer'], { abi: 'sysv' });

        Interceptor.attach(ptr(0x08644338), {
            onEnter: function(args) {
                const this_ptr = args[0];
                const tod_layer = args[1];
                const apc_mgr = this_ptr.add(213 * 4).readPointer();
                const layer = tod_layer.readU16();

                const apc_info = Memory.alloc(0x100000);
                const new_tod_layer = Memory.alloc(2);
                new_tod_layer.writeU16(layer);

                Set_APC_Info_Func(apc_mgr, new_tod_layer, apc_info);
            }
        });

    },

    /**
     * 绝望之塔通关后使用门票继续挑战
     */
    setupTowerTicketPatch() {
        Memory.protect(ptr(0x0864416F), 2, 'rwx');
        ptr(0x0864416F).writeByteArray([0xEB, 0x47]);
    },

    /**
     * 修复绝望之塔金币异常
     */
    setupTowerGoldFix() {
        let addr = ptr(0x859EAC2);
        let CParty_UseAncientDungeonItems = new NativeFunction(addr, 'int', ['pointer', 'pointer', 'pointer', 'pointer'], {"abi":"sysv"});

        Interceptor.replace(addr, new NativeCallback(function (party, dungeon, inven_item, a4) {
            let dungeon_index = CDungeon_get_index(dungeon);

            // 根据地下城 id 判断是否为绝望之塔
            if((dungeon_index >= 11008) && (dungeon_index <= 11107))
            {
                // 绝望之塔 不再扣除金币
                return 1;
            }

            // 其他副本执行原始扣除道具逻辑
            return CParty_UseAncientDungeonItems(party, dungeon, inven_item, a4);
        }, 'int', ['pointer', 'pointer', 'pointer', 'pointer']));
    },

    /**
     * 强制神秘商店 NPC 固定为 1000
     */
    setupFixMysteryShop() {
        Interceptor.replace(ptr(0x085FABAC), new NativeCallback(
            function(shop, dungeon_idx, dungeon_level, unknown) {
                return 1000;
            },
            'int',
            ['pointer', 'int', 'int', 'int']
        ));
    },

    /**
     * 跨公会聊天 (包含普通与高级信息)
     */
    setupCrossGuildChat() {
        const crossGuildMsgCache = new Map()

        const getMsgFingerprint = (msgData, isAdvanced = false, sender_guild_key) => {
            let content = "";
            if (isAdvanced) {
                const len = msgData.add(361).readU8();
                content = msgData.add(362).readUtf8String(len);
            } else {
                const len = msgData.add(0x30).readU8();
                content = msgData.add(0x31).readUtf8String(len);
            }
            const now = Math.floor(Date.now() / 1000);
            return `${sender_guild_key}|${content}|${now}`;
        };

        // 跨公会普通消息发送
        const SendMessagetoCommon = (msg, guild_name, sender_guild_key) => {
            const fingerprint = getMsgFingerprint(msg, false, sender_guild_key);
            if (crossGuildMsgCache.has(fingerprint)) return;

            crossGuildMsgCache.set(fingerprint, true);

            const packet_guard = api_PacketGuard_PacketGuard();
            InterfacePacketBuf_put_header(packet_guard, 0, 65);
            InterfacePacketBuf_put_byte(packet_guard, 6);
            InterfacePacketBuf_put_byte(packet_guard, 0); 
            api_InterfacePacketBuf_put_string(packet_guard, msg.add(18).readUtf8String());
            InterfacePacketBuf_put_byte(packet_guard, 0);
            
            const msgLen = msg.add(0x30).readU8();
            const content = msg.add(0x31);
            
            const extraContent = Memory.allocUtf8String("");
            const extraLen = strlen(extraContent);
            const newMsgLen = msgLen + extraLen;
            
            InterfacePacketBuf_put_int(packet_guard, newMsgLen);
            InterfacePacketBuf_put_binary(packet_guard, content, msgLen);
            InterfacePacketBuf_put_binary(packet_guard, extraContent, extraLen);
            InterfacePacketBuf_put_byte(packet_guard, 0);
            InterfacePacketBuf_finalize(packet_guard, 1);
            
            api_Gameworld_foreach(function(current_user) {
                let receiver_guild_key = CUserCharacInfo_get_charac_guildkey(current_user);
                if (receiver_guild_key > 0 && receiver_guild_key !== sender_guild_key) {
                    CUser_Send(current_user, packet_guard);
                }
            });
            Destroy_PacketGuard_PacketGuard(packet_guard);

            setTimeout(() => crossGuildMsgCache.delete(fingerprint), 5000);
        };

        // 跨公会聊天高级消息发送
        const SendGuildMessage = (msgData, guild_name, sender_guild_key) => {
            const fingerprint = getMsgFingerprint(msgData, true, sender_guild_key);
            if (crossGuildMsgCache.has(fingerprint)) {
                return null;
            }

            crossGuildMsgCache.set(fingerprint, true);

            const packet_guard = api_PacketGuard_PacketGuard();
            InterfacePacketBuf_put_header(packet_guard, 0, 371);
            InterfacePacketBuf_put_byte(packet_guard, 6);
            InterfacePacketBuf_put_byte(packet_guard, 0);
            const name = msgData.add(18).readUtf8String();
            api_InterfacePacketBuf_put_string(packet_guard, name);
            InterfacePacketBuf_put_byte(packet_guard, 0);
            const msgLen = msgData.add(361).readU8();
            const content = msgData.add(362);
            const extraContent = Memory.allocUtf8String(" [" + guild_name + "]跨公会信息");
            const extraLen = strlen(extraContent);
            const newMsgLen = msgLen + extraLen;
            InterfacePacketBuf_put_int(packet_guard, newMsgLen);
            InterfacePacketBuf_put_binary(packet_guard, content, msgLen);
            InterfacePacketBuf_put_binary(packet_guard, extraContent, extraLen);
            const itemCount = msgData.add(48).readU8();
            InterfacePacketBuf_put_byte(packet_guard, itemCount);
            for (let i = 0; i < itemCount; i++) {
                InterfacePacketBuf_put_binary(packet_guard, msgData.add(104 * i + 49), 104);
            }
            InterfacePacketBuf_finalize(packet_guard, 1);
            
            api_Gameworld_foreach(function(current_user) {
                let receiver_guild_key = CUserCharacInfo_get_charac_guildkey(current_user);
                if (receiver_guild_key > 0 && receiver_guild_key !== sender_guild_key) {
                    CUser_Send(current_user, packet_guard);
                }
            });

            setTimeout(() => crossGuildMsgCache.delete(fingerprint), 5000);
            return packet_guard;
        };

        // 跨公会聊天 Hook
        if (this.CONFIG.ENABLE_CROSS_GUILD_CHAT) {
            Interceptor.attach(ptr(0x084C9E30), {
                onEnter: function(args) {
                    this.user = args[1];
                    this.msgData = args[2];
                },
                onLeave: function(retval) {
                    const guild_name = api_CUser_GetGuildName(this.user);
                    const guild_key = CUserCharacInfo_get_charac_guildkey(this.user);
                    if (guild_key <= 0) return;
                    api_scheduleOnMainThread_delay(SendMessagetoCommon, [this.msgData, guild_name, guild_key], 1);
                }
            });

            Interceptor.attach(ptr(0x084E503C), {
                onEnter: function(args) {
                    let user = args[1];
                    let guild_name = api_CUser_GetGuildName(user);
                    let guild_key = CUserCharacInfo_get_charac_guildkey(user);
                    if (guild_key <= 0) return;
                    let msgData = args[2];
                    let packet_guard = SendGuildMessage(msgData, guild_name, guild_key);
                    if (packet_guard) {
                        Destroy_PacketGuard_PacketGuard(packet_guard);
                    }
                }
            });
        }
    },

    /**
     * 赛利亚房间角色互相可见
     */
    setupSeriaRoomVisibility() {
        const addr_insert = ptr(0x086C25A6); // Area::insert_user
        const addr_delete = ptr(0x086C2A38); // Area::delete_user
        const addr_erase  = ptr(0x086C2BE4); // Area::erase_user
        function apply_area_type_patch(name, func_ptr) {
            Interceptor.attach(func_ptr, {
                onEnter: function(args) {
                    this.areaPtr = args[0];
                    this.typeOffset = 0x68;
                    try {
                        this.oldType = this.areaPtr.add(this.typeOffset).readInt();
                        if (this.oldType === 1) {
                            this.areaPtr.add(this.typeOffset).writeInt(0);
                            this.needRestore = true;
                        } else {
                            this.needRestore = false;
                        }
                    } catch (e) {
                        this.needRestore = false;
                    }
                },
                onLeave: function(retval) {
                    if (this.needRestore) {
                        this.areaPtr.add(this.typeOffset).writeInt(this.oldType);
                    }
                }
            });
        }
    
        if (addr_insert.isNull() || addr_delete.isNull() || addr_erase.isNull()) {
            log_error("赛利亚房间可见，加载失败");
            return;
        }
    
        apply_area_type_patch("Insert", addr_insert);
        apply_area_type_patch("Delete", addr_delete);
        apply_area_type_patch("Erase", addr_erase);
    },

    /**
     * 史诗免确认
     */
    setupCancelEpicConfirm() {
        Memory.patchCode(ptr(0x085A56CE).add(2), 1, function (code) {
            const cw = new X86Writer(code, { pc: ptr(0x085A56CE).add(2) });
            cw.putU8(9);
            cw.flush();
        });

        Interceptor.attach(ptr(0x08150f18), {
            onLeave: function (retval) {
                retval.replace(0);
            }
        });
    },

    // ==================== 服务器最大等级 ====================
    
    /**
     * 设置游戏最大等级
     * @param {number} lv - 目标等级
     */
    setupCustomMaxLevel(lv) {
        if (lv < 1 || lv > 255) {
            log_error('[最大等级] 等级值无效：{}，必须在 1-255 之间', lv);
            return;
        }
        const patches = [
            { addr: 0x08360C3B, value: lv },
            { addr: 0x08360C79, value: lv },
            { addr: 0x08360CC4, value: lv },
            { addr: 0x08662F55, value: lv },
            { addr: 0x086630F3, value: lv },
            { addr: 0x086638F6, value: lv },
            { addr: 0x0866A659, value: lv },
            { addr: 0x0866A929, value: lv },
            { addr: 0x0866A941, value: lv },
            { addr: 0x0868FECE, value: lv },
            { addr: 0x0868FEDA, value: lv },
            { addr: 0x085BB6F0, value: lv },
            { addr: 0x085BB7DE, value: lv },
            { addr: 0x08665D28, value: lv - 1 },
            { addr: 0x08666E9C, value: lv - 1 },
            { addr: 0x0866A4A8, value: lv - 1 },
            { addr: 0x08689D4B, value: lv - 1 }
        ];
        patches.forEach(patch => {
            const addr = ptr(patch.addr);
            Memory.protect(addr, 1, 'rwx');
            addr.writeU8(patch.value);
        });

    },

    /**
     * 黑暗武士技能修复
     */
    HookDsSwordman_SkillSlot() {
        Interceptor.attach(ptr(0x08608D58), {
            //SkillSlot::checkMoveComboSkillSlot 返回 1
                onEnter: function (args) {
                },
                onLeave: function (retval) {
                    retval.replace(1)
                }
            });
        Interceptor.attach(ptr(0x08608C98), {
        //SkillSlot::checkMoveComboSkillSlot 返回 1
            onEnter: function (args) {
            },
            onLeave: function (retval) {
                retval.replace(1)
            }
        });
    },

    /**
     * 开启缔造者创建
     */
    setup_createCreator() {
	    Memory.patchCode(ptr(0x081C029E).add(1), 1, function (code) {
	    	var cw = new X86Writer(code, { pc: ptr(0x081C029E).add(1) });
	    	cw.putU8(11);
	    	cw.flush();
	    });        
    },

    /**
     * 开启练习模式
     */
    setup_FixPracticemode() {
	    var fixptr = ptr(0x81c8209);
	    Memory.protect(fixptr, 1, 'rwx');
	    Memory.writeByteArray(fixptr, [0x10])        
    },

    /**
     * 龙袍变装功能
     * 使用方法：
     * - 使用龙袍道具，孔位编号填 -1，道具代码填怪物ID 即可变身
     * - 使用龙袍道具，孔位编号填 0，即可取消变身
     */
    setupAvatarChange() {
        const CUserCharacInfo_setDisguiseCharac = new NativeFunction(ptr(0x822f91a), 'int', ['pointer','int','uint8','uint16'], {"abi":"sysv"});
        const CUser_make_basic_info = new NativeFunction(ptr(0x865A44E), 'int', ['pointer','pointer','int'], {"abi":"sysv"});
        const GameWorld_send_all_1 = new NativeFunction(ptr(0x0813495C), 'int', ['pointer','pointer','pointer'], {"abi":"sysv"});
        const DisPatcher_UseStack_dispatch_sig = new NativeFunction(ptr(0x81f63c0), 'int', ['pointer','pointer','pointer'], {"abi":"sysv"});
        
        Interceptor.replace(ptr(0x81f63c0), new NativeCallback(function(DisPatcher_UseStack, cuser, PacketBuf) {
            const src = Memory.alloc(0x100);
            Memory.copy(src, PacketBuf, 0x100);
            
            const slotIndex = api_PacketBuf_get_short(src);  // 孔位编号
            const x2 = api_PacketBuf_get_byte(src);
            const x3 = api_PacketBuf_get_int(src);
            const itemCode = api_PacketBuf_get_int(src);     // 道具代码/怪物ID
            const x5 = api_PacketBuf_get_int(src);
            
            // 变身操作 (孔位 -1)
            if (slotIndex == -1) {
                // 发送使用成功回包
                const PacketGuard = api_PacketGuard_PacketGuard();
                InterfacePacketBuf_put_header(PacketGuard, 1, 47);
                InterfacePacketBuf_put_byte(PacketGuard, 0);
                InterfacePacketBuf_put_byte(PacketGuard, 0);
                InterfacePacketBuf_put_byte(PacketGuard, 0);
                InterfacePacketBuf_put_int(PacketGuard, 0);
                InterfacePacketBuf_put_int(PacketGuard, 0);
                InterfacePacketBuf_finalize(PacketGuard, 1);
                CUser_Send(cuser, PacketGuard);
                Destroy_PacketGuard_PacketGuard(PacketGuard);
                
                // 设置变身
                CUserCharacInfo_setDisguiseCharac(cuser, 1, 2, itemCode);
                
                // 广播变身信息
                const v8 = api_PacketGuard_PacketGuard();
                InterfacePacketBuf_put_header(v8, 0, 2);
                InterfacePacketBuf_put_byte(v8, 0);
                InterfacePacketBuf_put_short(v8, 1);
                CUser_make_basic_info(cuser, v8, 0);
                InterfacePacketBuf_finalize(v8, 1);
                GameWorld_send_all_1(G_GameWorld(), v8, cuser);
                Destroy_PacketGuard_PacketGuard(v8);
                
                return 0;
            }
            // 取消变身 (孔位 0)
            else if (slotIndex == 0) {
                // 发送使用成功回包
                const PacketGuard = api_PacketGuard_PacketGuard();
                InterfacePacketBuf_put_header(PacketGuard, 1, 47);
                InterfacePacketBuf_put_byte(PacketGuard, 0);
                InterfacePacketBuf_put_byte(PacketGuard, 0);
                InterfacePacketBuf_put_byte(PacketGuard, 0);
                InterfacePacketBuf_put_int(PacketGuard, 0);
                InterfacePacketBuf_put_int(PacketGuard, 0);
                InterfacePacketBuf_finalize(PacketGuard, 1);
                CUser_Send(cuser, PacketGuard);
                Destroy_PacketGuard_PacketGuard(PacketGuard);
                
                // 取消变身
                CUserCharacInfo_setDisguiseCharac(cuser, 0, 0, 0);
                
                // 广播取消变身信息
                const v8 = api_PacketGuard_PacketGuard();
                InterfacePacketBuf_put_header(v8, 0, 2);
                InterfacePacketBuf_put_byte(v8, 0);
                InterfacePacketBuf_put_short(v8, 1);
                CUser_make_basic_info(cuser, v8, 0);
                InterfacePacketBuf_finalize(v8, 1);
                GameWorld_send_all_1(G_GameWorld(), v8, cuser);
                Destroy_PacketGuard_PacketGuard(v8);
                
                return 0;
            }
            
            // 其他情况执行原始逻辑
            return DisPatcher_UseStack_dispatch_sig(DisPatcher_UseStack, cuser, PacketBuf);
        }, 'int', ['pointer', 'pointer', 'pointer']));
    }
};

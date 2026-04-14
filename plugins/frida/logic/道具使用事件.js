/**
 * 道具使用事件.js - v3.0
 * 2026.3.24 By.南瓜
 * 配置分离架构改造
 * 2026.4.11 合并任务相关功能
 */

module.exports = {
    // ==================== 中文键名映射 ====================
fieldMapping: {
        "道具列表": "items",
        "道具 ID": "itemId",
        "类型": "type",
        "清理范围": "maxSlots",
        "失败返还": "returnOnFail",
        "消息": "messages",
        "副本范围": "dungeonRange",
        "装备栏位置": "equipmentSlot",
        "排除装备 ID": "excludedItemIds",
        "排除装备类型": "excludedEquipTypes",
        "难度等级": "Diff",
        "充值卡列表": "rechargeList",
        "目标槽位": "targetSlot",
        "锻造等级映射": "reinforceMap",
        "源装备栏位置": "slotSrc",
        "目标装备栏位置": "slotDst",
        "最低继承等级": "minLevel",
        "等级差上限": "maxLevelDiff",
        "最低品级": "minRarity",
        "品级不同能否继承": "checkRarityDiff",
        "是否继承异界气息": "enableBreath",
        "禁用部位": "disableTypes",
        "禁用装备 ID": "disableIds",
        // 装备回收
        "格子范围": "slotRange",
        "回收规则": "recycleRules",
        "排除的装备ID": "excludedEquipIds",
        "发送信息位置": "msgPosition",
        "发送信息对象": "msgTarget",
        "提示信息": "hint",
        "奖励文字": "rewardText",
        // 回收规则子字段（递归转换会命中这些键）
        "品级": "rarities",
        "等级范围": "levelRange",
        "道具": "itemIds",
        "奖励": "rewards",
        "返还": "returnItem",
        "失败": "failMsg",
        // 奖励文字子字段（装备回收）
        "玩家名前后": "txtAround",
        "玩家名": "txtPlayer",
        "数量前": "txtCount",
        "获得": "txtGet",
        "点券": "txtCash",
        "代币": "txtToken",
        // 奖励文字子字段（礼包回收）
        "恭喜回收": "txtCongrats",
        "数量": "txtQty",
        "分隔符": "txtSep",
        // 文字颜色通用子字段
        "文字": "text",
        "颜色": "color",
        // 格子范围子字段
        "开始": "start",
        "结束": "end",
        // 礼包回收
        "回收配置": "recycleConfig",
        "排除的道具ID": "excludedItemIds2",
        // 任务相关
        "任务配置": "questCfg",
        "是否发放奖励": "enableReward",
        "任务排除列表": "excludes",
        "指定完成的每日任务ID": "dailyQuestIds",
        "任务类型": "questCategory",
        "任务 ID": "questId",
        "主线": "EPIC",
        "普通": "COMMON",
        "成就": "ACHIEVEMENT"
    },

    // ==================== 配置文件路径 ====================
    configPath: '/plugins/frida/configs/道具使用事件.json',

    // ==================== 初始化 ====================
    init() {
        const self = this;

        if (Object.keys(self.CONFIG.items || {}).length === 0) {
            log_warn("[道具使用] items 为空, 可能 JSON 未正确加载");
        }

        self.itemIdMap = {};
        for (let name in self.CONFIG.items) {
            const cfg = self.CONFIG.items[name];
            const itemId = cfg.itemId;
            const type = cfg.type;

            // 普通道具注册
            if (Array.isArray(itemId)) {
                itemId.forEach(id => self.itemIdMap[id] = { name, cfg });
            } else if (itemId && itemId > 0) {
                self.itemIdMap[itemId] = { name, cfg };
            }

            if (type === 'cash_recharge' && Array.isArray(cfg.rechargeList)) {
                cfg.rechargeList.forEach(row => {
                    if (Array.isArray(row) && row.length >= 1) {
                        const rechargeId = Number(row[0]);
                        if (rechargeId > 0) {
                            self.itemIdMap[rechargeId] = { name, cfg };
                        }
                    }
                });
            }
            if (type === 'weapon_reinforce' && Array.isArray(cfg.reinforceMap)) {
                cfg.reinforceMap.forEach(row => {
                    if (Array.isArray(row) && row.length >= 1) {
                        const forgeId = Number(row[0]);
                        if (forgeId > 0) self.itemIdMap[forgeId] = { name, cfg };
                    }
                });
            }
        }

        self.itemId = Object.keys(self.itemIdMap).map(id => Number(id));
        //log_info('[道具使用] 初始化完成，共注册 {} 个道具', self.itemId.length);
    },

    dispose() {
        this.itemIdMap = null;
        this.itemId = [];
    },

    // ==================== 道具使用入口 ====================
    UseItem(user, item_id) {
        const self = this;
        const mapping = self.itemIdMap[item_id];
        if (!mapping) return;

        const { name, cfg } = mapping;
        const type = cfg.type;

        switch (type) {
            case 'avatar_cleanup':
                self.handleAvatarCleanup(user, item_id, cfg);
                break;
            case 'creature_cleanup':
                self.handleCreatureCleanup(user, item_id, cfg);
                break;
            case 'dungeon_reset':
                self.handleDungeonReset(user, item_id, cfg);
                break;
            case 'equipment_crossover':
                self.handleEquipmentCrossover(user, item_id, cfg);
                break;
            case 'dungeon_difficulty_unlock':
                self.handleDungeonDifficultyUnlock(user, item_id, cfg);
                break;
            case 'cash_recharge':
                self.handleCashRecharge(user, item_id, cfg);
                break;
            case 'weapon_reinforce':
                self.handleWeaponReinforce(user, item_id, cfg);
                break;
            case 'equipment_inheritance':
                self.handleEquipmentInheritance(user, item_id, cfg);
                break;
            case 'equipment_recycle':
                self.handleEquipmentRecycle(user, item_id, cfg);
                break;
            case 'gift_recycle':
                self.handleGiftRecycle(user, item_id, cfg);
                break;
            case 'quest_clear':
                self.handleQuestClear(user, item_id, cfg);
                break;
            case 'quest_accept':
                self.handleQuestAccept(user, item_id, cfg);
                break;
            default:
                log_warn(`[道具使用] 未知的道具类型：${type}`);
        }
    },

    // ==================== 时装删除 ====================
    handleAvatarCleanup(user, item_id, cfg) {
        const self = this;
        const inven = CUserCharacInfo_getCurCharacInvenW(user);
        const charac_no = CUserCharacInfo_getCurCharacNo(user);
        let deleted_count = 0;
    
        for (let i = 0; i < cfg.maxSlots; ++i) {
            const Avatar = CInventory_GetInvenRef(inven, INVENTORY_TYPE_AVARTAR, i);
            if (!Avatar || Avatar.isNull()) continue;
    
            const Avatar_id = Inven_Item_getKey(Avatar);
            if (Avatar_id > 0) {
                Inven_Item_reset(Avatar);
                if (typeof mysql_taiwan_cain_2nd !== 'undefined') {
                    const sql = `UPDATE taiwan_cain_2nd.user_items SET stat=1 
                                 WHERE charac_no=${charac_no} AND slot=${i + 10} AND it_id=${Avatar_id}`;
                    api_MySQL_exec(mysql_taiwan_cain_2nd, sql);
                }
                deleted_count++;
            }
        }
    
        if (deleted_count > 0) {
            const msg = self.formatMessage(cfg.messages.成功, { count: deleted_count });
            api_send_msg(user, msg, 1);
            CUser_send_itemspace(user, ENUM_ITEMSPACE_AVATAR);
        } else {
            self.returnItem(user, item_id);
            api_send_msg(user, cfg.messages.失败, 1);
        }
    },

    // ==================== 宠物删除 ====================
    handleCreatureCleanup(user, item_id, cfg) {
        const self = this;
        const inven = CUserCharacInfo_getCurCharacInvenW(user);
        const charac_no = CUserCharacInfo_getCurCharacNo(user);
        const creatureMgr = inven.add(1768);
        let deleted = 0;
    
        for (let i = 0; i < cfg.maxSlots; ++i) {
            const creature = CInventory_GetInvenRef(inven, INVENTORY_TYPE_CREATURE, i);
            if (!creature || creature.isNull()) continue;
    
            const itemIdInSlot = creature.add(2).readU32();
            if (itemIdInSlot > 0) {
                const uid = Inven_Item_getCreatureUid(creature);
                if (uid > 0) CCreatureMgr_UnregisterCreatureItem(creatureMgr, uid);
    
                Inven_Item_reset(creature);
                if (typeof mysql_taiwan_cain_2nd !== 'undefined') {
                    api_MySQL_exec(mysql_taiwan_cain_2nd, `DELETE FROM creature_items WHERE charac_no=${charac_no} AND slot=${i}`);
                }
                deleted++;
            }
        }
    
        if (deleted > 0) {
            const msg = self.formatMessage(cfg.messages.成功, { count: deleted });
            api_send_msg(user, msg, 1);
            CUser_send_itemspace(user, SPACE_CREATURE);
        } else {
            self.returnItem(user, item_id);
            api_send_msg(user, cfg.messages.失败, 1);
        }
    },

    handleDungeonReset(user, item_id, cfg) {
        const [start, end] = cfg.dungeonRange;
        for (let i = start; i <= end; i++) {
            const defaultVal = CDataManager_get_dimensionInout(G_CDataManager(), i);
            CUserCharacInfo_setDemensionInoutValue(user, i, defaultVal);
        }
        api_send_msg(user, cfg.messages, 1);
    },

    // ==================== 装备跨界 ====================
    handleEquipmentCrossover(user, item_id, cfg) {
        const self = this;
        const accountCargo = CUser_getAccountCargo(user);
        const emptyIndex = CAccountCargo_GetEmptySlot(accountCargo);
        const inven = CUserCharacInfo_getCurCharacInvenW(user);
        const equ = CInventory_GetInvenRef(inven, INVENTORY_TYPE_ITEM, cfg.equipmentSlot);
        const itemId = Inven_Item_getKey(equ);

        if (itemId <= 0) {
            api_send_msg(user, cfg.messages.装备栏空, 1);
            self.returnItem(user, item_id);
            return;
        }
        if (emptyIndex === -1) {
            api_send_msg(user, cfg.messages.金库满, 1);
            self.returnItem(user, item_id);
            return;
        }
        if (cfg.excludedItemIds.includes(itemId)) {
            api_send_msg(user, cfg.messages.不可跨界, 1);
            self.returnItem(user, item_id);
            return;
        }

        const itemData = CDataManager_find_item(G_CDataManager(), itemId);
        const equipType = itemData ? itemData.add(141 * 4).readU32() : 0;
        if (cfg.excludedEquipTypes.includes(equipType)) {
            api_send_msg(user, cfg.messages.类型禁止, 1);
            self.returnItem(user, item_id);
            return;
        }

        const qixi1 = equ.add(31).readU8();
        const qixi2 = equ.add(32).readU8();
        if (qixi1 > 0 || qixi2 > 0) {
            api_send_msg(user, cfg.messages.有气息, 1);
            self.returnItem(user, item_id);
            return;
        }

        const result = CAccountCargo_InsertItem(accountCargo, equ, emptyIndex);
        if (result === -1) {
            api_send_msg(user, cfg.messages.失败, 1);
            self.returnItem(user, item_id);
        } else {
            Inven_Item_reset(equ);
            CUser_SendUpdateItemList(user, 1, 0, cfg.equipmentSlot);
            CAccountCargo_SendItemList(accountCargo);
            api_send_msg(user, cfg.messages.成功, 1);
        }
    },
    
    // ==================== 副本难度解锁 ====================
    handleDungeonDifficultyUnlock(user, item_id, cfg) {
        const cmdId = 120;
        const level = cfg.Diff || "3";
        
        const difficulty_ptr = Memory.allocUtf8String(level);
        DoUserDefineCommand(user, cmdId, difficulty_ptr);
        
        const msg = cfg.messages || "【系统】全副本难度已解锁！请重新登录刷新。";
        api_send_msg(user, msg, 1);
    },

    // ==================== 点券充值卡 ====================
    handleCashRecharge(user, item_id, cfg) {
        const rechargeList = cfg.rechargeList || [];
        const entry = rechargeList.find(row => row[0] === item_id);
        const amount = entry ? entry[1] : 0;

        if (amount > 0) {
            api_recharge_cash_cera(user, amount);
            api_send_msg(user, `成功充值 ${amount} 点券！`, 1);
        } else {
            api_send_msg(user, `充值失败：未找到该道具(${item_id})的配置`, 1);
        }
    },

    // ==================== 武器锻造券 ====================
    handleWeaponReinforce(user, item_id, cfg) {
        const level = (cfg.reinforceMap || []).find(row => row[0] === item_id)?.[1];
        if (!level) {
            api_send_msg(user, `锻造失败：未找到该道具(${item_id})的等级配置`, 1);
            return;
        }

        const inven = CUserCharacInfo_getCurCharacInvenW(user);
        const targetSlot = cfg.targetSlot || 9;   // 默认装备栏第1格

        const equ = CInventory_GetInvenRef(inven, 1, targetSlot);
        if (Inven_Item_getKey(equ) === 0) {
            return this.sendError(user, item_id, "装备栏第一格没有装备, 锻造失败");
        }

        const itemData = CDataManager_find_item(G_CDataManager(), Inven_Item_getKey(equ));
        const equ_type = itemData ? itemData.add(141 * 4).readU32() : 0;
        if (equ_type !== 10) {
            return this.sendError(user, item_id, "只有武器才可锻造哦");
        }

        if (CUser_CheckItemLock(user, 1, targetSlot)) {
            return this.sendError(user, item_id, "装备已上锁, 锻造失败");
        }

        const currentLevel = equ.add(51).readU8();
        if (currentLevel >= level) {
            return this.sendError(user, item_id, "目标装备锻造等级已达到或超过锻造券等级");
        }

        this.sendUpgradeSeparateNotice(user, targetSlot, level, true);
        CUser_SendUpdateItemList(user, 1, 1, targetSlot);
    },

    sendUpgradeSeparateNotice(user, equipmentSlot, newEquipmentLevel, upgradeSuccess) {
        const inven = CUserCharacInfo_getCurCharacInvenW(user);
        const inven_equ = CInventory_GetInvenRef(inven, 1, equipmentSlot);
        const money = CInventory_get_money(inven);
        const curEquipmentLevel = inven_equ.add(51).readU8();

        const packet_guard = api_PacketGuard_PacketGuard();
        InterfacePacketBuf_put_header(packet_guard, 1, 439);

        InterfacePacketBuf_put_byte(packet_guard, 1);
        InterfacePacketBuf_put_short(packet_guard, 0);
        InterfacePacketBuf_put_int(packet_guard, money);
        InterfacePacketBuf_put_byte(packet_guard, curEquipmentLevel);

        if (upgradeSuccess) {
            inven_equ.add(51).writeU8(newEquipmentLevel);
            InterfacePacketBuf_put_byte(packet_guard, 0);
        } else {
            InterfacePacketBuf_put_byte(packet_guard, 1);
        }

        InterfacePacketBuf_put_byte(packet_guard, newEquipmentLevel);
        InterfacePacketBuf_put_short(packet_guard, equipmentSlot);

        InterfacePacketBuf_finalize(packet_guard, 1);
        CUser_Send(user, packet_guard);
        Destroy_PacketGuard_PacketGuard(packet_guard);

        const _NoticeUpgrade = new NativeFunction(ptr(0x0811E53A), 'void', ['pointer', 'pointer', 'pointer', 'int'], "sysv");
        _NoticeUpgrade(ptr(0), user, inven_equ, upgradeSuccess ? 1 : 0);
    },

    sendError(user, itemId, msg) {
        api_send_msg(user, msg, 1);
        api_CUser_AddItem(user, itemId, 1); // 失败返还
    },

    // ==================== 装备继承 ====================
    handleEquipmentInheritance(user, item_id, cfg) {
        const inven = CUserCharacInfo_getCurCharacInvenW(user);
        const srcItem = CInventory_GetInvenRef(inven, 1, cfg.slotSrc || 9);
        const dstItem = CInventory_GetInvenRef(inven, 1, cfg.slotDst || 10);
        
        const srcId = Inven_Item_getKey(srcItem);
        const dstId = Inven_Item_getKey(dstItem);

        const sendError = (msg) => {
            api_send_msg(user, msg, 1);
            api_scheduleOnMainThread_delay(api_CUser_AddItem, [user, item_id, 1], 1000);
        };

        if (srcId <= 0 || dstId <= 0) {
            return sendError(cfg.messages.ERROR_EMPTY || "          继承失败\n    请检查装备栏第一/二格是否存在装备!");
        }

        const dataMgr = G_CDataManager();
        const srcData = CDataManager_find_item(dataMgr, srcId);
        const dstData = CDataManager_find_item(dataMgr, dstId);

        if ((cfg.disableIds || []).includes(srcId) || (cfg.disableIds || []).includes(dstId)) {
            let name = api_CItem_GetItemName((cfg.disableIds || []).includes(srcId) ? srcId : dstId);
            return sendError((cfg.messages.ERROR_BAN || "          继承失败\n[%s]    禁止继承").replace("%s", name));
        }

        const srcType = srcData.add(564).readU32();
        const dstType = dstData.add(564).readU32();

        if ((cfg.disableTypes || []).includes(srcType) || (cfg.disableTypes || []).includes(dstType) || srcType !== dstType) {
            return sendError(cfg.messages.ERROR_TYPE || "          继承失败\n    装备类型不符合要求");
        }

        const srcLv = CItem_getUsableLevel(srcData);
        const dstLv = CItem_getUsableLevel(dstData);
        
        if (srcLv < (cfg.minLevel || 1) || dstLv < (cfg.minLevel || 1) || Math.abs(srcLv - dstLv) > (cfg.maxLevelDiff || 20)) {
            return sendError(cfg.messages.ERROR_LEVEL || "          继承失败\n    装备等级不符合要求");
        }

        const srcRarity = CItem_get_rarity(srcData);
        const dstRarity = CItem_get_rarity(dstData);

        if (srcRarity < (cfg.minRarity || 0) || dstRarity < (cfg.minRarity || 0)) {
            return sendError(cfg.messages.ERROR_RARITY || "          继承失败\n    装备品级不符合要求");
        }
        if (!(cfg.checkRarityDiff ?? true) && srcRarity !== dstRarity) {
            return sendError(cfg.messages.ERROR_RARITY || "          继承失败\n    装备品级不符合要求");
        }

        CUser_copyItemOption(user, dstItem, srcItem);

        const jewelId = srcItem.add(25).readU32();
        dstItem.add(25).writeU32(jewelId);
        srcItem.add(25).writeU32(0); 

        if (cfg.enableBreath ?? true) {
            const b1 = srcItem.add(31).readU8();
            const b2 = srcItem.add(32).readU8();
            if (b1 > 0) {
                dstItem.add(31).writeU8(b1);
                dstItem.add(32).writeU8(b2);
                srcItem.add(31).writeU8(0);
                srcItem.add(32).writeU8(0);
            }
        }

        [6, 17, 51].forEach(offset => srcItem.add(offset).writeU8(0));
        srcItem.add(13).writeU32(0);

        CUser_SendUpdateEqu_JewelSocket(user, 0, cfg.slotDst || 10);
        CUser_SendUpdateEqu_JewelSocket(user, 0, cfg.slotSrc || 9);

        api_SendHyperLinkChatMsg_emoji(user, [
            ['str', '成功将'],
            ['item', srcItem],
            ['str', '继承到'],
            ['item', dstItem],
        ], 0, 1);
    },

    // ==================== 工具函数 ====================
    returnItem(user, item_id) {
        api_scheduleOnMainThread_delay(() => {
            api_CUser_AddItem(user, item_id, 1);
        }, [], 10);
    },

    formatMessage(template, vars) {
        let msg = template || '';
        for (let key in vars) {
            msg = msg.replace(new RegExp(`\\$\\{${key}\\}`, 'g'), vars[key]);
        }
        return msg;
    },

    // ==================== 装备回收 ====================
    handleEquipmentRecycle(user, item_id, cfg) {
        const slots = cfg.slotRange;
        const start = slots.start;
        const end = slots.end;
        const rules = cfg.recycleRules;
        const excludeIds = cfg.excludedEquipIds || [];
        const msgPosition = cfg.msgPosition;
        const msgTarget = cfg.msgTarget;
        const hint = cfg.hint;
        const txt = cfg.rewardText;
        const char_name = api_CUserCharacInfo_getCurCharacName(user);
        const inven = CUserCharacInfo_getCurCharacInvenR(user);
        const itemRewards = new Map();
        let found_any_equ = false;

        for (let slot = start; slot <= end; slot++) {
            const Inven_Item = CInventory_GetInvenRef(inven, INVENTORY_TYPE_ITEM, slot);
            const itemId = Inven_Item_getKey(Inven_Item);
            if (itemId <= 0) continue;

            if (CUser_CheckItemLock(user, INVENTORY_TYPE_ITEM, slot)) continue;
            if (excludeIds.includes(itemId)) continue;

            let item_cnt = Inven_Item.add(7).readU32();
            const isEquipment = api_is_Equipment_item(itemId);
            const recycle_count = isEquipment ? 1 : item_cnt;

            const Item = CDataManager_find_item(G_CDataManager(), itemId);
            if (!Item || Item.isNull()) continue;

            let matchedRule = null;
            for (const rule of rules) {
                if (rule.type === "品级") {
                    const rarity = CItem_get_rarity(Item);
                    const level = CItem_getUsableLevel(Item);
                    if (rule.rarities.includes(rarity) && level >= rule.levelRange[0] && level <= rule.levelRange[1]) {
                        matchedRule = rule;
                        break;
                    }
                } else if (rule.type === "指定") {
                    if (rule.itemIds.includes(itemId)) {
                        matchedRule = rule;
                        break;
                    }
                }
            }

            if (!matchedRule) continue;

            const msgBefore = txt.txtAround;
            const msgPlayer = txt.txtPlayer;
            const msgCount = txt.txtCount;
            const msgGet = txt.txtGet;
            const msgCash = txt.txtCash;
            const msgToken = txt.txtToken;

            const message = [
                ['str', msgBefore.text[0], msgBefore.color],
                ['str', char_name, msgPlayer.color],
                ['str', msgBefore.text[1], msgBefore.color],
                ['item', Inven_Item],
                ['str', msgCount.text + recycle_count, msgCount.color]
            ];

            matchedRule.rewards.forEach(([type, value]) => {
                const totalReward = value * recycle_count;
                if (type === 0) {
                    api_recharge_cash_cera(user, totalReward);
                    message.push(['str', msgGet.text, msgGet.color]);
                    message.push(['str', totalReward + msgCash.text, msgCash.color]);
                } else if (type === 1) {
                    api_recharge_cash_cera_point(user, totalReward);
                    message.push(['str', msgGet.text, msgGet.color]);
                    message.push(['str', totalReward + msgToken.text, msgToken.color]);
                } else {
                    const currentCount = itemRewards.get(type) || 0;
                    itemRewards.set(type, currentCount + totalReward);
                    message.push(['str', msgGet.text, msgGet.color]);
                    message.push(['item', type]);
                    message.push(['str', msgCount.text + totalReward, msgCount.color]);
                }
            });

            api_SendHyperLinkChatMsg_emoji(user, message, msgPosition, msgTarget);

            Inven_Item_reset(Inven_Item);
            CUser_SendUpdateItemList(user, 1, 0, slot);
            found_any_equ = true;
        }

        if (itemRewards.size > 0) {
            const itemList = Array.from(itemRewards.entries()).map(([type, count]) => [type, count]);
            api_CUser_Add_Item_list(user, itemList);
        }

        if (!found_any_equ) {
            api_send_msg(user, hint.failMsg, 1);
        } else if (hint.returnItem) {
            api_scheduleOnMainThread_delay(api_CUser_AddItem, [user, item_id, 1], 1);
        }
    },

    // ==================== 礼包回收 ====================
    handleGiftRecycle(user, item_id, cfg) {
        const slots = cfg.slotRange;
        const start = slots.start;
        const end = slots.end;
        const rewardsConfig = cfg.recycleConfig;
        const excludeIds = cfg.excludedItemIds2 || [];
        const msgPosition = cfg.msgPosition;
        const msgTarget = cfg.msgTarget;
        const hint = cfg.hint;
        const txt = cfg.rewardText;
        const inven = CUserCharacInfo_getCurCharacInvenR(user);
        const itemRewards = new Map();
        let found_any_item = false;

        for (let slot = start; slot <= end; slot++) {
            const Inven_Item = CInventory_GetInvenRef(inven, INVENTORY_TYPE_ITEM, slot);
            const target_id = Inven_Item_getKey(Inven_Item);
            if (target_id <= 0) continue;
            if (excludeIds.includes(target_id)) continue;

            const item_cnt = Inven_Item.add(7).readU32();
            if (item_cnt <= 0) continue;

            const rewards = rewardsConfig[target_id];
            if (!rewards) continue;

            const message = [
                ['str', txt.txtCongrats.text, txt.txtCongrats.color],
                ['item', Inven_Item],
                ['str', txt.txtGet.text, txt.txtGet.color]
            ];

            for (let i = 0; i < rewards.length; i++) {
                const [reward_type, reward_value] = rewards[i];
                const singleReward = this.getRewardValue(reward_value);
                const totalReward = singleReward * item_cnt;

                if (reward_type === 0) {
                    api_recharge_cash_cera(user, totalReward);
                    message.push(['str', totalReward + txt.txtCash.text, txt.txtCash.color]);
                } else if (reward_type === 1) {
                    api_recharge_cash_cera_point(user, totalReward);
                    message.push(['str', totalReward + txt.txtToken.text, txt.txtToken.color]);
                } else {
                    const currentCount = itemRewards.get(reward_type) || 0;
                    itemRewards.set(reward_type, currentCount + totalReward);
                    message.push(['item', reward_type]);
                    message.push(['str', txt.txtQty.text + totalReward, txt.txtQty.color]);
                }

                if (i < rewards.length - 1) {
                    message.push(['str', txt.txtSep.text, txt.txtSep.color]);
                }
            }

            api_SendHyperLinkChatMsg_emoji(user, message, msgPosition, msgTarget);

            CInventory_delete_item(inven, INVENTORY_TYPE_ITEM, slot, item_cnt, 0, 1);
            CUser_SendUpdateItemList(user, 1, 0, slot);
            found_any_item = true;
        }

        if (itemRewards.size > 0) {
            const itemList = Array.from(itemRewards.entries()).map(([type, count]) => [type, count]);
            api_CUser_Add_Item_list(user, itemList);
        }

        if (!found_any_item) {
            api_send_msg(user, hint.failMsg, 1);
        }
        api_scheduleOnMainThread_delay(api_CUser_AddItem, [user, item_id, 1], 1);
    },

    getRandomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    },

    getRewardValue(value) {
        if (Array.isArray(value)) {
            return this.getRandomInt(value[0], value[1]);
        }
        return value;
    },

    // ==================== 任务完成券 ====================
    handleQuestClear(user, item_id, cfg) {
        const questCfg = this.CONFIG.questCfg;
        const category = cfg.questCategory; // "主线" / "成就" / "普通" / "每日"

        if (category === '每日') {
            this._clearDoing(user);
            this._clearDaily(user, item_id, questCfg);
        } else {
            let qtype, typeName, excludes;
            if (category === '主线') {
                qtype = QUEST_gRADE_EPIC;
                typeName = '主线任务';
                excludes = (questCfg.excludes || {}).EPIC || [];
            } else if (category === '成就') {
                qtype = QUEST_gRADE_ACHIEVEMENT;
                typeName = '成就任务';
                excludes = (questCfg.excludes || {}).ACHIEVEMENT || [];
            } else {
                qtype = QUEST_gRADE_COMMON_UNIQUE;
                typeName = '普通任务';
                excludes = (questCfg.excludes || {}).COMMON || [];
            }
            this._clearDoing(user);
            this._clearBatch(user, item_id, qtype, typeName, excludes, questCfg);
        }
    },

    // ==================== 任务接取券 ====================
    handleQuestAccept(user, item_id, cfg) {
        const questId = cfg.questId;
        if (!questId) {
            api_send_msg(user, '任务接取失败：未配置任务 ID', 1);
            api_CUser_AddItem(user, item_id, 1);
            return;
        }
        const result = api_auto_accept_quest(user, questId);
        if (!result) {
            api_send_msg(user, `任务接取失败（可能已接取、槽位已满或任务不存在）`, 1);
            api_CUser_AddItem(user, item_id, 1);
        }
    },

    // ==================== 任务内部工具函数 ====================
    _clearBatch(user, refundItemId, qtype, typeName, excludes, questCfg) {
        const user_quest = CUser_getCurCharacQuestW(user);
        const clear_mgr = user_quest.add(4);
        const charac_lv = CUserCharacInfo_get_charac_level(user);
        const data_mgr = G_CDataManager();
        const enableReward = questCfg.enableReward || false;

        let count = 0;
        let total_exp = 0, total_gold = 0, total_qp = 0;

        for (let qid = 1; qid < 30000; qid++) {
            if (WongWork_CQuestClear_isClearedQuest(clear_mgr, qid)) continue;
            if (excludes.includes(qid)) continue;

            const quest = CDataManager_find_quest(data_mgr, qid);
            if (!quest.isNull()) {
                const grade = quest.add(8).readInt();
                const min_lv = quest.add(0x20).readInt();

                if (grade === qtype && min_lv <= charac_lv) {
                    if (enableReward) {
                        const exp_buf = Memory.alloc(4), gold_buf = Memory.alloc(4),
                              qp_buf = Memory.alloc(4), piece_buf = Memory.alloc(4);
                        CUser_quest_basic_reward(user, quest, exp_buf, gold_buf, qp_buf, piece_buf, 1);
                        total_exp += exp_buf.readInt();
                        total_gold += gold_buf.readInt();
                        total_qp += qp_buf.readInt();
                    }
                    WongWork_CQuestClear_setClearedQuest(clear_mgr, qid);
                    count++;
                }
            }
        }

        this._finalizeReward(user, refundItemId, count, typeName, total_exp, total_gold, total_qp, enableReward, user_quest);
    },

    _clearDaily(user, refundItemId, questCfg) {
        const user_quest = CUser_getCurCharacQuestW(user);
        const clear_mgr = user_quest.add(4);
        const dailyIds = questCfg.dailyQuestIds || [];
        let count = 0;

        for (let id of dailyIds) {
            if (WongWork_CQuestClear_isClearedQuest(clear_mgr, id)) continue;
            this._forceComplete(user, id);
            count++;
        }

        if (count > 0) {
            this._refreshQuestUI(user, user_quest);
            api_send_msg(user, `【系统】成功完成 ${count} 个每日任务！`, 1);
        } else {
            api_send_msg(user, '【系统】今日每日任务已全部完成。', 1);
            api_CUser_AddItem(user, refundItemId, 1);
        }
    },

    _finalizeReward(user, refundId, count, typeName, exp, gold, qp, enableReward, user_quest) {
        if (count > 0) {
            if (enableReward) {
                if (exp > 0) api_CUser_gain_exp_sp(user, exp);
                if (gold > 0) CInventory_gain_money(CUserCharacInfo_getCurCharacInvenW(user), gold, 0, 0, 0);
            }
            if (CUser_get_state(user) === 3) {
                CUser_SendNotiPacket(user, 0, 2, 0);
                CUser_SendNotiPacket(user, 1, 2, 1);
                CUser_SendUpdateItemList(user, 1, 0, 0);
                if (enableReward && qp > 0) CUser_sendCharacQp(user);
            }
            this._refreshQuestUI(user, user_quest);

            const msg = `【系统】${typeName}清理完毕，共完成 ${count} 个任务`;
            if (enableReward && (exp > 0 || gold > 0)) {
                api_CUser_SendNotiPacketMessage(user, msg, 14);
                api_CUser_SendNotiPacketMessage(user, `获得经验: ${exp}`, 14);
                api_CUser_SendNotiPacketMessage(user, `获得金币: ${gold}`, 14);
            } else {
                api_send_msg(user, msg, 1);
            }
        } else {
            api_send_msg(user, `【系统】当前没有${typeName}需要清理。`, 1);
            if (refundId) api_CUser_AddItem(user, refundId, 1);
        }
    },

    _clearDoing(user) {
        const user_quest = CUser_getCurCharacQuestW(user);
        let found = false;
        for (let i = 0; i < 20; i++) {
            const qid = user_quest.add(4 * (i + 7500 + 2)).readInt();
            if (qid > 0) {
                this._forceComplete(user, qid);
                found = true;
            }
        }
        if (found) this._refreshQuestUI(user, user_quest);
    },

    _forceComplete(user, quest_id) {
        CUser_setGmQuestFlag(user, 1);
        CUser_quest_action(user, 33, quest_id, 0, 0);
        CUser_quest_action(user, 35, quest_id, 0, 0);
        CUser_quest_action(user, 36, quest_id, -1, 1);
        user.add(0x79644).writeInt(0);
        CUser_setGmQuestFlag(user, 0);
    },

    _refreshQuestUI(user, user_quest_ptr) {
        CUser_send_clear_quest_list(user);
        const pg = Memory.alloc(0x20000);
        PacketGuard_PacketGuard(pg);
        UserQuest_get_quest_info(user_quest_ptr, pg);
        CUser_Send(user, pg);
        Destroy_PacketGuard_PacketGuard(pg);
    }
};

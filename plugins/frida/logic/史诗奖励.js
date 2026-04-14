/**
 * 史诗奖励.js - v2.1
 * 功能：
 * 1. 装备品级奖励（史诗/神器/稀有）
 * 2. 指定道具奖励
 * 3. 支持点券/代币/金币/道具奖励
 * 2026.2.8 By.南瓜
 */

module.exports = {
    // ==================== 中文键名映射 ====================
    fieldMapping: {
        "奖励控制": "rewardControl",
        "指定道具奖励控制": "specialItemControl",
        "信息播报": "broadcastConfig",
        "邮件配置": "mailConfig",
        "品级": "rarity",
        "播报开关": "broadcast",
        "奖励开关": "reward",
        "奖励配置": "rewardConfig",
        "指定道具对应奖励": "itemRewards",
        "发送位置": "msgType",
        "发送范围": "notifyType",
        "树形结构": "treeConfig",
        "启用": "enabled",
        "中间节点": "middleNode",
        "末尾节点": "endNode",
        "文本配置": "textConfig",
        "表情": "icon",
        "恭喜玩家": "congratsText",
        "玩家名": "playerName",
        "在副本": "inDungeon",
        "副本名": "dungeonName",
        "获得史诗": "epicText",
        "获得神器": "rareText",
        "获得稀有": "uncommonText",
        "获得特定道具": "specialItemText",
        "合计": "totalText",
        "件数": "countText",
        "件装备": "equipText",
        "奖励前缀": "rewardPrefix",
        "点券": "ceraText",
        "代币": "pointText",
        "金币": "goldText",
        "数量": "amountText",
        "个": "unitText",
        "标题": "title",
        "内容": "content",
        "奖励说明": "rewardNote",
        "史诗装备": "epicEquip",
        "神器装备": "rareEquip",
        "稀有装备": "uncommonEquip"
    },

    // ==================== 配置文件路径 ====================
    configPath: '/plugins/frida/configs/史诗奖励.json',

    // ==================== 状态变量 ====================
    storage: {},
    rewardControl: null,
    specialItemControl: null,
    broadcastConfig: null,
    mailConfig: null,

    // ==================== 初始化 ====================
    init() {
        const self = this;
        self.installDungeonClearHook();
        self.rewardControl = self.CONFIG.rewardControl;
        self.specialItemControl = self.CONFIG.specialItemControl;
        self.broadcastConfig = self.CONFIG.broadcastConfig;
        self.mailConfig = self.CONFIG.mailConfig;
    },

    dispose() {
        this.storage = {};
    },

    // ==================== 事件入口 ====================

    onItemPickup(user, itemPtr, reason) {
        if (reason !== 4) return;

        const characNo = CUserCharacInfo_getCurCharacNo(user);
        const itemId = Inven_Item_getKey(itemPtr);

        const specialControl = this.specialItemControl;
        if (specialControl && specialControl.itemRewards) {
            const itemIdStr = itemId.toString();
            if (specialControl.itemRewards[itemIdStr]) {
                this.handleSpecialItem(user, itemPtr, itemId);
            }
        }

        const itemData = CDataManager_find_item(G_CDataManager(), itemId);
        const rarity = CItem_get_rarity(itemData);
        const inven = CUserCharacInfo_getCurCharacInvenW(user);
        const isEquip = CInventory_GetItemType(inven, itemId) === 1;

        if (!isEquip) return;

        const rarityConfigs = this.rewardControl;
        if (!rarityConfigs) return;

        for (const typeName in rarityConfigs) {
            if (typeName === "rewardNote") continue;

            const typeConfig = rarityConfigs[typeName];
            if (!typeConfig || !typeConfig.rarity) continue;

            if (typeConfig.rarity === rarity && (typeConfig.broadcast || typeConfig.reward)) {
                if (!this.storage[characNo]) {
                    this.storage[characNo] = {};
                }
                if (!this.storage[characNo][typeName]) {
                    this.storage[characNo][typeName] = {
                        items: [],
                        name: api_CUserCharacInfo_getCurCharacName(user),
                        dgn: api_CDungeon_GetDungeonName(getDungeonIdxAfterClear(user))
                    };
                }
                this.storage[characNo][typeName].items.push(itemId);
                break;
            }
        }
    },

    onDungeonLeave(user) {
        this.handleDungeonLeave(user);
    },

    installDungeonClearHook() {
        const self = this;
        Interceptor.attach(ptr(0x085BE178), {
            onEnter(args) {
                const party = args[0];
                for (let i = 0; i < 4; i++) {
                    const user = CParty_get_user(party, i);
                    if (!user.isNull()) {
                        self.handleDungeonLeave(user);
                    }
                }
            }
        });
    },

    // ==================== 消息构建 ====================

    buildChatMessage(parts) {
        const result = [];
        const textConfig = this.broadcastConfig.textConfig;

        for (let i = 0; i < parts.length; i++) {
            const part = parts[i];

            if (part.type === 'icon') {
                result.push(['icon', part.value]);
            } else if (part.type === 'text') {
                const cfg = textConfig[part.key];
                if (cfg) {
                    result.push(['str', cfg[0], cfg[1]]);
                }
            } else if (part.type === 'custom') {
                result.push(['str', part.text, part.color]);
            } else if (part.type === 'item') {
                result.push(['item', part.value]);
            }
        }
        return result;
    },

    sendMessage(user, parts) {
        const message = this.buildChatMessage(parts);
        api_SendHyperLinkChatMsg_emoji(user, message, this.broadcastConfig.msgType, this.broadcastConfig.notifyType);
    },

    sendTitle(user, dungeonName, msgTypeKey) {
        const textConfig = this.broadcastConfig.textConfig;
        const charName = api_CUserCharacInfo_getCurCharacName(user);

        this.sendMessage(user, [
            { type: 'icon', value: textConfig.icon },
            { type: 'text', key: 'congratsText' },
            { type: 'custom', text: '[' + charName + ']', color: textConfig.playerName[1] },
            { type: 'text', key: 'inDungeon' },
            { type: 'custom', text: '[' + dungeonName + ']', color: textConfig.dungeonName[1] },
            { type: 'text', key: msgTypeKey }
        ]);
    },

    sendItemList(user, items, hasReward) {
        const textConfig = this.broadcastConfig.textConfig;
        const treeConfig = this.broadcastConfig.treeConfig;
        const useTree = treeConfig.enabled;

        for (let i = 0; i < items.length; i++) {
            const itemId = items[i];
            const isLast = (i === items.length - 1) && !hasReward;
            const parts = [];

            if (useTree) {
                const nodeConfig = isLast ? treeConfig.endNode : treeConfig.middleNode;
                parts.push({ type: 'custom', text: nodeConfig[0], color: nodeConfig[1] });
            }

            parts.push({ type: 'item', value: itemId });
            this.sendMessage(user, parts);
        }

        const countParts = [];
        if (useTree) {
            const nodeConfig = hasReward ? treeConfig.middleNode : treeConfig.endNode;
            countParts.push({ type: 'custom', text: nodeConfig[0], color: nodeConfig[1] });
        }
        countParts.push({ type: 'text', key: 'totalText' });
        countParts.push({ type: 'custom', text: '[' + items.length + ']', color: textConfig.countText[1] });
        countParts.push({ type: 'text', key: 'equipText' });
        this.sendMessage(user, countParts);
    },

    sendRewardPrefix(user) {
        this.sendMessage(user, [
            { type: 'text', key: 'rewardPrefix' }
        ]);
    },

    // ==================== 奖励发放 ====================

    giveRewards(user, rewards, shouldBroadcast) {
        const textConfig = this.broadcastConfig.textConfig;
        const treeConfig = this.broadcastConfig.treeConfig;
        const useTree = treeConfig.enabled;

        let mailItems = [];
        let mailGold = 0;
        const rewardMessages = [];

        for (let i = 0; i < rewards.length; i++) {
            const [itemId, amount] = rewards[i];

            if (itemId === -1) {
                api_recharge_cash_cera(user, amount);
                rewardMessages.push({ type: 'cera', amount: amount });
            }
            else if (itemId === -2) {
                api_recharge_cash_cera_point(user, amount);
                rewardMessages.push({ type: 'point', amount: amount });
            }
            else if (itemId === -3) {
                mailGold += amount;
                rewardMessages.push({ type: 'gold', amount: amount });
            }
            else {
                mailItems.push([itemId, amount]);
                rewardMessages.push({ type: 'item', itemId: itemId, amount: amount });
            }
        }

        if (mailItems.length > 0 || mailGold > 0) {
            const characNo = CUserCharacInfo_getCurCharacNo(user);
            const title = this.mailConfig.title || "史诗奖励";
            const text = this.mailConfig.content || "恭喜您获得奖励，请查收附件！";

            api_WongWork_CMailBoxHelper_ReqDBSendNewSystemMultiMail(characNo, title, text, mailGold, mailItems);
        }

        if (shouldBroadcast && rewardMessages.length > 0) {
            for (let i = 0; i < rewardMessages.length; i++) {
                const msg = rewardMessages[i];
                const isLast = (i === rewardMessages.length - 1);
                const parts = [];

                if (useTree) {
                    const nodeConfig = isLast ? treeConfig.endNode : treeConfig.middleNode;
                    parts.push({ type: 'custom', text: nodeConfig[0], color: nodeConfig[1] });
                }

                if (msg.type === 'cera') {
                    parts.push({ type: 'text', key: 'ceraText' });
                    parts.push({ type: 'custom', text: '[' + msg.amount + ']', color: textConfig.amountText[1] });
                }
                else if (msg.type === 'point') {
                    parts.push({ type: 'text', key: 'pointText' });
                    parts.push({ type: 'custom', text: '[' + msg.amount + ']', color: textConfig.amountText[1] });
                }
                else if (msg.type === 'gold') {
                    parts.push({ type: 'text', key: 'goldText' });
                    parts.push({ type: 'custom', text: '[' + msg.amount + ']', color: textConfig.amountText[1] });
                }
                else if (msg.type === 'item') {
                    parts.push({ type: 'item', value: msg.itemId });
                    parts.push({ type: 'custom', text: '<' + msg.amount + '>', color: textConfig.amountText[1] });
                    parts.push({ type: 'text', key: 'unitText' });
                }

                this.sendMessage(user, parts);
            }
        }
    },

    // ==================== 特定道具处理 ====================

    handleSpecialItem(user, itemPtr, itemId) {
        const specialControl = this.specialItemControl;
        if (!specialControl.broadcast && !specialControl.reward) return;

        const itemIdStr = itemId.toString();
        const rewards = specialControl.itemRewards[itemIdStr];

        if (!rewards) {
            log_error('[史诗奖励] 未找到道具 {} 的奖励配置', itemId);
            return;
        }

        const charName = api_CUserCharacInfo_getCurCharacName(user);
        const dgnName = api_CDungeon_GetDungeonName(typeof getDungeonIdxAfterClear !== 'undefined' ? getDungeonIdxAfterClear(user) : 0);
        const treeConfig = this.broadcastConfig.treeConfig;
        const useTree = treeConfig.enabled;

        if (specialControl.broadcast) {
            this.sendTitle(user, dgnName, 'specialItemText');

            const parts = [];
            if (useTree) {
                const nodeConfig = !specialControl.reward ? treeConfig.endNode : treeConfig.middleNode;
                parts.push({ type: 'custom', text: nodeConfig[0], color: nodeConfig[1] });
            }
            parts.push({ type: 'item', value: itemPtr });
            this.sendMessage(user, parts);
        }

        if (specialControl.reward) {
            if (specialControl.broadcast) {
                this.sendRewardPrefix(user);
            }
            this.giveRewards(user, rewards, specialControl.broadcast);
        }
    },

    // ==================== 副本结算处理 ====================

    handleDungeonLeave(user) {
        const characNo = CUserCharacInfo_getCurCharacNo(user);
        log_info(`玩家离开${api_CUserCharacInfo_getCurCharacName(user)}离开副本`);
        const characterData = this.storage[characNo];

        if (!characterData) return;

        const rarityConfigs = this.rewardControl;
        if (!rarityConfigs) return;

        for (const typeName in rarityConfigs) {
            if (typeName === "rewardNote") continue;

            const typeConfig = rarityConfigs[typeName];
            const data = characterData[typeName];
            if (!data || data.items.length === 0) continue;

            const count = data.items.length;

            let dropTypeKey;
            if (typeName === "epicEquip") dropTypeKey = "epicText";
            else if (typeName === "rareEquip") dropTypeKey = "rareText";
            else if (typeName === "uncommonEquip") dropTypeKey = "uncommonText";
            else dropTypeKey = "epicText";

            if (typeConfig.broadcast) {
                this.sendTitle(user, data.dgn, dropTypeKey);

                const countStr = count.toString();
                const rewardConfig = typeConfig.rewardConfig[countStr] || typeConfig.rewardConfig["默认奖励"];
                const hasReward = typeConfig.reward && rewardConfig && rewardConfig.length > 0;

                this.sendItemList(user, data.items, hasReward);
            }

            if (typeConfig.reward) {
                const countStr = count.toString();
                const rewardConfig = typeConfig.rewardConfig[countStr] || typeConfig.rewardConfig["默认奖励"];

                if (rewardConfig && rewardConfig.length > 0) {
                    if (typeConfig.broadcast) {
                        this.sendRewardPrefix(user);
                    }
                    this.giveRewards(user, rewardConfig, typeConfig.broadcast);
                }
            }
        }

        delete this.storage[characNo];
    }
};

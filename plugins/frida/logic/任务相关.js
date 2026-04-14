/**
 * 任务相关.js - v1.2 (配置分离版)
 * 功能：一键完成主线、成就、普通、每日任务 + 道具接取指定任务
 * 2026.2.14 By.南瓜
 * 2026.3.25 配置外部化改造
 */

// ==================== 默认配置（外部 JSON 可覆盖） ====================
module.exports = {
    fieldMapping: {
        "是否发放奖励": "ENABLE_REWARD",
        "物品": "ITEMS",
        "任务排除列表": "EXCLUDES",
        "指定完成的每日任务 ID": "DAILY_QUEST_IDS",
        "道具强制接取": "ACCEPT_QUESTS",
        "主线任务完成券": "EPIC",
        "成就任务完成券": "ACHIEVEMENT",
        "普通任务完成券": "COMMON",
        "每日任务完成券": "DAILY",
        "主线": "EPIC",
        "普通": "COMMON",
        "成就": "ACHIEVEMENT"
    },

    // ==================== 配置文件路径 ====================
    configPath: '/plugins/frida/configs/任务相关.json',

    init() {
        const self = this;
        self.itemId = [
            ...Object.values(self.CONFIG.ITEMS),
            ...self.CONFIG.ACCEPT_QUESTS.map(q => q.itemId)
        ];
    },

    UseItem(user, item_id) {
        const questMapping = this.CONFIG.ACCEPT_QUESTS.find(q => q.itemId === item_id);
        if (questMapping) {
            this.accept_quest(user, questMapping.questId, item_id);
            return;
        }
        this.clear_doing(user);
        switch (item_id) {
            case this.CONFIG.ITEMS.EPIC:
                this.clear_batch(user, QUEST_gRADE_EPIC, "主线任务", this.CONFIG.EXCLUDES.EPIC, item_id);
                break;
            case this.CONFIG.ITEMS.ACHIEVEMENT:
                this.clear_batch(user, QUEST_gRADE_ACHIEVEMENT, "成就任务", this.CONFIG.EXCLUDES.ACHIEVEMENT, item_id);
                break;
            case this.CONFIG.ITEMS.COMMON:
                this.clear_batch(user, QUEST_gRADE_COMMON_UNIQUE, "普通任务", this.CONFIG.EXCLUDES.COMMON, item_id);
                break;
            case this.CONFIG.ITEMS.DAILY:
                this.clear_daily(user, item_id);
                break;
            default:
        }
    },

    accept_quest(user, quest_id, refund_item_id) {
        const result = api_auto_accept_quest(user, quest_id);
        if (result) {
        } else {
            api_send_msg(user, `任务接取失败（可能已接取、槽位已满或任务不存在）`, 1);
            if (refund_item_id) {
                api_CUser_AddItem(user, refund_item_id, 1);
            }
        }
    },

    clear_batch(user, qtype, type_name, excludes, refund_item_id) {
        const user_quest = CUser_getCurCharacQuestW(user);
        const clear_mgr = user_quest.add(4);
        const charac_lv = CUserCharacInfo_get_charac_level(user);
        const data_mgr = G_CDataManager();
        
        let count = 0;
        let total_exp = 0, total_gold = 0, total_qp = 0, total_piece = 0;

        for (let qid = 1; qid < 30000; qid++) {
            if (WongWork_CQuestClear_isClearedQuest(clear_mgr, qid)) continue;
            if (excludes.includes(qid)) continue;

            const quest = CDataManager_find_quest(data_mgr, qid);
            if (!quest.isNull()) {
                const grade = quest.add(8).readInt();
                const min_lv = quest.add(0x20).readInt();

                if (grade === qtype && min_lv <= charac_lv) {
                    if (this.CONFIG.ENABLE_REWARD) {
                        const exp_buf = Memory.alloc(4), gold_buf = Memory.alloc(4), qp_buf = Memory.alloc(4), piece_buf = Memory.alloc(4);
                        CUser_quest_basic_reward(user, quest, exp_buf, gold_buf, qp_buf, piece_buf, 1);
                        total_exp += exp_buf.readInt();
                        total_gold += gold_buf.readInt();
                        total_qp += qp_buf.readInt();
                        total_piece += piece_buf.readInt();
                    }
                    WongWork_CQuestClear_setClearedQuest(clear_mgr, qid);
                    count++;
                }
            }
        }

        this.finalize_reward(user, count, type_name, total_exp, total_gold, total_qp, refund_item_id, user_quest);
    },

    clear_daily(user, refund_item_id) {
        const user_quest = CUser_getCurCharacQuestW(user);
        const clear_mgr = user_quest.add(4);
        let count = 0;

        for (let id of this.CONFIG.DAILY_QUEST_IDS) {
            if (WongWork_CQuestClear_isClearedQuest(clear_mgr, id)) continue;
            this.force_clear(user, id);
            count++;
        }

        if (count > 0) {
            this.refresh_ui(user, user_quest);
            api_send_msg(user, `【系统】成功完成 ${count} 个每日任务！`, 1);
        } else {
            api_send_msg(user, "【系统】今日每日任务已全部完成。", 1);
            if (refund_item_id) api_CUser_AddItem(user, refund_item_id, 1);
        }
    },

    finalize_reward(user, count, type_name, exp, gold, qp, refund_id, user_quest) {
        if (count > 0) {
            if (this.CONFIG.ENABLE_REWARD) {
                if (exp > 0) api_CUser_gain_exp_sp(user, exp);
                if (gold > 0) CInventory_gain_money(CUserCharacInfo_getCurCharacInvenW(user), gold, 0, 0, 0);
            }

            if (CUser_get_state(user) === 3) {
                CUser_SendNotiPacket(user, 0, 2, 0);
                CUser_SendNotiPacket(user, 1, 2, 1);
                CUser_SendUpdateItemList(user, 1, 0, 0);
                if (this.CONFIG.ENABLE_REWARD && qp > 0) CUser_sendCharacQp(user);
            }
            this.refresh_ui(user, user_quest);

            let msg = `【系统】${type_name}清理完毕，共完成 ${count} 个任务`;
            if (this.CONFIG.ENABLE_REWARD && (exp > 0 || gold > 0)) {
                api_CUser_SendNotiPacketMessage(user, msg, 14);
                api_CUser_SendNotiPacketMessage(user, `获得经验: ${exp}`, 14);
                api_CUser_SendNotiPacketMessage(user, `获得金币: ${gold}`, 14);
            } else {
                api_send_msg(user, msg, 1);
            }
        } else {
            api_send_msg(user, `【系统】当前没有${type_name}需要清理。`, 1);
            if (refund_id) api_CUser_AddItem(user, refund_id, 1);
        }
    },

    clear_doing(user) {
        const user_quest = CUser_getCurCharacQuestW(user);
        let found = false;
        for (let i = 0; i < 20; i++) {
            const qid = user_quest.add(4 * (i + 7500 + 2)).readInt();
            if (qid > 0) {
                this.force_clear(user, qid);
                found = true;
            }
        }
        if (found) this.refresh_ui(user, user_quest);
    },

    force_clear(user, quest_id) {
        CUser_setGmQuestFlag(user, 1);
        CUser_quest_action(user, 33, quest_id, 0, 0);
        CUser_quest_action(user, 35, quest_id, 0, 0);
        CUser_quest_action(user, 36, quest_id, -1, 1);
        user.add(0x79644).writeInt(0);
        CUser_setGmQuestFlag(user, 0);
    },

    refresh_ui(user, user_quest_ptr) {
        CUser_send_clear_quest_list(user);
        const pg = Memory.alloc(0x20000);
        PacketGuard_PacketGuard(pg);
        UserQuest_get_quest_info(user_quest_ptr, pg);
        CUser_Send(user, pg);
        Destroy_PacketGuard_PacketGuard(pg);
    }
};

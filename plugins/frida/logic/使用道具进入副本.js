/**
 * 使用道具进入副本.js - v2.6.1
  * 功能：使用不同的道具ID进入不同类型的副本
 * 2026.1.27 By.南瓜
 */

// ==================== 配置 ====================
const DUNGEON_MAP = {
    // 道具ID: [副本ID, 难度, 是否深渊(0普通1深渊)]
    202203300:  [2, 0, 0],       // 普通深渊副本
    2021458812: [13005, 1, 0],   // 高难度深渊副本
};

// ==================== 核心模块 ====================
module.exports = {
    itemId: Object.keys(DUNGEON_MAP).map(Number),

    /**
     * 执行入口
     * @param {NativePointer} user 角色指针
     * @param {number} item_id 当前使用的道具ID
     */
    UseItem(user, item_id) {
        const config = DUNGEON_MAP[item_id];
        if (!config) return;

        const [dungeonId, difficult, abyssParam] = config;

        const isInParty = CUser_CheckInParty(user);
        let party = CUser_GetParty(user);

        if (isInParty <= 0) {
            party = CGameManager_GetParty(G_CGameManager());
            CParty_set_single_play(party, user);
        }

        const memberCount = CParty_get_member_count(party);

        if (party && memberCount < 2) {
            CParty_game_start(party, user);
            CParty_dungeon_start(party, ptr(dungeonId), difficult, abyssParam);
            
            log_info(`[副本门票] 角色使用 ${item_id} 进入副本 ${dungeonId}`);
        } else {
            api_send_msg(user, "组队状态下无法进入单人副本", 1);
            
            api_scheduleOnMainThread_delay(() => {
                api_CUser_AddItem(user, item_id, 1);
            }, [], 10); 
        }
    }
};

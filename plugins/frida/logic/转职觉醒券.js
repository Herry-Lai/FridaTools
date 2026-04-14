/**
 * 转职觉醒券.js - v1.0.0
 * 功能：使用指定道具转职到对应职业
 *  * 2026.2.15 By.南瓜
 */

const CONFIG = {
    // growType1: 职业类型 (0-4)
    // growType2: 觉醒状态 (0=未觉醒, 1=一觉, 2=二觉)
    JOB_CHANGE_ITEMS: [
        // 转职（未觉醒）
        { itemId: 1230121, growType1: 0, growType2: 0 },  // 初始职业
        { itemId: 1230132, growType1: 1, growType2: 0 },  // 第一个职业
        { itemId: 1230122, growType1: 2, growType2: 0 },  // 第二个职业
        { itemId: 1230133, growType1: 3, growType2: 0 },  // 第三个职业
        { itemId: 1230134, growType1: 4, growType2: 0 },  // 第四个职业
        
        // 一次觉醒
        { itemId: 1230122, growType1: 1, growType2: 1 },  // 第一个职业一觉
        { itemId: 1230131, growType1: 2, growType2: 1 }, // 第二个职业一觉
        { itemId: 3000103, growType1: 3, growType2: 1 }, // 第三个职业一觉
        { itemId: 1230132, growType1: 4, growType2: 1 },  // 第四个职业一觉
        
        // 二次觉醒
        { itemId: 1230121, growType1: 1, growType2: 2 }, // 第一个职业二觉
        { itemId: 1230131, growType1: 2, growType2: 2 }, // 第二个职业二觉
        { itemId: 3000203, growType1: 3, growType2: 2 }, // 第三个职业二觉
        { itemId: 3000204, growType1: 4, growType2: 2 }  // 第四个职业二觉
    ]
};

module.exports = {
    itemId: CONFIG.JOB_CHANGE_ITEMS.map(item => item.itemId),

    UseItem(user, item_id) {
        const mapping = CONFIG.JOB_CHANGE_ITEMS.find(item => item.itemId === item_id);
        if (!mapping) {
            return;
        }

        this.changeGrowType(user, mapping.growType1, mapping.growType2, item_id);
    },

    changeGrowType(user, growType1, growType2, itemId) {
        // 获取当前状态
        var job = CUserCharacInfo_get_charac_job(user);
        var rawGrowType = CUserCharacInfo_getCurCharFirstGrowType(user);
        var currentGrowType = rawGrowType % 256;
        var currentAwaken = CUserCharacInfo_getCurCharSecondGrowType(user);
        
        log_info(`[转职觉醒券] 当前职业: ${job}, 当前转职: ${currentGrowType}, 当前觉醒: ${currentAwaken}`);
        log_info(`[转职觉醒券] 目标转职: ${growType1}, 目标觉醒: ${growType2}`);
        
        // 检查是否同职业同觉醒
        if (currentGrowType === growType1 && currentAwaken === growType2) {
            api_send_msg(user, "【系统】已经是该职业，无需转职", 1);
            api_CUser_AddItem(user, itemId, 1);
            log_warn(`[转职觉醒券] 同职业转职被拦截 -> 当前:${currentGrowType}-${currentAwaken}`);
            return;
        }
        
        // 检查是否降级（禁止二觉→一觉，一觉→未觉醒）
        //if (currentAwaken > growType2) {
        //    api_send_msg(user, "【系统】无法降级觉醒状态", 1);
        //    api_CUser_AddItem(user, itemId, 1);
        //    log_warn(`[转职觉醒券] 觉醒降级被拦截 -> 当前:${currentAwaken} 目标:${growType2}`);
        //    return;
        //}
        
        // 检查一觉前置条件（未转职不能直接一觉）
        if (growType2 === 1 && currentAwaken === 0 && currentGrowType === 0) {
            api_send_msg(user, "【系统】必须先转职才能觉醒", 1);
            api_CUser_AddItem(user, itemId, 1);
            log_warn(`[转职觉醒券] 未转职使用一觉券被拦截`);
            return;
        }
        
        // 检查二觉前置条件（未觉醒不能直接二觉）
        if (growType2 === 2 && currentAwaken === 0) {
            api_send_msg(user, "【系统】必须先完成一次觉醒才能二次觉醒", 1);
            api_CUser_AddItem(user, itemId, 1);
            log_warn(`[转职觉醒券] 未觉醒使用二觉券被拦截`);
            return;
        }
        
        try {
            // 获取技能相关信息
            var level = CUserCharacInfo_get_charac_level(user);
            var premiumInfo = CUser_GetPremiumInfo(user);
            var skillLevel = level + WongWork_CUserPremium_getOverSkillLevel(premiumInfo);
            var skillSlot = CUserCharacInfo_getCurCharacSkillW(user);
            
            // 执行技能槽检查
            SkillSlot_debugCheckGrowTypeSkill(skillSlot, skillLevel, job, growType1, growType2);
            
            // 执行转职
            CUser_set_grow_type(user, growType1, growType2, 0, 2);
            
            // 后续检查
            _postCheckForceChangeGrowType(user, growType1, growType2);
            
            // 初始化技能树
            CUser_init_skill_tree(user, 0);
            CUser_init_skill_tree(user, 1);
            
            // 发送更新包
            CUser_SendNotiPacket(user, 0, 2, 0);
            CUser_send_skill_info(user);
            CUser_SendNotiPacket(user, 1, 2, 1);
            
        } catch (e) {
            log_crash("转职道具", "转职执行", e);
            api_send_msg(user, "【系统】转职失败，已返还道具", 1);
            api_CUser_AddItem(user, itemId, 1);
        }
    }
};

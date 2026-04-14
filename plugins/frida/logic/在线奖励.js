/**
 * 在线奖励.js - v1.1 (配置分离版 - 嵌套结构)
 * 功能：全服在线泡点/邮件 + 区域限时泡点/邮件
 * 2026.2.14 By.南瓜（已外部化配置）
 * 2026.3.27 适配嵌套 JSON 结构
 */

module.exports = {
    /** 
     * 中文键名映射（框架自动使用）
     * 注意：主框架会递归转换所有中文键名为英文
     */
    fieldMapping: {
        "排除IP列表": "excludeIPs",
        "在线奖励": "online",
        "区域奖励": "region",
        
        "城镇ID": "village",
        "区域ID": "area",
        "活动通知类型": "eventMsgType",
        "泡点": "idle",
        "邮件": "mail",
        
        "开启": "enabled",
        "间隔": "interval",
        "点券": "cera",
        "代币": "ceraPoint",
        "图标": "icon",
        "消息类型": "msgType",
        "开始小时": "startHour",
        "开始分钟": "startMinute",
        "结束小时": "endHour",
        "结束分钟": "endMinute",
        "提前通知分钟": "notifyAhead",
        "提前通知消息": "notifyMsg",
        "开始通知消息": "startMsg",
        "结束通知消息": "endMsg",
        "小时": "hour",
        "分钟": "minute",
        "标题": "title",
        "内容": "content",
        "金币": "gold",
        "物品": "items",
        "发送消息": "sendMsg",

        "在线泡点消息": "message",
        "区域泡点消息": "message",
        "前缀": "prefix",
        "获得": "get",
        "累计获得": "accumulated",
        "在线邮件提示": "onlineMailMsg",
        "区域邮件提示": "regionMailMsg"
    },

    // ==================== 配置文件路径 ====================
    configPath: '/plugins/frida/configs/在线奖励.json',

    init() {
        this.isRunning = true;
        this.instanceId = Math.random().toString(36).slice(2, 6);
        this.timerId = null;
        this.onlineIdleCounter = 0;
        this.onlineMailSentFlag = false;
        this.idleCounter = 0;
        this.accumulatedMap = {};
        this.flags = { mailNotify: false, mailSent: false, idleNotify: false, idleStart: false, idleEnd: false };
        this.startHeartbeat();
    },

    dispose() {
        this.isRunning = false;
        if (this.timerId) {
            api_cancelScheduleOnMainThread(this.timerId);
            this.timerId = null;
        }
    },

    onExit(user) {
        if (user.isNull()) return;
        const charNo = CUserCharacInfo_getCurCharacNo(user);
        if (charNo > 0 && this.accumulatedMap[charNo]) {
            delete this.accumulatedMap[charNo];
        }
    },

    startHeartbeat() {
        if (!this.isRunning) return;
        this.timerId = api_scheduleOnMainThread_delay(() => {
            if (!this.isRunning) return;
            const now = new Date();
            const h = now.getHours();
            const m = now.getMinutes();

            // 每日 0 点重置
            if (h === 0 && m === 0) {
                this.onlineMailSentFlag = false;
                this.flags = { mailNotify: false, mailSent: false, idleNotify: false, idleStart: false, idleEnd: false };
            }

            // ==================== 在线奖励逻辑 ====================
            const oCfg = this.CONFIG.online;
            if (oCfg.idle.enabled) {
                this.onlineIdleCounter++;
                if (this.onlineIdleCounter >= oCfg.idle.interval) {
                    this.processOnlineIdle();
                    this.onlineIdleCounter = 0;
                }
            }
            if (oCfg.mail.enabled && !this.onlineMailSentFlag && h === oCfg.mail.hour && m === oCfg.mail.minute) {
                this.processOnlineMail();
                this.onlineMailSentFlag = true;
            }

            // ==================== 区域奖励逻辑 ====================
            const rCfg = this.CONFIG.region;
            if (rCfg.idle.enabled) {
                const iCfg = rCfg.idle;
                // 提前通知
                if (iCfg.notifyAhead > 0 && !this.flags.idleNotify) {
                    const t = this.getNotifyTime(iCfg.startHour, iCfg.startMinute, iCfg.notifyAhead);
                    if (h === t.h && m === t.m) {
                        api_GameWorld_SendNotiPacketMessage(iCfg.notifyMsg, rCfg.eventMsgType);
                        this.flags.idleNotify = true;
                    }
                }
                if (h === iCfg.startHour && m === iCfg.startMinute && !this.flags.idleStart) {
                    api_GameWorld_SendNotiPacketMessage(iCfg.startMsg, rCfg.eventMsgType);
                    this.flags.idleStart = true;
                }
                if (h === iCfg.endHour && m === iCfg.endMinute && !this.flags.idleEnd) {
                    api_GameWorld_SendNotiPacketMessage(iCfg.endMsg, rCfg.eventMsgType);
                    this.flags.idleEnd = true;
                }

                const nowTime = h * 60 + m;
                const startTime = iCfg.startHour * 60 + iCfg.startMinute;
                const endTime = iCfg.endHour * 60 + iCfg.endMinute;
                if (nowTime >= startTime && nowTime < endTime) {
                    this.idleCounter = (this.idleCounter || 0) + 1;
                    if (this.idleCounter >= iCfg.interval) {
                        this.processRegionIdle();
                        this.idleCounter = 0;
                    }
                } else {
                    this.idleCounter = 0;
                }
            }

            if (rCfg.mail.enabled) {
                const mCfg = rCfg.mail;
                // 提前通知
                if (mCfg.notifyAhead > 0 && !this.flags.mailNotify) {
                    const t = this.getNotifyTime(mCfg.hour, mCfg.minute, mCfg.notifyAhead);
                    if (h === t.h && m === t.m) {
                        api_GameWorld_SendNotiPacketMessage(mCfg.notifyMsg, rCfg.eventMsgType);
                        this.flags.mailNotify = true;
                    }
                }
                if (!this.flags.mailSent && h === mCfg.hour && m === mCfg.minute) {
                    api_GameWorld_SendNotiPacketMessage(mCfg.sendMsg, rCfg.eventMsgType);
                    this.processRegionMail();
                    this.flags.mailSent = true;
                }
            }

            this.startHeartbeat();
        }, [], 1000);
    },

    // ==================== 在线奖励处理 ====================
    processOnlineIdle() {
        const cfg = this.CONFIG.online.idle;
        const excludes = this.CONFIG.excludeIPs;
        let rewardVal = cfg.cera > 0 ? cfg.cera : cfg.ceraPoint;
        let rewardName = cfg.cera > 0 ? "点券" : "代币";
        if (rewardVal <= 0) return;

        let it = api_Gameworld_user_map_begin();
        let end = api_Gameworld_user_map_end();
        while (Gameworld_user_map_not_equal(it, end)) {
            let user = api_Gameworld_user_map_get(it);
            if (CUser_get_state(user) >= 3) {
                let ip = api_CUser_get_public_ip_address(user);
                if (excludes.indexOf(ip) === -1) {
                    let charNo = CUserCharacInfo_getCurCharacNo(user);
                    if (cfg.cera > 0) api_recharge_cash_cera(user, rewardVal);
                    else api_recharge_cash_cera_point(user, rewardVal);

                    let total = (this.accumulatedMap[charNo] || 0) + rewardVal;
                    this.accumulatedMap[charNo] = total;

                    api_SendHyperLinkChatMsg_emoji(user, [
                        ['icon', cfg.icon],
                        ['str', ' 在线奖励每', [135, 206, 250, 255]],
                        ['str', cfg.interval + '秒', [255, 215, 0, 255]],
                        ['str', '获得', [135, 206, 250, 255]],
                        ['str', rewardVal + rewardName, [255, 215, 0, 255]],
                        ['str', '累计获得', [135, 206, 250, 255]],
                        ['str', '[' + total + ']', [0, 255, 127, 255]]
                    ], cfg.msgType, 1);
                }
            }
            api_Gameworld_user_map_next(it);
        }
    },

    processOnlineMail() {
        const cfg = this.CONFIG.online.mail;
        const excludes = this.CONFIG.excludeIPs;
        let it = api_Gameworld_user_map_begin();
        let end = api_Gameworld_user_map_end();
        while (Gameworld_user_map_not_equal(it, end)) {
            let user = api_Gameworld_user_map_get(it);
            if (CUser_get_state(user) >= 3) {
                let ip = api_CUser_get_public_ip_address(user);
                if (excludes.indexOf(ip) === -1) {
                    let charNo = CUserCharacInfo_getCurCharacNo(user);
                    api_WongWork_CMailBoxHelper_ReqDBSendNewSystemMultiMail(charNo, cfg.title, cfg.content, cfg.gold, cfg.items);
                    api_SendHyperLinkChatMsg_emoji(user, [['icon', cfg.icon], ['str', ' 每日在线奖励已发放，请各位在邮箱中查收！', [255, 255, 255, 255]]], cfg.msgType, 1);
                }
            }
            api_Gameworld_user_map_next(it);
        }
    },

    // ==================== 区域奖励处理 ====================
    processRegionIdle() {
        const cfg = this.CONFIG.region.idle;
        const targetVill = this.CONFIG.region.village;
        const targetArea = this.CONFIG.region.area;
        const excludes = this.CONFIG.excludeIPs;
        let rewardVal = cfg.cera > 0 ? cfg.cera : cfg.ceraPoint;
        let rewardName = cfg.cera > 0 ? "点券" : "代币";
        if (rewardVal <= 0) return;

        let it = api_Gameworld_user_map_begin();
        let end = api_Gameworld_user_map_end();
        while (Gameworld_user_map_not_equal(it, end)) {
            let user = api_Gameworld_user_map_get(it);
            if (CUser_get_state(user) >= 3) {
                let ip = api_CUser_get_public_ip_address(user);
                if (excludes.indexOf(ip) === -1) {
                    let vill = CUserCharacInfo_getCurCharacVill(user);
                    let area = CUser_get_area(user, 0);
                    if (vill === targetVill && area === targetArea) {
                        let charNo = CUserCharacInfo_getCurCharacNo(user);
                        if (cfg.cera > 0) api_recharge_cash_cera(user, rewardVal);
                        else api_recharge_cash_cera_point(user, rewardVal);

                        let total = (this.accumulatedMap[charNo] || 0) + rewardVal;
                        this.accumulatedMap[charNo] = total;

                        api_SendHyperLinkChatMsg_emoji(user, [
                            ['icon', cfg.icon],
                            ['str', ' 区域活动每', [135, 206, 250, 255]],
                            ['str', cfg.interval + '秒', [255, 215, 0, 255]],
                            ['str', '获得', [135, 206, 250, 255]],
                            ['str', rewardVal + rewardName, [255, 215, 0, 255]],
                            ['str', '累计获得', [135, 206, 250, 255]],
                            ['str', '[' + total + ']', [0, 255, 127, 255]]
                        ], cfg.msgType, 1);
                    }
                }
            }
            api_Gameworld_user_map_next(it);
        }
    },

    processRegionMail() {
        const cfg = this.CONFIG.region.mail;
        const targetVill = this.CONFIG.region.village;
        const targetArea = this.CONFIG.region.area;
        const excludes = this.CONFIG.excludeIPs;

        let it = api_Gameworld_user_map_begin();
        let end = api_Gameworld_user_map_end();
        while (Gameworld_user_map_not_equal(it, end)) {
            let user = api_Gameworld_user_map_get(it);
            if (CUser_get_state(user) >= 3) {
                let ip = api_CUser_get_public_ip_address(user);
                if (excludes.indexOf(ip) === -1) {
                    let vill = CUserCharacInfo_getCurCharacVill(user);
                    let area = CUser_get_area(user, 0);
                    if (vill === targetVill && area === targetArea) {
                        let charNo = CUserCharacInfo_getCurCharacNo(user);
                        api_WongWork_CMailBoxHelper_ReqDBSendNewSystemMultiMail(charNo, cfg.title, cfg.content, cfg.gold, cfg.items);
                        api_SendHyperLinkChatMsg_emoji(user, [['icon', cfg.icon], ['str', ' 恭喜您在活动区域获得定时奖励，请查收邮件！', [255, 255, 255, 255]]], cfg.msgType, 1);
                    }
                }
            }
            api_Gameworld_user_map_next(it);
        }
    },

    getNotifyTime(h, m, ahead) {
        let targetM = m - ahead;
        let targetH = h;
        if (targetM < 0) {
            targetM += 60;
            targetH = targetH - 1;
            if (targetH < 0) targetH = 23;
        }
        return { h: targetH, m: targetM };
    }
};

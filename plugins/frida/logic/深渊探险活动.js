/**
 * 深渊探险活动.js - v1.2 (配置分离版)
 * 奖励点券、代币说明 (道具 ID 填 -1 为点券，-2 为代币)
 * 2026.2.14 By.南瓜
 * 2026.3.25 配置外部化改造
 */

module.exports = {
    /** 中文键名映射（框架自动递归合并） */
    fieldMapping: {
        "活动开启": "enable",
        "活动期间禁止丢弃": "preventDrop",
        "开放星期": "openDays",
        "消息发送位置": "msgType",
        "时间段": "timeSlots",
        "开始时间": "start",
        "持续时间": "duration",
        "目标物品": "targets",
        "限领次数": "count",
        "奖励列表": "rewards"
    },

    configPath: '/plugins/frida/configs/深渊探险活动.json',

    state: 0,
    timerId: null,
    heartbeatActive: false,
    currentSlot: null,
    startTime: 0,
    lastStartCheck: 0,
    rewardCounts: {},

    init() {
        const self = this;
        self.state = 0;
        self.timerId = null;
        self.heartbeatActive = false;
        self.currentSlot = null;
        self.startTime = 0;
        self.rewardCounts = {};
        self.registerHooks();
        self.startHeartbeat();
    },

    dispose() {
        if (this.timerId) {
            api_cancelScheduleOnMainThread(this.timerId);
            this.timerId = null;
        }
        this.state = 0;
        this.heartbeatActive = false;
        this.lastStartCheck = 0;
    },

    onLogin(user, charNo) {
        if (this.state === 1 && this.currentSlot) {
            api_scheduleOnMainThread_delay(() => {
                if (this.state !== 1) return;
                this.sendLoginNotice(user);
            }, [], 1000);
        }
    },

    startHeartbeat() {
        const self = this;
        if (this.heartbeatActive) return;
        this.heartbeatActive = true;

        const tick = function() {
            if (!self.heartbeatActive) return;
            self.checkTime();
            self.timerId = api_scheduleOnMainThread_delay(tick, [], 1000);
        };
        tick();
    },

    checkTime() {
        if (!this.heartbeatActive || !this.CONFIG || !this.CONFIG.enable) return;
        if (!this.CONFIG.timeSlots || !Array.isArray(this.CONFIG.timeSlots)) return;
        if (!this.CONFIG.openDays || !Array.isArray(this.CONFIG.openDays)) return;

        const now = new Date();
        const curDay = now.getDay() === 0 ? 7 : now.getDay();
        const curHour = now.getHours();
        const curMin = now.getMinutes();
        const curSec = now.getSeconds();
        const nowTs = Math.floor(now.getTime() / 1000);

        if (this.state === 0) {
            if (!this.CONFIG.openDays.includes(curDay)) return;

            for (let i = 0; i < this.CONFIG.timeSlots.length; i++) {
                const slot = this.CONFIG.timeSlots[i];
                if (!slot || !slot.start) continue;
                if (slot.start[0] === curHour && slot.start[1] === curMin && curSec < 5) {
                    if (this.lastStartCheck && (nowTs - this.lastStartCheck) < 60) return;
                    this.lastStartCheck = nowTs;
                    this.startEvent(slot);
                    break;
                }
            }
        } 
        else if (this.state === 1 && this.currentSlot) {
            const endTime = this.startTime + (this.currentSlot.duration * 60);
            const remain = endTime - nowTs;

            if (remain <= 0) {
                this.endEvent();
                return;
            }

            this.processCountdown(remain);
        }
    },

    startEvent(slot) {
        if (this.state === 1 || !this.CONFIG) return;
        
        this.state = 1;
        this.currentSlot = slot;
        this.startTime = Math.floor(Date.now() / 1000);
        
        this.rewardCounts = {};
        if (slot.targets) {
            for (let tid in slot.targets) {
                this.rewardCounts[tid] = slot.targets[tid].count;
            }
        }

        this.broadcast([
            ['str', '◆━━━━━ 深渊探险活动开启 ━━━━━◆', [255, 255, 0, 255]]
        ]);
        this.broadcast([
            ['str', '     活动持续时间：', [255, 255, 0, 255]],
            ['str', `<${slot.duration}>`, [255, 20, 0, 255]],
            ['str', '分钟   祝各位勇士好运！', [255, 255, 0, 255]]
        ]);

        if (this.CONFIG && this.CONFIG.preventDrop) {
            this.broadcast([
                ['str', '        特别提示:活动期间', [255, 255, 0, 255]],
                ['str', '无法丢弃物品', [255, 20, 0, 255]]
            ]);
        }

        this.broadcastSpecifiedItems();
    },

    endEvent() {
        if (this.state === 0) return;

        this.state = 0;
        this.currentSlot = null;
        this.startTime = 0;

        this.broadcast([
            ['str', '【深渊探险活动】已结束， 感谢各位勇士的参与！', [255, 255, 255, 255]]
        ]);

        if (this.CONFIG && this.CONFIG.openDays) {
            const dayNames = ["", "周一", "周二", "周三", "周四", "周五", "周六", "周日"];
            const dayStr = this.CONFIG.openDays.map(d => dayNames[d]).join("、");
            api_GameWorld_SendNotiPacketMessage(`【深渊探险活动】开放日期为: ${dayStr}，敬请期待！`, 14);
        }
    },

    processCountdown(remainSec) {
        if (!this.CONFIG) return;
        
        const min = Math.floor(remainSec / 60);
        const notifyMins = [5, 4, 3, 2, 1];
        
        if (remainSec % 60 === 0 && notifyMins.includes(min)) {
             api_GameWorld_SendNotiPacketMessage(`【深渊探险活动】还剩<${min}>分钟结束！`, 14);
        }

        if (remainSec <= 30 && remainSec > 0 && remainSec % 10 === 0) {
            api_GameWorld_SendNotiPacketMessage(`【深渊探险活动】还剩<${remainSec}>秒结束！`, 14);
        }
    },

    onItemPickup(user, itemPtr, reason) {
        if (!this.currentSlot || this.state !== 1) return;
        if (reason !== 4) return;

        const itemId = Inven_Item_getKey(itemPtr);
        const itemIdStr = itemId.toString();
        const targetCfg = this.currentSlot.targets[itemIdStr];
        if (targetCfg) {
            this.handlePickup(user, itemId, itemIdStr, targetCfg);
        }
    },

    registerHooks() {
        const self = this;

        const DropItem_check_error = new NativeFunction(ptr(0x081C2D9A), 'int', ['pointer', 'pointer', 'pointer', 'pointer'], {"abi": "sysv"});
        Interceptor.replace(ptr(0x081C2D9A), new NativeCallback(function (a1, user, MSG_BASE, a4) {
            if (self.state === 1 && self.CONFIG && self.CONFIG.preventDrop) {
                const item_count = MSG_BASE.add(20).readU16();
                if(item_count >= 1){
                    api_CUser_SendNotiPacketMessage(user, "【深渊活动】活动期间禁止丢弃任何物品！", 14);
                    return 19;
                }
            }
            return DropItem_check_error(a1, user, MSG_BASE, a4);
        }, 'int', ['pointer', 'pointer', 'pointer', 'pointer']));
    },

    handlePickup(user, itemId, itemIdStr, targetCfg) {
        if (!this.CONFIG) return;
        
        const remain = this.rewardCounts[itemIdStr];
        if (remain <= 0) {
            this.sendToUser(user, [
                ['str', '很遗憾 ', [255, 130, 0, 255]],
                ['item', itemId],
                ['str', ' 的奖励次数已达上限', [255, 130, 0, 255]]
            ]);
            return;
        }

        this.rewardCounts[itemIdStr]--;
        const currentRemain = this.rewardCounts[itemIdStr];

        const userName = api_CUserCharacInfo_getCurCharacName(user);

        this.broadcast([['str', '◆━━━━━━ 深渊探险活动 ━━━━━━◆', [255, 255, 0, 255]]]);
        this.broadcast([
            ['str', '恭喜 ', [255, 255, 0, 255]],
            ['str', `[${userName}]`, [255, 20, 0, 255]],
            ['str', ' 获得指定物品：', [255, 255, 0, 255]]
        ]);
        this.broadcast([['str', '★ ', [255, 20, 0, 255]], ['item', itemId]]);
        this.broadcast([['str', '├ 获得奖励：', [255, 255, 0, 255]]]);

        const itemListToSend = [];
        
        targetCfg.rewards.forEach(reward => {
            const rId = reward[0];
            const rCount = reward[1];

            const msgArr = [['str', '│   ★ ', [255, 255, 0, 255]]];

            if (rId === -1) {
                msgArr.push(['str', '[点券]', [0, 191, 255, 255]]);
                api_recharge_cash_cera(user, rCount); 
            } else if (rId === -2) {
                msgArr.push(['str', '[代币]', [0, 191, 255, 255]]);
                api_recharge_cash_cera_point(user, rCount); 
            } else {
                msgArr.push(['item', rId]);
                itemListToSend.push([rId, rCount]); 
            }

            msgArr.push(['str', ' x ', [255, 255, 255, 255]]);
            msgArr.push(['str', `<${rCount}>`, [255, 20, 0, 255]]);
            
            this.broadcast(msgArr);
        });

        if (itemListToSend.length > 0) {
            this.giveItems(user, itemListToSend);
        }

        this.broadcast([
            ['str', '└ 剩余次数：', [255, 255, 0, 255]],
            ['str', `<${currentRemain}>`, [255, 20, 0, 255]],
            ['str', '次', [255, 255, 0, 255]]
        ]);
        this.broadcast([['str', '◆━━━━━━━━━━━━━━━━━━━◆', [255, 255, 0, 255]]]);
    },

    giveItems(user, itemList) {
        if (!itemList || !Array.isArray(itemList) || itemList.length === 0) return;
        
        const charNo = CUserCharacInfo_getCurCharacNo(user);

        itemList.forEach(item => {
            const id = item[0];
            const count = item[1];

            const emptySlots = checkInventorySlot(user, id);

            if (emptySlots >= 1) {
                api_CUser_AddItem(user, id, count);
            } else {
                api_WongWork_CMailBoxHelper_ReqDBSendNewSystemMultiMail(
                    charNo, 
                    "深渊活动奖励补发", 
                    "由于您的背包已满，深渊活动奖励已通过邮件发送，请查收。", 
                    0, 
                    [[id, count]]
                );
                
                this.sendToUser(user, [['str', '（背包已满，奖励已发送至邮件）', [255, 100, 100, 255]]]);
            }
        });
    },

    broadcast(msgArr) {
        if (!this.CONFIG || !msgArr || !Array.isArray(msgArr)) return;
        api_SendHyperLinkChatMsg_emoji(null, msgArr, this.CONFIG.msgType, 0);
    },

    sendToUser(user, msgArr) {
        if (!this.CONFIG || !msgArr || !Array.isArray(msgArr)) return;
        api_SendHyperLinkChatMsg_emoji(user, msgArr, this.CONFIG.msgType, 1);
    },

    broadcastSpecifiedItems(targetUser = null) {
        if (!this.currentSlot || !this.currentSlot.targets) return;

        const send = (msg) => {
            if (targetUser) this.sendToUser(targetUser, msg);
            else this.broadcast(msg);
        };

        send([['str', '◆━━━━━ 本次活动指定道具 ━━━━━◆', [255, 255, 0, 255]]]);

        for (let tid in this.currentSlot.targets) {
            const t = this.currentSlot.targets[tid];
            const remain = this.rewardCounts[tid] !== undefined ? this.rewardCounts[tid] : t.count;
            const itemId = parseInt(tid);

            send([
                ['str', '★ ', [255, 20, 0, 255]], 
                ['item', itemId]
            ]);
            send([['str', '├ 可获奖励：', [255, 255, 0, 255]]]);

            if (!t.rewards || !Array.isArray(t.rewards)) {
                send([['str', '└ 奖励配置错误', [255, 0, 0, 255]]]);
            } else {
                t.rewards.forEach(r => {
                    const rid = r[0];
                    const rcount = r[1];
                    let arr = [['str', '│   ★ ', [0, 191, 255, 255]]];
                    if(rid === -1) arr.push(['str', '[点券]', [0, 191, 255, 255]]);
                    else if(rid === -2) arr.push(['str', '[代币]', [0, 191, 255, 255]]);
                    else arr.push(['item', rid]);

                    arr.push(['str', ' x ', [255, 255, 255, 255]]);
                    arr.push(['str', `<${rcount}>`, [255, 20, 0, 255]]);
                    send(arr);
                });
            }

            send([
                ['str', '└ 剩余次数：', [255, 255, 0, 255]],
                ['str', `<${remain}>`, [255, 20, 0, 255]],
                ['str', '次', [255, 255, 0, 255]]
            ]);
        }
        
        send([['str', '◆━━━━━━━━━━━━━━━━━━━◆', [255, 255, 0, 255]]]);
    },

    sendLoginNotice(user) {
        if (this.state !== 1 || !this.currentSlot || !this.CONFIG) return;

        const endTime = this.startTime + (this.currentSlot.duration * 60);
        const now = Math.floor(Date.now() / 1000);
        const remain = endTime - now;
        const min = Math.floor(remain / 60);
        const sec = remain % 60;

        this.sendToUser(user, [['str', '◆━━━━  深渊探险活动进行中  ━━━━◆', [255, 255, 0, 255]]]);
        this.sendToUser(user, [
            ['str', '              剩余时间: ', [255, 255, 255, 255]],
            ['str', `<${min}>`, [255, 20, 0, 255]],
            ['str', '分', [255, 255, 255, 255]],
            ['str', `<${sec}>`, [255, 20, 0, 255]],
            ['str', '秒', [255, 255, 255, 255]]
        ]);

        if (this.CONFIG && this.CONFIG.preventDrop) {
            this.sendToUser(user, [
                ['str', '      特别提示:活动期间', [255, 255, 0, 255]],
                ['str', '无法丢弃物品', [255, 20, 0, 255]]
            ]);
        }
        
        this.broadcastSpecifiedItems(user);
    }
};

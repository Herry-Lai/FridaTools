/**
 * 怪物攻城系统.js - v2.8 (配置分离版)
 * 2026.1.29 By.南瓜
 * 2026.3.24 配置外部化改造
 */

module.exports = {
    // ==================== 中文键名映射（框架自动递归合并） ====================
    fieldMapping: {
        "活动开启": "enable",
        "开始小时": "startHour",
        "开始分钟": "startMinute",
        "活动持续时间": "totalTime",
        "目标点数": "targetScore",
        "消息发送位置": "msgType",
        "副本难度": "difficulty",
        "开启排名奖励": "enableRankReward",
        "积分兑换点券比例": "rankPointRate",
        "胜利奖励": "victoryReward",
        "金币": "gold",
        "道具": "items",
        "阶段奖励": "stepRewards"
    },

    // ==================== 配置文件路径 ====================
    configPath: '/plugins/frida/configs/怪物攻城.json',

    // ==================== 运行时状态 ====================
    instanceId: null,
    isRunning: false,
    timerId: null,
    state: 3,
    score: 0,
    startTime: 0,
    userPtMap: {},
    defendSuccess: false,
    dailyStarted: false,

    // ==================== 框架生命周期 ====================
    init() {
        const self = this;
        
        self.instanceId = Math.random().toString(36).slice(2, 8);
        self.isRunning = true;

        this.timerId = null;
        this.state = 3;
        this.score = 0;
        this.startTime = 0;
        this.userPtMap = {};
        this.defendSuccess = false;
        this.dailyStarted = false;

        this.applyHooks();
        this.startHeartbeat();
    },

    dispose() {
        this.isRunning = false;
        
        if (this.timerId) {
            api_cancelScheduleOnMainThread(this.timerId);
            this.timerId = null;
        }

        if (this.state === 0) {
            api_scheduleOnMainThread(() => { this.forceEndMonster(); }, null);
        }

        this.userPtMap = null;
    },

    startHeartbeat() {
        if (!this.isRunning) return;

        this.timerId = api_scheduleOnMainThread_delay(() => {
            if (!this.isRunning) return;

            const now = new Date();
            const h = now.getHours();
            const m = now.getMinutes();

            if (h === 0 && m === 0) this.dailyStarted = false;

            if (!this.dailyStarted && h === this.CONFIG.startHour && m === this.CONFIG.startMinute) {
                if (this.state === 3) {
                    this.onEventStart();
                    this.dailyStarted = true;
                }
            }

            if (this.state === 0 && this.getRemainTime() <= 0) {
                this.onEventEnd();
            }

            this.startHeartbeat();
        }, [], 1000);
    },

    // 玩家登录
    onLogin(user, charNo) {
        if (this.state === 0 && this.isRunning) {
            api_scheduleOnMainThread_delay(() => {
                if (!this.isRunning || this.state !== 0) return;
                this.syncUserUI(user); 
            }, [], 2000);
        }
    },

    onEventStart() {
        this.state = 0;
        this.score = 0;
        this.userPtMap = {};
        this.defendSuccess = false;
        this.startTime = api_CSystemTime_getCurSec(); 

        const a3 = Memory.alloc(100);
        a3.add(10).writeInt(this.CONFIG.totalTime);
        a3.add(14).writeInt(0);
        a3.add(18).writeInt(this.CONFIG.targetScore);
        Inter_VillageAttackedStart_dispatch_sig(ptr(0), ptr(0), a3);
        this.set_villageattack_dungeon_difficult(this.CONFIG.difficulty);
        api_GameWorld_SendNotiPacketMessage('<怪物攻城活动> 已开启，奖励多多别忘记参与哦！', this.CONFIG.msgType);
    },

    onEventEnd() {
        if (this.state === 3) return;

        api_scheduleOnMainThread(() => {
            if (this.state === 3) return;
            this.state = 3;

            this.forceEndMonster();

            if (this.defendSuccess) {
                this.processVictoryRewards();
                api_GameWorld_SendNotiPacketMessage('<怪物攻城活动> 防守成功，奖励已发送！', this.CONFIG.msgType);
            } else {
                api_GameWorld_SendNotiPacketMessage('<怪物攻城活动> 防守失败，请勇士们再接再厉！', this.CONFIG.msgType);
            }

            this.userPtMap = {}; 
            context.log_info(`[怪物攻城] 结算完成`);
        }, null);
    },

    processVictoryRewards() {
        const cfg = this.CONFIG;
        
        let it = api_Gameworld_user_map_begin();
        let end = api_Gameworld_user_map_end();
        while (Gameworld_user_map_not_equal(it, end)) {
            let user = api_Gameworld_user_map_get(it);
            if (CUser_get_state(user) >= 3) {
                api_WongWork_CMailBoxHelper_ReqDBSendNewSystemMultiMail(
                    CUserCharacInfo_getCurCharacNo(user), "<怪物攻城>", "防守成功奖励！", 
                    cfg.victoryReward.gold, cfg.victoryReward.items
                );
            }
            api_Gameworld_user_map_next(it);
        }

        let maxPt = 0;
        for (let charNo in this.userPtMap) {
            let pt = this.userPtMap[charNo][1];
            if (pt > maxPt) maxPt = pt;
        }

        let topCandidates = [];
        for (let charNo in this.userPtMap) {
            let [accId, pt] = this.userPtMap[charNo];
            if (pt > 0 && pt === maxPt) {
                topCandidates.push({ charNo, accId, pt });
            }
        }

        if (topCandidates.length > 0) {
            let randomIndex = Math.floor(Math.random() * topCandidates.length);
            let winner = topCandidates[randomIndex];
            
            let name = api_get_charac_name_by_charac_no(winner.charNo);
            let rewardText = "";
            let couponCount = 0;

            if (cfg.enableRankReward) {
                couponCount = winner.pt * cfg.rankPointRate;
                let user = GameWorld_find_user_from_world_byaccid(G_GameWorld(), winner.accId);
                if (!user.isNull()) {
                    api_recharge_cash_cera(user, couponCount);
                }
                rewardText = `，额外获得【${couponCount}】点券奖励！`;
            }

            let msg = `恭喜勇士【${name}】获得积分榜第一名 (${winner.pt}pt)${rewardText}`;
            api_GameWorld_SendNotiPacketMessage(`<怪物攻城活动> ${msg}`, cfg.msgType);
        }
    },
    
    applyHooks() {
        const self = this;
        
        Interceptor.attach(ptr(0x086B4866), {
            onEnter(args) { this.user = args[1]; this.res = args[2].toInt32(); },
            onLeave(retval) {
                if (retval == 0 && this.res && self.isRunning) {
                    const party = CUser_GetParty(this.user);
                    if (!party.isNull()) {
                        for (let i = 0; i < 4; i++) {
                            const u = CParty_get_user(party, i);
                            if (!u.isNull()) self.sendStepMail(u);
                        }
                    }
                }
            }
        });

        Interceptor.attach(ptr(0x086B330A), {
            onEnter(args) { this.user = args[1]; this.res = args[2].toInt32(); },
            onLeave(retval) {
                if (this.res == 1 && self.state === 0 && self.isRunning) {
                    const party = CUser_GetParty(this.user);
                    if (party.isNull()) return;
                    for (let i = 0; i < 4; i++) {
                        const u = CParty_get_user(party, i);
                        if (!u.isNull()) {
                            const cNo = CUserCharacInfo_getCurCharacNo(u).toString();
                            if (!self.userPtMap[cNo]) self.userPtMap[cNo] = [CUser_get_acc_id(u), 0];
                            self.userPtMap[cNo][1] += 1;
                            self.syncUserUI(u);
                        }
                    }
                    self.score += 1;
                    self.broadcastScore();
                    if (self.score >= self.CONFIG.targetScore) {
                        self.defendSuccess = true;
                        self.onEventEnd();
                    }
                }
            }
        });
    },

    broadcastScore() {
        const packet = api_PacketGuard_PacketGuard();
        InterfacePacketBuf_put_header(packet, 0, 247);
        InterfacePacketBuf_put_int(packet, this.getRemainTime());
        InterfacePacketBuf_put_int(packet, this.score);
        InterfacePacketBuf_put_int(packet, this.CONFIG.targetScore);
        InterfacePacketBuf_finalize(packet, 1);
        GameWorld_send_all(G_GameWorld(), packet);
        Destroy_PacketGuard_PacketGuard(packet);
    },

    syncUserUI(user) {
        const cNo = CUserCharacInfo_getCurCharacNo(user).toString();
        const pt = this.userPtMap[cNo] ? this.userPtMap[cNo][1] : 0;
        const packet = api_PacketGuard_PacketGuard();
        InterfacePacketBuf_put_header(packet, 0, 248);
        InterfacePacketBuf_put_int(packet, this.getRemainTime());
        InterfacePacketBuf_put_int(packet, this.score);
        InterfacePacketBuf_put_int(packet, this.CONFIG.targetScore);
        InterfacePacketBuf_put_int(packet, pt);
        InterfacePacketBuf_finalize(packet, 1);
        CUser_Send(user, packet);
        Destroy_PacketGuard_PacketGuard(packet);
    },

    sendStepMail(user) {
        const charNo = CUserCharacInfo_getCurCharacNo(user).toString();
        const pt = this.userPtMap[charNo] ? this.userPtMap[charNo][1] : 0;
        
        const r = this.CONFIG.stepRewards[pt] || this.CONFIG.stepRewards.default;
        const retitem = find_item(r[0]);
        if (!retitem) return;

        const invenPr = Memory.alloc(100);
        Inven_Item(invenPr);
        invenPr.add(2).writeInt(GetItem_index(retitem));
        invenPr.add(7).writeInt(r[1]);
        const titleStr = "怪物攻城奖励";
        const contentStr = `恭喜！获得 (${pt})PT，这是您本次的击退奖励。`;

        const titlePtr = Memory.allocUtf8String(titleStr);
        const contentPtr = Memory.allocUtf8String(contentStr);
        const contentLen = strlen(contentPtr); 

        WongWork_CMailBoxHelper_ReqDBSendNewSystemMail(titlePtr, invenPr, 0, 
            CUserCharacInfo_getCurCharacNo(user),
            contentPtr, 
            contentLen,
            30, 
            CUser_GetServerGroup(user), 
            0, 
            0
        );
    },

    set_villageattack_dungeon_difficult(difficult) {
        Memory.protect(ptr(0x085B9605), 4, 'rwx');
        ptr(0x085B9605).writeInt(difficult);
    },

    getRemainTime() {
        const r = (this.startTime + this.CONFIG.totalTime) - api_CSystemTime_getCurSec();
        return r > 0 ? r : 0;
    },

    forceEndMonster() {
        village_attacked_CVillageMonsterMgr_OnDestroyVillageMonster(GlobalData_s_villageMonsterMgr.readPointer(), 2);
    }
};
/**
 * 史诗竞赛.js - v1.1
 * 
 * 功能: 史诗竞赛系统（总数/单次）
 * 2026.3.28 配置外部化
 * By.南瓜
 */

module.exports = {
    // ==================== 配置文件路径 ====================
    configPath: '/plugins/frida/configs/史诗大比拼.json',

    // 竞赛全局状态
    epicRaceData: null,

    init() {
        // 防御性检查 CONFIG
        if (!this.CONFIG || !this.CONFIG['史诗竞赛配置']) {
            log_error('[史诗竞赛] 配置加载失败！请检查文件路径和 JSON 格式: {}', this.configPath);
            return;
        }

        this.epicRaceData = {
            initialized: true,
            raceActive: false,
            raceType: '',           // '总数' 或 '单次'
            raceStartTime: 0,
            raceDuration: 0,
            records: {},
            tempStorage: {}
        };

        // 检查是否有正在进行的竞赛，恢复结束定时器
        const state = this.epicRaceData;
        if (state.raceActive && state.raceStartTime > 0) {
            const now = Date.now();
            const elapsed = now - state.raceStartTime;
            const remaining = (state.raceDuration * 60 * 1000) - elapsed;
            if (remaining > 0) {
                api_scheduleOnMainThread_delay(() => this.endRace(), [], remaining);
            } else {
                this.endRace();
            }
        }

        this.startRaceTimer();
    },

    // ==================== 史诗拾取 ====================
    onItemPickup(user, itemPtr, reason) {
        if (reason !== 4) return;
        const itemId = Inven_Item_getKey(itemPtr);
        const itemData = CDataManager_find_item(G_CDataManager(), itemId);
        if (!itemData) return;
        const rarity = CItem_get_rarity(itemData);
        const isEquip = api_Get_ItemType(itemId) === 1;
        if (isEquip && rarity === 4) {
            this.recordEpicForRace(user, 1, 'pickup');
        }
    },

    // ==================== 副本离开 ====================
    onDungeonLeave(user) {
        const characNo = CUserCharacInfo_getCurCharacNo(user);
        const epicCount = this.epicRaceData.tempStorage[characNo] || 0;
        this.recordEpicForRace(user, epicCount, 'leave');
        delete this.epicRaceData.tempStorage[characNo];
    },

    /**
     * 启动竞赛定时器（每分钟检查一次）
     */
    startRaceTimer() {
        const self = this;
        function checkRaceStart() {
            const date = new Date();
            const hour = date.getHours();
            const minute = date.getMinutes();
            const second = date.getSeconds();
            const nowMs = date.getTime();

            // 下一次整分钟执行
            const nextTime = 60000 - (nowMs % 60000);
            //log_info('[史诗竞赛][定时器] 当前服务器时间 {}:{}:{}，下次检查剩余 {} 毫秒', hour, minute, second, nextTime);

            api_scheduleOnMainThread_delay(checkRaceStart, [], nextTime);

            const cfg = self.CONFIG['史诗竞赛配置'];
            if (!cfg['活动开启']) {
                return;
            }

            // 总数竞赛检查
            const sumCfg = cfg['总数竞赛'];
            if (sumCfg && sumCfg['启用']) {
                const targetH = sumCfg['开始时间']['小时'];
                const targetM = sumCfg['开始时间']['分钟'];
                const match = (hour === targetH && minute === targetM);
                //log_info('[史诗竞赛][总数竞赛] 目标时间 {}:{}，当前 {}:{}:{}，条件是否满足: {}', targetH, targetM, hour, minute, second, match);
                if (match) {
                    self.startRace('总数');
                }
            }

            // 单次竞赛检查
            const onceCfg = cfg['单次竞赛'];
            if (onceCfg && onceCfg['启用']) {
                const targetH = onceCfg['开始时间']['小时'];
                const targetM = onceCfg['开始时间']['分钟'];
                const match = (hour === targetH && minute === targetM);
                //log_info('[史诗竞赛][单次竞赛] 目标时间 {}:{}，当前 {}:{}:{}，条件是否满足: {}', targetH, targetM, hour, minute, second, match);
                if (match) {
                    self.startRace('单次');
                }
            }
        }
        checkRaceStart();
    },

    /**
     * 格式化持续时间
     */
    formatDuration(minutes) {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return (hours > 0 ? hours + '小时' : '') + (mins > 0 ? mins + '分钟' : '0分钟');
    },

    /**
     * 启动竞赛（新增防重复保护）
     */
    startRace(type) {
        const cfg = this.CONFIG['史诗竞赛配置'];
        const typeCfg = type === '总数' ? cfg['总数竞赛'] : cfg['单次竞赛'];
        const state = this.epicRaceData;

        // 防重复启动
        if (state.raceActive) {
            return;
        }

        state.raceActive = true;
        state.raceType = type;
        state.raceStartTime = Date.now();
        state.raceDuration = typeCfg['持续时间'];
        state.records = {};
        state.tempStorage = {};

        const durationStr = this.formatDuration(typeCfg['持续时间']);
        const typeName = type === '总数' ? '总数' : '单次数量最高';

        // 延迟 3 秒全服播报
        api_scheduleOnMainThread_delay(() => {
            api_GameWorld_SendNotiPacketMessage('=============史诗大比拼开始啦=============', 3);
            api_GameWorld_SendNotiPacketMessage(`接下来的<${durationStr}>内,获得史诗个数${typeName}的前三名可以获得奖励哦,大家加油吧!`, 3);
        }, [], 3000);

        // 设置结束定时器
        api_scheduleOnMainThread_delay(() => this.endRace(), [], typeCfg['持续时间'] * 60 * 1000);
    },

    /**
     * 记录史诗数量
     */
    recordEpicForRace(user, num, mode) {
        const state = this.epicRaceData;
        if (!state.raceActive) return;

        // 白名单检查
        const whitelist = this.CONFIG['史诗竞赛配置']['白名单控制'];
        if (whitelist['启用']) {
            const currentUid = CUser_get_acc_id(user);
            if (whitelist['允许账号'].indexOf(currentUid) === -1) return;
        }

        const charNo = CUserCharacInfo_getCurCharacNo(user);
        const userName = api_CUserCharacInfo_getCurCharacName(user);
        let record = state.records[charNo] || { charNo, userName, nowNum: 0 };

        if (state.raceType === '总数') {
            if (mode !== 'pickup') return;
            record.nowNum += num;
            state.records[charNo] = record;
            api_CUser_SendNotiPacketMessage(user, `您当前史诗总数：${record.nowNum}个`, 3);
        } else if (state.raceType === '单次') {
            if (mode !== 'leave' || num <= 0) return;
            const oldMax = record.nowNum;
            if (num > oldMax) {
                record.nowNum = num;
                state.records[charNo] = record;
                api_CUser_SendNotiPacketMessage(user, `<单次竞赛>恭喜!刷新记录:<${num}>个(原:${oldMax}个)`, 3);
            } else {
                api_CUser_SendNotiPacketMessage(user, `<单次竞赛>本次<${num}>个,最高记录<${oldMax}个>`, 3);
            }
        }
    },

    /**
     * 结束竞赛并发放奖励
     */
    endRace() {
        const state = this.epicRaceData;
        const cfg = this.CONFIG['史诗竞赛配置'];
        const typeCfg = state.raceType === '总数' ? cfg['总数竞赛'] : cfg['单次竞赛'];

        state.raceActive = false;
        state.raceStartTime = 0;
        state.raceDuration = 0;

        const typeName = state.raceType === '总数' ? '总数' : '单次';
        api_GameWorld_SendNotiPacketMessage(`史诗大比拼<${typeName}>时间到,开始进行奖励计算!`, 3);

        const recordList = Object.values(state.records);
        recordList.sort((a, b) => b.nowNum - a.nowNum);

        if (recordList.length === 0) {
            api_GameWorld_SendNotiPacketMessage('非常可惜，无人获得奖励!', 3);
        } else {
            const rankNames = ['第一名', '第二名', '第三名'];
            const rewards = typeCfg['奖励配置'];

            const topThree = recordList.slice(0, 3);
            for (let i = 0; i < topThree.length; i++) {
                const record = topThree[i];
                const rewardCfg = rewards[i];
                if (rewardCfg) {
                    api_GameWorld_SendNotiPacketMessage(`玩家<${record.userName}>获得${rankNames[i]},史诗数量:${record.nowNum}个`, 3);
                    api_WongWork_CMailBoxHelper_ReqDBSendNewSystemMultiMail(
                        record.charNo,
                        "史诗大比拼",
                        `恭喜您,您是史诗大比拼${rankNames[i]}!`,
                        0,
                        rewardCfg['奖励']
                    );
                }
            }
            api_GameWorld_SendNotiPacketMessage('史诗大比拼奖励已发放,大家玩的开心!', 3);
        }
    },

    dispose() {
        // 清理状态
        this.epicRaceData = null;
    }
};

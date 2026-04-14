/**
 * 悬赏模块.js - v1.2
 * 2026.2.6 By.南瓜
 * 2026.4.13 配置外部化
 */

module.exports = {

    fieldMapping: {
        "是否开启":   "isEnable",
        "开始时间":   "startTime",
        "结束时间":   "endTime",
        "奖励播报位置": "broadcastChannel",
        "查询播报位置": "queryChannel",
        "图标":       "icons",
        "完成图标":   "completed",
        "未完成图标": "uncompleted",
        "播报图标":   "broadcast",
        "悬赏目标":   "target",
        "类型":       "type",
        "描述":       "des",
        "奖励":       "reward"
    },

    configPath: '/plugins/frida/configs/悬赏模块.json',

    // ==================== 事件钩子 ====================

    onItemPickup(user, itemPtr, reason) {
        if (!this.isOpen()) return;
        if (reason === 4) {
            const itemId = Inven_Item_getKey(itemPtr);
            if (this.CONFIG.target[itemId.toString()]) {
                this.handleTrigger(user, itemId, 'equ', itemPtr);
            }
        }
    },

    onLogin(user) {
        const self = this;
        if (!self.isOpen()) return;
        api_scheduleOnMainThread_delay(() => {
            api_CUser_SendNotiPacketMessage(user, `【悬赏活动】进行中！截止时间：${self.CONFIG.endTime}`, self.CONFIG.queryChannel);
            api_CUser_SendNotiPacketMessage(user, '【悬赏活动】在聊天框发言「查询悬赏」可查看进度与奖励', self.CONFIG.queryChannel);
        }, [], 2000);
    },

    // ==================== 初始化 ====================

    init() {
        const self = this;

        // 建表
        if (typeof mysql_frida !== 'undefined' && mysql_frida) {
            api_MySQL_exec(mysql_frida, `CREATE TABLE IF NOT EXISTS offer_reward_record (
                record_id int not null AUTO_INCREMENT,
                date      datetime NOT NULL,
                cid       int NOT NULL,
                targetid  int NOT NULL,
                type      varchar(255) not null default "equ",
                PRIMARY KEY (record_id),
                INDEX idx_date (date)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8;`);
        }

        // 发言查询
        Interceptor.attach(ptr(0x086C9638), {
            onEnter(args) {
                const user   = args[1];
                const reason = args[2].toInt32();
                const msg    = args[3].readUtf8String(-1);
                if (reason === 3 && msg === '查询悬赏') {
                    api_scheduleOnMainThread_delay(self.handleQuery.bind(self), [user], 1);
                }
            }
        });

        // 通关副本
        Interceptor.attach(ptr(0x085BE178), {
            onEnter(args) {
                if (!self.isOpen()) return;
                const party   = args[0];
                const Manager = CParty_getManager(party);
                if (Manager.isNull()) return;

                const field = party.add(2852);
                const dgnId = CBattle_Field_get_dungeon_index(field);
                if (self.CONFIG.target[dgnId.toString()]) {
                    self.handleTrigger(Manager, dgnId, 'dgn');
                }
            }
        });
    },

    // ==================== 完成悬赏 ====================

    handleTrigger(user, targetId, type, itemPtr = null) {
        if (this.checkIsFinished(targetId, type)) return;

        const info = this.CONFIG.target[targetId.toString()];
        if (!info || info.type !== type) return;

        const charName = api_CUserCharacInfo_getCurCharacName(user);
        const charNo   = CUserCharacInfo_getCurCharacNo(user);

        // 构造悬赏目标显示
        let targetDisplay;
        if (type === 'equ') {
            targetDisplay = ['item', itemPtr ? itemPtr : parseInt(targetId)];
        } else {
            targetDisplay = ['str', `[${api_CDungeon_GetDungeonName(targetId)}]`, [255, 215, 0, 255]];
        }

        // 全服播报
        const rewards = info.reward || [];

        api_SendHyperLinkChatMsg_emoji(user, [
            ['icon', this.CONFIG.icons.broadcast],
            ['str', ' 恭喜玩家', [210, 105, 30, 255]],
            ['str', `[${charName}]`, [0, 136, 255, 255]],
            ['str', ' 完成悬赏：', [210, 105, 30, 255]],
            targetDisplay
        ], this.CONFIG.broadcastChannel, 0);

        // 发放奖励（静默）
        if (rewards.length > 0) {
            rewards.forEach(([id, amount]) => {
                if (id === -1) {
                    api_recharge_cash_cera(user, amount);
                } else if (id === -2) {
                    api_recharge_cash_cera_point(user, amount);
                } else {
                    api_CUser_AddItem(user, id, amount);
                }
            });
        }

        // 落库
        api_MySQL_exec(mysql_frida, `INSERT INTO offer_reward_record (date, cid, targetid, type) VALUES (NOW(), ${charNo}, ${targetId}, '${type}')`);
    },

    // ==================== 查询进度 ====================

    handleQuery(user) {
        if (!this.isOpen()) {
            api_CUser_SendNotiPacketMessage(user, '【悬赏】当前不在活动时间内！', this.CONFIG.queryChannel);
            return;
        }

        const records = this.loadRecords();

        api_CUser_SendNotiPacketMessage(user, `---------- 悬赏进度（截止 ${this.CONFIG.endTime}）----------`, this.CONFIG.queryChannel);

        for (const tid in this.CONFIG.target) {
            const info     = this.CONFIG.target[tid];
            const targetId = parseInt(tid);

            let icon   = this.CONFIG.icons.uncompleted;
            let mark   = '○';
            let winner = '<未完成>';
            let color  = [255, 80, 80, 255];

            const match = records.find(r => r.targetid == targetId && r.type == info.type);
            if (match) {
                icon   = this.CONFIG.icons.completed;
                mark   = '●';
                winner = `<${api_get_charac_name_by_charac_no(match.cid)}>`;
                color  = [0, 136, 255, 255];
            }

            const targetDisplay = (info.type === 'equ')
                ? ['item', targetId]
                : ['str', '[' + api_CDungeon_GetDungeonName(targetId) + ']', [244, 0, 123, 255]];

            // 悬赏条目行
            api_SendHyperLinkChatMsg_emoji(user, [
                ['icon', icon],
                ['str', ` ${mark} `, [255, 255, 0, 255]],
                ['str', (info.des || '悬赏') + ' ', [150, 255, 30, 255]],
                targetDisplay,
                ['str', ' - ', [255, 255, 0, 255]],
                ['str', winner, color]
            ], this.CONFIG.queryChannel, 1);

            // 奖励树形预览
            (info.reward || []).forEach(([id, amount], idx) => {
                const isLast  = idx === (info.reward || []).length - 1;
                const treeTip = isLast ? '    └─ ' : '    ├─ ';
                const treeClr = [200, 200, 200, 255];

                if (id === -1) {
                    api_SendHyperLinkChatMsg_emoji(user, [
                        ['str', treeTip, treeClr],
                        ['str', `点券 × ${amount}`, [255, 180, 0, 255]]
                    ], this.CONFIG.queryChannel, 1);
                } else if (id === -2) {
                    api_SendHyperLinkChatMsg_emoji(user, [
                        ['str', treeTip, treeClr],
                        ['str', `代币 × ${amount}`, [100, 220, 255, 255]]
                    ], this.CONFIG.queryChannel, 1);
                } else {
                    api_SendHyperLinkChatMsg_emoji(user, [
                        ['str', treeTip, treeClr],
                        ['item', id],
                        ['str', ` × ${amount}`, [255, 255, 255, 255]]
                    ], this.CONFIG.queryChannel, 1);
                }
            });
        }

        api_CUser_SendNotiPacketMessage(user, ' --------------------------------------- ', this.CONFIG.queryChannel);
    },

    // ==================== 工具方法 ====================

    isOpen() {
        if (!this.CONFIG.isEnable) return false;
        const now   = new Date().getTime();
        const start = this.safeParse(this.CONFIG.startTime);
        const end   = this.safeParse(this.CONFIG.endTime);
        return (now >= start && now <= end);
    },

    safeParse(str) {
        const t = str.split(/[- :]/);
        if (t.length < 5) return 0;
        return new Date(t[0], t[1]-1, t[2], t[3], t[4], t[5] || 0).getTime();
    },

    checkIsFinished(tid, type) {
        const sql = `SELECT 1 FROM offer_reward_record WHERE date >= '${this.CONFIG.startTime}' AND date < '${this.CONFIG.endTime}' AND targetid = ${tid} AND type = '${type}' LIMIT 1`;
        if (api_MySQL_exec(mysql_frida, sql)) {
            return MySQL_get_n_rows(mysql_frida) > 0;
        }
        return false;
    },

    loadRecords() {
        let list = [];
        const sql = `SELECT cid, targetid, type FROM offer_reward_record WHERE date >= '${this.CONFIG.startTime}' AND date < '${this.CONFIG.endTime}'`;
        if (api_MySQL_exec(mysql_frida, sql)) {
            const rows = MySQL_get_n_rows(mysql_frida);
            for (let i = 0; i < rows; i++) {
                MySQL_fetch(mysql_frida);
                list.push({
                    cid:      api_MySQL_get_str(mysql_frida, 0),
                    targetid: api_MySQL_get_str(mysql_frida, 1),
                    type:     api_MySQL_get_str(mysql_frida, 2)
                });
            }
        }
        return list;
    }
};

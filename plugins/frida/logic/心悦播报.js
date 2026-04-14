/**
 * 心悦播报.js - v2.0
 * 功能：心悦会员登录全服播报系统
 * 2026.3.8 By.南瓜
 * 2026.4.13 配置外部化
 */

module.exports = {

    fieldMapping: {
        "心悦等级任务ID": "questRanks",
        "等级图标": "rankIcons",
        "等级颜色": "rankColors",
        "播报配置": "broadcast",
        "主图标": "icon",
        "消息类型": "msgType",
        "名称颜色": "nameColor",
        "前缀": "prefix",
        "后缀": "suffix"
    },

    configPath: '/plugins/frida/configs/心悦播报.json',

    onLogin(user) {
        const self = this;
        api_scheduleOnMainThread_delay(() => {
            self._broadcast(user);
        }, [], 1000);
    },

    _getHighestRank(questClear) {
        const questRanks = this.CONFIG.questRanks;
        let highestRank = 0;
        for (const questID in questRanks) {
            if (WongWork_CQuestClear_isClearedQuest(questClear, parseInt(questID))) {
                highestRank = Math.max(highestRank, questRanks[questID]);
            }
        }
        return highestRank;
    },

    _broadcast(user) {
        try {
            const questClear  = CUser_getCurCharacQuestW(user).add(4);
            const highestRank = this._getHighestRank(questClear);
            if (highestRank <= 0) return;

            const charName  = api_CUserCharacInfo_getCurCharacName(user);
            const rankColor = this.CONFIG.rankColors[highestRank] || [104, 237, 161, 255];
            const rankIcon = this.CONFIG.rankIcons[highestRank]  || 48;
            const bc = this.CONFIG.broadcast;

            const msgArray = [
                ['icon', bc.icon],
                ['str', ' ' + bc.prefix, rankColor],
                ['icon', rankIcon],
                ['str', '  [' + charName + ']', bc.nameColor],
                ['str', bc.suffix, rankColor]
            ];

            api_SendHyperLinkChatMsg_emoji(user, msgArray, bc.msgType, 0);
        } catch (e) {
            log_error('[心悦播报] 播报失败: {}', e.message);
        }
    }
};

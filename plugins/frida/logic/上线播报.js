/**
 * 上线播报.js - v1.2 (配置分离版 - 全中文键名)
 * 
 * 功能：战力榜榜单玩家上线播报系统（支持战力榜 / 普通模式）
 * 2026.3.27 配置外部化改造
 * By.南瓜
 */

module.exports = {
    // ==================== 配置文件路径 ====================
    configPath: '/plugins/frida/configs/上线播报.json',

    powerDbConnection: null,
    currentPowerConfig: null,
    rankCache: new Map(),

    init() {
        if (!this.initPowerDatabase()) {
            log_error('[上线播报] 战力数据库初始化失败');
            return;
        }
    },

    /**
     * 初始化战力数据库连接
     */
    initPowerDatabase() {
        const selection = this.CONFIG['上线播报配置']['当前选择'];
        const dbConfig = this.CONFIG['上线播报配置']['战力数据库配置'][selection];
        
        if (!dbConfig) {
            log_error('[上线播报] 无效的数据库选择: {}', selection);
            return false;
        }
        
        try {
            this.powerDbConnection = api_MYSQL_open(dbConfig["数据库名"], '127.0.0.1', 3306, 'game', 'uu5!^%jg');
            
            if (this.powerDbConnection) {
                this.currentPowerConfig = dbConfig;
                return true;
            } else {
                log_error('[上线播报] 战力数据库连接失败: {}', dbConfig["数据库名"]);
                return false;
            }
        } catch (e) {
            log_error('[上线播报] 战力数据库连接异常: {}', e.message);
            return false;
        }
    },

    /**
     * 获取角色战力值
     */
    getRankPower(charac_no) {
        if (!this.powerDbConnection || !this.currentPowerConfig) {
            return 0;
        }
        
        const power = this.currentPowerConfig;
        const query = "SELECT `" + power["字段名"] + "` FROM `" + power["表名"] + "` WHERE `" + power["条件字段"] + "`='" + charac_no + "'";
        
        try {
            if (api_MySQL_exec(this.powerDbConnection, query)) {
                const rows = MySQL_get_n_rows(this.powerDbConnection);
                
                if (rows == 1) {
                    MySQL_fetch(this.powerDbConnection);
                    const value = api_MySQL_get_str(this.powerDbConnection, 0);
                    return parseInt(value) || 0;
                }
            }
        } catch (e) {
            log_error('[上线播报] 战力查询失败: {}', e.message);
        }
        
        return 0;
    },

    /**
     * 获取全服排名
     */
    getServerRanking(charac_no) {
        if (!this.powerDbConnection || !this.currentPowerConfig) {
            return 0;
        }
        
        const myPower = this.getRankPower(charac_no);
        if (myPower === 0) return 0;
        
        const power = this.currentPowerConfig;
        const query = "SELECT COUNT(*) FROM `" + power["表名"] + "` WHERE `" + power["字段名"] + "` > " + myPower;
        
        try {
            if (api_MySQL_exec(this.powerDbConnection, query)) {
                if (MySQL_get_n_rows(this.powerDbConnection) == 1) {
                    MySQL_fetch(this.powerDbConnection);
                    const higherCount = parseInt(api_MySQL_get_str(this.powerDbConnection, 0)) || 0;
                    return higherCount + 1; 
                }
            }
        } catch (e) {
            log_error('[上线播报] 排名查询失败: {}', e.message);
        }
        
        return 0;
    },

    /**
     * 获取排名配置
     */
    getRankDisplay(ranking) {
        const rankConfig = this.CONFIG['上线播报配置']['排名显示配置'];
        if (rankConfig[ranking]) {
            const cfg = rankConfig[ranking];
            return {
                text: cfg["文本"],
                color: cfg["颜色"]
            };
        }
        return {
            text: ranking.toString(),
            color: [255, 255, 255, 255]
        };
    },

    /**
     * 发送上线播报
     */
    broadcastLogin(user, charNo) {
        // 统一排除名单检查（两种模式均生效）
        const excludeList = this.CONFIG['上线播报配置']['排除名单'];
        if (excludeList.includes(parseInt(charNo))) {
            return;
        }

        const mode = this.CONFIG['上线播报配置']['播报模式'];
        const broadcast = this.CONFIG['上线播报配置']['播报配置'];
        const charName = api_CUserCharacInfo_getCurCharacName(user);

        if (mode === "战力榜") {
            const ranking = this.getServerRanking(charNo);
            if (ranking === 0 || ranking > this.CONFIG['上线播报配置']['播报前N名']) {
                return;
            }

            const InvenW = CUserCharacInfo_getCurCharacInvenW(user);
            const weaponItem = CInventory_GetInvenRef(InvenW, INVENTORY_TYPE_BODY, 10);
            const weaponId = Inven_Item_getKey(weaponItem);
            const hasWeapon = weaponId > 0;

            const rankDisplay = this.getRankDisplay(ranking);

            let msgArray = [
                ['icon', broadcast["图标"]],
                ['str', broadcast["消息列表"][0]["文本"], broadcast["消息列表"][0]["颜色"]],
                ['str', rankDisplay.text, rankDisplay.color],
                ['str', broadcast["消息列表"][1]["文本"], broadcast["消息列表"][1]["颜色"]],
                ['str', `[${charName}]`, broadcast["角色名颜色"]]
            ];

            if (hasWeapon) {
                msgArray.push(['str', broadcast["消息列表"][2]["文本"], broadcast["消息列表"][2]["颜色"]]);
                msgArray.push(['item', weaponItem]);
            }

            msgArray.push(['str', broadcast["消息列表"][3]["文本"], broadcast["消息列表"][3]["颜色"]]);

            api_SendHyperLinkChatMsg_emoji(user, msgArray, broadcast["消息类型"], 0);
            this.rankCache.set(charNo, ranking);

        } else {
            // 普通模式：表情Hi [角色名] 欢迎进入游戏!
            const normal = broadcast["普通模式"];
            let msgArray = [
                ['icon', broadcast["图标"]],
                ['str', normal["前缀文本"], normal["前缀颜色"]],
                ['str', `[${charName}]`, broadcast["角色名颜色"]],
                ['str', normal["后缀文本"], normal["后缀颜色"]]
            ];
            log_info("发送播报")
            api_SendHyperLinkChatMsg_emoji(user, msgArray, broadcast["消息类型"], 1);
        }
    },

    onLogin(user, charNo) {
        api_scheduleOnMainThread_delay(() => {
            this.broadcastLogin(user, charNo);
        }, [], 1000);
    },

    dispose() {
        if (this.powerDbConnection) {
            try {
                MySQL_close(this.powerDbConnection);
            } catch (e) {}
            this.powerDbConnection = null;
        }
        this.rankCache.clear();
    }
};

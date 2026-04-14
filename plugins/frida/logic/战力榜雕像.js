/**
 * 雕像排行榜.js - v1.3
 * 
 * 功能：战力排行榜系统，支持多数据库配置切换
 * 提示：需根据各个登录器战力榜数据库进行配置(RS暂不支持)
 * 需在PVF中增加城镇NPC - 编号为92,93,94
 * 2026.3.28 配置外部化
 * By.南瓜
 */

// ==================== NativeFunction 定义（底层API调用，保持不变） ====================
const GetSharedServerMessageManager = new NativeFunction(ptr(0x08298EEC), 'pointer', ['pointer'], { "abi": "sysv" });
const DeleteSpecificMessageNative = new NativeFunction(ptr(0x08600D0C), 'void', ['pointer', 'int'], { "abi": "sysv" });

module.exports = {
    // ==================== 配置文件路径 ====================
    configPath: '/plugins/frida/configs/战力榜雕像.json',

    ranklist: null,
    powerDbConnection: null,
    currentPowerConfig: null,

    init() {
        // 防御性检查：CONFIG 是否成功加载
        if (!this.CONFIG || !this.CONFIG['雕像排行榜配置']) {
            log_error('[排行榜] 配置加载失败！请检查文件路径和 JSON 格式: {}', this.configPath);
            return;
        }

        if (!this.initPowerDatabase()) {
            log_error('[排行榜] 战力数据库初始化失败');
            return;
        }

        this.ranklist = this.getDefaultRanklist();
        this.event_rankinfo_load_from_db();
    },

    /**
     * 获取默认排行榜数据（防止 ranklist 为空）
     */
    getDefaultRanklist() {
        return JSON.parse(JSON.stringify(this.CONFIG['雕像排行榜配置']['默认排行榜数据']));
    },

    /**
     * 初始化战力数据库连接
     */
    initPowerDatabase() {
        const selection = this.CONFIG['雕像排行榜配置']['当前选择'];
        const dbConfig = this.CONFIG['雕像排行榜配置']['战力数据库配置'][selection];
        
        if (!dbConfig) {
            log_error('[排行榜] 无效的数据库选择: {}', selection);
            return false;
        }
        
        try {
            this.powerDbConnection = api_MYSQL_open(dbConfig["数据库名"], '127.0.0.1', 3306, 'game', 'uu5!^%jg');
            
            if (this.powerDbConnection) {
                this.currentPowerConfig = dbConfig;
                return true;
            } else {
                log_error('[排行榜] 战力数据库连接失败: {}', dbConfig["数据库名"]);
                return false;
            }
        } catch (e) {
            log_error('[排行榜] 战力数据库连接异常: {}', e.message);
            return false;
        }
    },

    /**
     * 获取角色战力值
     */
    GetRankNumber(charac_no) {
        if (!this.powerDbConnection || !this.currentPowerConfig) {
            return 0;
        }
        
        const excludeList = this.CONFIG['雕像排行榜配置']['排除名单'];
        if (excludeList.includes(parseInt(charac_no))) {
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
            log_error('[排行榜] 战力查询失败: {}', e.message);
        }
        
        return 0;
    },

    /**
     * 获取玩家排行榜数据
     */
    GetMyEquInfo(user) {
        let MyRanklist = {
            "rank": 0,
            "characname": "",
            "job": 0,
            "lev": 0,
            "Grow": 0,
            "Guilkey": 0,
            "Guilname": "",
            "str": "",
            "equip": []
        };
        
        let charac_no = CUserCharacInfo_getCurCharacNo(user);
        MyRanklist.rank = this.GetRankNumber(charac_no);
        MyRanklist.characname = api_CUserCharacInfo_getCurCharacName(user);
        MyRanklist.job = CUserCharacInfo_get_charac_job(user);
        MyRanklist.lev = CUserCharacInfo_get_charac_level(user);
        MyRanklist.Grow = CUserCharacInfo_getCurCharacGrowType(user);
        MyRanklist.Guilkey = CUserCharacInfo_get_charac_guildkey(user);
        MyRanklist.Guilname = api_CUser_GetGuildName(user);
        
        if (!MyRanklist.Guilname) {
            MyRanklist.Guilname = this.CONFIG['雕像排行榜配置']['默认公会名'];
        }
        
        let InvenW = CUserCharacInfo_getCurCharacInvenW(user);
        
        for (let i = 0; i <= 10; i++) {
            if (i != 9) {
                let clearAvatar = CInventory_GetClearAvatar(InvenW, i);
                let inven_item = CInventory_GetInvenRef(InvenW, INVENTORY_TYPE_BODY, i);
                let item_id = clearAvatar > 0 ? clearAvatar : Inven_Item_getKey(inven_item);
                MyRanklist.equip.push(item_id);
            } else {
                MyRanklist.equip.push(-1);
            }
        }
        
        return MyRanklist;
    },

    SetRanking(user) {
        if (!this.ranklist || typeof this.ranklist !== 'object' || Object.keys(this.ranklist).length === 0) {
            log_error('[排行榜] ranklist 状态异常，使用默认数据');
            this.ranklist = this.getDefaultRanklist();
        }

        const MyRanklist = this.GetMyEquInfo(user);
        const existingIndex = Object.values(this.ranklist).findIndex(item => item.characname === MyRanklist.characname);
        
        if (MyRanklist.rank) {
            if (existingIndex !== -1) {
                this.ranklist[existingIndex + 1] = MyRanklist;
            } else {
                this.ranklist["4"] = MyRanklist;
            }
        
            let rankArray = Object.values(this.ranklist);
            rankArray.sort((a, b) => b.rank - a.rank);
            let topThree = rankArray.slice(0, 3);
        
            let tmp = {};
            topThree.forEach((item, index) => {
                tmp[(index + 1).toString()] = item;
            });
        
            delete this.ranklist["4"];
            this.ranklist = tmp;
        }
    },

    SendRankLits(user, all) {
        // 防御性检查
        if (!this.ranklist || typeof this.ranklist !== 'object' || Object.keys(this.ranklist).length === 0) {
            log_error('[排行榜] SendRankLits 时 ranklist 状态异常，使用默认数据');
            this.ranklist = this.getDefaultRanklist();
        }

        this.DeleteSpecificMessage();
        this.sendRankListData(user, all, true);
        this.sendRankMessage(user, all, 1, this.CONFIG['雕像排行榜配置']['排行榜留言']["1"]);
        this.sendRankMessage(user, all, 2, this.CONFIG['雕像排行榜配置']['排行榜留言']["2"]);
        this.sendRankMessage(user, all, 3, this.CONFIG['雕像排行榜配置']['排行榜留言']["3"]);
        this.sendRankListData(user, all, false);
    },

    sendRankListData(user, all, addSpace) {
        // 防御性检查
        if (!this.ranklist || typeof this.ranklist !== 'object' || Object.keys(this.ranklist).length === 0) {
            log_error('[排行榜] sendRankListData 时 ranklist 状态异常，使用默认数据');
            this.ranklist = this.getDefaultRanklist();
        }

        let packet_guard = api_PacketGuard_PacketGuard();
        InterfacePacketBuf_put_header(packet_guard, 0, 182);
        InterfacePacketBuf_put_byte(packet_guard, Object.keys(this.ranklist).length);
        
        for (let key in this.ranklist) {
            if (this.ranklist.hasOwnProperty(key)) {
                let charac_name = addSpace ? this.ranklist[key].characname + " " : this.ranklist[key].characname;
                
                api_InterfacePacketBuf_put_string(packet_guard, charac_name);
                InterfacePacketBuf_put_byte(packet_guard, this.ranklist[key].lev);
                InterfacePacketBuf_put_byte(packet_guard, this.ranklist[key].job);
                InterfacePacketBuf_put_byte(packet_guard, this.ranklist[key].Grow);
                api_InterfacePacketBuf_put_string(packet_guard, this.ranklist[key].Guilname);
                InterfacePacketBuf_put_int(packet_guard, this.ranklist[key].Guilkey);

                for (let i = 0; i < this.ranklist[key].equip.length; i++) {
                    InterfacePacketBuf_put_int(packet_guard, i != 9 ? this.ranklist[key].equip[i] : -1);
                }
            }
        }
        
        InterfacePacketBuf_finalize(packet_guard, 1);
        
        if (all) {
            GameWorld_send_all(G_GameWorld(), packet_guard);
        } else {
            CUser_Send(user, packet_guard);
        }
        
        Destroy_PacketGuard_PacketGuard(packet_guard);
    },

    sendRankMessage(user, all, ranking, msg) {
        let packet_guard = api_PacketGuard_PacketGuard();
        InterfacePacketBuf_put_header(packet_guard, 0, 192);
        InterfacePacketBuf_put_byte(packet_guard, 1);
        InterfacePacketBuf_put_byte(packet_guard, 1);
        InterfacePacketBuf_put_byte(packet_guard, ranking);
        api_InterfacePacketBuf_put_string(packet_guard, msg);
        InterfacePacketBuf_finalize(packet_guard, 1);
        
        if (all) {
            GameWorld_send_all(G_GameWorld(), packet_guard);
        } else {
            CUser_Send(user, packet_guard);
        }
        
        Destroy_PacketGuard_PacketGuard(packet_guard);
    },

    DeleteSpecificMessage() {
        let Message = GetSharedServerMessageManager(G_CGameManager());
        for (let i = 1; i <= 3; i++) {
            DeleteSpecificMessageNative(Message, i);
        }
    },

    event_rankinfo_load_from_db() {
        try {
            if (api_MySQL_exec(mysql_frida, "select event_info from game_event where event_id = 'rankinfo';")) {
                if (MySQL_get_n_rows(mysql_frida) == 1) {
                    MySQL_fetch(mysql_frida);
                    var info = api_MySQL_get_str(mysql_frida, 0);
                    if (info) {
                        const parsed = JSON.parse(info);
                        if (parsed && typeof parsed === 'object') {
                            this.ranklist = parsed;
                            return;
                        }
                    }
                }
            }
        } catch (e) {
            log_error('[排行榜] event_rankinfo_load_from_db 异常: {}，使用默认数据', e.message);
        }
        // 回退默认
        this.ranklist = this.getDefaultRanklist();
    },

    event_rankinfo_save_to_db() {
        try {
            if (!this.ranklist || typeof this.ranklist !== 'object') {
                this.ranklist = this.getDefaultRanklist();
            }
            api_MySQL_exec(mysql_frida, "replace into game_event (event_id, event_info) values ('rankinfo', '" + JSON.stringify(this.ranklist) + "');");
        } catch (e) {
            log_error('[排行榜] event_rankinfo_save_to_db 异常: {}', e.message);
        }
    },

    onLogin(user, charNo) {
        api_scheduleOnMainThread_delay(() => {
            this.SendRankLits(user, true);
        }, [], 3000);
    },

    onExit(user) {
        this.SetRanking(user);
        this.SendRankLits(user, false);
        this.event_rankinfo_save_to_db();
    },

    dispose() {
        this.event_rankinfo_save_to_db();
        if (this.powerDbConnection) {
            try {
                MySQL_close(this.powerDbConnection);
            } catch (e) {}
            this.powerDbConnection = null;
        }
    }
};

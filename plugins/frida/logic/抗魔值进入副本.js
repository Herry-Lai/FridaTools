/**
 * 抗魔值进入副本.js - v1.6 (配置分离版)
 * 功能：组队/单人检测抗魔值，不足则阻止进入副本
 * 2026.1.30 By.南瓜
 * 2026.3.25 配置外部化改造
 */

module.exports = {
    /** 中文键名映射（框架自动递归合并） */
    fieldMapping: {
        "副本抗魔要求": "requirements",
        "难度名称映射": "difficultyMap"
    },

    // ==================== 配置文件路径 ====================
    configPath: '/plugins/frida/configs/抗魔值进入副本.json',

    init() {
        const self = this;
        self.installHook();
    },

    installHook() {
        var self = this;

        Interceptor.attach(ptr(0x081C7F32), {
            onEnter: function(args) {
                this.user = args[1];
                this.party = CUser_GetParty(this.user);
                var msg_base = args[2];
                this.dgn_id = msg_base.add(13).readU16();
                this.dgn_diff = msg_base.add(15).readU8();
            },
            onLeave: function(retval) {
                if (!this.party.isNull()) {
                    if (self.CONFIG.requirements.hasOwnProperty(this.dgn_id)) {
                        var diffRules = self.CONFIG.requirements[this.dgn_id];
                        
                        if (diffRules.hasOwnProperty(this.dgn_diff)) {
                            var requireVal = diffRules[this.dgn_diff];
                            var failedMembers = [];  // 收集不满足条件的队友

                            for (var i = 0; i < 4; ++i) {
                                var tuser = CParty_get_user(this.party, i);
                                if (!tuser.isNull()) {
                                    var charac_name = api_CUserCharacInfo_getCurCharacName(tuser);
                                    var total_anti_evil_count = GetAntiEvil(tuser);
                                    
                                    if (total_anti_evil_count < requireVal) {
                                        failedMembers.push({
                                            name: charac_name,
                                            current: total_anti_evil_count
                                        });
                                    }
                                }
                            }

                            // 如果有队友不满足条件，统一发送消息
                            if (failedMembers.length > 0) {
                                var dgnname = api_CDungeon_GetDungeonName(this.dgn_id);
                                var diffName = self.CONFIG.difficultyMap[this.dgn_diff];
                                
                                var memberList = failedMembers.map(function(m) {
                                    return m.name + '(当前:' + m.current + ')';
                                }).join('、');
                                
                                api_send_msg(
                                    this.user, 
                                    '队伍中以下玩家抗魔值低于' + requireVal + '：' + 
                                    memberList + 
                                    '，无法进入 [' + dgnname + ' - ' + diffName + ']', 
                                    2
                                );
                                
                                retval.replace(1);
                            }
                        }
                    }
                }
            }
        });
    }
};
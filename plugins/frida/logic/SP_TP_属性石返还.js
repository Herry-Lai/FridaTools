/**
 * SP_TP_属性石返还.js - v1.0.1
 * 2026.1.27 By.南瓜
 */

// ==================== 配置 ====================
const ITEM_CONFIGS = {
    1039: { type: 4, value: 50 },   // 力量
    1040: { type: 6, value: 50 },   // 智力
    1041: { type: 5, value: 50 },   // 体力
    1042: { type: 7, value: 50 },   // 精神
    1043: { type: 2, value: 250 },  // 生命
    1044: { type: 3, value: 250 },  // 魔力
    1045: { type: 8, value: 10 },   // 速度
    1046: { type: 9, value: 10 }    // 抗性
};

const SP_TP_CONFIGS = {
    1031: { increment: 5, is_tp: false },
    1038: { increment: 20, is_tp: false },
    1204: { increment: 1, is_tp: true },
    1205: { increment: 5, is_tp: true }
};

module.exports = {
    init() {
        if (!globalThis.mysql_frida) {
            log_error('[属性石系统] 错误: mysql_frida 未连接，请检查数据库模块');
            return;
        }

        const self = this; // 保存引用

        // 初始化/洗点时返还 SP/TP
        Interceptor.attach(ptr(0x081E5BDC), {
            onEnter: function(args) { this.user = args[1]; },
            onLeave: function(retval) {
                const charNo = CUserCharacInfo_getCurCharacNo(this.user);
                const dbData = self.get_sptp_data(charNo); 

                if (dbData.sp <= 0 && dbData.tp <= 0) return;

                const skill = CUserCharacInfo_getCurCharacSkillW(this.user);
                const treeIdx = CUserCharacInfo_GetCurCharacSkillTreeIndex(this.user);
                
                const add_sp = (idx, val) => SkillSlot_set_remain_sp_at_index(skill.toInt32(), SkillSlot_get_remain_sp_at_index(skill, idx) + val, idx);
                const add_tp = (idx, val) => SkillSlot_set_remain_sfp_at_index(skill.toInt32(), SkillSlot_get_remain_sfp_at_index(skill, idx) + val, idx);

                if (treeIdx === -1 || treeIdx === 0) {
                    add_sp(0, dbData.sp);
                    add_tp(2, dbData.tp);
                } else if (treeIdx === 1) {
                    add_sp(1, dbData.sp);
                    add_tp(3, dbData.tp);
                }
            }
        });

        // 转职触发 (SP/TP + 属性石返还)
        Interceptor.attach(ptr(0x086787FC), {
            onEnter: function(args) { this.user = args[0]; },
            onLeave: function(retval) {
                const charNo = CUserCharacInfo_getCurCharacNo(this.user);
                
                // 返还 SP/TP
                const dbData = self.get_sptp_data(charNo);
                const skill = CUserCharacInfo_getCurCharacSkillW(this.user);
                
                const add_sp = (idx) => SkillSlot_set_remain_sp_at_index(skill.toInt32(), SkillSlot_get_remain_sp_at_index(skill, idx) + dbData.sp, idx);
                const add_tp = (idx) => SkillSlot_set_remain_sfp_at_index(skill.toInt32(), SkillSlot_get_remain_sfp_at_index(skill, idx) + dbData.tp, idx);
                
                add_sp(0); add_sp(1);
                add_tp(2); add_tp(3);
                CUser_send_skill_info(this.user);

                // 返还属性石
                const query = `SELECT type, guildExpBook FROM charac_attributes WHERE charac_no = ${charNo}`;
                if (self.exec_sql(query)) {
                    while (MySQL_fetch(globalThis.mysql_frida)) {
                        const type = api_MySQL_get_int(globalThis.mysql_frida, 0);
                        const val = api_MySQL_get_int(globalThis.mysql_frida, 1);
                        self.apply_attr_memory(this.user, type, val);
                        self.send_attr_packet(this.user, type, val);
                    }
                }
            }
        });

        // 使用指定道具 (写入数据库)
        Interceptor.attach(ptr(0x086657fc), {
            onEnter: function(args) {
                const user = args[0];
                const slot = args[1].toInt32();
                
                const itemObj = Memory.alloc(128);
                const invenR = CUserCharacInfo_getCurCharacInvenR(user);
                CInventory_GetInvenSlot(itemObj, invenR.toInt32(), 1, slot);
                const itemId = itemObj.add(2).readU32();
                const charNo = CUserCharacInfo_getCurCharacNo(user);

                // 记录 SP/TP
                if (SP_TP_CONFIGS[itemId]) {
                    const cfg = SP_TP_CONFIGS[itemId];
                    const spAdd = cfg.is_tp ? 0 : cfg.increment;
                    const tpAdd = cfg.is_tp ? cfg.increment : 0;
                    
                    const sql = `INSERT INTO total_sp_tp (charac_no, total_sp, total_tp) 
                                 VALUES (${charNo}, ${spAdd}, ${tpAdd}) 
                                 ON DUPLICATE KEY UPDATE total_sp = total_sp + ${spAdd}, total_tp = total_tp + ${tpAdd}`;
                    self.exec_sql(sql);
                    return;
                }

                // 记录属性石
                if (ITEM_CONFIGS[itemId]) {
                    const cfg = ITEM_CONFIGS[itemId];
                    const sql = `INSERT INTO charac_attributes (charac_no, item_id, type, guildExpBook) 
                                 VALUES (${charNo}, ${itemId}, ${cfg.type}, ${cfg.value}) 
                                 ON DUPLICATE KEY UPDATE guildExpBook = guildExpBook + ${cfg.value}`;
                    self.exec_sql(sql);
                }
            }
        });
    },

    exec_sql(sql) {
        if (!globalThis.mysql_frida) return false;
        return api_MySQL_exec(globalThis.mysql_frida, sql);
    },

    // 获取角色数据库中 SP/TP 数据
    get_sptp_data(charac_no) {
        const sql = `SELECT total_sp, total_tp FROM total_sp_tp WHERE charac_no = ${charac_no}`;
        if (this.exec_sql(sql) && MySQL_get_n_rows(globalThis.mysql_frida) > 0) {
            MySQL_fetch(globalThis.mysql_frida);
            return {
                sp: api_MySQL_get_int(globalThis.mysql_frida, 0),
                tp: api_MySQL_get_int(globalThis.mysql_frida, 1)
            };
        }
        return { sp: 0, tp: 0 };
    },

    // 将属性石写入角色内存
    apply_attr_memory(user, type, value) {
        const addInfo = CUserCharacInfo_getCurCharacAddInfoRefW(user);
        if (addInfo.isNull()) return;

        switch(type) {
            case 2: addInfo.writeU32(addInfo.readU32() + value); break; // HP
            case 3: addInfo.add(4).writeU32(addInfo.add(4).readU32() + value); break; // MP
            case 4: addInfo.add(8).writeU16(addInfo.add(8).readU16() + value); break; // 力量
            case 5: addInfo.add(10).writeU16(addInfo.add(10).readU16() + value); break; // 体力
            case 6: addInfo.add(12).writeU16(addInfo.add(12).readU16() + value); break; // 智力
            case 7: addInfo.add(14).writeU16(addInfo.add(14).readU16() + value); break; // 精神
            case 8: addInfo.add(66).writeU32(addInfo.add(66).readU32() + value); break; // 速度
            case 9: // 全抗性
                for (let i = 0; i < 4; i++) {
                    const offset = 16 + i * 2;
                    addInfo.add(offset).writeU16(addInfo.add(offset).readU16() + value);
                }
                break;
        }
    },

    // 发送属性石效果包
    send_attr_packet(user, type, value) {
        api_scheduleOnMainThread_delay(() => {
            const pg = api_PacketGuard_PacketGuard();
            InterfacePacketBuf_put_header(pg, 1, 32);
            InterfacePacketBuf_put_byte(pg, 1);
            InterfacePacketBuf_put_short(pg, -1);
            InterfacePacketBuf_put_byte(pg, type);
            InterfacePacketBuf_put_int(pg, value);
            InterfacePacketBuf_put_short(pg, 0);
            InterfacePacketBuf_put_short(pg, 0);
            InterfacePacketBuf_finalize(pg, 1);
            CUser_Send(user, pg);
            Destroy_PacketGuard_PacketGuard(pg);
        }, [], 100);
    }
};

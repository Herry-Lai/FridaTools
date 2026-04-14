/**
 * 角色槽位管理.js - v2.6.2 (配置分离版 - 全中文键名)
 * 2026.1.27 By.南瓜
 * 2026.3.27 配置外部化改造
 */

const charac_slot_cache = new Map();

module.exports = {
    // ==================== 配置文件路径 ====================
    configPath: '/plugins/frida/configs/角色槽位数量限制.json',
    
    itemId: null,

    init() {
        // 初始化 itemId
        this.itemId = this.CONFIG['扩展槽位道具 ID'];
        
        if (typeof mysql_frida !== 'undefined') {
            const TABLE_NAME = 'frida.setCharacSlotLimit';
            const create_table_sql = `
                CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
                    account_id INT NOT NULL,
                    slot INT NOT NULL DEFAULT ${this.CONFIG['默认槽位']},
                    PRIMARY KEY (account_id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8;
            `;
            api_MySQL_exec(mysql_frida, create_table_sql);
        }

        this.hook_login();
    },

    UseItem(user, item_id) {
        const account_id = CUser_get_acc_id(user);
        let current_slot = this.getAccountSlot(account_id);
        const TABLE_NAME = 'frida.setCharacSlotLimit';

        if (current_slot >= this.CONFIG['槽位上限']) {
            api_send_msg(user, `已达到角色创建上限 (${this.CONFIG['槽位上限']})`, 1);
            api_CUser_AddItem(user, item_id, 1);
            return;
        }

        const new_slot = current_slot + 1;
        api_MySQL_exec(mysql_frida, `UPDATE ${TABLE_NAME} SET slot = ${new_slot} WHERE account_id = ${account_id}`);
        
        charac_slot_cache.set(account_id, new_slot);
        CUser_setCharacSlotLimit(user, new_slot);
        
        api_send_msg(user, `槽位已扩展至 ${new_slot} 个！`, 1);
    },

    getAccountSlot(account_id) {
        if (charac_slot_cache.has(account_id)) return charac_slot_cache.get(account_id);

        let slot = this.CONFIG['默认槽位'];
        const TABLE_NAME = 'frida.setCharacSlotLimit';
        const query = `SELECT slot FROM ${TABLE_NAME} WHERE account_id = ${account_id} LIMIT 1;`;
        
        if (api_MySQL_exec(mysql_frida, query)) {
            if (MySQL_get_n_rows(mysql_frida) > 0 && MySQL_fetch(mysql_frida)) {
                slot = api_MySQL_get_int(mysql_frida, 0);
            } else {
                api_MySQL_exec(mysql_frida, `INSERT IGNORE INTO ${TABLE_NAME} (account_id, slot) VALUES (${account_id}, ${slot})`);
            }
        }
        charac_slot_cache.set(account_id, slot);
        return slot;
    },

    hook_login() {
        const self = this;
        Interceptor.attach(ptr(0x084C5294), {
            onEnter: function (args) { this.user = args[1]; },
            onLeave: function (retval) {
                if (this.user.isNull()) return;
                const acc_id = CUser_get_acc_id(this.user);
                const slot = self.getAccountSlot(acc_id);
                CUser_setCharacSlotLimit(this.user, slot);
            }
        });
    },

    dispose() {
        charac_slot_cache.clear();
    }
};

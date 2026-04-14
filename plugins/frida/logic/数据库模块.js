/**
 * 数据库模块.js
 * 2026.1.27 By.南瓜
 */

const DB_CONFIG = {
    host: '127.0.0.1',
    port: 3306,
    account: 'game',
    password: 'uu5!^%jg'
};

const DATABASE_LIST = [
    { name: 'taiwan_cain', globalKey: 'mysql_taiwan_cain' },
    { name: 'd_taiwan', globalKey: 'mysql_d_taiwan' },
    { name: 'd_guild', globalKey: 'mysql_d_guild' },
    { name: 'taiwan_cain_2nd', globalKey: 'mysql_taiwan_cain_2nd' },
    { name: 'taiwan_billing', globalKey: 'mysql_taiwan_billing' },
    { name: 'taiwan_login', globalKey: 'mysql_taiwan_login' }
];

const TABLE_SCHEMAS = {
    // 深渊保底次数表
    abyss_pity: "CREATE TABLE IF NOT EXISTS abyss_pity (charac_no INT PRIMARY KEY, count INT NOT NULL DEFAULT 0, last_update TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8;",
    // SP/TP表
    total_sp_tp: "CREATE TABLE IF NOT EXISTS total_sp_tp (charac_no INT PRIMARY KEY, total_sp INT NOT NULL, total_tp INT NOT NULL DEFAULT 0) ENGINE=InnoDB DEFAULT CHARSET=utf8;",
    // 属性石表
    charac_attributes: "CREATE TABLE IF NOT EXISTS charac_attributes (id INT AUTO_INCREMENT PRIMARY KEY, charac_no INT NOT NULL, item_id INT NOT NULL, type TINYINT NOT NULL, guildExpBook INT NOT NULL DEFAULT 0, UNIQUE KEY (charac_no, item_id)) ENGINE=InnoDB DEFAULT CHARSET=utf8;"
};

module.exports = {
    // 记录心跳定时器
    keepAliveTimer: null,

    init() {
        // 1. 批量建立长连接
        for (let i = 0; i < DATABASE_LIST.length; i++) {
            let db = DATABASE_LIST[i];
            try {
                let handle = api_MYSQL_open(db.name, DB_CONFIG.host, DB_CONFIG.port, DB_CONFIG.account, DB_CONFIG.password);
                if (handle) {
                    globalThis[db.globalKey] = handle;
                }
            } catch (e) {
                log_error(`[数据库] ${db.name} 连接异常: ${e.message}`);
            }
        }

        // 2. 建立并连接 frida 库
        if (globalThis.mysql_taiwan_cain) {
            api_MySQL_exec(globalThis.mysql_taiwan_cain, 'CREATE DATABASE IF NOT EXISTS frida DEFAULT CHARSET utf8;');
            globalThis.mysql_frida = api_MYSQL_open('frida', DB_CONFIG.host, DB_CONFIG.port, DB_CONFIG.account, DB_CONFIG.password);
        }

        // 3. 校验表结构
        if (globalThis.mysql_frida) {
            for (let table in TABLE_SCHEMAS) {
                api_MySQL_exec(globalThis.mysql_frida, TABLE_SCHEMAS[table]);
            }
        }

        // 4. 启动心跳，防止 8 小时断连
        this.startKeepAlive();
    },

    dispose() {
        // 1. 清理心跳
        if (this.keepAliveTimer) {
            api_cancelScheduleOnMainThread(this.keepAliveTimer);
            this.keepAliveTimer = null;
        }

        // 2. 彻底释放所有长连接
        const keys = [...DATABASE_LIST.map(d => d.globalKey), 'mysql_frida'];
        keys.forEach(key => {
            if (globalThis[key]) {
                try {
                    // 必须调用 close，否则热重载会导致连接数溢出
                    MySQL_close(globalThis[key]);
                } catch(e) {}
                globalThis[key] = null;
            }
        });
    },

    // 心跳保活逻辑
    startKeepAlive() {
        this.keepAliveTimer = api_scheduleOnMainThread_delay(() => {
            const keys = [...DATABASE_LIST.map(d => d.globalKey), 'mysql_frida'];
            keys.forEach(key => {
                if (globalThis[key]) {
                    // 发送轻量级查询维持连接
                    api_MySQL_exec(globalThis[key], "SELECT 1;");
                }
            });
            this.startKeepAlive(); // 递归循环
        }, [], 3600 * 1000); // 1小时执行一次
    }
};

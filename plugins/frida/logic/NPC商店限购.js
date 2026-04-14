/**
 * NPC商店限购.js - v1.0.4
 * 支持每个物品独立配置账号/角色限购
 * 2026.2.11 By.南瓜
 */

module.exports = {
    configPath: '/plugins/frida/configs/NPC商店限购.json',

    init() {
        if (typeof mysql_frida === 'undefined') {
            log_error('[商店限购] 严重错误：mysql_frida 未定义，请检查数据库插件！');
            return;
        }

        this.initDB();
        this.hook_BuyItem();
    },

    initDB() {
        const TABLE_NAME = 'restrict_npc_shop_buy';

        const create_sql = `
            CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
                id INT NOT NULL AUTO_INCREMENT,
                account_id INT NOT NULL,
                charac_no INT NOT NULL DEFAULT 0,
                item_id INT NOT NULL,
                item_shop INT NOT NULL,
                buy_count INT NOT NULL DEFAULT 0,
                refresh_time VARCHAR(20) NOT NULL,
                PRIMARY KEY (id),
                UNIQUE KEY unique_charac_item (charac_no, item_id, item_shop),
                INDEX idx_account (account_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8;
        `;
        api_MySQL_exec(mysql_frida, create_sql);
    },

    hook_BuyItem() {
        const self = this;
        const TABLE_NAME = 'restrict_npc_shop_buy';

        Interceptor.attach(ptr(0x081BE46A), {
            onEnter: function(args) {
                this.block_purchase = false;

                const user = args[1];
                const msg_base = args[2];

                const item_id = msg_base.add(13).readU32();
                const item_cnt = msg_base.add(17).readU32();
                const item_shop = msg_base.add(21).readU32();

                if (self.CONFIG.限制列表[item_shop]) {
                    const shop_rules = self.CONFIG.限制列表[item_shop];

                    const rule = shop_rules.find(r => r.物品ID === item_id);

                    if (rule) {
                        const charac_no = CUserCharacInfo_getCurCharacNo(user);
                        const account_id = CUser_get_acc_id(user);

                        const result = self.processLimit(user, charac_no, account_id, item_id, item_shop, item_cnt, rule, TABLE_NAME);

                        if (result === false) {
                            this.block_purchase = true;
                        }
                    }
                }
            },
            onLeave: function(retval) {
                if (this.block_purchase) {
                    retval.replace(19);
                }
            }
        });
    },

    processLimit(user, charac_no, account_id, item_id, item_shop, buy_cnt, rule, TABLE_NAME) {
        const limit_max = rule.上限;
        const refresh_type = rule.刷新;
        const mode = rule.模式 || "账号";

        const now = new Date();
        const now_ms = now.getTime();

        let query_field, query_value;
        if (mode === "角色") {
            query_field = 'charac_no';
            query_value = charac_no;
        } else {
            query_field = 'account_id';
            query_value = account_id;
        }

        const query = `SELECT buy_count, refresh_time FROM ${TABLE_NAME} WHERE ${query_field} = ${query_value} AND item_id = ${item_id} AND item_shop = ${item_shop} LIMIT 1`;

        if (api_MySQL_exec(mysql_frida, query) && MySQL_fetch(mysql_frida)) {
            const current_count = api_MySQL_get_int(mysql_frida, 0);
            const refresh_ts = parseInt(api_MySQL_get_str(mysql_frida, 1));
            const refresh_date = new Date(refresh_ts);

            if (now_ms >= refresh_ts) {
                if (buy_cnt > limit_max) {
                    this.sendLimitMessage(user, limit_max, refresh_date, false);
                    return false;
                }

                const new_refresh = this.getRefreshTime(now, refresh_type);

                const update_sql = `UPDATE ${TABLE_NAME} SET buy_count = ${buy_cnt}, refresh_time = '${new_refresh.getTime()}' WHERE ${query_field} = ${query_value} AND item_id = ${item_id} AND item_shop = ${item_shop}`;
                api_MySQL_exec(mysql_frida, update_sql);
                return true;

            } else {
                const remaining = limit_max - current_count;

                if (buy_cnt > remaining) {
                    this.sendLimitMessage(user, remaining, refresh_date, true);
                    return false;
                }

                const update_sql = `UPDATE ${TABLE_NAME} SET buy_count = buy_count + ${buy_cnt} WHERE ${query_field} = ${query_value} AND item_id = ${item_id} AND item_shop = ${item_shop}`;
                api_MySQL_exec(mysql_frida, update_sql);

                if (remaining - buy_cnt === 0) {
                    this.sendLastBuyNotice(user, item_id, refresh_date);
                }

                return true;
            }

        } else {
            if (buy_cnt > limit_max) {
                this.sendLimitMessage(user, limit_max, null, false);
                return false;
            }

            const new_refresh = this.getRefreshTime(now, refresh_type);

            const insert_sql = `INSERT INTO ${TABLE_NAME} (account_id, charac_no, item_id, item_shop, buy_count, refresh_time) VALUES (${account_id}, ${charac_no}, ${item_id}, ${item_shop}, ${buy_cnt}, '${new_refresh.getTime()}')`;
            api_MySQL_exec(mysql_frida, insert_sql);
            return true;
        }
    },

    getRefreshTime(date, refresh_type) {
        if (refresh_type === "月") {
            let d = new Date(date);
            d.setMonth(d.getMonth() + 1);
            d.setDate(1);
            d.setHours(6, 0, 0, 0);
            return d;
        }
        if (refresh_type === "周") {
            let d = new Date(date);
            let day = d.getDay();
            let diff = (day === 0 ? 1 : 8 - day);
            d.setDate(d.getDate() + diff);
            d.setHours(6, 0, 0, 0);
            return d;
        }
        if (refresh_type === "日") {
            let d = new Date(date);
            d.setDate(d.getDate() + 1);
            d.setHours(6, 0, 0, 0);
            return d;
        }
        return null;
    },

    sendLimitMessage(user, remainder, refresh_date, has_history) {
        let message;
        if (has_history && refresh_date) {
            const refresh_str = `${refresh_date.getMonth() + 1}月${refresh_date.getDate()}日${refresh_date.getHours()}点`;
            message = `此为限购物品：剩余 ${remainder} 个 \n(刷新：${refresh_str})`;
        } else {
            message = `购买失败：该物品限购 ${remainder} 个`;
        }
        api_send_msg(user, message, 1);
    },

    sendLastBuyNotice(user, item_id, refresh_date) {
        const refresh_str = `${refresh_date.getMonth() + 1}月${refresh_date.getDate()}日${refresh_date.getHours()}点`;
        if (typeof api_SendHyperLinkChatMsg_emoji === 'function') {
            var msg = [
                ['str', ' '],
                ['item', item_id],
                ['str', ' 已达限购上限，将于 ' + refresh_str + ' 刷新', [255, 100, 100, 255]]
            ];
            api_SendHyperLinkChatMsg_emoji(user, msg, 1, 1);
        } else {
            api_send_msg(user, `已达购买上限，将于 ${refresh_str} 刷新`);
        }
    }
};
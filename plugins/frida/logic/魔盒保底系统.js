/**
 * 魔盒保底系统.js - v1.2
 * 功能：开启炽星魔盒指定次数后，自动获取指定保底奖励
 * 2026.2.3 By.南瓜
 */

module.exports = {
    configPath: '/plugins/frida/configs/魔盒保底系统.json',

    init() {
        const self = this;

        if (typeof mysql_frida !== 'undefined') {
            const TABLE_NAME = 'lucky_box_counter';
            const sql = `CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
                charac_no INT PRIMARY KEY,
                count INT NOT NULL DEFAULT 0
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8;`;
            api_MySQL_exec(mysql_frida, sql);
        }

        global.lucky_box_cache = global.lucky_box_cache || new Map();

        Interceptor.attach(ptr(0x08676296), {
            onEnter: function(args) {
                this.user = args[0];
                this.item = args[1];
                this.inven_item = args[2].readPointer();

                if (CItem_getIndex(this.item) !== self.CONFIG['目标魔盒']) return;

                const charNo = CUserCharacInfo_getCurCharacNo(this.user);

                if (!global.lucky_box_cache.has(charNo)) {
                    const dbCount = self.loadFromDb(charNo);
                    global.lucky_box_cache.set(charNo, dbCount);
                }

                let count = global.lucky_box_cache.get(charNo);
                count += 1;
                let needSave = false;

                if (count >= self.CONFIG['保底次数']) {
                    const pick = self.pickPityItem();
                    const itemData = CDataManager_find_item(G_CDataManager(), pick['物品 ID']);

                    if (!itemData.isNull()) {
                        const inven = CUserCharacInfo_getCurCharacInvenW(this.user);
                        const type = CInventory_GetItemType(inven, pick['物品 ID']);

                        this.inven_item.add(2).writeU32(pick['物品 ID']);
                        this.inven_item.add(1).writeU8(type);
                        this.inven_item.add(7).writeU32(pick['数量']);

                        if (api_is_Equipment_item(pick['物品 ID'])) {
                            const durability_max = CEquipItem_get_endurance(itemData);
                            this.inven_item.add(11).writeU16(durability_max);
                        }

                        count = 0;
                        needSave = true;
                    }
                } else {
                    if (count % self.CONFIG['保存间隔'] === 0) needSave = true;
                }
                global.lucky_box_cache.set(charNo, count);

                if (needSave) self.saveToDb(charNo, count);
            }
        });
    },

    onLogin(user, charNo) {
        if (!global.lucky_box_cache.has(charNo)) {
            global.lucky_box_cache.set(charNo, this.loadFromDb(charNo));
        }
    },

    onExit(user) {
        const charNo = CUserCharacInfo_getCurCharacNo(user);
        if (global.lucky_box_cache.has(charNo)) {
            this.saveToDb(charNo, global.lucky_box_cache.get(charNo));
            global.lucky_box_cache.delete(charNo);
        }
    },

    loadFromDb(charNo) {
        if (typeof mysql_frida === 'undefined') return 0;
        const TABLE_NAME = 'lucky_box_counter';
        const sql = `SELECT count FROM ${TABLE_NAME} WHERE charac_no=${charNo}`;
        if (api_MySQL_exec(mysql_frida, sql)) {
            if (MySQL_get_n_rows(mysql_frida) > 0 && MySQL_fetch(mysql_frida)) {
                return api_MySQL_get_int(mysql_frida, 0);
            }
        }
        return 0;
    },

    saveToDb(charNo, count) {
        if (typeof mysql_frida === 'undefined') return;
        const TABLE_NAME = 'lucky_box_counter';
        const sql = `REPLACE INTO ${TABLE_NAME} (charac_no, count) VALUES (${charNo}, ${count})`;
        api_MySQL_exec(mysql_frida, sql);
    },

    pickPityItem() {
        let total = 0;
        this.CONFIG['保底奖励池'].forEach(i => total += i.权重);
        let rand = Math.floor(Math.random() * total);
        let acc = 0;
        for (let i = 0; i < this.CONFIG['保底奖励池'].length; i++) {
            acc += this.CONFIG['保底奖励池'][i].权重;
            if (rand < acc) return this.CONFIG['保底奖励池'][i];
        }
        return this.CONFIG['保底奖励池'][0];
    },

    dispose() {
        if (global.lucky_box_cache && global.lucky_box_cache.size > 0) {
            for (const [charNo, count] of global.lucky_box_cache.entries()) {
                this.saveToDb(charNo, count);
            }
        }
        global.lucky_box_cache = null;
    }
};

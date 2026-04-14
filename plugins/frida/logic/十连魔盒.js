/**
 * 10 连魔盒.js - v1.3 (配置分离版)
 * 2026.3.12 By.南瓜
 * 2026.3.25 配置外部化改造
 */

module.exports = {
    // 映射表：将 JSON 中的中文 Key 映射为脚本使用的英文属性名
    fieldMapping: {
        "ITEM_ID": "itemId",
        "奖池": "pools",
        "播报": "broadcast",
        "邮件": "mail",
        "类型": "type",
        "图标": "icon",
        "消息": "messages",
        "文本": "text",
        "颜色": "color",
        "名称颜色": "nameColor",
        "标题": "title",
        "内容": "content",
        "每封邮件最大物品数": "maxItemsPerMail"
    },

    // ==================== 配置文件路径 ====================
    configPath: '/plugins/frida/configs/十连魔盒.json',

    
    init() {
        
    },
    
    /**
     * 道具使用入口
     */
    UseItem(user, item_id) {
        const self = this;
        
        // 这里的 this 指向 exports 对象，由框架自动合并了 JSON 数据
        if (!self.CONFIG.pools['1']) return;

        const charNo = CUserCharacInfo_getCurCharacNo(user);
        const charName = api_CUserCharacInfo_getCurCharacName(user);

        // 抽取池 1
        const list1 = self.getRandomItems(self.CONFIG.pools['1'].items, self.CONFIG.pools['1'].count);
        // 抽取池 2
        const list2 = self.getFixedItems(self.CONFIG.pools['2'].items);

        const allItems = [...list1, ...list2];
        const toBag = [], toMail = [], toShow = [];

        allItems.forEach(([id, num, isBroadcast]) => {
            toShow.push([id, num]);
            // 使用框架环境提供的校验
            if (checkInventorySlot(user, id) === 0) {
                toMail.push([id, num]);
            } else {
                toBag.push([id, num]);
            }
            if (isBroadcast === 1) self.doBroadcast(user, charName, id);
        });

        if (toShow.length > 0) {
            Send_items(user, toShow);
        }

        if (toBag.length > 0) {
            api_CUser_Add_Items(user, toBag);
        }

        if (toMail.length > 0) {
            api_send_msg(user, '背包空间不足，部分奖励已发送至邮箱！', 1);
            self.sendMails(charNo, toMail);
        }
    },

    getFixedItems(items) {
        return items.map(item => [item.id, item.number, item.broadcast]);
    },

    /**
     * 二分法随机抽取
     */
    getRandomItems(items, count) {
        const selected = [];
        const pool = items.filter(item => item.number > 0);
        if (pool.length === 0) return selected;

        for (let n = 0; n < count; n++) {
            let totalRate = 0;
            const ranges = pool.map(item => {
                const start = totalRate; 
                totalRate += item.rate;
                return { item, start, end: totalRate };
            });

            if (totalRate <= 0) break;

            const rand = Math.random() * totalRate;
            let left = 0, right = ranges.length - 1;
            while (left <= right) {
                const mid = Math.floor((left + right) / 2);
                if (rand >= ranges[mid].start && rand < ranges[mid].end) {
                    selected.push([ranges[mid].item.id, ranges[mid].item.number, ranges[mid].item.broadcast]);
                    break;
                } else if (rand >= ranges[mid].end) left = mid + 1;
                else right = mid - 1;
            }
        }
        return selected;
    },

    sendMails(charNo, items) {
        const self = this;
        const max = self.CONFIG.mail.maxItemsPerMail || 10;
        for (let i = 0; i < items.length; i += max) {
            const batch = items.slice(i, i + max);
            api_WongWork_CMailBoxHelper_ReqDBSendNewSystemMultiMail(
                charNo, self.CONFIG.mail.title, self.CONFIG.mail.content, 0, batch
            );
        }
    },

    doBroadcast(user, name, itemId) {
        const self = this;
        const conf = self.CONFIG.broadcast;
        const msgArray = [
            ['icon', conf.icon],
            ['str', conf.messages[0].text, conf.messages[0].color],
            ['str', `[${name}]`, conf.nameColor],
            ['str', conf.messages[1].text, conf.messages[1].color],
            ['item', itemId]
        ];
        api_SendHyperLinkChatMsg_emoji(user, msgArray, conf.type, 0);
    }
};

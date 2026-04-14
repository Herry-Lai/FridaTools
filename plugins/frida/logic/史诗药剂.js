/**
 * 史诗药剂.js - v1.1
 * 功能：史诗药剂爆率加成（支持指定VIP角色自定义倍率）
 * 逻辑：单人模式下、是否使用史诗药剂(2600010)，并根据配置提升Roll值
 * 指定角色ID为CID，CID不会看的话打开数据库taiwan_cain → charac_info → charac_no
 * 2026.3.5 By.南瓜
 */

module.exports = {

    fieldMapping: {
        "默认爆率加成": "defaultBonus",
        "药剂道具ID":   "potionId",
        "VIP名单":      "oddsList"
    },

    configPath: '/plugins/frida/configs/史诗药剂.json',

    init() {
        this.installEpicPotionHook();
    },

    installEpicPotionHook() {
        var self = this;
        var potionId     = this.CONFIG.potionId;
        var defaultBonus = this.CONFIG.defaultBonus;
        var oddsList     = this.CONFIG.oddsList;

        // 定义原始函数指针
        const CLuckPoint_getItemRarity = new NativeFunction(ptr(0x8550BE4), 'int', ['pointer', 'pointer', 'int', 'int'], { "abi": "sysv" });

        Interceptor.replace(ptr(0x8550BE4), new NativeCallback(function (a1, a2, roll, a4) {
            const Addr = a1.add(0);
            const vectorSize = (Memory.readPointer(Addr.add(4)).toInt32() - Memory.readPointer(Addr).toInt32()) / 4;

            // 遍历队伍成员，寻找使用了史诗药剂的玩家
            var userWithPotion = null;
            for (var i = 0; i < vectorSize; i++) {
                const elementAddr = Memory.readPointer(Addr).add(i * 4);
                const user = Memory.readPointer(elementAddr);
                if (!user.isNull() && CUser_CheckCoolTimeItem(user, potionId)) {
                    userWithPotion = user;
                    break;
                }
            }

            if (userWithPotion && this.returnAddress && this.returnAddress.toInt32() == 0x853583a) {
                const party = CUser_GetParty(userWithPotion);

                // 仅单人副本生效
                if (CParty_get_member_count(party) == 1) {
                    const MaxRoll = a2.add(16).readU32();

                    const charac_no = CUserCharacInfo_getCurCharacNo(userWithPotion);
                    var odds = defaultBonus; // 默认 0.1

                    // 检查是否在VIP名单中
                    if (oddsList[charac_no]) {
                        odds = oddsList[charac_no];
                    }

                    // 计算新的 Roll 值
                    const MyRoll = Math.floor(Math.min(roll + roll * odds, MaxRoll));

                    return CLuckPoint_getItemRarity(a1, a2, MyRoll, a4);
                }
            }

            return CLuckPoint_getItemRarity(a1, a2, roll, a4);
        }, 'int', ['pointer', 'pointer', 'int', 'int']));
    }
};

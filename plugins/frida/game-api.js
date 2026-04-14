/**
 * game-api.js - ByNangua Framework API 内核
 * @version 1.0.0
 * @author ByNangua
 */
const api = module.exports; 

// ==================== [1] 常量定义 ====================
// 获取背包槽中的道具
api.INVENTORY_TYPE_BODY     = 0;  // 身上穿的装备(0-25)
api.INVENTORY_TYPE_ITEM     = 1;  // 物品栏(0-311)
api.INVENTORY_TYPE_AVARTAR  = 2;  //时装栏(0-104)
api.INVENTORY_TYPE_CREATURE = 3;  //宠物装备(0-241)

// 通知客户端更新背包栏
api.ENUM_ITEMSPACE_INVENTORY = 0; // 物品栏
api.ENUM_ITEMSPACE_AVATAR    = 1; // 时装栏
api.ENUM_ITEMSPACE_CARGO     = 2; // 仓库
api.ENUM_ITEMSPACE_EQUIPPED  = 3; // 穿戴栏
api.ENUM_ITEMSPACE_TRADE     = 4; // 交易栏
api.ENUM_ITEMSPACE_PRIVATE_STORE = 5; // 个人商店
api.ENUM_ITEMSPACE_MAIL      = 6; // 邮件
api.ENUM_ITEMSPACE_CREATURE = 7;  // 宠物栏
api.ENUM_ITEMSPACE_ACCOUNT_CARGO = 12;//账号仓库

api.QUEST_gRADE_EPIC      = 0;   // 主线任务
api.QUEST_gRADE_DAILY     = 3;   // 每日任务
api.QUEST_gRADE_ACHIEVEMENT = 2; // 成就任务
api.QUEST_gRADE_COMMON_UNIQUE = 5; //普通任务

// ==================== 全局数据 ====================
api.GlobalData_s_systemTime_ = ptr(0x941F714);
api.GlobalData_s_BreakAwaySys = ptr(0x0941F76C);
api.GlobalData_s_timeGate = ptr(0x0941F7F4);
api.GlobalData_s_event_manager = ptr(0x941F730);
api.GlobalData_s_DailyScheduleManager = ptr(0x0941F784);

// ==================== 线程安全 ====================
// 申请线程安全锁
api.Guard_Mutex_guard = new NativeFunction(ptr(0x810544C), 'int', ['pointer', 'pointer'], { "abi": "sysv" });
// 销毁线程安全锁
api.Destroy_guard_Mutex_guard = new NativeFunction(ptr(0x8105468), 'int', ['pointer'], { "abi": "sysv" });
// 获取服务器内置定时器队列
api.G_TimerQueue = new NativeFunction(ptr(0x80F647C), 'pointer', [], { "abi": "sysv" });

// ==================== 内存管理 ====================
api.libc_malloc = new NativeFunction(Module.findExportByName(null, 'malloc'), 'pointer', ['int'], { "abi": "sysv" });
api.libc_free = new NativeFunction(Module.findExportByName(null, 'free'), 'void', ['pointer'], { "abi": "sysv" });
// 获取字符串长度
api.strlen = new NativeFunction(Module.findExportByName(null, 'strlen'), 'int', ['pointer'], { "abi": "sysv" });

// ==================== 文件操作 ====================
// 打开文件
api.fopen = new NativeFunction(Module.getExportByName(null, 'fopen'), 'int', ['pointer', 'pointer'], { "abi": "sysv" });
// 读取文件
api.fread = new NativeFunction(Module.getExportByName(null, 'fread'), 'int', ['pointer', 'int', 'int', 'int'], { "abi": "sysv" });
// 关闭文件
api.fclose = new NativeFunction(Module.getExportByName(null, 'fclose'), 'int', ['int'], { "abi": "sysv" });

// ==================== 角色相关1 ====================
// 获取当前角色ID
api.CUserCharacInfo_getCurCharacNo = new NativeFunction(ptr(0x80CBC4E), 'int', ['pointer'], { "abi": "sysv" });
// 获取角色名字
api.CUserCharacInfo_getCurCharacName = new NativeFunction(ptr(0x8101028), 'pointer', ['pointer'], { "abi": "sysv" });
// 获取角色等级
api.CUserCharacInfo_get_charac_level = new NativeFunction(ptr(0x80DA2B8), 'int', ['pointer'], { "abi": "sysv" });
// 获取角色职业
api.CUserCharacInfo_get_charac_job = new NativeFunction(ptr(0x80FDF20), 'int', ['pointer'], { "abi": "sysv" });
// 获取角色背包 (可写)
api.CUserCharacInfo_getCurCharacInvenW = new NativeFunction(ptr(0x80DA28E), 'pointer', ['pointer'], { "abi": "sysv" });
// 获取角色背包 (只读)
api.CUserCharacInfo_getCurCharacInvenR = new NativeFunction(ptr(0x80DA27E), 'pointer', ['pointer'], { "abi": "sysv" });
// 获取角色所在城镇ID
api.CUserCharacInfo_getCurCharacVill = new NativeFunction(ptr(0x08645564), 'int', ['pointer'], { "abi": "sysv" });
// 获取当前疲劳值
api.CUserCharacInfo_getCurCharacFatigue = new NativeFunction(ptr(0x0822F2AE), 'int', ['pointer'], {"abi":"sysv"});
// 获取副职业类型 (价差分解机用户的状态 参数 用户 239 背包类型 位置)
api.CUserCharacInfo_getCurCharacExpertJob = new NativeFunction(ptr(0x822f8d4), 'int', ['pointer'], { "abi": "sysv" });
// 获取角色技能槽 (可写)
api.CUserCharacInfo_getCurCharacSkillW = new NativeFunction(ptr(0x0822f140), 'pointer', ['pointer'], {"abi":"sysv"});
// 获取角色技能槽 (只读)
api.CUserCharacInfo_getCurCharacSkillR = new NativeFunction(ptr(0x0822F130), 'pointer', ['pointer'], { "abi": "sysv" });
// 获取角色当前技能树索引
api.CUserCharacInfo_GetCurCharacSkillTreeIndex = new NativeFunction(ptr(0x0822f33c), 'int', ['pointer'], {"abi":"sysv"});
api.CUserCharacInfo_getCurCharacAddInfoRefW = new NativeFunction(ptr(0x086960d8), 'pointer', ['pointer'], {"abi":"sysv"});
// 设置角色属性改变脏标记(角色上线时把所有属性从数据库缓存到内存中, 只有设置了脏标记, 角色下线时才能正确存档到数据库, 否则变动的属性下线后可能会回档)
api.CUserCharacInfo_enableSaveCharacStat = new NativeFunction(ptr(0x819A870), 'int', ['pointer'], { "abi": "sysv" });
// 获取角色最大装备等级
api.CUserCharacInfo_getCurCharacMaxEquipLevel = new NativeFunction(ptr(0x086467C2), 'int', ['pointer', 'int'], { "abi": "sysv" });
// 获取角色上次退出游戏时间
api.CUserCharacInfo_getCurCharacLastPlayTick = new NativeFunction(ptr(0x82A66AA), 'int', ['pointer'], { "abi": "sysv" });
// 获取人物的仓库
api.CUserCharacInfo_getCurCharacCargoW = new NativeFunction(ptr(0x08151A94), 'pointer', ['pointer'], { "abi": "sysv" });
// 设置装备穿戴等级
api.CUserCharacInfo_setCurCharacMaxEquipLevel = new NativeFunction(ptr(0x086467C2), 'int', ['pointer', 'int'], { "abi": "sysv" });
// 获取角色当前等级升级所需经验
api.CUserCharacInfo_get_level_up_exp = new NativeFunction(ptr(0x0864E3BA), 'int', ['pointer', 'int'], { "abi": "sysv" });
// 今日交易金币数量
api.CUserCharacInfo_getCurCharacTradeGoldDaily = new NativeFunction(ptr(0x08696600), 'int', ['pointer'], {"abi":"sysv"});
// 获取师徒key
api.CUserCharacInfo_get_charac_memberkey = new NativeFunction(ptr(0x0822F5C4), 'int', ['pointer'], { "abi": "sysv" });
// 判断师徒是否在线
api.CUserCharacInfo_is_connect_upper_member = new NativeFunction(ptr(0x0822F5E6), 'int', ['pointer'], { "abi": "sysv" });
// 获取师徒在线角色
api.CUserCharacInfo_get_connect_upper_member = new NativeFunction(ptr(0x0085BFBB4), 'int', ['pointer'], { "abi": "sysv" });
// 获取当前角色已使用疲劳值
api.CUserCharacInfo_getCurCharacUsedFatigue = new NativeFunction(ptr(0x8110CBA), 'int', ['pointer'], {"abi":"sysv"});
// 本次登录时间
api.CUserCharacInfo_getLoginTick = new NativeFunction(ptr(0x822F692), 'int', ['pointer'], { "abi": "sysv" });
// 获取角色总疲劳值
api.CUserCharacInfo_getCurCharacTotalFatigue = new NativeFunction(ptr(0x08657766), 'int', ['pointer'], {"abi":"sysv"});
// 获取角色最大总疲劳值
api.CUserCharacInfo_getCurCharacTotalMaxFatigue = new NativeFunction(ptr(0x08657804), 'int', ['pointer'], {"abi":"sysv"});
// 获取角色当前幸运点
api.CUserCharacInfo_getCurCharacLuckPoint = new NativeFunction(ptr(0x822F828), 'int', ['pointer'], { "abi": "sysv" });
// 设置幸运点数
api.CUserCharacInfo_setCurCharacLuckPoint = new NativeFunction(ptr(0x0864670A), 'int', ['pointer', 'int'], { "abi": "sysv" });
// 获取疲劳值
api.CUserCharacInfo_GetFatigue = new NativeFunction(ptr(0x08696306), 'int', ['pointer'], { "abi": "sysv" });
// 获取公会ID
api.CUserCharacInfo_get_charac_guildkey = new NativeFunction(ptr(0x822F46C), 'int', ['pointer'], { "abi": "sysv" });
// 获取公会成员等级
api.CUserCharacInfo_getGuildMemberGrade = new NativeFunction(ptr(0x0822F548), 'int', ['pointer'], { "abi": "sysv" });
// 设置公会成员等级
api.CUserCharacInfo_setGuildMemberGrade = new NativeFunction(ptr(0x084EC0B4), 'int', ['pointer', 'int'], { "abi": "sysv" });
// 退出公会
api.CUserCharacInfo_setCurCharacGuildSecede = new NativeFunction(ptr(0x082A6700), 'int', ['pointer','int'], { "abi": "sysv" });
// 检查背包中是否存在item
api.CUserCharacInfo_isExistItem = new NativeFunction(ptr(0x08678084), 'int', ['pointer', 'int'], {"abi":"sysv"});
// 获取副职业熟练度经验
api.CUserCharacInfo_GetCurCharacExpertJobExp = new NativeFunction(ptr(0x8375026), 'int', ['pointer'], { "abi": "sysv" });
// 获取角色成长类型
api.CUserCharacInfo_getCurCharacGrowType = new NativeFunction(ptr(0x815741C), 'int', ['pointer'], { "abi": "sysv" });
// 设置疲劳值
api.CUserCharacInfo_setCurCharacFatigue = new NativeFunction(ptr(0x0822f2ce), 'int', ['pointer','int'], {"abi":"sysv"});
// 设置角色职业
api.CUser_set_grow_type = new NativeFunction(ptr(0x086787FC), 'pointer', ['pointer', 'int', 'int', 'int', 'int'], {"abi":"sysv"});
// 获取角色成长类型1
api.CUserCharacInfo_getCurCharFirstGrowType = new NativeFunction(ptr(0x08110C94), 'int', ['pointer'], { "abi": "sysv" });
// 获取角色成长类型2
api.CUserCharacInfo_getCurCharSecondGrowType = new NativeFunction(ptr(0x0822F23C), 'int', ['pointer'], { "abi": "sysv" });
api._postCheckForceChangeGrowType = new NativeFunction(ptr(0x08668823), 'void', ['pointer', 'int', 'int'], {"abi":"sysv"});

// 重置技能树
api.CUser_init_skill_tree = new NativeFunction(ptr(0x0866BCE8), 'pointer', ['pointer', 'int'], {"abi":"sysv"});

// ==================== 用户操作 ====================
// 获取角色账号id
api.CUser_get_acc_id = new NativeFunction(ptr(0x80DA36E), 'int', ['pointer'], { "abi": "sysv" });
// 获取角色状态
api.CUser_get_state = new NativeFunction(ptr(0x80DA38C), 'int', ['pointer'], { "abi": "sysv" });
// 获取区域
api.CUser_get_area = new NativeFunction(ptr(0x86813BE), 'int', ['pointer', 'int'], {"abi":"sysv"});
// 获取角色坐标X
api.CUser_get_posX = new NativeFunction(ptr(0x0813492C), 'int', ['pointer'], {"abi":"sysv"});
// 获取角色坐标Y
api.CUser_get_posY = new NativeFunction(ptr(0x0813493C), 'int', ['pointer'], {"abi":"sysv"});
// 给角色发消息(弹窗)
api.CUser_SendNotiPacketMessage = new NativeFunction(ptr(0x86886CE), 'int', ['pointer', 'pointer', 'int'], { "abi": "sysv" });
// 发包给客户端
api.CUser_Send = new NativeFunction(ptr(0x86485BA), 'int', ['pointer', 'pointer'], { "abi": "sysv" });
api.CUser_SendPacket = new NativeFunction(ptr(0x867B8FE), 'int', ['pointer', 'int', 'pointer'], { "abi": "sysv" });
// 通知客户端道具更新(客户端指针, 通知方式[仅客户端=1, 世界广播=0, 小队=2, war room=3], itemSpace[装备=0, 时装=1], 道具所在的背包槽)
api.CUser_SendUpdateItemList = new NativeFunction(ptr(0x867C65A), 'int', ['pointer', 'int', 'int', 'int'], { "abi": "sysv" });
// 发送道具
api.CUser_AddItem = new NativeFunction(ptr(0x867B6D4), 'int', ['pointer', 'int', 'int', 'int', 'pointer', 'int'], { "abi": "sysv" });
// 角色增加经验
api.CUser_gain_exp_sp = new NativeFunction(ptr(0x866A3FE), 'int', ['pointer', 'int', 'pointer', 'pointer', 'int', 'int', 'int'], { "abi": "sysv" });
// 获取角色所在队伍
api.CUser_GetParty = new NativeFunction(ptr(0x0865514C), 'pointer', ['pointer'], { "abi": "sysv" });
// 道具是否被锁
api.CUser_CheckItemLock = new NativeFunction(ptr(0x8646942), 'int', ['pointer', 'int', 'int'], { "abi": "sysv" });
api.CUser_send_skill_info = new NativeFunction(ptr(0x866C46A), 'void', ['pointer'], { "abi": "sysv" });
// 踢出玩家
api.User_DisConnSig = new NativeFunction(ptr(0x86489f4), 'int', ['pointer', 'int', 'int', 'int'], { "abi": "sysv" });
api.CUser_GetCurCharacInventoryRef = new NativeFunction(ptr(0x08680C8A), 'pointer', ['pointer', 'int', 'int'], { "abi": "sysv" });
// 今日交易金币数量
api.CUser_getCurCharacTradeGoldDaily = new NativeFunction(ptr(0x08696600), 'int', ['pointer'], {"abi":"sysv"});
// 重置异界/极限祭坛次数
api.CUser_DimensionInoutUpdate = new NativeFunction(ptr(0x8656C12), 'int', ['pointer', 'int', 'int'], { "abi": "sysv" });
// 获取当前角色已使用疲劳值
api.CUser_getCurCharacUsedFatigue = new NativeFunction(ptr(0x8110CBA), 'int', ['pointer'], {"abi":"sysv"});
// 获取角色点券余额
api.CUser_getCera = new NativeFunction(ptr(0x080FDF7A), 'int', ['pointer'], { "abi": "sysv" });
api.CUser_SetCera = new NativeFunction(ptr(0x0817A1B4), 'pointer', ['pointer','int'], { "abi": "sysv" });
api.CUser_SendCashData = new NativeFunction(ptr(0x0865082A), 'void', ['pointer','int'], { "abi": "sysv" });
// 获取角色金币
api.CUser_GetMoney = new NativeFunction(ptr(0x0817a188), 'int', ['pointer'], { "abi": "sysv" });
// 获取角色状态
api.CUser_getState = new NativeFunction(ptr(0x80DA38C), 'int', ['pointer'], { "abi": "sysv" });
// 设置角色状态
api.CUser_set_state = new NativeFunction(ptr(0x0867EDB2), 'int', ['pointer','int'], { "abi": "sysv" });
// 获取契约状态
api.CUser_isAffectedPremium = new NativeFunction(ptr(0x080E600E), 'int', ['int', 'int'], {"abi":"sysv"});
// 是否在交易中
api.CUser_CheckInTrade = new NativeFunction(ptr(0x080da2fe), 'uint16', ['pointer'], {"abi":"sysv"});
// 是否GM任务模式
api.CUser_getGmQuestFlag = new NativeFunction(ptr(0x822FC8E), 'int', ['pointer'], { "abi": "sysv" });
api.CUser_GetUID = new NativeFunction(ptr(0x080C8C96), 'int', ['pointer'], { "abi": "sysv" });
// 复制道具属性
api.CUser_copyItemOption = new NativeFunction(ptr(0x8671EB2), 'int', ['pointer', 'pointer', 'pointer'],{"abi":"sysv"});
// 获取账号金库
api.CUser_getAccountCargo = new NativeFunction(ptr(0x822fc22), 'pointer', ['pointer'], { "abi": "sysv" });
// 获取是否拥有账号仓库
api.CUser_IsExistAccountCargo = new NativeFunction(ptr(0x0822FC30), 'int', ['pointer'], { "abi": "sysv" });
// 发送胜点
api.CUser_gainWinPoint = new NativeFunction(ptr(0x0864FD2C), 'void', ['pointer', 'int', 'int'], { "abi": "sysv" });
api.GET_USER = new NativeFunction(ptr(0x084bb9cf), 'int', ['pointer'], { "abi": "sysv" });
// 返回角色选择列表
api.CUser_ReturnToSelectCharacList = new NativeFunction(ptr(0x8686FEE), 'int', ['pointer', 'int'], {"abi":"sysv"});
// 获取公会名称
api.CUser_GetGuildName = new NativeFunction(ptr(0x869742A), 'pointer', ['pointer'], { "abi": "sysv" });
// 减少疲劳值
api.CUser_FatigueUp = new NativeFunction(ptr(0x08655C60), 'int', ['pointer', 'int'], {"abi":"sysv"});
// 检查疲劳值
api.CUser_CheckFatigue = new NativeFunction(ptr(0x08656500), 'int', ['pointer'], {"abi":"sysv"});
// 刷新疲劳值
api.CUser_SendFatigue = new NativeFunction(ptr(0x08656540), 'void', ['pointer'], {"abi":"sysv"});
// 增加疲劳值
api.CUser_gainCurCharacFatigue = new NativeFunction(ptr(0x0864F7FE), 'int', ['pointer', 'int'], {"abi":"sysv"});
api.CUser_GetCurExpertJobLevel = new NativeFunction(ptr(0x868BC7C), 'int', ['pointer', 'int'], { "abi": "sysv" });
// 使用点券
api.CUser_UseCera = new NativeFunction(ptr(0x0817A1C6), 'int', ['pointer','int'], { "abi": "sysv" });
api.CUser_addUsedCera = new NativeFunction(ptr(0x0817A21A), 'int', ['pointer','int'], { "abi": "sysv" });
// 发送命令错误包
api.CUser_SendCmdErrorPacket = new NativeFunction(ptr(0x0867BF42), 'int', ["pointer", "int", "uint8"], { "abi": "sysv" });
// 发送命令成功包
api.CUser_SendCmdOkPacket = new NativeFunction(ptr(0x0867BEA0), 'int', ["pointer", "int"], { "abi": "sysv" });
// 删除角色
api.CUser_DeleteCharac = new NativeFunction(ptr(0x0864A63A), 'pointer', ['pointer', 'int'], { "abi": "sysv" });
// 邮件弹窗验证
api.CUser_reqSendMailCertify = new NativeFunction(ptr(0x0868A51A), 'int', ['pointer'], {"abi":"sysv"});
// 获取角色总疲劳值
api.CUser_getCurCharacTotalFatigue = new NativeFunction(ptr(0x08657766), 'int', ['pointer'], {"abi":"sysv"});
// 获取角色最大总疲劳值
api.CUser_getCurCharacTotalMaxFatigue = new NativeFunction(ptr(0x08657804), 'int', ['pointer'], {"abi":"sysv"});
api.CUser_CheckCoolTimeItem = new NativeFunction(ptr(0x865E994), 'int', ['pointer', 'int'], { "abi": "sysv" });
// 通知客户端更新背包栏
api.CUser_send_itemspace = new NativeFunction(ptr(0x865DB6C), 'int', ['pointer', 'int'], { "abi": "sysv" });
// 检查队伍
api.CUser_CheckInParty = new NativeFunction(ptr(0x80DA314), 'int', ['pointer'], { "abi": "sysv" });
// 获取服务器组
api.CUser_GetServerGroup = new NativeFunction(ptr(0x80CBC90), 'int', ['pointer'], { "abi": "sysv" });
// 根据角色CID获取角色名称
api.CUser_get_charac_name_by_charac_no = new NativeFunction(ptr(0x0863BECE), 'pointer', ['pointer', 'int'], {"abi":"sysv"});
// 设置角色槽位限制
api.CUser_setCharacSlotLimit = new NativeFunction(ptr(0x0869755C), 'pointer', ['pointer', 'int'], {"abi": "sysv"});
api.CUser_GetPremiumInfo = new NativeFunction(ptr(0x0863BE94), 'pointer', ['pointer'], { "abi": "sysv" });
// 设置异界次数
api.CUserCharacInfo_setDemensionInoutValue = new NativeFunction(ptr(0x0822f184), 'int', ['pointer', 'int', 'int'], { "abi": "sysv" });

// ==================== 物品相关 ====================
// 背包道具构造函数
api.Inven_Item = new NativeFunction(ptr(0x80CB854), 'pointer', ['pointer'], { "abi": "sysv" });
// 检查背包中道具是否为空
api.Inven_Item_isEmpty = new NativeFunction(ptr(0x811ED66), 'int', ['pointer'], { "abi": "sysv" });
// 获取背包中道具item_id
api.Inven_Item_getKey = new NativeFunction(ptr(0x850D14E), 'int', ['pointer'], { "abi": "sysv" });
// 获取背包中装备强化等级
api.Inven_Item_GetUpgrade = new NativeFunction(ptr(0x080F506C), 'int', ['pointer'], { "abi": "sysv" });
// 获取道具附加信息
api.Inven_Item_get_add_info = new NativeFunction(ptr(0x80F783A), 'int', ['pointer'], { "abi": "sysv" });
// 道具是否是装备
api.Inven_Item_isEquipableItemType = new NativeFunction(ptr(0x08150812), 'bool', ['pointer'], { "abi": "sysv" });
// 获取装备已封装次数
api.Inven_Item_GetReSealCount = new NativeFunction(ptr(0x0822B456), 'int', ['pointer'], { "abi": "sysv" });
// 更改装备封装次数
api.Inven_Item_SetReSealCount = new NativeFunction(ptr(0x0822B466), 'int', ['pointer','int'], { "abi": "sysv" });
// 删除背包槽中的道具(重置)
api.Inven_Item_reset = new NativeFunction(ptr(0x080CB7D8), 'int', ['pointer'], { "abi": "sysv" });
api.Inven_Item_set_add_info = new NativeFunction(ptr(0x080CB884), 'int', ['pointer', 'int'], { "abi": "sysv" });
// 获取物品名称
api.CItem_getItemName = new NativeFunction(ptr(0x811ed82), 'int', ['pointer'], { "abi": "sysv" });
// 获取装备品级
api.CItem_get_rarity = new NativeFunction(ptr(0x080F12D6), 'int', ['pointer'], { "abi": "sysv" });
// 道具是否为消耗品/可堆叠
api.CItem_is_stackable = new NativeFunction(ptr(0x80F12FA), 'int', ['pointer'], { "abi": "sysv" });
// 获取装备耐久度
api.CEquipItem_get_endurance = new NativeFunction(ptr(0x811ED98), 'int', ['pointer'], { "abi": "sysv" });
// 以装备信息，如果道具不是装备类型，返回空
api.CEquipItem_GetUsableEquipmentType = new NativeFunction(ptr(0x0832e036), 'int', ['pointer'], { "abi": "sysv" });
api.CEquipItem_make_item = new NativeFunction(ptr(0x0851098A), 'pointer', ['pointer', 'pointer'], "sysv");
api.CItem_getIndex = new NativeFunction(ptr(0x8110c48), 'int', ['pointer'], { "abi": "sysv" });
//获取装备grade等级
api.CItem_get_grade = new NativeFunction(ptr(0x8110c54), 'int', ['pointer'], { "abi": "sysv" });
// 获取道具价格
api.CItem_getPrice = new NativeFunction(ptr(0x822c84a), 'int', ['pointer'], { "abi": "sysv" });
// 获取道具生成率
api.CItem_getGenRate = new NativeFunction(ptr(0x822c84a), 'int', ['pointer'], { "abi": "sysv" });
// 获取道具使用等级
api.CItem_getNeedLevel = new NativeFunction(ptr(0x8545fda), 'int', ['pointer'], { "abi": "sysv" });
api.CItem_isSpecialMonsterDropItem = new NativeFunction(ptr(0x08539E00), 'int', ['pointer'], { "abi": "sysv" });
// 获取装备可穿戴等级
api.CItem_getUsableLevel = new NativeFunction(ptr(0x80F12EE), 'int', ['pointer'], { "abi": "sysv" });
// 获取装备附加类型
api.CItem_getAttachType = new NativeFunction(ptr(0x80f12e2), 'int', ['pointer'], { "abi": "sysv" });
// 获取装备[item group name]
api.CItem_getItemGroupName = new NativeFunction(ptr(0x80F1312), 'int', ['pointer'], { "abi": "sysv" });
api.CItem_getUpSkillType = new NativeFunction(ptr(0x8545fcc), 'int', ['pointer'], { "abi": "sysv" });
api.CItem_getGetExpertJobCompoundMaterialVariation = new NativeFunction(ptr(0x850d292), 'int', ['pointer'], { "abi": "sysv" });
api.CItem_getExpertJobCompoundRateVariation = new NativeFunction(ptr(0x850d2aa), 'int', ['pointer'], { "abi": "sysv" });
api.CItem_getExpertJobCompoundResultVariation = new NativeFunction(ptr(0x850d2c2), 'int', ['pointer'], { "abi": "sysv" });
api.CItem_getExpertJobSelfDisjointBigWinRate = new NativeFunction(ptr(0x850d2de), 'int', ['pointer'], { "abi": "sysv" });
api.CItem_getExpertJobSelfDisjointResultVariation = new NativeFunction(ptr(0x850d2f6), 'int', ['pointer'], { "abi": "sysv" });
api.CItem_getExpertJobAdditionalExp = new NativeFunction(ptr(0x850d30e), 'int', ['pointer'], { "abi": "sysv" });
// 获取道具兑换需要材料
api.CItem_getNeedMaterial = new NativeFunction(ptr(0x0850D6F4), 'pointer', ['pointer'], { "abi": "sysv" });
api.CItem_isPackagable = new NativeFunction(ptr(0x0828b5b4), 'int', ['pointer'], { "abi": "sysv" });
// 获取道具使用期限
api.CItem_getUsablePeriod = new NativeFunction(ptr(0x08110c60), 'int', ['pointer'], { "abi": "sysv" });
// 获取道具过期日期
api.CItem_getExpirationDate = new NativeFunction(ptr(0x080f1306), 'int', ['pointer'], { "abi": "sysv" });
// 获取道具增加状态的整数数据
api.CItem_getIncreaseStatusIntData = new NativeFunction(ptr(0x08694658), 'int', ['pointer', 'int', 'pointer'], { "abi": "sysv" });
// 获取道具增加状态的类型
api.CItem_getIncreaseStatusType = new NativeFunction(ptr(0x086946b6), 'int', ['pointer'], { "abi": "sysv" });
// 获取道具可使用PVP等级
api.CItem_getPVPLevel = new NativeFunction(ptr(0x08473612), 'int', ['pointer'], { "abi": "sysv" });
// 获取商城道具价格
api.CItemLimitEdition_getPriceCera = new NativeFunction(ptr(0x822CAFA), 'int', ['pointer'], { "abi": "sysv" });
// 获取道具堆叠上限
api.checkStackableLimit = new NativeFunction(ptr(0x08501A79), 'int', ['int', 'int'], { "abi": "sysv" });

// ==================== 背包相关 ====================
// 获取背包实例
api.CInventory_GetInvenRef = new NativeFunction(ptr(0x84FC1DE), 'pointer', ['pointer', 'int', 'int'], { "abi": "sysv" });
// 获取背包槽
api.CInventory_GetInvenSlot = new NativeFunction(ptr(0x084fb918), 'pointer', ['pointer', 'int', 'int', 'int'], {"abi":"sysv"});
// type：1装备栏(48格)，2消耗品(48格)，3材料(48格)，4任务(48格)，5宠物蛋(140格)，6宠物装备(49格)，10副职业(48格)
api.CInventory_check_empty_count = new NativeFunction(ptr(0x08504F64), 'int', ['pointer', 'int', 'int'], {"abi":"sysv"});
// 获取道具类型
api.CInventory_GetItemType = new NativeFunction(ptr(0x085018D2), 'int', ['pointer', 'int'], {"abi":"sysv"});
// 背包中删除道具(背包指针, 背包类型, 槽, 数量, 删除原因, 记录删除日志)
api.CInventory_delete_item = new NativeFunction(ptr(0x850400C), 'int', ['pointer', 'int', 'int', 'int', 'int', 'int'], { "abi": "sysv" });
api.CInventory_AddAvatarItem = new NativeFunction(ptr(0x8509B9E), 'int', ['pointer', 'int', 'int', 'int', 'int', 'int', 'pointer', 'int', 'int', 'int'], { "abi": "sysv" });
// 获取物品数量传参(背包，（1物品栏，2时装栏，3宠物装备），需要查找的物品ID)
api.CInventory_get_item_count = new NativeFunction(ptr(0x084FB500), 'int', ['pointer', 'int', 'int'], { "abi": "sysv" });
// 检查背包中是否存在item
api.CInventory_check_item_exist = new NativeFunction(ptr(0x08505172), 'int', ['pointer', 'int'], {"abi":"sysv"});
api.CInventory_SendItemLockListInven = new NativeFunction(ptr(0x84FAF8E), 'void', ['pointer'], { "abi": "sysv" });
api.CInventory_SendItemLockListAvatar = new NativeFunction(ptr(0x084FAFBE), 'void', ['pointer'], { "abi": "sysv" });
api.CInventory_SendItemLockListCreature = new NativeFunction(ptr(0x084FAFEE), 'void', ['pointer'], { "abi": "sysv" });
api.CInventory_SendItemLockList = new NativeFunction(ptr(0x084FAE0A), 'void', ['pointer', 'pointer', 'int', 'int'], { "abi": "sysv" });
// 获取角色当前持有金币数量
api.CInventory_get_money = new NativeFunction(ptr(0x81347D6), 'int', ['pointer'], { "abi": "sysv" });
// 减少金币
api.CInventory_use_money = new NativeFunction(ptr(0x84FF54C), 'int', ['pointer', 'int', 'int', 'int'], { "abi": "sysv" });
// 增加金币
api.CInventory_gain_money = new NativeFunction(ptr(0x84FF29C), 'int', ['pointer', 'int', 'int', 'int', 'int'], { "abi": "sysv" });
// 获取时装管理器
api.CInventory_GetAvatarItemMgrR = new NativeFunction(ptr(0x80DD576), 'pointer', ['pointer'], { "abi": "sysv" });
api.CInventory_GetInvenData = new NativeFunction(ptr(0x084fbf2c), 'int', ['pointer', 'int', 'pointer'], { "abi": "sysv" });
// 获取背包空槽
api.CInventory_get_empty_slot = new NativeFunction(ptr(0x84FB824), 'int', ['pointer', 'int', 'int'], { "abi": "sysv" });
// 获取背包剩余容量
api.CInventory_GetRemainCapacity = new NativeFunction(ptr(0x084FB67A), 'int', ['pointer', 'int', 'int'], { "abi": "sysv" });
api.CInventory_MakeItemPacket = new NativeFunction(ptr(0x084FC6BC), 'int', ['pointer', 'int',  'int', 'pointer'], { "abi": "sysv" });
//返回值大于0则为被克隆的原始装扮ID(inven, slot)
api.CInventory_GetClearAvatar = new NativeFunction(ptr(0x0850D374), 'int', ['pointer', 'int'], { "abi": "sysv" });

// ==================== 世界相关 ====================
// 获取GameWorld实例
api.G_GameWorld = new NativeFunction(ptr(0x80DA3A7), 'pointer', [], { "abi": "sysv" });
// 重置疲劳(世界)
api.GameWorld_ResetAllFatigue = new NativeFunction(ptr(0x086CC3EC), 'int', ['pointer'], { "abi": "sysv" });
// 根据server_id查找user
api.GameWorld_find_from_world = new NativeFunction(ptr(0x86C4B9C), 'pointer', ['pointer', 'int'], { "abi": "sysv" });
// 城镇瞬移
api.GameWorld_move_area = new NativeFunction(ptr(0x86C5A84), 'pointer', ['pointer', 'pointer', 'int', 'int', 'int', 'int', 'int', 'int', 'int', 'int', 'int'], { "abi": "sysv" });
// 将协议发给所有在线玩家(慎用! 广播类接口必须限制调用频率, 防止CC攻击)
api.GameWorld_send_all_with_state = new NativeFunction(ptr(0x86C9184), 'int', ['pointer', 'pointer', 'int'], { "abi": "sysv" });
// 在线玩家列表(用于std::map遍历)
api.Gameworld_user_map_begin = new NativeFunction(ptr(0x80F78A6), 'int', ['pointer', 'pointer'], { "abi": "sysv" });
api.Gameworld_user_map_end = new NativeFunction(ptr(0x80F78CC), 'int', ['pointer', 'pointer'], { "abi": "sysv" });
api.Gameworld_user_map_not_equal = new NativeFunction(ptr(0x80F78F2), 'bool', ['pointer', 'pointer'], { "abi": "sysv" });
api.Gameworld_user_map_get = new NativeFunction(ptr(0x80F7944), 'pointer', ['pointer'], { "abi": "sysv" });
api.Gameworld_user_map_next = new NativeFunction(ptr(0x80F7906), 'pointer', ['pointer', 'pointer'], { "abi": "sysv" });
// 将协议发给所有在线玩家
api.GameWorld_send_all = new NativeFunction(ptr(0x86C8C14), 'int', ['pointer', 'pointer'], { "abi": "sysv" });
// 是否副本接口处区域
api.GameWorld_isDungeonEntranceArea = new NativeFunction(ptr(0x086CEC84), 'int', ['pointer', 'pointer'], {"abi":"sysv"});
api.GameWorld_out_from_dungeon = new NativeFunction(ptr(0x086C6A16), 'void', ['pointer', 'pointer'], {"abi":"sysv"});
// 根据账号查找已登录角色
api.GameWorld_find_user_from_world_byaccid = new NativeFunction(ptr(0x86C4D40), 'pointer', ['pointer', 'int'], { "abi": "sysv" });
// 获取副本接口ID
api.GameWorld_GetWorldMapIndex = new NativeFunction(ptr(0x086CEBE0), 'int', ['pointer', 'pointer'], {"abi":"sysv"});
// 获取城镇编号
api.GameWorld_GetVillage = new NativeFunction(ptr(0x086D1764), 'int', ['pointer', 'int'], {"abi":"sysv"});
api.GameWorld_IsPVPChannel = new NativeFunction(ptr(0x81424E8), 'int', ['pointer'], { "abi": "sysv" });
api.GameWorld_IsEnchantRevisionChannel = new NativeFunction(ptr(0x082343fc), 'int', ['pointer'], {"abi":"sysv"});
api.GameWorld_getDungeonMinimumRequiredLevel = new NativeFunction(ptr(0x086c9076), 'int', ['pointer','int'], {"abi":"sysv"});
api.GameWorld_send_user_dungeon_inout_message = new NativeFunction(ptr(0x086c8fc8), 'void', ['pointer','pointer','int','int'], {"abi":"sysv"});
api.GameWorld_IsPvPSkilTreeChannel = new NativeFunction(ptr(0x0823441e), 'int', ['pointer'], {"abi":"sysv"});

// ==================== 数据管理 ====================
// 获取DataManager实例
api.G_CDataManager = new NativeFunction(ptr(0x80CC19B), 'pointer', [], { "abi": "sysv" });
// 获取装备pvf数据
api.CDataManager_find_item = new NativeFunction(ptr(0x835FA32), 'pointer', ['pointer', 'int'], { "abi": "sysv" });
// 获取副本pvf数据
api.CDataManager_find_dungeon = new NativeFunction(ptr(0x835F9F8), 'pointer', ['pointer', 'int'], {"abi":"sysv"});
// 从pvf中获取任务数据
api.CDataManager_find_quest = new NativeFunction(ptr(0x835FDC6), 'pointer', ['pointer', 'int'], { "abi": "sysv" });
// 获取副本名称
api.CDungeon_getDungeonName = new NativeFunction(ptr(0x81455A6), 'pointer', ['pointer'], {"abi":"sysv"});
// 获取等级经验
api.CDataManager_get_level_exp = new NativeFunction(ptr(0x08360442), 'int', ['pointer', 'int'], { "abi": "sysv" });
api.CDataManager_getDailyTrainingQuest = new NativeFunction(ptr(0x083640fe), 'pointer', ['pointer', 'int'], { "abi": "sysv" });
// 获取等级SP点数
api.CDataManager_getSpAtLevelUp = new NativeFunction(ptr(0x08360cb8), 'int', ['pointer', 'int'], { "abi": "sysv" });
api.CDataManager_get_event_script_mng = new NativeFunction(ptr(0x08110b62), 'pointer', ['pointer'], { "abi": "sysv" });
api.CDataManager_getExpertJobScript = new NativeFunction(ptr(0x0822b5f2), 'pointer', ['pointer', 'int'], { "abi": "sysv" });
api.CDataManager_get_dimensionInout = new NativeFunction(ptr(0x0822b612), 'int', ['pointer', 'int'], { "abi": "sysv" });
// 获取深渊派对组编号
api.CDataManager_find_hellparty_group = new NativeFunction(ptr(0x08363716), 'int', ['pointer', 'int'], { "abi": "sysv" });
api.CDataManager_find_skill = new NativeFunction(ptr(0x0835FDA2), 'pointer', ['pointer', 'int', 'int'], {"abi":"sysv"});
api.CDataManager_getItemLimitEditionMgr = new NativeFunction(ptr(0x08179FA6), 'pointer', ['pointer'], { "abi": "sysv" });
// 获取商城道具价格 FindGoods
api.CDataManager_FindGoods = new NativeFunction(ptr(0x835FDE4), 'pointer', ['pointer', 'int'], { "abi": "sysv" });

// ==================== 封包相关 ====================
// 服务器组包
api.PacketGuard_PacketGuard = new NativeFunction(ptr(0x858DD4C), 'int', ['pointer'], { "abi": "sysv" });
api.Destroy_PacketGuard_PacketGuard = new NativeFunction(ptr(0x858DE80), 'int', ['pointer'], { "abi": "sysv" });
api.InterfacePacketBuf_put_header = new NativeFunction(ptr(0x80CB8FC), 'int', ['pointer', 'int', 'int'], { "abi": "sysv" });
api.InterfacePacketBuf_put_byte = new NativeFunction(ptr(0x80CB920), 'int', ['pointer', 'uint8'], { "abi": "sysv" });
api.InterfacePacketBuf_put_short = new NativeFunction(ptr(0x80D9EA4), 'int', ['pointer', 'uint16'], { "abi": "sysv" });
api.InterfacePacketBuf_put_int = new NativeFunction(ptr(0x80CB93C), 'int', ['pointer', 'int'], { "abi": "sysv" });
api.InterfacePacketBuf_put_binary = new NativeFunction(ptr(0x811DF08), 'int', ['pointer', 'pointer', 'int'], { "abi": "sysv" });
api.InterfacePacketBuf_put_str = new NativeFunction(ptr(0x081B73E4), 'int', ['pointer', 'pointer', 'int'], {"abi":"sysv"});
api.InterfacePacketBuf_finalize = new NativeFunction(ptr(0x80CB958), 'int', ['pointer', 'int'], { "abi": "sysv" });
// 从客户端封包中读取数据
api.PacketBuf_get_byte = new NativeFunction(ptr(0x858CF22), 'int', ['pointer', 'pointer'], { "abi": "sysv" });
api.PacketBuf_get_short = new NativeFunction(ptr(0x858CFC0), 'int', ['pointer', 'pointer'], { "abi": "sysv" });
api.PacketBuf_get_int = new NativeFunction(ptr(0x858D27E), 'int', ['pointer', 'pointer'], { "abi": "sysv" });
api.PacketBuf_get_binary = new NativeFunction(ptr(0x858D3B2), 'int', ['pointer', 'pointer', 'int'], { "abi": "sysv" });
api.PacketBuf_get_index = new NativeFunction(ptr(0x08110B1C), 'int', ['pointer'], { "abi": "sysv" });
api.InterfacePacketBuf_set_index = new NativeFunction(ptr(0x0822B7B0), 'int', ['pointer', 'int'], { "abi": "sysv" });
api.InterfacePacketBuf_clear = new NativeFunction(ptr(0x080cb8e6), 'int', ['pointer'], { "abi": "sysv" });
api.InterfacePacketBuf_put_packet = new NativeFunction(ptr(0x0815098e), 'int', ['pointer', 'pointer'], { "abi": "sysv" });
api.Packet_Monitor_Max_Level_BroadCast_Packet_Monitor_Max_Level_BroadCast = new NativeFunction(ptr(0x08694560), 'void', ['pointer'], { "abi": "sysv" });
api.InterfacePacketBuf_put_byte_p = new NativeFunction(ptr(0x8110B28), 'int', ['pointer', 'pointer', 'int'], { "abi": "sysv" });
api.InterfacePacketBuf_get_index = new NativeFunction(ptr(0x8110B4C), 'int', ['pointer'], { "abi": "sysv" });
api.InterfacePacketBuf_get_len = new NativeFunction(ptr(0x0848f438), 'int', ['pointer'], { "abi": "sysv" });
api.InterfacePacketBuf_put_short_p = new NativeFunction(ptr(0x8116908), 'int', ['pointer', 'pointer', 'int'], { "abi": "sysv" });
api.InterfacePacketBuf_put_int_p = new NativeFunction(ptr(0x84B804A), 'int', ['pointer', 'pointer', 'int'], { "abi": "sysv" });
api.InterfacePacketBuf_put_item_idx = new NativeFunction(ptr(0x0822B794), 'int', ['pointer', 'uint'], { "abi": "sysv" });

// ==================== 任务相关 ====================
// 获取玩家任务信息
api.CUser_getCurCharacQuestW = new NativeFunction(ptr(0x814AA5E), 'pointer', ['pointer'], { "abi": "sysv" });
// 任务相关操作(第二个参数为协议编号: 33=接受任务, 34=放弃任务, 35=任务完成条件已满足, 36=提交任务领取奖励)
api.CUser_quest_action = new NativeFunction(ptr(0x0866DA8A), 'int', ['pointer', 'int', 'int', 'int', 'int'], { "abi": "sysv" });
// 设置GM完成任务模式(无条件完成任务)
api.CUser_setGmQuestFlag = new NativeFunction(ptr(0x822FC8E), 'int', ['pointer', 'int'], { "abi": "sysv" });
// 通知客户端更新已完成任务列表
api.CUser_send_clear_quest_list = new NativeFunction(ptr(0x868B044), 'int', ['pointer'], { "abi": "sysv" });
// 计算任务基础奖励(不包含道具奖励)
api.CUser_quest_basic_reward = new NativeFunction(ptr(0x866E7A8), 'int', ['pointer', 'pointer', 'pointer', 'pointer', 'pointer', 'pointer', 'int'], { "abi": "sysv" });
// 通知客户端QP更新
api.CUser_sendCharacQp = new NativeFunction(ptr(0x868AC24), 'int', ['pointer'], { "abi": "sysv" });
// 通知客户端QuestPiece更新
api.CUser_sendCharacQuestPiece = new NativeFunction(ptr(0x868AF2C), 'int', ['pointer'], { "abi": "sysv" });
// 通知客户端更新角色任务列表
api.UserQuest_get_quest_info = new NativeFunction(ptr(0x86ABBA8), 'int', ['pointer', 'pointer'], { "abi": "sysv" });
// 设置任务为已完成状态
api.WongWork_CQuestClear_setClearedQuest = new NativeFunction(ptr(0x808BA78), 'int', ['pointer', 'int'], { "abi": "sysv" });
// 重置任务为未完成状态
api.WongWork_CQuestClear_resetClearedQuests = new NativeFunction(ptr(0x808BAAC), 'int', ['pointer', 'int'], { "abi": "sysv" });
// 任务是否已完成
api.WongWork_CQuestClear_isClearedQuest = new NativeFunction(ptr(0x808BAE0), 'int', ['pointer', 'int'], { "abi": "sysv" });
api.UserQuest_finish_quest = new NativeFunction(ptr(0x86AC854), 'int', ['pointer', 'int'], { "abi": "sysv" });
// 重置所有任务为未完成状态
api.UserQuest_reset = new NativeFunction(ptr(0x86AB894), 'int', ['pointer'], { "abi": "sysv" });
// 检测当前角色是否可接该任务
api.stSelectQuestParam_stSelectQuestParam = new NativeFunction(ptr(0x83480B4), 'pointer', ['pointer', 'pointer'], { "abi": "sysv" });
api.Quest_check_possible = new NativeFunction(ptr(0x8352D86), 'int', ['pointer', 'pointer'], { "abi": "sysv" });
api.WongWork_CUserPremium_getOverSkillLevel = new NativeFunction(ptr(0x08609398), 'int', ['pointer'], { "abi": "sysv" });

// ==================== 技能相关 ====================
// 技能槽设置SP点数
api.SkillSlot_set_remain_sp_at_index = new NativeFunction(ptr(0x086034f8), 'int', ['int','int','int'], {"abi":"sysv"});
// 技能槽获取SP点数
api.SkillSlot_get_remain_sp_at_index = new NativeFunction(ptr(0x08603528), 'int', ['pointer','int'], {"abi":"sysv"});
// 技能槽设置TP点数
api.SkillSlot_set_remain_sfp_at_index = new NativeFunction(ptr(0x08603590), 'int', ['int','int','int'], {"abi":"sysv"});
// 技能槽获取TP点数
api.SkillSlot_get_remain_sfp_at_index = new NativeFunction(ptr(0x086035f2), 'int', ['pointer','int'], {"abi":"sysv"});
// 初始化技能
api.SkillSlot_InitSkill = new NativeFunction(ptr(0x08608120), 'int', ['pointer','int','int'], {"abi":"sysv"});
// 清除所有技能
api.SkillSlot_clear_all_skills = new NativeFunction(ptr(0x08604D90), 'pointer', ['pointer','int'], { "abi": "sysv" });
api.SkillSlot_get_skillslot_buf = new NativeFunction(ptr(0x086067DE), 'pointer', ['pointer', 'int'], {"abi":"sysv"});
api.SkillSlot_get_skillslot_group = new NativeFunction(ptr(0x086049FC), 'int', ['pointer', 'int'], {"abi":"sysv"});
api.SkillSlot_get_skillslot_no = new NativeFunction(ptr(0x08604A86), 'int', ['pointer', 'int', 'int', 'int', 'int'], {"abi":"sysv"});
api.SkillSlot_debugCheckGrowTypeSkill = new NativeFunction(ptr(0x086049FC), 'void', ['pointer', 'int', 'int', 'int', 'int'], {"abi":"sysv"});
api.SkillSlot_skill_move = new NativeFunction(ptr(0x08604428), 'int', ['pointer', 'int', 'int', 'int'], {"abi":"sysv"});
api.SkillSlot_checkComboSkillInsertQuickSlot = new NativeFunction(ptr(0x08608D58), 'int', ['pointer', 'int'], {"abi":"sysv"});

// ==================== 分解相关 ====================
// 分解机 参数 角色 位置 背包类型  239  角色（谁的） 0xFFFF
api.DisPatcher_DisJointItem_disjoint = new NativeFunction(ptr(0x81f92ca), 'int', ['pointer', 'int', 'int', 'int', 'pointer', 'int'], { "abi": "sysv" });
// 检查分解条件(用户状态)
api.check_disjointable_user_state = new NativeFunction(ptr(0x81F8A7C), 'int', ['pointer', 'int', 'int', 'int'], { "abi": "sysv" });
// 检查分解条件(道具状态)
api.check_disjointable_item_state = new NativeFunction(ptr(0x81F8BA1), 'int', ['pointer', 'int', 'int', 'pointer', 'pointer', 'pointer', 'int'], { "abi": "sysv" });
// 检查分解需要的格子
api.check_disjoint_need_slot = new NativeFunction(ptr(0x81F8FE3), 'int', ['pointer', 'pointer', 'pointer', 'pointer'], { "abi": "sysv" });
// 专家模式分解完成
api.expert_job_CDisjointer_complete_disjoint = new NativeFunction(ptr(0x85D31A0), 'int', ['pointer', 'pointer', 'pointer'], { "abi": "sysv" });
// 获取分解机等级
api.expert_job_CDisjointer_get_disjoint_machine_grade = new NativeFunction(ptr(0x85D1F0A), 'int', ['pointer'], { "abi": "sysv" });

// ==================== 点券相关 ====================
// 点券充值
api.WongWork_IPG_CIPGHelper_IPGInput = new NativeFunction(ptr(0x80FFCA4), 'int', ['pointer', 'pointer', 'int', 'int', 'pointer', 'pointer', 'pointer', 'pointer', 'pointer', 'pointer'], { "abi": "sysv" });
// 代币充值
api.WongWork_IPG_CIPGHelper_IPGInputPoint = new NativeFunction(ptr(0x80FFFC0), 'int', ['pointer', 'pointer', 'int', 'int', 'pointer', 'pointer'], { "abi": "sysv" });
// 同步点券数据库
api.WongWork_IPG_CIPGHelper_IPGQuery = new NativeFunction(ptr(0x8100790), 'int', ['pointer', 'pointer'], { "abi": "sysv" });
api.WongWork_CGenUniqueNo_genIPGNo = new NativeFunction(ptr(0x84B7750), 'pointer', ['int', 'int', 'pointer'], { "abi": "sysv" });
api.updateUsedCera = new NativeFunction(ptr(0x0817A1C6), 'int', ['pointer','int','int'], { "abi": "sysv" });

// ==================== 邮件相关 ====================
//发系统邮件(多道具)
api.WongWork_CMailBoxHelper_ReqDBSendNewSystemMultiMail = new NativeFunction(ptr(0x8556B68), 'int', ['pointer', 'pointer', 'int', 'int', 'int', 'pointer', 'int', 'int', 'int', 'int'], { "abi": "sysv" });
api.WongWork_CMailBoxHelper_MakeSystemMultiMailPostal = new NativeFunction(ptr(0x8556A14), 'int', ['pointer', 'pointer', 'int'], { "abi": "sysv" });
api.std_vector_std_pair_int_int_vector = new NativeFunction(ptr(0x81349D6), 'pointer', ['pointer'], { "abi": "sysv" });
api.std_vector_std_pair_int_int_clear = new NativeFunction(ptr(0x817A342), 'pointer', ['pointer'], { "abi": "sysv" });
api.std_make_pair_int_int = new NativeFunction(ptr(0x81B8D41), 'pointer', ['pointer', 'pointer', 'pointer'], { "abi": "sysv" });
api.std_vector_std_pair_int_int_push_back = new NativeFunction(ptr(0x80DD606), 'pointer', ['pointer', 'pointer'], { "abi": "sysv" });

// ==================== 其他 ====================
// 服务器环境
api.G_CEnvironment = new NativeFunction(ptr(0x080CC181), 'pointer', [], { "abi": "sysv" });
// 获取当前服务器配置文件名
api.CEnvironment_get_file_name = new NativeFunction(ptr(0x80DA39A), 'pointer', ['pointer'], { "abi": "sysv" });
// 执行debug命令
api.DoUserDefineCommand = new NativeFunction(ptr(0x0820BA90), 'int', ['pointer', 'int', 'pointer'], { "abi": "sysv" });
// 原生获取随机数
api.get_rand_int = new NativeFunction(ptr(0x086B1B87), 'int', ['int'], { "abi": "sysv" });
// 通知客户端角色属性更新
api.CUser_SendNotiPacket = new NativeFunction(ptr(0x867BA5C), 'int', ['pointer', 'int', 'int', 'int'], { "abi": "sysv" });
api.compress_zip = new NativeFunction(ptr(0x86B201F), 'int', ['pointer', 'pointer', 'pointer', 'int'], { "abi": "sysv" });
api.uncompress_zip = new NativeFunction(ptr(0x86B2102), 'int', ['pointer', 'pointer', 'pointer', 'int'], { "abi": "sysv" });
// 修复金币异常
api.CParty_UseAncientDungeonItems = new NativeFunction(ptr(0x859EAC2), 'int', ['pointer', 'pointer', 'pointer', 'pointer'], { "abi": "sysv" });
api.CTimeGate_SetLevel = new NativeFunction(ptr(0x084ED4A4), 'int', ['pointer', 'int'], { "abi": "sysv" });
api.CEventManager_TriggerEventStart = new NativeFunction(ptr(0x08115CC6), 'int', ['pointer', 'int', 'int'], { "abi": "sysv" });
api.CEventManager_TriggerEventEnd = new NativeFunction(ptr(0x08115D60), 'int', ['pointer', 'int'], { "abi": "sysv" });
// 南部溪谷开关
api.CDailyScheduleManager_GM_OpenSouthernDale = new NativeFunction(ptr(0x081267BC), 'int', ['pointer'], { "abi": "sysv" });
api.CDailyScheduleManager_GM_CloseSouthernDale = new NativeFunction(ptr(0x08126AD2), 'int', ['pointer'], { "abi": "sysv" });
// 领主之塔开关
api.CDailyScheduleManager_GM_OpenBossTower = new NativeFunction(ptr(0x08126CB8), 'int', ['pointer'], { "abi": "sysv" });
api.CDailyScheduleManager_GM_CloseBossTower = new NativeFunction(ptr(0x08126D0C), 'int', ['pointer'], { "abi": "sysv" });
// 金银角副本
api.CDailyScheduleManager_GM_OpenKingHorn = new NativeFunction(ptr(0x08126C5C), 'int', ['pointer'], { "abi": "sysv" });
api.CDailyScheduleManager_GM_CloseKingHorn = new NativeFunction(ptr(0x08126C8A), 'int', ['pointer'], { "abi": "sysv" });
api.CEventManager_GetRepeatEvent = new NativeFunction(ptr(0x08115998), 'pointer', ['pointer','int'], {"abi":"sysv"});
// 返回城镇
api.CParty_ReturnToVillage = new NativeFunction(ptr(0X085ACA60), 'void', ['pointer'], { "abi": "sysv" });
api.CParty_is_quick_party = new NativeFunction(ptr(0x0822D952), 'int', ['pointer'], {"abi":"sysv"});
api.CParty_set_quick_party = new NativeFunction(ptr(0x0822D936), 'pointer', ['pointer','int'], { "abi": "sysv" });
api.CParty_dungeon_start = new NativeFunction(ptr(0x85A0954), 'int', ['pointer', 'pointer', 'int', 'int'], { "abi": "sysv" });

// ==================== 系统函数 ====================
// 获取系统时间
api.CSystemTime_getCurSec = new NativeFunction(ptr(0x80CBC9E), 'int', ['pointer'], { "abi": "sysv" });

// ==================== 装备相关 ====================
// 是否魔法封印装备
api.CEquipItem_IsRandomOption = new NativeFunction(ptr(0x8514E5E), 'int', ['pointer'], { "abi": "sysv" });
// 解封魔法封印
api.random_option_CRandomOptionItemHandle_give_option = new NativeFunction(ptr(0x85F2CC6), 'int', ['pointer', 'int', 'int', 'int', 'int', 'int', 'pointer'], { "abi": "sysv" });
// 获取装备类型
api.CEquipItem_GetItemType = new NativeFunction(ptr(0x08514D26), 'int', ['pointer'], {"abi":"sysv"});
// 获取装备魔法封印等级
api.CEquipItem_GetRandomOptionGrade = new NativeFunction(ptr(0x08514E6E), 'int', ['pointer'], { "abi": "sysv" });
// 是否时装
api.CEquipItem_IsAvatarItem = new NativeFunction(ptr(0x08514D46), 'int', ['pointer'], { "abi": "sysv" });

// ==================== 副职业相关 ====================
// 转换背包类型？
api.GetInvenTypeFromItemSpace = new NativeFunction(ptr(0x80F7845), 'int', ['int'], { "abi": "sysv" });
// 获取副职业类型
api.expert_job_CExpertJob_GetType = new NativeFunction(ptr(0x8234796), 'int', ['pointer'], { "abi": "sysv" });

// ==================== 堆叠物品相关 ====================
// 获取消耗品类型
api.CStackableItem_GetItemType = new NativeFunction(ptr(0x8514A84), 'int', ['pointer'], { "abi": "sysv" });
// 获取道具堆叠上限
api.CStackableItem_getStackableLimit = new NativeFunction(ptr(0x0822C9FC), 'int', ['pointer'], {"abi":"sysv"});
// 获取徽章支持的镶嵌槽类型
api.CStackableItem_getJewelTargetSocket = new NativeFunction(ptr(0x0822CA28), 'int', ['pointer'], { "abi": "sysv" });

// ==================== 时装相关 ====================
// 获取时装插槽数据
api.WongWork_CAvatarItemMgr_getJewelSocketData = new NativeFunction(ptr(0x82F98F8), 'pointer', ['pointer', 'int'], { "abi": "sysv" });
// 时装镶嵌数据存盘
api.DB_UpdateAvatarJewelSlot_makeRequest = new NativeFunction(ptr(0x843081C), 'pointer', ['int', 'int', 'pointer'], { "abi": "sysv" });

// ==================== 仓库相关 ====================
api.AccCargo_check_item_exist = new NativeFunction(ptr(0x0828A61A), 'int', ['pointer','int'], { "abi": "sysv" });
// 获取账号仓库是否存在指定物品
api.CCargo_check_item_exist = new NativeFunction(ptr(0x0850BC14), 'int', ['pointer','int'], { "abi": "sysv" });
// 获取账号金库一个空的格子
api.CAccountCargo_GetEmptySlot = new NativeFunction(ptr(0x828a580), 'int', ['pointer'], { "abi": "sysv" });
// 将已经物品移动到某个格子 第一个账号金库，第二个移入的物品，第三个格子位置
api.CAccountCargo_InsertItem = new NativeFunction(ptr(0x8289c82), 'int', ['pointer', 'pointer', 'int'], { "abi": "sysv" });
// 仓库添加物品
api.CCargo_AddItem = new NativeFunction(ptr(0x850B672), 'pointer', ['pointer', 'pointer', 'int'], { "abi": "sysv" });
// 向客户端发送账号金库列表
api.CAccountCargo_SendItemList = new NativeFunction(ptr(0x828a88a), 'int', ['pointer'], { "abi": "sysv" });
api.CCargo_try_add_stack_item = new NativeFunction(ptr(0x0850B4B0), 'int', ['pointer', 'pointer', 'int'], { "abi": "sysv" });

// ==================== 队伍相关 ====================
// 队伍成员数量
api.CParty_get_member_count = new NativeFunction(ptr(0x0859A16A), 'int', ['pointer'], {"abi":"sysv"});
// 获取队伍中玩家
api.CParty_get_user = new NativeFunction(ptr(0x08145764), 'pointer', ['pointer', 'int'], { "abi": "sysv" });
api.CParty_send_to_party = new NativeFunction(ptr(0x0859d14e), 'int', ['pointer', 'pointer'], { "abi": "sysv" });
api.CParty_finish_loading = new NativeFunction(ptr(0x085B15E0), 'int', ['pointer', 'pointer'], { "abi": "sysv" });
// 获取队长
api.CParty_getManager = new NativeFunction(ptr(0x8145780), 'pointer', ['pointer'], { "abi": "sysv" });
// 队伍中根据角色ID获取user
api.CParty_FindUserBycharac_no = new NativeFunction(ptr(0x085A2140), 'int', ['pointer','int'], { "abi": "sysv" });
// 队伍成员疲劳检查
api.CParty_CheckMemberFatigue = new NativeFunction(ptr(0x0859D5E8), 'int', ['pointer'], {"abi":"sysv"});
// 是否隐形？
api.CParty_IsExistInvisible = new NativeFunction(ptr(0x085B6410), 'int', ['pointer'], { "abi": "sysv" });
// 获取队伍成员位置
api.CParty_GetMemberSlotNo = new NativeFunction(ptr(0x859AC7C), 'int', ['pointer', 'pointer'], { "abi": "sysv" });
api.CParty_getMapPlayingTime = new NativeFunction(ptr(0x085B6768), 'int', ['pointer'], { "abi": "sysv" });
// 是否单人模式
api.CParty_IsSinglePlay = new NativeFunction(ptr(0x0822D812), 'int', ['pointer'], { "abi": "sysv" });
api.CParty_game_start = new NativeFunction(ptr(0x859D718), 'int', ['pointer', 'pointer'], { "abi": "sysv" });
api.CParty_set_single_play = new NativeFunction(ptr(0x859B142), 'int', ['pointer', 'pointer'], { "abi": "sysv" });

// ==================== 副本相关 ====================
// 获取副本id
api.CDungeon_get_index = new NativeFunction(ptr(0x080FDCF0), 'int', ['pointer'], { "abi": "sysv" });
// 获取副本难度
api.CBattle_Field_get_dungeon_diff = new NativeFunction(ptr(0x080F981C), 'int', ['pointer'], { "abi": "sysv" });
// 检查是否访问过此地图
api.CBattle_Field_IsVisitedCurrentMap = new NativeFunction(ptr(0x085BF2E8), 'int', ['pointer'], {"abi":"sysv"});
// 是否第一次进入副本
api.CBattle_Field_IsFirstEnterDungeon = new NativeFunction(ptr(0x08307656), 'int', ['pointer'], {"abi":"sysv"});
api.CBattle_Field_add_item_curr_map = new NativeFunction(ptr(0x08302BC6), 'void', ['pointer', 'int', 'int'], {"abi":"sysv"});
api.CBattle_Field_GetTotalSkillMaterial = new NativeFunction(ptr(0x0830DE1C), 'int', ['pointer'], {"abi":"sysv"});
api.CBattle_Field_set_dungeon_diff = new NativeFunction(ptr(0x0830ED1E), 'pointer', ['pointer', 'int'], {"abi":"sysv"});
api.CBattle_Field_get_dungeon_index = new NativeFunction(ptr(0x0822D0D8), 'int', ['pointer'], { "abi": "sysv" });
api.CBattle_Field_IsKilledAllHellGruoups = new NativeFunction(ptr(0x085BF250), 'int', ['pointer'], { "abi": "sysv" });
api.CBattle_Field_GetHellPartyDifficulty = new NativeFunction(ptr(0x082FFA2E), 'int', ['pointer','int'], { "abi": "sysv" });
api.CBattle_Field_check_grid_clear = new NativeFunction(ptr(0x830A0E8), 'int', ['pointer'], { abi: "sysv" });
api.CBattleData_GetTotalKilledMonsterCount = new NativeFunction(ptr(0x085BF456), 'int', ['pointer'], { abi: "sysv" });
// 获取当前玩家所在副本
api.getDungeonIdxAfterClear = new NativeFunction(ptr(0x867CB90), 'int', ['pointer'], { "abi": "sysv" });

// ==================== 技能树相关 ====================
api.CSkill_get_group = new NativeFunction(ptr(0x08374B96), 'int', ['pointer'], {"abi":"sysv"});

// ==================== 游戏管理器相关 ====================
api.G_CGameManager = new NativeFunction(ptr(0x080cc18e), 'pointer', [], {"abi":"sysv"});
api.CGameManager_getUser = new NativeFunction(ptr(0x082947A4), 'pointer', ['pointer', 'int'], {"abi":"sysv"});
api.CGameManager_GetQuickPartyRewardManager = new NativeFunction(ptr(0x08298E24), 'int', ['pointer'], {"abi":"sysv"});
api.QuickParty_CQuickPartyRewardManager_get_random_buff_prob = new NativeFunction(ptr(0x0826D860), 'int', ['int','int','int'], {"abi":"sysv"});
api.CGameManager_GetPremiumLetheManager = new NativeFunction(ptr(0x08298e88), 'int', ['pointer'], {"abi":"sysv"});
api.CGameManager_GetParty = new NativeFunction(ptr(0X08294E10), 'pointer', ['pointer'], { "abi": "sysv" });

// ==================== 世界地图相关 ====================
// 获取世界地图ID
api.CWorldMapList_find_world_map = new NativeFunction(ptr(0x083647A2), 'pointer', ['pointer', 'int'], {"abi":"sysv"});

// ==================== 事件相关 ====================
api.EventClassify_CEventScriptMng_process_level_up_reward = new NativeFunction(ptr(0x0810bf56), 'pointer', ['pointer','pointer','int'], {"abi":"sysv"});

// ==================== 公会相关 ====================
api.GuildParameterScript_getGuildLevelUpParam = new NativeFunction(ptr(0x08979648), 'pointer', ['pointer','int'], {"abi":"sysv"});
api.GuildParameterScript_getGuildExpBook = new NativeFunction(ptr(0x08979672), 'int', ['pointer','int'], {"abi":"sysv"});

// ==================== 绝望之塔相关 ====================
api.TOD_UserState_getLastEnterLayer = new NativeFunction(ptr(0x8643942), 'void', ['pointer', 'pointer'], { "abi": "sysv" });
api.TOD_Layer_GetLayer = new NativeFunction(ptr(0x822EC40), 'int', ['pointer'], { "abi": "sysv" });
api.CUser_GetCharacExpandData = new NativeFunction(ptr(0x080DD584), 'pointer', ['pointer', 'int'], { "abi": "sysv" });

// ==================== 宠物相关 ====================
api.user_creature_CCreatureMgr_GetCreatureItemId = new NativeFunction(ptr(0x833A638), 'int', ['pointer'], { "abi": "sysv" });
api.user_creature_CCreatureMgr_GetCreatureName = new NativeFunction(ptr(0x833A688), 'pointer', ['pointer'], { "abi": "sysv" });
api.CCreatureMgr_UnregisterCreatureItem = new NativeFunction(ptr(0x0833A854),'int',['pointer', 'int'],{ "abi": "sysv" });

// ==================== 限时商城相关 ====================
api.CItemLimitEditionMgr_removeItem = new NativeFunction(ptr(0x084E9876), 'pointer', ['pointer','int'], { "abi": "sysv" });
api.CItemLimitEditionMgr_makeItemLimitEditionRemoveInfo = new NativeFunction(ptr(0x08513382), 'pointer', ['pointer','pointer'], { "abi": "sysv" });
api.CItemLimitEditionMgr_makeItemLimitEditionInfo = new NativeFunction(ptr(0x085132CA), 'pointer', ['pointer','pointer'], { "abi": "sysv" });

// ==================== 解密相关 ====================
api.decrypt = new NativeFunction(ptr(0x848DB5E), 'pointer', ['pointer', 'pointer', 'pointer'], { "abi": "sysv" });

// ==================== MySQL相关 ====================
api.MySQL_MySQL = new NativeFunction(ptr(0x83F3AC8), 'pointer', ['pointer'], { "abi": "sysv" });
api.MySQL_init = new NativeFunction(ptr(0x83F3CE4), 'int', ['pointer'], { "abi": "sysv" });
api.MySQL_open = new NativeFunction(ptr(0x83F4024), 'int', ['pointer', 'pointer', 'int', 'pointer', 'pointer', 'pointer'], { "abi": "sysv" });
api.MySQL_close = new NativeFunction(ptr(0x83F3E74), 'int', ['pointer'], { "abi": "sysv" });
api.MySQL_set_query_2 = new NativeFunction(ptr(0x83F41C0), 'int', ['pointer', 'pointer'], { "abi": "sysv" });
api.MySQL_exec = new NativeFunction(ptr(0x83F4326), 'int', ['pointer', 'int'], { "abi": "sysv" });
api.MySQL_get_n_rows = new NativeFunction(ptr(0x80E236C), 'int', ['pointer'], { "abi": "sysv" });
api.MySQL_fetch = new NativeFunction(ptr(0x83F44BC), 'int', ['pointer'], { "abi": "sysv" });
api.MySQL_get_int = new NativeFunction(ptr(0x811692C), 'int', ['pointer', 'int', 'pointer'], { "abi": "sysv" });
api.MySQL_get_uint = new NativeFunction(ptr(0x80E22F2), 'int', ['pointer', 'int', 'pointer'], { "abi": "sysv" });
api.MySQL_get_str = new NativeFunction(ptr(0x80ECDEA), 'int', ['pointer', 'int', 'pointer', 'int'], { "abi": "sysv" });
api.MySQL_get_binary_length = new NativeFunction(ptr(0x81253DE), 'int', ['pointer', 'int'], { "abi": "sysv" });
api.MySQL_get_binary = new NativeFunction(ptr(0x812531A), 'int', ['pointer', 'int', 'pointer', 'int'], { "abi": "sysv" });
api.DBMgr_GetDBHandle = new NativeFunction(ptr(0x83F523E), 'pointer', ['pointer', 'int', 'int'], { "abi": "sysv" });
api.MySQL_set_query_3 = new NativeFunction(ptr(0x83F41C0), 'int', ['pointer', 'pointer', 'int'], {"abi":"sysv"});
api.MySQL_set_query_4 = new NativeFunction(ptr(0x83F41C0), 'int', ['pointer', 'pointer', 'int', 'int'], { "abi": "sysv" });
api.MySQL_set_query_5 = new NativeFunction(ptr(0x83F41C0), 'int', ['pointer', 'pointer', 'int', 'int', 'int'], { "abi": "sysv" });
api.MySQL_set_query_6 = new NativeFunction(ptr(0x83F41C0), 'int', ['pointer', 'pointer', 'int', 'int', 'int', 'int'], {"abi":"sysv"});
api.MySQL_exec_query = new NativeFunction(ptr(0x083F5348), 'int', ['pointer'], { "abi": "sysv" });
api.MySQL_get_ulonglong = new NativeFunction(ptr(0x81754C8), 'int', ['pointer', 'int', 'pointer'], { "abi": "sysv" });
api.MySQL_get_ushort = new NativeFunction(ptr(0x8116990), 'int', ['pointer'], { "abi": "sysv" });
api.MySQL_get_float = new NativeFunction(ptr(0x844D6D0), 'int', ['pointer', 'int', 'pointer'], { "abi": "sysv" });
api.MySQL_blob_to_str = new NativeFunction(ptr(0x83F452A), 'pointer', ['pointer', 'int', 'pointer', 'int'], { "abi": "sysv" });

// ==================== 怪物攻城 ====================
//开启怪物攻城1
api.Inter_VillageAttackedStart_dispatch_sig = new NativeFunction(ptr(0x84DF47A), 'pointer', ['pointer', 'pointer', 'pointer'], { "abi": "sysv" });
//结束怪物攻城
api.village_attacked_CVillageMonsterMgr_OnDestroyVillageMonster = new NativeFunction(ptr(0x086B43D4), 'pointer', ['pointer', 'int'], { "abi": "sysv" });
api.GlobalData_s_villageMonsterMgr = ptr(0x941F77C);
api.nullptr = Memory.alloc(4);
api.GetItem_index = new NativeFunction(ptr(0x08110C48), 'int', ['pointer'], { "abi": "sysv" });
api.GetCurVAttackCount = new NativeFunction(ptr(0x084EC216), 'int', ['pointer'], { "abi": "sysv" });
api.WongWork_CMailBoxHelper_ReqDBSendNewSystemMail = new NativeFunction(ptr(0x085555E8), 'int', ['pointer', 'pointer', 'int', 'int', 'pointer', 'int', 'int', 'int', 'char', 'char'], { "abi": "sysv" });

// 称号簿相关
api.CTitleBook_putItemData = new NativeFunction(ptr(0x08641A6A), 'int', ['pointer','pointer','int','pointer'], { "abi": "sysv" });

// 拍卖行相关

api.Inter_AuctionResultItemList = new NativeFunction(ptr(0x084D75BC), 'int', ['pointer','pointer','pointer','int'], { abi: 'sysv' });
api.Inter_AuctionResultMyBidding = new NativeFunction(ptr(0x084D78F4), 'int', ['pointer','pointer','pointer','int'], { abi: 'sysv' });
api.Inter_AuctionResultMyRegistedItems_dispatch_sig = new NativeFunction(ptr(0x084D7758), 'int', ['pointer','pointer','pointer','int'], { abi: 'sysv' });

//镶嵌打孔
api.Dispatcher_AddSocket = new NativeFunction(ptr(0x0821A412), 'int', ['pointer','pointer','pointer'], { abi: 'sysv' });

// ================== 独立掉落相关 ==================
api.mapinfo_item_list_init = new NativeFunction(ptr(0x08152A2C), 'pointer', ['pointer'], "sysv");
api.mapinfo_item_list_free = new NativeFunction(ptr(0x08151F6E), 'pointer', ['pointer'], "sysv");
api.mapinfo_item_list_size = new NativeFunction(ptr(0x08311E2C), 'int', ['pointer'], "sysv");
api.mapinfo_item_list_begin = new NativeFunction(ptr(0x08152B88), 'int', ['pointer', 'pointer'], "sysv");
api.mapinfo_item_list_end = new NativeFunction(ptr(0x08152BBE), 'int', ['pointer', 'pointer'], "sysv");
api.mapinfo_item_list_not_equal = new NativeFunction(ptr(0x08311E70), 'bool', ['pointer', 'pointer'], "sysv");
api.mapinfo_item_list_get = new NativeFunction(ptr(0x08311EBC), 'pointer', ['pointer'], "sysv");
api.mapinfo_item_list_next = new NativeFunction(ptr(0x08311E84), 'pointer', ['pointer', 'pointer'], "sysv");
api.mapinfo_item_list_push = new NativeFunction(ptr(0x08152B52), 'pointer', ['pointer', 'pointer'], "sysv");
api.mapinfo_item_map_begin = new NativeFunction(ptr(0x0815298E), 'int', ['pointer', 'pointer'], "sysv");
api.mapinfo_item_map_end = new NativeFunction(ptr(0x0815255E), 'int', ['pointer', 'pointer'], "sysv");
api.mapinfo_item_map_not_equal = new NativeFunction(ptr(0x08152584), 'bool', ['pointer', 'pointer'], "sysv");
api.mapinfo_item_map_get = new NativeFunction(ptr(0x081529B4), 'pointer', ['pointer'], "sysv");
api.mapinfo_item_map_next = new NativeFunction(ptr(0x08155D40), 'pointer', ['pointer', 'pointer'], "sysv");
api.mapinfo_item_map_find = new NativeFunction(ptr(0x08152532), 'pointer', ['pointer', 'pointer', 'pointer'], "sysv");
api.CUser_get_unique_id = new NativeFunction(ptr(0x080DA37C), 'int', ['pointer'], "sysv");
api.CParty_checkValidUser = new NativeFunction(ptr(0x085B4D12), 'pointer', ['pointer', 'int'], "sysv");
api.CBattle_Field_MakeDropItems = new NativeFunction(ptr(0x0830ADF6), 'pointer', ['pointer', 'pointer', 'pointer', 'pointer', 'int', 'int', 'int', 'int', 'int', 'pointer', 'float', 'int'], "sysv");
api.CBattle_Field_MakeNotiPacketDieMonster = new NativeFunction(ptr(0x0830B8CC), 'pointer', ['pointer', 'pointer', 'pointer', 'int', 'int', 'pointer', 'pointer'], "sysv");
api.CBattle_Field_convertAPCRoleType2MonsterRoleType = new NativeFunction(ptr(0x0830A812), 'int', ['pointer', 'int'], "sysv");
api.CBattle_Field_getCurrentMapInfo = new NativeFunction(ptr(0x0822CBCC), 'pointer', ['pointer'], "sysv");
api.CStackableItem_make_item = new NativeFunction(ptr(0x0850F8B8), 'pointer', ['pointer', 'pointer'], "sysv");
api.CStackableItem_verifyStackableAction = new NativeFunction(ptr(0x0822CA58), 'bool', ['pointer', 'int'], "sysv");
api.Map_Item_ctor = new NativeFunction(ptr(0x081512CC), 'pointer', ['pointer'], "sysv");

api.CUser_GetTradePunishType = new NativeFunction(ptr(0x0868995A), 'int', ['pointer'], { abi: 'sysv' });
api.CUser_SetTradePunishType = new NativeFunction(ptr(0x08689890), 'pointer', ['pointer', 'int'], { abi: 'sysv' });
api.CUser_DelTradePunishType = new NativeFunction(ptr(0x086898C2), 'int', ['pointer', 'int'], { abi: 'sysv' });

// ==================== 工具函数 ====================

// 打开数据库
api.api_MYSQL_open = function(db_name, db_ip, db_port, db_account, db_password) {
    var mysql = Memory.alloc(0x80000);
    api.MySQL_MySQL(mysql); 
    api.MySQL_init(mysql);
    var ret = api.MySQL_open(mysql, Memory.allocUtf8String(db_ip), db_port, Memory.allocUtf8String(db_name), Memory.allocUtf8String(db_account), Memory.allocUtf8String(db_password));
    return ret ? mysql : null;
};

// 执行SQL
api.api_MySQL_exec = function(mysql, sql) {
    var sql_ptr = Memory.allocUtf8String(sql);
    api.MySQL_set_query_2(mysql, sql_ptr);
    return api.MySQL_exec(mysql, 1);
}

// 获取int
api.api_MySQL_get_int = function(mysql, field_index) {
    var v = Memory.alloc(4);
    if (1 == api.MySQL_get_int(mysql, field_index, v)) return v.readInt();
    return null;
};

// 获取uint
api.api_MySQL_get_uint = function(mysql, field_index) {
    var v = Memory.alloc(4);
    if (1 == api.MySQL_get_uint(mysql, field_index, v))
        return v.readUInt();
    return null;
}

// 获取字符串
api.api_MySQL_get_str = function(mysql, field_index) {
    var binary_length = api.MySQL_get_binary_length(mysql, field_index);
    if (binary_length > 0) {
        var v = Memory.alloc(binary_length);
        if (1 == api.MySQL_get_binary(mysql, field_index, v, binary_length))
            return v.readUtf8String(binary_length);
    }
    return null;
}

api.api_MySQL_get_binary = function(mysql, field_index) {
    let binary_length = api.MySQL_get_binary_length(mysql, field_index);
    if (binary_length > 0) {
        let v = Memory.alloc(binary_length);
        if (1 == api.MySQL_get_binary(mysql, field_index, v, binary_length))
            return v.readByteArray(binary_length);
    }
    log('api_MySQL_get_binary Fail!!!');
    return null;
}


// ==================== 工具函数API ====================

//申请锁(申请后务必手动释放!!!)
api.api_guard_Mutex_guard = function()
{
	var a1 = Memory.alloc(100);
	api.Guard_Mutex_guard(a1, api.G_TimerQueue().add(16));
	return a1;
}

//需要在dispatcher线程执行的任务队列(热加载后会被清空)
var timer_dispatcher_list = [];
api.timer_dispatcher_list = timer_dispatcher_list;

//在dispatcher线程执行(args为函数f的参数组成的数组, 若f无参数args可为null)
api.api_scheduleOnMainThread = function(f, args, name)
{
	//线程安全
	let guard = api.api_guard_Mutex_guard();
	timer_dispatcher_list.push([f, args, name || '匿名任务']);
	api.Destroy_guard_Mutex_guard(guard);
	return;
}

//设置定时器 到期后在dispatcher线程执行
api.api_scheduleOnMainThread_delay = function(f, args, delay, name)
{
    if (!name || name === 'anonymous') {
        try { throw new Error(); } catch(e) {
            var stack = e.stack.split("\n");
            for (var i = 0; i < stack.length; i++) {
                var match = stack[i].match(/\\(.*?)\.js/);
                if (match) {
                    name = match[1].split(/[/\\]/).pop();
                    break;
                }
            }
        }
    }
    name = name || 'anonymous';
    return setTimeout(function() {
        api.api_scheduleOnMainThread(f, args, name);
    }, delay, name);
}

//清理计时器
api.api_cancelScheduleOnMainThread = function(timerId) {
    if (timerId) {
        clearTimeout(timerId);
    }
}

//处理到期的自定义定时器
api.do_timer_dispatch = function() {
    var task_list = [];
    var guard = api.api_guard_Mutex_guard();
    
    while (timer_dispatcher_list.length > 0) {
        var task = timer_dispatcher_list.shift();
        // 只有合法的任务才加入待处理列表
        if (task && Array.isArray(task) && typeof task[0] === 'function') {
            task_list.push(task);
        } else {
            // 如果发现了脏数据，可以打个日志
            // log_warn("丢弃无效任务单元");
        }
    }
    api.Destroy_guard_Mutex_guard(guard);

    for (var i = 0; i < task_list.length; ++i) {
        var task = task_list[i];
        var f = task[0];
        var args = task[1];

        try {
            if (typeof f !== 'function') {
                log_error("[定时器调度器] 任务[{}]的f不是函数: {}", i, typeof f);
                continue;
            }
            if (args && Array.isArray(args)) {
                f.apply(undefined, args);
            } else {
                f.call(undefined);
            }
        } catch (e) {
            if (typeof log_crash === 'function') {
                var taskName = (task[2] || '匿名任务');
                if (taskName === '匿名任务' && e.stack) {
                    var match = e.stack.match(/\[([^\]]+)\]/);
                    if (match) taskName = match[1];
                }
                e.message = `[${taskName}] ${e.message}`;
                log_crash("定时器调度器", "执行回调崩溃", e);
                var argsStr = (args === null) ? 'null' : (args === undefined) ? 'undefined' : (Array.isArray(args) ? '数组[' + args.length + ']' : typeof args);
                log_error("[定时器调度器] 任务: " + taskName + " | 回调: " + (f ? (f.name || '匿名函数') : 'undefined') + " | 参数: " + argsStr);
            }
        }
    }
}

//挂接消息分发线程 确保代码线程安全
api.hook_TimerDispatcher_dispatch = function(){
	//hook TimerDispatcher::dispatch
	//服务器内置定时器 每秒至少执行一次
	Interceptor.attach(ptr(0x8632A18),{
		onEnter: function(args) {},
		onLeave: function(retval){
			//清空等待执行的任务队列
			api.do_timer_dispatch();
		}
	});
}

// ==================== 文件操作工具函数 ====================

/**
 * 读取文件 
 * @param {string} path 文件路径
 * @param {string} mode 文件打开模式
 * @param {number} len 文件长度
 * @returns {string|NativePointer} 文件内容或文件指针
 */
api.api_read_file = function(path, mode, len){
	let path_ptr = Memory.allocUtf8String(path);
	let mode_ptr = Memory.allocUtf8String(mode);
	let f = api.fopen(path_ptr, mode_ptr);
	if (f == 0)
		return null;
	let data = Memory.alloc(len);
	let fread_ret = api.fread(data, 1, len, f);
	api.fclose(f);
	//返回字符串
	if (mode == 'r')
		return data.readUtf8String(fread_ret);
	//返回二进制buff指针
	return data;
}

//linux创建文件夹
api.api_mkdir = function(path) {
    let opendir = new NativeFunction(Module.getExportByName(null, 'opendir'), 'int', ['pointer'], { "abi": "sysv" });
    let mkdir = new NativeFunction(Module.getExportByName(null, 'mkdir'), 'int', ['pointer', 'int'], { "abi": "sysv" });
    let path_ptr = Memory.allocUtf8String(path);
    if (opendir(path_ptr))
        return true;
    return mkdir(path_ptr, 0x1FF);
}

// ==================== 消息发送工具函数 ====================

/**
 * 发送字符串给客户端
 * @param {NativePointer} packet_guard 封包指针
 * @param {string} s 字符串
 */
api.api_InterfacePacketBuf_put_string = function(packet_guard, s){
	var p = Memory.allocUtf8String(s);
	var len = api.strlen(p);
	api.InterfacePacketBuf_put_int(packet_guard, len);
	api.InterfacePacketBuf_put_binary(packet_guard, p, len);
	return;
}
/**
 * 发送通知消息给角色1
 * @param {NativePointer} user 
 * @param {string} msg 
 * @param {number} msg_type 
 * @returns 
 */
api.api_CUser_SendNotiPacketMessage = function(user, msg, msg_type) {
    let p = Memory.allocUtf8String(msg);
    api.CUser_SendNotiPacketMessage(user, p, msg_type);
    return;
}

/**
 * 给角色发经验
 * @param {NativePointer} user 角色指针
 * @param {number} exp 经验值
 */
api.api_CUser_gain_exp_sp = function(user, exp) {
    let a2 = Memory.alloc(4);
    let a3 = Memory.alloc(4);
    api.CUser_gain_exp_sp(user, exp, a2, a3, 0, 0, 0);
}

/***
 * 发送弹窗消息给角色
 * @param {NativePointer} user 角色指针
 * @param {string} msg 消息
 * @param {number} type 消息类型
 */
api.api_send_msg = function(user, msg, type) {
    let packet_guard = api.api_PacketGuard_PacketGuard();
    api.InterfacePacketBuf_put_header(packet_guard, 0, 233);
    api.InterfacePacketBuf_put_byte(packet_guard, 1);
    api.InterfacePacketBuf_put_byte(packet_guard, 5);
    api.api_InterfacePacketBuf_put_string(packet_guard, msg);
    api.InterfacePacketBuf_finalize(packet_guard, 1);
    api.CUser_SendPacket(user, type, packet_guard);
    api.Destroy_PacketGuard_PacketGuard(packet_guard);
}

/**
 * 世界广播(频道内公告)
 * @param {string} msg 消息
 * @param {number} msg_type 发送位置 
 */
api.api_GameWorld_SendNotiPacketMessage = function(msg, msg_type){
	let packet_guard = api.api_PacketGuard_PacketGuard();
	api.InterfacePacketBuf_put_header(packet_guard, 0, 12);
	api.InterfacePacketBuf_put_byte(packet_guard, msg_type);
	api.InterfacePacketBuf_put_short(packet_guard, 0);
	api.InterfacePacketBuf_put_byte(packet_guard, 0);
	api.api_InterfacePacketBuf_put_string(packet_guard, msg);
	api.InterfacePacketBuf_finalize(packet_guard, 1);
	api.GameWorld_send_all_with_state(api.G_GameWorld(), packet_guard, 3); //只给state >= 3 的玩家发公告
	api.Destroy_PacketGuard_PacketGuard(packet_guard);
}

//服务器组包
api.api_PacketGuard_PacketGuard = function(){
	let packet_guard = Memory.alloc(0x20000);
	api.PacketGuard_PacketGuard(packet_guard);
	return packet_guard;
}

// ==================== 在线玩家遍历工具函数 ====================

//获取在线玩家列表表头
api.api_Gameworld_user_map_begin = function(){
	let begin = Memory.alloc(4);
	api.Gameworld_user_map_begin(begin, api.G_GameWorld().add(308));
	return begin;
}
//获取在线玩家列表表尾
api.api_Gameworld_user_map_end = function(){
	let end = Memory.alloc(4);
	api.Gameworld_user_map_end(end, api.G_GameWorld().add(308));
	return end;
}
//获取当前正在遍历的玩家
api.api_Gameworld_user_map_get = function(it){
	return api.Gameworld_user_map_get(it).add(4).readPointer();
}
//遍历在线玩家列表
api.api_Gameworld_user_map_next = function(it){
	let next = Memory.alloc(4);
	api.Gameworld_user_map_next(next, it);
	return next;
}

/**
 * 对全服在线玩家执行回调函数
 * @param {function} f 回调函数
 * @param {args} args 参数
 */
api.api_Gameworld_foreach = function(f, args) {
    // 初始化迭代器
    let it = api.api_Gameworld_user_map_begin();
    let end = api.api_Gameworld_user_map_end();
    let notEqualFunc = api.Gameworld_user_map_not_equal;
    let getFunc = api.api_Gameworld_user_map_get;
    let getStateFunc = api.CUser_get_state;
    let nextFunc = api.api_Gameworld_user_map_next;

    while (notEqualFunc(it, end)) {
        let user = getFunc(it);
        
        // 状态 >= 3 表示在游戏中
        if (getStateFunc(user) >= 3) {
            f(user, args);
        }
        
        nextFunc(it);
    }
};

//内存十六进制打印
api.bin2hex = function(p, len){
	let hex = '';
	for (let i = 0; i < len; i++)
	{
		let s = p.add(i).readU8().toString(16);
		if (s.length == 1)
			s = '0' + s;
		hex += s;
		if (i != len - 1)
			hex += ' ';
	}
	return hex;
}

// ====================== 宠物相关 =====================
/**
 * 获取宠物 UID（Inven_Item 偏移 +7）
 */
api.Inven_Item_getCreatureUid = function(creature) {
    return creature.add(7).readU32();
}

// ==================== 游戏工具函数 ====================

/**
 * 获取道具名称
 * @param {number} item_id 道具ID
 * @returns {string} 道具名称，如果获取失败则返回ID字符串
 */
api.api_CItem_GetItemName = function(item_id) {
    var citem = api.CDataManager_find_item(api.G_CDataManager(), item_id);
    if (!citem.isNull()) {
        return ptr(api.CItem_getItemName(citem)).readUtf8String(-1);
    }
    return item_id.toString();
}

/**
 * 获取副本名称
 * @param {number} dungeon_id 副本ID
 * @returns {string} 副本名称，如果获取失败则返回ID字符串
 */
api.api_CDungeon_GetDungeonName = function(dungeon_id) {
    var cdungeon = api.CDataManager_find_dungeon(api.G_CDataManager(), dungeon_id);
    if (!cdungeon.isNull()) {
        return ptr(api.CDungeon_getDungeonName(cdungeon)).readUtf8String(-1);
    }
    return dungeon_id.toString();
}

/**
 * 获取角色名字
 * @param {NativePointer} user 角色指针
 * @returns {string} 角色名字，如果获取失败则返回空字符串
 */
api.api_CUserCharacInfo_getCurCharacName = function(user) {
    let p = api.CUserCharacInfo_getCurCharacName(user);
    if (p.isNull()) {
        return '';
    }
    return p.readUtf8String(-1);
}

/**
 * 获取角色公会名字
 * @param {NativePointer} user 角色指针
 * @returns {string} 公会名字，如果获取失败则返回空字符串
 */
api.api_CUser_GetGuildName = function (user) {
    let p = api.CUser_GetGuildName(user);
    if (p.isNull()) {
        return '';
    }
    return p.readUtf8String(-1);
}

// ==================== 数据库辅助封装 ====================

/**
 * 此时 globalThis.mysql_taiwan_cain 可能还没初始化（取决于模块加载顺序）
 * 所以不要在文件头部直接引用，而是在函数执行时引用
 */

/**
 * 根据角色id查询角色名
 * @param {number} charac_no 角色ID
 * @returns {string} 角色名，如果获取失败则返回ID字符串
 */
/**
 * 根据角色id查询角色名 (修正数据类型版)
 */
api.api_get_charac_name_by_charac_no = function(charac_no) {
    charac_no = parseInt(charac_no); 
    if (isNaN(charac_no)) return "Invalid ID";

    let mgr = api.G_CGameManager();
    if (mgr && !mgr.isNull()) {
        let user = api.CGameManager_getUser(mgr, charac_no);
        if (user && !user.isNull()) {
            let namePtr = api.CUser_get_charac_name_by_charac_no(user, charac_no);
            if (namePtr && !namePtr.isNull()) {
                let nameStr = namePtr.readUtf8String();
                if (nameStr && nameStr.length > 0) {
                    return nameStr;
                }
            }
        }
    }

    const dbHandle = globalThis.mysql_taiwan_cain;
    if (dbHandle) {
        const sql = "SELECT charac_name FROM charac_info WHERE charac_no = " + charac_no + " LIMIT 1;";
        if (api.api_MySQL_exec(dbHandle, sql)) {
            if (api.MySQL_get_n_rows(dbHandle) > 0) {
                if (api.MySQL_fetch(dbHandle)) {
                    let charac_name = api.api_MySQL_get_str(dbHandle, 0);
                    if (charac_name && charac_name.length > 0) {
                        return charac_name;
                    }
                }
            }
        }
    }
    return charac_no.toString();
}

/**
 * 校验当前道具是否为装备
 * @param item_id 物品ID
 * @returns true 或 false
 */
api.api_is_Equipment_item = function(item_id) {
	var itemData = api.CDataManager_find_item(api.G_CDataManager(), item_id);
	if(api.CEquipItem_GetUsableEquipmentType(itemData)){
		return true;
	}
	return false;
}

/**
 * 获取当前装备类型
 * @param item_id 物品ID
 * @returns true 或 false
 */
api.api_Get_ItemType = function(item_id) {
	let itemData = api.CDataManager_find_item(api.G_CDataManager(), item_id);
    if(itemData){
        let item_type = itemData.add(141*4).readU32()
	    return item_type;
    }
    return null;
}

/**
 * 获取当前装备品级
 * @param item_id 物品ID
 * @returns true 或 false
 */
api.api_Get_ItemRarity = function(item_id) {
	let itemData = api.CDataManager_find_item(api.G_CDataManager(), item_id);
    if(itemData){
        let Item_rarity = api.CItem_get_rarity(itemData)
        return Item_rarity;
    }
    return null;
}

/**
 * 获取当前装备grade
 * @param item_id 物品ID
 * @returns true 或 false
 */
api.api_Get_ItemGrade = function(item_id) {
	let itemData = api.CDataManager_find_item(api.G_CDataManager(), item_id);
    if(itemData){
        let Item_Grade = api.CItem_get_grade(itemData)
        return Item_Grade;
    }
    return null;
}

/**
 * 获取当前频道路径
 * @returns {string} 配置文件名
 */
api.api_CEnvironment_get_file_name = function() {
    let filename = api.CEnvironment_get_file_name(api.G_CEnvironment());
    return filename.readUtf8String(-1);
}

// ==================== IP地址获取 ====================

/**
 * 获取IP地址
 * @param {NativePointer} user 角色指针
 * @returns {string} IP地址，如果获取失败则返回空字符串
 */
api.api_CUser_get_public_ip_address = function(user) {
    // 定义获取 IP 地址的原生函数
    var CUser_get_public_ip_address = new NativeFunction(ptr(0x084EC90A), 'int', ['pointer'], { "abi": "sysv" });
    var inet_ntoa = new NativeFunction(ptr(0x0807DDC0), 'pointer', ['int'], { "abi": "sysv" });

    // 获取 IP 地址
    var s_addr = CUser_get_public_ip_address(user);
    if (s_addr) {
        var ip_ptr = inet_ntoa(s_addr);
        if (!ip_ptr.isNull()) {
            return ip_ptr.readUtf8String();
        }
    }
    return null;
}

// ==================== 封包读取工具函数 ====================

//从客户端封包中读取数据(失败会抛异常, 调用方必须做异常处理)
api.api_PacketBuf_get_byte = function(packet_buf) {
    let data = Memory.alloc(1);
    if (api.PacketBuf_get_byte(packet_buf, data)) {
        return data.readU8();
    }
    throw new Error('PacketBuf_get_byte Fail!');
}

api.api_PacketBuf_get_short = function(packet_buf) {
    let data = Memory.alloc(2);
    if (api.PacketBuf_get_short(packet_buf, data)) {
        return data.readShort();
    }
    throw new Error('PacketBuf_get_short Fail!');
}

api.api_PacketBuf_get_int = function(packet_buf) {
    let data = Memory.alloc(4);
    if (api.PacketBuf_get_int(packet_buf, data)) {
        return data.readInt();
    }
    throw new Error('PacketBuf_get_int Fail!');
}

api.api_PacketBuf_get_binary = function(packet_buf, len) {
    let data = Memory.alloc(len);
    if (api.PacketBuf_get_binary(packet_buf, data, len)) {
        return data.readByteArray(len);
    }
    throw new Error('PacketBuf_get_binary Fail!');
}

//获取原始封包数据
api.api_PacketBuf_get_buf = function(packet_buf) {
    return packet_buf.add(20).readPointer().add(13);
}

// ==================== 道具操作工具函数 ====================

/**
 * 给角色发道具(含UI提示)
 * @param {NativePointer} user 角色指针
 * @param {number} item_id 道具ID
 * @param {number} item_cnt 道具数量
 */
api.api_CUser_AddItem = function(user, item_id, item_cnt) {
    let item_space = Memory.alloc(4);
    let slot = api.CUser_AddItem(user, item_id, item_cnt, 6, item_space, 0);
    if(slot >= 0){
        //通知客户端有游戏道具更新
        api.CUser_SendUpdateItemList(user, 1, item_space.readInt(), slot);
    }
    return slot;
}

/**
 * 获取背包中道具的数量
 * @param {NativePointer} user 角色指针
 * @param {number} itemid 道具ID
 * @returns {number} 返还持有的道具数量
 */
api.Get_itemcount = function(user, itemid) {
    if (!itemid) return 0;
    let inven = CUserCharacInfo_getCurCharacInvenW(user);
    let itemAddr = Memory.alloc(116);
    let invenData = CInventory_GetInvenData(inven, itemid, itemAddr);
    if (invenData < 0) return 0;
    let count = itemAddr.add(7).readU16();
    return count;
}

/**
 * 根据道具类型背包空格数量
 * @param {pointer} user - 用户
 * @param {int} item_id - 需要查找的道具ID
 * @returns {int} - 空格数量
 */
api.checkInventorySlot = function(user, itemid) {
    let inven = api.CUserCharacInfo_getCurCharacInvenW(user); // 获取当前角色的背包
    let type = api.CInventory_GetItemType(inven, itemid); // 获取道具类型
    let cnt = api.CInventory_check_empty_count(inven, type, 1); // 检查是否有1个空位
    return cnt;
}

/**
 * 给角色发道具含窗口提示
 * @param {NativePointer} user 角色指针
 * @param {number} item 道具ID
 * @param {number} num 道具数量
 */
api.api_CUser_Add_Item = function(user, item, num) {
	api.api_CUser_AddItem(user, item, num);
	api.SendItemWindowNotification(user, [[item, num]]);
}

/**
 * 发放单个时装（带UI提示）
 * @param {pointer} user - 用户指针
 * @param {number} itemid - 时装ID
 * @param {number} time - 天数(0=永久)
 * @returns {number} 槽位ID，失败返回-1
 */
api.AddAvatarItem = function(user, itemid, time) {
    var src = Memory.alloc(24);
    var charac_no = api.CUserCharacInfo_getCurCharacNo(user);
    api.WongWork_CGenUniqueNo_genIPGNo(1, charac_no, src);
    var inven = api.CUserCharacInfo_getCurCharacInvenW(user);
    var slot = api.CInventory_AddAvatarItem(inven, itemid, time, 0, 0, -1, src, 0, 0, 0);
    if (slot < 0) {
        return -1;
    }
    api.CUser_SendUpdateItemList(user, 1, 1, slot);
    //api.SendItemWindowNotification(user, [[itemid, 1]]);
    return slot;
}

/**
 * 添加道具到背包(数组)含窗口
 * @param {NativePointer} user 角色指针
 * @param {Array} item_list 道具列表 [[item_id, count], ...]
 */
api.api_CUser_Add_Item_list = function(user, item_list){
	for (let i in item_list){
		api.api_CUser_AddItem(user, item_list[i][0], item_list[i][1]);
	}
	api.SendItemWindowNotification(user, item_list);
}

/**
 * 添加道具到背包(数组)不含窗口
 * @param {NativePointer} user 角色指针
 * @param {Array} item_list 道具列表 [[item_id, count], ...]
 */
api.api_CUser_Add_Items = function(user, item_list){
	for (let i in item_list){
		api.api_CUser_AddItem(user, item_list[i][0], item_list[i][1]);
	}
}

//获取道具数据
api.find_item = function(item_id){
	return api.CDataManager_find_item(api.G_CDataManager(), item_id);
}

/*获取道具时使用ui显示*/
api.SendItemWindowNotification = function(user, item_list){
	let packet_guard = api.api_PacketGuard_PacketGuard();
	api.InterfacePacketBuf_put_header(packet_guard, 1, 163);
	api.InterfacePacketBuf_put_byte(packet_guard, 1);
	api.InterfacePacketBuf_put_short(packet_guard, 0);
	api.InterfacePacketBuf_put_int(packet_guard, 0);
	api.InterfacePacketBuf_put_short(packet_guard, item_list.length);
	
	for (let i = 0; i < item_list.length; i++){
		api.InterfacePacketBuf_put_int(packet_guard, item_list[i][0]);
		api.InterfacePacketBuf_put_int(packet_guard, item_list[i][1]);
	}
	
	api.InterfacePacketBuf_finalize(packet_guard, 1);
	api.CUser_Send(user, packet_guard);
	api.Destroy_PacketGuard_PacketGuard(packet_guard);
}

/**
 * 发送奖励10连抽奖UI
 * @param {NativePointer} user 角色指针
 * @param {Array} item_list 道具列表
 */
api.Send_items = function(user, item_list) {
    // ---- 1. 发送 600 号数据包 (物品明细) ----
    let pg600 = api.api_PacketGuard_PacketGuard();
    api.InterfacePacketBuf_put_header(pg600, 1, 600);
    api.InterfacePacketBuf_put_byte(pg600, 1); 
    api.InterfacePacketBuf_put_byte(pg600, item_list.length);
    
    for (let i = 0; i < item_list.length; i++) {
        api.InterfacePacketBuf_put_int(pg600, item_list[i][0]);  // 道具 ID
        api.InterfacePacketBuf_put_byte(pg600, item_list[i][1]); // 数量
    }
    
    api.InterfacePacketBuf_finalize(pg600, 1);
    api.CUser_Send(user, pg600);
    api.Destroy_PacketGuard_PacketGuard(pg600);

    let pg557 = api.api_PacketGuard_PacketGuard();
    api.InterfacePacketBuf_put_header(pg557, 0, 557);
    
    api.InterfacePacketBuf_put_short(pg557, 0); 
    api.InterfacePacketBuf_put_byte(pg557, 0);
    
    api.InterfacePacketBuf_finalize(pg557, 1);
    api.CUser_Send(user, pg557);
    api.Destroy_PacketGuard_PacketGuard(pg557);
}

// ==================== 点券相关工具函数 ====================

//点券充值
api.api_recharge_cash_cera = function(user, amount){
	//充值
	api.WongWork_IPG_CIPGHelper_IPGInput(ptr(0x941F734).readPointer(), user, 5, amount, ptr(0x8C7FA20), ptr(0x8C7FA20),
		Memory.allocUtf8String('GM'), ptr(0), ptr(0), ptr(0));
	//通知客户端充值结果
	api.WongWork_IPG_CIPGHelper_IPGQuery(ptr(0x941F734).readPointer(), user);
}

//代币充值
api.api_recharge_cash_cera_point = function(user, amount){
	//充值
	api.WongWork_IPG_CIPGHelper_IPGInputPoint(ptr(0x941F734).readPointer(), user, amount, 4, ptr(0), ptr(0));
	//通知客户端充值结果
	api.WongWork_IPG_CIPGHelper_IPGQuery(ptr(0x941F734).readPointer(), user);
}

// ==================== 邮件工具函数 ====================

//发送邮件
api.api_WongWork_CMailBoxHelper_ReqDBSendNewSystemMultiMail = function(target_charac_no, title, text, gold, item_list) {
    //添加道具附件
    let vector = Memory.alloc(100);
    api.std_vector_std_pair_int_int_vector(vector);
    api.std_vector_std_pair_int_int_clear(vector);
    
    for (let i = 0; i < item_list.length; ++i) {
        let item_id = Memory.alloc(4);
        let item_cnt = Memory.alloc(4);
        item_id.writeInt(item_list[i][0]);
        item_cnt.writeInt(item_list[i][1]);
        let pair = Memory.alloc(100);
        api.std_make_pair_int_int(pair, item_id, item_cnt);
        api.std_vector_std_pair_int_int_push_back(vector, pair);
    }
    
    //邮件支持10个道具附件格子
    let addition_slots = Memory.alloc(1000);
    for (let i = 0; i < 10; ++i) {
        api.Inven_Item(addition_slots.add(i * 61));
    }
    
    api.WongWork_CMailBoxHelper_MakeSystemMultiMailPostal(vector, addition_slots, 10);
    let title_ptr = Memory.allocUtf8String(title);
    let text_ptr = Memory.allocUtf8String(text);
    let text_len = api.strlen(text_ptr);
    
    api.WongWork_CMailBoxHelper_ReqDBSendNewSystemMultiMail(title_ptr, addition_slots, item_list.length, gold, target_charac_no, text_ptr, text_len, 0, 99, 1);
}

// ==================== 活动关闭通知 ======================
//开关活动信息通知
api.api_send_event_msg = function(control, event_id){
    const packet_guard = api.api_PacketGuard_PacketGuard();
    api.InterfacePacketBuf_put_header(packet_guard, 0, 108);
    api.InterfacePacketBuf_put_short(packet_guard, control);
    api.InterfacePacketBuf_put_short(packet_guard, event_id);
    api.InterfacePacketBuf_put_int(packet_guard, 0);
    api.InterfacePacketBuf_put_int(packet_guard, 0);
    api.InterfacePacketBuf_put_int(packet_guard, 0);
    api.InterfacePacketBuf_put_int(packet_guard, 0);
    api.InterfacePacketBuf_finalize(packet_guard, 1);
    api.GameWorld_send_all(api.G_GameWorld(), packet_guard);
    api.Destroy_PacketGuard_PacketGuard(packet_guard);
}

// ==================== 随机数工具函数 ====================

/**
 * 生成指定范围内的随机整数
 */
api.random_int = function(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ==================== 系统时间工具函数 ====================

/**
 * 获取系统UTC时间(秒)
 * @returns {number} 系统UTC时间(秒)
 */
api.api_CSystemTime_getCurSec = function(){
	return api.GlobalData_s_systemTime_.readInt();
}

// ==================== 高级信息工具函数 ====================
/**
 * 检查徽章数据是否存在
 * @param {number} id 装备ID
 * @returns {number} 0代表不存在，1代表存在
 */
api.api_exitjeweldata = function(mysql_frida, id) { // Added mysql_frida param as it was global/undefined in original
    api.api_MySQL_exec(mysql_frida, 'SELECT andonglishanbai_flag FROM data where equ_id = '+id+';');
    let exit = 0;
    if (api.MySQL_get_n_rows(mysql_frida) == 1) {
        if (api.MySQL_fetch(mysql_frida)) {
            exit = api.api_MySQL_get_int(mysql_frida, 0);
        }
    }
    return exit;
}

/**
 * 获取徽章插槽数据
 */
api.api_get_jewel_socket_data = function(mysql, id){//获取徽章数据,存在返回徽章数据,不存在返回空字节数据
    api.api_MySQL_exec(mysql, 'SELECT jewel_data FROM data where equ_id = '+id+';')
    const v = Memory.alloc(30);
    v.add(0).writeU8(0)
    if(api.MySQL_get_n_rows(mysql) == 1){
        if(api.MySQL_fetch(mysql)){
            api.MySQL_get_binary(mysql, 0, v, 30)
        }
    }
    return v;
}

/**
 * 带镶嵌数据刷新槽位
 * @param CUser 
 * @param itemSpace  客户端参数: [0=背包, 3=身上]
 * @param Slot       槽位
 */
api.CUser_SendUpdateEqu_JewelSocket = function(CUser, itemSpace, Slot) {
    let invenType = -1;

    if (itemSpace === 0) {
        invenType = 1;
    } else if (itemSpace === 3) {
        invenType = 0;
    } else {
        api.CUser_SendUpdateItemList(CUser, 1, itemSpace, Slot);
        return;
    }
    if (!globalThis.mysql_frida) {
        api.CUser_SendUpdateItemList(CUser, 1, itemSpace, Slot);
        return;
    }

    const v4 = api.CUserCharacInfo_getCurCharacInvenW(CUser);
    const equipment = api.CInventory_GetInvenRef(v4, invenType, Slot);
    if (!api.Inven_Item_isEquipableItemType(equipment)) {
        api.CUser_SendUpdateItemList(CUser, 1, itemSpace, Slot);
        return;
    }
    const id = equipment.add(25).readU32();
    let JewelSocketData = api.api_get_jewel_socket_data(mysql_frida, id);

    if (JewelSocketData.isNull()) {
        api.CUser_SendUpdateItemList(CUser, 1, itemSpace, Slot);
        return;
    }
    const v10 = api.api_PacketGuard_PacketGuard();
    api.InterfacePacketBuf_put_header(v10, 0, 14);
    api.InterfacePacketBuf_put_byte(v10, itemSpace); 
    api.InterfacePacketBuf_put_short(v10, 1);
    api.CInventory_MakeItemPacket(v4, invenType, Slot, v10);
    api.InterfacePacketBuf_put_binary(v10, JewelSocketData, 30);
    
    api.InterfacePacketBuf_finalize(v10, 1);
    api.CUser_Send(CUser, v10);
    api.Destroy_PacketGuard_PacketGuard(v10);
};

/**
 * 抗魔值相关
 */

Memory.patchCode(ptr(0x085118D1), 7, code => {
    code.writeByteArray([0xC7, 0x04, 0x24, 0x40, 0x02, 0x00, 0x00]);
});
Interceptor.attach(ptr(0x0850FD84), {
    onEnter: function (args) {
        const anti_evil = args[1].add(0x440).readU32();//1088
        if (anti_evil) {
            args[0].add(0x23C).writeUInt(anti_evil);
        } else {
            args[0].add(0x23C).writeUInt(0);//若无该词条，初始化0
        }
    },
    onLeave: function (retval) { }
});

/**
 * 获取装备的抗魔值
 * @param {number} equ_id - 装备ID
 * @returns {number} 抗魔值，如果不是装备或未找到则返回0
 */
api.CEquipItem_get_anti_evil = function(equ_id) {
    if (!equ_id || equ_id <= 0) {
        return 0;
    }
    const equItem = api.CDataManager_find_item(api.G_CDataManager(), equ_id);
    if (!equItem || equItem.isNull()) {
        return 0;
    }
    const type = equItem.add(84).readU8();//0装备 1消耗品
    if (!type)
        return equItem.add(0x23C).readU32();
    else
        return 0;
}

/**
 * 计算玩家身上装备的总抗魔值
 * @param {NativePointer} user - 玩家对象指针
 * @returns {number} 总抗魔值
 */
api.GetAntiEvil = function(user) {
    var inven = api.CUserCharacInfo_getCurCharacInvenR(user);
    var total_anti_evil = 0;
    
    // 遍历所有装备栏位 0-25
    for (var slot = 0; slot <= 25; slot++) {
        var equ = api.CInventory_GetInvenRef(inven, api.INVENTORY_TYPE_BODY, slot);
        var item_id = api.Inven_Item_getKey(equ);
        if (item_id > 0) {
            var anti_evil = api.CEquipItem_get_anti_evil(item_id);
            total_anti_evil += anti_evil;
        }
    }
    
    return total_anti_evil;
};

// ==================== 挂载消息分发线程 ====================
api.hook_TimerDispatcher_dispatch();


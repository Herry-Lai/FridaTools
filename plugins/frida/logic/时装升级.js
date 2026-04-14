/**
 * 时装升级.js - v2.1
 * 
 * 功能：根据职业和部位升级时装，支持成功率和权重随机
 * 2026.3.28 配置外部化改造
 * By.南瓜
 */

module.exports = {
    // ==================== 配置文件路径 ====================
    configPath: '/plugins/frida/configs/时装升级.json',

    init() {
        const self = this;
        
        // 根据权重随机抽取时装ID
        function getRandomAvatarId(avatar_pool) {
            const totalWeight = avatar_pool.reduce((sum, item) => sum + item[1], 0);
            let random = Math.floor(Math.random() * totalWeight);
            
            for (const [avatarId, weight] of avatar_pool) {
                random -= weight;
                if (random < 0) {
                    return avatarId;
                }
            }
            
            return avatar_pool[0][0];
        }

        // 判断是否成功（根据成功率）
        function isUpgradeSuccess() {
            const random = Math.floor(Math.random() * 100);
            return random < self.CONFIG['时装升级配置']['成功率'];
        }

        // 获取职业部位配置
        function getJobSlotConfig(job, slot) {
            const jobConfigs = self.CONFIG['时装升级配置']['职业部位配置'];
            if (!jobConfigs[job]) {
                return null;
            }
            return jobConfigs[job][slot] || null;
        }

        // 检查品级是否允许
        function isGradeAllowed(grade) {
            return self.CONFIG['时装升级配置']['允许品级'].includes(grade);
        }

        function Send_avatar(user) {
            const packet = api_PacketGuard_PacketGuard();
            InterfacePacketBuf_put_header(packet, 1, 589);
            InterfacePacketBuf_put_byte(packet, 0);
            InterfacePacketBuf_finalize(packet, 1);
            CUser_Send(user, packet);
            Destroy_PacketGuard_PacketGuard(packet);
        }

        function isAvatarExcluded(avatarId) {
            return self.CONFIG['时装升级配置']['黑名单时装ID'].includes(avatarId);
        }

        function deleteOldAvatar(user, avatar, slot_avatar, avatar_id, charac_no) {
            Inven_Item_reset(avatar);
            
            if (typeof mysql_taiwan_cain_2nd !== 'undefined') {
                const sql = `UPDATE taiwan_cain_2nd.user_items SET stat=1 
                             WHERE charac_no=${charac_no} AND slot=${slot_avatar + 10} AND it_id=${avatar_id}`;
                api_MySQL_exec(mysql_taiwan_cain_2nd, sql);
            }
        }

        Interceptor.replace(ptr(0x0819FA56), new NativeCallback(function(dispatcher, user, msg_base) {
            try {
                const slot_item = api_PacketBuf_get_short(msg_base);
                const slot_avatar = api_PacketBuf_get_short(msg_base);
                
                if (user.isNull()) return 1692;

                if (CUser_get_state(user) !== 3) {
                    Send_avatar(user);
                    return 0;
                }

                if (CUser_CheckInTrade(user) !== 0) {
                    api_send_msg(user, "交易中无法操作", 1);
                    Send_avatar(user);
                    return 0;
                }
                
                const inven = CUserCharacInfo_getCurCharacInvenR(user);
                const inven_w = CUserCharacInfo_getCurCharacInvenW(user);
                const avatar = CInventory_GetInvenRef(inven, 2, slot_avatar);
                
                if (avatar.isNull() || Inven_Item_isEmpty(avatar)) {
                    api_send_msg(user, self.CONFIG['时装升级配置']['提示消息']['时装不存在'], 1);
                    Send_avatar(user);
                    return 0;
                }
                
                const old_avatar_id = avatar.add(2).readU32();
                const item_type = api_Get_ItemType(old_avatar_id);
                const item_grade = api_Get_ItemGrade(old_avatar_id);
                const job = CUserCharacInfo_get_charac_job(user);
                const charac_no = CUserCharacInfo_getCurCharacNo(user);
                
                // ==================== 检查品级 ====================
                if (!isGradeAllowed(item_grade)) {
                    api_send_msg(user, self.CONFIG['时装升级配置']['提示消息']['该品级的时装不支持升级'], 1);
                    Send_avatar(user);
                    return 0;
                }
                
                // ==================== 检查黑名单 ====================
                if (isAvatarExcluded(old_avatar_id)) {
                    api_send_msg(user, self.CONFIG['时装升级配置']['提示消息']['该时装不支持升级'], 1);
                    Send_avatar(user);
                    return 0;
                }

                // ==================== 检查锁定 ====================
                if (CUser_CheckItemLock(user, 2, slot_avatar) !== 0) {
                    api_send_msg(user, "时装已锁定", 1);
                    Send_avatar(user);
                    return 0;
                }
                
                // ==================== 获取职业部位配置 ====================
                const avatar_pool = getJobSlotConfig(job, item_type);
                
                if (!avatar_pool) {
                    api_send_msg(user, self.CONFIG['时装升级配置']['提示消息']['该职业或部位暂不支持升级'], 1);
                    Send_avatar(user);
                    return 0;
                }
                
                // ==================== 删除升级箱 ====================
                if (self.CONFIG['时装升级配置']['是否消耗升级箱']) {
                    if (!CInventory_delete_item(inven_w, 1, slot_item, 1, 5, 1)) {
                        Send_avatar(user);
                        return 0;
                    }
                    CUser_SendUpdateItemList(user, 1, 0, slot_item);
                }
                
                // ==================== 判断是否成功 ====================
                const success = isUpgradeSuccess();
                
                if (!success) {
                    // 升级失败，保留原时装
                    api_send_msg(user, self.CONFIG['时装升级配置']['提示消息']['失败'], 1);
                    Send_avatar(user);
                    return 0;
                }
                
                // ==================== 升级成功 ====================
                
                const new_avatar_id = getRandomAvatarId(avatar_pool);
                api_send_msg(user, self.CONFIG['时装升级配置']['提示消息']['成功'], 1);
                api_SendHyperLinkChatMsg_emoji(user, [
                    ['icon', 5],
                    ['str', ' 恭喜玩家', [210, 105, 30, 255]],
                    ['str', '[' + api_CUserCharacInfo_getCurCharacName(user) + ']', [255, 215, 0, 255]],
                    ['str', '成功合成', [210, 105, 30, 255]],
                    ['item', new_avatar_id]  // 新时装ID
                ], 0, 1);
                
                // 删除旧时装
                deleteOldAvatar(user, avatar, slot_avatar, old_avatar_id, charac_no);
                
                // 添加新时装
                const new_slot = AddAvatarItem(user, new_avatar_id, 0);
                if (new_slot < 0) {
                    Send_avatar(user);
                    return 0;
                }
                
                // 刷新时装栏
                CUser_send_itemspace(user, ENUM_ITEMSPACE_AVATAR);
                Send_avatar(user);
                
                return 0;
                
            } catch (e) {
                log_error("时装升级错误: {}", e.message);
                log_error("堆栈: {}", e.stack);
                Send_avatar(user);
                return 1692;
            }
        }, 'int', ['pointer', 'pointer', 'pointer']));
    }
};

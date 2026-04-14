/**
 * 深渊掉落概率.js - v1.1 (配置分离版)
 * 功能：修改深渊副本（大牛、小牛）的史诗/粉色/紫色等掉落概率。
 * By.Nangua 2026.1.28
 */

// ==================== 默认配置（外部 JSON 可覆盖） ====================
module.exports = {
    /** 中文键名映射（框架自动使用，支持递归嵌套） */
    fieldMapping: {
        "深渊掉落概率配置": "RATES",
        "非常困难": "veryHard",
        "困难": "hard",
        "普通": "white",
        "高级": "blue",
        "稀有": "purple",
        "神器": "pink",
        "史诗": "epic"
    },

    // ==================== 配置文件路径 ====================
    configPath: '/plugins/frida/configs/动态调整深渊爆率.json',
    init() {
        const self = this;

        const veryHardValid = validateDropRates(self.CONFIG.RATES.veryHard, "非常困难 (大牛)");
        const hardValid = validateDropRates(self.CONFIG.RATES.hard, "困难 (小牛)");
        
        if (!veryHardValid || !hardValid) {
            log_warn("深渊爆率配置验证失败，Hook未加载");
            return;
        }
        
        /*log_info("深渊爆率修改已启用 [大牛史诗:{}% 小牛史诗:{}%]", 
            self.CONFIG.RATES.veryHard.epic,
            self.CONFIG.RATES.hard.epic
        );*/
        
        // 预计算数据
        const veryHardValues = convertToCumulative(self.CONFIG.RATES.veryHard, 1000002);
        const hardValues = convertToCumulative(self.CONFIG.RATES.hard, 1000001);
        
        // 执行 Hook
        Interceptor.attach(ptr(0x08535726), {
            onEnter: function (args) {
                const CMonsterDrop_Hell_ptr = args[0];
                // 偏移 72 处即为掉落概率表
                const rand = CMonsterDrop_Hell_ptr.add(72);
                
                // 分配 48 字节内存 (6个int * 4字节 * 2组 = 48字节)
                const buffer = Memory.alloc(48);
                
                // 写入大牛概率 (前6个int)
                for (let i = 0; i < 6; i++) {
                    buffer.add(i * 4).writeInt(veryHardValues[i]);
                }
                
                // 写入小牛概率 (后6个int)
                for (let i = 0; i < 6; i++) {
                    buffer.add((i + 6) * 4).writeInt(hardValues[i]);
                }
                
                // 将内存块写入目标地址
                rand.writeByteArray(buffer.readByteArray(48));
            }
        });
    }
};

function validateDropRates(rates, difficultyName) {
    const sum = rates.white + rates.blue + rates.purple + rates.pink + rates.epic;
    
    const isValid = Math.abs(sum - 100) < 1e-10;
    
    if (!isValid) {
        log_error("==================== 深渊配置错误 ====================");
        log_error(`【${difficultyName}】配置百分比总和不等于100%`);
        log_error(`  白色: ${rates.white}%`);
        log_error(`  蓝色: ${rates.blue}%`);
        log_error(`  紫色: ${rates.purple}%`);
        log_error(`  粉色: ${rates.pink}%`);
        log_error(`  史诗: ${rates.epic}%`);
        log_error("  ────────────────────");
        log_error(`  总和: ${sum.toFixed(10)}%`);
        log_error("  要求: 100%");
        
        const diff = sum - 100;
        if (diff > 1e-10) {
            log_error(`超出: ${diff}%`);
            log_error("建议：减少某个品质的百分比");
        } else if (diff < -1e-10) {
            log_error(`不足: ${Math.abs(diff)}%`);
            log_error("建议：增加某个品质的百分比");
        }
        
        log_error("深渊爆率修改未生效，将使用原版爆率！");
        log_error("==================================================");
    }
    
    return isValid;
}

function convertToCumulative(rates, flag) {
    const white = Math.floor(rates.white * 10000);
    const blue = Math.floor((rates.white + rates.blue) * 10000);
    const purple = Math.floor((rates.white + rates.blue + rates.purple) * 10000);
    const pink = Math.floor((rates.white + rates.blue + rates.purple + rates.pink) * 10000);
    
    // 返回格式: [白界限, 蓝界限, 紫界限, 粉界限, 总数(1000000), 标记位]
    return [white, blue, purple, pink, 1000000, flag];
}

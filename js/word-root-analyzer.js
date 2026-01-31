/**
 * Word Root Analyzer
 * Analyzes word etymology by breaking down prefixes, roots, and suffixes
 */

export const ComponentType = {
  PREFIX: { key: 'prefix', label: 'Prefix', chinese: '前缀' },
  ROOT: { key: 'root', label: 'Root', chinese: '词根' },
  SUFFIX: { key: 'suffix', label: 'Suffix', chinese: '后缀' }
};

// Comprehensive English prefixes (70+)
const prefixes = [
  // Negative prefixes
  { pattern: "un", meaning: "not, opposite", chinese: "不，相反" },
  { pattern: "dis", meaning: "not, opposite, apart", chinese: "不，相反，分开" },
  { pattern: "in", meaning: "not, into", chinese: "不，进入" },
  { pattern: "im", meaning: "not, into", chinese: "不，进入" },
  { pattern: "il", meaning: "not", chinese: "不" },
  { pattern: "ir", meaning: "not", chinese: "不" },
  { pattern: "non", meaning: "not", chinese: "非，不" },
  { pattern: "mis", meaning: "wrong, badly", chinese: "错误地" },
  { pattern: "mal", meaning: "bad, wrong", chinese: "坏，错误" },
  { pattern: "anti", meaning: "against, opposite", chinese: "反对，抗" },
  { pattern: "contra", meaning: "against", chinese: "反对" },
  { pattern: "counter", meaning: "against, opposite", chinese: "反对，相反" },
  
  // Direction/Position prefixes
  { pattern: "ab", meaning: "away from", chinese: "离开" },
  { pattern: "ad", meaning: "to, toward", chinese: "向，朝" },
  { pattern: "circum", meaning: "around", chinese: "围绕" },
  { pattern: "com", meaning: "with, together", chinese: "共同，一起" },
  { pattern: "con", meaning: "with, together", chinese: "共同，一起" },
  { pattern: "col", meaning: "with, together", chinese: "共同，一起" },
  { pattern: "cor", meaning: "with, together", chinese: "共同，一起" },
  { pattern: "co", meaning: "with, together", chinese: "共同，一起" },
  { pattern: "de", meaning: "down, away, remove", chinese: "向下，去除" },
  { pattern: "dia", meaning: "through, across", chinese: "穿过" },
  { pattern: "ex", meaning: "out, former", chinese: "出，前" },
  { pattern: "extra", meaning: "beyond, outside", chinese: "超出，外" },
  { pattern: "infra", meaning: "below", chinese: "在…下" },
  { pattern: "inter", meaning: "between, among", chinese: "在…之间" },
  { pattern: "intra", meaning: "within", chinese: "在…内" },
  { pattern: "intro", meaning: "into, inward", chinese: "向内" },
  { pattern: "ob", meaning: "against, toward", chinese: "反对，朝向" },
  { pattern: "para", meaning: "beside, beyond", chinese: "旁边，超越" },
  { pattern: "per", meaning: "through, thorough", chinese: "穿过，彻底" },
  { pattern: "peri", meaning: "around", chinese: "围绕" },
  { pattern: "post", meaning: "after", chinese: "在…之后" },
  { pattern: "pre", meaning: "before", chinese: "在…之前" },
  { pattern: "pro", meaning: "forward, for, before", chinese: "向前，支持" },
  { pattern: "re", meaning: "again, back", chinese: "再，重新" },
  { pattern: "retro", meaning: "backward", chinese: "向后" },
  { pattern: "se", meaning: "apart, away", chinese: "分开" },
  { pattern: "sub", meaning: "under, below", chinese: "在…下" },
  { pattern: "suc", meaning: "under", chinese: "在…下" },
  { pattern: "suf", meaning: "under", chinese: "在…下" },
  { pattern: "sup", meaning: "under", chinese: "在…下" },
  { pattern: "sus", meaning: "under", chinese: "在…下" },
  { pattern: "super", meaning: "above, beyond", chinese: "超级，在…上" },
  { pattern: "supra", meaning: "above", chinese: "在…上" },
  { pattern: "sur", meaning: "over, above", chinese: "在…上" },
  { pattern: "syn", meaning: "together, with", chinese: "共同" },
  { pattern: "sym", meaning: "together, with", chinese: "共同" },
  { pattern: "trans", meaning: "across, beyond", chinese: "跨越，穿过" },
  { pattern: "ultra", meaning: "beyond, extreme", chinese: "超越，极端" },
  
  // Size/Degree prefixes
  { pattern: "hyper", meaning: "over, excessive", chinese: "过度，超" },
  { pattern: "hypo", meaning: "under, below", chinese: "低于，不足" },
  { pattern: "macro", meaning: "large", chinese: "大，宏观" },
  { pattern: "mega", meaning: "large, million", chinese: "大，百万" },
  { pattern: "micro", meaning: "small", chinese: "小，微" },
  { pattern: "mini", meaning: "small", chinese: "小，迷你" },
  { pattern: "out", meaning: "beyond, more", chinese: "超过，在外" },
  { pattern: "over", meaning: "too much, above", chinese: "过度，在…上" },
  { pattern: "under", meaning: "below, insufficient", chinese: "在…下，不足" },
  
  // Number prefixes
  { pattern: "uni", meaning: "one", chinese: "单一" },
  { pattern: "mono", meaning: "one, single", chinese: "单一" },
  { pattern: "bi", meaning: "two", chinese: "双，二" },
  { pattern: "di", meaning: "two", chinese: "双，二" },
  { pattern: "tri", meaning: "three", chinese: "三" },
  { pattern: "quad", meaning: "four", chinese: "四" },
  { pattern: "quart", meaning: "four", chinese: "四" },
  { pattern: "pent", meaning: "five", chinese: "五" },
  { pattern: "quint", meaning: "five", chinese: "五" },
  { pattern: "hex", meaning: "six", chinese: "六" },
  { pattern: "hept", meaning: "seven", chinese: "七" },
  { pattern: "sept", meaning: "seven", chinese: "七" },
  { pattern: "oct", meaning: "eight", chinese: "八" },
  { pattern: "nov", meaning: "nine", chinese: "九" },
  { pattern: "dec", meaning: "ten", chinese: "十" },
  { pattern: "cent", meaning: "hundred", chinese: "百" },
  { pattern: "kilo", meaning: "thousand", chinese: "千" },
  { pattern: "milli", meaning: "thousand, thousandth", chinese: "千，千分之一" },
  { pattern: "semi", meaning: "half", chinese: "半" },
  { pattern: "hemi", meaning: "half", chinese: "半" },
  { pattern: "demi", meaning: "half", chinese: "半" },
  { pattern: "multi", meaning: "many", chinese: "多" },
  { pattern: "poly", meaning: "many", chinese: "多" },
  
  // Other common prefixes
  { pattern: "auto", meaning: "self", chinese: "自动，自己" },
  { pattern: "bene", meaning: "good, well", chinese: "好" },
  { pattern: "bio", meaning: "life", chinese: "生命" },
  { pattern: "chrono", meaning: "time", chinese: "时间" },
  { pattern: "cyber", meaning: "computer", chinese: "网络，计算机" },
  { pattern: "eco", meaning: "environment", chinese: "生态，环境" },
  { pattern: "electro", meaning: "electric", chinese: "电" },
  { pattern: "geo", meaning: "earth", chinese: "地球" },
  { pattern: "hetero", meaning: "different", chinese: "不同" },
  { pattern: "homo", meaning: "same", chinese: "相同" },
  { pattern: "hydro", meaning: "water", chinese: "水" },
  { pattern: "neo", meaning: "new", chinese: "新" },
  { pattern: "neuro", meaning: "nerve", chinese: "神经" },
  { pattern: "pan", meaning: "all", chinese: "全，泛" },
  { pattern: "phil", meaning: "love", chinese: "爱" },
  { pattern: "philo", meaning: "love", chinese: "爱" },
  { pattern: "photo", meaning: "light", chinese: "光" },
  { pattern: "pseudo", meaning: "false", chinese: "假，伪" },
  { pattern: "psycho", meaning: "mind", chinese: "心理" },
  { pattern: "socio", meaning: "society", chinese: "社会" },
  { pattern: "techno", meaning: "technology", chinese: "技术" },
  { pattern: "tele", meaning: "far, distant", chinese: "远" },
  { pattern: "thermo", meaning: "heat", chinese: "热" },
  { pattern: "vice", meaning: "deputy", chinese: "副" },
  
  // Time prefixes
  { pattern: "ante", meaning: "before", chinese: "在…之前" },
  { pattern: "fore", meaning: "before, front", chinese: "在…前" },
  { pattern: "mid", meaning: "middle", chinese: "中间" },
  
  // Attitude prefixes
  { pattern: "eu", meaning: "good, well", chinese: "好" },
  { pattern: "dys", meaning: "bad, difficult", chinese: "坏，困难" }
];

// Comprehensive English roots (200+)
const roots = [
  // A
  { pattern: "act", meaning: "do, drive", chinese: "做，驱动" },
  { pattern: "ag", meaning: "do, act", chinese: "做，行动" },
  { pattern: "agr", meaning: "field, farm", chinese: "田地，农业" },
  { pattern: "ali", meaning: "other", chinese: "其他" },
  { pattern: "alter", meaning: "other, change", chinese: "其他，改变" },
  { pattern: "am", meaning: "love", chinese: "爱" },
  { pattern: "anim", meaning: "life, spirit", chinese: "生命，精神" },
  { pattern: "ann", meaning: "year", chinese: "年" },
  { pattern: "enn", meaning: "year", chinese: "年" },
  { pattern: "anth", meaning: "flower", chinese: "花" },
  { pattern: "anthrop", meaning: "human", chinese: "人类" },
  { pattern: "apt", meaning: "fit", chinese: "适合" },
  { pattern: "aqu", meaning: "water", chinese: "水" },
  { pattern: "arch", meaning: "chief, rule", chinese: "首领，统治" },
  { pattern: "art", meaning: "skill", chinese: "技艺" },
  { pattern: "aster", meaning: "star", chinese: "星" },
  { pattern: "astr", meaning: "star", chinese: "星" },
  { pattern: "aud", meaning: "hear", chinese: "听" },
  { pattern: "aug", meaning: "increase", chinese: "增加" },
  
  // B
  { pattern: "bar", meaning: "weight, pressure", chinese: "重量，压力" },
  { pattern: "bas", meaning: "low, base", chinese: "低，基础" },
  { pattern: "bell", meaning: "war", chinese: "战争" },
  { pattern: "bibl", meaning: "book", chinese: "书" },
  { pattern: "bio", meaning: "life", chinese: "生命" },
  { pattern: "brev", meaning: "short", chinese: "短" },
  
  // C
  { pattern: "cad", meaning: "fall", chinese: "落下" },
  { pattern: "cas", meaning: "fall", chinese: "落下" },
  { pattern: "cid", meaning: "fall", chinese: "落下" },
  { pattern: "cap", meaning: "head", chinese: "头" },
  { pattern: "capit", meaning: "head", chinese: "头" },
  { pattern: "capt", meaning: "take, seize", chinese: "拿，抓" },
  { pattern: "cept", meaning: "take, seize", chinese: "拿，抓" },
  { pattern: "ceiv", meaning: "take, seize", chinese: "拿，抓" },
  { pattern: "cip", meaning: "take, seize", chinese: "拿，抓" },
  { pattern: "carn", meaning: "flesh", chinese: "肉" },
  { pattern: "ced", meaning: "go, yield", chinese: "走，让步" },
  { pattern: "ceed", meaning: "go, yield", chinese: "走，让步" },
  { pattern: "cess", meaning: "go, yield", chinese: "走，让步" },
  { pattern: "centr", meaning: "center", chinese: "中心" },
  { pattern: "cert", meaning: "sure", chinese: "确定" },
  { pattern: "chron", meaning: "time", chinese: "时间" },
  { pattern: "cide", meaning: "kill, cut", chinese: "杀，切" },
  { pattern: "cis", meaning: "cut", chinese: "切" },
  { pattern: "cit", meaning: "call, arouse", chinese: "叫，唤起" },
  { pattern: "civ", meaning: "citizen", chinese: "公民" },
  { pattern: "claim", meaning: "cry out", chinese: "喊叫" },
  { pattern: "clam", meaning: "cry out", chinese: "喊叫" },
  { pattern: "clar", meaning: "clear", chinese: "清楚" },
  { pattern: "clin", meaning: "lean, bend", chinese: "倾斜" },
  { pattern: "clos", meaning: "close", chinese: "关闭" },
  { pattern: "clud", meaning: "close", chinese: "关闭" },
  { pattern: "clus", meaning: "close", chinese: "关闭" },
  { pattern: "cogn", meaning: "know", chinese: "知道" },
  { pattern: "cord", meaning: "heart", chinese: "心" },
  { pattern: "corp", meaning: "body", chinese: "身体" },
  { pattern: "cosm", meaning: "universe, order", chinese: "宇宙，秩序" },
  { pattern: "crat", meaning: "rule, power", chinese: "统治，权力" },
  { pattern: "cre", meaning: "create, grow", chinese: "创造，生长" },
  { pattern: "creat", meaning: "create", chinese: "创造" },
  { pattern: "cred", meaning: "believe, trust", chinese: "相信，信任" },
  { pattern: "cresc", meaning: "grow", chinese: "生长" },
  { pattern: "crit", meaning: "judge", chinese: "判断" },
  { pattern: "crypt", meaning: "hidden", chinese: "隐藏" },
  { pattern: "cult", meaning: "care, grow", chinese: "培养，种植" },
  { pattern: "cur", meaning: "care", chinese: "关心" },
  { pattern: "cure", meaning: "care", chinese: "关心" },
  { pattern: "curs", meaning: "run", chinese: "跑" },
  { pattern: "curr", meaning: "run", chinese: "跑" },
  { pattern: "cours", meaning: "run", chinese: "跑" },
  { pattern: "cycl", meaning: "circle", chinese: "圆，循环" },
  
  // D
  { pattern: "dec", meaning: "ten", chinese: "十" },
  { pattern: "dem", meaning: "people", chinese: "人民" },
  { pattern: "dent", meaning: "tooth", chinese: "牙齿" },
  { pattern: "derm", meaning: "skin", chinese: "皮肤" },
  { pattern: "dic", meaning: "say, speak", chinese: "说" },
  { pattern: "dict", meaning: "say, speak", chinese: "说" },
  { pattern: "dign", meaning: "worthy", chinese: "值得" },
  { pattern: "doc", meaning: "teach", chinese: "教" },
  { pattern: "doct", meaning: "teach", chinese: "教" },
  { pattern: "dom", meaning: "house, control", chinese: "房屋，控制" },
  { pattern: "don", meaning: "give", chinese: "给" },
  { pattern: "donat", meaning: "give", chinese: "给" },
  { pattern: "dorm", meaning: "sleep", chinese: "睡" },
  { pattern: "dox", meaning: "opinion, belief", chinese: "观点，信仰" },
  { pattern: "draw", meaning: "pull", chinese: "拉" },
  { pattern: "du", meaning: "two", chinese: "二" },
  { pattern: "duc", meaning: "lead", chinese: "引导" },
  { pattern: "duct", meaning: "lead", chinese: "引导" },
  { pattern: "dur", meaning: "hard, lasting", chinese: "硬，持久" },
  { pattern: "dyn", meaning: "power", chinese: "力量" },
  { pattern: "dynam", meaning: "power", chinese: "力量" },
  
  // E
  { pattern: "equ", meaning: "equal", chinese: "相等" },
  { pattern: "erg", meaning: "work", chinese: "工作" },
  { pattern: "err", meaning: "wander, mistake", chinese: "漫游，错误" },
  { pattern: "ev", meaning: "age, time", chinese: "时代" },
  
  // F
  { pattern: "fab", meaning: "speak", chinese: "说" },
  { pattern: "fac", meaning: "make, do", chinese: "做，制造" },
  { pattern: "fact", meaning: "make, do", chinese: "做，制造" },
  { pattern: "fect", meaning: "make, do", chinese: "做，制造" },
  { pattern: "fic", meaning: "make, do", chinese: "做，制造" },
  { pattern: "fall", meaning: "deceive", chinese: "欺骗" },
  { pattern: "fals", meaning: "deceive", chinese: "欺骗" },
  { pattern: "fam", meaning: "fame, report", chinese: "名声" },
  { pattern: "fer", meaning: "carry, bring", chinese: "带，携带" },
  { pattern: "fid", meaning: "faith, trust", chinese: "信任" },
  { pattern: "fig", meaning: "shape, form", chinese: "形状" },
  { pattern: "fin", meaning: "end, limit", chinese: "结束，限制" },
  { pattern: "firm", meaning: "strong", chinese: "坚固" },
  { pattern: "fix", meaning: "fasten", chinese: "固定" },
  { pattern: "flam", meaning: "burn", chinese: "燃烧" },
  { pattern: "flect", meaning: "bend", chinese: "弯曲" },
  { pattern: "flex", meaning: "bend", chinese: "弯曲" },
  { pattern: "flict", meaning: "strike", chinese: "打击" },
  { pattern: "flor", meaning: "flower", chinese: "花" },
  { pattern: "flu", meaning: "flow", chinese: "流" },
  { pattern: "flux", meaning: "flow", chinese: "流" },
  { pattern: "form", meaning: "shape", chinese: "形状" },
  { pattern: "fort", meaning: "strong", chinese: "强壮" },
  { pattern: "forc", meaning: "strong", chinese: "强壮" },
  { pattern: "frag", meaning: "break", chinese: "打破" },
  { pattern: "fract", meaning: "break", chinese: "打破" },
  { pattern: "fug", meaning: "flee", chinese: "逃" },
  { pattern: "funct", meaning: "perform", chinese: "执行" },
  { pattern: "fund", meaning: "base, bottom", chinese: "基础，底部" },
  { pattern: "fus", meaning: "pour, melt", chinese: "倾倒，融化" },
  
  // G
  { pattern: "gam", meaning: "marriage", chinese: "婚姻" },
  { pattern: "gen", meaning: "birth, produce", chinese: "出生，产生" },
  { pattern: "ger", meaning: "carry", chinese: "携带" },
  { pattern: "gest", meaning: "carry", chinese: "携带" },
  { pattern: "gnos", meaning: "know", chinese: "知道" },
  { pattern: "grad", meaning: "step, degree", chinese: "步，程度" },
  { pattern: "gress", meaning: "step, go", chinese: "步，走" },
  { pattern: "gram", meaning: "write, letter", chinese: "写，字母" },
  { pattern: "graph", meaning: "write", chinese: "写" },
  { pattern: "grat", meaning: "pleasing", chinese: "令人愉快" },
  { pattern: "grav", meaning: "heavy", chinese: "重" },
  { pattern: "greg", meaning: "flock, group", chinese: "群" },
  { pattern: "gyn", meaning: "woman", chinese: "女人" },
  
  // H
  { pattern: "hab", meaning: "have, hold", chinese: "有，持有" },
  { pattern: "habit", meaning: "have, live", chinese: "有，居住" },
  { pattern: "hap", meaning: "luck, chance", chinese: "运气" },
  { pattern: "heli", meaning: "sun", chinese: "太阳" },
  { pattern: "hem", meaning: "blood", chinese: "血" },
  { pattern: "her", meaning: "heir", chinese: "继承人" },
  { pattern: "hes", meaning: "stick", chinese: "粘" },
  { pattern: "hibit", meaning: "hold, have", chinese: "持有" },
  { pattern: "hom", meaning: "man, human", chinese: "人" },
  { pattern: "hor", meaning: "hour", chinese: "小时" },
  { pattern: "hum", meaning: "earth, ground", chinese: "土地" },
  { pattern: "human", meaning: "human", chinese: "人类" },
  
  // I-J
  { pattern: "ident", meaning: "same", chinese: "相同" },
  { pattern: "ign", meaning: "fire", chinese: "火" },
  { pattern: "imag", meaning: "likeness", chinese: "相似" },
  { pattern: "init", meaning: "begin", chinese: "开始" },
  { pattern: "integr", meaning: "whole", chinese: "完整" },
  { pattern: "it", meaning: "go", chinese: "走" },
  { pattern: "ject", meaning: "throw", chinese: "投，扔" },
  { pattern: "join", meaning: "join", chinese: "连接" },
  { pattern: "junct", meaning: "join", chinese: "连接" },
  { pattern: "jud", meaning: "judge", chinese: "判断" },
  { pattern: "judic", meaning: "judge", chinese: "判断" },
  { pattern: "jur", meaning: "swear, law", chinese: "发誓，法律" },
  { pattern: "jus", meaning: "law, right", chinese: "法律，权利" },
  { pattern: "just", meaning: "law, right", chinese: "法律，正义" },
  { pattern: "juven", meaning: "young", chinese: "年轻" },
  
  // L
  { pattern: "labor", meaning: "work", chinese: "工作" },
  { pattern: "lat", meaning: "carry, bear", chinese: "携带" },
  { pattern: "later", meaning: "side", chinese: "侧面" },
  { pattern: "lav", meaning: "wash", chinese: "洗" },
  { pattern: "lect", meaning: "choose, read", chinese: "选择，读" },
  { pattern: "leg", meaning: "law, read", chinese: "法律，读" },
  { pattern: "lev", meaning: "light, rise", chinese: "轻，升起" },
  { pattern: "liber", meaning: "free", chinese: "自由" },
  { pattern: "libr", meaning: "book", chinese: "书" },
  { pattern: "lic", meaning: "permit", chinese: "允许" },
  { pattern: "lig", meaning: "bind", chinese: "绑" },
  { pattern: "lim", meaning: "limit", chinese: "限制" },
  { pattern: "lin", meaning: "line", chinese: "线" },
  { pattern: "lingu", meaning: "language, tongue", chinese: "语言，舌头" },
  { pattern: "lit", meaning: "letter", chinese: "文字" },
  { pattern: "liter", meaning: "letter", chinese: "文字" },
  { pattern: "loc", meaning: "place", chinese: "地方" },
  { pattern: "log", meaning: "word, study, reason", chinese: "词，学科，理性" },
  { pattern: "loqu", meaning: "speak", chinese: "说" },
  { pattern: "luc", meaning: "light", chinese: "光" },
  { pattern: "lud", meaning: "play", chinese: "玩" },
  { pattern: "lus", meaning: "play", chinese: "玩" },
  { pattern: "lum", meaning: "light", chinese: "光" },
  { pattern: "lumin", meaning: "light", chinese: "光" },
  
  // M
  { pattern: "magn", meaning: "great", chinese: "大" },
  { pattern: "maj", meaning: "greater", chinese: "更大" },
  { pattern: "man", meaning: "hand", chinese: "手" },
  { pattern: "manu", meaning: "hand", chinese: "手" },
  { pattern: "mand", meaning: "order", chinese: "命令" },
  { pattern: "mar", meaning: "sea", chinese: "海" },
  { pattern: "mater", meaning: "mother", chinese: "母亲" },
  { pattern: "matr", meaning: "mother", chinese: "母亲" },
  { pattern: "medi", meaning: "middle", chinese: "中间" },
  { pattern: "med", meaning: "heal", chinese: "治愈" },
  { pattern: "mem", meaning: "remember", chinese: "记忆" },
  { pattern: "memor", meaning: "remember", chinese: "记忆" },
  { pattern: "ment", meaning: "mind", chinese: "思想" },
  { pattern: "merc", meaning: "trade", chinese: "贸易" },
  { pattern: "merg", meaning: "dip, plunge", chinese: "浸入" },
  { pattern: "mers", meaning: "dip, plunge", chinese: "浸入" },
  { pattern: "meter", meaning: "measure", chinese: "测量" },
  { pattern: "metr", meaning: "measure", chinese: "测量" },
  { pattern: "migr", meaning: "move", chinese: "迁移" },
  { pattern: "min", meaning: "small, less", chinese: "小，少" },
  { pattern: "mir", meaning: "wonder", chinese: "惊奇" },
  { pattern: "mis", meaning: "send", chinese: "发送" },
  { pattern: "miss", meaning: "send", chinese: "发送" },
  { pattern: "mit", meaning: "send", chinese: "发送" },
  { pattern: "mob", meaning: "move", chinese: "移动" },
  { pattern: "mod", meaning: "manner, measure", chinese: "方式，测量" },
  { pattern: "mon", meaning: "warn, remind", chinese: "警告，提醒" },
  { pattern: "monstr", meaning: "show", chinese: "显示" },
  { pattern: "mor", meaning: "custom, manner", chinese: "习俗，方式" },
  { pattern: "morph", meaning: "form, shape", chinese: "形状" },
  { pattern: "mort", meaning: "death", chinese: "死亡" },
  { pattern: "mot", meaning: "move", chinese: "移动" },
  { pattern: "mov", meaning: "move", chinese: "移动" },
  { pattern: "mun", meaning: "service, gift", chinese: "服务，礼物" },
  { pattern: "mut", meaning: "change", chinese: "改变" },
  
  // N
  { pattern: "nasc", meaning: "born", chinese: "出生" },
  { pattern: "nat", meaning: "born", chinese: "出生" },
  { pattern: "nav", meaning: "ship", chinese: "船" },
  { pattern: "nect", meaning: "bind", chinese: "绑" },
  { pattern: "neg", meaning: "deny", chinese: "否认" },
  { pattern: "neur", meaning: "nerve", chinese: "神经" },
  { pattern: "noc", meaning: "harm", chinese: "伤害" },
  { pattern: "nox", meaning: "harm", chinese: "伤害" },
  { pattern: "nom", meaning: "name, law", chinese: "名字，法则" },
  { pattern: "nomin", meaning: "name", chinese: "名字" },
  { pattern: "norm", meaning: "rule", chinese: "规则" },
  { pattern: "not", meaning: "know, mark", chinese: "知道，标记" },
  { pattern: "noun", meaning: "declare", chinese: "宣布" },
  { pattern: "nounce", meaning: "declare", chinese: "宣布" },
  { pattern: "nov", meaning: "new", chinese: "新" },
  { pattern: "numer", meaning: "number", chinese: "数字" },
  { pattern: "nutr", meaning: "nourish", chinese: "滋养" },
  
  // O-P (continued in next section due to length)
  { pattern: "oct", meaning: "eight", chinese: "八" },
  { pattern: "ocul", meaning: "eye", chinese: "眼睛" },
  { pattern: "oper", meaning: "work", chinese: "工作" },
  { pattern: "opt", meaning: "best, choose", chinese: "最好，选择" },
  { pattern: "ora", meaning: "speak, pray", chinese: "说，祈祷" },
  { pattern: "ord", meaning: "order", chinese: "顺序" },
  { pattern: "organ", meaning: "tool, organ", chinese: "工具，器官" },
  { pattern: "ori", meaning: "rise", chinese: "升起" },
  { pattern: "orn", meaning: "decorate", chinese: "装饰" },
  { pattern: "pac", meaning: "peace", chinese: "和平" },
  { pattern: "par", meaning: "equal", chinese: "相等" },
  { pattern: "part", meaning: "part", chinese: "部分" },
  { pattern: "pass", meaning: "feel, suffer", chinese: "感受，遭受" },
  { pattern: "path", meaning: "feeling, disease", chinese: "感情，疾病" },
  { pattern: "patr", meaning: "father", chinese: "父亲" },
  { pattern: "pater", meaning: "father", chinese: "父亲" },
  { pattern: "ped", meaning: "foot, child", chinese: "脚，儿童" },
  { pattern: "pel", meaning: "drive, push", chinese: "驱动，推" },
  { pattern: "puls", meaning: "drive, push", chinese: "驱动，推" },
  { pattern: "pen", meaning: "punish", chinese: "惩罚" },
  { pattern: "pend", meaning: "hang, weigh", chinese: "悬挂，称重" },
  { pattern: "pens", meaning: "hang, weigh", chinese: "悬挂，称重" },
  { pattern: "pet", meaning: "seek", chinese: "寻求" },
  { pattern: "phas", meaning: "show", chinese: "显示" },
  { pattern: "phen", meaning: "show", chinese: "显示" },
  { pattern: "phil", meaning: "love", chinese: "爱" },
  { pattern: "phob", meaning: "fear", chinese: "恐惧" },
  { pattern: "phon", meaning: "sound", chinese: "声音" },
  { pattern: "phor", meaning: "carry", chinese: "携带" },
  { pattern: "photo", meaning: "light", chinese: "光" },
  { pattern: "phys", meaning: "nature, body", chinese: "自然，身体" },
  { pattern: "plac", meaning: "please", chinese: "取悦" },
  { pattern: "plan", meaning: "flat", chinese: "平的" },
  { pattern: "plas", meaning: "form, mold", chinese: "形成，塑造" },
  { pattern: "ple", meaning: "fill", chinese: "填充" },
  { pattern: "plen", meaning: "full", chinese: "满" },
  { pattern: "plex", meaning: "fold", chinese: "折叠" },
  { pattern: "plic", meaning: "fold", chinese: "折叠" },
  { pattern: "ply", meaning: "fold", chinese: "折叠" },
  { pattern: "pod", meaning: "foot", chinese: "脚" },
  { pattern: "poli", meaning: "city, citizen", chinese: "城市，公民" },
  { pattern: "polit", meaning: "citizen", chinese: "公民" },
  { pattern: "pon", meaning: "place, put", chinese: "放置" },
  { pattern: "pos", meaning: "place, put", chinese: "放置" },
  { pattern: "posit", meaning: "place, put", chinese: "放置" },
  { pattern: "pot", meaning: "power", chinese: "力量" },
  { pattern: "poten", meaning: "power", chinese: "力量" },
  { pattern: "prec", meaning: "price", chinese: "价格" },
  { pattern: "press", meaning: "press", chinese: "压" },
  { pattern: "prim", meaning: "first", chinese: "第一" },
  { pattern: "prin", meaning: "first", chinese: "第一" },
  { pattern: "priv", meaning: "separate", chinese: "分开" },
  { pattern: "prob", meaning: "prove, test", chinese: "证明，测试" },
  { pattern: "prov", meaning: "prove, test", chinese: "证明，测试" },
  { pattern: "proto", meaning: "first", chinese: "第一" },
  { pattern: "psych", meaning: "mind, soul", chinese: "心理，灵魂" },
  { pattern: "punct", meaning: "point", chinese: "点" },
  { pattern: "pur", meaning: "pure", chinese: "纯净" },
  { pattern: "put", meaning: "think", chinese: "思考" },
  
  // Q-R
  { pattern: "quer", meaning: "ask, seek", chinese: "问，寻求" },
  { pattern: "quest", meaning: "ask, seek", chinese: "问，寻求" },
  { pattern: "quir", meaning: "ask, seek", chinese: "问，寻求" },
  { pattern: "quiet", meaning: "rest", chinese: "安静" },
  { pattern: "radi", meaning: "ray, spoke", chinese: "光线，辐射" },
  { pattern: "rat", meaning: "think, reason", chinese: "思考，理性" },
  { pattern: "real", meaning: "thing", chinese: "事物" },
  { pattern: "rect", meaning: "right, straight", chinese: "正确，直" },
  { pattern: "reg", meaning: "rule, king", chinese: "统治，王" },
  { pattern: "rog", meaning: "ask", chinese: "问" },
  { pattern: "rupt", meaning: "break", chinese: "打破" },
  
  // S
  { pattern: "sacr", meaning: "holy", chinese: "神圣" },
  { pattern: "sanct", meaning: "holy", chinese: "神圣" },
  { pattern: "san", meaning: "health", chinese: "健康" },
  { pattern: "sat", meaning: "enough", chinese: "足够" },
  { pattern: "sci", meaning: "know", chinese: "知道" },
  { pattern: "scop", meaning: "see, watch", chinese: "看，观察" },
  { pattern: "scrib", meaning: "write", chinese: "写" },
  { pattern: "script", meaning: "write", chinese: "写" },
  { pattern: "sec", meaning: "cut", chinese: "切" },
  { pattern: "sect", meaning: "cut", chinese: "切" },
  { pattern: "secu", meaning: "follow", chinese: "跟随" },
  { pattern: "sequ", meaning: "follow", chinese: "跟随" },
  { pattern: "sed", meaning: "sit, settle", chinese: "坐，安顿" },
  { pattern: "sess", meaning: "sit", chinese: "坐" },
  { pattern: "sid", meaning: "sit", chinese: "坐" },
  { pattern: "sen", meaning: "old", chinese: "老" },
  { pattern: "sens", meaning: "feel", chinese: "感觉" },
  { pattern: "sent", meaning: "feel", chinese: "感觉" },
  { pattern: "sert", meaning: "join", chinese: "连接" },
  { pattern: "serv", meaning: "serve, keep", chinese: "服务，保持" },
  { pattern: "sign", meaning: "mark", chinese: "标记" },
  { pattern: "simil", meaning: "like", chinese: "相似" },
  { pattern: "simul", meaning: "like", chinese: "相似" },
  { pattern: "sist", meaning: "stand", chinese: "站立" },
  { pattern: "soci", meaning: "companion", chinese: "同伴" },
  { pattern: "sol", meaning: "alone, sun", chinese: "单独，太阳" },
  { pattern: "solv", meaning: "loosen", chinese: "解开" },
  { pattern: "solut", meaning: "loosen", chinese: "解开" },
  { pattern: "somn", meaning: "sleep", chinese: "睡眠" },
  { pattern: "son", meaning: "sound", chinese: "声音" },
  { pattern: "soph", meaning: "wise", chinese: "智慧" },
  { pattern: "spec", meaning: "look, see", chinese: "看" },
  { pattern: "spect", meaning: "look, see", chinese: "看" },
  { pattern: "spir", meaning: "breathe", chinese: "呼吸" },
  { pattern: "spond", meaning: "promise", chinese: "承诺" },
  { pattern: "spons", meaning: "promise", chinese: "承诺" },
  { pattern: "sta", meaning: "stand", chinese: "站立" },
  { pattern: "stat", meaning: "stand", chinese: "站立" },
  { pattern: "strain", meaning: "draw tight", chinese: "拉紧" },
  { pattern: "strict", meaning: "draw tight", chinese: "拉紧" },
  { pattern: "struct", meaning: "build", chinese: "建造" },
  { pattern: "stud", meaning: "eager", chinese: "热心" },
  { pattern: "sum", meaning: "take, highest", chinese: "拿，最高" },
  
  // T
  { pattern: "tac", meaning: "silent", chinese: "沉默" },
  { pattern: "tact", meaning: "touch", chinese: "触摸" },
  { pattern: "tag", meaning: "touch", chinese: "触摸" },
  { pattern: "tang", meaning: "touch", chinese: "触摸" },
  { pattern: "tain", meaning: "hold", chinese: "保持" },
  { pattern: "ten", meaning: "hold", chinese: "保持" },
  { pattern: "tin", meaning: "hold", chinese: "保持" },
  { pattern: "techn", meaning: "skill", chinese: "技术" },
  { pattern: "tect", meaning: "cover", chinese: "覆盖" },
  { pattern: "tele", meaning: "far", chinese: "远" },
  { pattern: "tempor", meaning: "time", chinese: "时间" },
  { pattern: "tend", meaning: "stretch", chinese: "伸展" },
  { pattern: "tens", meaning: "stretch", chinese: "伸展" },
  { pattern: "tent", meaning: "stretch", chinese: "伸展" },
  { pattern: "term", meaning: "end, limit", chinese: "结束，限制" },
  { pattern: "termin", meaning: "end, limit", chinese: "结束，限制" },
  { pattern: "terr", meaning: "earth, land", chinese: "地，土地" },
  { pattern: "test", meaning: "witness", chinese: "见证" },
  { pattern: "text", meaning: "weave", chinese: "编织" },
  { pattern: "the", meaning: "god", chinese: "神" },
  { pattern: "theo", meaning: "god", chinese: "神" },
  { pattern: "therm", meaning: "heat", chinese: "热" },
  { pattern: "thes", meaning: "put, place", chinese: "放置" },
  { pattern: "tom", meaning: "cut", chinese: "切" },
  { pattern: "ton", meaning: "tone, sound", chinese: "音调，声音" },
  { pattern: "tor", meaning: "twist", chinese: "扭" },
  { pattern: "tort", meaning: "twist", chinese: "扭" },
  { pattern: "tox", meaning: "poison", chinese: "毒" },
  { pattern: "tract", meaning: "pull, drag", chinese: "拉，拖" },
  { pattern: "trib", meaning: "give", chinese: "给" },
  { pattern: "trud", meaning: "push", chinese: "推" },
  { pattern: "trus", meaning: "push", chinese: "推" },
  { pattern: "turb", meaning: "disturb", chinese: "扰乱" },
  { pattern: "typ", meaning: "type", chinese: "类型" },
  
  // U-V-W
  { pattern: "ultim", meaning: "last", chinese: "最后" },
  { pattern: "umbr", meaning: "shadow", chinese: "阴影" },
  { pattern: "un", meaning: "one", chinese: "一" },
  { pattern: "und", meaning: "wave", chinese: "波浪" },
  { pattern: "uni", meaning: "one", chinese: "一" },
  { pattern: "urb", meaning: "city", chinese: "城市" },
  { pattern: "us", meaning: "use", chinese: "使用" },
  { pattern: "ut", meaning: "use", chinese: "使用" },
  { pattern: "util", meaning: "use", chinese: "使用" },
  { pattern: "vac", meaning: "empty", chinese: "空" },
  { pattern: "vad", meaning: "go", chinese: "走" },
  { pattern: "val", meaning: "strong, worth", chinese: "强壮，价值" },
  { pattern: "valu", meaning: "worth", chinese: "价值" },
  { pattern: "var", meaning: "change", chinese: "改变" },
  { pattern: "vari", meaning: "change", chinese: "改变" },
  { pattern: "ven", meaning: "come", chinese: "来" },
  { pattern: "vent", meaning: "come", chinese: "来" },
  { pattern: "ver", meaning: "true", chinese: "真实" },
  { pattern: "verb", meaning: "word", chinese: "词" },
  { pattern: "verg", meaning: "turn", chinese: "转" },
  { pattern: "vers", meaning: "turn", chinese: "转" },
  { pattern: "vert", meaning: "turn", chinese: "转" },
  { pattern: "vest", meaning: "clothe", chinese: "穿衣" },
  { pattern: "vi", meaning: "way", chinese: "道路" },
  { pattern: "via", meaning: "way", chinese: "道路" },
  { pattern: "vid", meaning: "see", chinese: "看" },
  { pattern: "vis", meaning: "see", chinese: "看" },
  { pattern: "view", meaning: "see", chinese: "看" },
  { pattern: "vict", meaning: "conquer", chinese: "征服" },
  { pattern: "vinc", meaning: "conquer", chinese: "征服" },
  { pattern: "vir", meaning: "man", chinese: "男人" },
  { pattern: "vit", meaning: "life", chinese: "生命" },
  { pattern: "viv", meaning: "live", chinese: "活" },
  { pattern: "voc", meaning: "voice, call", chinese: "声音，叫" },
  { pattern: "vok", meaning: "call", chinese: "叫" },
  { pattern: "vol", meaning: "will, wish", chinese: "意愿" },
  { pattern: "volv", meaning: "roll", chinese: "滚动" },
  { pattern: "vor", meaning: "eat", chinese: "吃" },
  { pattern: "vot", meaning: "vow", chinese: "发誓" },
  { pattern: "zo", meaning: "animal", chinese: "动物" }
];

// Comprehensive English suffixes (80+)
const suffixes = [
  // Noun suffixes - Person
  { pattern: "er", meaning: "one who", chinese: "…的人" },
  { pattern: "or", meaning: "one who", chinese: "…的人" },
  { pattern: "ar", meaning: "one who", chinese: "…的人" },
  { pattern: "ist", meaning: "one who practices", chinese: "…者" },
  { pattern: "ian", meaning: "one who", chinese: "…人" },
  { pattern: "ant", meaning: "one who", chinese: "…的人" },
  { pattern: "ent", meaning: "one who", chinese: "…的人" },
  { pattern: "ee", meaning: "one who receives", chinese: "被…的人" },
  { pattern: "eer", meaning: "one who", chinese: "…者" },
  { pattern: "ess", meaning: "female", chinese: "女性" },
  { pattern: "ster", meaning: "one who", chinese: "…者" },
  
  // Noun suffixes - State/Quality
  { pattern: "tion", meaning: "act, state", chinese: "…行为，状态" },
  { pattern: "sion", meaning: "act, state", chinese: "…行为，状态" },
  { pattern: "ation", meaning: "act, process", chinese: "…行为" },
  { pattern: "ition", meaning: "act, state", chinese: "…行为，状态" },
  { pattern: "ment", meaning: "act, state", chinese: "…行为" },
  { pattern: "ness", meaning: "state, quality", chinese: "…状态" },
  { pattern: "ity", meaning: "state, quality", chinese: "…性" },
  { pattern: "ty", meaning: "state, quality", chinese: "…性" },
  { pattern: "ance", meaning: "state, quality", chinese: "…状态" },
  { pattern: "ence", meaning: "state, quality", chinese: "…状态" },
  { pattern: "ancy", meaning: "state, quality", chinese: "…状态" },
  { pattern: "ency", meaning: "state, quality", chinese: "…状态" },
  { pattern: "dom", meaning: "state, realm", chinese: "…状态，领域" },
  { pattern: "hood", meaning: "state, condition", chinese: "…状态" },
  { pattern: "ship", meaning: "state, skill", chinese: "…状态，技能" },
  { pattern: "ism", meaning: "belief, practice", chinese: "…主义" },
  { pattern: "ure", meaning: "act, process", chinese: "…行为" },
  { pattern: "age", meaning: "action, result", chinese: "…行为，结果" },
  { pattern: "ery", meaning: "place, practice", chinese: "…场所" },
  { pattern: "ry", meaning: "place, practice", chinese: "…场所" },
  { pattern: "cy", meaning: "state, quality", chinese: "…状态" },
  { pattern: "th", meaning: "state", chinese: "…状态" },
  
  // Adjective suffixes
  { pattern: "able", meaning: "capable of", chinese: "能够…的" },
  { pattern: "ible", meaning: "capable of", chinese: "能够…的" },
  { pattern: "al", meaning: "relating to", chinese: "…的" },
  { pattern: "ial", meaning: "relating to", chinese: "…的" },
  { pattern: "ical", meaning: "relating to", chinese: "…的" },
  { pattern: "ful", meaning: "full of", chinese: "充满…的" },
  { pattern: "less", meaning: "without", chinese: "没有…的" },
  { pattern: "ous", meaning: "full of", chinese: "…的" },
  { pattern: "ious", meaning: "full of", chinese: "…的" },
  { pattern: "eous", meaning: "full of", chinese: "…的" },
  { pattern: "ive", meaning: "tending to", chinese: "…的" },
  { pattern: "ative", meaning: "tending to", chinese: "…的" },
  { pattern: "itive", meaning: "tending to", chinese: "…的" },
  { pattern: "ic", meaning: "relating to", chinese: "…的" },
  { pattern: "tic", meaning: "relating to", chinese: "…的" },
  { pattern: "ary", meaning: "relating to", chinese: "…的" },
  { pattern: "ory", meaning: "relating to", chinese: "…的" },
  { pattern: "ish", meaning: "like, somewhat", chinese: "像…的" },
  { pattern: "like", meaning: "similar to", chinese: "像…的" },
  { pattern: "ly", meaning: "like, having quality", chinese: "…的" },
  { pattern: "y", meaning: "having quality", chinese: "…的" },
  { pattern: "ed", meaning: "having", chinese: "有…的" },
  { pattern: "en", meaning: "made of", chinese: "由…制成" },
  { pattern: "ern", meaning: "direction", chinese: "…方向的" },
  { pattern: "ese", meaning: "nationality", chinese: "…国的" },
  { pattern: "ward", meaning: "direction", chinese: "向…" },
  { pattern: "wards", meaning: "direction", chinese: "向…" },
  { pattern: "wise", meaning: "manner", chinese: "…方式" },
  
  // Verb suffixes
  { pattern: "ize", meaning: "make, become", chinese: "使…化" },
  { pattern: "ise", meaning: "make, become", chinese: "使…化" },
  { pattern: "fy", meaning: "make", chinese: "使…" },
  { pattern: "ify", meaning: "make", chinese: "使…" },
  { pattern: "ate", meaning: "make, act", chinese: "使…，做" },
  
  // Adverb suffixes
  { pattern: "ly", meaning: "in manner of", chinese: "…地" },
  
  // Other suffixes
  { pattern: "ing", meaning: "action, process", chinese: "…中" },
  { pattern: "ling", meaning: "small, young", chinese: "小…" },
  { pattern: "let", meaning: "small", chinese: "小…" },
  { pattern: "ette", meaning: "small", chinese: "小…" },
  { pattern: "oid", meaning: "like", chinese: "像…的" },
  { pattern: "scope", meaning: "instrument for seeing", chinese: "…镜" },
  { pattern: "graphy", meaning: "writing, study", chinese: "…学，…术" },
  { pattern: "logy", meaning: "study of", chinese: "…学" },
  { pattern: "nomy", meaning: "law, knowledge", chinese: "…学" },
  { pattern: "metry", meaning: "measurement", chinese: "…测量" },
  { pattern: "phobia", meaning: "fear", chinese: "恐…症" },
  { pattern: "cracy", meaning: "rule by", chinese: "…统治" },
  { pattern: "crat", meaning: "ruler", chinese: "…统治者" },
  { pattern: "arch", meaning: "ruler", chinese: "统治者" },
  { pattern: "archy", meaning: "rule", chinese: "统治" },
  { pattern: "cide", meaning: "killing", chinese: "杀" },
  { pattern: "path", meaning: "feeling, disease", chinese: "…病" },
  { pattern: "pathy", meaning: "feeling", chinese: "…感" }
];

// Sort by pattern length (longer patterns first) for matching
const sortedPrefixes = [...prefixes].sort((a, b) => b.pattern.length - a.pattern.length);
const sortedRoots = [...roots].sort((a, b) => b.pattern.length - a.pattern.length);
const sortedSuffixes = [...suffixes].sort((a, b) => b.pattern.length - a.pattern.length);

/**
 * Analyze word structure (prefixes, roots, suffixes)
 * @param {string} word - The word to analyze
 * @param {string} origin - Optional etymology from dictionary
 * @returns {Object} Analysis with components array
 */
export function analyzeWordRoot(word, origin = null) {
  const lowercased = word.toLowerCase();
  const components = [];
  let remainingWord = lowercased;

  // Find prefixes (try multiple, max 2)
  let foundPrefix = true;
  while (foundPrefix && components.filter(c => c.type === ComponentType.PREFIX).length < 2) {
    foundPrefix = false;
    for (const prefix of sortedPrefixes) {
      if (remainingWord.startsWith(prefix.pattern) && remainingWord.length > prefix.pattern.length + 2) {
        components.push({
          part: prefix.pattern,
          type: ComponentType.PREFIX,
          meaning: prefix.meaning,
          chineseMeaning: prefix.chinese
        });
        remainingWord = remainingWord.slice(prefix.pattern.length);
        foundPrefix = true;
        break;
      }
    }
  }

  // Find suffixes (try multiple, max 2)
  const foundSuffixes = [];
  let tempWord = remainingWord;
  let foundSuffix = true;
  while (foundSuffix && foundSuffixes.length < 2) {
    foundSuffix = false;
    for (const suffix of sortedSuffixes) {
      if (tempWord.endsWith(suffix.pattern) && tempWord.length > suffix.pattern.length + 1) {
        foundSuffixes.unshift({
          part: suffix.pattern,
          type: ComponentType.SUFFIX,
          meaning: suffix.meaning,
          chineseMeaning: suffix.chinese
        });
        tempWord = tempWord.slice(0, -suffix.pattern.length);
        foundSuffix = true;
        break;
      }
    }
  }
  remainingWord = tempWord;

  // Find root in remaining word
  let foundRoot = false;
  for (const root of sortedRoots) {
    if (remainingWord.includes(root.pattern)) {
      components.push({
        part: root.pattern,
        type: ComponentType.ROOT,
        meaning: root.meaning,
        chineseMeaning: root.chinese
      });
      foundRoot = true;
      break;
    }
  }

  // If no root found in remaining word, check the whole word
  if (!foundRoot) {
    for (const root of sortedRoots) {
      if (lowercased.includes(root.pattern)) {
        components.push({
          part: root.pattern,
          type: ComponentType.ROOT,
          meaning: root.meaning,
          chineseMeaning: root.chinese
        });
        break;
      }
    }
  }

  // Add suffixes at the end
  components.push(...foundSuffixes);

  return {
    components,
    origin,
    hasContent: components.length > 0 || origin !== null
  };
}

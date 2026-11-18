# PC、NPC 與章節種族盤點

盤點日期：2026-10-26。供世界觀與資料分類檢視使用，分類為暫定，並非嚴格依據特定版本的 D&D 規則。

## 待建立的深淵物種

- **Klaussian**：規劃中的深淵鉗類生物總稱。暫粗分為 **Crabfolk**、**Lobsterfolk**、**Scorpianfolk**；三個分支的名稱與正式分類均待確認。目前僅記錄構想，尚未加入 `species.json`。

## 範圍與統計

- PC：[pc/pc_lib](../pc/pc_lib)，35 位，包含客串角色。
- NPC：[npc/data/characters.json](../npc/data/characters.json)，158 筆。
- 章節：[campaigns/data/chapter-content.json](../campaigns/data/chapter-content.json)，100 筆章節資料；比對中文內文，必要時參考同章英文。
- PC／NPC 種族欄位有 39 種原始英文寫法；將 `Half Orc` 與 `Half-Orc` 合併後，共 **38 種**。
- 下表的數量為標記該種族的角色筆數。多種族角色會重複計入，因此加總不等於角色總數。
- 「章節補充」指該名稱未成為 PC／NPC 的種族欄位值；即使角色已收錄，但未標記其變身、血統或不死狀態，仍可能出現在補充中。
- 一般動物、亞種、變身、傳說與未定名生物分開列出；不將這些項目直接加總成新的正式種族總數。

## 本輪納入 species.json

- 最初依下方章節證據收錄 19 個 ID：`satyr`、`centaur`、`fairy`、`orc`、`fishfolk`、`frogfolk`、`werewolf`、`mimic`、`gargoyle`、`sphinx`、`bach-tahn`、`zombie`、`skeleton`、`lich`、`bone-golem`、`snakefolk`、`wraith`、`specter`、`quasit`。這是網頁導覽所需的「種類」條目，包含獸化、不死狀態與構裝造物，並不宣稱全部都是可繁衍的生物學種族。後續依使用者指定，`bone-golem` 列為 `skeleton` 的亞種並移除獨立圖片。章節另有猩猩獸人記載，但目前 species.json 與圖庫沒有該條目。
- 應使用者要求另增 `harengon`（兔人）；目前 [章節資料](../campaigns/data/chapter-content.json) 與 PC／NPC 種族欄位都沒有兔人登場紀錄。外形概念參考 [D&D Beyond 的 Harengon 介紹](https://www.dndbeyond.com/posts/1074-new-d-d-race-get-a-sneak-peek-at-harengons-from)，不把該書背景直接當作 Rugatha 設定。
- 應使用者要求新增 `deepling`（深淵人），分類為 Humanoid。依據 [Legends OS09 章節](../campaigns/data/chapters/legends-os09.json)：多為遭帶入深淵的人類，偶有其他物種，久居後逐漸失去理智並轉化；不能像深淵原生生物那樣自由往返兩界。章節未描述固定外貌，異化人形肖像只是概念示意；目前不製作三視圖。該章英文稱 Deepfolk，網頁名稱依本次指定採 Deepling。
- 上述章節補充條目的 `pc`、`npc` 最初均為空陣列，因角色資料的種族欄位沒有以這些名稱標記；條目文案可提及章節人物，但不臆造角色 ID 關聯。
- 魚人／漁人暫共用 `fishfolk` 條目，但不與 `merfolk` 合併；依使用者後續指定，蛇人 `snakefolk` 已併入 `naga`，舊頁面轉向那伽；蛇妖與那伽的關係仍待確認。
- 蛇身女妖、泥人、孽物等名稱仍欠穩定分類；眼怪與元素生物僅作變身形態；吸血鬼、天使等屬傳說、猜測或尚未證實的登場，暫保留在盤點，不直接新增頂層 ID。一般動物也不因章節提及就全部變成種族條目。

## PC／NPC 已收錄的種族

| 暫定分類 | 英文種族 | 中文種族 | PC | NPC | 角色例子 |
|---|---|---|---:|---:|---|
| Humanoid 人形族群 | Human | 人類 | 5 | 82 | 米多莉、YHWH、伊 |
| Humanoid 人形族群 | Elf | 妖精 | 5 | 15 | 薩梅爾、家亨、羅羅 |
| Humanoid 人形族群 | Half-Elf | 半妖精 | 1 | 2 | 雷米、拉芙、貝倫的崔夏 |
| Humanoid 人形族群 | Dwarf | 矮人 | 0 | 3 | 班尼・寇茲洛薩穆達、波波/啵啵OMEGA、札克 |
| Humanoid 人形族群 | Gnome | 地侏 | 1 | 8 | 喜利・歐喜利、艾迪・蘋果木、凱許・蘋果木 |
| Humanoid 人形族群 | Halfling | 半身人 | 2 | 3 | 帕拉丁、帕斯卡、馬格努斯爵士 |
| Humanoid 人形族群 | Half-Orc | 半獸人 | 3 | 2 | 蘇加魯、賽柏、布朗 |
| Humanoid 人形族群 | Goblin | 哥布林 | 0 | 1 | 神王尼可 |
| Humanoid 人形族群 | Kalashtar | 離夢人 | 1 | 0 | GoR |
| Humanoid 人形族群 | Shadar-Kai | 幽族 | 1 | 0 | 賽希爾 |
| Humanoid 獸形／水生族群 | Kenku | 天狗 | 1 | 0 | 圖伊特 |
| Humanoid 獸形／水生族群 | Dragonborn | 龍人 | 3 | 11 | 烏柯、龍恩、阿龍 |
| Humanoid 獸形／水生族群 | Foxfolk | 狐人 | 0 | 1 | 伊洛・瑪莉 |
| Humanoid 獸形／水生族群 | Kobold | 狗頭人 | 0 | 1 | 希岡三世 |
| Humanoid 獸形／水生族群 | Lizardfolk | 蜥蜴人 | 2 | 5 | 雷亞、拉比、立德上尉 |
| Humanoid 獸形／水生族群 | Merfolk | 人魚 | 1 | 0 | 鑰 |
| Humanoid 獸形／水生族群 | Minotaur | 牛頭怪 | 2 | 0 | 烏犧奧泥、庫登 |
| Humanoid 獸形／水生族群 | Ratfolk | 老鼠人 | 0 | 1 | 佩特拉 |
| Humanoid 獸形／水生族群 | Tabaxi | 班貓人 | 1 | 0 | 毛毛 |
| Humanoid 特殊血統 | Aasimar | 天使人 | 1 | 0 | 華生 |
| Humanoid 特殊血統 | Tiefling | 魔人 | 2 | 1 | Tai Tai我還要、羅特、葛蘭倫・佛森 |
| Animals 動物 | Dog | 狗 | 0 | 3 | 馬可、瑪芬先生、嘟嘟 |
| Animals 動物 | Horse | 馬 | 0 | 2 | 斯比迪、勇哥 |
| Animals 動物 | Spider | 蜘蛛 | 0 | 1 | 母親大人 |
| Animals 動物 | Squirrel | 松鼠 | 0 | 1 | 頹哥 |
| Animals 動物 | Wolf | 狼 | 0 | 2 | 蓋瑞、酷爆 |
| Fey 精類 | Dryad | 樹靈 | 0 | 1 | 艾爾比/白醫師 |
| Dragons 龍類 | Dragon | 龍 | 0 | 1 | 哈洛・米佐 |
| Giants 巨人類 | Ogre | 食人魔 | 0 | 1 | 古古 |
| Constructs 構裝生物 | Construct | 組構體 | 0 | 4 | 啵啵C/啵啵Z、啵啵V/啵啵W、波波/啵啵OMEGA |
| Fiends 邪魔 | Demon | 惡魔 | 0 | 1 | 法蘭奇 |
| Oozes 軟泥類 | Plasmoid | 流漿怪 | 1 | 0 | 烏波 |
| Spirits 靈體 | Spirit | 精靈 | 1 | 1 | 伊努、米可・卓茲克 |
| Divine 神祇 | God | 神 | 0 | 5 | 阿爾芬諾、安娜、多姆尼爾 |
| 特殊／魔法生物（暫列） | Banderhobb | 綁匪怪蛙 | 0 | 1 | 霍布 |
| 特殊／魔法生物（暫列） | Naga | 那伽 | 1 | 0 | 安納戴克 |
| 特殊／魔法生物（暫列） | Laztek | 拉茲特獸 | 0 | 1 | 慢爆 |
| Shapeshifters 變形生物 | Shapeshifter | 變形獸 | 0 | 3 | 斗篷人、芒果、沙度 |

## 分類與資料備註

- **古古已修正**：`raceEn` 由 `Orc` 改為 `Ogre`，英文介紹同步將 `A huge orc` 改成 `A huge ogre`。中文仍為「食人魔」。
- **Elf 與 Fey**：暫將 Elf、Half-Elf、Shadar-Kai 歸入 Humanoid，Dryad 歸入 Fey；需由世界觀設定決定妖精族是否整體屬於 Fey。
- **獸形外觀**：狐人、班貓人、龍人等暫列 Humanoid，不因外觀直接歸入 Animals 或 Dragons。
- **Spirit 譯名**：原種族欄位中文為「精靈」，但伊努是寄宿靈魂、米可是死後幽魂；分類名用「靈體」避免與 Elf 混淆。
- **Shapeshifter**：斗篷人、芒果、沙度共用此標籤，但未必同種族；可能需要另設「變形能力／形態」欄位。
- **複選標記**：米可同時為 Human／Spirit；母親大人同時為 God／Spider；波波／啵啵OMEGA 同時為 Dwarf／Construct。
- **自訂或未明設定**：Laztek、Naga、Banderhobb 暫不推定更細的規則類型。

## 章節補充：明確登場或有具體記載的種類

以下名稱未列為 PC／NPC 種族欄位值。英文若無可靠的章節對照，保留中文；分類與英文名稱不代表已確定規則上的生物種類。

| 種類 | 暫定分類 | 出現情境與判讀 | 章節出處 |
|---|---|---|---|
| 羊蹄人 Satyr | Fey | 妖精荒野的帳篷內登場；另有與喜利互動畫畫、贈送蠟筆的羊蹄人。英文直接使用 satyr。 | [plus-c05-chpt03](../campaigns/pages/rugatha-plus/plus-c05/chpt03.html) |
| 半人馬 Centaur | Fey／人形族群（暫定） | 妖精荒野帳篷內被列舉；隨機地城的員工休息室也出現喝醉的半人馬。 | [plus-c05-chpt03](../campaigns/pages/rugatha-plus/plus-c05/chpt03.html)、[legends-os08](../campaigns/pages/rugatha-legends/legends-os08/index.html) |
| 仙靈 Fairy | Fey | 蓋蓋明確為仙靈；地下水道另有被捕捉、交易的仙靈群體。 | [legends-os10](../campaigns/pages/rugatha-legends/legends-os10/index.html) |
| 獸人 Orc | Humanoid | 魯米歐的男性夥伴喬瓦被明確稱為獸人，英文為 orc。與古古的 Ogre 分開。 | [lite-c11-chpt03](../campaigns/pages/rugatha-lite/lite-c11/chpt03.html) |
| 猩猩獸人 Simian beastfolk | Humanoid／獸形族群（暫定） | 穆斯被明確描述為猩猩獸人，英文為 simian beastfolk；不可僅因中文含「獸人」便與 Orc 合併。 | [legends-os05-chpt02](../campaigns/pages/rugatha-legends/legends-os05/chpt02.html) |
| 魚人／魚頭人身生物 | 深淵生物／人形族群（暫定） | 霍布的手下是來自深淵的魚人；深淵章節另有魚頭人身生物。與 PC 的 Merfolk 人魚暫不合併。 | [lite-c05-chpt04](../campaigns/pages/rugatha-lite/lite-c05/chpt04.html)、[legends-os09](../campaigns/pages/rugatha-legends/legends-os09/index.html) |
| 蛙人 Frogfolk（未定種） | 深淵生物／人形族群（暫定） | 深淵沼澤中有持長矛的蛙人，以及被綺綺獵捕的多隻蛙人；不是只有霍布一例，不直接判定都屬於 Banderhobb。 | [legends-os09](../campaigns/pages/rugatha-legends/legends-os09/index.html) |
| 狼人 Werewolf | 變形生物／獸化狀態 | 先有腳印和傳聞；後來冷火腿自述殺死正在變身的狼人，現場有遺體。 | [lite-c12-chpt04](../campaigns/pages/rugatha-lite/lite-c12/chpt04.html)、[lite-c13-chpt01](../campaigns/pages/rugatha-lite/lite-c13/chpt01.html) |
| 擬態怪 Mimic | 特殊／魔法生物 | 地城內分別偽裝成寶箱、木門，與冒險者戰鬥。與泛稱 Shapeshifter 暫分開。 | [rugatha-c02-chpt02](../campaigns/pages/rugatha/rugatha-c02/chpt02.html) |
| 石像鬼 Gargoyle | 石質魔法生物（暫定） | 寂靜殿地城中會活動並攻擊的石像鬼；不是傳奇篇裡由魔人假扮的版本。 | [rugatha-c02-chpt01](../campaigns/pages/rugatha/rugatha-c02/chpt01.html) |
| 史芬斯 Sphinx | 特殊／魔法生物 | 瑟巴諾閣樓內研究時空穿越，與冒險者交談並答應協助，後被發現死亡。 | [lite-c07-chpt03](../campaigns/pages/rugatha-lite/lite-c07/chpt03.html) |
| 蛇身女妖／蛇妖 | 特殊／魔法生物（待確認） | 襲擊派琶與常翠林，頭部有蛇、身體有蛇尾。英文在章節間混用 Banshee、Gorgon、Lamiae，先保留中文統稱，不直接判定是 Medusa 或 Naga。 | [lite-c12-chpt03](../campaigns/pages/rugatha-lite/lite-c12/chpt03.html)、[lite-c12-chpt05](../campaigns/pages/rugatha-lite/lite-c12/chpt05.html) |
| 泥人／黏液複製體 | 人工製造的深淵生物（暫定） | 霍布用魔法盒與黏液製造複製體；後續章節直接稱為泥人。沒有足夠證據與 Plasmoid 流漿怪合併。 | [lite-c05-chpt04](../campaigns/pages/rugatha-lite/lite-c05/chpt04.html)、[plus-c06-chpt03](../campaigns/pages/rugatha-plus/plus-c06/chpt03.html) |
| 孽物／小孽物 | 異常生物群（暫定） | GoR 攜帶三隻小孽物；洞穴內亦有孽物，後續有蘿絲、岡斯等個體。「孽物」也可能是泛稱，不能直接視為單一物種。 | [lite-c09-chpt01](../campaigns/pages/rugatha-lite/lite-c09/chpt01.html)、[lite-c09-chpt02](../campaigns/pages/rugatha-lite/lite-c09/chpt02.html)、[lite-c10-chpt03](../campaigns/pages/rugatha-lite/lite-c10/chpt03.html) |
| 巴坦 Bach’tahn | 深淵蟲類／特殊生物 | 深淵中的蟲，可由肢體合成並注入體內，與返回物質世界的能力相關；不是普通背景蟲聲。 | [legends-os09](../campaigns/pages/rugatha-legends/legends-os09/index.html) |
| 殭屍 Zombie | Undead 不死生物 | 沃瓦倫居民轉化為殭屍；華生也曾製作或召喚殭屍。部分居民雖有 NPC 資料，種族欄位沒有 Zombie。 | [rugatha-c01-chpt07](../campaigns/pages/rugatha/rugatha-c01/chpt07.html)、[lite-c05-chpt03](../campaigns/pages/rugatha-lite/lite-c05/chpt03.html) |
| 骷髏 Skeleton | Undead 不死生物 | 幽深林的棺材內爬出骷髏並與冒險者戰鬥；與隨機地城的假骷髏分開。 | [wilds-c01-chpt02](../campaigns/pages/rugatha-wilds/wilds-c01/chpt02.html) |
| 巫妖 Lich | Undead 不死生物 | 明確提及古老巫妖維克那留下手、眼的傳說；瓦克松醫師為巫妖則仍是角色猜測。 | [plus-c06-chpt01](../campaigns/pages/rugatha-plus/plus-c06/chpt01.html)、[plus-c06-chpt03](../campaigns/pages/rugatha-plus/plus-c06/chpt03.html) |
| 骸骨魔像 Bone golem | Constructs／死靈造物（暫定） | 湯普森製作的巨大骸骨魔像襲擊晚宴，並於舊津菈教堂儀式中登場；網站將它列為 Skeleton 的亞種，但生物類型仍保留 Construct，表示它是人工造物。 | [plus-c07-chpt04](../campaigns/pages/rugatha-plus/plus-c07/chpt04.html) |

## 章節補充：亞種、血統與可能的別稱

這些名稱值得保留，但未必代表需要新增獨立的頂層種族。

| 名稱 | 暫定分類 | 判讀／待確認事項 | 章節出處 |
|---|---|---|---|
| 海精靈 Sea elf | Elf 亞種（暫定） | 贊蘭被稱為海精靈；暫視為既有 Elf 的細分類。 | [legends-os06](../campaigns/pages/rugatha-legends/legends-os06/index.html) |
| 闇妖精 Dark elf | Elf 亞種（暫定） | 米亞拉被稱為闇妖精；章節未明確使用 Drow，不直接改稱卓爾。 | [legends-os05-chpt02](../campaigns/pages/rugatha-legends/legends-os05/chpt02.html) |
| 星界精靈 Astral elf | Elf 亞種（暫定） | 赫里安被明確稱為星界精靈。 | [legends-os10](../campaigns/pages/rugatha-legends/legends-os10/index.html) |
| 漁人 Fishfolk | 水生人形族群（暫定） | 烏鯊大在中文稱為「漁人」，英文為 fishfolk；需確認與深淵魚人或 Merfolk 的關係。 | [legends-os05-chpt02](../campaigns/pages/rugatha-legends/legends-os05/chpt02.html) |
| 蛇人 Snake-man | 人形族群（暫定） | 札爾、耶內達特被稱為蛇人；網站導覽已依使用者指定併入 Naga，章節仍沒有明確的血緣等同證據，也不直接定為 Yuan-ti。 | [lite-c11-chpt03](../campaigns/pages/rugatha-lite/lite-c11/chpt03.html)、[plus-c07-chpt01](../campaigns/pages/rugatha-plus/plus-c07/chpt01.html) |
| 電漿人 | Oozes／人工生物（待確認） | 工廠中與烏波相似、甚至長得一模一樣的實驗體；可能是 Plasmoid 的別稱、近緣或製造版本，先不另計種族。 | [lite-c11-chpt01](../campaigns/pages/rugatha-lite/lite-c11/chpt01.html)、[lite-c11-chpt02](../campaigns/pages/rugatha-lite/lite-c11/chpt02.html) |
| 遊魂 Wraith、幽靈 Specter | Undead／Spirits 靈體 | 一隻遊魂喚起七隻幽靈作戰；章節英文分別使用 wraith、specters。網站導覽依使用者指定列為 Spirit 的亞種。 | [rugatha-c02-chpt03](../campaigns/pages/rugatha/rugatha-c02/chpt03.html) |
| 魅魔血統 | Fiends 邪魔／血統 | 羅特得知自己有魅魔血統；羅特的既有種族仍是 Tiefling。這裡是血統記載，不是獨立魅魔角色登場。 | [lite-c07-chpt02](../campaigns/pages/rugatha-lite/lite-c07/chpt02.html) |
| 靈魂馬 Spirit horse | Spirits／魔法坐騎 | 伊莉娜騎乘靈魂馬；與普通 Horse 分開列形態，具體本質未說明。 | [legends-os06](../campaigns/pages/rugatha-legends/legends-os06/index.html) |

## 章節補充：召喚與變身形態

| 名稱 | 暫定分類 | 出現方式 | 章節出處 |
|---|---|---|---|
| 夸賽魔 | Fiends 邪魔（暫定） | 圖伊特召喚的魔寵，參與偵查與搬運。 | [lite-c05-chpt03](../campaigns/pages/rugatha-lite/lite-c05/chpt03.html)、[lite-c06-chpt04](../campaigns/pages/rugatha-lite/lite-c06/chpt04.html) |
| 眼怪／眼魔 Beholder | 異常／魔法生物（暫定） | 烏波的變身形態；眼怪與眼魔暫視為同類稱呼，不代表另有野生個體登場。 | [lite-c09-chpt02](../campaigns/pages/rugatha-lite/lite-c09/chpt02.html)、[lite-c12-chpt01](../campaigns/pages/rugatha-lite/lite-c12/chpt01.html) |
| 大氣元素 Air elemental | Elementals 元素生物 | 烏波化身大氣元素飛向樹林。 | [lite-c12-chpt01](../campaigns/pages/rugatha-lite/lite-c12/chpt01.html) |
| 火元素 Fire elemental | Elementals 元素生物 | 烏波在莊園與常翠林戰鬥中使用的形態。 | [lite-c10-chpt03](../campaigns/pages/rugatha-lite/lite-c10/chpt03.html)、[lite-c12-chpt05](../campaigns/pages/rugatha-lite/lite-c12/chpt05.html) |

## 章節補充：未證實或尚未定名

| 名稱 | 暫定分類 | 限制與出現情境 | 章節出處 |
|---|---|---|---|
| 吸血鬼 Vampire | Undead（疑似） | 冒險者因兩人面色慘白而懷疑是吸血鬼，內文明說沒有決定性證據。 | [lite-c10-chpt01](../campaigns/pages/rugatha-lite/lite-c10/chpt01.html) |
| 海妖 Siren | 特殊／魔法生物（待確認） | 有海妖墓園與影響阿龍的歌聲，但內文未提供生物外貌；不能單憑墓園名稱就視為已直接遇見海妖。 | [wilds-c01-chpt01](../campaigns/pages/rugatha-wilds/wilds-c01/chpt01.html)、[wilds-c01-chpt03](../campaigns/pages/rugatha-wilds/wilds-c01/chpt03.html) |
| 天使 Angel | Celestials 天界生物（暫定） | 利希恩談及芬尼爾賜予的天使，並在戲劇重演中出現；原始天使的種族未明，與 Aasimar 天使人暫不合併。 | [lite-c10-chpt01](../campaigns/pages/rugatha-lite/lite-c10/chpt01.html)、[lite-c10-chpt03](../campaigns/pages/rugatha-lite/lite-c10/chpt03.html) |
| 雪人 Snowman | 魔法生物（暫定） | 雪寶實際登場，描述是「看起來像雪人」；不是已證實的 Yeti 雪怪。 | [plus-c06-chpt04](../campaigns/pages/rugatha-plus/plus-c06/chpt04.html) |
| 如小型魔像的生物 | 未定名生物 | 深淵獵捕中出現，原文僅說「如小型魔像」，不直接確立新的魔像種族。 | [legends-os09](../campaigns/pages/rugatha-legends/legends-os09/index.html) |
| 鬼怪、有爪類生物 | 地區生物泛稱 | 派蒂介紹深淵區域時提及；尚不足以辨識成單一種族，與正式種族清單分開。深淵人已另立 `deepling` 條目。 | [legends-os09](../campaigns/pages/rugatha-legends/legends-os09/index.html) |

## 章節補充：一般動物

這些動物名稱也未列於 PC／NPC 種族欄位；魔寵或變身可能只是動物外形，不代表自然動物個體。

| 名稱 | 情境 | 章節出處 |
|---|---|---|
| 貓／黑貓 | 黑貓引導帕拉丁；墨奎斯咖啡廳的莫吉斯也是貓形態，後化為男子。 | [rugatha-c03-chpt03](../campaigns/pages/rugatha/rugatha-c03/chpt03.html)、[plus-c07-chpt03](../campaigns/pages/rugatha-plus/plus-c07/chpt03.html)、[plus-c07-chpt04](../campaigns/pages/rugatha-plus/plus-c07/chpt04.html) |
| 老鼠 | 華生操控的老鼠，以及地下水道中的老鼠。與 Ratfolk 老鼠人分開。 | [lite-c05-chpt03](../campaigns/pages/rugatha-lite/lite-c05/chpt03.html)、[legends-os10](../campaigns/pages/rugatha-legends/legends-os10/index.html) |
| 貓頭鷹 | 安納戴克向森林貓頭鷹求助；另有自稱奧利佛的貓頭鷹及召喚形態。 | [legends-os02](../campaigns/pages/rugatha-legends/legends-os02/index.html)、[lite-c06-chpt01](../campaigns/pages/rugatha-lite/lite-c06/chpt01.html)、[lite-c08-chpt01](../campaigns/pages/rugatha-lite/lite-c08/chpt01.html) |
| 烏鴉 | 烏波的魔寵、傳信後化為碎片的烏鴉。 | [lite-c10-chpt01](../campaigns/pages/rugatha-lite/lite-c10/chpt01.html)、[lite-c09-chpt03](../campaigns/pages/rugatha-lite/lite-c09/chpt03.html) |
| 巨鷹 | 妖精巡邏時騎乘的坐騎；與普通鷹是否同類、是否為巨型亞種待定。 | [lite-c08-chpt03](../campaigns/pages/rugatha-lite/lite-c08/chpt03.html) |
| 蛇／隱形蛇 | 傳奇篇出現「隱形蛇！」的喊話；實際生物本質未明。芒果的蛇形已屬既有 Shapeshifter，不重算獨立種族。 | [legends-os01](../campaigns/pages/rugatha-legends/legends-os01/index.html)、[lite-c09-chpt01](../campaigns/pages/rugatha-lite/lite-c09/chpt01.html) |

## 未另計入的提及

- 「春天精靈」是土城活動中的職位／稱號，不是種族。
- 傳奇隨機地城的骷髏妖、殭屍、石像鬼包含員工裝扮；不拿它們當作實際生物登場的證據。
- 水獺奧托、青蛙菲菲在隨機地城中是布偶／故事角色，未列為自然動物登場。
- 蝙蝠雕刻、翠綠色蝴蝶家徽、蛇形戒指等物件圖樣，不另計為生物登場。
- 雞、豬、牛、鵝、鮭魚、章魚、花枝、魷魚等僅在餐點或材料情境提及者，不擴充為角色種族。
- 星界大蛇／星界巨蛇在宗教信仰情境中提及，沒有足夠描述可另確立生物種族。
- 銀龍、各色龍人、冰原狼等已能對應 Dragon／Dragonborn／Wolf 者，保留為既有種族的亞型或形態，不直接加算新的頂層種族。

## 後續檢視重點

1. 決定 Elf 與 Fey 在本世界觀中的關係，以及半人馬要歸入 Fey 還是 Humanoid。
2. 確認「魚人／漁人／人魚」、「那伽／蛇妖」、「電漿人／流漿怪」其餘關係；蛇人已併入那伽。
3. 將種族、生物分類、血統、變身及不死狀態設為可分開記錄的資訊，以保留多重屬性。
4. 優先考慮補建羊蹄人、半人馬、仙靈、史芬斯等已有具體章節內容的種族或角色資料。
